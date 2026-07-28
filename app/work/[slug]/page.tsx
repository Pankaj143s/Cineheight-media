import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FlowDirector from '@/components/flow/FlowDirector'
import CaseStudyPage from '@/components/case-study/CaseStudyPage'
import { caseStudies, getCaseStudy } from '@/content/caseStudies'

export function generateStaticParams() {
  return caseStudies.map((cs) => ({ slug: cs.id }))
}

// Next 16 hands route params to the segment as a promise, so both entry points
// await them before use.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cs = getCaseStudy(slug)
  if (!cs) return {}
  return {
    // Real client name, real project category, and the verified hook — no
    // invented claims and no keyword stuffing.
    title: `${cs.client} — ${cs.category} Case Study | CINEHEIGHT.media`,
    description: `${cs.tagline}. ${cs.hook} A ${cs.category.toLowerCase()} project delivered by Cineheight in ${cs.year}.`,
    alternates: { canonical: `/work/${cs.id}` },
    openGraph: {
      title: `${cs.client} — ${cs.tagline}`,
      description: cs.hook,
      url: `/work/${cs.id}`,
      images: [{ url: cs.thumbnail, width: 1080, height: 1080, alt: `${cs.client} campaign work` }],
    },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cs = getCaseStudy(slug)
  if (!cs) notFound()

  return (
    <>
      <span id="top" />
      {/* The route atmosphere carries this client's accent — the only place
          their colour appears at page scale. */}
      <FlowDirector accent={cs.accentColor} />
      <Navbar />
      <CaseStudyPage slug={slug} />
      <Footer />
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
