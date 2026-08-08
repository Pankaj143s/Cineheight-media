'use client'

import FeaturedWorkJourney from '@/components/home/FeaturedWorkJourney'
import CaseStudyScrollFillCta from '@/components/home/CaseStudyScrollFillCta'

/**
 * Homepage Selected Work: left copy + square scroll-fill CTA.
 * Restore pill CTA with: return <FeaturedWorkJourney />
 */
export default function FeaturedWorkSelected() {
  return (
    <FeaturedWorkJourney
      enableCtaExpandProgress
      ctaExpandEasing="ease-out"
      renderCta={(args) => <CaseStudyScrollFillCta {...args} />}
    />
  )
}
