'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { services, closing, contact } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import MagneticLink from '@/components/ui/MagneticLink'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

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
  const mobile = useIsMobileTier()
  const reduced = useReducedMotion()

  const [active, setActive] = useState(0)
  const activeRef = useRef(0)

  const setActiveIndex = useCallback((i: number) => {
    if (i === activeRef.current) return
    activeRef.current = i
    setActive(i)
  }, [])

  useEffect(() => {
    if (mobile) return
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
      style={{ aspectRatio: '16 / 10', background: 'var(--bg-900)' }}
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
            transform: active === i ? 'scale(1)' : 'scale(1.05)',
            transition: reduced
              ? 'none'
              : 'opacity 0.8s ease, transform 1.3s cubic-bezier(0.16,1,0.3,1)',
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
    <main className="relative z-10">
      <header className="flow-gutter relative pb-[4vh] pt-32 lg:pt-40">
        <KineticLabel text="WHAT WE DO" />
        <SplitLineReveal
          as="h1"
          lines={['Six disciplines.', 'One connected system.']}
          srLabel="Six disciplines. One connected system."
          className="type-display-1 font-display mt-6 max-w-[18ch] font-bold uppercase text-text-100"
        />
        <p className="font-body measure mt-8 text-base leading-relaxed text-text-300">
          Strategy, design, content and campaigns work best when they are built together — every service below feeds
          the next.
        </p>
      </header>

      <div ref={rootRef} className="flow-gutter relative grid grid-cols-12 gap-x-12">
        {/* the scrolling index */}
        <div className="col-span-12 lg:col-span-6">
          {services.map((s, i) => (
            <section
              key={s.id}
              ref={(el) => { entryRefs.current[i] = el }}
              aria-label={s.title}
              className="relative flex flex-col justify-center"
              style={{
                minHeight: mobile ? 'auto' : 'clamp(20rem, 46vh, 30rem)',
                paddingBlock: mobile ? '3rem' : 'clamp(2rem, 4vh, 3.5rem)',
                opacity: mobile || active === i ? 1 : 0.5,
                transition: reduced ? 'none' : 'opacity 0.5s ease',
              }}
            >
              <span
                aria-hidden="true"
                className="mb-5 block h-px origin-left"
                style={{
                  width: 'min(20rem, 55%)',
                  background: 'linear-gradient(to right, var(--blue-500), rgba(0,137,255,0))',
                  transform: `scaleX(${active === i ? 1 : 0.12})`,
                  opacity: active === i ? 0.8 : 0.24,
                  transition: reduced ? 'none' : 'transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease',
                }}
              />
              <div className="flex items-baseline gap-5">
                <span
                  className="font-display text-[12px] font-medium"
                  style={{ letterSpacing: '0.28em', color: active === i ? 'var(--blue-400)' : 'var(--text-500)' }}
                >
                  {s.index}
                </span>
                <h2
                  className="font-display font-bold uppercase text-text-100"
                  style={{
                    fontSize: 'calc(clamp(1.5rem, 3.2vw, 2.8rem) * var(--display-scale))',
                    lineHeight: 1.02,
                    letterSpacing: '-0.022em',
                  }}
                >
                  {s.title}
                </h2>
              </div>

              <p className="font-body mt-5 text-[15px] leading-relaxed text-text-200 sm:text-base" style={{ maxWidth: '50ch' }}>
                {s.description}
              </p>
              <p className="font-body mt-3 text-sm leading-relaxed text-text-500" style={{ maxWidth: '52ch' }}>
                {s.detail}
              </p>

              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5">
                {(DELIVERABLES[s.id] ?? []).map((d) => (
                  <li key={d} className="font-body list-none text-[12px] text-text-500">
                    {d}
                  </li>
                ))}
              </ul>

              {/* Mobile / tablet: the artwork simply follows its own service. */}
              {mobile && (
                <div className="relative mt-6 w-full overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
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
            <div className="sticky top-[18vh]">{canvas}</div>
          </div>
        )}
      </div>

      {/* how the six add up */}
      <section aria-label="How the services connect" className="flow-gutter relative" style={{ marginTop: mobile ? '8vh' : '14vh' }}>
        <KineticLabel text="HOW IT CONNECTS" />
        <p className="font-body measure mt-6 text-[15px] leading-relaxed text-text-300">
          Each discipline feeds the next. That chain is the reason one team is faster than four suppliers.
        </p>

        <ol className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-4">
          {CHAIN.map((step, i) => (
            <li key={step} className="flex list-none items-center gap-3">
              <span
                className="font-display whitespace-nowrap text-[13px] font-medium uppercase text-text-100"
                style={{ letterSpacing: '0.16em' }}
              >
                {step}
              </span>
              {i < CHAIN.length - 1 && (
                <svg width="34" height="8" viewBox="0 0 34 8" fill="none" aria-hidden="true" className="shrink-0">
                  <path d="M0 4h30M27 1l4 3-4 3" stroke="var(--blue-500)" strokeWidth="1.2" opacity="0.7" />
                </svg>
              )}
            </li>
          ))}
        </ol>
        <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />
      </section>

      <section aria-label="Start a project" className="flow-gutter relative" style={{ marginTop: mobile ? '10vh' : '14vh' }}>
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
          <a href={contact.phoneHref} className="font-body flex min-h-[44px] items-center text-sm text-text-300 transition-colors hover:text-text-100">
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
