'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import InlineVideo from '@/components/media/InlineVideo'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import TrackingReveal from '@/components/motion/TrackingReveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The project's opening scene — identity and primary film as ONE composition
 * rather than a page header followed by a video rectangle.
 *
 * The layout adapts to the film's real orientation: a landscape film runs
 * near-full-bleed with the identity type overlaid on its lower field; a square
 * film sits offset while the type occupies the space beside it. Both put the
 * client name, category, year, tagline and hook *around* the media.
 */
export default function CaseOpening({ cs }: { cs: CaseStudy }) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const landscape = cs.topVideo.orientation === 'landscape'

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
          yPercent: -28,
          autoAlpha: 0.35,
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom top', scrub: 1 },
        })
      }
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

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
        lines={cs.tagline.split(' ').reduce<string[][]>((rows, word, i, all) => {
          // Two balanced lines, broken near the middle word.
          const mid = Math.ceil(all.length / 2)
          if (i < mid) (rows[0] ??= []).push(word)
          else (rows[1] ??= []).push(word)
          return rows
        }, []).map((row) => row.join(' '))}
        srLabel={cs.tagline}
        delay={0.12}
        className="font-display mt-7 max-w-[16ch] font-bold text-text-100"
        style={{ fontSize: 'clamp(2rem, 5.4vw, 5rem)', lineHeight: 0.96, letterSpacing: '-0.03em' }}
      />
      <p className="font-body measure mt-7 text-base leading-relaxed text-text-300">{cs.hook}</p>
      <span aria-hidden="true" className="mt-9 block h-px w-24" style={{ background: cs.accentColor }} />
    </div>
  )

  // SES's film is titled "Campaign Film", which is also its kind — don't print
  // the same words twice.
  const kind = cs.topVideo.type === 'testimonial' ? 'Client testimonial' : 'Campaign film'
  const captionText =
    cs.topVideo.title.toLowerCase() === kind.toLowerCase() ? kind : `${kind} — ${cs.topVideo.title}`

  const caption = (
    <p className="font-body mt-3 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.18em' }}>
      {captionText}
    </p>
  )

  // The parallax scale lives on the frame INSIDE an overflow-hidden wrapper, so
  // it can never push past the viewport, and the caption stays outside it —
  // scaled type would blur and drift off the gutter.
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
    // Near-full-bleed film with the identity riding over its lower-left field.
    return (
      <section ref={rootRef} aria-label={`${cs.client} — opening`} className="relative z-10 pt-24">
        <div className="relative mx-auto max-w-[1820px]" style={{ width: '96%' }}>
          {film}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(to top, var(--bg-950) 1%, rgba(2,3,6,0.55) 34%, transparent 66%)' }}
          />
          <div className="flow-gutter absolute inset-x-0 bottom-0 pb-[6vh]">{identity}</div>
        </div>
        <div className="flow-gutter">{caption}</div>
        <div data-flow-anchor="edge-left" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    )
  }

  // Square film: offset right, identity holding the left field.
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
