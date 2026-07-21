import Navbar from '@/components/Navbar'
import HeroIntroSequence from '@/components/hero/HeroIntroSequence'

export default function Home() {
  return (
    <>
      <span id="top" />
      <Navbar />
      <main>
        <HeroIntroSequence />

        {/* Phases 3–6 build here: capability line, showreel, trusted clients,
            featured work, reels, posts, services, process, about,
            testimonials, contact, footer — one continuous canvas. */}
        <div aria-hidden="true" className="h-[60vh]" />
      </main>
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
