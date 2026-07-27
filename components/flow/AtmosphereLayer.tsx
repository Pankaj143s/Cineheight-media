'use client'

import { useEffect, useRef } from 'react'
import { readScrollSignal, subscribeScrollSignal } from '@/lib/scrollSignal'
import { useReducedMotion } from '@/lib/useMediaPreferences'

const STATIC_CONTOURS = [
  'M-40 110 C230 82 420 148 710 112 S1160 76 1520 126',
  'M-40 190 C250 228 470 156 760 196 S1190 238 1520 178',
  'M-40 275 C220 238 455 306 730 270 S1190 232 1520 286',
  'M-40 365 C260 408 500 326 780 370 S1190 410 1520 350',
  'M-40 455 C220 414 480 496 750 450 S1170 412 1520 468',
  'M-40 545 C250 588 480 510 780 552 S1210 590 1520 532',
  'M-40 635 C210 598 450 678 740 632 S1170 596 1520 652',
  'M-40 725 C250 768 500 686 780 730 S1200 770 1520 712',
  'M-40 815 C220 778 470 852 750 810 S1190 778 1520 828',
]

/**
 * The ONE background for a route. Fixed and full-viewport, so it inherently
 * crosses every content boundary — which is precisely what the old
 * section-per-section backgrounds could not do.
 *
 * Three soft fields drift and change weight as the page scrolls, driven by two
 * CSS custom properties written from a rAF-throttled scroll handler (no React
 * state, no per-frame layout). Scenes must NOT paint their own opaque
 * backgrounds; at most they contribute a small local accent through `accent`.
 */
export default function AtmosphereLayer({
  /** Local client accent for case-study routes — subtle, never a wash. */
  accent,
}: {
  accent?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced) {
      el.style.setProperty('--flow', '0.35')
      el.style.setProperty('--flow-wave', '0')
      return
    }

    let target = readScrollSignal().progress
    let current = target
    let raf = 0
    let running = false
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min(50, now - last || 16.7)
      last = now
      current += (target - current) * (1 - Math.exp(-dt / 145))
      el.style.setProperty('--flow', current.toFixed(4))
      el.style.setProperty('--flow-wave', Math.sin(current * Math.PI * 1.6).toFixed(4))
      if (Math.abs(target - current) > 0.00005 && !document.hidden) {
        raf = requestAnimationFrame(frame)
      } else {
        current = target
        running = false
      }
    }
    const wake = () => {
      target = readScrollSignal().progress
      if (running || document.hidden) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const unsubscribe = subscribeScrollSignal(wake)
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        running = false
      } else {
        wake()
      }
    }

    wake()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      unsubscribe()
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ ['--flow' as string]: 0, ['--flow-wave' as string]: 0 }}
    >
      {/* Deep base — the near-black stage the whole site sits on */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, var(--bg-950), var(--bg-900) 55%, var(--bg-950))' }}
      />

      <svg
        aria-hidden="true"
        className="static-contour-field absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
      >
        {STATIC_CONTOURS.map((d, index) => (
          <path
            key={index}
            d={d}
            stroke="#0089FF"
            strokeWidth={index === 4 ? 0.9 : 0.6}
            vectorEffect="non-scaling-stroke"
            opacity={index === 4 ? 0.36 : 0.2}
          />
        ))}
      </svg>

      {/* Travelling blue field — moves down and across as the route unfolds */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 62% 40% at calc(28% + var(--flow-wave) * 34%) calc(18% + var(--flow) * 62%),' +
            ' rgba(0,137,255,0.085), transparent 68%)',
        }}
      />

      {/* Counter field — drifts the other way so the light never feels static */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 48% 34% at calc(82% - var(--flow-wave) * 30%) calc(76% - var(--flow) * 44%),' +
            ' rgba(0,110,210,0.06), transparent 70%)',
        }}
      />

      {/* Local client accent — case-study routes only, deliberately faint */}
      {accent && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 54% 38% at calc(50% + var(--flow-wave) * 18%) calc(40% + var(--flow) * 30%), ${accent}1f, transparent 72%)`,
          }}
        />
      )}

      {/* One quiet depth wash supports the contour field without adding
          competing rings or independently animated geometry. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(112deg, transparent 15%, rgba(0,137,255,0.018) 42%, rgba(220,238,255,0.025) 50%, rgba(0,137,255,0.015) 58%, transparent 84%)',
          transform: 'translate3d(calc(var(--flow-wave) * 3%), 0, 0)',
        }}
      />

      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 92% 74% at 50% 50%, transparent 42%, rgba(2,3,6,0.6))' }}
      />
    </div>
  )
}
