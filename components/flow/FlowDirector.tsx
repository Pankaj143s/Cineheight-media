'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { ScrollTrigger } from '@/lib/gsap'
import { useCursorTrailEnabled } from '@/lib/useMediaPreferences'
import { useParallaxField } from '@/lib/useParallaxField'
import AtmosphereLayer from './AtmosphereLayer'
import FlowThread from './FlowThread'

// The cursor is desktop-only and purely decorative — keep it out of the initial
// bundle and off the server render entirely. The capability gate is checked
// HERE rather than inside the component so touch devices never even fetch the
// chunk.
const CursorTrail = dynamic(() => import('./CursorTrail'), { ssr: false })

/**
 * One per route, mounted above the page content. Owns the three global layers
 * (static atmosphere, signal thread, cursor) and the single place that tells
 * ScrollTrigger the layout has settled.
 *
 * Every component's own ScrollTriggers would otherwise each schedule their own
 * refresh after fonts and media load; centralising it here means one refresh
 * pass instead of a dozen competing ones.
 */
export default function FlowDirector({ accent }: { accent?: string }) {
  const cursor = useCursorTrailEnabled()

  useParallaxField()

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh()
    }

    // Fonts change every measured text block; media changes section heights.
    document.fonts?.ready.then(refresh).catch(() => {})
    const t1 = window.setTimeout(refresh, 400)
    const t2 = window.setTimeout(refresh, 1400)
    window.addEventListener('load', refresh)

    return () => {
      cancelled = true
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('load', refresh)
    }
  }, [])

  return (
    <>
      <AtmosphereLayer accent={accent} />
      {cursor && <CursorTrail />}
      <FlowThread />
    </>
  )
}
