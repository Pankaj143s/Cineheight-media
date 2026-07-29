import Navbar from '@/components/Navbar'
import HeroIntroSequence from '@/components/hero/HeroIntroSequence'
import ShowreelSection from '@/components/showreel/ShowreelSection'
import FlowDirector from '@/components/flow/FlowDirector'
import AgencyProposition from '@/components/home/AgencyProposition'
import ClientMarquee from '@/components/home/ClientMarquee'
import FeaturedWorkJourney from '@/components/home/FeaturedWorkJourney'
import HomeCapabilities from '@/components/home/HomeCapabilities'
import ProcessCompact from '@/components/home/ProcessCompact'
import ClientStories from '@/components/home/ClientStories'
import ClosingScene from '@/components/home/ClosingScene'

/**
 * The homepage answers, in order and without needing another page:
 * who Cineheight is, what it sells, what the work looks like, what it
 * achieved, who trusts it, and how to start.
 *
 *   hero → showreel                  (approved, untouched)
 *   → WHAT WE DO                     the proposition, in plain English
 *   → BRANDS WE HAVE WORKED WITH     compact credibility
 *   → SELECTED WORK                  full-width work with verified metrics
 *   → HOW WE HELP BRANDS GROW        three service pillars
 *   → HOW WE WORK                    four beats, compactly
 *   → CLIENT STORIES                 the real recorded films
 *   → the closing ask + footer
 *
 * The phone-reel coverflow and the creative orbit deliberately do NOT appear
 * here — they are installations that belong to the individual case studies,
 * and on the front door they buried the offering. The components are unchanged
 * and still used by /work/[slug].
 *
 * The scenes carry readable labels but no boxed headers, no repeated container
 * and no equal gaps: each overlaps the last, and the atmosphere, signal thread
 * and pointer field (FlowDirector) run continuously behind all of them.
 */
export default function Home() {
  return (
    <>
      <span id="top" />
      <FlowDirector />
      <Navbar />
      {/* `.layer-content` = position:relative + z-index:var(--z-content) +
          isolation:isolate. The isolation seals every internal stacking context
          inside this layer, so the flow thread (z var(--z-thread)) can never
          surface through a section, and no section can rise above the navbar. */}
      <main className="layer-content">
        <HeroIntroSequence />
        <ShowreelSection />
        <AgencyProposition />
        <ClientMarquee />
        <FeaturedWorkJourney />
        <HomeCapabilities />
        <ProcessCompact />
        <ClientStories />
        <ClosingScene />
      </main>
      <div className="grain-overlay" aria-hidden="true" />
    </>
  )
}
