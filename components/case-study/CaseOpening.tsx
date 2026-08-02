'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import type { CasePresentation } from '@/content/caseStudyPresentation'
import InlineVideo from '@/components/media/InlineVideo'
import OpticalResolve from '@/components/motion/OpticalResolve'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import TrackingReveal from '@/components/motion/TrackingReveal'
import EditorialMatteReveal from '@/components/motion/EditorialMatteReveal'
import Reveal from '@/components/ui/Reveal'
import CountUp from '@/components/ui/CountUp'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { CASE_OPENING_SIGNATURE } from '@/lib/liquidMedia/tokens'
import { setSignalIntensity } from '@/lib/liquidMedia/signalIntensity'

/**
 * Act 1 — one strong opening signature per project (not a stack of effects).
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
  const signature = CASE_OPENING_SIGNATURE[cs.id] ?? 'film-gate'

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const media = self.selector!('[data-open-media]')[0]
      const type = self.selector!('[data-open-type]')[0]
      if (media) {
        gsap.fromTo(
          media,
          { scale: mobile ? 1.025 : 1.05, yPercent: mobile ? -1 : -2 },
          {
            scale: 1,
            yPercent: mobile ? 1.5 : 3,
            ease: 'none',
            scrollTrigger: {
              trigger: rootRef.current,
              start: mobile ? 'top 16%' : 'top top',
              end: mobile ? 'bottom 24%' : 'bottom top',
              scrub: mobile ? 0.75 : 1,
            },
          }
        )
      }
      if (type) {
        gsap.to(type, {
          yPercent: mobile ? -4 : -14,
          autoAlpha: mobile ? 0.78 : 0.55,
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: mobile ? 'top 12%' : 'top top',
            end: mobile ? 'bottom 28%' : 'bottom top',
            scrub: mobile ? 0.75 : 1,
          },
        })
      }

      if (rootRef.current) {
        gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top 70%',
            end: 'top 30%',
            onEnter: () => setSignalIntensity(0.55),
            onLeave: () => setSignalIntensity(0.2),
            onEnterBack: () => setSignalIntensity(0.4),
            onLeaveBack: () => setSignalIntensity(0.15),
          },
        })
      }
    }, rootRef)
    return () => {
      ctx.revert()
      setSignalIntensity(0)
    }
  }, [reduced, mobile, cs.id])

  const proof = (
    <div className="flex items-baseline gap-4">
      <p
        className="font-display font-bold leading-none text-text-100"
        style={{ fontSize: 'calc(clamp(2.6rem, 5.4vw, 5rem) * var(--display-scale))', letterSpacing: '-0.03em' }}
      >
        <CountUp value={m.value} prefix={m.prefix} suffix={m.suffix} duration={1400} />
      </p>
      <p className="font-body max-w-[12ch] text-sm leading-snug text-text-300">{m.label}</p>
    </div>
  )

  const title =
    signature === 'optical-title' ? (
      <OpticalResolve
        as="h1"
        text={presentation.transformation}
        delay={0.28}
        className="type-display-1 font-display mt-7 max-w-[15ch] font-bold uppercase text-text-100"
      />
    ) : (
      <SplitLineReveal
        as="h1"
        lines={[presentation.transformation]}
        srLabel={presentation.transformation}
        delay={0.1}
        className="type-display-1 font-display mt-7 max-w-[15ch] font-bold uppercase text-text-100"
      />
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
      {title}
      <Reveal variant="fade-up" delay={0.06} className="font-body measure mt-7 text-base leading-relaxed text-text-200">
        {presentation.supporting}
      </Reveal>
      <div className="mt-9">{proof}</div>
      <span aria-hidden="true" className="mt-8 block h-px w-24" style={{ background: cs.accentColor }} />
    </div>
  )

  const caption = (
    <p className="font-body mt-3 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.18em' }}>
      {cs.topVideo.type === 'testimonial' ? 'Client testimonial' : 'Campaign film'}
    </p>
  )

  const matteForm =
    signature === 'diagonal-media' ? 'diagonal-soft' : signature === 'film-gate' ? 'film-gate' : 'soft-iris'

  const filmInner = (
    <div data-open-media className="relative w-full will-change-transform">
      <InlineVideo
        src={cs.topVideo.src}
        poster={cs.topVideo.poster}
        label={`${cs.topVideo.title} — ${cs.client}`}
        aspect={landscape ? '16 / 9' : '1 / 1'}
      />
    </div>
  )

  const film =
    signature === 'optical-title' && !mobile ? (
      <div className="relative w-full overflow-hidden">{filmInner}</div>
    ) : (
      <EditorialMatteReveal form={mobile ? 'vertical-rise' : matteForm} start="top 90%" className="relative w-full">
        {filmInner}
      </EditorialMatteReveal>
    )

  if (mobile) {
    return (
      <section ref={rootRef} aria-label={`${cs.client} — opening`} className="relative z-10 pt-28">
        <div className="flow-gutter">{identity}</div>
        <div className="mt-8">{film}</div>
        <div className="flow-gutter">{caption}</div>
      </section>
    )
  }

  if (landscape) {
    return (
      <section ref={rootRef} aria-label={`${cs.client} — opening`} className="relative z-10 min-h-[100svh] pt-16">
        <div className="relative w-full" style={{ minHeight: 'min(94svh, 56.25vw)' }}>
          {film}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(to top, var(--bg-950) 2%, rgba(2,3,6,0.55) 42%, transparent 72%)' }}
          />
          <div className="flow-gutter absolute inset-x-0 bottom-0 pb-[5vh]">{identity}</div>
        </div>
        <div className="flow-gutter">{caption}</div>
        <div data-flow-anchor="edge-left" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    )
  }

  return (
    <section ref={rootRef} aria-label={`${cs.client} — opening`} className="relative z-10 pt-28">
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
