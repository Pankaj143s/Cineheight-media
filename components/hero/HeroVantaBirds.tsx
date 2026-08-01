'use client'

import { useEffect, useRef } from 'react'

export type HeroVantaTier = 'high' | 'standard' | 'compact'

type VantaEffect = {
  destroy: () => void
  isOnScreen?: () => boolean
}

const QUALITY: Record<HeroVantaTier, Record<string, number | boolean>> = {
  high: { scale: 1, scaleMobile: 1.2, quantity: 2, birdSize: 0.65, wingSpan: 10, speedLimit: 1.5 },
  standard: { scale: 1.3, scaleMobile: 1.5, quantity: 1.6, birdSize: 0.72, wingSpan: 11, speedLimit: 1.35 },
  compact: { scale: 1.75, scaleMobile: 1.9, quantity: 1, birdSize: 0.86, wingSpan: 12, speedLimit: 1.1 },
}

/**
 * Minimal Vanta Birds WebGL field for the hero stage.
 * Client-only — mount via next/dynamic({ ssr: false }).
 */
export default function HeroVantaBirds({ tier }: { tier: HeroVantaTier }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const effectRef = useRef<VantaEffect | null>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    let cancelled = false
    let intersecting = true
    const updateState = () => {
      if (!hostRef.current) return
      hostRef.current.dataset.vantaState = intersecting && !document.hidden ? 'active' : 'paused'
    }
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        intersecting = Boolean(entry?.isIntersecting)
        updateState()
      },
      { rootMargin: '12% 0px', threshold: 0 }
    )
    visibilityObserver.observe(el)
    document.addEventListener('visibilitychange', updateState)

    ;(async () => {
      const THREE = await import('three')
      const birdsMod = await import('vanta/dist/vanta.birds.min')
      const BIRDS =
        typeof birdsMod === 'function'
          ? birdsMod
          : (birdsMod as { default: (options: Record<string, unknown>) => VantaEffect }).default

      if (cancelled || !hostRef.current) return

      effectRef.current?.destroy()
      const effect = BIRDS({
        el: hostRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        backgroundColor: 0x000000,
        // Quieter brand blues — atmosphere, not the hero focal point.
        color1: 0x0066cc,
        color2: 0x3a8fd4,
        colorMode: 'lerpGradient',
        ...QUALITY[tier],
        separation: 48,
        alignment: 22,
        cohesion: 22,
      })
      const nativeIsOnScreen = effect.isOnScreen?.bind(effect)
      effect.isOnScreen = () => intersecting && !document.hidden && (nativeIsOnScreen?.() ?? true)
      effectRef.current = effect
      updateState()
    })().catch(() => {
      // WebGL unavailable — leave solid black host.
    })

    return () => {
      cancelled = true
      visibilityObserver.disconnect()
      document.removeEventListener('visibilitychange', updateState)
      effectRef.current?.destroy()
      effectRef.current = null
    }
  }, [tier])

  return (
    <div
      ref={hostRef}
      data-vanta-tier={tier}
      data-vanta-state="loading"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      style={{ background: '#000000' }}
    />
  )
}
