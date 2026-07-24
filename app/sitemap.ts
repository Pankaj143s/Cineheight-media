import type { MetadataRoute } from 'next'
import { caseStudies } from '@/content/caseStudies'

const BASE = 'https://cineheight.media'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/work`, changeFrequency: 'monthly', priority: 0.9 },
    ...caseStudies.map((cs) => ({
      url: `${BASE}/work/${cs.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/services`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/about`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${BASE}/contact`, changeFrequency: 'yearly', priority: 0.7 },
  ]
}
