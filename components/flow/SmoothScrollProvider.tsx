'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { publishScrollSignal } from '@/lib/scrollSignal'
import { registerLenis } from '@/lib/scrollTo'

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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const publishNative = () => {
      const limit = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      publishScrollSignal({
        y: window.scrollY,
        progress: Math.min(1, Math.max(0, window.scrollY / limit)),
        velocity: 0,
        direction: 0,
      })
    }
    if (reduced) {
      publishNative()
      window.addEventListener('scroll', publishNative, { passive: true })
      return () => window.removeEventListener('scroll', publishNative)
    }

    const lenis = new Lenis({
      // Lerp mode rather than duration/easing — the scroll position chases the
      // input every frame instead of running a fixed-length glide tween, so it
      // tracks the wheel closely while still smoothing out the step.
      lerp: 0.09,
      smoothWheel: true,
      // Touch devices keep their native momentum; hijacking it feels wrong and
      // breaks pull-to-refresh.
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 1,
    })

    const onScroll = (state: Lenis) => {
      publishScrollSignal({
        y: state.scroll,
        progress: state.progress,
        velocity: state.velocity,
        direction: state.direction < 0 ? -1 : state.direction > 0 ? 1 : 0,
      })
      ScrollTrigger.update()
    }
    lenis.on('scroll', onScroll)
    onScroll(lenis)
    registerLenis(lenis)

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    // Lag smoothing would let GSAP skip time after a stall, desynchronising
    // Lenis's integrator from the ticker clock.
    gsap.ticker.lagSmoothing(0)

    return () => {
      registerLenis(null)
      lenis.off('scroll', onScroll)
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33) // GSAP's default
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
