import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ContactPage from '@/components/pages/ContactPage'

export const metadata: Metadata = {
  title: 'Contact — Let’s Build Your Brand | CINEHEIGHT.media',
  description:
    'Start a project with Cineheight Media — email grow@cineheight.com, call +91 8308765466, or reach us on WhatsApp and Instagram. Kankavli, Maharashtra.',
  alternates: { canonical: '/contact' },
}

export default function Page() {
  return (
    <>
      <span id="top" />
      <Navbar />
      <ContactPage />
      <Footer />
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
