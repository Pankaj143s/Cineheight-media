'use client'

import { useRef, type RefObject } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { useReducedMotion } from '@/lib/useMediaPreferences'
import { SCRUB, TRIGGER } from '@/lib/motionTokens'

export type ScrollScrubOptions = {
  /** ScrollTrigger start. Defaults to TRIGGER.headlineStart. */
  start?: string
  /** ScrollTrigger end. Defaults to a mid-viewport complete for short reveals. */
  end?: string
  /** Scrub lag. Defaults to SCRUB.text. */
  scrub?: number | boolean
  /**
   * Extra deps that should rebuild the timeline (text content, form, etc.).
   * The trigger element is always taken from `triggerRef`.
   */
  deps?: unknown[]
}

/**
 * Attach a scrubbed GSAP timeline to a trigger element.
 *
 * Progress is locked to scroll: down advances, up rewinds. Reduced motion skips
 * the timeline and runs `onReduced` so content lands in its finished state.
 *
 * `build` receives a fresh timeline (defaults: ease none) and should only add
 * tweens — ScrollTrigger is already configured on the timeline.
 */
export function useScrollScrub(
  triggerRef: RefObject<HTMLElement | null>,
  build: (tl: gsap.core.Timeline, trigger: HTMLElement) => void,
  onReduced: (trigger: HTMLElement) => void,
  options: ScrollScrubOptions = {}
) {
  const reduced = useReducedMotion()
  const buildRef = useRef(build)
  const reducedRef = useRef(onReduced)
  buildRef.current = build
  reducedRef.current = onReduced

  const {
    start = TRIGGER.headlineStart,
    end = 'top 48%',
    scrub = SCRUB.text,
    deps = [],
  } = options

  useIsomorphicLayoutEffect(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    if (reduced) {
      reducedRef.current(trigger)
      return
    }

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger,
        start,
        end,
        scrub,
      },
    })

    buildRef.current(tl, trigger)

    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is caller-controlled
  }, [reduced, start, end, scrub, triggerRef, ...deps])

  return { reduced }
}
