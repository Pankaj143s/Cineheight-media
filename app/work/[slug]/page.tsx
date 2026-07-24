import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CaseStudyPage from '@/components/case-study/CaseStudyPage'
import { caseStudies, getCaseStudy } from '@/content/caseStudies'

export function generateStaticParams() {
  return caseStudies.map((cs) => ({ slug: cs.id }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const cs = getCaseStudy(params.slug)
  if (!cs) return {}
  return {
    title: `${cs.client} — Case Study | CINEHEIGHT.media`,
    description: `${cs.tagline}. ${cs.hook}`,
    alternates: { canonical: `/work/${cs.id}` },
    openGraph: {
      title: `${cs.client} — ${cs.tagline}`,
      description: cs.hook,
      url: `/work/${cs.id}`,
      images: [{ url: cs.thumbnail, width: 1080, height: 1080, alt: `${cs.client} campaign work` }],
    },
  }
}

export default function Page({ params }: { params: { slug: string } }) {
  const cs = getCaseStudy(params.slug)
  if (!cs) notFound()

  return (
    <>
      <span id="top" />
      <Navbar />
      <CaseStudyPage slug={params.slug} />
      <Footer />
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
