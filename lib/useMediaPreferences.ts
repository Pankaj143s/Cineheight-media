'use client'

import { useEffect, useState } from 'react'

export type MotionCapabilityLevel = 'high' | 'balanced' | 'compact'

export interface MotionCapabilityProfile {
  level: MotionCapabilityLevel
  interactive: boolean
  canvasDprCap: number
  /** Samples in the cursor trail's ring buffer. */
  trailPointCount: number
}

const COMPACT_MOTION_PROFILE: MotionCapabilityProfile = {
  level: 'compact',
  interactive: false,
  canvasDprCap: 1,
  trailPointCount: 12,
}

const BALANCED_MOTION_PROFILE: MotionCapabilityProfile = {
  level: 'balanced',
  interactive: true,
  canvasDprCap: 1.25,
  trailPointCount: 16,
}

const HIGH_MOTION_PROFILE: MotionCapabilityProfile = {
  level: 'high',
  interactive: true,
  canvasDprCap: 1.5,
  trailPointCount: 20,
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

/**
 * Like {@link useMediaQuery}, but also reports whether the real match has been
 * read on the client. Until `ready` is true, consumers must not assume the
 * fallback is authoritative (CountUp uses this to avoid zeroing a figure before
 * it knows reduced-motion is off).
 */
function useMediaQueryReady(query: string, fallback = false): { matches: boolean; ready: boolean } {
  const [matches, setMatches] = useState(fallback)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    setReady(true)
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])

  return { matches, ready }
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** Reduced-motion preference plus a client-ready flag for animation gates. */
export function useReducedMotionState(): { reduced: boolean; ready: boolean } {
  const { matches, ready } = useMediaQueryReady('(prefers-reduced-motion: reduce)')
  return { reduced: matches, ready }
}

/** Width-only check — use for LAYOUT variants (a touch laptop still gets the
 *  desktop layout; pointer-capture drag covers its touch input). */
export function useIsNarrow(maxPx = 899): boolean {
  return useMediaQuery(`(max-width: ${maxPx}px)`)
}

/** Width-only phone layout. Pointer capability must never select page layout. */
export function useIsMobileLayout(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/** @deprecated Prefer `useIsMobileLayout()` for layout decisions. */
export function useIsMobileTier(): boolean {
  return useIsMobileLayout()
}

/** True only for a real mouse/trackpad — gates every hover/pointer flourish. */
export function useIsFinePointer(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)')
}

/**
 * The tier that may run the expensive extras (scene pointer lean, ring blur):
 * fine pointer, wide viewport, motion allowed and a machine with some headroom.
 * Returns false until mounted, so the heavy path is always opt-in.
 */
export function useCanRunRichEffects(): boolean {
  const fine = useIsFinePointer()
  const reduced = useReducedMotion()
  const narrow = useIsNarrow(1023)
  const profile = useMotionCapabilityProfile()
  return fine && !reduced && !narrow && profile.level !== 'compact'
}

/** Scroll-linked CSS/GSAP choreography is available on phones and touch. */
export function useScrollMotionEnabled(): boolean {
  const { reduced, ready } = useReducedMotionState()
  return ready && !reduced
}

/**
 * Gate for the custom cursor and its trail.
 *
 * Deliberately looser than {@link useCanRunRichEffects}: a dot plus a ~14-point
 * polyline costs a fraction of what the retired contour field did, so the
 * hardware-headroom test would only hide the cursor on ordinary laptops that
 * can render it comfortably. What genuinely matters is that there is a real
 * mouse, that motion is allowed, and that we are not on a phone-sized viewport.
 */
export function useCursorTrailEnabled(): boolean {
  const fine = useIsFinePointer()
  const reduced = useReducedMotion()
  const narrow = useIsNarrow(1023)
  return fine && !reduced && !narrow
}

/**
 * Rendering precision for expensive decorative effects. Pointer type,
 * viewport layout and reduced motion are deliberately not inputs: those are
 * separate policy decisions owned by their dedicated hooks.
 */
export function useMotionCapabilityProfile(): MotionCapabilityProfile {
  const [level, setLevel] = useState<MotionCapabilityLevel>('compact')

  useEffect(() => {
    const update = () => {
      const cores = navigator.hardwareConcurrency ?? 8
      const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
      const saveData =
        (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
      const renderPixels =
        window.innerWidth * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2)

      if (saveData || cores <= 4 || mem <= 4 || renderPixels > 5_000_000) {
        setLevel('compact')
      } else if (cores >= 8 && mem >= 8 && renderPixels <= 3_500_000) {
        setLevel('high')
      } else {
        setLevel('balanced')
      }
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (level === 'high') return HIGH_MOTION_PROFILE
  if (level === 'balanced') return BALANCED_MOTION_PROFILE
  return COMPACT_MOTION_PROFILE
}
