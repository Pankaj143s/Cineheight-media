'use client'

import { useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { caseStudies } from '@/content/caseStudies'
import Reveal from '@/components/ui/Reveal'
import { useActiveVideo } from '@/lib/useActiveVideo'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Featured Work (spec §15) — three large editorial presentations, one per real
 * case study, each with its own rhythm. No equal card grid:
 *   1. Sapale   — dominant media left, text along the right edge
 *   2. SES      — reversed reading direction, media offset high-right with a
 *                 real post floating at a second depth
 *   3. Divija   — near-full-width 16:9 film, calm handoff into the reels
 * Media: real reels/films only. Mask-reveal + slight internal parallax (GSAP
 * scrub); project accent appears ONLY as a local edge detail. Videos play
 * muted while sufficiently visible (shared discipline in useActiveVideo).
 */

function ProjectVideo({
  src,
  poster,
  label,
  aspect,
  className = '',
  style,
}: {
  src: string
  poster: string
  label: string
  aspect: string
  className?: string
  style?: React.CSSProperties
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useActiveVideo(videoRef, { playAt: 0.5, pauseAt: 0.2 })

  return (
    <div data-media-frame className={`relative overflow-hidden ${className}`} style={{ aspectRatio: aspect, ...style }}>
      <video
        ref={videoRef}
        data-media-inner
        className="absolute inset-0 h-full w-full scale-[1.06] object-cover"
        style={{ backgroundColor: 'var(--bg-900)' }}
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
    </div>
  )
}

function MetaRow({ client, category, year, accent }: { client: string; category: string; year: string; accent: string }) {
  return (
    <div>
      <Reveal variant="line-draw" className="mb-4 h-px w-14" style={{ background: accent }} aria-hidden="true">
        <span />
      </Reveal>
      <p className="font-display text-[11px] font-medium uppercase text-text-300" style={{ letterSpacing: '0.3em' }}>
        {client}
      </p>
      <p className="font-body mt-1.5 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.18em' }}>
        {category} — {year}
      </p>
    </div>
  )
}

function Stat({ value, prefix, suffix, label }: { value: string; prefix?: string; suffix?: string; label: string }) {
  return (
    <Reveal variant="fade-up" delay={0.25} className="mt-8">
      <p className="font-display font-bold leading-none text-text-100" style={{ fontSize: 'clamp(2.6rem, 4.6vw, 4.6rem)' }}>
        {prefix}
        {value}
        <span style={{ color: 'var(--blue-500)' }}>{suffix}</span>
      </p>
      <p className="font-body mt-2 text-sm text-text-300">{label}</p>
    </Reveal>
  )
}

function CaseLink({ id, client }: { id: string; client: string }) {
  return (
    <Reveal variant="fade-up" delay={0.35} className="mt-8">
      <Link
        href={`/work/${id}`}
        className="group inline-flex min-h-[44px] items-center gap-3 font-display text-[12px] font-medium uppercase text-text-200 transition-colors duration-300 hover:text-[var(--blue-400)] focus-visible:text-[var(--blue-400)]"
        style={{ letterSpacing: '0.24em' }}
      >
        View case study
        <span className="sr-only"> — {client}</span>
        <svg
          width="26"
          height="10"
          viewBox="0 0 26 10"
          fill="none"
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-1.5"
        >
          <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </Link>
    </Reveal>
  )
}

export default function FeaturedWork() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const [sapale, ses, divija] = caseStudies

  // Scroll choreography: every media frame un-masks and its inner video makes
  // a slow internal parallax pass. ease:none + scrub — scroll owns the motion.
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const frames = self.selector!('[data-media-frame]') as HTMLElement[]
      frames.forEach((frame) => {
        gsap.fromTo(
          frame,
          { clipPath: 'inset(10% 6% 10% 6%)', autoAlpha: 0.65 },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            autoAlpha: 1,
            ease: 'none',
            scrollTrigger: { trigger: frame, start: 'top 88%', end: 'top 42%', scrub: 0.9 },
          }
        )
        const inner = frame.querySelector('[data-media-inner]')
        if (inner && !mobile) {
          gsap.fromTo(
            inner,
            { yPercent: -3.5 },
            { yPercent: 3.5, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 1.1 } }
          )
        }
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  return (
    <section ref={rootRef} id="work" aria-label="Featured work" className="relative">
      {/* Section entry — editorial label rising from the trusted-clients beat */}
      <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="max-w-3xl pb-[7vh] pt-[4vh]">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Featured Work
          </span>
          <h2
            className="font-display mt-5 font-bold text-text-100"
            style={{ fontSize: 'clamp(1.9rem, 3.8vw, 3.6rem)', lineHeight: 1.06, letterSpacing: '-0.015em' }}
          >
            Real businesses. Real growth.
          </h2>
        </Reveal>
      </div>

      {/* ---------- 1 · SAPALE — dominant media left, text right edge ---------- */}
      <article aria-label={`${sapale.client} case study`} className="relative mx-auto w-full max-w-[1680px] px-6 pb-[16vh] sm:px-10 lg:px-14">
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="relative lg:col-span-7">
            {/* local accent light, media-hugging — never a full-screen wash */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-10 opacity-40"
              style={{ background: `radial-gradient(ellipse 60% 55% at 40% 60%, ${sapale.accentColor}26, transparent 70%)` }}
            />
            <ProjectVideo
              src={sapale.heroMedia.src}
              poster={sapale.heroMedia.poster}
              label={`${sapale.client} campaign reel preview`}
              aspect="1 / 1"
              className="relative w-full"
            />
          </div>
          <div className="lg:col-span-5 lg:pb-6">
            <MetaRow client={sapale.client} category={sapale.category} year={sapale.year} accent={sapale.accentColor} />
            <Reveal variant="fade-up" delay={0.1} className="mt-6">
              <h3 className="font-display font-bold text-text-100" style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.6rem)', lineHeight: 1.1 }}>
                {sapale.tagline}
              </h3>
              <p className="font-body mt-5 max-w-md text-[15px] leading-relaxed text-text-300">{sapale.hook}</p>
            </Reveal>
            <Stat {...sapale.headlineStat} />
            <CaseLink id={sapale.id} client={sapale.client} />
          </div>
        </div>
      </article>

      {/* ---------- 2 · SES — reversed, media offset high with post at depth ---------- */}
      <article aria-label={`${ses.client} case study`} className="relative mx-auto w-full max-w-[1680px] px-6 pb-[16vh] sm:px-10 lg:px-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="order-2 lg:order-1 lg:col-span-5 lg:self-center lg:pt-[8vh]">
            <MetaRow client={ses.client} category={ses.category} year={ses.year} accent={ses.accentColor} />
            <Reveal variant="fade-up" delay={0.1} className="mt-6">
              <h3 className="font-display font-bold text-text-100" style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.6rem)', lineHeight: 1.1 }}>
                {ses.tagline}
              </h3>
              <p className="font-body mt-5 max-w-md text-[15px] leading-relaxed text-text-300">{ses.hook}</p>
            </Reveal>
            <Stat {...ses.headlineStat} />
            <CaseLink id={ses.id} client={ses.client} />
          </div>
          <div className="relative order-1 lg:order-2 lg:col-span-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-10 opacity-40"
              style={{ background: `radial-gradient(ellipse 60% 55% at 60% 40%, ${ses.accentColor}26, transparent 70%)` }}
            />
            <ProjectVideo
              src={ses.heroMedia.src}
              poster={ses.heroMedia.poster}
              label={`${ses.client} campaign reel preview`}
              aspect="1 / 1"
              className="relative w-full lg:ml-auto lg:w-[86%]"
            />
            {/* a real SES post floats at a nearer depth (hidden from AT — decorative duplicate of gallery content) */}
            <Reveal
              variant="fade-up"
              delay={0.2}
              className="absolute -bottom-10 left-0 hidden w-[30%] shadow-2xl lg:block"
              aria-hidden="true"
            >
              <Image
                src={ses.posts[0].src}
                alt=""
                width={540}
                height={720}
                className="h-auto w-full"
                sizes="(min-width: 1024px) 20vw, 0px"
              />
            </Reveal>
          </div>
        </div>
      </article>

      {/* ---------- 3 · DIVIJA — near-full-width film, calm handoff ---------- */}
      <article aria-label={`${divija.client} case study`} className="relative w-full pb-[14vh]">
        <div className="relative mx-auto w-[94vw] max-w-[1800px]">
          <ProjectVideo
            src={divija.heroMedia.src}
            poster={divija.heroMedia.poster}
            label={`${divija.client} community story film preview`}
            aspect="16 / 9"
            className="w-full"
          />
          {/* readability gradient + text overlaid on the lower-left */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(2,3,6,0.88) 0%, rgba(2,3,6,0.25) 38%, transparent 60%)' }}
          />
          <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 lg:p-14">
            <MetaRow client={divija.client} category={divija.category} year={divija.year} accent={divija.accentColor} />
            <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
              <Reveal variant="fade-up" delay={0.1} className="max-w-xl">
                <h3 className="font-display font-bold text-text-100" style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.4rem)', lineHeight: 1.12 }}>
                  {divija.tagline}
                </h3>
              </Reveal>
              <div className="flex items-end gap-10">
                <Reveal variant="fade-up" delay={0.2}>
                  <p className="font-display font-bold leading-none text-text-100" style={{ fontSize: 'clamp(2.2rem, 3.6vw, 3.6rem)' }}>
                    {divija.headlineStat.prefix}
                    {divija.headlineStat.value}
                    <span style={{ color: 'var(--blue-500)' }}>{divija.headlineStat.suffix}</span>
                  </p>
                  <p className="font-body mt-1.5 text-xs text-text-300 sm:text-sm">{divija.headlineStat.label}</p>
                </Reveal>
                <CaseLink id={divija.id} client={divija.client} />
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}
