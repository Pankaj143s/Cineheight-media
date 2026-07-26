'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import KineticLabel from '@/components/motion/KineticLabel'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Objective → story → approach as one editorial sequence.
 *
 * No cards, no rule above every approach item, no returning to a centred
 * max-width block for each beat. Instead: oversized outlined chapter numerals
 * sitting behind the copy, an oversized keyword pulled out of each chapter,
 * text that drifts at different rates, and approach steps that alternate their
 * alignment so the eye keeps travelling instead of resetting.
 */
export default function CaseNarrative({ cs }: { cs: CaseStudy }) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      // Numerals drift slower than the copy — the page gains depth without a
      // single background image.
      const numerals = self.selector!('[data-numeral]') as HTMLElement[]
      numerals.forEach((n) => {
        gsap.fromTo(
          n,
          { yPercent: 30, autoAlpha: 0 },
          {
            yPercent: -30,
            autoAlpha: 1,
            ease: 'none',
            scrollTrigger: { trigger: n.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1.5 },
          }
        )
      })

      // The offset is applied to the inner measure block, never to the
      // full-width <li> — a 44 px slide on a full-width row would push past
      // the viewport for as long as the step is waiting to be triggered.
      const steps = self.selector!('[data-approach-inner]') as HTMLElement[]
      steps.forEach((inner, i) => {
        gsap.fromTo(
          inner,
          { autoAlpha: 0, x: mobile ? 0 : i % 2 === 0 ? -44 : 44, y: 30 },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: inner, start: 'top 84%' },
          }
        )
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  return (
    <section ref={rootRef} aria-label="The work" className="relative z-10" style={{ marginTop: mobile ? '10vh' : '14vh' }}>
      {/* ---------- 01 · the objective ---------- */}
      <div className="relative">
        <span
          data-numeral
          aria-hidden="true"
          className="chapter-numeral pointer-events-none absolute select-none"
          style={{ fontSize: 'clamp(9rem, 26vw, 22rem)', left: '-0.05em', top: '-0.24em' }}
        >
          01
        </span>
        <div className="flow-gutter relative">
          <KineticLabel text="THE OBJECTIVE" />
          <p
            className="font-display measure-wide mt-7 font-bold text-text-100"
            style={{ fontSize: 'clamp(1.3rem, 2.4vw, 2.3rem)', lineHeight: 1.24, letterSpacing: '-0.015em' }}
          >
            {cs.objective}
          </p>
        </div>
      </div>

      {/* ---------- 02 · the story ---------- */}
      <div className="relative" style={{ marginTop: mobile ? '12vh' : '18vh' }}>
        <span
          data-numeral
          aria-hidden="true"
          className="chapter-numeral pointer-events-none absolute select-none"
          style={{ fontSize: 'clamp(9rem, 26vw, 22rem)', right: '-0.05em', top: '-0.28em' }}
        >
          02
        </span>
        <div className="flow-gutter relative grid grid-cols-1 gap-x-14 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <KineticLabel text="THE STORY" />
            <ScrollHeadline
              as="p"
              text={cs.tagline}
              className="font-display mt-6 font-bold text-text-100"
              style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.4rem)', lineHeight: 1.06, letterSpacing: '-0.02em' }}
              from={0.2}
            />
          </div>
          <p className="font-body measure-wide text-base leading-relaxed text-text-300 lg:col-span-7 lg:col-start-6 lg:pt-[6vh] sm:text-lg">
            {cs.description}
          </p>
        </div>
      </div>

      {/* ---------- 03 · the approach ---------- */}
      <div className="relative" style={{ marginTop: mobile ? '12vh' : '18vh' }}>
        <span
          data-numeral
          aria-hidden="true"
          className="chapter-numeral pointer-events-none absolute select-none"
          style={{ fontSize: 'clamp(9rem, 26vw, 22rem)', left: '30%', top: '-0.26em' }}
        >
          03
        </span>
        <div className="flow-gutter relative">
          <KineticLabel text="THE APPROACH" />
        </div>
        <ol className="relative mt-10">
          {cs.approach.map((stepText, i) => (
            <li
              key={stepText}
              data-approach-step
              className="flow-gutter list-none"
              style={{
                // Steps alternate side and overlap vertically — a travelling
                // sequence, not a bordered list.
                marginTop: i === 0 ? 0 : mobile ? '2.5rem' : '-1.5rem',
                paddingTop: mobile ? 0 : '4.5vh',
                opacity: reduced ? 1 : undefined,
              }}
            >
              <div
                data-approach-inner
                className={mobile ? '' : i % 2 === 0 ? 'max-w-[46ch]' : 'ml-auto max-w-[46ch] text-right'}
              >
                <span
                  aria-hidden="true"
                  className="font-display block text-sm font-medium"
                  style={{ color: cs.accentColor, letterSpacing: '0.24em' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="font-body mt-3 text-[16px] leading-relaxed text-text-200 sm:text-lg">{stepText}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div data-flow-anchor="right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '30%' }} aria-hidden="true" />
      <div data-flow-anchor="left" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '76%' }} aria-hidden="true" />
    </section>
  )
}
