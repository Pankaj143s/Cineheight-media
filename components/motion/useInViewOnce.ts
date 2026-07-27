'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Fire-once visibility gate shared by the typography reveals.
 *
 * Three guarantees, because a heading that never un-hides is worse than one
 * that never animates:
 *
 *  1. Reduced motion reports `true` on the first render — the finished text is
 *     painted immediately, never a hidden element waiting on an observer.
 *  2. If the element is ALREADY within (or above) the viewport when the effect
 *     runs, it is shown synchronously. This covers a refresh partway down the
 *     page, browser scroll restoration, and jumping to a #hash.
 *  3. A safety timer forces the finished state regardless. If the observer
 *     never fires — element inside a transformed/hidden ancestor at mount, a
 *     layout change mid-animation, a very fast scroll past the trigger point —
 *     the text still resolves to fully visible.
 */
export function useInViewOnce<T extends HTMLElement>(amount = 0.25) {
  const ref = useRef<T>(null)
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (reduced) {
      setShown(true)
      return
    }
    const el = ref.current
    if (!el) return

    let done = false
    const reveal = () => {
      if (done) return
      done = true
      setShown(true)
    }

    // Already on screen (or scrolled past) at mount → show immediately.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      reveal()
      return
    }
    if (rect.bottom <= 0) {
      reveal()
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.intersectionRatio >= amount) {
          reveal()
          io.disconnect()
        }
      },
      { threshold: Math.min(amount, 0.95), rootMargin: '0px 0px -6% 0px' }
    )
    io.observe(el)

    // Last-resort completion — content is never left invisible.
    const failsafe = window.setTimeout(() => {
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight * 1.4) reveal()
    }, 2600)

    return () => {
      io.disconnect()
      window.clearTimeout(failsafe)
    }
  }, [amount, reduced])

  return { ref, shown: shown || reduced, reduced }
}
