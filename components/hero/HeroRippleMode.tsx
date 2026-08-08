'use client'

import HeroRippleBackground from './HeroRippleBackground'
import { useRippleTier } from '@/lib/useRippleTier'

export default function HeroRippleMode() {
  const tier = useRippleTier()

  return (
    <div
      data-ripple-mode
      data-ripple-state={tier ? 'active' : 'idle'}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
    >
      {tier ? <HeroRippleBackground tier={tier} /> : null}
    </div>
  )
}