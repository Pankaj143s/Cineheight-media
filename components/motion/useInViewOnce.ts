'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Fire-once visibility gate shared by the typography reveals.
 * Under reduced motion it reports `true` on the first render so the completed
 * text is painted immediately — never a hidden element waiting on an observer.
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
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.intersectionRatio >= amount) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: Math.min(amount, 0.95), rootMargin: '0px 0px -6% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [amount, reduced])

  return { ref, shown: shown || reduced, reduced }
}
