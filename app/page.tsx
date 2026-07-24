import Navbar from '@/components/Navbar'
import HeroIntroSequence from '@/components/hero/HeroIntroSequence'
import ShowreelSection from '@/components/showreel/ShowreelSection'
import TrustedClients from '@/components/home/TrustedClients'
import FeaturedWork from '@/components/home/FeaturedWork'
import ReelsExperience from '@/components/home/ReelsExperience'
import PostsGallery from '@/components/home/PostsGallery'

export default function Home() {
  return (
    <>
      <span id="top" />
      <Navbar />
      <main>
        <HeroIntroSequence />
        <ShowreelSection />
        <TrustedClients />
        <FeaturedWork />
        <ReelsExperience />
        <PostsGallery />

        {/* Phases 3–4 continue here: services, process, about, testimonials,
            contact, footer — one continuous canvas. */}
        <div aria-hidden="true" className="h-[30vh]" />
      </main>
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
