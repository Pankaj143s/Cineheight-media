'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { caseStudies, getCaseStudy } from '@/content/caseStudies'
import Reveal from '@/components/ui/Reveal'
import InlineVideo from '@/components/media/InlineVideo'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Case-study detail (spec §27) — exact verified content, new visual language,
 * calmer motion than the homepage. Client accent appears only in local details
 * (hairlines, growth bars); #0089FF stays the global accent. Single flow:
 * film → overview → approach → results → reels (3 slots incl. honest
 * placeholders) → posts → next project.
 */

function GrowthBar({
  label,
  before,
  after,
  suffix,
  maxValue,
  insight,
  accent,
}: {
  label: string
  before: number
  after: number
  suffix?: string
  maxValue?: number
  insight?: string
  accent: string
}) {
  const max = maxValue ?? Math.max(after, before) * 1.2
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced) {
      setShown(true)
      return
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-body text-sm text-text-300">{label}</p>
        <p className="font-display text-sm font-bold text-text-100">
          {after}
          {suffix}
        </p>
      </div>
      <div className="mt-2.5 flex flex-col gap-1.5" aria-hidden="true">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-transform duration-1000 ease-out"
            style={{ background: 'var(--border-strong)', width: `${(before / max) * 100}%`, transformOrigin: 'left', transform: shown ? 'scaleX(1)' : 'scaleX(0)' }}
          />
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-transform duration-1000 ease-out"
            style={{ background: accent, width: `${(after / max) * 100}%`, transformOrigin: 'left', transform: shown ? 'scaleX(1)' : 'scaleX(0)', transitionDelay: '0.15s' }}
          />
        </div>
      </div>
      {insight && <p className="font-body mt-2.5 text-xs leading-relaxed text-text-500">{insight}</p>}
    </div>
  )
}

/** 3-slot reel strip — one active video at a time; placeholder slots are
 *  honest labelled cards, never fake media. */
function CaseReels({ slug }: { slug: string }) {
  const cs = getCaseStudy(slug)!
  const [active, setActive] = useState<number | null>(null)
  const [inView, setInView] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio > 0.25), { threshold: [0, 0.25] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) setActive(null)
  }, [inView])

  return (
    <div>
      <ul ref={listRef} className="grid grid-cols-1 gap-5 sm:grid-cols-3" aria-label={`${cs.client} reels`}>
        {cs.reels.map((reel, i) => (
          <li key={reel.title} className="list-none">
            {reel.isPlaceholder ? (
              <div
                className="relative flex w-full flex-col items-start justify-end overflow-hidden rounded-sm p-5"
                style={{ aspectRatio: '1 / 1', border: '1px dashed var(--border-strong)', background: 'var(--bg-900)' }}
              >
                <p className="font-display text-[10px] uppercase text-text-500" style={{ letterSpacing: '0.24em' }}>
                  Awaiting client file
                </p>
                <p className="font-body mt-2 text-sm text-text-300">{reel.title}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActive(active === i ? null : i)}
                aria-pressed={active === i}
                aria-label={`${active === i ? 'Pause' : 'Play'} reel — ${reel.title}`}
                className="group relative block w-full overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ aspectRatio: '1 / 1', outlineColor: 'var(--blue-500)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reel.poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                {active === i && inView && (
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    poster={reel.poster}
                    aria-hidden="true"
                  >
                    <source src={reel.src} type="video/mp4" />
                  </video>
                )}
                <span
                  className="absolute bottom-0 left-0 flex w-full items-center justify-between px-4 py-3"
                  style={{ background: 'linear-gradient(to top, rgba(2,3,6,0.85), transparent)' }}
                >
                  <span className="font-body text-xs text-text-200">{reel.title}</span>
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-text-100 transition-colors group-hover:border-[var(--blue-400)]"
                    style={{ borderColor: 'var(--border-strong)', background: 'rgba(2,3,6,0.5)' }}
                  >
                    {active === i ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </span>
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="font-body mt-4 text-xs text-text-500">Reels play muted — audio stays off on this page.</p>
    </div>
  )
}

export default function CaseStudyPage({ slug }: { slug: string }) {
  const cs = getCaseStudy(slug)!
  const idx = caseStudies.findIndex((c) => c.id === slug)
  const next = caseStudies[(idx + 1) % caseStudies.length]
  const realPosts = cs.posts.filter((p) => !p.isPlaceholder)

  return (
    <main className="relative">
      {/* ---------- case hero ---------- */}
      <header className="mx-auto w-full max-w-[1500px] px-6 pb-[6vh] pt-32 sm:px-10 lg:px-14 lg:pt-40">
        <Reveal variant="fade-up">
          <p className="font-display text-[11px] font-medium uppercase text-text-300" style={{ letterSpacing: '0.3em' }}>
            {cs.client}
          </p>
          <p className="font-body mt-2 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.18em' }}>
            {cs.category} — {cs.year}
          </p>
          <h1
            className="font-display mt-7 max-w-4xl font-bold text-text-100"
            style={{ fontSize: 'clamp(2rem, 4.6vw, 4.4rem)', lineHeight: 1.05, letterSpacing: '-0.015em' }}
          >
            {cs.tagline}
          </h1>
          <p className="font-body mt-6 max-w-xl text-base leading-relaxed text-text-300">{cs.hook}</p>
        </Reveal>
        <Reveal variant="line-draw" delay={0.2} className="mt-10 h-px w-24" style={{ background: cs.accentColor }} aria-hidden="true">
          <span />
        </Reveal>
      </header>

      {/* ---------- primary film ---------- */}
      <section aria-label={`${cs.client} film`} className="mx-auto w-[94vw] max-w-[1700px] pb-[12vh]">
        <Reveal variant="fade-up" amount={0.15}>
          <div className={cs.topVideo.orientation === 'square' ? 'mx-auto w-full max-w-[720px]' : 'w-full'}>
            <InlineVideo
              src={cs.topVideo.src}
              poster={cs.topVideo.poster}
              label={`${cs.topVideo.title} — ${cs.client}`}
              aspect={cs.topVideo.orientation === 'square' ? '1 / 1' : '16 / 9'}
              className="rounded-sm"
            />
          </div>
          <p className="font-body mt-4 text-xs uppercase text-text-500" style={{ letterSpacing: '0.18em' }}>
            {cs.topVideo.type === 'testimonial' ? 'Client Testimonial' : 'Campaign Film'} — {cs.topVideo.title}
          </p>
        </Reveal>
      </section>

      {/* ---------- overview / objective ---------- */}
      <section aria-label="Overview" className="mx-auto w-full max-w-[1500px] px-6 pb-[12vh] sm:px-10 lg:px-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal variant="fade-up" className="lg:col-span-5">
            <h2 className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
              Objective
            </h2>
            <p className="font-body mt-6 text-base leading-relaxed text-text-200">{cs.objective}</p>
          </Reveal>
          <Reveal variant="fade-up" delay={0.12} className="lg:col-span-7">
            <h2 className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
              The Story
            </h2>
            <p className="font-body mt-6 text-base leading-relaxed text-text-300">{cs.description}</p>
          </Reveal>
        </div>
      </section>

      {/* ---------- approach ---------- */}
      <section aria-label="Approach" className="mx-auto w-full max-w-[1500px] px-6 pb-[12vh] sm:px-10 lg:px-14">
        <Reveal variant="fade-up">
          <h2 className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Our Approach
          </h2>
        </Reveal>
        <ol className="mt-8 grid grid-cols-1 gap-x-14 gap-y-8 lg:grid-cols-2">
          {cs.approach.map((step, i) => (
            <Reveal key={step} as="li" variant="fade-up" delay={i * 0.08} className="flex list-none gap-5 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
              <span className="font-display text-sm font-medium" style={{ color: 'var(--blue-400)', letterSpacing: '0.1em' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="font-body text-[15px] leading-relaxed text-text-200">{step}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------- results ---------- */}
      <section aria-label="Results" className="relative pb-[12vh]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: `radial-gradient(ellipse 50% 42% at 78% 30%, ${cs.accentColor}14, transparent 70%)` }}
        />
        <div className="relative mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
          <Reveal variant="fade-up">
            <h2 className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
              What Changed
            </h2>
            <p className="font-body mt-6 max-w-2xl text-base leading-relaxed text-text-200 sm:text-lg">{cs.resultSummary}</p>
          </Reveal>

          <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
            {cs.stats.map((stat, i) => (
              <Reveal key={stat.label} variant="fade-up" delay={i * 0.08}>
                <p className="font-display font-bold leading-none text-text-100" style={{ fontSize: 'clamp(2.2rem, 3.6vw, 3.6rem)' }}>
                  {stat.prefix}
                  {stat.value}
                  <span style={{ color: 'var(--blue-500)' }}>{stat.suffix}</span>
                </p>
                <p className="font-body mt-2.5 text-sm text-text-300">{stat.label}</p>
              </Reveal>
            ))}
          </div>

          <div className="mt-16 grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-2">
            {cs.growthMetrics.map((metric) => (
              <GrowthBar key={metric.label} {...metric} accent={cs.accentColor} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- reels (3 slots) ---------- */}
      <section aria-label="Reels" className="mx-auto w-full max-w-[1500px] px-6 pb-[12vh] sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="mb-8">
          <h2 className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Reels
          </h2>
        </Reveal>
        <CaseReels slug={slug} />
      </section>

      {/* ---------- static posts ---------- */}
      <section aria-label="Post creatives" className="mx-auto w-full max-w-[1500px] px-6 pb-[14vh] sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="mb-8">
          <h2 className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Static Creatives
          </h2>
        </Reveal>
        {realPosts.length > 0 ? (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {realPosts.map((post, i) => (
              <Reveal key={post.src} as="li" variant="fade-up" delay={(i % 4) * 0.07} className="list-none">
                <figure className="relative w-full overflow-hidden rounded-sm" style={{ aspectRatio: '3 / 4' }}>
                  <Image src={post.src} alt={post.alt ?? post.title} fill sizes="(max-width: 640px) 46vw, 24vw" className="object-cover" />
                </figure>
                <figcaption className="font-body mt-2.5 text-xs text-text-500">{post.title}</figcaption>
              </Reveal>
            ))}
          </ul>
        ) : (
          <p className="font-body max-w-md text-sm leading-relaxed text-text-500">
            Post creatives for this project have not been supplied yet — this section will hold them when they arrive.
          </p>
        )}
      </section>

      {/* ---------- next project ---------- */}
      <section aria-label="Next project" className="border-t" style={{ borderColor: 'var(--border)' }}>
        <Link
          href={`/work/${next.id}`}
          className="group mx-auto block w-full max-w-[1500px] px-6 py-[10vh] sm:px-10 lg:px-14"
        >
          <p className="font-display text-[11px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.3em' }}>
            Next Project
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-6">
            <h2
              className="font-display font-bold text-text-100 transition-colors duration-300 group-hover:text-[var(--blue-200)]"
              style={{ fontSize: 'clamp(1.8rem, 3.6vw, 3.4rem)', lineHeight: 1.05 }}
            >
              {next.client}
            </h2>
            <svg width="44" height="16" viewBox="0 0 44 16" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-2">
              <path d="M0 8h41M35 1l7 7-7 7" stroke="currentColor" strokeWidth="1.4" className="text-text-200" />
            </svg>
          </div>
          <span aria-hidden="true" className="mt-6 block h-px w-16 transition-all duration-500 group-hover:w-32" style={{ background: next.accentColor }} />
        </Link>
      </section>
    </main>
  )
}
