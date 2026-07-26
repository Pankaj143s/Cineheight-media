'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * A short signal sweep between routes.
 *
 * Deliberately implemented as a pathname listener mounted in the root layout
 * rather than `app/template.tsx`: a template remounts its children on every
 * navigation, which would replay the hero intro and throw away scroll
 * restoration. This overlay touches nothing but itself.
 *
 * ~520 ms total, `pointer-events: none` throughout, so it can never delay a
 * click or block the destination. Skipped entirely under reduced motion and on
 * the very first paint.
 */
export default function RouteTransition() {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const first = useRef(true)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (reduced) return
    setKey((k) => k + 1)
  }, [pathname, reduced])

  if (reduced || key === 0) return null

  return (
    <div key={key} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70]">
      {/* Dark mask wiping down and away */}
      <div
        className="absolute inset-0 origin-top"
        style={{
          background: 'linear-gradient(to bottom, rgba(2,3,6,0.96), rgba(2,3,6,0.82))',
          animation: 'route-mask 520ms cubic-bezier(0.65,0,0.35,1) forwards',
        }}
      />
      {/* The signal itself, running ahead of the mask's trailing edge */}
      <div
        className="absolute inset-x-0"
        style={{
          top: 0,
          height: 2,
          background: 'linear-gradient(to right, transparent, #0089FF 22%, #CFE8FF 50%, #0089FF 78%, transparent)',
          boxShadow: '0 0 14px 3px rgba(0,137,255,0.55)',
          animation: 'route-line 520ms cubic-bezier(0.65,0,0.35,1) forwards',
        }}
      />
    </div>
  )
}
