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
    let refreshFrame = 0
    let releaseFrame = 0
    let refreshing = false
    let pendingReason = ''
    const main = document.querySelector<HTMLElement>('main.layer-content, main')

    const refresh = (reason: string) => {
      if (cancelled) return
      pendingReason = reason
      if (refreshFrame) return
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0
        if (document.body.hasAttribute('aria-busy')) return
        refreshing = true
        ScrollTrigger.refresh()
        if (main) {
          const count = Number(main.dataset.flowRefreshCount ?? 0) + 1
          main.dataset.flowRefreshCount = String(count)
          main.dataset.flowRefreshReason = pendingReason
        }
        releaseFrame = requestAnimationFrame(() => {
          refreshing = false
        })
      })
    }

    // Fonts change every measured text block; media changes section heights.
    document.fonts?.ready.then(() => refresh('fonts')).catch(() => {})
    const t1 = window.setTimeout(() => refresh('settle-400'), 400)
    const t2 = window.setTimeout(() => refresh('settle-1400'), 1400)
    const onLoad = () => refresh('window-load')
    const onMediaSettled = (event: Event) => {
      const target = event.target
      if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) refresh('media')
    }
    window.addEventListener('load', onLoad)
    main?.addEventListener('load', onMediaSettled, true)
    main?.addEventListener('loadedmetadata', onMediaSettled, true)

    let lastWidth = main?.getBoundingClientRect().width ?? 0
    let lastHeight = main?.getBoundingClientRect().height ?? 0
    const resizeObserver = main && 'ResizeObserver' in window
      ? new ResizeObserver(([entry]) => {
          if (!entry || refreshing) return
          const { width, height } = entry.contentRect
          if (Math.abs(width - lastWidth) < 1 && Math.abs(height - lastHeight) < 1) return
          lastWidth = width
          lastHeight = height
          refresh('geometry')
        })
      : null
    if (main && resizeObserver) resizeObserver.observe(main)

    const busyObserver = new MutationObserver(() => {
      if (!document.body.hasAttribute('aria-busy') && pendingReason) refresh('route-settled')
    })
    busyObserver.observe(document.body, { attributes: true, attributeFilter: ['aria-busy'] })

    return () => {
      cancelled = true
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      cancelAnimationFrame(refreshFrame)
      cancelAnimationFrame(releaseFrame)
      resizeObserver?.disconnect()
      busyObserver.disconnect()
      window.removeEventListener('load', onLoad)
      main?.removeEventListener('load', onMediaSettled, true)
      main?.removeEventListener('loadedmetadata', onMediaSettled, true)
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
