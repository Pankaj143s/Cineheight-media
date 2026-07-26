import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FlowDirector from '@/components/flow/FlowDirector'
import WorkIndex from '@/components/work/WorkIndex'

export const metadata: Metadata = {
  title: 'Work — Real Client Case Studies | CINEHEIGHT.media',
  description:
    'Sapale Yamaha, Sindhudurg Education Society and Divija Old Age Home — real strategy, content and campaign work with verified results.',
  alternates: { canonical: '/work' },
}

export default function Page() {
  return (
    <>
      <span id="top" />
      <FlowDirector />
      <Navbar />
      <WorkIndex />
      <Footer />
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
