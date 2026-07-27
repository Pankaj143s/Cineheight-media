'use client'

import { useEffect, useState } from 'react'

export type MotionCapabilityLevel = 'high' | 'balanced' | 'static'

export interface MotionCapabilityProfile {
  level: MotionCapabilityLevel
  interactive: boolean
  canvasDprCap: number
  contourPointCount: number
  trailPointCount: number
}

const STATIC_MOTION_PROFILE: MotionCapabilityProfile = {
  level: 'static',
  interactive: false,
  canvasDprCap: 1,
  contourPointCount: 0,
  trailPointCount: 0,
}

const BALANCED_MOTION_PROFILE: MotionCapabilityProfile = {
  level: 'balanced',
  interactive: true,
  canvasDprCap: 1.25,
  contourPointCount: 21,
  trailPointCount: 12,
}

const HIGH_MOTION_PROFILE: MotionCapabilityProfile = {
  level: 'high',
  interactive: true,
  canvasDprCap: 1.5,
  contourPointCount: 25,
  trailPointCount: 14,
}

/** SSR-safe media-query hook. Returns `fallback` until mounted. */
function useMediaQuery(query: string, fallback = false): boolean {
  const [matches, setMatches] = useState(fallback)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])

  return matches
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** Width-only check — use for LAYOUT variants (a touch laptop still gets the
 *  desktop layout; pointer-capture drag covers its touch input). */
export function useIsNarrow(maxPx = 899): boolean {
  return useMediaQuery(`(max-width: ${maxPx}px)`)
}

/** Coarse pointer OR narrow viewport — the "simplified motion" tier (spec §35). */
export function useIsMobileTier(): boolean {
  return useMediaQuery('(max-width: 767px), (pointer: coarse)')
}

/** True only for a real mouse/trackpad — gates every hover/pointer flourish. */
export function useIsFinePointer(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)')
}

/**
 * The tier that may run the expensive extras (canvas pointer field, ring blur):
 * fine pointer, wide viewport, motion allowed and a machine with some headroom.
 * Returns false until mounted, so the heavy path is always opt-in.
 */
export function useCanRunRichEffects(): boolean {
  return useMotionCapabilityProfile().interactive
}

/**
 * Rendering precision for decorative motion. Lower tiers retain the same
 * composition and interactions, but spend fewer pixels and curve samples.
 * Static is the existing touch/reduced-motion/low-power fallback.
 */
export function useMotionCapabilityProfile(): MotionCapabilityProfile {
  const fine = useIsFinePointer()
  const reduced = useReducedMotion()
  const narrow = useIsNarrow(1023)
  const [level, setLevel] = useState<MotionCapabilityLevel>('static')

  useEffect(() => {
    if (!fine || reduced || narrow) {
      setLevel('static')
      return
    }

    const cores = navigator.hardwareConcurrency ?? 8
    // `deviceMemory` is Chromium-only; absence is treated as "enough".
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
    const high = cores >= 8 && mem >= 8 && !saveData
    setLevel(cores > 4 && mem >= 4 ? (high ? 'high' : 'balanced') : 'static')
  }, [fine, reduced, narrow])

  if (level === 'high') return HIGH_MOTION_PROFILE
  if (level === 'balanced') return BALANCED_MOTION_PROFILE
  return STATIC_MOTION_PROFILE
}
