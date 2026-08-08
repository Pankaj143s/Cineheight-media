'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'

import type { CaseStudy } from '@/content/caseStudies'
import type { CasePresentation } from '@/content/caseStudyPresentation'
import KineticLabel from '@/components/motion/KineticLabel'
import Reveal from '@/components/ui/Reveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { SCRUB } from '@/lib/motionTokens'

/**
 * Act 2 — the starting point.
 *
 * Replaces the old "Objective" and "The Story" blocks, which between them
 * repeated the tagline, restated the hook and ran to several hundred words
 * before the visitor learned what the problem actually was.
 *
 * One label, one paragraph of 35–60 words, one calm reveal. The chapter number
 * is a small edge marker rather than the 22rem outlined numeral that used to
 * sit directly behind this copy and compete with it.
 *
 * The full verified objective and description are still rendered for assistive
 * technology and remain the source of the page's metadata — they are simply not
 * shouted at a sighted visitor who is still working out the premise.
 */
export default function CaseStartingPoint({
  cs,
  presentation,
}: {
  cs: CaseStudy
  presentation: CasePresentation
}) {
  const mobile = useIsMobileTier()
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLElement>(null)

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const chapter = rootRef.current?.querySelector<HTMLElement>('[data-starting-chapter]')
    if (!chapter) return
    const tween = gsap.fromTo(
      chapter,
      { autoAlpha: 0.58, y: mobile ? 16 : 24 },
      {
        autoAlpha: 1,
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: mobile ? 'top 92%' : 'top 86%',
          end: mobile ? 'top 58%' : 'top 48%',
          scrub: SCRUB.text,
        },
      }
    )
    return () => {
      tween.revert()
    }
  }, [mobile, reduced])

  return (
    <section
      ref={rootRef}
      aria-label="The starting point"
      className="relative z-10"
      style={{ marginTop: 'calc(clamp(4rem, 14vh, 11rem) * var(--scene-gap))' }}
    >
      <div data-starting-chapter className="flow-gutter relative">
        {/* small editorial marker at the edge, not an object behind the text */}
        <span
          aria-hidden="true"
          className="font-body absolute -top-7 left-[var(--gutter)] text-[11px] text-text-500"
          style={{ letterSpacing: '0.3em' }}
        >
          01
        </span>

        <KineticLabel text="THE STARTING POINT" />

        <Reveal variant="fade-up" className="mt-7">
          <p
            className="font-display font-medium text-text-100"
            style={{
              // One step below the transformation headline: important, but
              // never a second display statement competing in the same view.
              fontSize: 'calc(clamp(1.15rem, 1.9vw, 1.75rem) * var(--display-scale))',
              lineHeight: 1.42,
              letterSpacing: '-0.012em',
              maxWidth: '52ch',
            }}
          >
            {presentation.startingPoint}
          </p>
        </Reveal>

        {/* The verified source copy stays available to assistive tech. */}
        <p className="sr-only">
          Objective: {cs.objective} {cs.description}
        </p>
      </div>

      <div
        data-flow-anchor={mobile ? 'center' : 'right'}
        className="pointer-events-none h-px"
        aria-hidden="true"
      />
    </section>
  )
}
