'use client'

import Link from 'next/link'
import Image from 'next/image'
import Reveal from '@/components/ui/Reveal'
import { services, closing, contact } from '@/content/siteContent'

/**
 * Services page (spec §28) — the six approved services with deeper verified
 * descriptions and the final approved artwork, in alternating editorial rows.
 * No pricing (none exists). Ends on the contact CTA.
 */
export default function ServicesPage() {
  return (
    <main className="relative">
      <header className="mx-auto w-full max-w-[1500px] px-6 pb-[8vh] pt-32 sm:px-10 lg:px-14 lg:pt-40">
        <Reveal variant="fade-up">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Services
          </span>
          <h1
            className="font-display mt-6 max-w-4xl font-bold text-text-100"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 4.8rem)', lineHeight: 1.04, letterSpacing: '-0.015em' }}
          >
            Six disciplines.
            <br />
            One connected system.
          </h1>
          <p className="font-body mt-7 max-w-xl text-base leading-relaxed text-text-300">
            Strategy, design, content and campaigns work best when they are built together — every service below feeds the next.
          </p>
        </Reveal>
      </header>

      <section aria-label="Service details" className="mx-auto w-full max-w-[1680px] px-6 pb-[10vh] sm:px-10 lg:px-14">
        {services.map((service, i) => (
          <article key={service.id} aria-label={service.title} className="border-t py-[6vh]" style={{ borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-14">
              <div className={`lg:col-span-6 ${i % 2 === 1 ? 'lg:order-2 lg:col-start-7' : ''}`}>
                <Reveal variant="fade-up" amount={0.2}>
                  <figure className="relative w-full overflow-hidden rounded-sm" style={{ aspectRatio: '16 / 10' }}>
                    <Image
                      src={service.image}
                      alt=""
                      fill
                      sizes="(max-width: 1023px) 94vw, 48vw"
                      className="object-cover"
                    />
                    <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(2,3,6,0.3), transparent 50%)' }} />
                  </figure>
                </Reveal>
              </div>
              <div className={`lg:col-span-5 ${i % 2 === 1 ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-8'}`}>
                <Reveal variant="fade-up" delay={0.08}>
                  <p className="font-body text-[11px] text-text-500" style={{ letterSpacing: '0.24em' }}>
                    {service.index}
                  </p>
                  <h2 className="font-display mt-3 font-bold text-text-100" style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.4rem)', lineHeight: 1.12 }}>
                    {service.title}
                  </h2>
                  <p className="font-body mt-5 max-w-md text-[15px] leading-relaxed text-text-300">{service.description}</p>
                  <p className="font-body mt-4 max-w-md text-sm leading-relaxed text-text-500">{service.detail}</p>
                </Reveal>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section aria-label="Start a project" className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto w-full max-w-[1500px] px-6 py-[10vh] sm:px-10 lg:px-14">
          <Reveal variant="fade-up">
            <h2 className="font-display max-w-3xl font-bold uppercase text-text-100" style={{ fontSize: 'clamp(1.7rem, 3.6vw, 3.4rem)', lineHeight: 1.05 }}>
              {closing.cta}
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
              <a href={contact.phoneHref} className="font-body min-h-[44px] py-2 text-sm text-text-300 transition-colors hover:text-text-100">
                {contact.phone}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
