import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FlowDirector from '@/components/flow/FlowDirector'
import AboutPage from '@/components/pages/AboutPage'

export const metadata: Metadata = {
  title: 'About CINEHEIGHT.media — Creative Strategy & Brand Growth',
  description:
    'Cineheight Media is a branding, content and digital-growth agency in Kankavli, Maharashtra. Strategy, design, content and campaigns — under one roof.',
  alternates: { canonical: '/about' },
}

export default function Page() {
  return (
    <>
      <span id="top" />
      <FlowDirector />
      <Navbar />
      <AboutPage />
      <Footer />
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
