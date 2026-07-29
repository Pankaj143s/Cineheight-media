'use client'

import { useEffect, useState } from 'react'
import {
  useIsMobileTier,
  useIsNarrow,
  useMotionCapabilityProfile,
  useReducedMotion,
} from '@/lib/useMediaPreferences'

export type RippleTier = 'high' | 'balanced' | 'compact'

/**
 * The hero ripple's own capability gate.
 *
 * It cannot reuse `useCanRunRichEffects()`: that is driven by
 * `useMotionCapabilityProfile()`, which reports `'static'` for any coarse
 * pointer or viewport under 1024px — correct for a mouse-follower, wrong here,
 * because the water surface is meant to run on phones too (with automatic and
 * touch-triggered ripples rather than pointer-tracked ones).
 *
 * Returns `null` until it is BOTH safe and worthwhile to fetch the WebGL chunk:
 *
 *  - `prefers-reduced-motion` → always null. The parent then never imports the
 *    component, so those visitors do not download the shader code at all and
 *    the hero keeps its plain CSS gradients.
 *  - Before the first idle callback → null. The h1 is the LCP element, and
 *    compiling and linking four programs is a 5–30 ms main-thread stall in most
 *    drivers. Deferring the mount moves that stall past the paint that matters.
 *
 * Every hook below returns its SSR fallback on the first render and `ready`
 * starts false, so the server render and the first client render both yield
 * `null` — no hydration mismatch on top of the `ssr: false` dynamic import.
 */
export function useRippleTier(): RippleTier | null {
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const narrow = useIsNarrow(1023)
  const profile = useMotionCapabilityProfile()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ric = (
      window as Window & { requestIdleCallback?: typeof requestIdleCallback }
    ).requestIdleCallback
    if (ric) {
      const id = ric(() => setReady(true), { timeout: 1500 })
      return () => window.cancelIdleCallback?.(id)
    }
    const timer = window.setTimeout(() => setReady(true), 700)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready || reduced) return null
  if (mobile || narrow) return 'compact'
  // On a wide, fine-pointer viewport a 'static' profile means low cores/memory
  // or save-data — not touch — so it maps to the cheapest live tier.
  return profile.level === 'high' ? 'high' : profile.level === 'balanced' ? 'balanced' : 'compact'
}
