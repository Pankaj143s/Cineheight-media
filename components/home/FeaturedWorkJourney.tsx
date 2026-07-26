'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { useActiveVideo } from '@/lib/useActiveVideo'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The work sequence — ONE journey through the three real projects, not three
 * case-study articles stacked with gaps between them.
 *
 * Desktop: a semi-sticky media stage that the projects pass *through*. The
 * opening statement is the sequence's first frame, then each project's media
 * takes over the stage while its text enters from a different spatial position,
 * and the stage itself travels left → right → full bleed. Each project begins
 * before the previous has finished leaving.
 *
 * The pin is CSS `position: sticky`, not `ScrollTrigger.pin`: no pin-spacer to
 * fight with Lenis, no scroll-position rewriting, and it degrades to ordinary
 * scrolling the moment the sticky rule is dropped on the mobile tier.
 *
 * This is the ONLY long pinned sequence on the homepage.
 */

const [sapale, ses, divija] = caseStudies
const PROJECTS = [sapale, ses, divija]

/* Each project's stage geometry — the frame travels rather than repeating. */
const STAGE_POSE = [
  { x: '-16%', y: '0%', w: '46vw', ratio: '1 / 1' },
  { x: '18%', y: '-3%', w: '42vw', ratio: '1 / 1' },
  { x: '0%', y: '0%', w: '92vw', ratio: '16 / 9' },
]

function StageVideo({
  src,
  poster,
  label,
  active,
}: {
  src: string
  poster: string
  label: string
  active: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useActiveVideo(videoRef, { enabled: active, playAt: 0.35, pauseAt: 0.1 })
  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full object-cover"
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      tabIndex={-1}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}

function ProjectText({
  cs,
  index,
}: {
  cs: (typeof caseStudies)[number]
  index: number
}) {
  return (
    <>
      <div data-text-meta>
        <span aria-hidden="true" className="mb-4 block h-px w-12" style={{ background: cs.accentColor }} />
        <p className="font-display text-[11px] font-medium uppercase text-text-300" style={{ letterSpacing: '0.3em' }}>
          {cs.client}
        </p>
        <p className="font-body mt-1.5 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.18em' }}>
          {cs.category} — {cs.year}
        </p>
      </div>

      <h3
        data-text-title
        className="font-display mt-6 font-bold text-text-100"
        style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.6rem)', lineHeight: 1.08, letterSpacing: '-0.015em' }}
      >
        {cs.tagline}
      </h3>

      <p data-text-hook className="font-body measure mt-5 text-[15px] leading-relaxed text-text-300">
        {cs.hook}
      </p>

      <p data-text-stat className="font-display mt-8 font-bold leading-none text-text-100" style={{ fontSize: 'clamp(2.6rem, 5vw, 5rem)' }}>
        {cs.headlineStat.prefix}
        {cs.headlineStat.value}
        <span style={{ color: 'var(--blue-500)' }}>{cs.headlineStat.suffix}</span>
      </p>
      <p data-text-stat className="font-body mt-2 text-sm text-text-300">{cs.headlineStat.label}</p>

      <Link
        data-text-link
        href={`/work/${cs.id}`}
        className="group mt-8 inline-flex min-h-[44px] items-center gap-3 font-display text-[12px] font-medium uppercase text-text-200 transition-colors duration-300 hover:text-[var(--blue-400)]"
        style={{ letterSpacing: '0.24em' }}
      >
        View case study
        <span className="sr-only"> — {cs.client}</span>
        <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
          <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </Link>
      <span className="sr-only">Project {index + 1} of {PROJECTS.length}</span>
    </>
  )
}

export default function FeaturedWorkJourney() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)

  /* --------------------------------------------------- desktop choreography */
  useIsomorphicLayoutEffect(() => {
    if (reduced || mobile) return
    const ctx = gsap.context((self) => {
      const stage = self.selector!('[data-stage]')[0] as HTMLElement
      const frames = self.selector!('[data-frame]') as HTMLElement[]
      const texts = self.selector!('[data-project-text]') as HTMLElement[]
      const opening = self.selector!('[data-opening]')[0] as HTMLElement
      if (!stage || frames.length !== 3) return

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.7,
          onUpdate: (st) => {
            // 0–0.14 opening · 0.14–0.44 P1 · 0.44–0.72 P2 · 0.72–1 P3
            const p = st.progress
            const idx = p < 0.16 ? 0 : p < 0.46 ? 0 : p < 0.74 ? 1 : 2
            if (idx !== activeRef.current) {
              activeRef.current = idx
              setActive(idx)
            }
          },
        },
      })

      // The opening statement is the sequence's first frame; it lifts away as
      // the first project's media grows into the stage.
      tl.fromTo(opening, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -70, duration: 0.14 }, 0)

      // The stage itself travels and reshapes between projects.
      STAGE_POSE.forEach((pose, i) => {
        const at = i === 0 ? 0.04 : i === 1 ? 0.44 : 0.72
        tl.to(stage, { xPercent: parseFloat(pose.x), yPercent: parseFloat(pose.y), width: pose.w, aspectRatio: pose.ratio, duration: 0.2 }, at)
      })

      frames.forEach((frame, i) => {
        const inAt = i === 0 ? 0.04 : i === 1 ? 0.42 : 0.7
        // Each project starts arriving before the previous has fully gone.
        tl.fromTo(
          frame,
          { autoAlpha: 0, clipPath: 'inset(16% 12% 16% 12%)', scale: 1.08 },
          { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.16 },
          inAt
        )
        if (i < 2) {
          tl.to(frame, { autoAlpha: 0, clipPath: 'inset(12% 8% 12% 8%)', duration: 0.12 }, inAt + 0.34)
        }
      })

      // Text blocks enter from three different spatial positions.
      const ENTER = [
        { x: 90, y: 40 },
        { x: -90, y: 60 },
        { x: 0, y: 90 },
      ]
      texts.forEach((block, i) => {
        const at = i === 0 ? 0.12 : i === 1 ? 0.46 : 0.74
        const parts = block.querySelectorAll(
          '[data-text-meta], [data-text-title], [data-text-hook], [data-text-stat], [data-text-link]'
        )
        tl.fromTo(
          block,
          { autoAlpha: 0, x: ENTER[i].x, y: ENTER[i].y },
          { autoAlpha: 1, x: 0, y: 0, duration: 0.12 },
          at
        )
        tl.fromTo(parts, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.028 }, at + 0.02)
        if (i < 2) {
          tl.to(block, { autoAlpha: 0, y: -60, duration: 0.09 }, at + 0.26)
        }
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  /* ------------------------------------------------------ mobile / reduced */
  useIsomorphicLayoutEffect(() => {
    if (!mobile) return
    const observers: IntersectionObserver[] = []

    const ctx = gsap.context((self) => {
      const cards = self.selector!('[data-mobile-project]') as HTMLElement[]
      cards.forEach((card, i) => {
        if (!reduced) {
          const media = card.querySelector('[data-mobile-media-inner]')
          if (media) {
            gsap.fromTo(
              media,
              { yPercent: -6 },
              { yPercent: 6, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: 1 } }
            )
          }
          gsap.fromTo(
            card.querySelectorAll('[data-mobile-copy] > *'),
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              stagger: 0.07,
              ease: 'power2.out',
              scrollTrigger: { trigger: card, start: 'top 74%' },
            }
          )
        }

        // Playback ownership on mobile: whichever project is nearest the
        // viewport middle is the only one allowed to play.
        const io = new IntersectionObserver(
          ([e]) => {
            if (e.intersectionRatio > 0.5 && activeRef.current !== i) {
              activeRef.current = i
              setActive(i)
            }
          },
          { threshold: [0, 0.5] }
        )
        io.observe(card)
        observers.push(io)
      })
    }, rootRef)

    return () => {
      observers.forEach((io) => io.disconnect())
      ctx.revert()
    }
  }, [reduced, mobile])

  /* ------------------------------------------------------------- rendering */
  if (mobile || reduced) {
    return (
      <section ref={rootRef} id="work" aria-label="Selected work" className="relative z-10">
        <div className="flow-gutter pt-[8vh]">
          <KineticLabel text="SELECTED WORK" />
          <SplitLineReveal
            as="h2"
            lines={['PROOF,', 'NOT PROMISES.']}
            srLabel="Proof, not promises."
            className="font-display mt-5 font-bold uppercase text-text-100"
            style={{ fontSize: 'clamp(2.2rem, 11vw, 4rem)', lineHeight: 0.94, letterSpacing: '-0.02em' }}
          />
        </div>

        {PROJECTS.map((cs, i) => (
          <article
            key={cs.id}
            data-mobile-project
            aria-label={`${cs.client} case study`}
            className="relative"
            // Overlap: each project rides up into the previous one's copy.
            style={{ marginTop: i === 0 ? '5vh' : '-6vh' }}
          >
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: i === 2 ? '16 / 10' : '1 / 1' }}>
              <div data-mobile-media-inner className="absolute inset-[-6%]">
                <StageVideo
                  src={cs.heroMedia.src}
                  poster={cs.heroMedia.poster}
                  label={`${cs.client} campaign preview`}
                  active={active === i}
                />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ background: 'linear-gradient(to top, var(--bg-950) 2%, rgba(2,3,6,0.35) 34%, transparent 62%)' }}
              />
            </div>
            <div data-mobile-copy className="flow-gutter relative -mt-[10vh] pb-[2vh]">
              <ProjectText cs={cs} index={i} />
            </div>
          </article>
        ))}
        <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    )
  }

  return (
    <section
      ref={rootRef}
      id="work"
      aria-label="Selected work"
      className="relative z-10"
      // Three projects plus the opening frame — the scroll budget for the one
      // pinned sequence on this page.
      style={{ height: '380vh' }}
    >
      <div className="sticky top-0 flex h-screen w-full items-center overflow-hidden">
        {/* --- the travelling media stage --- */}
        <div
          data-stage
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
          style={{ width: '46vw', aspectRatio: '1 / 1' }}
        >
          {PROJECTS.map((cs, i) => (
            <div
              key={cs.id}
              data-frame
              className="absolute inset-0 overflow-hidden will-change-transform"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              {/* local accent light, hugging the media only */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-16 -z-10"
                style={{ background: `radial-gradient(ellipse 55% 50% at 50% 55%, ${cs.accentColor}30, transparent 70%)` }}
              />
              {/* poster underneath so a swap never flashes black */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cs.heroMedia.poster} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
              {active === i && (
                <StageVideo
                  src={cs.heroMedia.src}
                  poster={cs.heroMedia.poster}
                  label={`${cs.client} campaign preview`}
                  active
                />
              )}
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `${cs.accentColor}cc` }} />
            </div>
          ))}
        </div>

        {/* --- opening frame: the statement IS the first beat --- */}
        <div data-opening className="pointer-events-none absolute inset-0 z-20 flex items-center">
          <div className="flow-gutter w-full">
            <KineticLabel text="SELECTED WORK" />
            <h2
              className="font-display mt-6 font-bold uppercase text-text-100"
              style={{ fontSize: 'clamp(3rem, 9vw, 9rem)', lineHeight: 0.9, letterSpacing: '-0.03em' }}
            >
              Proof,
              <br />
              not promises.
            </h2>
          </div>
        </div>

        {/* --- three text blocks, three entry positions --- */}
        {PROJECTS.map((cs, i) => (
          <div
            key={cs.id}
            data-project-text
            aria-hidden={active !== i}
            className={`absolute z-20 w-[min(30rem,34vw)] ${
              i === 0
                ? 'right-[clamp(1.25rem,4vw,4.5rem)] top-1/2 -translate-y-1/2'
                : i === 1
                  ? 'left-[clamp(1.25rem,4vw,4.5rem)] top-1/2 -translate-y-1/2'
                  : 'bottom-[8vh] left-[clamp(1.25rem,4vw,4.5rem)] w-[min(38rem,46vw)]'
            }`}
            style={{ opacity: 0 }}
          >
            <ProjectText cs={cs} index={i} />
          </div>
        ))}
      </div>

      {/* the thread crosses the sequence at three heights */}
      <div data-flow-anchor="edge-left" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '18%' }} aria-hidden="true" />
      <div data-flow-anchor="right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '54%' }} aria-hidden="true" />
      <div data-flow-anchor="center" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '88%' }} aria-hidden="true" />
    </section>
  )
}
