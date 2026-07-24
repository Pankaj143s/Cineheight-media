'use client'

import Link from 'next/link'
import Reveal from '@/components/ui/Reveal'
import { contact, navItems, closing } from '@/content/siteContent'

/**
 * Footer (spec §23) — the same stage settling to rest. New design (not the old
 * footer): the Bebas wordmark bookends the hero's opening title, one quiet
 * utility line carries the real details, and motion reduces to a single soft
 * reveal. No fabricated legal links — none exist in the source project
 * (docs/ROUTE-MAP.md); the copyright line is the only legal text.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer aria-label="Site footer" className="relative overflow-hidden pb-10 pt-[6vh]">
      <div className="mx-auto w-full max-w-[1800px] px-6 sm:px-10 lg:px-14">
        <Reveal variant="fade" className="border-t pt-10" style={{ borderColor: 'var(--border)' }}>
          <p className="font-body max-w-sm text-sm leading-relaxed text-text-300">{closing.footerLine}</p>
        </Reveal>

        {/* the closing wordmark — hero typography returning to rest */}
        <Reveal variant="fade-up" amount={0.1} className="mt-10 select-none" aria-hidden="true">
          <p
            className="font-hero whitespace-nowrap leading-none"
            style={{
              fontSize: 'clamp(3.4rem, 12.4vw, 15rem)',
              letterSpacing: '0.012em',
              backgroundImage: 'linear-gradient(to bottom, #f5f7fa 30%, #7c838f 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            CINEHEIGHT
            <span className="font-display align-top" style={{ fontSize: '0.13em', letterSpacing: '0.5em', marginLeft: '-1.4em', color: 'var(--blue-400)', WebkitTextFillColor: 'var(--blue-400)' }}>
              MEDIA
            </span>
          </p>
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-10 gap-y-6 border-t pt-7" style={{ borderColor: 'var(--border)' }}>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-7 gap-y-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="font-display min-h-[44px] py-2 text-xs uppercase text-text-300 transition-colors duration-300 hover:text-text-100"
                style={{ letterSpacing: '0.18em' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
            <a href={`mailto:${contact.directEmail}`} className="font-body min-h-[44px] py-2 text-sm text-text-300 transition-colors duration-300 hover:text-text-100">
              {contact.directEmail}
            </a>
            <a href={contact.phoneHref} className="font-body min-h-[44px] py-2 text-sm text-text-300 transition-colors duration-300 hover:text-text-100">
              {contact.phone}
            </a>
            <a
              href={contact.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body min-h-[44px] py-2 text-sm text-text-300 transition-colors duration-300 hover:text-text-100"
            >
              Instagram
            </a>
            <a
              href="#top"
              className="font-display min-h-[44px] py-2 text-xs uppercase text-text-300 transition-colors duration-300 hover:text-text-100"
              style={{ letterSpacing: '0.18em' }}
              aria-label="Back to top"
            >
              Top ↑
            </a>
          </div>
        </div>

        <p className="font-body mt-6 text-xs text-text-500">
          © {year} CINEHEIGHT.media. All rights reserved. {contact.location}.
        </p>
      </div>
    </footer>
  )
}
