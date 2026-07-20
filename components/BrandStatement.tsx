'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Brand statement (spec §19) — revealed beneath the departing hero clouds.
 * Line-mask reveal + gentle scroll parallax. One restrained blue emphasis.
 * No background box, no visible section boundary.
 */
export default function BrandStatement() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    if (reduced) return

    const ctx = gsap.context((self) => {
      const lines = self.selector!('[data-line-inner]')

      gsap.fromTo(
        lines,
        { yPercent: 108 },
        {
          yPercent: 0,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top 72%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Gentle parallax while the block crosses the viewport.
      gsap.fromTo(
        self.selector!('[data-parallax]'),
        { y: 60 },
        {
          y: -60,
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      )
    }, rootRef)

    return () => ctx.revert()
  }, [reduced])

  return (
    <section
      ref={rootRef}
      aria-label="Brand statement"
      className="brand-overlap flex min-h-[92vh] items-center"
    >
      <div data-parallax className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <h2
          className="font-display m-0 font-bold text-text-100"
          style={{ fontSize: 'clamp(2.1rem, 6.2vw, 6.6rem)', lineHeight: 1.02, letterSpacing: '-0.015em' }}
        >
          <span className="block overflow-hidden">
            <span data-line-inner className="block">
              WE TURN BUSINESSES
            </span>
          </span>
          <span className="block overflow-hidden">
            <span data-line-inner className="block">
              INTO <span style={{ color: 'var(--blue-500)' }}>BRANDS.</span>
            </span>
          </span>
        </h2>

        <p
          className="font-body mt-8 max-w-xl text-base text-text-300 sm:text-lg"
          style={{ lineHeight: 1.7 }}
        >
          Strategy, design, content and campaigns built to grow visibility, trust and leads.
        </p>
      </div>
    </section>
  )
}
