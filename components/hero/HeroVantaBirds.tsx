'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/useMediaPreferences'

type VantaEffect = { destroy: () => void }

/**
 * Minimal Vanta Birds WebGL field for the hero stage.
 * Client-only — mount via next/dynamic({ ssr: false }).
 */
export default function HeroVantaBirds() {
  const hostRef = useRef<HTMLDivElement>(null)
  const effectRef = useRef<VantaEffect | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const el = hostRef.current
    if (!el) return

    let cancelled = false

    ;(async () => {
      const THREE = await import('three')
      const birdsMod = await import('vanta/dist/vanta.birds.min')
      const BIRDS = (birdsMod as { default?: typeof birdsMod }).default ?? birdsMod

      if (cancelled || !hostRef.current) return

      effectRef.current?.destroy()
      effectRef.current = BIRDS({
        el: hostRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
        backgroundColor: 0x000000,
        // Quieter brand blues — atmosphere, not the hero focal point.
        color1: 0x0066cc,
        color2: 0x3a8fd4,
        colorMode: 'lerpGradient',
        quantity: 2,
        birdSize: 0.65,
        wingSpan: 10,
        speedLimit: 1.5,
        separation: 48,
        alignment: 22,
        cohesion: 22,
      })
    })().catch(() => {
      // WebGL unavailable — leave solid black host.
    })

    return () => {
      cancelled = true
      effectRef.current?.destroy()
      effectRef.current = null
    }
  }, [reduced])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      style={{ background: '#000000' }}
    />
  )
}
