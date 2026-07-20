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

/** Coarse pointer OR narrow viewport — the "simplified motion" tier (spec §35). */
export function useIsMobileTier(): boolean {
  return useMediaQuery('(max-width: 767px), (pointer: coarse)')
}
