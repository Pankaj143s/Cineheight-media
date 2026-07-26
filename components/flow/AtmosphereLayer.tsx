'use client'

import { useEffect, useRef } from 'react'

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

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let ticking = false

    const apply = () => {
      ticking = false
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      el.style.setProperty('--flow', p.toFixed(4))
      // A slow sine so the atmosphere breathes across the route instead of
      // ramping in one direction.
      el.style.setProperty('--flow-wave', Math.sin(p * Math.PI * 1.6).toFixed(4))
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

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

      {/* Vignette — keeps the edges quiet so type never fights the light */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 92% 74% at 50% 50%, transparent 42%, rgba(2,3,6,0.6))' }}
      />
    </div>
  )
}
