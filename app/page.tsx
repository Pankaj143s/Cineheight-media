import Navbar from '@/components/Navbar'
import HeroIntroSequence from '@/components/hero/HeroIntroSequence'
import ShowreelSection from '@/components/showreel/ShowreelSection'

export default function Home() {
  return (
    <>
      <span id="top" />
      <Navbar />
      <main>
        <HeroIntroSequence />
        <ShowreelSection />

        {/* Phases 3–6 build here: trusted clients, featured work, reels,
            posts, services, process, about, testimonials, contact, footer —
            one continuous canvas. */}
        <div aria-hidden="true" className="h-[30vh]" />
      </main>
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
