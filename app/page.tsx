import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import HeroIntroSequence from '@/components/hero/HeroIntroSequence'
import ShowreelSection from '@/components/showreel/ShowreelSection'
import FlowDirector from '@/components/flow/FlowDirector'
import ClientTrustBridge from '@/components/home/ClientTrustBridge'
import FeaturedWorkJourney from '@/components/home/FeaturedWorkJourney'
import ServicesJourney from '@/components/home/ServicesJourney'
import ProcessJourney from '@/components/home/ProcessJourney'
import VoicesScene from '@/components/home/VoicesScene'
import ClosingScene from '@/components/home/ClosingScene'

// The two heavy interactive installations load on demand — they sit well below
// the fold and carry their own physics loops.
const ReelsScene = dynamic(() => import('@/components/home/ReelsScene'))
const CreativesScene = dynamic(() => import('@/components/home/CreativesScene'))

/**
 * The homepage is ONE composition, top to bottom.
 *
 *   hero → brand statement → showreel        (approved, untouched)
 *   → client field → work journey → phone reels → creative orbit
 *   → services journey → process journey → voices → closing + footer
 *
 * The scenes below carry no eyebrow-heading blocks, no repeated max-width
 * container and no equal vertical gaps: each one overlaps the last, and the
 * background, signal thread and pointer field (FlowDirector) run continuously
 * behind all of them.
 */
export default function Home() {
  return (
    <>
      <span id="top" />
      <FlowDirector />
      <Navbar />
      <main className="relative z-10">
        <HeroIntroSequence />
        <ShowreelSection />
        <ClientTrustBridge />
        <FeaturedWorkJourney />
        <ReelsScene />
        <CreativesScene />
        <ServicesJourney />
        <ProcessJourney />
        <VoicesScene />
        <ClosingScene />
      </main>
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
