import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FlowDirector from '@/components/flow/FlowDirector'
import ContactPage from '@/components/pages/ContactPage'

export const metadata: Metadata = {
  title: 'Start a Branding or Marketing Project | CINEHEIGHT.media',
  description:
    'Start a project with Cineheight Media — email grow@cineheight.com, call +91 8308765466, or reach us on WhatsApp and Instagram. Kankavli, Maharashtra.',
  alternates: { canonical: '/contact' },
}

export default function Page() {
  return (
    <>
      <span id="top" />
      <FlowDirector />
      <Navbar />
      <div className="layer-content">
        <ContactPage />
        <Footer />
      </div>
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
