'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import type { CasePresentation } from '@/content/caseStudyPresentation'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Act 3 — what Cineheight changed, as three strategic moves.
 *
 * The old version rendered the four or five verified `approach` paragraphs at
 * equal weight, alternating alignment. They were all true and all the same
 * size, so nothing led and the eye had no route through them.
 *
 * Three moves, each with a short active title and one sentence. They reveal in
 * sequence — the eye is led from one to the next rather than all three
 * arriving together. The complete verified approach list stays available to
 * assistive technology.
 */
export default function CaseStrategy({
  cs,
  presentation,
}: {
  cs: CaseStudy
  presentation: CasePresentation
}) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const moves = self.selector!('[data-move]') as HTMLElement[]
      moves.forEach((move, i) => {
        // Each move has its own trigger, so they arrive one at a time as the
        // reader reaches them — never a simultaneous three-up animation.
        gsap.fromTo(
          move.querySelectorAll('[data-move-part]'),
          { autoAlpha: 0, y: 26 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.09,
            ease: 'power3.out',
            scrollTrigger: { trigger: move, start: 'top 82%' },
          }
        )
        const rule = move.querySelector('[data-move-rule]')
        if (rule) {
          gsap.fromTo(
            rule,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.9,
              ease: 'power2.out',
              delay: 0.1,
              scrollTrigger: { trigger: move, start: 'top 82%' },
            }
          )
        }
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section
      ref={rootRef}
      aria-label="What we changed"
      className="relative z-10"
      style={{ marginTop: 'calc(clamp(4rem, 14vh, 11rem) * var(--scene-gap))' }}
    >
      <div className="flow-gutter relative">
        <span
          aria-hidden="true"
          className="font-body absolute -top-7 left-[var(--gutter)] text-[11px] text-text-500"
          style={{ letterSpacing: '0.3em' }}
        >
          02
        </span>
        <KineticLabel text="WHAT WE CHANGED" />
        <SplitLineReveal
          as="h2"
          lines={['Three moves.']}
          srLabel="Three moves."
          className="type-display-2 font-display mt-6 font-bold uppercase text-text-100"
        />
      </div>

      <ol className="flow-gutter mt-12 sm:mt-16">
        {presentation.strategyMoves.map((move, i) => (
          <li
            key={move.title}
            data-move
            className="relative list-none"
            style={{ paddingBlock: mobile ? '2.25rem' : 'clamp(2rem, 4.5vh, 3.25rem)' }}
          >
            <span
              aria-hidden="true"
              data-move-rule
              className="absolute left-0 top-0 h-px w-full origin-left"
              style={{
                background: `linear-gradient(to right, ${cs.accentColor}, rgba(255,255,255,0.04) 62%)`,
                opacity: 0.5,
              }}
            />
            <div className="flex flex-col gap-x-12 gap-y-4 lg:flex-row lg:items-baseline">
              <span
                data-move-part
                className="font-display shrink-0 text-[12px] font-medium lg:w-16"
                style={{ letterSpacing: '0.28em', color: 'var(--blue-400)', opacity: reduced ? 1 : undefined }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3
                data-move-part
                className="font-display shrink-0 font-bold uppercase text-text-100 lg:w-[min(22rem,30%)]"
                style={{
                  fontSize: 'calc(clamp(1.35rem, 2.4vw, 2.2rem) * var(--display-scale))',
                  lineHeight: 1.04,
                  letterSpacing: '-0.02em',
                  opacity: reduced ? 1 : undefined,
                }}
              >
                {move.title}
              </h3>
              <p
                data-move-part
                className="font-body text-[15px] leading-relaxed text-text-300 sm:text-base"
                style={{ maxWidth: '52ch', opacity: reduced ? 1 : undefined }}
              >
                {move.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* The complete verified approach remains available, unshortened. */}
      <ul className="sr-only">
        {cs.approach.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <div data-flow-anchor="left" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
