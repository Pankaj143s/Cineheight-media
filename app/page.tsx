import Navbar from '@/components/Navbar'
import HeroIntroSequence from '@/components/hero/HeroIntroSequence'
import ShowreelSection from '@/components/showreel/ShowreelSection'
import SignalField from '@/components/signal/SignalField'

export default function Home() {
  return (
    <>
      <span id="top" />
      {/* Continuous background signal route — fixed, behind all content (z-0). */}
      <SignalField />
      <Navbar />
      {/* Content sits above the signal (z-10). */}
      <main className="relative z-10">
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
