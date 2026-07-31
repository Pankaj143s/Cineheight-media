'use client'

import { useReducedMotion } from '@/lib/useMediaPreferences'

interface Star {
  left: number
  top: number
  angle: number
  length: number
  dx: number
  dy: number
  dur: number
  delay: number
}

// Hand-authored, not generated — only two, so a seeded RNG would be
// overkill. Both paths stay in the clear upper sky (top 8-20%), well above
// the title/cloud band, and travel on a shallow downward diagonal.
// Movement is authored as an explicit screen-space vector (dx right, dy
// down, plain pixels) rather than derived from the bar's rotate() angle —
// composing rotate + translateX made the on-screen direction depend on
// correctly reasoning about CSS transform composition, which is exactly
// what produced the earlier "star goes up" bug even after an angle-sign
// "fix". dx/dy below are just cos/sin(angle)*travel from the old values, so
// the look is unchanged; `angle` now only sets the bar's cosmetic tilt.
const STARS: Star[] = [
  { left: 12, top: 8, angle: 22, length: 130, dx: 158, dy: 64, dur: 15, delay: -3 },
  { left: 62, top: 18, angle: 30, length: 110, dx: 130, dy: 75, dur: 19, delay: -11 },
]

/**
 * Occasional shooting stars — same "long idle cycle, short active window"
 * trick as `HeroDustMotes`, just a much smaller active fraction so each star
 * streaks by briefly instead of drifting. Three layers per star: an outer
 * span fixes position only (no transform), a middle span animates the
 * movement — `translate(dx, dy)` in plain screen pixels plus an opacity
 * fade — and an innermost span holds a STATIC `rotate(angle)` purely for the
 * bar's visual tilt. Movement no longer runs inside the rotated frame, so
 * "down" is just `dy > 0` — no CSS transform-composition reasoning required.
 *
 * A trial effect alongside the dust motes — reduced-motion visitors see
 * nothing, and removing this is a one-line unmount in `HeroIntroSequence.tsx`.
 */
export default function HeroShootingStar() {
  const reduced = useReducedMotion()
  if (reduced) return null

  return (
    <div data-hero-shooting-stars aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {STARS.map((s, i) => (
        <span key={i} className="absolute" style={{ left: `${s.left}%`, top: `${s.top}%` }}>
          <span
            className="absolute left-0 top-0"
            style={
              {
                opacity: 0,
                animation: `hero-shooting-star ${s.dur}s ease-in ${s.delay}s infinite`,
                '--star-dx': `${s.dx}px`,
                '--star-dy': `${s.dy}px`,
              } as React.CSSProperties
            }
          >
            <span
              className="absolute left-0 top-0 rounded-full"
              style={{
                width: `${s.length}px`,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 65%, #fff)',
                boxShadow: '0 0 6px 1px rgba(255,255,255,0.55)',
                transform: `rotate(${s.angle}deg)`,
              }}
            />
          </span>
        </span>
      ))}
    </div>
  )
}
