'use client'

import type { FeaturedWorkCtaArgs } from '@/components/home/FeaturedWorkJourney'
import ScrollFillCta from '@/components/ui/ScrollFillCta'

/**
 * Selected Work CTA — inherits `--cta-expand` from the section scrub.
 * Previous pill: CaseStudyCtaPanel.tsx
 */
export default function CaseStudyScrollFillCta({
  href,
  clientName,
}: FeaturedWorkCtaArgs) {
  return (
    <ScrollFillCta
      href={href}
      fillMode="inherit"
      className="mt-7"
      aria-label={`View ${clientName} case study`}
    >
      View case study
    </ScrollFillCta>
  )
}
