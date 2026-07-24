'use client'

import { useEffect, useRef } from 'react'
import { useIsNarrow, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * SignalField — the continuous background "signal route" (master brief §31).
 * A single restrained #0089FF path that is DRAWN as the page scrolls down and
 * RETRACTS as it scrolls up, with a soft glowing dot riding the leading tip.
 * The path wanders left/right and deliberately runs past the screen edges,
 * re-entering later (no loops, no self-crossings).
 *
 * Fixed, full-viewport, pointer-events:none, behind all content (the page sets
 * the z-order). The wandering route lives in a 0–100 viewBox stretched to the
 * viewport (excursions <0 / >100 leave the screen and are clipped). The path is
 * an SVG (hairline, non-scaling stroke); the round glowing dot is a separate
 * HTML element positioned in PIXEL space so it never distorts. `stroke-dashoffset`
 * reveals the route in proportion to whole-page scroll progress; a rAF-throttled
 * scroll handler writes attributes directly — no per-frame React state.
 */

// One hand-authored wandering path (viewBox units 0–100; values <0 or >100 are
// off-screen excursions). Smooth cubic béziers, no crossings.
const PATH_D = [
  'M -8 6',
  'C 16 10, 26 20, 22 30',
  'S 2 42, 10 52',
  'S 42 60, 52 54',
  'S 78 40, 88 48',
  'S 112 62, 96 70',
  'S 60 74, 50 80',
  'S 20 86, 30 92',
  'S 74 98, 108 104',
].join(' ')

// Simpler route for narrow viewports (spec §24) — fewer excursions, calmer.
const PATH_D_NARROW = [
  'M -10 8',
  'C 30 16, 70 24, 60 38',
  'S 20 54, 40 66',
  'S 90 80, 70 92',
  'S 40 100, 60 106',
].join(' ')

export default function SignalField() {
  const pathRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const narrow = useIsNarrow(767)

  useEffect(() => {
    const path = pathRef.current
    const dot = dotRef.current
    if (!path) return
    const len = path.getTotalLength()
    path.style.strokeDasharray = `${len}`

    // Reduced motion: draw a faint static partial route, no dot, no scroll work.
    if (reduced) {
      path.style.strokeDashoffset = `${len * 0.5}`
      if (dot) dot.style.display = 'none'
      return
    }

    let ticking = false
    const update = () => {
      ticking = false
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      // Reveal from the start: offset len → 0 as p 0 → 1.
      path.style.strokeDashoffset = `${len * (1 - p)}`
      if (dot) {
        const pt = path.getPointAtLength(len * p)
        // viewBox 0–100 (preserveAspectRatio none) → pixel space is proportional.
        const px = (pt.x / 100) * window.innerWidth
        const py = (pt.y / 100) * window.innerHeight
        dot.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`
        dot.style.opacity = p > 0.004 && p < 0.996 ? '1' : '0'
      }
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }
    const onVisibility = () => { if (!document.hidden) onScroll() }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced, narrow])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        {/* The drawn route — faint blue hairline (non-scaling stroke keeps it a
            constant pixel width despite the non-uniform viewBox stretch). */}
        <path
          ref={pathRef}
          d={narrow ? PATH_D_NARROW : PATH_D}
          fill="none"
          stroke="#0089FF"
          strokeWidth={1.4}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          // Start hidden before JS measures the exact length (avoids a full-path
          // flash on load); the effect overwrites these with the real length.
          strokeDasharray={2000}
          strokeDashoffset={2000}
          style={{ opacity: 0.3, filter: 'drop-shadow(0 0 3px rgba(0,137,255,0.45))' }}
        />
      </svg>

      {/* Round glowing dot at the leading tip — pixel space, never distorted */}
      <div
        ref={dotRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{
          width: 9,
          height: 9,
          borderRadius: '9999px',
          background: '#CFE8FF',
          boxShadow: '0 0 6px 2px rgba(0,137,255,0.9), 0 0 16px 6px rgba(0,137,255,0.45)',
          opacity: 0,
        }}
      />
    </div>
  )
}
