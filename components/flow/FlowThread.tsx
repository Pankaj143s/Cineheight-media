'use client'

import { useCallback, useEffect, useRef } from 'react'
import { clamp } from '@/lib/utils'
import { useIsNarrow, useReducedMotion } from '@/lib/useMediaPreferences'

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
  const geo = useRef({ length: 0, startY: 0, endY: 0, docH: 0 })

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
      geo.current = { length: 0, startY: 0, endY: 0, docH }
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
    geo.current = { length, startY: pts[0].y, endY: pts[pts.length - 1].y, docH }
  }, [narrow])

  // ---- build + keep in sync with layout -------------------------------
  useEffect(() => {
    const path = pathRef.current
    if (!path) return

    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        measure()
        draw()
      })
    }

    // Vertical progress → revealed length. The path descends monotonically, so
    // mapping the tip's document Y linearly onto arc length is accurate enough
    // and costs one subtraction instead of a search.
    const draw = () => {
      const { length, startY, endY } = geo.current
      if (!length) return
      const vh = window.innerHeight
      const tipY = window.scrollY + vh * 0.62
      const p = clamp((tipY - startY) / Math.max(1, endY - startY), 0, 1)

      if (reduced) {
        path.style.strokeDashoffset = '0'
        return
      }
      path.style.strokeDashoffset = `${length * (1 - p)}`

      const dot = dotRef.current
      if (dot) {
        if (p <= 0.001 || p >= 0.999) {
          dot.style.opacity = '0'
        } else {
          const pt = path.getPointAtLength(length * p)
          dot.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0) translate(-50%, -50%)`
          dot.style.opacity = '1'
        }
      }
    }

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        draw()
      })
    }

    measure()
    draw()

    // Fonts and late-loading media change the document height; ResizeObserver
    // on <body> catches both without polling.
    const ro = new ResizeObserver(schedule)
    ro.observe(document.body)
    document.fonts?.ready.then(schedule).catch(() => {})

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', schedule)
    const onVis = () => { if (!document.hidden) onScroll() }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', onVis)
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
          d=""
          stroke="#0089FF"
          strokeWidth={narrow ? 1.1 : 1.4}
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
            width: 8,
            height: 8,
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
