'use client'

import { useCallback, useEffect, useRef } from 'react'
import { clamp } from '@/lib/utils'
import { useIsNarrow, useReducedMotion } from '@/lib/useMediaPreferences'
import { readScrollSignal, subscribeScrollSignal } from '@/lib/scrollSignal'
import { subscribeSignalIntensity } from '@/lib/liquidMedia/signalIntensity'
import { getHeroProgress } from '@/lib/heroProgress'

/**
 * The continuous #0089FF signal thread.
 *
 * Unlike the retired `SignalField`, this is NOT a fixed viewport SVG with a
 * hardcoded path stretched over a 0–100 viewBox. It is a **document-height**
 * SVG in real pixel coordinates whose route is *generated* from the elements
 * the page marks with `data-flow-anchor`, so every route gets its own path and
 * the thread genuinely travels the page's negative space.
 *
 *   <div data-flow-anchor="left" />            → the thread passes left here
 *   <div data-flow-anchor="edge-right" />      → it leaves the viewport right
 *   <div data-flow-anchor="center" data-flow-lead="0.3" />
 *
 * Sides: `edge-left` · `left` · `center` · `right` · `edge-right`.
 * `data-flow-lead` (0–1) nudges the anchor's Y within its own element box.
 *
 * Geometry: anchors are sorted by document Y and joined with Catmull-Rom-derived
 * cubic Béziers. Control points are clamped so vertical progress stays strictly
 * monotonic — that is what structurally prevents U-turns, scribbles and
 * self-crossings, rather than hand-tuning a path by eye.
 *
 * Drawing: `strokeDashoffset` is a pure function of the scroll position, with
 * the leading tip sitting ~62 % down the viewport. On the homepage the stroke
 * stays fully undrawn until hero scrub reaches {@link HERO_THREAD_REVEAL}, then
 * the tip grows from the visible top-left corner through screen center and on
 * through the rest of the page route. Path geometry is always document-space
 * (hero-top origin); sticky stacking uses a portal + translateY, not a moving lead.
 */

/** Homepage hero scrub progress (0–1) before the thread may draw. */
const HERO_THREAD_REVEAL = 0.6

/**
 * True while the sticky hero stage is still pinned.
 * Sticky releases at scrollY ≈ heroBottom − vh; using 0.98·vh as a 1–2px buffer.
 */
function isHeroStickyActive(scrollY: number, heroBottom: number, vh = window.innerHeight) {
  return scrollY < heroBottom - vh * 0.98
}

/**
 * Keep the thread in the hero slot while the section still covers the viewport.
 * Sticky ends mid-statement (at H−vh); unportaling then buries the stroke under
 * the opaque hero inside .layer-content. Stay portaled until the stage has
 * mostly scrolled away, with a post-sticky transform that keeps document coords aligned.
 */
function shouldParkInHeroSlot(
  scrollY: number,
  heroBottom: number,
  heroProgress: number,
  vh = window.innerHeight
) {
  if (heroProgress < HERO_THREAD_REVEAL) return false
  // Hero section bottom still below ~20% of the viewport → still "on" the hero beat.
  return scrollY < heroBottom - vh * 0.2
}

/** Document Y of the hero section bottom, or a fallback from the start marker. */
function heroSectionBottom(heroStartEl: Element, heroY: number, vh: number) {
  const heroSection = heroStartEl.closest('section') as HTMLElement | null
  return heroSection
    ? heroSection.offsetTop + heroSection.offsetHeight
    : heroY + vh * 1.72
}

/**
 * Map document-space SVG into the hero slot.
 * While sticky: cancel scrollY. After sticky release the stage's top is
 * (heroBottom − vh − scrollY); a constant −(heroBottom − vh) keeps alignment.
 */
function heroSlotTransform(scrollY: number, heroBottom: number, vh: number) {
  if (isHeroStickyActive(scrollY, heroBottom, vh)) {
    return `translate3d(0, ${(-scrollY).toFixed(1)}px, 0)`
  }
  return `translate3d(0, ${(-(heroBottom - vh)).toFixed(1)}px, 0)`
}

type Side = 'edge-left' | 'left' | 'center' | 'right' | 'edge-right'

const SIDE_X: Record<Side, number> = {
  'edge-left': -0.1,
  left: 0.13,
  center: 0.5,
  right: 0.87,
  'edge-right': 1.1,
}

/** Narrow screens get a calmer route — excursions pulled toward the centre. */
const SIDE_X_NARROW: Record<Side, number> = {
  'edge-left': -0.04,
  left: 0.16,
  center: 0.5,
  right: 0.84,
  'edge-right': 1.04,
}

interface Pt {
  x: number
  y: number
}

/** One entry in the cached arc-length lookup table. */
interface Sample {
  len: number
  x: number
  y: number
}

/**
 * Catmull-Rom through `pts`, emitted as cubic Béziers. Horizontal control
 * offsets are capped relative to the segment's height and vertical controls are
 * clamped inside the segment, so the curve can never double back on itself.
 */
function buildPath(pts: Pt[], maxDxRatio = 0.6): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]

    const dy = Math.max(1, p2.y - p1.y)
    // A control point may lean sideways by at most maxDxRatio of the segment height;
    // beyond that the curve starts to read as a hook.
    const maxDx = dy * maxDxRatio

    const c1x = p1.x + clamp((p2.x - p0.x) / 6, -maxDx, maxDx)
    const c2x = p2.x - clamp((p3.x - p1.x) / 6, -maxDx, maxDx)
    // Vertical controls stay strictly inside the segment → monotonic descent.
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6, p1.y, p2.y)
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6, p1.y, p2.y)

    d +=
      ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)},` +
      ` ${c2x.toFixed(1)} ${c2y.toFixed(1)},` +
      ` ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/** Smooth J-curve from top-left corner to screen center (arrives heading down). */
function leadCornerToCenter(a: Pt, b: Pt): string {
  const dx = b.x - a.x
  const dy = b.y - a.y
  // Drop near the left edge, then sweep into center with a downward finish
  // so the handoff into the rest of the route stays smooth.
  const c1x = a.x + dx * 0.02
  const c1y = a.y + dy * 0.55
  const c2x = b.x - dx * 0.08
  const c2y = b.y - dy * 0.22
  return (
    `M ${a.x.toFixed(1)} ${a.y.toFixed(1)}` +
    ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)},` +
    ` ${c2x.toFixed(1)} ${c2y.toFixed(1)},` +
    ` ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
  )
}

export default function FlowThread() {
  const hostRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  const reduced = useReducedMotion()
  const narrow = useIsNarrow(767)

  // Restrained continuum cue — multiplies stroke opacity; never a progress bar.
  useEffect(() => {
    if (reduced) return
    const base = 0.48
    return subscribeSignalIntensity((v) => {
      const path = pathRef.current
      if (!path) return
      const next = base + v * 0.28
      path.style.opacity = String(Math.min(0.72, next))
      path.style.strokeWidth = String(narrow ? 2 + v * 0.4 : 2.75 + v * 0.55)
    })
  }, [reduced, narrow])

  // Geometry cached between frames — the scroll handler must never measure.
  const geo = useRef<{
    length: number
    startY: number
    endY: number
    docH: number
    samples: Sample[]
  }>({ length: 0, startY: 0, endY: 0, docH: 0, samples: [] })

  /** Re-read anchors and rebuild the path. Runs on mount, resize and reflow. */
  const measure = useCallback(() => {
    const wrap = wrapRef.current
    const svg = svgRef.current
    const path = pathRef.current
    if (!wrap || !svg || !path) return

    const vw = document.documentElement.clientWidth
    const docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    )
    const scrollY = window.scrollY
    const table = narrow ? SIDE_X_NARROW : SIDE_X
    const heroStartEl = document.querySelector<HTMLElement>('[data-hero-flow-start]')

    const mapAnchor = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      const lead = Number(el.dataset.flowLead ?? '0.5')
      const side = (el.dataset.flowAnchor || 'center') as Side
      return {
        x: (table[side] ?? 0.5) * vw,
        y: rect.top + scrollY + rect.height * clamp(lead, 0, 1),
      }
    }

    const anchors = Array.from(
      document.querySelectorAll<HTMLElement>('[data-flow-anchor]')
    )
      .filter((el) => el !== heroStartEl)
      .map(mapAnchor)
      .sort((a, b) => a.y - b.y)

    // Homepage: one document-space path — top-left → center → page anchors.
    // Sticky visibility uses portal + translateY(-scrollY); lead never tracks scrollY
    // or the path rebuilds every frame and kinks at sticky release.
    let pts: Pt[]
    if (heroStartEl) {
      const rect = heroStartEl.getBoundingClientRect()
      const heroY = Math.max(0, rect.top + scrollY)
      if (anchors.length < 1) {
        path.setAttribute('d', '')
        geo.current = { length: 0, startY: 0, endY: 0, docH, samples: [] }
        return
      }
      const first = anchors[0]
      const last = anchors[anchors.length - 1]
      const vh = window.innerHeight
      const leadY = heroY
      const origin: Pt = { x: 2, y: leadY }
      const center: Pt = { x: vw * 0.5, y: leadY + vh * 0.5 }
      // Continue straight down from center so the join has no hard corner.
      const exit: Pt = {
        x: vw * 0.5,
        y: Math.min(leadY + vh * 0.92, Math.max(center.y + 120, first.y - 200)),
      }
      // Lead is a dedicated smooth cubic; rest of the route is Catmull-Rom.
      const restPts = [center, exit, ...anchors, { x: last.x + vw * 0.2, y: last.y + 220 }]
      const lead = leadCornerToCenter(origin, center)
      const rest = buildPath(restPts, 0.5).replace(/^M[^C]+/, '')
      pts = [origin, center, exit, ...anchors, { x: last.x + vw * 0.2, y: last.y + 220 }]

      svg.setAttribute('width', String(vw))
      svg.setAttribute('height', String(docH))
      wrap.style.height = `${docH}px`

      path.setAttribute('d', `${lead} ${rest}`)

      const length = path.getTotalLength()
      path.style.strokeDasharray = `${length}`
      // Safe default; paint() reapplies the tip on the same turn after schedule/exit.
      path.style.strokeDashoffset = `${length}`

      const SAMPLE_COUNT = 360
      const samples: Sample[] = new Array(SAMPLE_COUNT + 1)
      for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const len = (length * i) / SAMPLE_COUNT
        const pt = path.getPointAtLength(len)
        samples[i] = { len, x: pt.x, y: pt.y }
      }

      geo.current = { length, startY: pts[0].y, endY: pts[pts.length - 1].y, docH, samples }
      return
    } else {
      if (anchors.length < 2) {
        path.setAttribute('d', '')
        geo.current = { length: 0, startY: 0, endY: 0, docH, samples: [] }
        return
      }
      const first = anchors[0]
      const last = anchors[anchors.length - 1]
      pts = [
        { x: first.x - vw * 0.22, y: first.y - 180 },
        ...anchors,
        { x: last.x + vw * 0.2, y: last.y + 220 },
      ]
    }

    svg.setAttribute('width', String(vw))
    svg.setAttribute('height', String(docH))
    wrap.style.height = `${docH}px`

    // Other routes: default Catmull-Rom through anchors.
    const d = buildPath(pts)
    path.setAttribute('d', d)

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`

    /**
     * Sample the path into a lookup table of {len, x, y}.
     *
     * Arc length is NOT proportional to vertical distance: wherever the route
     * curves sideways it covers a lot of length for very little descent. The
     * previous linear map from document-Y to arc length therefore under-read
     * the required length on curved stretches and the glowing tip visibly
     * lagged above where it should be. Sampling once per rebuild and searching
     * the table gives the exact length for any target Y, and costs nothing per
     * scroll frame.
     */
    const SAMPLE_COUNT = 360
    const samples: Sample[] = new Array(SAMPLE_COUNT + 1)
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const len = (length * i) / SAMPLE_COUNT
      const pt = path.getPointAtLength(len)
      samples[i] = { len, x: pt.x, y: pt.y }
    }

    geo.current = { length, startY: pts[0].y, endY: pts[pts.length - 1].y, docH, samples }
  }, [narrow])

  // ---- build + keep in sync with layout -------------------------------
  useEffect(() => {
    const path = pathRef.current
    if (!path) return

    let measureRaf = 0
    let motionRaf = 0
    let running = false
    let targetTipY = readScrollSignal().y + window.innerHeight * 0.62
    let currentTipY = targetTipY
    let lastFrame = performance.now()

    /** Natural tip; while parked in the hero slot after reveal, grow corner → center. */
    const resolveTipY = () => {
      const scrollTop = readScrollSignal().y
      const vh = window.innerHeight
      const natural = scrollTop + vh * 0.62
      const heroStart = document.querySelector('[data-hero-flow-start]')
      if (!heroStart) return natural

      const rect = heroStart.getBoundingClientRect()
      const heroY = Math.max(0, rect.top + scrollTop)
      const heroBottom = heroSectionBottom(heroStart, heroY, vh)
      const p = getHeroProgress()
      // Remap only while the stroke is still living in the hero slot.
      if (!shouldParkInHeroSlot(scrollTop, heroBottom, p, vh)) return natural

      const screenTop = scrollTop + 4
      const screenCenter = scrollTop + vh * 0.5
      if (p < HERO_THREAD_REVEAL) return screenTop
      if (p < 1) {
        const t = (p - HERO_THREAD_REVEAL) / (1 - HERO_THREAD_REVEAL)
        return screenTop + (screenCenter - screenTop) * t
      }
      return natural
    }

    const schedule = () => {
      cancelAnimationFrame(measureRaf)
      measureRaf = requestAnimationFrame(() => {
        measure()
        targetTipY = resolveTipY()
        currentTipY = targetTipY
        paint(currentTipY)
      })
    }

    /**
     * Find the exact arc length at which the path reaches document-Y `y`.
     *
     * The samples are monotonic in Y (the path builder clamps every control
     * point so vertical progress can never reverse), so a binary search is
     * valid; the result is then interpolated between the two bracketing
     * samples so the tip glides rather than stepping between samples.
     */
    const lengthAtY = (y: number): { len: number; x: number; y: number } | null => {
      const { samples } = geo.current
      if (samples.length < 2) return null
      if (y <= samples[0].y) return samples[0]
      const last = samples[samples.length - 1]
      if (y >= last.y) return last

      let lo = 0
      let hi = samples.length - 1
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1
        if (samples[mid].y <= y) lo = mid
        else hi = mid
      }
      const a = samples[lo]
      const b = samples[hi]
      const span = b.y - a.y
      const t = span > 0.0001 ? (y - a.y) / span : 0
      return {
        len: a.len + (b.len - a.len) * t,
        x: a.x + (b.x - a.x) * t,
        y,
      }
    }

    const paint = (tipY: number) => {
      const { length } = geo.current
      if (!length) return

      if (reduced) {
        path.style.strokeDashoffset = '0'
        return
      }

      const wrap = wrapRef.current
      const heroStart = document.querySelector('[data-hero-flow-start]')
      const heroProgress = getHeroProgress()

      // Homepage only: stay fully undrawn until hero scrub reaches the reveal gate.
      if (heroStart && heroProgress < HERO_THREAD_REVEAL) {
        path.style.strokeDashoffset = `${length}`
        path.style.visibility = 'hidden'
        const dot = dotRef.current
        if (dot) dot.style.opacity = '0'
        if (wrap) {
          wrap.style.zIndex = 'var(--z-thread)'
          wrap.style.transform = ''
        }
        return
      }

      path.style.visibility = 'visible'

      // Hero beat (post-reveal): park in [data-hero-thread-slot] under statement,
      // including after sticky release until the section has mostly left.
      // Then --z-thread under .layer-content so video/copy stay on top.
      if (wrap) {
        if (heroStart) {
          const scrollY = window.scrollY
          const vh = window.innerHeight
          const rect = heroStart.getBoundingClientRect()
          const heroY = Math.max(0, rect.top + scrollY)
          const heroBottom = heroSectionBottom(heroStart, heroY, vh)
          const slot = document.querySelector<HTMLElement>('[data-hero-thread-slot]')
          const inSlot = !!(
            slot &&
            shouldParkInHeroSlot(scrollY, heroBottom, heroProgress, vh)
          )
          if (inSlot) {
            wrap.style.zIndex = 'auto'
            wrap.style.transform = heroSlotTransform(scrollY, heroBottom, vh)
          } else {
            wrap.style.zIndex = 'var(--z-thread)'
            wrap.style.transform = ''
          }
        } else {
          wrap.style.zIndex = 'var(--z-thread)'
          wrap.style.transform = ''
        }
      }

      const hit = lengthAtY(tipY)
      if (!hit) return

      path.style.strokeDashoffset = `${(length - hit.len).toFixed(2)}`

      const dot = dotRef.current
      if (dot) {
        const drawn = hit.len / length
        if (drawn >= 0.998) {
          dot.style.opacity = '0'
        } else {
          // Include the near-zero draw at reveal so the tip sits at top-left.
          dot.style.transform = `translate3d(${hit.x.toFixed(1)}px, ${hit.y.toFixed(1)}px, 0) translate(-50%, -50%)`
          dot.style.opacity = '1'
        }
      }
    }

    const frame = (now: number) => {
      const dt = Math.min(50, now - lastFrame || 16.7)
      lastFrame = now
      // Softer follow (~120ms) so the tip tracks Lenis without jitter.
      currentTipY += (targetTipY - currentTipY) * (1 - Math.exp(-dt / 120))
      paint(currentTipY)
      if (Math.abs(targetTipY - currentTipY) > 0.08 && !document.hidden) {
        motionRaf = requestAnimationFrame(frame)
      } else {
        currentTipY = targetTipY
        paint(currentTipY)
        running = false
      }
    }

    let wasPortaled = false

    /** Move the same DOM node into the hero slot (no React remount / style reset). */
    const syncHeroPortal = () => {
      const wrap = wrapRef.current
      const host = hostRef.current
      const heroStart = document.querySelector('[data-hero-flow-start]')
      const slot = document.querySelector<HTMLElement>('[data-hero-thread-slot]')
      if (!wrap || !host) return { stickyActive: false, portaled: false, exited: false }
      if (!heroStart || !slot) {
        if (wrap.parentElement !== host) host.appendChild(wrap)
        const exited = wasPortaled
        wasPortaled = false
        return { stickyActive: false, portaled: false, exited }
      }
      const scrollY = window.scrollY
      const vh = window.innerHeight
      const rect = heroStart.getBoundingClientRect()
      const heroY = Math.max(0, rect.top + scrollY)
      const heroBottom = heroSectionBottom(heroStart, heroY, vh)
      const stickyActive = isHeroStickyActive(scrollY, heroBottom, vh)
      const shouldPortal = shouldParkInHeroSlot(
        scrollY,
        heroBottom,
        getHeroProgress(),
        vh
      )
      const target = shouldPortal ? slot : host
      if (wrap.parentElement !== target) target.appendChild(wrap)
      const exited = wasPortaled && !shouldPortal
      wasPortaled = shouldPortal
      return { stickyActive, portaled: shouldPortal, exited }
    }

    const wake = () => {
      const { exited } = syncHeroPortal()
      // Path is document-stable — only remeasure on exit (safety) or schedule/reflow.
      if (exited) measure()

      targetTipY = resolveTipY()
      if (exited) {
        // Snap tip across portal exit; path `d` is unchanged.
        const wrap = wrapRef.current
        if (wrap) {
          wrap.style.zIndex = 'var(--z-thread)'
          wrap.style.transform = ''
        }
        currentTipY = targetTipY
        paint(targetTipY)
        if (reduced) return
        if (running || document.hidden) return
        running = true
        lastFrame = performance.now()
        motionRaf = requestAnimationFrame(frame)
        return
      }

      paint(reduced ? targetTipY : currentTipY)
      if (reduced) return
      if (running || document.hidden) return
      running = true
      lastFrame = performance.now()
      motionRaf = requestAnimationFrame(frame)
    }

    measure()
    syncHeroPortal()
    paint(currentTipY)

    // Fonts and late-loading media change the document height; ResizeObserver
    // on <body> catches both without polling.
    const ro = new ResizeObserver(schedule)
    ro.observe(document.body)
    document.fonts?.ready.then(schedule).catch(() => {})

    // Video metadata arriving can change layout after everything else settled.
    const onMediaSettled = () => schedule()
    document.querySelectorAll('video').forEach((v) =>
      v.addEventListener('loadedmetadata', onMediaSettled, { once: true })
    )
    // Two late passes catch anything that reflows after first paint.
    const t1 = window.setTimeout(schedule, 700)
    const t2 = window.setTimeout(schedule, 2000)

    const unsubscribe = subscribeScrollSignal(wake)
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(motionRaf)
        running = false
      } else {
        wake()
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('orientationchange', schedule)
      document.querySelectorAll('video').forEach((v) =>
        v.removeEventListener('loadedmetadata', onMediaSettled)
      )
      cancelAnimationFrame(measureRaf)
      cancelAnimationFrame(motionRaf)
      ro.disconnect()
      unsubscribe()
      window.removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', onVis)
      // Return the thread to the React host before unmount.
      const wrap = wrapRef.current
      const host = hostRef.current
      if (wrap && host && wrap.parentElement !== host) host.appendChild(wrap)
    }
  }, [measure, reduced])

  return (
    <div ref={hostRef} aria-hidden="true">
      <ThreadChrome
        wrapRef={wrapRef as React.RefObject<HTMLDivElement>}
        svgRef={svgRef as React.RefObject<SVGSVGElement>}
        pathRef={pathRef as React.RefObject<SVGPathElement>}
        dotRef={dotRef as React.RefObject<HTMLDivElement>}
        narrow={narrow}
        reduced={reduced}
      />
    </div>
  )
}

function ThreadChrome({
  wrapRef,
  svgRef,
  pathRef,
  dotRef,
  narrow,
  reduced,
}: {
  // React's DOM `ref` expects RefObject<T> (current: T), while useRef(null)
  // is typed as RefObject<T | null> — cast at the call site bridges them.
  wrapRef: React.RefObject<HTMLDivElement>
  svgRef: React.RefObject<SVGSVGElement>
  pathRef: React.RefObject<SVGPathElement>
  dotRef: React.RefObject<HTMLDivElement>
  narrow: boolean
  reduced: boolean
}) {
  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 w-full"
      style={{ zIndex: 'var(--z-thread)', overflowX: 'clip' }}
    >
      <svg
        ref={svgRef}
        className="absolute left-0 top-0"
        style={{ overflow: 'visible' }}
        fill="none"
      >
        <path
          ref={pathRef}
          data-flow-thread-path
          d=""
          stroke="#0089FF"
          strokeWidth={narrow ? 2.25 : 3}
          strokeLinecap="round"
          fill="none"
          style={{
            opacity: reduced ? 0.2 : 0.55,
            filter: 'drop-shadow(0 0 6px rgba(0,137,255,0.65))',
            strokeDasharray: 4000,
            strokeDashoffset: 4000,
            ['--signal-cue' as string]: '0',
          }}
          data-signal-path
        />
      </svg>

      {!reduced && (
        <div
          ref={dotRef}
          className="absolute left-0 top-0 will-change-transform"
          style={{
            width: narrow ? 3.5 : 4.5,
            height: narrow ? 3.5 : 4.5,
            borderRadius: '9999px',
            background: '#DCEEFF',
            boxShadow: '0 0 6px 2px rgba(0,137,255,0.85), 0 0 18px 7px rgba(0,137,255,0.4)',
            opacity: 0,
          }}
        />
      )}
    </div>
  )
}
