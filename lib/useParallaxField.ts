'use client'

import { useEffect } from 'react'
import { clamp } from './utils'
import { useReducedMotion } from './useMediaPreferences'

/**
 * One rAF-throttled, scroll-driven parallax engine for the whole page after
 * the showreel — elements opt in with data attributes instead of each scene
 * wiring its own scroll listener:
 *
 *   <span data-parallax-y="0.14" />           — vertical drift, in "speed units"
 *   <span data-parallax-x="0.06" />           — horizontal drift
 *   <span data-parallax-scale="0.02" />       — ±2% scale breathing
 *
 * A speed unit maps to roughly `unit * BASE_PX` pixels of total travel as the
 * element crosses the viewport (BASE_PX chosen so 0.06–0.24 lands in the
 * "8–24px text / 12–36px decorative / 18–48px media" ranges design asked for).
 * Scale units are applied directly as a fraction (0.02 = ±2%).
 *
 * Mounted once in `FlowDirector` — matches this project's existing convention
 * of centralising cross-cutting scroll work rather than duplicating a listener
 * per component. Skips entirely under reduced motion. Elements are queried
 * once per mount (this page's parallax targets don't mount/unmount mid-scroll
 * within a route), so the per-frame cost is just a `getBoundingClientRect` and
 * a `style.transform` write per opted-in element — no React state.
 */

const BASE_PX = 90

export function useParallaxField(): void {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return

    const collect = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-parallax-y], [data-parallax-x], [data-parallax-scale]'
        )
      ).map((el) => ({
        el,
        y: Number(el.dataset.parallaxY ?? 0),
        x: Number(el.dataset.parallaxX ?? 0),
        scale: Number(el.dataset.parallaxScale ?? 0),
      }))

    let items = collect()
    if (!items.length) return

    let raf = 0
    let ticking = false

    const apply = () => {
      ticking = false
      const vh = window.innerHeight || 1
      for (const item of items) {
        const r = item.el.getBoundingClientRect()
        // -1 as the element enters from the bottom .. 0 centred .. 1 as it
        // leaves the top — clamped so travel never runs away on tall elements.
        const progress = clamp((vh - (r.top + r.height / 2)) / vh - 0.5, -0.75, 0.75) * 1.33
        const parts: string[] = []
        if (item.x || item.y) {
          const tx = (progress * item.x * BASE_PX).toFixed(2)
          const ty = (progress * item.y * BASE_PX).toFixed(2)
          parts.push(`translate3d(${tx}px, ${ty}px, 0)`)
        }
        if (item.scale) {
          parts.push(`scale(${(1 + progress * item.scale).toFixed(4)})`)
        }
        if (parts.length) item.el.style.transform = parts.join(' ')
      }
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(apply)
    }

    const onResize = () => {
      items = collect()
      apply()
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [reduced])
}
