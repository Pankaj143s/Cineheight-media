'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { services, closing, contact } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import OpticalResolve from '@/components/motion/OpticalResolve'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import MagneticLink from '@/components/ui/MagneticLink'
import Reveal from '@/components/ui/Reveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { SCRUB } from '@/lib/motionTokens'

/**
 * The six services as ONE system.
 *
 * The previous page gave every service its own layout variant — a wide crop,
 * then vertical type, then a full bleed, then a typography-led block — with
 * 24rem numerals between them. Each composition was fine alone; together they
 * read as six design experiments rather than one offering, and nothing
 * explained how the services relate.
 *
 * Now: a scrolling index on the left and one sticky shared canvas on the right
 * that the active service transitions through. Consistent from the first entry
 * to the last, and it ends on a diagram that states the actual relationship
 * between them.
 *
 * The sticky canvas releases before the closing CTA, and does not exist at all
 * on the mobile tier — the artwork simply follows each service.
 */

/** What each service actually hands over. Grounded in the verified detail copy. */
const DELIVERABLES: Record<string, string[]> = {
  'brand-identity': ['Positioning', 'Naming systems', 'Logo & identity', 'Brand guidelines'],
  'social-media': ['Content calendars', 'Platform strategy', 'Community management', 'Channel consistency'],
  'graphic-design': ['Campaign creatives', 'Social posts', 'Infographics', 'Print'],
  'video-production': ['Product films', 'Reels', 'Campaign videos', 'Testimonials'],
  'performance-marketing': ['Targeted campaigns', 'Lead funnels', 'Optimisation', 'Reporting'],
  'content-creation': ['Photography', 'Short-form video', 'Copywriting', 'Content systems'],
}

/** The system diagram — how the six add up. */
const CHAIN = ['Brand', 'Content', 'Distribution', 'Conversion', 'Growth']

export default function ServicesPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const entryRefs = useRef<(HTMLElement | null)[]>([])
  const mobileSignalRef = useRef<HTMLSpanElement>(null)
  const introCopyRef = useRef<HTMLParagraphElement>(null)
  const chainRef = useRef<HTMLOListElement>(null)
  const mobile = useIsMobileTier()
  const reduced = useReducedMotion()

  const [active, setActive] = useState(0)
  const activeRef = useRef(0)

  const setActiveIndex = useCallback((i: number) => {
    if (i === activeRef.current) return
    activeRef.current = i
    setActive(i)
  }, [])

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const paragraph = introCopyRef.current
    const chain = chainRef.current
    const animations: gsap.core.Animation[] = []

    if (paragraph) {
      animations.push(
        gsap.fromTo(
          paragraph,
          { autoAlpha: 0.68, y: 10, letterSpacing: '0.025em' },
          {
            autoAlpha: 1,
            y: 0,
            letterSpacing: '0em',
            ease: 'none',
            scrollTrigger: { trigger: paragraph, start: 'top 90%', end: 'top 48%', scrub: SCRUB.text },
          }
        )
      )
    }

    if (chain) {
      const steps = Array.from(chain.querySelectorAll<HTMLElement>('[data-chain-step]'))
      const arrows = Array.from(chain.querySelectorAll<SVGPathElement>('[data-chain-pulse]'))
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: chain, start: 'top 82%', end: 'top 40%', scrub: SCRUB.signal },
      })
      steps.forEach((step, i) => {
        timeline.to(step, { opacity: 1, y: 0, duration: 0.28 })
        if (arrows[i]) {
          timeline.fromTo(
            arrows[i],
            { opacity: 0, strokeDashoffset: 34 },
            { opacity: 0.9, strokeDashoffset: -34, duration: 0.38 },
            '<0.04'
          )
          timeline.to(arrows[i], { opacity: 0, duration: 0.12 })
        }
      })
      timeline.to(steps[steps.length - 1], {
        textShadow: '0 0 16px rgba(0,137,255,0.75)',
        color: '#DCEEFF',
        duration: 0.35,
      })
      animations.push(timeline)
    }

    return () => animations.forEach((animation) => animation.kill())
  }, [reduced])

  useIsomorphicLayoutEffect(() => {
    const resetRevealTransforms = () => {
      entryRefs.current.forEach((entry) => {
        if (!entry) return
        gsap.set(entry.querySelectorAll('[data-mobile-reveal]'), { x: 0, y: 0, yPercent: 0, clearProps: 'visibility' })
        if (mobile) {
          gsap.set(
            entry.querySelectorAll('[data-service-number], [data-service-title], [data-service-description]'),
            { clearProps: 'opacity,visibility' }
          )
        }
      })
    }
    resetRevealTransforms()
    if (reduced) return resetRevealTransforms
    const animations: gsap.core.Animation[] = []
    entryRefs.current.forEach((entry) => {
      if (!entry) return

      if (mobile) {
        const revealTargets = entry.querySelectorAll<HTMLElement>('[data-mobile-reveal]')
        if (!revealTargets.length) return
        animations.push(
          gsap.fromTo(
            revealTargets,
            { autoAlpha: 0.72, y: 12 },
            {
              autoAlpha: 1,
              y: 0,
              stagger: 0.055,
              ease: 'none',
              scrollTrigger: { trigger: entry, start: 'top 88%', end: 'top 48%', scrub: SCRUB.text },
            }
          )
        )
        return
      }

      const number = entry.querySelector('[data-service-number]')
      const title = entry.querySelector('[data-service-title]')
      const description = entry.querySelector('[data-service-description]')
      const rule = entry.querySelector('[data-service-rule]')
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: entry, start: 'top 88%', end: 'top 48%', scrub: SCRUB.text },
      })
      timeline
        .fromTo(number, { autoAlpha: 0.25, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.42 }, 0)
        .fromTo(
          title,
          { autoAlpha: 0.45, yPercent: 105 },
          { autoAlpha: 1, yPercent: 0, duration: 0.62 },
          0.04
        )
        .fromTo(
          description,
          { autoAlpha: 0.55, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.5 },
          0.2
        )
        .fromTo(rule, { scaleX: 0.12, opacity: 0.24 }, { scaleX: 1, opacity: 0.8, duration: 0.65 }, 0)
      animations.push(timeline)
    })
    return () => {
      animations.forEach((animation) => animation.kill())
      resetRevealTransforms()
    }
  }, [mobile, reduced])

  useIsomorphicLayoutEffect(() => {
    if (!mobile || reduced) return
    const root = rootRef.current
    const signal = mobileSignalRef.current
    if (!root || !signal) return
    const tween = gsap.fromTo(
      signal,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top 78%', end: 'bottom 72%', scrub: SCRUB.signal },
      }
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [mobile, reduced])

  useEffect(() => {
    if (mobile) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            const index = entryRefs.current.indexOf(entry.target as HTMLElement)
            if (index >= 0) setActiveIndex(index)
          })
        },
        { rootMargin: '0px 0px -28% 0px', threshold: 0.08 }
      )
      entryRefs.current.forEach((entry) => { if (entry) observer.observe(entry) })
      return () => observer.disconnect()
    }
    let ticking = false
    const pick = () => {
      ticking = false
      const mid = window.innerHeight * 0.45
      let best = 0
      let bestD = Infinity
      entryRefs.current.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const d = Math.abs(r.top + r.height / 2 - mid)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      setActiveIndex(best)
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(pick)
    }
    pick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [mobile, setActiveIndex])

  const canvas = (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: '16 / 9', background: 'var(--bg-900)' }}
    >
      {services.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.id}
          src={s.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          style={{
            opacity: active === i ? 1 : 0,
            transform:
              active === i
                ? 'translate3d(0,0,0) scale(1)'
                : `translate3d(0,${i < active ? -10 : 10}px,0) scale(1.018)`,
            clipPath:
              active === i
                ? 'inset(0 0 0 0)'
                : i < active
                  ? 'inset(0 0 100% 0)'
                  : 'inset(100% 0 0 0)',
            transition: reduced
              ? 'none'
              : 'opacity 0.65s ease, transform 0.9s cubic-bezier(0.16,1,0.3,1), clip-path 0.72s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      ))}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-24"
        style={{ background: 'linear-gradient(to right, var(--bg-950), transparent)' }}
      />
      <p
        className="font-body absolute bottom-4 left-6 text-[10px] uppercase text-text-500"
        style={{ letterSpacing: '0.2em' }}
        aria-hidden="true"
      >
        {services[active].index} — {services[active].title}
      </p>
    </div>
  )

  return (
    <main id="main-content" tabIndex={-1} className="relative z-10 scroll-mt-24 outline-none">
      <header className="flow-gutter relative pb-[4vh] pt-32 lg:pt-36">
        <KineticLabel text="WHAT WE DO" />
        <OpticalResolve
          as="h1"
          text="One system. Six crafts."
          delay={0.34}
          accentWords={['Six']}
          className="type-display-1 font-display mt-6 max-w-[14ch] font-bold uppercase text-text-100"
        />
        <p ref={introCopyRef} className="font-body measure mt-8 text-base leading-relaxed text-text-300">
          Identity into content. Content into campaigns. Campaigns into growth.
        </p>
      </header>

      <div ref={rootRef} className="flow-gutter relative grid grid-cols-12 lg:gap-x-12">
        {mobile && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 top-10 w-px bg-white/10"
            style={{ left: 'var(--gutter)' }}
          >
            <span
              ref={mobileSignalRef}
              data-mobile-service-signal
              className="absolute inset-0 origin-top bg-[var(--blue-500)]"
              style={{
                transform: reduced ? `scaleY(${(active + 1) / services.length})` : 'scaleY(0)',
                transition: reduced ? 'transform 160ms ease-out' : undefined,
              }}
            />
          </span>
        )}
        {mobile && !reduced && (
          <div data-mobile-service-stage className="col-span-12 sticky top-[10svh] z-20 h-[clamp(18rem,44svh,26rem)] overflow-hidden">
            {canvas}
          </div>
        )}
        {/* the scrolling index */}
        <div className="col-span-12 min-w-0 lg:col-span-6">
          {services.map((s, i) => (
            <section
              key={s.id}
              data-service-entry={i}
              ref={(el) => { entryRefs.current[i] = el }}
              aria-label={s.title}
              className={`relative flex min-w-0 flex-col justify-center ${mobile ? 'pl-7' : ''}`}
              style={{
                minHeight: mobile ? (reduced ? 'auto' : '40svh') : 'clamp(15rem, 34vh, 23rem)',
                paddingBlock: mobile ? '2.5rem' : 'clamp(1.5rem, 3.2vh, 2.8rem)',
                opacity: reduced || active === i ? 1 : mobile ? 0.68 : Math.abs(active - i) === 1 ? 0.64 : Math.abs(active - i) === 2 ? 0.38 : 0.24,
                transform: reduced || mobile || active === i ? 'none' : `translate3d(0,${i < active ? -6 : 6}px,0)`,
                transition: reduced ? 'opacity 160ms ease-out' : 'opacity 0.5s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {mobile && (
                <span
                  data-mobile-service-marker
                  aria-hidden="true"
                  className="absolute left-[-3px] top-[2.65rem] h-[7px] w-[7px] rounded-full border border-[var(--blue-500)]"
                  style={{
                    background: active === i ? 'var(--blue-400)' : 'var(--bg-950)',
                    boxShadow: active === i ? '0 0 14px rgba(0,137,255,0.72)' : 'none',
                    transform: reduced || active !== i ? 'scale(1)' : 'scale(1.18)',
                    transition: 'background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
                  }}
                />
              )}
              <span
                data-service-rule
                data-mobile-reveal
                aria-hidden="true"
                className="mb-5 block h-px origin-left"
                style={{
                  width: 'min(20rem, 55%)',
                  background: 'linear-gradient(to right, var(--blue-500), rgba(0,137,255,0))',
                  ...(reduced || mobile
                    ? {
                        transform: `scaleX(${mobile || active === i ? 1 : 0.12})`,
                        opacity: mobile || active === i ? 0.8 : 0.24,
                      }
                    : { transform: 'scaleX(0.12)', opacity: 0.24 }),
                }}
              />
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-5">
                <span
                  data-service-number
                  data-mobile-reveal
                  className="font-display text-[12px] font-medium"
                  style={{ letterSpacing: '0.28em', color: active === i ? 'var(--blue-400)' : 'var(--text-500)' }}
                >
                  {s.index}
                </span>
                <h2
                  className="min-w-0 font-display font-bold uppercase text-text-100"
                  style={{
                    fontSize: 'calc(clamp(1.85rem, 4.2vw, 3.6rem) * var(--display-scale))',
                    lineHeight: 1.0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  <span className="block overflow-hidden pb-[0.13em] -mb-[0.13em]">
                    <span data-service-title data-mobile-reveal className="block">
                      {s.title}
                    </span>
                  </span>
                </h2>
              </div>

              <p
                data-service-description
                data-mobile-reveal
                className="font-body mt-5 text-[15px] leading-relaxed text-text-200 sm:text-base"
                style={{
                  maxWidth: '38ch',
                  opacity: mobile || active === i ? 1 : 0,
                  maxHeight: mobile || active === i ? 120 : 0,
                  overflow: 'hidden',
                  transition: reduced ? 'none' : 'opacity 0.45s ease, max-height 0.45s ease',
                }}
              >
                {s.description}
              </p>
              <p data-service-detail className="sr-only">
                {s.detail}
              </p>
              <ul
                className="mt-4 flex flex-wrap gap-x-4 gap-y-2"
                style={{
                  opacity: mobile || active === i ? 1 : 0,
                  transition: reduced ? 'none' : 'opacity 0.4s ease',
                }}
                aria-hidden={mobile || active === i ? undefined : true}
              >
                {(DELIVERABLES[s.id] ?? []).map((d) => (
                  <li
                    key={d}
                    data-service-deliverable
                    className="font-body list-none text-[11px] uppercase text-text-500"
                    style={{ letterSpacing: '0.14em' }}
                  >
                    {d}
                  </li>
                ))}
              </ul>

              {/* Mobile / tablet: the artwork simply follows its own service. */}
              {mobile && (
                <div
                  data-mobile-service-art
                  className="relative mt-6 w-full overflow-hidden"
                  style={{
                    aspectRatio: '16 / 10',
                    opacity: active === i ? 1 : 0.72,
                    transform: reduced || active === i ? 'none' : 'translate3d(0,8px,0)',
                    transition: reduced ? 'opacity 160ms ease-out' : 'opacity 280ms ease, transform 280ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" aria-hidden="true" className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
            </section>
          ))}
        </div>

        {/* the sticky shared canvas — desktop only, releases before the CTA */}
        {!mobile && (
          <div className="col-span-12 lg:col-span-6">
            {/* Image plane only. The descriptions beside it must not move. */}
            <div className="sticky top-[18vh]" data-depth-layer="front">{canvas}</div>
          </div>
        )}
      </div>

      {/* how the six add up */}
      <section aria-label="How the services connect" className="flow-gutter relative" style={{ marginTop: `calc(${mobile ? '8vh' : '14vh'} * var(--scene-gap))` }}>
        <KineticLabel text="HOW IT CONNECTS" />
        <Reveal as="p" className="font-body measure mt-6 text-[15px] leading-relaxed text-text-300">
          Each discipline feeds the next. That chain is the reason one team is faster than four suppliers.
        </Reveal>

        <ol ref={chainRef} className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-4">
          {CHAIN.map((step, i) => (
            <li key={step} className="flex list-none items-center gap-3">
              <span
                data-chain-step
                className="font-display whitespace-nowrap text-[13px] font-medium uppercase text-text-100"
                style={{ letterSpacing: '0.16em', opacity: reduced ? 1 : 0.68, transform: reduced ? 'translateY(0)' : 'translateY(3px)' }}
              >
                {step}
              </span>
              {i < CHAIN.length - 1 && (
                <svg width="34" height="8" viewBox="0 0 34 8" fill="none" aria-hidden="true" className="shrink-0">
                  <path d="M0 4h30M27 1l4 3-4 3" stroke="var(--blue-500)" strokeWidth="1.2" opacity="0.7" />
                  <path
                    data-chain-pulse
                    d="M0 4h30"
                    stroke="#DCEEFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeDasharray="7 27"
                    opacity="0"
                  />
                </svg>
              )}
            </li>
          ))}
        </ol>
        <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />
      </section>

      <section aria-label="Start a project" className="flow-gutter relative" style={{ marginTop: `calc(${mobile ? '10vh' : '14vh'} * var(--scene-gap))` }}>
        <ScrollHeadline
          as="h2"
          text={closing.cta}
          accent={['BRAND.']}
          className="type-display-1 font-display max-w-[14ch] font-bold uppercase text-text-100"
          from={0.22}
          end="top 38%"
        />
        <div className="mt-12 flex flex-wrap items-center gap-x-12 gap-y-6">
          <MagneticLink
            href="/contact"
            className="group font-display inline-flex min-h-[52px] items-center rounded-full border px-8 py-3.5 text-[13px] font-medium uppercase text-text-100 transition-colors duration-300 hover:border-[var(--blue-400)] hover:text-[var(--blue-200)]"
            style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)' }}
          >
            Start a project
            <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
              <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </MagneticLink>
          <a href={contact.phoneHref} className="font-body flex min-h-[44px] items-center whitespace-nowrap text-sm text-text-300 transition-colors hover:text-text-100">
            {contact.phone}
          </a>
          <a href={`mailto:${contact.email}`} className="font-body flex min-h-[44px] items-center text-sm text-text-300 transition-colors hover:text-text-100">
            {contact.email}
          </a>
        </div>
      </section>
    </main>
  )
}
