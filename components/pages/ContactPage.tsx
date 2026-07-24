'use client'

import Reveal from '@/components/ui/Reveal'
import { contact, closing } from '@/content/siteContent'

/**
 * Contact page (spec §28) — real channels only. The old project's form only
 * simulated success (no endpoint exists anywhere), so no form ships: honest
 * email / phone / WhatsApp / Instagram paths instead (docs/ROUTE-MAP.md).
 */
export default function ContactPage() {
  const channels = [
    { label: 'Email', value: contact.email, href: `mailto:${contact.email}`, hint: 'Best for project briefs — tell us where your brand is and where it should be.' },
    { label: 'Phone', value: contact.phone, href: contact.phoneHref, hint: 'Mon–Sat, IST business hours.' },
    { label: 'WhatsApp', value: contact.phone, href: contact.whatsapp, hint: 'Quick questions and voice notes welcome.', external: true },
    { label: 'Instagram', value: contact.instagramHandle, href: contact.instagramUrl, hint: 'Our latest work, as it ships.', external: true },
  ]

  return (
    <main className="relative">
      <header className="mx-auto w-full max-w-[1500px] px-6 pb-[6vh] pt-32 sm:px-10 lg:px-14 lg:pt-40">
        <Reveal variant="fade-up">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Contact
          </span>
          <h1
            className="font-display mt-6 max-w-4xl font-bold uppercase text-text-100"
            style={{ fontSize: 'clamp(2rem, 4.8vw, 4.6rem)', lineHeight: 1.04, letterSpacing: '-0.01em' }}
          >
            {closing.cta}
          </h1>
          <p className="font-body mt-7 max-w-xl text-base leading-relaxed text-text-300">
            One conversation is enough to find out whether we are the right team for your brand. Reach us on any channel —
            a real person answers, not a ticket queue.
          </p>
        </Reveal>
      </header>

      <section aria-label="Contact channels" className="mx-auto w-full max-w-[1500px] px-6 pb-[10vh] sm:px-10 lg:px-14">
        <ul className="grid grid-cols-1 gap-x-14 md:grid-cols-2">
          {channels.map((ch, i) => (
            <Reveal key={ch.label} as="li" variant="fade-up" delay={(i % 2) * 0.08} className="list-none border-t" style={{ borderColor: 'var(--border)' }}>
              <a
                href={ch.href}
                {...(ch.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group block py-7"
              >
                <p className="font-display text-[11px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.28em' }}>
                  {ch.label}
                </p>
                <p className="font-display mt-3 text-xl font-bold text-text-100 transition-colors duration-300 group-hover:text-[var(--blue-200)] sm:text-2xl">
                  {ch.value}
                </p>
                <p className="font-body mt-2.5 max-w-sm text-sm leading-relaxed text-text-500">{ch.hint}</p>
              </a>
            </Reveal>
          ))}
        </ul>
      </section>

      <section aria-label="Location" className="mx-auto w-full max-w-[1500px] px-6 pb-[14vh] sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="border-t pt-8" style={{ borderColor: 'var(--border)' }}>
          <p className="font-display text-[11px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.28em' }}>
            Studio
          </p>
          <p className="font-body mt-3 text-base text-text-200">{contact.location}</p>
          <p className="font-body mt-2 max-w-md text-sm leading-relaxed text-text-500">
            Rooted in Konkan, working with brands anywhere.
          </p>
        </Reveal>
      </section>
    </main>
  )
}
