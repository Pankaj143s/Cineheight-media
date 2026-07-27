'use client'

import Image from 'next/image'
import Link from 'next/link'
import SocialIconLink from '@/components/ui/SocialIconLink'
import { closing, contact, navItems, socialLinks } from '@/content/siteContent'

export default function Footer({ variant = 'standalone' }: { variant?: 'standalone' | 'integrated' }) {
  const year = new Date().getFullYear()
  const integrated = variant === 'integrated'
  return (
    <footer
      data-interaction-quiet
      data-parallax-y={integrated ? '0.035' : undefined}
      aria-label="Site footer"
      className="relative z-10 pb-8"
      style={{ paddingTop: integrated ? 'clamp(3rem, 7vh, 6rem)' : '7vh' }}
    >
      <div className={integrated ? 'flow-gutter' : 'mx-auto w-full max-w-[1800px] px-6 sm:px-10 lg:px-14'}>
        <div
          className="grid gap-x-10 gap-y-10 py-9 lg:grid-cols-12 lg:items-start"
          style={integrated ? undefined : { borderTop: '1px solid var(--border)' }}
        >
          <div className="lg:col-span-4">
            <Link href="/" aria-label="Cineheight home" className="inline-flex min-h-11 items-center">
              <Image
                src="/logos/brand/cineheight-logo-white.png"
                alt="CINEHEIGHT.media"
                width={786}
                height={120}
                className="h-auto w-[150px]"
              />
            </Link>
            <p className="font-body mt-5 max-w-sm text-sm leading-relaxed text-text-300">{closing.footerLine}</p>
          </div>

          <div className="lg:col-span-5">
            <p className="font-display text-[10px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.28em' }}>
              Start a project
            </p>
            <div className="mt-3 flex flex-col items-start gap-1">
              <a
                href={`mailto:${contact.email}`}
                className="group font-display inline-flex min-h-11 items-center text-xl text-text-100 sm:text-2xl"
              >
                <span>{contact.email}</span>
                <span className="ml-3 h-px w-8 origin-left bg-[var(--blue-500)] transition-transform duration-300 group-hover:scale-x-150" aria-hidden="true" />
              </a>
              <a
                href={contact.phoneHref}
                className="font-body inline-flex min-h-11 items-center text-base text-text-200 transition-colors hover:text-[var(--blue-200)]"
              >
                {contact.phone}
              </a>
            </div>
            <p className="font-body mt-4 text-xs text-text-500">{contact.location}</p>
          </div>

          <div className="lg:col-span-3">
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="font-display inline-flex min-h-11 items-center text-[11px] uppercase text-text-300 transition-colors hover:text-text-100"
                  style={{ letterSpacing: '0.18em' }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex items-center gap-2" aria-label="Social links">
              {socialLinks.map((link) => (
                <SocialIconLink key={link.platform} {...link} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
          <p className="font-body text-xs text-text-500">© {year} CINEHEIGHT.media. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a
              href={`mailto:${contact.directEmail}`}
              className="font-body inline-flex min-h-11 items-center text-xs text-text-500 transition-colors hover:text-text-200"
            >
              Direct: {contact.directEmail}
            </a>
            <a
              href="#top"
              aria-label="Back to top"
              className="font-display inline-flex min-h-11 items-center text-[11px] uppercase text-text-300 transition-colors hover:text-[var(--blue-200)]"
              style={{ letterSpacing: '0.18em' }}
            >
              Top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
