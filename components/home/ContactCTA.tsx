'use client'

import Link from 'next/link'
import Reveal from '@/components/ui/Reveal'
import { contact, closing } from '@/content/siteContent'

/**
 * Contact CTA (spec §22) — the direct, confident ending. No contact form here:
 * the old project's form only simulated success (no endpoint exists), so the
 * honest path is real channels — email, phone, WhatsApp, Instagram — plus the
 * Start a Project route. Documented in docs/ROUTE-MAP.md.
 */
export default function ContactCTA() {
  return (
    <section id="contact" aria-label="Start a project" className="relative pb-[14vh] pt-[4vh]">
      {/* the last concentration of blue light — the journey's destination */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 52% 40% at 50% 62%, rgba(0,137,255,0.07), transparent 72%)' }}
      />
      <div className="relative mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <Reveal variant="fade-up">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Next
          </span>
          <h2
            className="font-display mt-6 max-w-4xl font-bold uppercase text-text-100"
            style={{ fontSize: 'clamp(2rem, 5vw, 4.8rem)', lineHeight: 1.02, letterSpacing: '-0.01em' }}
          >
            {closing.question}
          </h2>
        </Reveal>

        <Reveal variant="fade-up" delay={0.15} className="mt-10">
          <Link
            href="/contact"
            className="group inline-flex min-h-[52px] items-center gap-4 rounded-full border px-8 py-4 font-display text-sm font-medium uppercase text-text-100 transition-colors duration-300 hover:border-[var(--blue-400)] hover:text-[var(--blue-200)]"
            style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)', background: 'rgba(0,137,255,0.06)' }}
          >
            {closing.cta}
            <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
              <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </Link>
        </Reveal>

        <Reveal variant="fade" delay={0.3} className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-4">
          <a href={`mailto:${contact.email}`} className="font-body min-h-[44px] py-2 text-sm text-text-300 transition-colors hover:text-text-100">
            {contact.email}
          </a>
          <a href={contact.phoneHref} className="font-body min-h-[44px] py-2 text-sm text-text-300 transition-colors hover:text-text-100">
            {contact.phone}
          </a>
          <a
            href={contact.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body min-h-[44px] py-2 text-sm text-text-300 transition-colors hover:text-text-100"
          >
            Instagram {contact.instagramHandle}
          </a>
        </Reveal>
      </div>
    </section>
  )
}
