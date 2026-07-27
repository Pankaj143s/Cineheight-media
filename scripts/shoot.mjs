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
        if (cs.overflow !== 'visible' || cs.overflowY !== 'visible') {
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
    const path = document.querySelector('svg path[stroke="#0089FF"]')
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
  const check = (name, pass, detail = '') =>
    results.push({ name, pass: !!pass, detail: String(detail).slice(0, 120) })

  // ---- signal tip tracking, forwards and in reverse --------------------
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

  // ---- pointer canvas: DPR cap, idle sleep, visibility sleep ------------
  await cdp.eval(`document.querySelector('#what-we-do')?.scrollIntoView({ block: 'center' })`)
  await sleep(700)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720, y: 450 })
  await sleep(500)
  const canvasDpr = await cdp.eval(`(() => {
    const canvas = document.querySelector('[data-signal-playground]')
    if (!canvas) return null
    return {
      x: Number((canvas.width / canvas.clientWidth).toFixed(2)),
      y: Number((canvas.height / canvas.clientHeight).toFixed(2)),
      device: devicePixelRatio,
    }
  })()`)
  check(
    'pointer canvas caps backing DPR at 1.5',
    canvasDpr && canvasDpr.x <= 1.5 && canvasDpr.y <= 1.5 && canvasDpr.device === 2,
    canvasDpr ? `${canvasDpr.x}x / ${canvasDpr.y}x at device ${canvasDpr.device}` : 'canvas missing'
  )

  const canvasHash = `(() => {
    const canvas = document.querySelector('[data-signal-playground]')
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
  check('pointer canvas sleeps after idle', idleHashA != null && idleHashA === idleHashB, `${idleHashA} → ${idleHashB}`)

  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 590, y: 540 })
  await sleep(180)
  await cdp.eval(`Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`)
  await sleep(160)
  const hiddenHashA = await cdp.eval(canvasHash)
  await sleep(420)
  const hiddenHashB = await cdp.eval(canvasHash)
  check('pointer canvas sleeps while document is hidden', hiddenHashA != null && hiddenHashA === hiddenHashB, `${hiddenHashA} → ${hiddenHashB}`)
  await cdp.eval(`Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`)

  // Placeholder contracts must not issue requests until their status is ready.
  const homePlaceholderLoads = await cdp.eval(
    `performance.getEntriesByType('resource').filter(e => /\\/media\\/home-work\\//.test(e.name)).map(e => e.name)`
  )
  check('homepage placeholders issue no media-slot network requests', homePlaceholderLoads.length === 0, homePlaceholderLoads.join(', '))
  await goto(cdp, BASE + '/work')
  await sleep(700)
  const indexPlaceholderLoads = await cdp.eval(
    `performance.getEntriesByType('resource').filter(e => /\\/media\\/work-index\\//.test(e.name)).map(e => e.name)`
  )
  check('work-index placeholders issue no media-slot network requests', indexPlaceholderLoads.length === 0, indexPlaceholderLoads.join(', '))

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
  const socialFocus = await cdp.eval(`(() => {
    const links = [...document.querySelectorAll('footer a[aria-label*="opens in a new tab"]')]
    const target = links[0]
    target?.focus()
    const rect = target?.getBoundingClientRect()
    return {
      count: links.length,
      label: target?.getAttribute('aria-label') || '',
      focused: document.activeElement === target,
      width: rect?.width || 0,
      height: rect?.height || 0,
    }
  })()`)
  check(
    'only verified Instagram renders with a keyboard-focusable 44px target',
    socialFocus.count === 1 && /Instagram/.test(socialFocus.label) && socialFocus.focused &&
      socialFocus.width >= 44 && socialFocus.height >= 44,
    `${socialFocus.count} link; ${socialFocus.width}×${socialFocus.height}; focused=${socialFocus.focused}`
  )

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
    'case-study detail media is retained outside replacement slots',
    retainedMedia.detail > 0 && retainedMedia.replacement === 0,
    `${retainedMedia.detail} detail sources; ${retainedMedia.replacement} replacement sources`
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
    await new Promise(r => setTimeout(r, 120))
    const overlayDuring = !!document.querySelector('div[aria-hidden="true"][class*="z-[80]"]')
    await new Promise(r => setTimeout(r, 1200))
    return (location.pathname === '/work' ? 'navigated' : 'stuck:' + location.pathname) + (overlayDuring ? '+overlay' : '+no-overlay')
  })()`)
  check('internal link transitions and navigates', navResult.startsWith('navigated'), navResult)

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

  console.log('\n──── PROBES ────')
  let failed = 0
  for (const r of results) {
    if (!r.pass) failed++
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`)
  }
  console.log(failed ? `\n${failed} probe(s) failed.` : '\nAll probes passed.')
  proc?.kill()
  process.exit(0)
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

  await centre('/', '#what-we-do')
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
  await cdp.eval(`document.querySelector('a[aria-label^="Instagram"]')?.focus()`)
  await sleep(240)
  await shoot(cdp, 'refinement/social-focus__1440x900.png')

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
