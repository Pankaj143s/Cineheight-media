/**
 * Headless screenshot + interaction harness — zero dependencies.
 *
 * The in-app browser pane does not composite frames unless it is displayed, so
 * requestAnimationFrame and IntersectionObserver never fire there and nothing
 * scroll-driven can be verified. This drives a real Chromium with
 * `--headless=new` (which DOES composite) over the DevTools Protocol, using
 * Node's built-in global WebSocket — no Playwright, no Puppeteer, no install.
 *
 * Chromium is taken from the Playwright browser cache if present, otherwise
 * from an installed Chrome/Edge.
 *
 *   node scripts/shoot.mjs                      # the standard sweep
 *   node scripts/shoot.mjs --routes=/,/work     # only these routes
 *   node scripts/shoot.mjs --sizes=1440x900     # only these viewports
 *   node scripts/shoot.mjs --reduced            # emulate reduced motion
 *   node scripts/shoot.mjs --probe              # run interaction probes only
 *   node scripts/shoot.mjs --focus              # focused element shots only
 */

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const BASE = process.env.SHOOT_BASE ?? 'http://localhost:3100'
const OUT = process.env.SHOOT_OUT ?? path.resolve('.shots')
const PORT = 9333

const argOf = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : fallback
}
const hasFlag = (name) => process.argv.includes(`--${name}`)

/**
 * Routes may be given with or without a leading slash: Git Bash rewrites a
 * bare "/" argument into a Windows path (MSYS path conversion), so
 * `--routes=work,about` is the safe form there. `home` is an alias for "/".
 */
const normaliseRoute = (r) => {
  const s = r.trim()
  if (!s || s === 'home' || s === '/') return '/'
  return s.startsWith('/') ? s : '/' + s
}

const ROUTES = argOf('routes', [
  'home',
  'work',
  'work/sapale-yamaha',
  'work/sindhudurg-education',
  'work/divija-old-age-home',
  'services',
  'about',
  'contact',
].join(',')).split(',').filter(Boolean).map(normaliseRoute)

const SIZES = argOf('sizes', [
  '390x844',
  '768x1024',
  '1366x768',
  '1440x900',
  '1920x1080',
  '2560x1440',
  '1920x600',
].join(',')).split(',').filter(Boolean)

// ── locate a Chromium ────────────────────────────────────────────────────
/**
 * A real Chrome/Edge install is preferred over the Playwright cache: the
 * cached chromium-1228 build on this machine fails to start with a
 * side-by-side configuration error (missing VC++ runtime).
 */
function findChrome() {
  const local = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local')
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(local, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]
  for (const c of candidates) if (existsSync(c)) return c

  const pwRoot = path.join(local, 'ms-playwright')
  if (existsSync(pwRoot)) {
    const dirs = readdirSync(pwRoot)
      .filter((d) => d.startsWith('chromium-'))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    for (const d of dirs) {
      for (const sub of ['chrome-win64', 'chrome-win', 'chrome-linux']) {
        for (const bin of ['chrome.exe', 'chrome']) {
          const p = path.join(pwRoot, d, sub, bin)
          if (existsSync(p)) return p
        }
      }
    }
  }
  throw new Error('No Chromium found (checked Chrome, Edge and the Playwright cache).')
}

/** Is a CDP endpoint already listening on PORT? */
async function endpointUp() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(1200) })
    return r.ok
  } catch {
    return false
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── minimal CDP client ───────────────────────────────────────────────────
class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.events = new Map()
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id != null) {
        const p = this.pending.get(msg.id)
        if (!p) return
        this.pending.delete(msg.id)
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result)
      } else {
        ;(this.events.get(msg.method) ?? []).forEach((fn) => fn(msg.params))
      }
    })
  }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true })
      ws.addEventListener('error', () => rej(new Error('CDP socket failed')), { once: true })
    })
    return new CDP(ws)
  }
  on(method, fn) {
    if (!this.events.has(method)) this.events.set(method, [])
    this.events.get(method).push(fn)
  }
  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`CDP timeout: ${method}`))
        }
      }, 60_000)
    })
  }
  /** Evaluate an expression in the page and return its JSON value. */
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' — ' + (r.exceptionDetails.exception?.description ?? ''))
    return r.result?.value
  }
}

// ── page helpers ─────────────────────────────────────────────────────────
async function setViewport(cdp, w, h, dsf = 1) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: w,
    height: h,
    deviceScaleFactor: dsf,
    mobile: w < 700,
    screenWidth: w,
    screenHeight: h,
  })
}

async function goto(cdp, url) {
  await cdp.send('Page.navigate', { url })
  // Wait for the load event, then let fonts and the flow systems settle.
  await cdp.eval(`new Promise(r => {
    if (document.readyState === 'complete') return r(1)
    window.addEventListener('load', () => r(1), { once: true })
    setTimeout(() => r(1), 12000)
  })`)
  await cdp.eval(`(document.fonts ? document.fonts.ready : Promise.resolve()).then(()=>1)`)
  await sleep(900)
}

/**
 * Scroll the whole page in viewport-sized steps so IntersectionObservers,
 * ScrollTriggers and lazy images all fire, then return to a chosen position.
 * Without this a full-page screenshot captures a page whose reveals never ran.
 */
async function primeScroll(cdp, settleTo = 0) {
  await cdp.eval(`(async () => {
    const step = Math.round(window.innerHeight * 0.8)
    const max = document.documentElement.scrollHeight
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y)
      await new Promise(r => setTimeout(r, 90))
    }
    window.scrollTo(0, max)
    await new Promise(r => setTimeout(r, 240))
    window.scrollTo(0, ${settleTo})
    await new Promise(r => setTimeout(r, 420))
    return 1
  })()`)
}

async function shoot(cdp, file, opts = {}) {
  const res = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: !!opts.fullPage,
    ...(opts.clip ? { clip: { ...opts.clip, scale: 1 } } : {}),
  })
  const p = path.join(OUT, file)
  mkdirSync(path.dirname(p), { recursive: true })
  writeFileSync(p, Buffer.from(res.data, 'base64'))
  return p
}

/**
 * Capture the page as a filmstrip of real viewport frames.
 *
 * `captureBeyondViewport` renders one enormous bitmap in which `position:fixed`
 * layers (the atmosphere, the grain, the navbar) tile or land in the wrong
 * place, so it does not show what a visitor actually sees. Scrolling and taking
 * ordinary viewport shots does, and it also gives every scroll-linked animation
 * a chance to settle at that position before the shutter.
 */
async function filmstrip(cdp, slug, size, vh) {
  const docH = await cdp.eval('document.documentElement.scrollHeight')
  const frames = Math.min(30, Math.max(1, Math.ceil(docH / vh)))
  const files = []
  for (let i = 0; i < frames; i++) {
    const y = Math.min(i * vh, docH - vh)
    await cdp.eval(`window.scrollTo(0, ${y})`)
    await sleep(360) // let scrub animations land on this position
    files.push(await shoot(cdp, `frames/${slug}__${size}__${String(i + 1).padStart(2, '0')}.png`))
  }
  return { frames, docH }
}

/** Structural assertions that need a compositing browser to be meaningful. */
async function measure(cdp) {
  return cdp.eval(`(() => {
    const d = document.documentElement
    // headings clipped by an ancestor, or reduced to a mid-word fragment
    const clipped = []
    document.querySelectorAll('h1,h2,h3').forEach(h => {
      const hr = h.getBoundingClientRect()
      if (hr.width === 0 || hr.height === 0) return
      let p = h.parentElement
      while (p && p !== document.body) {
        const cs = getComputedStyle(p)
        // Only the VERTICAL axis can clip a heading's ascenders, which is what
        // this looks for. Testing the overflow shorthand as well reported a
        // false positive for overflow-x:clip, where the vertical axis is still
        // visible and nothing is actually cut.
        if (cs.overflowY !== 'visible') {
          const pr = p.getBoundingClientRect()
          if (hr.bottom > pr.bottom + 2 || hr.top < pr.top - 2) {
            clipped.push({ text: (h.textContent||'').trim().slice(0,44), by: p.className.toString().slice(0,40) })
            break
          }
        }
        p = p.parentElement
      }
    })
    // any element wider than the viewport that is NOT clipped by an ancestor
    const w = d.clientWidth
    const bleed = []
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return
      if (r.right <= w + 1 && r.left >= -1) return
      let p = el.parentElement, clip = false
      while (p && p !== document.body) {
        if (getComputedStyle(p).overflowX !== 'visible') { clip = true; break }
        p = p.parentElement
      }
      if (!clip) bleed.push(el.tagName + '.' + el.className.toString().slice(0,34))
    })
    const vids = [...document.querySelectorAll('video')]
    return {
      path: location.pathname,
      vw: w,
      docH: d.scrollHeight,
      screens: +(d.scrollHeight / window.innerHeight).toFixed(1),
      overflowX: d.scrollWidth - w,
      bleed: [...new Set(bleed)].slice(0, 8),
      clippedHeadings: clipped.slice(0, 8),
      videos: vids.length,
      playing: vids.filter(v => !v.paused).length,
      // Touch targets. An absolutely-positioned ::before is the standard way to
      // widen a hit area without changing the visual size, and it does not show
      // up in getBoundingClientRect — so measure it in.
      smallTargets: [...document.querySelectorAll('a[href],button')]
        .filter(e => {
          const r = e.getBoundingClientRect()
          if (r.height <= 0) return false
          const bef = getComputedStyle(e, '::before')
          let padW = 0, padH = 0
          if (bef.content !== 'none' && bef.position === 'absolute') {
            padW = Math.abs(parseFloat(bef.left) || 0) + Math.abs(parseFloat(bef.right) || 0)
            padH = Math.abs(parseFloat(bef.top) || 0) + Math.abs(parseFloat(bef.bottom) || 0)
          }
          return (r.height + padH) < 43.5 && (r.width + padW) < 43.5
        })
        .map(e => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 26))
        .slice(0, 6),
    }
  })()`)
}

/** Where the signal tip sits in the viewport, as a fraction (target 0.58–0.66). */
async function signalTip(cdp) {
  return cdp.eval(`(() => {
    const path = document.querySelector('[data-flow-thread-path]')
    if (!path) return null
    // The browser normalises inline rgb() with spaces, so match on the numbers.
    const dot = [...document.querySelectorAll('div')].find(
      d => d.style && d.style.borderRadius === '9999px' && /137/.test(d.style.boxShadow || '')
    )
    if (!dot) return { noDot: true, dashOffset: Math.round(parseFloat(path.style.strokeDashoffset || '0')) }
    const r = dot.getBoundingClientRect()
    return {
      opacity: dot.style.opacity,
      tipFraction: +((r.top + r.height/2) / window.innerHeight).toFixed(3),
      dashOffset: Math.round(parseFloat(path.style.strokeDashoffset || '0')),
      dashArray: Math.round(parseFloat(path.style.strokeDasharray || '0')),
    }
  })()`)
}

// ── main ─────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true })

/**
 * Attach to an already-running headless Chrome if one is listening, otherwise
 * launch one. Attaching is the normal path here: this shell sandbox refuses to
 * spawn browser binaries (`spawn UNKNOWN` / EPERM), so Chrome is started
 * alongside via PowerShell and this script connects to it.
 */
let proc = null
if (await endpointUp()) {
  console.log(`attaching to existing CDP endpoint on :${PORT}`)
} else {
  const chrome = findChrome()
  console.log('launching:', chrome)
  proc = spawn(chrome, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--force-device-scale-factor=1',
    `--user-data-dir=${path.join(os.tmpdir(), 'cineheight-shoot-profile')}`,
    'about:blank',
  ], { stdio: 'ignore' })
  process.on('exit', () => proc?.kill())
  process.on('SIGINT', () => { proc?.kill(); process.exit(1) })
}

// wait for the debugging endpoint
let target = null
for (let i = 0; i < 60; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    target = list.find((t) => t.type === 'page')
    if (target) break
  } catch {}
  await sleep(250)
}
if (!target) throw new Error(`No CDP page target on :${PORT}. Start headless Chrome first.`)

const cdp = await CDP.connect(target.webSocketDebuggerUrl)
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')
await cdp.send('Log.enable')
await cdp.send('Network.enable')

const consoleErrors = []
const failedRequests = []
cdp.on('Log.entryAdded', ({ entry }) => {
  if (entry.level === 'error') consoleErrors.push(`${entry.url ?? ''} ${entry.text}`.trim().slice(0, 180))
})
cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
  consoleErrors.push((exceptionDetails.text + ' ' + (exceptionDetails.exception?.description ?? '')).slice(0, 180))
})
cdp.on('Network.responseReceived', ({ response }) => {
  if (response.status >= 400) failedRequests.push(`${response.status} ${response.url}`)
})

if (hasFlag('reduced')) {
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  console.log('emulating prefers-reduced-motion: reduce')
}

/* ── interaction probes ───────────────────────────────────────────────── */
if (hasFlag('probe')) {
  await setViewport(cdp, 1440, 900, 2)
  const results = []
  const check = (name, pass, detail = '', applicable = true) =>
    results.push({
      name,
      status: applicable ? (pass ? 'PASS' : 'FAIL') : 'NOT APPLICABLE',
      detail: String(detail).slice(0, 160),
    })

  // ---- signal tip tracking, forwards and in reverse --------------------
  await goto(cdp, BASE + '/')
  const fontState = await cdp.eval(`(async () => {
    await document.fonts.ready
    const style = getComputedStyle(document.documentElement)
    const family = (selector) => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element).fontFamily : ''
    }
    return {
      status: document.fonts.status,
      hero: family('.font-hero'),
      display: family('.font-display'),
      body: family('.font-body'),
      bebas: style.getPropertyValue('--font-bebas').trim(),
      satoshi: style.getPropertyValue('--font-satoshi').trim(),
      poppins: style.getPropertyValue('--font-poppins').trim(),
    }
  })()`)
  check(
    'Bebas, Satoshi and Poppins typography is loaded and mapped distinctly',
    fontState.status === 'loaded' &&
      fontState.hero && fontState.display && fontState.body &&
      fontState.bebas && fontState.satoshi && fontState.poppins &&
      fontState.hero !== fontState.display &&
      fontState.display !== fontState.body,
    JSON.stringify(fontState)
  )

  /*
   * The process journey is scroll-scrubbed, so the invariants are different
   * from the old fire-once version: it must draw as you descend, RETRACT as you
   * come back up, and — the point of the rebuild — its geometry must be
   * measured, meaning the drawn line actually passes through every node and the
   * travelling pulse sits exactly on the leading edge.
   */
  const processState = await cdp.eval(`(async () => {
    const root = document.querySelector('#process')
    const path = root?.querySelector('[data-process-path]')
    const pulse = root?.querySelector('[data-process-pulse]')
    const title = root?.querySelector('[data-process-title]')
    const nodes = [...(root?.querySelectorAll('[data-process-node]') ?? [])]
    if (!root || !path || !pulse || !title || nodes.length !== 4) return null

    const titles = [...root.querySelectorAll('[data-process-title]')]
    const read = () => ({
      dash: Number.parseFloat(getComputedStyle(path).strokeDashoffset),
      titleOpacity: Number.parseFloat(getComputedStyle(title).opacity),
      lastTitleOpacity: Number.parseFloat(getComputedStyle(titles[titles.length - 1]).opacity),
    })
    /** Shortest distance from a point to the drawn path, in px. */
    const distanceToPath = (x, y) => {
      const total = path.getTotalLength()
      let best = Infinity
      for (let i = 0; i <= 400; i++) {
        const p = path.getPointAtLength((total * i) / 400)
        const d = Math.hypot(p.x - x, p.y - y)
        if (d < best) best = d
      }
      return best
    }

    const scrollToOffset = (fraction) => {
      const rect = root.getBoundingClientRect()
      window.scrollTo(0, rect.top + window.scrollY - innerHeight * fraction)
    }

    scrollToOffset(0.95)
    await new Promise(r => setTimeout(r, 500))
    const before = read()

    scrollToOffset(0.35)
    await new Promise(r => setTimeout(r, 900))
    const mid = read()
    // Is the pulse on the line, and is it at the leading edge of the fill?
    const total = path.getTotalLength()
    const pulsePoint = { x: Number(pulse.getAttribute('cx')), y: Number(pulse.getAttribute('cy')) }
    const pulseOffPath = distanceToPath(pulsePoint.x, pulsePoint.y)
    const drawnLength = total - mid.dash
    const edge = path.getPointAtLength(Math.max(0, Math.min(total, drawnLength)))
    const pulseToEdge = Math.hypot(edge.x - pulsePoint.x, edge.y - pulsePoint.y)

    // Every node must sit on the curve, at every viewport.
    const nodesOffPath = nodes.map(n =>
      distanceToPath(Number(n.getAttribute('cx')), Number(n.getAttribute('cy')))
    )

    // Scrub (0.75) plus smooth scrolling means a long jump needs real settle
    // time before the value can be trusted.
    scrollToOffset(-0.6)
    await new Promise(r => setTimeout(r, 1800))
    const complete = read()

    scrollToOffset(0.95)
    await new Promise(r => setTimeout(r, 1800))
    const reversed = read()

    return {
      before, mid, complete, reversed,
      pulseOffPath, pulseToEdge,
      maxNodeOffPath: Math.max(...nodesOffPath),
    }
  })()`)
  check(
    'process path is measured — every node and the pulse sit on the drawn line',
    processState &&
      processState.maxNodeOffPath < 1.5 &&
      processState.pulseOffPath < 1.5 &&
      processState.pulseToEdge < 4,
    JSON.stringify(processState && {
      maxNodeOffPath: processState.maxNodeOffPath,
      pulseOffPath: processState.pulseOffPath,
      pulseToEdge: processState.pulseToEdge,
    }),
    !!processState
  )
  check(
    'process line scrubs forward, completes, and retracts on reverse scroll',
    processState &&
      processState.before.dash > processState.mid.dash &&
      processState.mid.dash > processState.complete.dash &&
      processState.complete.dash < 2 &&
      processState.reversed.dash > processState.complete.dash + 50 &&
      // Text is never withheld: even un-activated it stays legible, and the
      // leading step is the brightest once the line has run its course while
      // earlier steps only quieten a little.
      processState.before.titleOpacity >= 0.3 &&
      processState.complete.lastTitleOpacity > 0.95 &&
      processState.complete.titleOpacity > 0.8,
    processState
      ? `dash ${processState.before.dash.toFixed(0)} → ${processState.mid.dash.toFixed(0)} → ` +
        `${processState.complete.dash.toFixed(0)} → ${processState.reversed.dash.toFixed(0)} ` +
        `(first title ${processState.before.titleOpacity.toFixed(2)} → ${processState.complete.titleOpacity.toFixed(2)}, ` +
        `last ${processState.complete.lastTitleOpacity.toFixed(2)})`
      : 'ProcessCompact is not mounted on any live route',
    !!processState
  )

  const marqueeState = await cdp.eval(`(async () => {
    const root = document.querySelector('[aria-label="Brands we have worked with"]')
    const track = root?.querySelector('[data-client-marquee-track="forward"]')
    const extra = root?.querySelectorAll('[data-client-marquee-track]').length ?? 0
    const groups = root?.querySelectorAll('[data-client-marquee-track] > ul') ?? []
    if (!root || !track) return null
    const x = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41
    root.scrollIntoView({ block: 'center' })
    await new Promise(r => setTimeout(r, 320))
    const first = x()
    await new Promise(r => setTimeout(r, 650))
    const second = x()
    root.dispatchEvent(new PointerEvent('pointerenter'))
    await new Promise(r => setTimeout(r, 420))
    const pausedA = x()
    await new Promise(r => setTimeout(r, 420))
    const pausedB = x()
    root.dispatchEvent(new PointerEvent('pointerleave'))
    return {
      first, second, pausedA, pausedB,
      trackCount: extra,
      groupCount: groups.length,
      hiddenClones: [...groups].filter(g => g.getAttribute('aria-hidden') === 'true').length,
    }
  })()`)
  check(
    'one logo carousel drifts continuously, pauses on hover, and hides its clones',
    marqueeState &&
      marqueeState.trackCount === 1 &&
      marqueeState.second < marqueeState.first &&
      Math.abs(marqueeState.pausedB - marqueeState.pausedA) < 1.5 &&
      marqueeState.hiddenClones === marqueeState.groupCount - 1,
    JSON.stringify(marqueeState)
  )

  await goto(cdp, BASE + '/')
  await primeScroll(cdp, 0)
  const tips = []
  for (const frac of [0.2, 0.4, 0.6, 0.8, 0.55, 0.3, 0.1]) {
    await cdp.eval(`window.scrollTo(0, document.documentElement.scrollHeight * ${frac})`)
    await sleep(520)
    const t = await signalTip(cdp)
    tips.push({ frac, ...(t ?? {}) })
  }
  const tracked = tips.filter((t) => t.tipFraction != null && t.opacity !== '0')
  check(
    'signal tip stays 0.58–0.66 down the viewport',
    tracked.length > 0 && tracked.every((t) => t.tipFraction >= 0.55 && t.tipFraction <= 0.69),
    tracked.map((t) => `${t.frac}:${t.tipFraction}`).join(' ')
  )
  // Reverse scroll must shorten the drawn length again.
  const down = tips.find((t) => t.frac === 0.8)
  const back = tips.find((t) => t.frac === 0.1)
  check(
    'signal retracts on reverse scroll',
    down && back && back.dashOffset > down.dashOffset,
    `offset at 0.8 = ${down?.dashOffset}, back at 0.1 = ${back?.dashOffset}`
  )
  await cdp.eval(`window.scrollTo(0,0)`)
  await sleep(400)
  const atTop = await signalTip(cdp)
  check(
    'signal starts undrawn at the top (no flash)',
    atTop && atTop.dashArray > 0 && atTop.dashOffset >= atTop.dashArray * 0.985,
    `offset ${atTop?.dashOffset} of ${atTop?.dashArray}`
  )

  // ---- cursor trail: DPR cap, idle sleep, visibility sleep --------------
  await cdp.eval(`document.querySelector('#what-we-do')?.scrollIntoView({ block: 'center' })`)
  await sleep(700)
  const textLayerState = await cdp.eval(`(() => {
    const layer = document.querySelector('#what-we-do [data-text-layer-active]')
    if (!layer) return null
    return {
      active: layer.dataset.textLayerActive === 'true',
      willChange: getComputedStyle(layer).willChange,
    }
  })()`)
  check(
    'visible transformed typography receives compositor promotion',
    textLayerState?.active && textLayerState.willChange.includes('transform'),
    textLayerState ? JSON.stringify(textLayerState) : 'AgencyProposition is not mounted on any live route',
    !!textLayerState
  )
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720, y: 450 })
  await sleep(500)
  const canvasDpr = await cdp.eval(`(() => {
    const canvas = document.querySelector('[data-cursor-trail]')
    if (!canvas) return null
    return {
      x: Number((canvas.width / canvas.clientWidth).toFixed(2)),
      y: Number((canvas.height / canvas.clientHeight).toFixed(2)),
      device: devicePixelRatio,
      profile: canvas.dataset.motionProfile,
      trailPoints: Number(canvas.dataset.trailPoints),
      hasContourPoints: 'contourPoints' in canvas.dataset,
    }
  })()`)
  check(
    'cursor trail canvas caps backing DPR at 1.5',
    canvasDpr && canvasDpr.x <= 1.5 && canvasDpr.y <= 1.5 && canvasDpr.device === 2,
    canvasDpr ? `${canvasDpr.x}x / ${canvasDpr.y}x at device ${canvasDpr.device}` : 'canvas missing'
  )
  check(
    'adaptive profile sizes the trail buffer and drops the contour field',
    canvasDpr &&
      ['high', 'balanced'].includes(canvasDpr.profile) &&
      canvasDpr.trailPoints >= 12 &&
      canvasDpr.hasContourPoints === false,
    canvasDpr
      ? `${canvasDpr.profile}; trail=${canvasDpr.trailPoints}; contourPoints=${canvasDpr.hasContourPoints}`
      : 'canvas missing'
  )

  // ---- the retired contour system must stay gone -----------------------
  const contourGone = await cdp.eval(`(() => {
    const field = document.querySelector('.static-contour-field')
    return {
      present: !!field,
      playground: !!document.querySelector('[data-signal-playground]'),
      flagged: document.documentElement.dataset.contourActive ?? null,
    }
  })()`)
  check(
    'the retired pointer contour field is absent from the live page',
    contourGone.playground === false &&
      contourGone.flagged === null &&
      contourGone.present === false,
    JSON.stringify(contourGone)
  )

  // ---- the background reacts to neither pointer nor scroll -------------
  const atmosphereSnapshot = `(() => {
    const root = document.querySelector('[data-atmosphere]')
    if (!root) return null
    const parts = [getComputedStyle(root).transform]
    for (const child of root.children) {
      const s = getComputedStyle(child)
      parts.push(s.backgroundImage, s.backgroundPosition, s.transform, s.opacity)
    }
    return parts.join('|')
  })()`
  const atmosphereBefore = await cdp.eval(atmosphereSnapshot)
  for (const [x, y] of [[200, 160], [1100, 700], [640, 300], [1350, 120]]) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await sleep(60)
  }
  await cdp.eval(`window.scrollTo(0, document.documentElement.scrollHeight * 0.55)`)
  await sleep(900)
  const atmosphereAfter = await cdp.eval(atmosphereSnapshot)
  check(
    'the background reacts to neither pointer nor scroll',
    atmosphereBefore && atmosphereBefore === atmosphereAfter,
    atmosphereBefore === atmosphereAfter ? 'identical' : `${atmosphereBefore}\n!==\n${atmosphereAfter}`
  )

  // ---- the dot sits on the pointer, and the trail never spans a jump ---
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 812, y: 396 })
  await sleep(120)
  const dotOffset = await cdp.eval(`(() => {
    const dot = document.querySelector('[data-signal-cursor] .signal-cursor-dot')
    if (!dot) return null
    const r = dot.getBoundingClientRect()
    return { dx: Number((r.left + r.width / 2 - 812).toFixed(2)), dy: Number((r.top + r.height / 2 - 396).toFixed(2)) }
  })()`)
  check(
    'the cursor dot sits on the pointer within 2px',
    dotOffset && Math.abs(dotOffset.dx) <= 2 && Math.abs(dotOffset.dy) <= 2,
    dotOffset ? `dx ${dotOffset.dx}, dy ${dotOffset.dy}` : 'dot missing'
  )

  // A reload gives a genuinely first-ever pointer event, which is the case
  // that used to draw a chord out of the viewport centre.
  await goto(cdp, BASE + '/')
  await sleep(500)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1180, y: 300 })
  await sleep(140)
  const firstEntry = await cdp.eval(`(() => {
    const c = window.__cineheightCursor
    if (!c) return null
    const cx = innerWidth / 2
    const cy = innerHeight / 2
    let far = 0
    let nearCentre = 0
    for (const [x, y] of c.points) {
      far = Math.max(far, Math.hypot(x - 1180, y - 300))
      if (Math.hypot(x - cx, y - cy) < 60) nearCentre++
    }
    return { seeded: c.seeded, far: Number(far.toFixed(1)), nearCentre, maxChord: Number(c.maxChord.toFixed(1)) }
  })()`)
  check(
    'the trail seeds at the pointer, never from the viewport centre',
    firstEntry && firstEntry.seeded && firstEntry.far < 220 && firstEntry.nearCentre === 0,
    firstEntry ? JSON.stringify(firstEntry) : '__cineheightCursor missing'
  )

  /*
   * Real travel, so the buffer actually fills with distinct points: a single
   * stationary move collapses every sample onto one spot and would satisfy the
   * chord bound trivially. Steps are ~44px, comfortably inside JUMP_PX, so the
   * trail must span real distance while no segment stretches into a chord.
   */
  for (let i = 0; i < 14; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 420 + i * 40, y: 300 + i * 18 })
    await sleep(22)
  }
  const inMotion = await cdp.eval(`(() => {
    const c = window.__cineheightCursor
    if (!c) return null
    const pts = c.points
    const span = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1])
    return { maxChord: Number(c.maxChord.toFixed(1)), span: Number(span.toFixed(1)) }
  })()`)
  check(
    'a moving pointer grows a real trail with no long chords',
    inMotion && inMotion.span > 40 && inMotion.maxChord > 1 && inMotion.maxChord < 220,
    inMotion ? `span ${inMotion.span}, maxChord ${inMotion.maxChord}` : '__cineheightCursor missing'
  )

  // Now teleport. The buffer is full of real points, so a naive implementation
  // would leave one segment spanning the whole jump.
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1320, y: 800 })
  await sleep(40)
  const afterJump = await cdp.eval(`(() => {
    const c = window.__cineheightCursor
    if (!c) return null
    let far = 0
    for (const [x, y] of c.points) far = Math.max(far, Math.hypot(x - 1320, y - 800))
    return { maxChord: Number(c.maxChord.toFixed(1)), far: Number(far.toFixed(1)) }
  })()`)
  check(
    'a large pointer jump reseeds instead of drawing a long chord',
    afterJump && afterJump.maxChord < 220 && afterJump.far < 220,
    afterJump ? `maxChord ${afterJump.maxChord}, farthest point ${afterJump.far}` : 'missing'
  )

  await cdp.eval(`document.querySelector('#what-we-do')?.scrollIntoView({ block: 'center' })`)
  await sleep(500)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720, y: 450 })
  await sleep(300)

  const canvasHash = `(() => {
    const canvas = document.querySelector('[data-cursor-trail]')
    if (!canvas) return null
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    let hash = 2166136261
    for (let i = 0; i < data.length; i += 977) hash = Math.imul(hash ^ data[i], 16777619)
    return hash >>> 0
  })()`
  await sleep(2900)
  const idleHashA = await cdp.eval(canvasHash)
  await sleep(450)
  const idleHashB = await cdp.eval(canvasHash)
  check('cursor trail sleeps after idle', idleHashA != null && idleHashA === idleHashB, `${idleHashA} → ${idleHashB}`)

  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 590, y: 540 })
  await sleep(180)
  await cdp.eval(`Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`)
  await sleep(160)
  const hiddenHashA = await cdp.eval(canvasHash)
  await sleep(420)
  const hiddenHashB = await cdp.eval(canvasHash)
  check('cursor trail sleeps while document is hidden', hiddenHashA != null && hiddenHashA === hiddenHashB, `${hiddenHashA} → ${hiddenHashB}`)
  await cdp.eval(`Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`)

  /*
   * home-work / work-index media slots: sapale-yamaha, sindhudurg-education
   * and divija-old-age-home are `desktop-ready` in content/mediaSlots.ts —
   * real desktop asset, no mobile/ultrawide file yet. At 1440px the fallback
   * <source> (no media query) must load the desktop asset; at a real mobile
   * viewport the mobile-specific <source> must never be requested (see
   * components/media/MediaSpecPlaceholder.tsx), so nobody 404s.
   */
  const DESKTOP_READY_IDS = ['sapale-yamaha', 'sindhudurg-education', 'divija-old-age-home']
  const resourceNames = () => cdp.eval(`performance.getEntriesByType('resource').map(e => e.name)`)

  await goto(cdp, BASE + '/')
  await sleep(450)
  const homeInitialLoads = await resourceNames()
  const homeInitialVideos = DESKTOP_READY_IDS.filter(
    (id) => homeInitialLoads.some((name) => name.endsWith(`/media/home-work/${id}-desktop.mp4`))
  )
  check(
    'homepage project films do not load before Featured Work approaches the viewport',
    homeInitialVideos.length === 0,
    homeInitialVideos.length ? `loaded early: ${homeInitialVideos.join(', ')}` : 'no early project-film requests'
  )

  await cdp.eval(`document.querySelector('#work')?.scrollIntoView({ block: 'center' })`)
  await sleep(1000)
  const homeNearLoads = await resourceNames()
  const homeNearVideoState = await cdp.eval(`({
    sectionTop: Math.round(document.querySelector('#work')?.getBoundingClientRect().top ?? -1),
    videos: [...document.querySelectorAll('#work video')].map(video => ({
      currentSrc: video.currentSrc,
      paused: video.paused,
      readyState: video.readyState,
    })),
    requests: performance.getEntriesByType('resource')
      .map(entry => entry.name)
      .filter(name => name.includes('/media/home-work/')),
  })`)
  check(
    'Featured Work loads a project film once the section is near the viewport',
    DESKTOP_READY_IDS.some((id) =>
      homeNearLoads.some((name) => name.endsWith(`/media/home-work/${id}-desktop.mp4`))
    ) || homeNearVideoState.videos.some((video) =>
      DESKTOP_READY_IDS.some((id) => video.currentSrc.endsWith(`/media/home-work/${id}-desktop.mp4`)) &&
      video.readyState >= 2 && !video.paused
    ),
    JSON.stringify(homeNearVideoState)
  )

  await goto(cdp, BASE + '/work')
  await sleep(700)
  const indexDesktopLoads = await resourceNames()
  const indexDesktopMisses = DESKTOP_READY_IDS.filter(
    (id) => !indexDesktopLoads.some((name) => name.endsWith(`/media/work-index/${id}-desktop.webp`))
  )
  check(
    'work-index desktop-ready slots load their real desktop image at 1440px',
    indexDesktopMisses.length === 0,
    indexDesktopMisses.join(', ')
  )

  // A genuine mobile-width visitor must stay poster-only before the section,
  // then request exactly the supplied mobile class rather than the fallback.
  await setViewport(cdp, 390, 844, 2)
  await goto(cdp, BASE + '/')
  await sleep(450)
  const homeMobileInitialLoads = await resourceNames()
  const mobileInitialProjectVideos = homeMobileInitialLoads.filter((name) =>
    /\/media\/home-work\/[^/]+-(mobile|desktop|ultrawide)\.mp4$/.test(name)
  )
  check(
    'mobile homepage stays poster-only before Featured Work approaches',
    mobileInitialProjectVideos.length === 0,
    mobileInitialProjectVideos.join(', ')
  )
  await cdp.eval(`document.querySelector('#work')?.scrollIntoView({ block: 'center' })`)
  await sleep(1000)
  const homeMobileLoads = await resourceNames()
  await goto(cdp, BASE + '/work')
  await sleep(700)
  const indexMobileLoads = await resourceNames()
  const mobileFilmHits = DESKTOP_READY_IDS.filter((id) =>
    homeMobileLoads.some((name) => name.endsWith(`/media/home-work/${id}-mobile.mp4`))
  )
  const desktopFilmHits = DESKTOP_READY_IDS.filter((id) =>
    homeMobileLoads.some((name) => name.endsWith(`/media/home-work/${id}-desktop.mp4`))
  )
  check(
    'Featured Work selects a mobile film without also downloading its desktop source',
    mobileFilmHits.length === 1 && desktopFilmHits.length === 0,
    `mobile=${mobileFilmHits.join(',') || 'none'} desktop=${desktopFilmHits.join(',') || 'none'}`
  )

  const forbiddenIndexSuffixes = DESKTOP_READY_IDS.flatMap((id) => [
    `/media/work-index/${id}-mobile.webp`,
  ])
  const forbiddenHits = forbiddenIndexSuffixes.filter((suffix) =>
    indexMobileLoads.some((name) => name.endsWith(suffix))
  )
  check(
    'desktop-ready work-index slots never request unsupplied mobile variants at 390px',
    forbiddenHits.length === 0,
    forbiddenHits.join(', ')
  )
  await setViewport(cdp, 1440, 900, 2) // restore before downstream probes

  /*
   * The Work H1 used to be N stacked <h1> elements, each carrying the caller's
   * `mt-6`, so the in-flow copy and the absolute slices had different vertical
   * origins and the automatic parallax field moved each duplicate on its own.
   * Assert one heading, the complete phrase, and slices that share bounds — at
   * the narrowest supported width as well as the default one.
   */
  const workHeading = async (w, h) => {
    await setViewport(cdp, w, h, 2)
    await goto(cdp, BASE + '/work')
    await sleep(1400)
    return cdp.eval(`(() => {
      const headings = document.querySelectorAll('main h1')
      const h1 = document.querySelector('[data-audit="work-heading"]')
      if (!h1) return { count: headings.length }
      const box = h1.getBoundingClientRect()
      return {
        n: headings.length,
        sr: h1.querySelector('.sr-only')?.textContent?.trim() ?? '',
        visual: h1.querySelector('[aria-hidden="true"]')?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        op: Number(getComputedStyle(h1).opacity),
        over: Number((box.right - document.documentElement.clientWidth).toFixed(1)),
        visible: box.width > 0 && box.height > 0,
      }
    })()`)
  }
  /*
   * The slice bands must leave no seam. Adjacent `clip-path` edges on the same
   * row each antialias to roughly half coverage, so a naive abutting layout
   * paints a permanent grey hairline through every glyph. Screenshot a stroke
   * of the heading and assert that the darkest row inside the glyph is still
   * essentially white — measured, because it is invisible in DOM numbers.
   */
  const headingSeam = async () => {
    const box = await cdp.eval(`(() => {
      const h1 = document.querySelector('main h1')
      if (!h1) return null
      const r = h1.getBoundingClientRect()
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
    })()`)
    if (!box) return null
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 },
    })
    const png = Buffer.from(shot.data, 'base64')
    writeFileSync(path.join(OUT, `seam-${box.w}x${box.h}.png`), png)
    const { default: sharp } = await import('sharp')
    const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true })
    // Walk the column that runs down the stem of the first letter: rows there
    // are either background or solid glyph, so a seam shows up as a dip.
    let bestColumn = 0
    let bestSolid = 0
    for (let x = 0; x < info.width; x++) {
      let solid = 0
      for (let y = 0; y < info.height; y++) if (data[y * info.width + x] > 200) solid++
      if (solid > bestSolid) {
        bestSolid = solid
        bestColumn = x
      }
    }
    /*
     * A seam is a DIP: a row that is dimmer than solid while both neighbours
     * are solid. That excludes the glyph's own antialiased top and bottom
     * rows, whose outward neighbour is background rather than ink.
     */
    let dimmest = 255
    let at = -1
    for (let y = 1; y < info.height - 1; y++) {
      const above = data[(y - 1) * info.width + bestColumn]
      const v = data[y * info.width + bestColumn]
      const below = data[(y + 1) * info.width + bestColumn]
      if (above > 200 && below > 200 && v < dimmest) {
        dimmest = v
        at = y
      }
    }
    return { column: bestColumn, solidRows: bestSolid, dimmest, at }
  }

  for (const [w, h] of [[390, 844], [1440, 900], [1920, 600]]) {
    const wh = await workHeading(w, h)
    check(
      `work heading is one complete h1 at ${w}x${h}`,
      wh.n === 1 &&
        wh.sr === 'Proof, not promises.' &&
        wh.visual.length > 0 &&
        wh.op === 1 &&
        wh.over <= 0 &&
        wh.visible === true,
      `n=${wh.n} sr="${wh.sr}" visual="${wh.visual}" op=${wh.op} over=${wh.over} visible=${wh.visible}`
    )
    const seam = await headingSeam()
    check(
      `work heading has no slice seam at ${w}x${h}`,
      seam && seam.solidRows > 8 && seam.dimmest >= 200,
      seam ? `stem column ${seam.column}, ${seam.solidRows} solid rows, dimmest ${seam.dimmest} at row ${seam.at}` : 'no heading'
    )
  }
  await setViewport(cdp, 1440, 900, 2)

  // Both form variants preserve a predictable keyboard sequence.
  const formOrder = async (route, variant) => {
    await goto(cdp, BASE + route)
    return cdp.eval(`(() => {
      const form = document.querySelector('[data-contact-form="${variant}"]')
      return form ? [...form.querySelectorAll('input:not([tabindex="-1"]), select, textarea, button')]
        .filter(element => !element.disabled)
        .map(element => element.name || element.type) : []
    })()`)
  }
  const compactOrder = await formOrder('/', 'compact')
  check(
    'compact form keyboard order is complete',
    compactOrder.join(',') === 'name,contact,company,service,projectDetails,submit',
    compactOrder.join(' → ')
  )
  const fullOrder = await formOrder('/contact', 'full')
  check(
    'full form keyboard order is complete',
    fullOrder.join(',') === 'name,contact,company,service,preferredContact,timeline,projectDetails,submit',
    fullOrder.join(' → ')
  )

  await setViewport(cdp, 1440, 900, 2)
  await goto(cdp, BASE + '/')
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  const skipFirst = await cdp.eval(`({
    text: document.activeElement?.textContent?.trim(),
    href: document.activeElement?.getAttribute?.('href'),
  })`)
  check(
    'the skip link is the first keyboard destination',
    skipFirst.text === 'Skip to main content' && skipFirst.href === '#main-content',
    JSON.stringify(skipFirst)
  )
  await cdp.eval(`document.activeElement?.click()`)
  await sleep(650)
  const skippedMain = await cdp.eval(`({
    activeId: document.activeElement?.id,
    mainCount: document.querySelectorAll('main#main-content').length,
    top: Math.round(document.querySelector('main#main-content')?.getBoundingClientRect().top ?? -1),
  })`)
  check(
    'the skip link focuses the sole route main without negative clipping',
    skippedMain.activeId === 'main-content' && skippedMain.mainCount === 1 && skippedMain.top >= 0,
    JSON.stringify(skippedMain)
  )

  const navTargets = await cdp.eval(`[...document.querySelectorAll('nav[aria-label="Primary"] a')].map(link => {
    const rect = link.getBoundingClientRect()
    return { label: link.textContent.trim(), width: Math.round(rect.width), height: Math.round(rect.height) }
  })`)
  check(
    'desktop primary navigation links have 44px interaction areas',
    navTargets.length > 0 && navTargets.every(target => target.width >= 44 && target.height >= 44),
    JSON.stringify(navTargets)
  )

  await goto(cdp, BASE + '/contact')
  await cdp.eval(`document.querySelector('[data-contact-form="full"]')?.requestSubmit()`)
  await sleep(180)
  const invalidRecovery = await cdp.eval(`({
    activeName: document.activeElement?.getAttribute?.('name'),
    invalidCount: document.querySelectorAll('[data-contact-form="full"] [aria-invalid="true"]').length,
    message: document.querySelector('[data-contact-form="full"] [aria-live="polite"]')?.textContent?.trim(),
  })`)
  check(
    'contact validation focuses the first invalid field and announces recovery',
    invalidRecovery.activeName === 'name' && invalidRecovery.invalidCount === 4 && invalidRecovery.message === 'Check the highlighted fields.',
    JSON.stringify(invalidRecovery)
  )

  for (const width of [320, 360, 390, 430]) {
    await setViewport(cdp, width, 844, 2)
    await goto(cdp, BASE + '/')
    await cdp.eval(`document.querySelector('[data-audit="home-capabilities"]')?.scrollIntoView({ block: 'center' })`)
    await sleep(300)
    const capabilityFit = await cdp.eval(`(() => {
      const root = document.querySelector('[data-audit="home-capabilities"]')
      const taxonomies = [...(root?.querySelectorAll('[data-audit="capability-taxonomy"]') ?? [])]
      const textNodes = [...(root?.querySelectorAll('button span') ?? [])]
      const outOfBounds = textNodes.filter(node => {
        const rect = node.getBoundingClientRect()
        return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1)
      })
      return {
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        clipped: taxonomies.filter(node => node.scrollWidth > node.clientWidth + 1).length,
        hidden: taxonomies.filter(node => getComputedStyle(node).display === 'none').length,
        outOfBounds: outOfBounds.slice(0, 4).map(node => ({
          text: node.textContent.trim().slice(0, 36),
          left: Math.round(node.getBoundingClientRect().left),
          right: Math.round(node.getBoundingClientRect().right),
        })),
      }
    })()`)
    check(
      `capability taxonomy fits without hiding content at ${width}px`,
      capabilityFit.pageOverflow <= 1 && capabilityFit.clipped === 0 && capabilityFit.hidden === 0 && capabilityFit.outOfBounds.length === 0,
      JSON.stringify(capabilityFit)
    )
  }

  await setViewport(cdp, 320, 844, 2)
  await goto(cdp, BASE + '/')
  const capabilityZoom = await cdp.eval(`(() => {
    const root = document.querySelector('[data-audit="home-capabilities"]')
    if (!root) return null
    root.querySelectorAll('button span').forEach(node => {
      const size = parseFloat(getComputedStyle(node).fontSize)
      if (size) node.style.fontSize = (size * 2) + 'px'
    })
    const taxonomies = [...root.querySelectorAll('[data-audit="capability-taxonomy"]')]
    const textNodes = [...root.querySelectorAll('button span')]
    const outOfBounds = textNodes.filter(node => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1)
    })
    return {
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      clipped: taxonomies.filter(node => node.scrollWidth > node.clientWidth + 1).length,
      buttons: [...root.querySelectorAll('button')]
        .filter(button => button.scrollWidth > button.clientWidth + 2)
        .map(button => ({
          label: button.textContent.trim().replace(/\s+/g, ' ').slice(0, 48),
          clientWidth: button.clientWidth,
          scrollWidth: button.scrollWidth,
        })),
      outOfBounds: outOfBounds.slice(0, 4).map(node => node.textContent.trim().slice(0, 36)),
    }
  })()`)
  check(
    'capabilities remain contained with text doubled at 320px',
    capabilityZoom && capabilityZoom.pageOverflow <= 1 && capabilityZoom.clipped === 0 && capabilityZoom.buttons.length === 0 && capabilityZoom.outOfBounds.length === 0,
    JSON.stringify(capabilityZoom)
  )

  await setViewport(cdp, 390, 844, 2)
  await goto(cdp, BASE + '/')
  await cdp.eval(`document.querySelector('#stories')?.scrollIntoView({ block: 'center' })`)
  await sleep(350)
  const storyRails = await cdp.eval(`(() => {
    const canvas = document.querySelector('[data-audit="client-stories-canvas"]')
    const media = canvas?.querySelector(':scope > [data-parallax-y]')
    const controls = canvas?.querySelector('[data-story-controls]')
    const attribution = canvas?.querySelector('[data-story-attribution]')
    const mediaRect = media?.getBoundingClientRect()
    const controlRect = controls?.getBoundingClientRect()
    const buttons = [...(controls?.querySelectorAll('button') ?? [])].map(button => {
      const rect = button.getBoundingClientRect()
      return { width: Math.round(rect.width), height: Math.round(rect.height) }
    })
    return {
      present: Boolean(canvas && media && controls && attribution),
      gap: mediaRect && controlRect ? Math.round(controlRect.top - mediaRect.bottom) : -999,
      buttons,
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
    }
  })()`)
  check(
    'mobile Client Stories separates attribution and 44px controls from its film rail',
    storyRails.present && storyRails.gap >= -1 && storyRails.buttons.length === 2 &&
      storyRails.buttons.every(button => button.width >= 44 && button.height >= 44) && storyRails.pageOverflow <= 1,
    JSON.stringify(storyRails)
  )
  await setViewport(cdp, 1440, 900, 2)
  /*
   * All four social channels are launch placeholders: real buttons that
   * explain themselves, never anchors and never disabled glyphs. The probe
   * asserts they are focusable, correctly sized, navigate nowhere, and say so
   * when pressed.
   */
  const socialState = await cdp.eval(`(async () => {
    const buttons = [...document.querySelectorAll('footer button[aria-label$="link coming soon"]')]
    const anchors = [...document.querySelectorAll('footer a[aria-label*="opens in a new tab"]')]
    const target = buttons[0]
    target?.focus()
    const rect = target?.getBoundingClientRect()
    const pathBefore = location.pathname + location.hash
    target?.click()
    await new Promise(r => setTimeout(r, 120))
    const tooltip = [...document.querySelectorAll('footer [role="status"]')]
      .map(n => n.textContent.trim()).filter(Boolean).join('|')
    return {
      buttonCount: buttons.length,
      anchorCount: anchors.length,
      labels: buttons.map(b => b.getAttribute('aria-label')),
      focused: document.activeElement === target,
      width: rect?.width || 0,
      height: rect?.height || 0,
      navigated: (location.pathname + location.hash) !== pathBefore,
      tooltip,
      cursors: buttons.map(b => getComputedStyle(b).cursor),
    }
  })()`)
  check(
    'four social placeholders are focusable 44px buttons that never navigate',
    socialState.buttonCount === 4 &&
      socialState.anchorCount === 0 &&
      socialState.focused &&
      socialState.width >= 44 && socialState.height >= 44 &&
      !socialState.navigated &&
      /connected before launch/.test(socialState.tooltip) &&
      !socialState.cursors.some(c => c === 'not-allowed'),
    JSON.stringify(socialState)
  )

  /*
   * The About film's controls.
   *
   * The sweep reports these as under 44px, but it measures with the page at the
   * top, where the film is still scaled down by its own scroll-scrubbed reveal.
   * What matters is their size when the visitor has actually reached them, so
   * this measures with the film centred.
   */
  await goto(cdp, BASE + '/about')
  const filmControls = await cdp.eval(`(async () => {
    const film = document.querySelector('#showreel')
    if (!film) return null
    film.scrollIntoView({ block: 'center' })
    await new Promise(r => setTimeout(r, 1400))
    const buttons = [...film.querySelectorAll('button')]
    return buttons.map(b => {
      const r = b.getBoundingClientRect()
      return { label: (b.getAttribute('aria-label') || '').slice(0, 18), w: Math.round(r.width), h: Math.round(r.height) }
    })
  })()`)
  check(
    'inline film controls reach 44px once the film is on screen',
    Array.isArray(filmControls) && filmControls.length > 0 &&
      filmControls.every((b) => b.w >= 43.5 && b.h >= 43.5),
    JSON.stringify(filmControls)
  )

  // ---- soundscape: consent, persistence, ducking ----------------------
  /*
   * The rules being verified: nothing sounds until asked; the choice survives a
   * reload but still waits for a real gesture before creating an AudioContext;
   * an unmuted video ducks the bed; a hidden tab suspends everything.
   */
  // Start from a genuinely first-visit state; a previous run's stored choice
  // would otherwise make "off by default" untestable.
  await goto(cdp, BASE + '/')
  await cdp.eval(`localStorage.removeItem('cineheight-sound-enabled')`)
  await goto(cdp, BASE + '/')
  const soundInitial = await cdp.eval(`(() => {
    const toggle = document.querySelector('[data-sound-toggle]')
    const rect = toggle?.getBoundingClientRect()
    return {
      present: !!toggle,
      pressed: toggle?.getAttribute('aria-pressed'),
      stored: localStorage.getItem('cineheight-sound-enabled'),
      width: rect?.width || 0,
      height: rect?.height || 0,
      contexts: window.__cineheightAudio ? 1 : 0,
    }
  })()`)
  check(
    'sound is off by default and the toggle is a 44px labelled control',
    soundInitial.present &&
      soundInitial.pressed === 'false' &&
      soundInitial.stored === null &&
      soundInitial.width >= 44 && soundInitial.height >= 44,
    JSON.stringify(soundInitial)
  )

  // The navbar is deliberately hidden over the homepage hero, so scroll past it
  // before trying to click anything inside it.
  await cdp.eval(`window.scrollTo(0, innerHeight * 1.6)`)
  await sleep(1100)

  // Enable via a real click so the gesture requirement is genuinely exercised.
  const toggleBox = await cdp.eval(`(() => {
    const t = document.querySelector('[data-sound-toggle]')
    const r = t.getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  })()`)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: toggleBox.x, y: toggleBox.y, button: 'left', clickCount: 1 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toggleBox.x, y: toggleBox.y, button: 'left', clickCount: 1 })
  await sleep(900)
  const soundOn = await cdp.eval(`(() => ({
    pressed: document.querySelector('[data-sound-toggle]')?.getAttribute('aria-pressed'),
    stored: localStorage.getItem('cineheight-sound-enabled'),
    state: window.__cineheightAudio?.state ?? null,
    ducked: window.__cineheightAudio?.ducked ?? null,
  }))()`)
  check(
    'clicking the toggle starts a running AudioContext and stores the choice',
    soundOn.pressed === 'true' && soundOn.stored === 'on' && soundOn.state === 'running',
    JSON.stringify(soundOn)
  )

  // Unmute the showreel and confirm the bed gets out of its way.
  const ducking = await cdp.eval(`(async () => {
    const before = window.__cineheightAudio?.ducked
    const btn = [...document.querySelectorAll('button')]
      .find(b => /Unmute showreel/i.test(b.getAttribute('aria-label') || ''))
    if (!btn) return { error: 'no unmute control' }
    btn.click()
    await new Promise(r => setTimeout(r, 600))
    const during = window.__cineheightAudio?.ducked
    const back = [...document.querySelectorAll('button')]
      .find(b => /Mute showreel/i.test(b.getAttribute('aria-label') || ''))
    back?.click()
    await new Promise(r => setTimeout(r, 900))
    return { before, during, after: window.__cineheightAudio?.ducked }
  })()`)
  check(
    'ambient bed ducks while a video is unmuted and restores after',
    ducking.before === false && ducking.during === true && ducking.after === false,
    JSON.stringify(ducking)
  )

  // Hidden tab must suspend the graph.
  await cdp.eval(`Object.defineProperty(document,'hidden',{value:true,configurable:true}); document.dispatchEvent(new Event('visibilitychange')); 1`)
  await sleep(400)
  const suspended = await cdp.eval(`window.__cineheightAudio?.state`)
  check('audio suspends while the tab is hidden', suspended === 'suspended', String(suspended))
  await cdp.eval(`Object.defineProperty(document,'hidden',{value:false,configurable:true}); document.dispatchEvent(new Event('visibilitychange')); 1`)
  await sleep(400)

  // Reload with the preference stored: restored, but silent until a gesture.
  await goto(cdp, BASE + '/')
  await cdp.eval(`window.scrollTo(0, innerHeight * 1.6)`)
  await sleep(700)
  const afterReload = await cdp.eval(`(() => ({
    pressed: document.querySelector('[data-sound-toggle]')?.getAttribute('aria-pressed'),
    stored: localStorage.getItem('cineheight-sound-enabled'),
    state: window.__cineheightAudio?.state ?? 'none',
  }))()`)
  check(
    'a stored preference is restored without illegally autoplaying audio',
    afterReload.pressed === 'true' && afterReload.stored === 'on' && afterReload.state === 'none',
    JSON.stringify(afterReload)
  )
  // A keyboard gesture must be enough to resume.
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await sleep(700)
  const afterGesture = await cdp.eval(`window.__cineheightAudio?.state ?? 'none'`)
  check('the first keyboard gesture resumes the stored sound preference', afterGesture === 'running', String(afterGesture))

  // Leave the suite with sound off so later probes are unaffected.
  await cdp.eval(`localStorage.setItem('cineheight-sound-enabled','off')`)

  // ---- image lightbox on a case study ---------------------------------
  await goto(cdp, BASE + '/work/sapale-yamaha')
  await primeScroll(cdp, 0)
  const retainedMedia = await cdp.eval(`(() => {
    const sources = [...document.querySelectorAll('img[src], video[src], source[src]')]
      .map(element => element.getAttribute('src'))
      .filter(Boolean)
    return {
      detail: sources.filter(src => src.startsWith('/case-studies/sapale-yamaha/')).length,
      replacement: sources.filter(src => src.includes('/media/home-work/') || src.includes('/media/work-index/')).length,
    }
  })()`)
  check(
    'case-study detail media is retained alongside the shared Next Project preview',
    retainedMedia.detail > 0 && retainedMedia.replacement <= 1,
    `${retainedMedia.detail} detail sources; ${retainedMedia.replacement} shared preview source(s)`
  )
  const orbitOpened = await cdp.eval(`(async () => {
    const orbit = document.querySelector('[aria-label$="creatives"]')
    if (!orbit) return 'no orbit'
    orbit.scrollIntoView({ block: 'center' })
    await new Promise(r => setTimeout(r, 900))
    const front = [...orbit.querySelectorAll('[data-index]')]
      .find(el => (el.getAttribute('aria-label') || '').includes('Press to expand'))
    if (!front) return 'no front card'
    window.__restoreProbe = document.activeElement
    front.click()
    await new Promise(r => setTimeout(r, 700))
    const dlg = document.querySelector('[role="dialog"]')
    return dlg ? 'open' : 'did not open'
  })()`)
  check('orbit front card opens the image lightbox', orbitOpened === 'open', orbitOpened)

  const lockOk = await cdp.eval(`getComputedStyle(document.body).position === 'fixed'`)
  check('body scroll locked while lightbox is open', lockOk)

  const imgContain = await cdp.eval(`(() => {
    const img = document.querySelector('[role="dialog"] img')
    return img ? getComputedStyle(img).objectFit : 'none'
  })()`)
  check('lightbox image uses object-contain', imgContain === 'contain', imgContain)

  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await sleep(700)
  const closed = await cdp.eval(`!document.querySelector('[role="dialog"]')`)
  check('Escape closes the lightbox', closed)
  const unlocked = await cdp.eval(`getComputedStyle(document.body).position !== 'fixed'`)
  check('body scroll released after close', unlocked)

  // ---- video lightbox from the phone reels ----------------------------
  const reelOpened = await cdp.eval(`(async () => {
    const reels = document.querySelector('[aria-label$="reels"]')
    if (!reels) return 'no reels'
    reels.scrollIntoView({ block: 'center' })
    await new Promise(r => setTimeout(r, 900))
    const active = [...reels.querySelectorAll('[data-index]')]
      .find(el => (el.getAttribute('aria-label') || '').includes('open full size'))
    if (!active) return 'no active phone'
    active.click()
    await new Promise(r => setTimeout(r, 800))
    const v = document.querySelector('[role="dialog"] video')
    return v ? (v.muted ? 'open-muted' : 'open-UNMUTED') : 'did not open'
  })()`)
  check('active phone opens the video lightbox, muted', reelOpened === 'open-muted', reelOpened)

  const inlinePaused = await cdp.eval(`(() => {
    const inline = [...document.querySelectorAll('video')].filter(v => !v.closest('[role="dialog"]'))
    return inline.every(v => v.paused)
  })()`)
  check('inline reel pauses while the modal is open', inlinePaused)

  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await sleep(700)
  check('video lightbox closes on Escape', await cdp.eval(`!document.querySelector('[role="dialog"]')`))

  /*
   * Handset proportions. The shell must follow the iPhone 17 Pro body
   * (71.9/150 ≈ 0.4793) and the screen aperture inside the bezel must follow
   * the display (1206/2622 ≈ 0.460). The old 0.61 shell is what made the reels
   * read as stubby, so this is asserted rather than eyeballed.
   */
  const phoneGeometry = await cdp.eval(`(() => {
    const reels = document.querySelector('[aria-label$="reels"]')
    const card = reels?.querySelector('[data-phone-card][data-phone-active="true"]')
    if (!card) return null
    const body = card.getBoundingClientRect()
    // The screen is the padded box inside the body chrome.
    const shell = card.firstElementChild
    const screen = shell?.firstElementChild?.getBoundingClientRect()
    const media = shell?.querySelector('img[alt]:not([aria-hidden])')?.getBoundingClientRect()
    return {
      bodyRatio: body.width / body.height,
      bodyHeight: body.height,
      screenRatio: screen ? screen.width / screen.height : null,
      mediaCoversScreen: media && screen
        ? media.width >= screen.width - 1.5 && media.height >= screen.height - 1.5
        : null,
    }
  })()`)
  check(
    'phones use iPhone 17 Pro body and display proportions',
    phoneGeometry &&
      Math.abs(phoneGeometry.bodyRatio - 71.9 / 150) < 0.012 &&
      Math.abs(phoneGeometry.screenRatio - 1206 / 2622) < 0.012 &&
      phoneGeometry.bodyHeight >= 455 && phoneGeometry.bodyHeight <= 685,
    phoneGeometry
      ? `body ${phoneGeometry.bodyRatio.toFixed(4)} (want 0.4793), screen ${phoneGeometry.screenRatio?.toFixed(4)} ` +
        `(want 0.4600), h=${phoneGeometry.bodyHeight.toFixed(0)}, mediaFills=${phoneGeometry.mediaCoversScreen}`
      : 'no active phone'
  )


  // ---- videos pause when the tab is hidden ----------------------------
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 })
  await goto(cdp, BASE + '/')
  await cdp.eval(`document.querySelector('#work')?.scrollIntoView({block:'center'})`)
  await sleep(1200)
  const playingBefore = await cdp.eval(`[...document.querySelectorAll('video')].filter(v=>!v.paused).length`)
  await cdp.eval(`Object.defineProperty(document,'hidden',{value:true,configurable:true}); document.dispatchEvent(new Event('visibilitychange')); 1`)
  await sleep(600)
  const playingAfter = await cdp.eval(`[...document.querySelectorAll('video')].filter(v=>!v.paused).length`)
  check('videos pause when the document is hidden', playingAfter === 0, `${playingBefore} → ${playingAfter}`)

  // ---- route transition + back/forward --------------------------------
  await goto(cdp, BASE + '/')
  const navResult = await cdp.eval(`(async () => {
    const link = [...document.querySelectorAll('a[href="/work"]')][0]
    if (!link) return 'no link'
    link.click()
    const samples = []
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 50))
      const overlay = document.querySelector('[data-route-loader]')
      if (overlay) samples.push(Number(overlay.dataset.routeProgress || 0))
    }
    return {
      path: location.pathname,
      samples,
      busy: document.body.getAttribute('aria-busy'),
    }
  })()`)
  check(
    'internal link transitions and navigates',
    navResult.path === '/work' && navResult.samples.length > 0,
    JSON.stringify(navResult)
  )
  check(
    'route loader progress is monotonic and completes',
    navResult.samples.includes(100) &&
      navResult.samples.every((value, index, values) => index === 0 || value >= values[index - 1]),
    navResult.samples.join(' â†’ ')
  )

  const backResult = await cdp.eval(`(async () => {
    history.back()
    await new Promise(r => setTimeout(r, 80))
    const overlay = !!document.querySelector('[data-route-loader]')
    await new Promise(r => setTimeout(r, 1100))
    return { path: location.pathname, overlay }
  })()`)
  check(
    'browser back navigation shows the loader without blocking history',
    backResult.path === '/' && backResult.overlay,
    JSON.stringify(backResult)
  )

  await cdp.send('Page.navigate', { url: BASE + '/work' })
  await sleep(1200)
  const externalUntouched = await cdp.eval(`(() => {
    const a = document.createElement('a')
    a.href = 'mailto:grow@cineheight.com'
    document.body.appendChild(a)
    let defaultPrevented = false
    a.addEventListener('click', (e) => { defaultPrevented = e.defaultPrevented }, false)
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    a.remove()
    return !defaultPrevented
  })()`)
  check('mailto/tel links are not intercepted', externalUntouched)

  // ---- Batch 2: authored motion rhythm and route-aware presentation ----
  await setViewport(cdp, 1440, 900, 2)
  await goto(cdp, BASE + '/work')
  await sleep(220)
  const metricResult = await cdp.eval(`(async () => {
    const root = document.querySelector('[data-count-up]')
    const visual = root?.querySelector('[aria-hidden="true"]')
    const target = Number(root?.dataset.countUp)
    const number = () => Number((visual?.textContent || '').replace(/[^0-9.]/g, ''))
    const initial = number()
    root?.scrollIntoView({ block: 'center' })
    await new Promise(r => setTimeout(r, 900))
    const final = number()
    window.scrollTo(0, 0)
    await new Promise(r => setTimeout(r, 180))
    return { initial, final, target, held: number() }
  })()`)
  check(
    'work metrics start meaningful, complete once, and never rewind',
    metricResult.initial > 0 && metricResult.initial < metricResult.target &&
      metricResult.final === metricResult.target && metricResult.held === metricResult.target,
    JSON.stringify(metricResult)
  )

  await goto(cdp, BASE + '/about')
  await sleep(220)
  const aboutHeadline = await cdp.eval(`(async () => {
    const root = document.querySelector('[data-scroll-headline]')
    if (!root) return null
    const words = [...root.querySelectorAll('[data-word]')]
    const sample = () => {
      const styles = words.map(word => getComputedStyle(word))
      return {
        opacity: styles.reduce((sum, style) => sum + Number(style.opacity), 0) / styles.length,
        blur: Math.max(...styles.map(style => Number(style.filter.match(/blur\\(([-0-9.]+)px/)?.[1] || 0))),
      }
    }
    const absoluteTop = root.getBoundingClientRect().top + scrollY
    window.scrollTo(0, absoluteTop - innerHeight * 0.78)
    await new Promise(r => setTimeout(r, 520))
    const intermediate = sample()
    window.scrollTo(0, absoluteTop - innerHeight * 0.54)
    await new Promise(r => setTimeout(r, 780))
    return { intermediate, settled: sample() }
  })()`)
  check(
    'About statements pass through a legible low-blur focus state and settle early',
    aboutHeadline && aboutHeadline.intermediate.opacity >= 0.42 && aboutHeadline.intermediate.opacity < 0.99 &&
      aboutHeadline.intermediate.blur > 0 && aboutHeadline.intermediate.blur <= 1.25 &&
      aboutHeadline.settled.opacity >= 0.99 && aboutHeadline.settled.blur < 0.05,
    JSON.stringify(aboutHeadline)
  )

  const homeShowreel = await goto(cdp, BASE + '/').then(async () => {
    await sleep(180)
    return cdp.eval(`(() => {
      const section = document.querySelector('#showreel')
      return section && {
        context: section.dataset.showreelContext,
        label: section.querySelector('[data-showreel-caption]')?.previousElementSibling?.textContent.trim(),
        caption: section.querySelector('[data-showreel-caption]')?.textContent.trim(),
        crop: getComputedStyle(section.querySelector('video')).objectPosition,
        controls: section.querySelectorAll('[data-showreel-control]').length,
      }
    })()`)
  })
  const aboutShowreel = await goto(cdp, BASE + '/about').then(async () => {
    await sleep(180)
    return cdp.eval(`(() => {
      const section = document.querySelector('#showreel')
      return section && {
        context: section.dataset.showreelContext,
        label: section.querySelector('[data-showreel-caption]')?.previousElementSibling?.textContent.trim(),
        caption: section.querySelector('[data-showreel-caption]')?.textContent.trim(),
        crop: getComputedStyle(section.querySelector('video')).objectPosition,
        controls: section.querySelectorAll('[data-showreel-control]').length,
      }
    })()`)
  })
  check(
    'Home and About showreels have distinct framing with shared controls',
    homeShowreel?.context === 'home' && aboutShowreel?.context === 'about' &&
      homeShowreel.label === 'Showreel' && aboutShowreel.label === 'How we see it' &&
      homeShowreel.caption !== aboutShowreel.caption && homeShowreel.crop !== aboutShowreel.crop &&
      homeShowreel.controls > 0 && homeShowreel.controls === aboutShowreel.controls,
    JSON.stringify({ home: homeShowreel, about: aboutShowreel })
  )

  await setViewport(cdp, 390, 844, 2)
  await goto(cdp, BASE + '/about')
  const mobileLabel = await cdp.eval(`(async () => {
    const label = document.querySelector('[data-kinetic-label="THE DISCIPLINES"]')
    if (!label) return null
    const absoluteTop = label.getBoundingClientRect().top + scrollY
    window.scrollTo(0, absoluteTop - innerHeight * 0.58)
    await new Promise(r => setTimeout(r, 650))
    const chars = [...label.querySelectorAll('[data-kinetic-char]')].map(char => getComputedStyle(char))
    const rule = getComputedStyle(label.querySelector('[data-kinetic-rule]')).transform
    return { minOpacity: Math.min(...chars.map(style => Number(style.opacity))), transforms: [...new Set(chars.map(style => style.transform))], rule }
  })()`)
  check(
    'mobile kinetic labels complete by the shortened reveal range',
    mobileLabel && mobileLabel.minOpacity >= 0.99 && mobileLabel.transforms.every(value => value === 'none' || value === 'matrix(1, 0, 0, 1, 0, 0)') &&
      (mobileLabel.rule === 'none' || mobileLabel.rule === 'matrix(1, 0, 0, 1, 0, 0)'),
    JSON.stringify(mobileLabel)
  )

  await goto(cdp, BASE + '/services')
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 700 }] })
  for (const y of [620, 530, 430, 320]) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] })
    await sleep(28)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await sleep(420)
  const touchScrollY = await cdp.eval('scrollY')
  const mobileServices = await cdp.eval(`(async () => {
    const target = document.querySelector('[data-service-entry="2"]')
    target?.scrollIntoView({ block: 'center' })
    await new Promise(r => setTimeout(r, 650))
    const entries = [...document.querySelectorAll('[data-service-entry]')]
    const active = entries.map((entry, index) => ({
      index,
      artOpacity: Number(getComputedStyle(entry.querySelector('[data-mobile-service-art]')).opacity),
      markerGlow: getComputedStyle(entry.querySelector('[data-mobile-service-marker]')).boxShadow !== 'none',
    })).filter(entry => entry.artOpacity > 0.99 && entry.markerGlow)
    const activeEntry = entries[active[0]?.index]
    const title = activeEntry?.querySelector('[data-service-title]')
    const titleRect = title?.getBoundingClientRect()
    const titleClip = title?.parentElement?.getBoundingClientRect()
    const signal = getComputedStyle(document.querySelector('[data-mobile-service-signal]')).transform
    const scale = Number(signal.match(/matrix\\([^,]+, [^,]+, [^,]+, ([^,]+)/)?.[1] || 0)
    return {
      active,
      scale,
      titleVisible: title && titleRect && titleClip
        ? getComputedStyle(title).visibility === 'visible' && Number(getComputedStyle(title).opacity) >= 0.99 &&
          Math.min(titleRect.bottom, titleClip.bottom) - Math.max(titleRect.top, titleClip.top) >= titleRect.height * 0.8
        : false,
      titleDebug: title && titleRect && titleClip ? {
        opacity: getComputedStyle(title).opacity,
        visibility: getComputedStyle(title).visibility,
        transform: getComputedStyle(title).transform,
        rect: [titleRect.top, titleRect.bottom, titleRect.height],
        clip: [titleClip.top, titleClip.bottom, titleClip.height],
      } : null,
    }
  })()`)
  check(
    'mobile Services hands artwork to one active chapter and advances its spine',
    touchScrollY > 0 && mobileServices.active.length === 1 && mobileServices.active[0].index >= 1 && mobileServices.scale > 0.2 && mobileServices.titleVisible,
    mobileServices.titleDebug
      ? `touchY=${touchScrollY} active=${mobileServices.active[0]?.index} scale=${mobileServices.scale} visible=${mobileServices.titleVisible} transform=${mobileServices.titleDebug.transform}`
      : JSON.stringify(mobileServices)
  )

  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await setViewport(cdp, 2560, 1440, 1)
  await goto(cdp, BASE + '/services')
  const desktopServices = await cdp.eval(`(async () => {
    document.querySelector('[data-service-entry="2"]')?.scrollIntoView({ block: 'center' })
    await new Promise(r => setTimeout(r, 750))
    return [...document.querySelectorAll('[data-service-entry]')].map(entry => {
      const style = getComputedStyle(entry)
      const matrix = style.transform.match(/matrix\\([^,]+, [^,]+, [^,]+, [^,]+, [^,]+, ([^)]+)/)
      return { opacity: Number(style.opacity), height: entry.getBoundingClientRect().height, travel: Math.abs(Number(matrix?.[1] || 0)) }
    })
  })()`)
  check(
    'ultrawide Services preserves active, neighbour and distant depth tiers',
    desktopServices.some(entry => entry.opacity >= 0.99) && desktopServices.some(entry => entry.opacity >= 0.63 && entry.opacity <= 0.65) &&
      desktopServices.some(entry => entry.opacity <= 0.39) && desktopServices.every(entry => entry.height <= 369 && entry.travel <= 6.1),
    JSON.stringify(desktopServices)
  )

  // Reduced motion keeps navigation feedback but removes continuous pointer
  // motion and loader sweeps.
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await setViewport(cdp, 390, 844, 2)
  await goto(cdp, BASE + '/services')
  const reducedServiceTitles = await cdp.eval(`(async () => {
    await new Promise(r => setTimeout(r, 220))
    return [...document.querySelectorAll('[data-service-title]')].map(title => {
      const rect = title.getBoundingClientRect()
      const clip = title.parentElement.getBoundingClientRect()
      const style = getComputedStyle(title)
      return {
        visible: style.visibility === 'visible' && Number(style.opacity) === 1 &&
          Math.min(rect.bottom, clip.bottom) - Math.max(rect.top, clip.top) >= rect.height * 0.95,
        transform: style.transform,
        rect: [rect.top, rect.bottom, rect.height],
        clip: [clip.top, clip.bottom, clip.height],
      }
    })
  })()`)
  check(
    'reduced-motion mobile service titles remain fully visible after tier hydration',
    reducedServiceTitles.every(title => title.visible),
    reducedServiceTitles.map((title, index) => title.visible ? `${index}:ok` : `${index}:fail ${title.transform} r=${title.rect.join('/')} c=${title.clip.join('/')}`).join(' | ')
  )

  await setViewport(cdp, 1440, 900, 2)
  await goto(cdp, BASE + '/')
  const reducedRoute = await cdp.eval(`(async () => {
    await new Promise(r => setTimeout(r, 180))
    const noCanvas = !document.querySelector('[data-cursor-trail]') && !document.querySelector('[data-signal-cursor]')
    document.querySelector('a[href="/work"]')?.click()
    await new Promise(r => setTimeout(r, 32))
    const loader = document.querySelector('[data-route-loader]')
    const cover = loader?.firstElementChild
    const signal = loader?.querySelector('[class*="inset-x-"]')
    const first = loader && signal ? {
      progress: Number(loader.dataset.routeProgress || 0),
      opacity: Number(getComputedStyle(loader).opacity),
      signalOpacity: Number(getComputedStyle(signal).opacity),
      signalTop: signal.getBoundingClientRect().top,
      clipPath: getComputedStyle(cover).clipPath,
    } : null
    await new Promise(r => setTimeout(r, 80))
    const second = loader?.isConnected && signal?.isConnected ? {
      progress: Number(loader.dataset.routeProgress || 0),
      opacity: Number(getComputedStyle(loader).opacity),
      signalOpacity: Number(getComputedStyle(signal).opacity),
      signalTop: signal.getBoundingClientRect().top,
    } : null
    await new Promise(r => setTimeout(r, 70))
    const completedProgress = Number(loader?.dataset.routeProgress || 0)
    await new Promise(r => setTimeout(r, 320))
    return {
      noCanvas,
      first,
      second,
      completedProgress,
      sceneGap: getComputedStyle(document.documentElement).getPropertyValue('--scene-gap').trim(),
      path: location.pathname,
    }
  })()`)
  check(
    'reduced motion uses native pointer and short non-spatial route feedback',
    reducedRoute.noCanvas &&
      reducedRoute.first &&
      reducedRoute.second &&
      reducedRoute.first.clipPath === 'inset(0px)' &&
      reducedRoute.second.progress >= reducedRoute.first.progress &&
      reducedRoute.completedProgress === 100 &&
      reducedRoute.second.opacity > reducedRoute.first.opacity &&
      reducedRoute.second.signalOpacity > reducedRoute.first.signalOpacity &&
      Math.abs(reducedRoute.second.signalTop - reducedRoute.first.signalTop) < 1 &&
      Number(reducedRoute.sceneGap) === 0.78 &&
      reducedRoute.path === '/work',
    reducedRoute.first && reducedRoute.second
      ? `canvas=${reducedRoute.noCanvas} clip=${reducedRoute.first.clipPath} progress=${reducedRoute.first.progress}->${reducedRoute.second.progress}->${reducedRoute.completedProgress} ` +
        `opacity=${reducedRoute.first.opacity.toFixed(2)}->${reducedRoute.second.opacity.toFixed(2)} ` +
        `signal=${reducedRoute.first.signalOpacity.toFixed(2)}->${reducedRoute.second.signalOpacity.toFixed(2)} ` +
        `travel=${Math.abs(reducedRoute.second.signalTop - reducedRoute.first.signalTop).toFixed(1)} gap=${reducedRoute.sceneGap} path=${reducedRoute.path}`
      : JSON.stringify(reducedRoute)
  )

  console.log('\n──── PROBES ────')
  let failed = 0
  for (const r of results) {
    if (r.status === 'FAIL') failed++
    console.log(`${r.status.padEnd(14)} ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`)
  }
  console.log(failed ? `\n${failed} probe(s) failed.` : '\nAll probes passed.')
  proc?.kill()
  process.exit(failed ? 1 : 0)
}

/* Focused interaction evidence for the refinement pass. */
if (hasFlag('refinement')) {
  await setViewport(cdp, 1440, 900)

  const centre = async (route, selector) => {
    await goto(cdp, BASE + route)
    await primeScroll(cdp, 0)
    const found = await cdp.eval(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)})
      if (!element) return false
      const rect = element.getBoundingClientRect()
      window.scrollTo(0, Math.max(0, rect.top + window.scrollY - (innerHeight - rect.height) / 2))
      return true
    })()`)
    if (!found) throw new Error(`Refinement selector not found: ${route} ${selector}`)
    await sleep(900)
  }

  await goto(cdp, BASE + '/')
  const processMounted = await cdp.eval(`!!document.querySelector('#process')`)
  if (processMounted) {
    await cdp.eval(`(() => {
      const root = document.querySelector('#process')
      const rect = root.getBoundingClientRect()
      window.scrollTo(0, Math.max(0, rect.top + scrollY - innerHeight * 0.86))
    })()`)
    await sleep(280)
    await shoot(cdp, 'refinement/process-before__1440x900.png')
    await cdp.eval(`(() => {
      const root = document.querySelector('#process')
      const rect = root.getBoundingClientRect()
      window.scrollTo(0, Math.max(0, rect.top + scrollY - innerHeight * 0.58))
    })()`)
    await sleep(780)
    await shoot(cdp, 'refinement/process-mid__1440x900.png')
    await sleep(2200)
    await shoot(cdp, 'refinement/process-complete__1440x900.png')
  } else {
    console.log('NOT APPLICABLE  process refinement evidence (ProcessCompact is not mounted)')
  }

  await centre('/', '#work')
  await shoot(cdp, 'refinement/featured-work-type__1440x900.png')

  await centre('/', '[aria-label="Brands we have worked with"]')
  await shoot(cdp, 'refinement/client-carousel__1440x900.png')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1030, y: 510 })
  await sleep(450)
  await shoot(cdp, 'refinement/client-carousel-depth__1440x900.png')

  await centre('/', '[data-audit="home-capabilities"]')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720, y: 450 })
  await sleep(550)
  await shoot(cdp, 'refinement/pointer-rest__1440x900.png')

  for (let i = 0; i < 12; i++) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 420 + i * 34,
      y: 520 - Math.sin(i / 2) * 80,
    })
    await sleep(42)
  }
  await shoot(cdp, 'refinement/pointer-slow__1440x900.png')

  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1180, y: 220 })
  await sleep(16)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 590, y: 610 })
  await sleep(90)
  await shoot(cdp, 'refinement/pointer-fast__1440x900.png')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 590, y: 610, button: 'left', clickCount: 1 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 590, y: 610, button: 'left', clickCount: 1 })
  await sleep(190)
  await shoot(cdp, 'refinement/pointer-click__1440x900.png')

  /*
   * The loader lives for well under a second, and its mark block fades in and
   * out across that window, so a single timed shot easily lands on an empty
   * frame. Capture a short burst and record the bar's real progress with each
   * one, so there is always evidence of the mid and completed states.
   */
  await goto(cdp, BASE + '/')
  await cdp.eval(`document.querySelector('a[href="/work"]')?.click()`)
  for (const at of [90, 170, 250, 330, 430]) {
    await sleep(at === 90 ? 90 : 80)
    const state = await cdp.eval(`(() => {
      const o = document.querySelector('[data-route-loader]')
      if (!o) return null
      const mark = o.querySelector('.route-loader-mark')
      return {
        progress: o.dataset.routeProgress,
        phase: o.dataset.routePhase,
        markOpacity: mark ? getComputedStyle(mark).opacity : null,
      }
    })()`)
    await shoot(cdp, `refinement/route-loader-${at}ms__1440x900.png`)
    console.log(`  loader @${at}ms`, JSON.stringify(state))
  }

  await centre('/services', '[aria-label="Video Production & Editing"]')
  await shoot(cdp, 'refinement/service-active-video__1440x900.png')
  await centre('/services', '[aria-label="How the services connect"]')
  await shoot(cdp, 'refinement/service-chain__1440x900.png')

  await centre('/contact', '[data-contact-form="full"]')
  await sleep(3100)
  await cdp.eval(`(() => {
    const form = document.querySelector('[data-contact-form="full"]')
    const set = (name, value) => {
      const element = form.elements.namedItem(name)
      const setter = Object.getOwnPropertyDescriptor(
        element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      ).set
      setter.call(element, value)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    }
    set('name', 'Visual Test')
    set('contact', 'visual@example.com')
    set('company', 'Cineheight Test')
    set('projectDetails', 'This is a real browser test of the transparent provider configuration error.')
    form.requestSubmit()
  })()`)
  await sleep(900)
  await shoot(cdp, 'refinement/contact-config-error__1440x900.png')

  await centre('/', '[data-contact-form="compact"]')
  await sleep(3100)
  await cdp.eval(`(() => {
    window.fetch = async () => new Response(JSON.stringify({ ok: true, id: 'visual_success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    const form = document.querySelector('[data-contact-form="compact"]')
    const set = (name, value) => {
      const element = form.elements.namedItem(name)
      const setter = Object.getOwnPropertyDescriptor(
        element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      ).set
      setter.call(element, value)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    }
    set('name', 'Visual Test')
    set('contact', 'visual@example.com')
    set('company', 'Cineheight Test')
    set('projectDetails', 'This is a real browser test of the accepted project-form success state.')
    form.requestSubmit()
  })()`)
  await sleep(650)
  await shoot(cdp, 'refinement/home-form-success__1440x900.png')

  await centre('/', 'footer')
  await shoot(cdp, 'refinement/social-rest__1440x900.png')

  /*
   * Hover and focus must be produced by real input. A programmatic .focus()
   * does not reliably match :focus-visible (Chrome only applies it when the
   * last interaction was a keyboard one), so the filled state never appeared.
   */
  const socialBox = await cdp.eval(`(() => {
    const b = document.querySelector('footer button[aria-label^="Instagram"]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  })()`)
  if (socialBox) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: socialBox.x, y: socialBox.y })
    await sleep(520)
    await shoot(cdp, 'refinement/social-hover__1440x900.png')

    // Genuine keyboard focus: Tab from the preceding control.
    await cdp.eval(`document.querySelector('footer button[aria-label^="Facebook"]')?.focus()`)
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await sleep(520)
    await shoot(cdp, 'refinement/social-focus__1440x900.png')

    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: socialBox.x, y: socialBox.y, button: 'left', clickCount: 1 })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: socialBox.x, y: socialBox.y, button: 'left', clickCount: 1 })
    await sleep(260)
    await shoot(cdp, 'refinement/social-tooltip__1440x900.png')
  }

  console.log('captured refinement interaction evidence')
  proc?.kill()
  process.exit(0)
}

const report = []
const tag = hasFlag('reduced') ? 'reduced-' : ''

/**
 * Focused element shots: `--focus=<route>::<selector>::<name>` (repeatable via
 * comma separation). Scrolls the element to the middle of the viewport, lets
 * its scroll-linked animation settle, and captures just that region — which is
 * how you actually judge whether a logo row or a media stage looks right.
 */
/*
 * Visual evidence for the cursor. The sweep cannot show it: it never moves a
 * mouse, so the trail is always empty and the dot is hidden. This drives real
 * pointer input and captures the states that need to be LOOKED at — a trail is
 * a shape, and "maxChord < 220" does not tell you whether it loops.
 */
if (hasFlag('cursor')) {
  await setViewport(cdp, 1440, 900)
  await goto(cdp, BASE + '/')
  await primeScroll(cdp, 0)
  await cdp.eval(`window.scrollTo(0, innerHeight * 1.9)`)
  await sleep(900)

  const move = async (x, y) => {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await sleep(16)
  }

  /*
   * A full-page screenshot takes long enough that the trail has already begun
   * fading by the time it lands — the trail is designed to disappear ~0.5s
   * after you stop moving. Reading the canvas back instead costs one eval
   * (~10ms), so it captures the trail as it actually looks mid-stroke. The
   * canvas is transparent, so flatten it onto the page's near-black for a
   * faithful view.
   */
  const grabTrail = async (name) => {
    const url = await cdp.eval(
      `(() => { const c = document.querySelector('[data-cursor-trail]'); return c ? c.toDataURL('image/png') : null })()`
    )
    if (!url) return console.log(`trail MISS ${name}`)
    const raw = Buffer.from(url.split(',')[1], 'base64')
    const { default: sharp } = await import('sharp')
    await sharp(raw).flatten({ background: '#04070d' }).toFile(path.join(OUT, `${name}__1440x900.png`))
    console.log(`trail  ${name}`)
  }

  // 1. at rest, after a single move: dot only, no tail
  await move(700, 430)
  await sleep(420)
  await shoot(cdp, 'cursor-01-at-rest__1440x900.png')

  /*
   * 2. A tight arc. Steps are deliberately small (~22px) so the whole buffer
   * sits on curvature — this is the shape that exposes overshoot, loops and
   * cusps, which a straight drag cannot.
   */
  const strokeStart = Date.now()
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI * 0.15 + (i / 40) * Math.PI * 1.15
    // No extra sleep: the CDP round-trip alone is already ~14ms, so roughly one
    // fresh position per frame. With the sleep the pointer sits still for whole
    // frames and the ring buffer fills with duplicates.
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 720 + Math.cos(a) * 210,
      y: 470 + Math.sin(a) * 210,
    })
  }
  console.log(`41 synthetic moves in ${Date.now() - strokeStart}ms (${((Date.now() - strokeStart) / 41).toFixed(1)}ms apart)`)
  console.log('trail state:', JSON.stringify(await cdp.eval(`(() => {
    const c = document.querySelector('[data-cursor-trail]')
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let lit = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] > 6) lit++
    const cur = window.__cineheightCursor
    // Distinct samples: a low count means the buffer is full of duplicates,
    // which is what a slow synthetic input rate looks like.
    const distinct = new Set(cur.points.map(p => Math.round(p[0]) + ',' + Math.round(p[1]))).size
    return {
      canvas: c.width + 'x' + c.height,
      litPixels: lit,
      distinctPoints: distinct,
      presence: Number(cur.presence.toFixed(3)),
      maxChord: Number(cur.maxChord.toFixed(1)),
      mode: cur.mode,
    }
  })()`)))
  await grabTrail('cursor-02-curved-stroke')

  // 3. a hard direction reversal — the case Catmull-Rom used to loop on
  for (let i = 0; i <= 14; i++) await move(1080 - i * 52, 300 + i * 10)
  await grabTrail('cursor-03-reversal')

  // 4. a right-angle corner, the other classic overshoot case
  for (let i = 0; i <= 10; i++) await move(400 + i * 46, 600)
  for (let i = 1; i <= 10; i++) await move(860, 600 - i * 34)
  await grabTrail('cursor-04-corner')

  // 5. over an actionable element: halo, then the click ring
  const linkPoint = await cdp.eval(`(() => {
    const candidates = [...document.querySelectorAll('a, button')].filter(el => {
      const r = el.getBoundingClientRect()
      return r.width > 60 && r.height > 16
    })
    // Prefer one already on screen; otherwise bring the first one into view.
    let a = candidates.find(el => {
      const r = el.getBoundingClientRect()
      return r.top > 90 && r.bottom < innerHeight - 90
    })
    if (!a && candidates[0]) {
      candidates[0].scrollIntoView({ block: 'center' })
      a = candidates[0]
    }
    if (!a) return null
    const r = a.getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), tag: a.tagName }
  })()`)
  await sleep(500)
  if (linkPoint) {
    await move(linkPoint.x, linkPoint.y)
    await sleep(360)
    await shoot(cdp, 'cursor-05-action-halo__1440x900.png')
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: linkPoint.x, y: linkPoint.y, button: 'left', clickCount: 1 })
    await sleep(70)
    await shoot(cdp, 'cursor-06-click__1440x900.png')
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: linkPoint.x, y: linkPoint.y, button: 'left', clickCount: 1 })
    console.log(`action target: ${linkPoint.tag} at ${linkPoint.x},${linkPoint.y}`)
  } else {
    console.log('action target MISS')
  }

  // 6. after inactivity the trail must be gone, leaving the dot alone
  await sleep(1400)
  await grabTrail('cursor-07-faded-trail')
  await shoot(cdp, 'cursor-08-faded__1440x900.png')

  console.log('cursor evidence written to', OUT)
  proc?.kill()
  process.exit(0)
}

if (hasFlag('focus') || argOf('focus', null)) {
  const specs = (argOf('focus', '') || '').split('~').filter(Boolean)
  const [fw, fh] = (SIZES[0] ?? '1440x900').split('x').map(Number)
  await setViewport(cdp, fw, fh)
  for (const spec of specs) {
    const [route, selector, name] = spec.split('::')
    await goto(cdp, BASE + normaliseRoute(route))
    await primeScroll(cdp, 0)
    const ok = await cdp.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return null
      const r = el.getBoundingClientRect()
      const target = r.top + window.scrollY - Math.max(0, (window.innerHeight - r.height) / 2)
      window.scrollTo(0, Math.max(0, target))
      return true
    })()`)
    if (!ok) {
      console.log(`focus MISS  ${name ?? selector} (${route})`)
      continue
    }
    await sleep(1100)
    await shoot(cdp, `focus-${name ?? 'shot'}__${fw}x${fh}.png`)
    console.log(`focus  ${name ?? selector}`)
  }
  proc?.kill()
  process.exit(0)
}

for (const size of SIZES) {
  const [w, h] = size.split('x').map(Number)
  await setViewport(cdp, w, h)
  for (const route of ROUTES) {
    consoleErrors.length = 0
    failedRequests.length = 0
    await goto(cdp, BASE + route)
    await primeScroll(cdp, 0)

    const m = await measure(cdp)
    const slug = `${tag}${route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-')}`
    const file = `${slug}__${size}`
    // `--measure` runs the responsive audit across many widths without writing
    // hundreds of frames; the visual pass uses the default filmstrip mode.
    if (!hasFlag('measure')) await filmstrip(cdp, slug, size, h)

    // signal tip check, mid-page, at a standard desktop size only
    let tip = null
    if (size === '1440x900') {
      await cdp.eval(`window.scrollTo(0, document.documentElement.scrollHeight * 0.45)`)
      await sleep(700)
      tip = await signalTip(cdp)
    }

    report.push({
      file,
      ...m,
      tip,
      consoleErrors: [...new Set(consoleErrors)].slice(0, 4),
      failedRequests: [...new Set(failedRequests)].slice(0, 4),
    })
    console.log(
      `${size.padEnd(10)} ${route.padEnd(30)} ` +
      `h=${String(m.docH).padStart(6)} (${m.screens}sc) ovf=${m.overflowX} ` +
      `clipped=${m.clippedHeadings.length} bleed=${m.bleed.length} ` +
      `vid=${m.videos}/${m.playing} err=${consoleErrors.length} 404=${failedRequests.length}` +
      (tip ? ` tip=${tip.tipFraction}` : '')
    )
  }
}

writeFileSync(path.join(OUT, `${tag}report.json`), JSON.stringify(report, null, 2))
console.log(`\nwrote ${report.length} shots + ${tag}report.json to ${OUT}`)

// surface anything that failed, loudly
const bad = report.filter(
  (r) => r.overflowX > 0 || r.clippedHeadings.length || r.bleed.length || r.consoleErrors.length || r.failedRequests.length
)
if (bad.length) {
  console.log('\n──── ISSUES ────')
  for (const b of bad) {
    console.log(`\n${b.file}`)
    if (b.overflowX > 0) console.log('  overflowX:', b.overflowX)
    if (b.bleed.length) console.log('  bleed:', b.bleed.join(' | '))
    if (b.clippedHeadings.length) console.log('  clipped:', JSON.stringify(b.clippedHeadings))
    if (b.consoleErrors.length) console.log('  console:', b.consoleErrors.join(' | '))
    if (b.failedRequests.length) console.log('  requests:', b.failedRequests.join(' | '))
  }
} else {
  console.log('\nNo overflow, no clipped headings, no console errors, no failed requests.')
}

proc?.kill()
process.exit(0)
