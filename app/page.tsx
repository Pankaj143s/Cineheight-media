import Navbar from '@/components/Navbar'
import HeroIntroSequence from '@/components/hero/HeroIntroSequence'
import ShowreelSection from '@/components/showreel/ShowreelSection'
import TrustedClients from '@/components/home/TrustedClients'
import FeaturedWork from '@/components/home/FeaturedWork'
import ReelsExperience from '@/components/home/ReelsExperience'
import PostsGallery from '@/components/home/PostsGallery'
import ServicesGrid from '@/components/home/ServicesGrid'
import ProcessFlow from '@/components/home/ProcessFlow'
import AboutSection from '@/components/home/AboutSection'
import Testimonials from '@/components/home/Testimonials'
import ContactCTA from '@/components/home/ContactCTA'
import Footer from '@/components/Footer'
import SignalField from '@/components/signal/SignalField'

export default function Home() {
  return (
    <>
      <span id="top" />
      {/* Continuous background signal route — fixed, behind all content. */}
      <SignalField />
      <Navbar />
      <main className="relative z-10">
        <HeroIntroSequence />
        <ShowreelSection />
        <TrustedClients />
        <FeaturedWork />
        <ReelsExperience />
        <PostsGallery />
        <ServicesGrid />
        <ProcessFlow />
        <AboutSection />
        <Testimonials />
        <ContactCTA />
      </main>
      <Footer />
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
