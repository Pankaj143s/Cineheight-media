'use client'

import { services } from '@/content/siteContent'
import ServiceChapter, { type ChapterVariant } from '@/components/services/ServiceChapter'
import KineticLabel from '@/components/motion/KineticLabel'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import { useIsMobileTier } from '@/lib/useMediaPreferences'

/**
 * Six services as one vertical journey. No two-column card grid, no dividers,
 * no repeated layout — the compositions rotate through six related shapes
 * while the numeral, title scale, copy rhythm and pointer response stay
 * constant, so it still reads as one system.
 */
const VARIANTS: ChapterVariant[] = [
  'media-right',
  'media-left',
  'wide-crop',
  'vertical-type',
  'type-led',
  'full-bleed',
]

const ANCHORS = ['right', 'left', 'edge-right', 'left', 'center', 'edge-left'] as const

export default function ServicesJourney() {
  const mobile = useIsMobileTier()

  return (
    <section id="services" aria-label="Services" className="relative z-10" style={{ marginTop: mobile ? '6vh' : '2vh' }}>
      {/* The journey's one statement — the first chapter's artwork rises past
          it rather than starting below it. */}
      <div className="flow-gutter relative z-10 max-w-[24ch]">
        <KineticLabel text="UNDER ONE ROOF" />
        <ScrollHeadline
          as="h2"
          text="Everything a brand needs to rise — under one roof."
          accent={['rise']}
          className="font-display mt-6 font-bold uppercase text-text-100"
          style={{ fontSize: 'clamp(2.1rem, 5.6vw, 5.4rem)', lineHeight: 0.94, letterSpacing: '-0.03em' }}
        />
      </div>

      <div style={{ marginTop: mobile ? '2vh' : '-6vh' }}>
        {services.map((service, i) => (
          <ServiceChapter
            key={service.id}
            service={service}
            variant={VARIANTS[i]}
            index={i}
            flowAnchor={ANCHORS[i]}
          />
        ))}
      </div>
    </section>
  )
}
