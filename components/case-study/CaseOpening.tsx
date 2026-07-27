'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import type { CasePresentation } from '@/content/caseStudyPresentation'
import InlineVideo from '@/components/media/InlineVideo'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import TrackingReveal from '@/components/motion/TrackingReveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Act 1 — the transformation.
 *
 * Deliberately holds ONE display statement, one supporting line and ONE proof.
 * The previous opening also carried the objective, the hook and several labels
 * around the film, so the visitor met five competing pieces of text before
 * learning what changed.
 *
 * Everything else — the full objective, the description, the complete stats —
 * still exists in `content/caseStudies.ts` and is used further down the page
 * and in metadata; it is simply not all shouted at once here.
 */
export default function CaseOpening({
  cs,
  presentation,
}: {
  cs: CaseStudy
  presentation: CasePresentation
}) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const landscape = cs.topVideo.orientation === 'landscape'
  const m = presentation.primaryMetric

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const media = self.selector!('[data-open-media]')[0]
      const type = self.selector!('[data-open-type]')[0]
      if (media) {
        gsap.fromTo(
          media,
          { scale: 1.06, yPercent: -2 },
          {
            scale: 1,
            yPercent: 4,
            ease: 'none',
            scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom top', scrub: 1 },
          }
        )
      }
      if (type && !mobile) {
        gsap.to(type, {
          yPercent: -22,
          autoAlpha: 0.4,
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom top', scrub: 1 },
        })
      }
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  /** The single proof, sized to sit beside the statement without competing. */
  const proof = (
    <div className="flex items-baseline gap-4">
      <p
        className="font-display font-bold leading-none text-text-100"
        style={{ fontSize: 'calc(clamp(2.6rem, 5.4vw, 5rem) * var(--display-scale))', letterSpacing: '-0.03em' }}
      >
        {m.prefix}
        {m.value}
        <span style={{ color: 'var(--blue-500)' }}>{m.suffix}</span>
      </p>
      <p className="font-body max-w-[12ch] text-sm leading-snug text-text-300">{m.label}</p>
    </div>
  )

  const identity = (
    <div data-open-type className="relative z-10">
      <TrackingReveal
        as="p"
        className="font-display text-[11px] font-medium uppercase text-text-300"
        from="0.5em"
        to="0.3em"
      >
        {cs.client}
      </TrackingReveal>
      <p className="font-body mt-2 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.18em' }}>
        {cs.category} — {cs.year}
      </p>

      <SplitLineReveal
        as="h1"
        lines={[presentation.transformation]}
        srLabel={presentation.transformation}
        delay={0.1}
        className="type-display-1 font-display mt-7 max-w-[15ch] font-bold uppercase text-text-100"
      />

      <p className="font-body measure mt-7 text-base leading-relaxed text-text-200">
        {presentation.supporting}
      </p>

      <div className="mt-9">{proof}</div>
      <span aria-hidden="true" className="mt-8 block h-px w-24" style={{ background: cs.accentColor }} />
    </div>
  )

  const caption = (
    <p className="font-body mt-3 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.18em' }}>
      {cs.topVideo.type === 'testimonial' ? 'Client testimonial' : 'Campaign film'}
    </p>
  )

  // The parallax scale lives inside an overflow-hidden wrapper so it can never
  // push past the viewport, and the caption stays outside it.
  const film = (
    <div className="relative w-full overflow-hidden">
      <div data-open-media className="relative w-full will-change-transform">
        <InlineVideo
          src={cs.topVideo.src}
          poster={cs.topVideo.poster}
          label={`${cs.topVideo.title} — ${cs.client}`}
          aspect={landscape ? '16 / 9' : '1 / 1'}
        />
      </div>
    </div>
  )

  if (mobile) {
    return (
      <section ref={rootRef} aria-label={`${cs.client} — opening`} className="relative z-10 pt-28">
        <div className="flow-gutter">{identity}</div>
        <div className="mt-10">{film}</div>
        <div className="flow-gutter">{caption}</div>
      </section>
    )
  }

  if (landscape) {
    return (
      <section ref={rootRef} aria-label={`${cs.client} — opening`} className="relative z-10 pt-24">
        <div className="relative mx-auto max-w-[1820px]" style={{ width: '96%' }}>
          {film}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(to top, var(--bg-950) 1%, rgba(2,3,6,0.6) 38%, transparent 68%)' }}
          />
          <div className="flow-gutter absolute inset-x-0 bottom-0 pb-[5vh]">{identity}</div>
        </div>
        <div className="flow-gutter">{caption}</div>
        <div data-flow-anchor="edge-left" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    )
  }

  return (
    <section ref={rootRef} aria-label={`${cs.client} — opening`} className="relative z-10 pt-32">
      <div className="flow-gutter grid grid-cols-12 items-center gap-x-10">
        <div className="col-span-6">{identity}</div>
        <div className="col-span-6 col-start-7 lg:col-span-5 lg:col-start-8">
          {film}
          {caption}
        </div>
      </div>
      <div data-flow-anchor="edge-left" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
