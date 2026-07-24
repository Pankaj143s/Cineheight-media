'use client'

import Link from 'next/link'
import Reveal from '@/components/ui/Reveal'
import InlineVideo from '@/components/media/InlineVideo'
import { about, services, processSteps, closing, contact } from '@/content/siteContent'
import { showreel } from '@/content/siteContent'

/**
 * About page (spec §28) — verified positioning only, typography-led, with the
 * real showreel film as the single piece of about media (the old live site
 * used the same film for its about section; no team stock imagery exists).
 */
export default function AboutPage() {
  return (
    <main className="relative">
      <header className="mx-auto w-full max-w-[1500px] px-6 pb-[8vh] pt-32 sm:px-10 lg:px-14 lg:pt-40">
        <Reveal variant="fade-up">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            About
          </span>
          <h1
            className="font-display mt-6 max-w-4xl font-bold text-text-100"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 4.8rem)', lineHeight: 1.04, letterSpacing: '-0.015em' }}
          >
            Everything a brand needs.
            <br />
            <span style={{ color: 'var(--blue-500)' }}>One team.</span>
          </h1>
          <p className="font-body mt-7 max-w-xl text-base leading-relaxed text-text-300 sm:text-lg">{about.supporting}</p>
        </Reveal>
      </header>

      {/* the real film — same footage the old live site used for About */}
      <section aria-label="Cineheight in motion" className="mx-auto w-[94vw] max-w-[1700px] pb-[12vh]">
        <Reveal variant="fade-up" amount={0.15}>
          <InlineVideo src={showreel.src} poster={showreel.poster} label="Cineheight production film" className="rounded-sm" />
        </Reveal>
      </section>

      {/* one-team journey + capabilities */}
      <section aria-label="How we work" className="mx-auto w-full max-w-[1500px] px-6 pb-[12vh] sm:px-10 lg:px-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal variant="fade-up" className="lg:col-span-6">
            <h2 className="font-display font-bold text-text-100" style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.8rem)', lineHeight: 1.1 }}>
              {about.journey}
            </h2>
            <p className="font-body mt-6 max-w-lg text-[15px] leading-relaxed text-text-300">
              When one team owns strategy, design, content and campaigns, nothing gets lost between agencies — the idea that wins
              the pitch is the idea that ships.
            </p>
          </Reveal>
          <div className="lg:col-span-5 lg:col-start-8">
            <ul aria-label="What we bring">
              {about.capabilities.map((cap, i) => (
                <Reveal
                  key={cap}
                  as="li"
                  variant="fade-up"
                  delay={i * 0.08}
                  className="flex list-none items-center gap-4 border-b py-4"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span aria-hidden="true" className="h-1 w-1 rounded-full" style={{ background: 'var(--blue-500)' }} />
                  <span className="font-display text-sm font-medium text-text-200" style={{ letterSpacing: '0.06em' }}>
                    {cap}
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* capabilities list (the six services, compact) */}
      <section aria-label="Capabilities" className="mx-auto w-full max-w-[1500px] px-6 pb-[12vh] sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="mb-8">
          <h2 className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            What we do
          </h2>
        </Reveal>
        <ul className="grid grid-cols-1 gap-x-14 sm:grid-cols-2">
          {services.map((s, i) => (
            <Reveal key={s.id} as="li" variant="fade-up" delay={(i % 2) * 0.08} className="flex list-none items-baseline gap-5 border-t py-5" style={{ borderColor: 'var(--border)' }}>
              <span className="font-body text-[11px] text-text-500" style={{ letterSpacing: '0.2em' }}>
                {s.index}
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-text-100">{s.title}</h3>
                <p className="font-body mt-1.5 text-sm leading-relaxed text-text-300">{s.description}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* process, compact */}
      <section aria-label="Process" className="mx-auto w-full max-w-[1500px] px-6 pb-[14vh] sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="mb-8">
          <h2 className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            How it flows
          </h2>
        </Reveal>
        <ol className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4">
          {processSteps.map((step, i) => (
            <Reveal key={step.index} as="li" variant="fade-up" delay={i * 0.08} className="list-none">
              <p className="font-display text-sm font-medium" style={{ color: 'var(--blue-400)', letterSpacing: '0.2em' }}>
                {step.index}
              </p>
              <h3 className="font-display mt-2.5 text-lg font-bold text-text-100">{step.title}</h3>
              <p className="font-body mt-2 text-sm leading-relaxed text-text-300">{step.description}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* closing CTA */}
      <section aria-label="Start a project" className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto w-full max-w-[1500px] px-6 py-[10vh] sm:px-10 lg:px-14">
          <Reveal variant="fade-up">
            <h2 className="font-display max-w-3xl font-bold uppercase text-text-100" style={{ fontSize: 'clamp(1.7rem, 3.6vw, 3.4rem)', lineHeight: 1.05 }}>
              {closing.question}
            </h2>
            <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4">
              <Link
                href="/contact"
                className="group inline-flex min-h-[48px] items-center gap-4 rounded-full border px-7 py-3.5 font-display text-[13px] font-medium uppercase text-text-100 transition-colors duration-300 hover:border-[var(--blue-400)] hover:text-[var(--blue-200)]"
                style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)' }}
              >
                Start a Project
                <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
                  <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </Link>
              <a href={`mailto:${contact.email}`} className="font-body min-h-[44px] py-2 text-sm text-text-300 transition-colors hover:text-text-100">
                {contact.email}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
