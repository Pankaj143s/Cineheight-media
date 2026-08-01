import Navbar from '@/components/Navbar'
import HeroIntroSequence from '@/components/hero/HeroIntroSequence'
import ShowreelSection from '@/components/showreel/ShowreelSection'
import FlowDirector from '@/components/flow/FlowDirector'
import ClientMarquee from '@/components/home/ClientMarquee'
import FeaturedWorkJourney from '@/components/home/FeaturedWorkJourney'
import HomeCapabilities from '@/components/home/HomeCapabilities'
import ClientStories from '@/components/home/ClientStories'
import ClosingScene from '@/components/home/ClosingScene'

/**
 * Homepage narrative (Hybrid B):
 *   hero → showreel → selected work (proof early)
 *   → brands → offering (merged what-we-do + capabilities)
 *   → client stories → closing
 *
 * Process lives on /about. Phone-reel / creative orbit stay on case studies.
 */
export default function Home() {
  return (
    <>
      <span id="top" />
      <FlowDirector />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="layer-content scroll-mt-24 outline-none">
        <HeroIntroSequence />
        <ShowreelSection />
        <FeaturedWorkJourney />
        <ClientMarquee />
        <HomeCapabilities />
        <ClientStories />
        <ClosingScene />
      </main>
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
