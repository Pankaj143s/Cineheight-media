'use client'

import { useEffect } from 'react'
import { gsap } from './gsap'
import { clamp } from './utils'
import { useReducedMotion } from './useMediaPreferences'
import { readScrollSignal, subscribeScrollSignal } from './scrollSignal'
import { subscribeBodyResize } from './bodyResizeSignal'

const BASE_PX = 150
const SELECTOR =
  '[data-parallax-y], [data-parallax-x], [data-parallax-scale], [data-parallax-mobile-y], [data-parallax-mobile-x], [data-parallax-mobile-scale], [data-depth-layer]'
const AUTO_SELECTOR = 'main h1, main h2, main figure, main [data-scene-media], main [data-open-media]'

/**
 * Named depth bands.
 *
 * Authoring `data-depth-layer="back"` says what a layer IS in the composition
 * rather than picking a number, which is what keeps separate sections in
 * proportion with each other. Multipliers are against `BASE_PX`, and the
 * progress swing is roughly ±1, so `y: 0.2` is about ±30px of travel.
 *
 * back  ≈ 18–40px · mid ≈ 10–24px · front ≈ 4–14px
 *
 * An explicit `data-parallax-*` on the same element always wins, for the cases
 * where a scene genuinely needs its own number.
 */
const DEPTH_PRESETS = {
  back: { y: 0.2, x: 0.03, scale: 0.02 },
  mid: { y: 0.11, x: 0.015, scale: 0.01 },
  front: { y: 0.05, x: 0, scale: 0.004 },
} as const

type DepthLayer = keyof typeof DEPTH_PRESETS

interface ParallaxItem {
  el: HTMLElement
  y: number
  x: number
  scale: number
  mobileY: number
  mobileX: number
  mobileScale: number
  mobileDisable: boolean
  auto: boolean
  centerY: number
  currentX: number
  currentY: number
  currentScale: number
  targetX: number
  targetY: number
  targetScale: number
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
    const makeItem = (
      el: HTMLElement,
      y: number,
      x: number,
      scale: number,
      auto: boolean
    ): ParallaxItem => {
      const rect = el.getBoundingClientRect()
      return {
        el,
        y,
        x,
        scale,
        mobileY: Number(el.dataset.parallaxMobileY ?? y * 0.6),
        mobileX: Number(el.dataset.parallaxMobileX ?? 0),
        mobileScale: Number(el.dataset.parallaxMobileScale ?? scale * 0.65),
        mobileDisable: el.hasAttribute('data-parallax-mobile-disable'),
        auto,
        centerY: rect.top + readScrollSignal().y + rect.height / 2,
        currentX: 0,
        currentY: 0,
        currentScale: 1,
        targetX: 0,
        targetY: 0,
        targetScale: 1,
      }
    }
    const collect = (): ParallaxItem[] => {
      const manual = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).map((el) => {
        const layer = el.dataset.depthLayer as DepthLayer | undefined
        const preset = layer ? DEPTH_PRESETS[layer] : undefined
        return makeItem(
          el,
          Number(el.dataset.parallaxY ?? preset?.y ?? 0),
          Number(el.dataset.parallaxX ?? preset?.x ?? 0),
          Number(el.dataset.parallaxScale ?? preset?.scale ?? 0),
          false
        )
      })
      const seen = new Set(manual.map((item) => item.el))
      const automatic = Array.from(document.querySelectorAll<HTMLElement>(AUTO_SELECTOR))
        .filter(
          (el) =>
            !seen.has(el) &&
            !el.closest(
              '[data-interaction-quiet], form, [role="dialog"], [role="menu"], [data-parallax-exclude]'
            )
        )
        .map((el, index) => {
          const isHeading = el.matches('h1, h2')
          el.dataset.parallaxAuto = ''
          return makeItem(
            el,
            isHeading ? 0.075 : 0.1,
            isHeading ? (index % 2 ? -0.018 : 0.018) : 0.025,
            isHeading ? 0.0025 : 0.008,
            true
          )
        })
      return [...manual, ...automatic]
    }

    let items = collect()
    if (!items.length) return
    if (reduced) {
      reset(items)
      return () => {
        for (const item of items) {
          if (item.auto) delete item.el.dataset.parallaxAuto
        }
      }
    }

    let running = false
    let visible = !document.hidden
    const mobileQuery = window.matchMedia('(max-width: 767px)')

    const updateTargets = () => {
      const vh = window.innerHeight || 1
      const mobile = mobileQuery.matches
      const scrollY = readScrollSignal().y

      for (const item of items) {
        const progress =
          clamp((vh - (item.centerY - scrollY)) / vh - 0.5, -0.75, 0.75) * 1.33
        if (mobile && item.mobileDisable) {
          item.targetX = 0
          item.targetY = 0
          item.targetScale = 1
          continue
        }
        const x = mobile ? item.mobileX : item.x
        const y = mobile ? item.mobileY : item.y
        const scale = mobile ? item.mobileScale : item.scale
        item.targetX = progress * x * BASE_PX
        item.targetY = progress * y * BASE_PX
        item.targetScale = 1 + progress * scale
      }
    }

    // On the shared gsap.ticker rather than its own requestAnimationFrame, so
    // this settles on exactly the same clock as Lenis/ScrollTrigger instead of
    // stacking a second, independently-timed rAF loop on top.
    const frame = (_time: number, deltaMs: number) => {
      const dt = Math.min(50, deltaMs || 16.7)
      const factor = 1 - Math.exp(-dt / 105)
      let unsettled = false
      for (const item of items) {
        item.currentX += (item.targetX - item.currentX) * factor
        item.currentY += (item.targetY - item.currentY) * factor
        item.currentScale += (item.targetScale - item.currentScale) * factor
        item.el.style.setProperty('--parallax-x', `${item.currentX.toFixed(2)}px`)
        item.el.style.setProperty('--parallax-y', `${item.currentY.toFixed(2)}px`)
        item.el.style.setProperty('--parallax-scale', item.currentScale.toFixed(4))
        unsettled ||=
          Math.abs(item.targetX - item.currentX) > 0.03 ||
          Math.abs(item.targetY - item.currentY) > 0.03 ||
          Math.abs(item.targetScale - item.currentScale) > 0.0001
      }
      if (!(unsettled && visible)) {
        gsap.ticker.remove(frame)
        running = false
      }
    }

    const schedule = () => {
      updateTargets()
      if (running || !visible) return
      running = true
      gsap.ticker.add(frame)
    }

    const onResize = () => {
      items = collect()
      schedule()
    }
    const observer = new MutationObserver(() => {
      items = collect()
      schedule()
    })
    const onBodyResize = () => {
      items = collect()
      schedule()
    }
    const onVisibility = () => {
      visible = !document.hidden
      if (visible) schedule()
      else {
        gsap.ticker.remove(frame)
        running = false
      }
    }

    updateTargets()
    schedule()
    const unsubscribe = subscribeScrollSignal(schedule)
    window.addEventListener('resize', onResize)
    mobileQuery.addEventListener('change', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    observer.observe(document.body, { childList: true, subtree: true })
    const unsubscribeBodyResize = subscribeBodyResize(onBodyResize)
    return () => {
      gsap.ticker.remove(frame)
      unsubscribe()
      window.removeEventListener('resize', onResize)
      mobileQuery.removeEventListener('change', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      observer.disconnect()
      unsubscribeBodyResize()
      reset(items)
      for (const item of items) {
        if (item.auto) delete item.el.dataset.parallaxAuto
      }
    }
  }, [reduced])
}
