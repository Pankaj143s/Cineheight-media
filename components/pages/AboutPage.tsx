'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { about, services, processSteps, showreel, closing, contact } from '@/content/siteContent'
import InlineVideo from '@/components/media/InlineVideo'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import MagneticLink from '@/components/ui/MagneticLink'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * A manifesto, not a second homepage.
 *
 * Large typography carries the whole page; capabilities are a kinetic word
 * field rather than a bordered list; the real production film arrives through a
 * scrolling mask rather than sitting in its own rectangle; and the six
 * disciplines and four process beats are stated at editorial scale in one
 * connected column.
 *
 * The film is the same footage the old live site used for its About section —
 * the only agency media that exists. No stock, no generated team imagery.
 */
export default function AboutPage() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      // The film unmasks from a slit as it enters — it emerges from the page
      // rather than appearing on it.
      const frame = self.selector!('[data-film]')[0]
      if (frame) {
        gsap.fromTo(
          frame,
          { clipPath: 'inset(38% 22% 38% 22%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'none',
            scrollTrigger: { trigger: frame, start: 'top 96%', end: 'top 34%', scrub: 0.8 },
          }
        )
      }

      // Capability words travel at four different rates and depths.
      const words = self.selector!('[data-cap-word]') as HTMLElement[]
      words.forEach((word, i) => {
        gsap.fromTo(
          word,
          { xPercent: i % 2 ? 18 : -18, autoAlpha: 0.5 },
          {
            xPercent: i % 2 ? -14 : 14,
            autoAlpha: 1,
            ease: 'none',
            scrollTrigger: { trigger: word, start: 'top bottom', end: 'bottom top', scrub: 1 + i * 0.4 },
          }
        )
      })

      const rows = self.selector!('[data-row]') as HTMLElement[]
      gsap.fromTo(
        rows,
        { autoAlpha: 0, y: 30 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: { trigger: rows[0], start: 'top 78%' },
        }
      )
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <main ref={rootRef} className="relative z-10">
      <header className="flow-gutter relative pb-[6vh] pt-32 lg:pt-40">
        <KineticLabel text="WHO WE ARE" />
        <SplitLineReveal
          as="h1"
          lines={[
            'Everything a',
            'brand needs.',
            <span key="ot" style={{ color: 'var(--blue-500)' }}>One team.</span>,
          ]}
          srLabel={about.headline}
          className="font-display mt-6 font-bold text-text-100"
          style={{ fontSize: 'clamp(2.6rem, 9vw, 8.4rem)', lineHeight: 0.9, letterSpacing: '-0.04em' }}
        />
        <p className="font-body measure mt-9 text-lg leading-relaxed text-text-300 sm:text-xl">{about.supporting}</p>
      </header>

      {/* the film, emerging through a mask */}
      <div data-film className="relative mx-auto w-[96vw] max-w-[1820px] overflow-hidden will-change-transform">
        <InlineVideo src={showreel.src} poster={showreel.poster} label="Cineheight production film" />
      </div>

      {/* the capability field — kinetic words, not a bordered list */}
      <section
        aria-label="What we bring"
        className="relative overflow-hidden"
        style={{ marginTop: mobile ? '12vh' : '18vh' }}
      >
        <ul className="relative">
          {about.capabilities.map((cap, i) => (
            <li
              key={cap}
              data-cap-word
              className="list-none whitespace-nowrap"
              style={{
                // Each word starts from a different horizontal origin, so the
                // column never lines up into a stack.
                paddingLeft: `${[6, 22, 2, 30][i] ?? 8}%`,
                marginTop: i === 0 ? 0 : mobile ? '-0.06em' : '-0.1em',
              }}
            >
              <span
                className="font-display font-bold uppercase text-text-100"
                style={{
                  fontSize: 'clamp(2rem, 9.5vw, 9rem)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.04em',
                  opacity: 0.92 - i * 0.1,
                }}
              >
                {cap}
              </span>
            </li>
          ))}
        </ul>
        <div data-flow-anchor="edge-right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '50%' }} aria-hidden="true" />
      </section>

      {/* the one-team argument */}
      <section aria-label="How we work" className="flow-gutter relative" style={{ marginTop: mobile ? '12vh' : '18vh' }}>
        <ScrollHeadline
          as="h2"
          text={about.journey}
          className="font-display max-w-[18ch] font-bold text-text-100"
          style={{ fontSize: 'clamp(1.8rem, 4.6vw, 4.4rem)', lineHeight: 0.98, letterSpacing: '-0.03em' }}
          from={0.2}
        />
        <p className="font-body measure-wide mt-9 text-base leading-relaxed text-text-300 sm:text-lg">
          When one team owns strategy, design, content and campaigns, nothing gets lost between agencies — the idea
          that wins the pitch is the idea that ships.
        </p>
        <p className="font-body measure-wide mt-5 text-base leading-relaxed text-text-500">
          We work out of {contact.location}, with brands anywhere.
        </p>
      </section>

      {/* six disciplines + four beats, one connected column */}
      <section aria-label="Capabilities and process" className="flow-gutter relative" style={{ marginTop: mobile ? '12vh' : '18vh' }}>
        <KineticLabel text="THE DISCIPLINES" />
        <ol className="mt-10">
          {services.map((s) => (
            <li
              key={s.id}
              data-row
              className="flex list-none flex-col gap-x-12 gap-y-2 py-6 lg:flex-row lg:items-baseline"
              style={{ opacity: reduced ? 1 : undefined }}
            >
              <span className="font-body w-12 shrink-0 text-[11px] text-text-500" style={{ letterSpacing: '0.22em' }}>
                {s.index}
              </span>
              <h3
                className="font-display w-full max-w-[16ch] shrink-0 font-bold text-text-100"
                style={{ fontSize: 'clamp(1.4rem, 3vw, 2.4rem)', lineHeight: 1.02, letterSpacing: '-0.02em' }}
              >
                {s.title}
              </h3>
              <p className="font-body measure-wide text-sm leading-relaxed text-text-300 lg:pt-1">{s.description}</p>
            </li>
          ))}
        </ol>

        <div style={{ marginTop: mobile ? '9vh' : '13vh' }}>
          <KineticLabel text="HOW IT FLOWS" />
          <ol className="mt-10 flex flex-wrap gap-x-[clamp(2rem,6vw,6rem)] gap-y-10">
            {processSteps.map((step, i) => (
              <li key={step.index} data-row className="max-w-[26ch] list-none" style={{ marginTop: i % 2 ? '2rem' : 0, opacity: reduced ? 1 : undefined }}>
                <p className="font-display text-sm font-medium" style={{ color: 'var(--blue-400)', letterSpacing: '0.2em' }}>
                  {step.index}
                </p>
                <h3
                  className="font-display mt-3 font-bold uppercase text-text-100"
                  style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.8rem)', lineHeight: 0.98, letterSpacing: '-0.025em' }}
                >
                  {step.title}
                </h3>
                <p className="font-body mt-3 text-sm leading-relaxed text-text-300">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
        <div data-flow-anchor="left" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '64%' }} aria-hidden="true" />
      </section>

      {/* the ask */}
      <section aria-label="Start a project" className="flow-gutter relative" style={{ marginTop: mobile ? '12vh' : '18vh' }}>
        <ScrollHeadline
          as="h2"
          text={closing.question}
          accent={['RISE']}
          className="font-display max-w-[15ch] font-bold uppercase text-text-100"
          style={{ fontSize: 'clamp(2.2rem, 7.4vw, 7rem)', lineHeight: 0.9, letterSpacing: '-0.035em' }}
          from={0.2}
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
          <a href={`mailto:${contact.email}`} className="font-body flex min-h-[44px] items-center text-sm text-text-300 transition-colors hover:text-text-100">
            {contact.email}
          </a>
        </div>
        <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    </main>
  )
}
