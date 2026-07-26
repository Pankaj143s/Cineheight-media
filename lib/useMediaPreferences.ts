'use client'

import { useEffect, useState } from 'react'

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
  const fine = useIsFinePointer()
  const reduced = useReducedMotion()
  const narrow = useIsNarrow(1023)
  const [capable, setCapable] = useState(false)

  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 8
    // `deviceMemory` is Chromium-only; absence is treated as "enough".
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
    setCapable(cores > 4 && mem >= 4)
  }, [])

  return capable && fine && !reduced && !narrow
}
