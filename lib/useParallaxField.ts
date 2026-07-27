'use client'

import { useEffect } from 'react'
import { clamp } from './utils'
import { useReducedMotion } from './useMediaPreferences'

const BASE_PX = 150
const SELECTOR = '[data-parallax-y], [data-parallax-x], [data-parallax-scale]'

interface ParallaxItem {
  el: HTMLElement
  y: number
  x: number
  scale: number
}

function reset(items: ParallaxItem[]) {
  for (const item of items) {
    item.el.style.setProperty('--parallax-x', '0px')
    item.el.style.setProperty('--parallax-y', '0px')
    item.el.style.setProperty('--parallax-scale', '1')
  }
}

/**
 * One scroll/resize pipeline for every declarative parallax layer. Independent
 * CSS translate/scale properties compose with the transforms owned by GSAP,
 * pointer lean and marquees, so sections never fight over `style.transform`.
 */
export function useParallaxField(): void {
  const reduced = useReducedMotion()

  useEffect(() => {
    const collect = (): ParallaxItem[] =>
      Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).map((el) => ({
        el,
        y: Number(el.dataset.parallaxY ?? 0),
        x: Number(el.dataset.parallaxX ?? 0),
        scale: Number(el.dataset.parallaxScale ?? 0),
      }))

    let items = collect()
    if (!items.length) return
    if (reduced) {
      reset(items)
      return
    }

    let raf = 0
    let ticking = false
    let visible = !document.hidden
    const mobileQuery = window.matchMedia('(max-width: 767px), (pointer: coarse)')

    const apply = () => {
      ticking = false
      if (!visible) return
      const vh = window.innerHeight || 1
      const mobile = mobileQuery.matches
      const amplitude = mobile ? 0.4 : 1

      for (const item of items) {
        const rect = item.el.getBoundingClientRect()
        const progress =
          clamp((vh - (rect.top + rect.height / 2)) / vh - 0.5, -0.75, 0.75) * 1.33
        const tx = mobile ? 0 : progress * item.x * BASE_PX
        const ty = progress * item.y * BASE_PX * amplitude
        const scale = mobile ? 1 : 1 + progress * item.scale
        item.el.style.setProperty('--parallax-x', `${tx.toFixed(2)}px`)
        item.el.style.setProperty('--parallax-y', `${ty.toFixed(2)}px`)
        item.el.style.setProperty('--parallax-scale', scale.toFixed(4))
      }
    }

    const schedule = () => {
      if (ticking || !visible) return
      ticking = true
      raf = requestAnimationFrame(apply)
    }

    const onResize = () => {
      items = collect()
      schedule()
    }
    const onVisibility = () => {
      visible = !document.hidden
      if (visible) schedule()
      else cancelAnimationFrame(raf)
    }

    apply()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    mobileQuery.addEventListener('change', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      mobileQuery.removeEventListener('change', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      reset(items)
    }
  }, [reduced])
}
