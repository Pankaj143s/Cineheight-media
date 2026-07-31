'use client'

import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Deterministic PRNG (mulberry32) — a fixed seed, not `Math.random()`, so the
 * scatter is identical on every mount/remount instead of reshuffling.
 */
function mulberry32(seed: number) {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Mote {
  left: number
  top: number
  size: number
  dur: number
  delay: number
  driftX: number
  opacity: number
}

const MOTE_COUNT = 22
const MOTES: Mote[] = (() => {
  const rand = mulberry32(20260729)
  const motes: Mote[] = []
  for (let i = 0; i < MOTE_COUNT; i++) {
    // Mostly upper sky (clear of the title/cloud band), a sparser tail lower
    // for a touch of depth.
    const top = rand() < 0.7 ? 2 + rand() * 32 : 34 + rand() * 12
    motes.push({
      left: 2 + rand() * 96,
      top,
      size: 1.4 + rand() * 1.6,
      dur: 14 + rand() * 12,
      delay: -rand() * 26, // negative delay: already mid-cycle on mount, not a synchronized burst
      driftX: (rand() - 0.5) * 36,
      opacity: 0.15 + rand() * 0.2,
    })
  }
  return motes
})()

/**
 * Tiny, faint drifting sky specks behind the clouds — pure CSS animation
 * (no rAF, no JS per frame), mounted above the water ripple (whose plate is
 * opaque across the whole stage) and below the clouds/title so passing
 * clouds naturally occlude them.
 *
 * A trial effect per the user's request — reduced-motion visitors see
 * nothing (returns null), and removing this is a one-line unmount in
 * `HeroIntroSequence.tsx`.
 */
export default function HeroDustMotes() {
  const reduced = useReducedMotion()
  if (reduced) return null

  return (
    <div data-hero-dust-motes aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={
            {
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              opacity: 0,
              animation: `hero-dust-drift ${m.dur}s ease-in-out ${m.delay}s infinite`,
              '--mote-opacity': m.opacity,
              '--mote-drift-x': `${m.driftX}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
