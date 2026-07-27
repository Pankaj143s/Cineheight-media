'use client'

import { useCallback, useEffect, useRef } from 'react'
import { clamp } from '@/lib/utils'
import { useIsNarrow, useReducedMotion } from '@/lib/useMediaPreferences'
import { readScrollSignal, subscribeScrollSignal } from '@/lib/scrollSignal'

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
 * the leading tip sitting ~62 % down the viewport. It therefore grows on the
 * way down and retracts on the way up for free, and starts completely
 * undrawn because the first anchor sits below the opening viewport.
 */

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
function buildPath(pts: Pt[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]

    const dy = Math.max(1, p2.y - p1.y)
    // A control point may lean sideways by at most 60 % of the segment height;
    // beyond that the curve starts to read as a hook.
    const maxDx = dy * 0.6

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

export default function FlowThread() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  const reduced = useReducedMotion()
  const narrow = useIsNarrow(767)

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

    const anchors = Array.from(
      document.querySelectorAll<HTMLElement>('[data-flow-anchor]')
    )
      .map((el) => {
        const rect = el.getBoundingClientRect()
        const lead = Number(el.dataset.flowLead ?? '0.5')
        const side = (el.dataset.flowAnchor || 'center') as Side
        return {
          x: (table[side] ?? 0.5) * vw,
          y: rect.top + scrollY + rect.height * clamp(lead, 0, 1),
        }
      })
      .sort((a, b) => a.y - b.y)

    if (anchors.length < 2) {
      path.setAttribute('d', '')
      geo.current = { length: 0, startY: 0, endY: 0, docH, samples: [] }
      return
    }

    // Lead-in above the first anchor and run-out past the last, both leaving
    // the frame so the thread enters and exits rather than starting mid-air.
    const first = anchors[0]
    const last = anchors[anchors.length - 1]
    const pts: Pt[] = [
      { x: first.x - vw * 0.22, y: first.y - 180 },
      ...anchors,
      { x: last.x + vw * 0.2, y: last.y + 220 },
    ]

    svg.setAttribute('width', String(vw))
    svg.setAttribute('height', String(docH))
    wrap.style.height = `${docH}px`
    path.setAttribute('d', buildPath(pts))

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`

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
    const schedule = () => {
      cancelAnimationFrame(measureRaf)
      measureRaf = requestAnimationFrame(() => {
        measure()
        targetTipY = readScrollSignal().y + window.innerHeight * 0.62
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

      const hit = lengthAtY(tipY)
      if (!hit) return

      path.style.strokeDashoffset = `${(length - hit.len).toFixed(2)}`

      // Cheap contract for other flow systems (the pointer signal field) to
      // read the thread's current tip without measuring the SVG themselves —
      // one extra setProperty call inside a rAF-gated handler that already runs.
      document.documentElement.style.setProperty('--flow-thread-x', `${hit.x.toFixed(1)}px`)
      document.documentElement.style.setProperty(
        '--flow-thread-y',
        `${(hit.y - readScrollSignal().y).toFixed(1)}px`
      )

      const dot = dotRef.current
      if (dot) {
        const drawn = hit.len / length
        if (drawn <= 0.002 || drawn >= 0.998) {
          dot.style.opacity = '0'
        } else {
          dot.style.transform = `translate3d(${hit.x.toFixed(1)}px, ${hit.y.toFixed(1)}px, 0) translate(-50%, -50%)`
          dot.style.opacity = '1'
        }
      }
    }

    const frame = (now: number) => {
      const dt = Math.min(50, now - lastFrame || 16.7)
      lastFrame = now
      // Keep the original ~62% viewport position during fast reversals while
      // still damping individual wheel/trackpad spikes.
      currentTipY += (targetTipY - currentTipY) * (1 - Math.exp(-dt / 72))
      paint(currentTipY)
      if (Math.abs(targetTipY - currentTipY) > 0.08 && !document.hidden) {
        motionRaf = requestAnimationFrame(frame)
      } else {
        currentTipY = targetTipY
        paint(currentTipY)
        running = false
      }
    }

    const wake = () => {
      targetTipY = readScrollSignal().y + window.innerHeight * 0.62
      if (reduced) {
        paint(targetTipY)
        return
      }
      if (running || document.hidden) return
      running = true
      lastFrame = performance.now()
      motionRaf = requestAnimationFrame(frame)
    }

    measure()
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
      document.documentElement.style.removeProperty('--flow-thread-x')
      document.documentElement.style.removeProperty('--flow-thread-y')
    }
  }, [measure, reduced])

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 w-full"
      // clip on X only: the route's off-screen excursions are meant to be cut
      // at the viewport edge (that is how the thread "leaves and re-enters"),
      // while the leading dot must never be clipped vertically.
      style={{ zIndex: 1, overflowX: 'clip' }}
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
          strokeWidth={narrow ? 1.75 : 2.25}
          strokeLinecap="round"
          fill="none"
          style={{
            opacity: reduced ? 0.16 : 0.34,
            filter: 'drop-shadow(0 0 4px rgba(0,137,255,0.5))',
            // Undrawn until the effect measures — never a full-path flash.
            strokeDasharray: 4000,
            strokeDashoffset: 4000,
          }}
        />
      </svg>

      {/* Leading light — a real round element in pixel space, never distorted */}
      {!reduced && (
        <div
          ref={dotRef}
          className="absolute left-0 top-0 will-change-transform"
          style={{
            width: narrow ? 2.5 : 3.2,
            height: narrow ? 2.5 : 3.2,
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
