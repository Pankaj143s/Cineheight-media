'use client'

import Link from 'next/link'
import Image from 'next/image'
import { caseStudies } from '@/content/caseStudies'
import Reveal from '@/components/ui/Reveal'

/**
 * Work index (spec §26) — a continuous editorial list, calmer than the
 * homepage: three large alternating entries with real poster media, client,
 * category, year and the verified headline metric. No equal card grid.
 */
export default function WorkIndex() {
  return (
    <main className="relative">
      <header className="mx-auto w-full max-w-[1500px] px-6 pb-[8vh] pt-32 sm:px-10 lg:px-14 lg:pt-40">
        <Reveal variant="fade-up">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Work
          </span>
          <h1
            className="font-display mt-6 max-w-3xl font-bold text-text-100"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 4.8rem)', lineHeight: 1.04, letterSpacing: '-0.015em' }}
          >
            Proof, not promises.
          </h1>
          <p className="font-body mt-7 max-w-xl text-base leading-relaxed text-text-300">
            Three brands, three journeys — strategy, content and campaigns that turned attention into measurable growth.
          </p>
        </Reveal>
      </header>

      <section aria-label="Case studies" className="mx-auto w-full max-w-[1680px] px-6 pb-[10vh] sm:px-10 lg:px-14">
        {caseStudies.map((cs, i) => (
          <article key={cs.id} aria-label={`${cs.client} case study`} className="border-t py-[7vh]" style={{ borderColor: 'var(--border)' }}>
            <Link href={`/work/${cs.id}`} className="group block">
              <div className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-14 ${i % 2 === 1 ? '' : ''}`}>
                <div className={`relative overflow-hidden rounded-sm lg:col-span-6 ${i % 2 === 1 ? 'lg:order-2 lg:col-start-7' : ''}`}>
                  <Reveal variant="fade-up" amount={0.2}>
                    <figure className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
                      <Image
                        src={cs.thumbnail}
                        alt={`${cs.client} campaign work`}
                        fill
                        sizes="(max-width: 1023px) 94vw, 48vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `${cs.accentColor}99` }} />
                    </figure>
                  </Reveal>
                </div>
                <div className={`lg:col-span-5 ${i % 2 === 1 ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-8'}`}>
                  <Reveal variant="fade-up" delay={0.08}>
                    <p className="font-display text-[11px] font-medium uppercase text-text-300" style={{ letterSpacing: '0.3em' }}>
                      {cs.client}
                    </p>
                    <p className="font-body mt-1.5 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.18em' }}>
                      {cs.category} — {cs.year}
                    </p>
                    <h2
                      className="font-display mt-5 font-bold text-text-100 transition-colors duration-300 group-hover:text-[var(--blue-200)]"
                      style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.4rem)', lineHeight: 1.12 }}
                    >
                      {cs.tagline}
                    </h2>
                    <p className="font-display mt-6 font-bold leading-none text-text-100" style={{ fontSize: 'clamp(1.9rem, 3vw, 3rem)' }}>
                      {cs.headlineStat.prefix}
                      {cs.headlineStat.value}
                      <span style={{ color: 'var(--blue-500)' }}>{cs.headlineStat.suffix}</span>
                      <span className="font-body ml-3 align-middle text-sm font-normal text-text-300">{cs.headlineStat.label}</span>
                    </p>
                    <span
                      className="font-display mt-7 inline-flex items-center gap-3 text-[12px] font-medium uppercase text-text-200 transition-colors duration-300 group-hover:text-[var(--blue-400)]"
                      style={{ letterSpacing: '0.24em' }}
                    >
                      View case study
                      <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
                        <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    </span>
                  </Reveal>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </section>
    </main>
  )
}
