'use client'

import { useRef } from 'react'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Legacy name kept for any stray imports. Scroll reveals now use
 * `useScrollScrub` — this only exposes reduced-motion + a stable ref so
 * content can render in its finished state without an observer gate.
 */
export function useInViewOnce<T extends HTMLElement>(_amount = 0.25) {
  const ref = useRef<T>(null)
  const reduced = useReducedMotion()
  return { ref, shown: true as boolean, reduced }
}
