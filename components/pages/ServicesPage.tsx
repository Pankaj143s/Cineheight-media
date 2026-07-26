'use client'

import { services, closing, contact } from '@/content/siteContent'
import ServiceChapter, { type ChapterVariant } from '@/components/services/ServiceChapter'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import MagneticLink from '@/components/ui/MagneticLink'
import { useIsMobileTier } from '@/lib/useMediaPreferences'

/**
 * The six services as one continuous journey. Same system as the homepage's
 * services beat but carrying the deeper `detail` copy and a different rotation
 * of compositions, so the two routes never read as the same page twice — and
 * the last chapter runs straight into the closing statement with no divider.
 */
const VARIANTS: ChapterVariant[] = [
  'wide-crop',
  'media-right',
  'type-led',
  'media-left',
  'vertical-type',
  'full-bleed',
]

const ANCHORS = ['edge-right', 'left', 'center', 'right', 'left', 'edge-left'] as const

export default function ServicesPage() {
  const mobile = useIsMobileTier()

  return (
    <main className="relative z-10">
      <header className="flow-gutter relative pb-[4vh] pt-32 lg:pt-40">
        <KineticLabel text="WHAT WE DO" />
        <SplitLineReveal
          as="h1"
          lines={['Six disciplines.', 'One connected', 'system.']}
          srLabel="Six disciplines. One connected system."
          className="font-display mt-6 font-bold uppercase text-text-100"
          style={{ fontSize: 'clamp(2.4rem, 8vw, 7.4rem)', lineHeight: 0.9, letterSpacing: '-0.035em' }}
        />
        <p className="font-body measure mt-8 text-base leading-relaxed text-text-300">
          Strategy, design, content and campaigns work best when they are built together — every service below feeds
          the next.
        </p>
      </header>

      <div style={{ marginTop: mobile ? '2vh' : '-4vh' }}>
        {services.map((service, i) => (
          <ServiceChapter
            key={service.id}
            service={service}
            variant={VARIANTS[i]}
            index={i}
            showDetail
            flowAnchor={ANCHORS[i]}
          />
        ))}
      </div>

      {/* the last chapter runs straight into the ask — no rule, no new band */}
      <section aria-label="Start a project" className="flow-gutter relative" style={{ marginTop: mobile ? '10vh' : '16vh' }}>
        <ScrollHeadline
          as="h2"
          text={closing.cta}
          accent={['BRAND.']}
          className="font-display max-w-[14ch] font-bold uppercase text-text-100"
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
          <a href={contact.phoneHref} className="font-body flex min-h-[44px] items-center text-sm text-text-300 transition-colors hover:text-text-100">
            {contact.phone}
          </a>
          <a href={`mailto:${contact.email}`} className="font-body flex min-h-[44px] items-center text-sm text-text-300 transition-colors hover:text-text-100">
            {contact.email}
          </a>
        </div>
        <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    </main>
  )
}
