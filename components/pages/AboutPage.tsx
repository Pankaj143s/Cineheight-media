'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { about, services, processSteps, showreel, closing, contact } from '@/content/siteContent'
import InlineVideo from '@/components/media/InlineVideo'
import KineticLabel from '@/components/motion/KineticLabel'
import OpticalResolve from '@/components/motion/OpticalResolve'
import EditorialMatteReveal from '@/components/motion/EditorialMatteReveal'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import MagneticLink from '@/components/ui/MagneticLink'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Creative manifesto — one belief, short proof, media-led pacing.
 * Signature: optical resolve on the belief (not hero wordmark refraction).
 */
export default function AboutPage() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const words = self.selector!('[data-cap-word]') as HTMLElement[]
      words.forEach((word, i) => {
        gsap.fromTo(
          word,
          { xPercent: i % 2 ? 12 : -12, autoAlpha: 0.55 },
          {
            xPercent: i % 2 ? -8 : 8,
            autoAlpha: 1,
            ease: 'none',
            scrollTrigger: { trigger: word, start: 'top bottom', end: 'bottom top', scrub: 1 + i * 0.35 },
          }
        )
      })

      const rows = self.selector!('[data-row]') as HTMLElement[]
      if (rows[0]) {
        gsap.fromTo(
          rows,
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.05,
            ease: 'power3.out',
            scrollTrigger: { trigger: rows[0], start: 'top 80%' },
          }
        )
      }
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <main ref={rootRef} className="relative z-10">
      <header className="flow-gutter relative pb-[5vh] pt-32 lg:pt-40">
        <KineticLabel text="WHO WE ARE" />
        <OpticalResolve
          as="h1"
          text={about.belief}
          delay={0.32}
          accentWords={['choose']}
          className="font-display mt-6 max-w-[16ch] font-bold uppercase text-text-100"
          style={{ fontSize: 'clamp(2.6rem, 9vw, 7.5rem)', lineHeight: 0.9, letterSpacing: '-0.04em' }}
        />
        <p className="sr-only">{about.headline}</p>
        <p className="font-body measure mt-8 text-lg leading-relaxed text-text-300 sm:text-xl">{about.supporting}</p>
      </header>

      <EditorialMatteReveal form="film-gate" start="top 92%" className="relative mx-auto w-[96vw] max-w-[1820px]">
        <div data-film data-depth-layer="back" className="relative overflow-hidden will-change-transform">
          <InlineVideo src={showreel.src} poster={showreel.poster} label="Cineheight production film" />
        </div>
      </EditorialMatteReveal>

      <section
        aria-label="What we bring"
        className="relative overflow-hidden"
        style={{ marginTop: mobile ? '10vh' : '14vh' }}
      >
        <ul className="relative">
          {about.capabilities.map((cap, i) => (
            <li
              key={cap}
              data-cap-word
              className="list-none whitespace-nowrap"
              style={{
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

      <section aria-label="How we work" className="flow-gutter relative" style={{ marginTop: mobile ? '10vh' : '14vh' }}>
        <ScrollHeadline
          as="h2"
          text={about.journey}
          className="font-display max-w-[18ch] font-bold text-text-100"
          style={{ fontSize: 'clamp(1.8rem, 4.6vw, 4.4rem)', lineHeight: 0.98, letterSpacing: '-0.03em' }}
          from={0.2}
        />
        <p className="font-body measure-wide mt-8 text-base leading-relaxed text-text-300 sm:text-lg">
          When one team owns strategy, design, content and campaigns, nothing gets lost between agencies.
        </p>
        <p className="font-body measure-wide mt-4 text-sm leading-relaxed text-text-500">
          We work out of {contact.location}, with brands anywhere.
        </p>
      </section>

      <section aria-label="Capabilities and process" className="flow-gutter relative" style={{ marginTop: mobile ? '10vh' : '14vh' }}>
        <KineticLabel text="THE DISCIPLINES" />
        <ol className="mt-8">
          {services.map((s) => (
            <li
              key={s.id}
              data-row
              className="flex list-none flex-col gap-x-12 gap-y-1 border-b py-5 lg:flex-row lg:items-baseline"
              style={{ opacity: reduced ? 1 : undefined, borderColor: 'var(--border)' }}
            >
              <span className="font-body w-12 shrink-0 text-[11px] text-text-500" style={{ letterSpacing: '0.22em' }}>
                {s.index}
              </span>
              <h3
                className="font-display w-full max-w-[16ch] shrink-0 font-bold text-text-100"
                style={{ fontSize: 'clamp(1.35rem, 2.8vw, 2.1rem)', lineHeight: 1.02, letterSpacing: '-0.02em' }}
              >
                {s.title}
              </h3>
              <p className="sr-only">{s.description}</p>
            </li>
          ))}
        </ol>

        <div style={{ marginTop: mobile ? '8vh' : '11vh' }}>
          <KineticLabel text="HOW IT FLOWS" />
          <ol className="mt-8 flex flex-wrap gap-x-[clamp(2rem,6vw,6rem)] gap-y-8">
            {processSteps.map((step, i) => (
              <li
                key={step.index}
                data-row
                className="max-w-[22ch] list-none"
                style={{ marginTop: i % 2 ? '1.5rem' : 0, opacity: reduced ? 1 : undefined }}
              >
                <p className="font-display text-sm font-medium" style={{ color: 'var(--blue-400)', letterSpacing: '0.2em' }}>
                  {step.index}
                </p>
                <h3
                  className="font-display mt-3 font-bold uppercase text-text-100"
                  style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.5rem)', lineHeight: 0.98, letterSpacing: '-0.025em' }}
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

      <section
        aria-label="Start a project"
        data-depth-layer="front"
        className="flow-gutter relative"
        style={{ marginTop: mobile ? '10vh' : '14vh' }}
      >
        <ScrollHeadline
          as="h2"
          text={closing.question}
          accent={['RISE']}
          className="font-display max-w-[15ch] font-bold uppercase text-text-100"
          style={{ fontSize: 'clamp(2.2rem, 7.4vw, 7rem)', lineHeight: 0.9, letterSpacing: '-0.035em' }}
          from={0.2}
          end="top 38%"
        />
        <div className="mt-10 flex flex-wrap items-center gap-x-12 gap-y-6">
          <MagneticLink
            href="/contact"
            className="group font-display inline-flex min-h-[52px] items-center rounded-full border px-8 py-3.5 text-[13px] font-medium uppercase text-text-100 transition-colors duration-300 hover:border-[var(--blue-400)] hover:text-[var(--blue-200)]"
            style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)' }}
          >
            Start a project
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
          </MagneticLink>
          <a
            href={`mailto:${contact.email}`}
            className="font-body flex min-h-[44px] items-center text-sm text-text-300 transition-colors hover:text-text-100"
          >
            {contact.email}
          </a>
        </div>
        <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    </main>
  )
}
