'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { ScrollTrigger } from '@/lib/gsap'
import { useCanRunRichEffects } from '@/lib/useMediaPreferences'
import { useParallaxField } from '@/lib/useParallaxField'
import AtmosphereLayer from './AtmosphereLayer'
import FlowThread from './FlowThread'

// The canvas field is desktop-only and purely decorative — keep it out of the
// initial bundle and off the server render entirely. The capability gate is
// checked HERE rather than inside the component so phones and low-power
// machines never even fetch the chunk.
const PointerAtmosphere = dynamic(() => import('./PointerAtmosphere'), { ssr: false })

/**
 * One per route, mounted above the page content. Owns the three global layers
 * (atmosphere, signal thread, pointer field) and the single place that tells
 * ScrollTrigger the layout has settled.
 *
 * Every component's own ScrollTriggers would otherwise each schedule their own
 * refresh after fonts and media load; centralising it here means one refresh
 * pass instead of a dozen competing ones.
 */
export default function FlowDirector({ accent }: { accent?: string }) {
  const rich = useCanRunRichEffects()

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
      {rich && <PointerAtmosphere />}
      <FlowThread />
    </>
  )
}
