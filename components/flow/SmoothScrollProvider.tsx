'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/lib/gsap'

/**
 * The ONE smooth-scroll instance for the whole site. Mounted once in
 * app/layout.tsx; no component may create its own.
 *
 * Lenis drives real `window` scroll (it is not a transformed wrapper), so
 * ScrollTrigger needs no `scrollerProxy` — it only needs to be told to update
 * on every Lenis scroll event. Lenis's own rAF is replaced by `gsap.ticker` so
 * exactly one loop advances both systems and their frames can never disagree.
 *
 * Under `prefers-reduced-motion` nothing is instantiated at all: native scroll
 * stays untouched, which also preserves keyboard scrolling, browser find-in-page
 * and scroll restoration on the tier that needs them most.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.05,
      // Gentle exponential ease-out — no overshoot, no rubber band.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Touch devices keep their native momentum; hijacking it feels wrong and
      // breaks pull-to-refresh.
      smoothWheel: true,
      touchMultiplier: 1,
      wheelMultiplier: 1,
    })

    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    // Lag smoothing would let GSAP skip time after a stall, desynchronising
    // Lenis's integrator from the ticker clock.
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.off('scroll', onScroll)
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33) // GSAP's default
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
