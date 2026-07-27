import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FlowDirector from '@/components/flow/FlowDirector'
import ServicesPage from '@/components/pages/ServicesPage'

export const metadata: Metadata = {
  title: 'Branding, Social Media, Video & Performance Marketing Services',
  description:
    'Brand identity, social media management, graphic design, video production, performance marketing and content creation — six disciplines, one connected system.',
  alternates: { canonical: '/services' },
}

export default function Page() {
  return (
    <>
      <span id="top" />
      <FlowDirector />
      <Navbar />
      <ServicesPage />
      <Footer />
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
