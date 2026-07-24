'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { about } from '@/content/siteContent'
import Reveal from '@/components/ui/Reveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * About / one-team positioning (spec §20) — an asymmetrical, typography-led
 * editorial composition. No stock or generated team imagery: the statement IS
 * the visual, with a restrained parallax offset between the two text columns
 * and the verified capability chips as supporting rhythm.
 */
export default function AboutSection() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  // Two columns drift at slightly different rates — quiet depth, no media.
  useLayoutEffect(() => {
    if (reduced || mobile) return
    const ctx = gsap.context((self) => {
      const lead = self.selector!('[data-about-lead]')[0]
      const side = self.selector!('[data-about-side]')[0]
      if (!lead || !side) return
      gsap.fromTo(lead, { y: 26 }, { y: -26, ease: 'none', scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'bottom top', scrub: 1 } })
      gsap.fromTo(side, { y: 64 }, { y: -12, ease: 'none', scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'bottom top', scrub: 1 } })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  return (
    <section ref={rootRef} id="about" aria-label="About Cineheight" className="relative pb-[16vh]">
      <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* lead statement — offset left, dominant */}
          <div data-about-lead className="lg:col-span-8">
            <Reveal variant="fade-up">
              <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
                About
              </span>
              <h2
                className="font-display mt-6 font-bold text-text-100"
                style={{ fontSize: 'clamp(2rem, 4.6vw, 4.4rem)', lineHeight: 1.04, letterSpacing: '-0.015em' }}
              >
                Everything a brand needs.
                <br />
                <span style={{ color: 'var(--blue-500)' }}>One team.</span>
              </h2>
            </Reveal>
            <Reveal variant="fade-up" delay={0.15} className="mt-8">
              <p className="font-body max-w-xl text-base leading-relaxed text-text-300 sm:text-lg">{about.supporting}</p>
            </Reveal>
          </div>

          {/* supporting column — starts lower, drifts slower (asymmetry) */}
          <div data-about-side className="lg:col-span-4 lg:pt-[18vh]">
            <Reveal variant="fade-up" delay={0.1}>
              <p className="font-body text-sm leading-relaxed text-text-300">{about.journey}</p>
            </Reveal>
            <ul className="mt-10 flex flex-col gap-0" aria-label="What we bring">
              {about.capabilities.map((cap, i) => (
                <Reveal
                  key={cap}
                  as="li"
                  variant="fade-up"
                  delay={0.15 + i * 0.08}
                  className="flex list-none items-center gap-4 border-b py-4"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span aria-hidden="true" className="h-1 w-1 rounded-full" style={{ background: 'var(--blue-500)' }} />
                  <span className="font-display text-sm font-medium text-text-200" style={{ letterSpacing: '0.06em' }}>
                    {cap}
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
