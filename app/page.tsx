import Navbar from '@/components/Navbar'
import HeroSection from '@/components/hero/HeroSection'
import BrandStatement from '@/components/BrandStatement'

export default function Home() {
  return (
    <>
      <span id="top" />
      <Navbar />
      <main>
        <HeroSection />
        <BrandStatement />

        {/* Phases 3–6 build here: capability line, showreel, trusted clients,
            featured work, reels, posts, services, process, about,
            testimonials, contact, footer — one continuous canvas. */}
        <div aria-hidden="true" className="h-[40vh]" />
      </main>
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
