'use client'

import { useMemo, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import PhoneReelExperience from '@/components/media/PhoneReelExperience'
import type { PhoneReelItem } from '@/components/media/PhoneReelShell'
import { contact } from '@/content/siteContent'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The handoff from the work sequence into the reel installation.
 *
 * As the work stage's final frame contracts, two vertical guides close in from
 * the sides and become the outermost phone silhouettes — the phones rise out of
 * the same spatial centre the film just vacated, rather than a new section
 * starting below it.
 *
 * Homepage set: every REAL reel across all three clients (7 of them). The two
 * Divija reels the client never supplied appear only on that project's own
 * case-study page, where the gap belongs.
 */
export default function ReelsScene() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  const reels = useMemo<PhoneReelItem[]>(
    () =>
      caseStudies.flatMap((cs) =>
        cs.reels
          .filter((r) => !r.isPlaceholder && r.src)
          .map((r) => ({
            id: `${cs.id}-${r.title}`,
            title: r.title,
            src: r.src,
            poster: r.poster ?? cs.thumbnail,
            client: cs.client,
            accent: cs.accentColor,
          }))
      ),
    []
  )

  useIsomorphicLayoutEffect(() => {
    if (reduced || mobile) return
    const ctx = gsap.context((self) => {
      const guides = self.selector!('[data-guide]') as HTMLElement[]
      if (!guides.length) return
      // The guides sweep inward to the phone edges as the scene arrives, then
      // dissolve once the coverflow owns the space.
      gsap.fromTo(
        guides,
        { scaleY: 0, autoAlpha: 0 },
        {
          scaleY: 1,
          autoAlpha: 0.5,
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, start: 'top 92%', end: 'top 34%', scrub: 0.8 },
        }
      )
      gsap.to(guides, {
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: rootRef.current, start: 'top 30%', end: 'top 4%', scrub: 0.8 },
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  if (reels.length === 0) return null

  return (
    <section
      ref={rootRef}
      id="reels"
      aria-label="Short-form reels"
      className="relative z-10"
      // Rides up into the work sequence's closing frame — no gap between them.
      style={{ marginTop: mobile ? '-2vh' : '-14vh' }}
    >
      {/* the contracting film's edges, becoming phone silhouettes */}
      {!mobile && !reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[46vh]">
          <span
            data-guide
            className="absolute left-[26%] top-0 h-full w-px origin-bottom"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,137,255,0.5))' }}
          />
          <span
            data-guide
            className="absolute right-[26%] top-0 h-full w-px origin-bottom"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,137,255,0.5))' }}
          />
        </div>
      )}

      <PhoneReelExperience
        reels={reels}
        handle={contact.instagramHandle.replace('@', '')}
        eyebrow="SHORT-FORM STORYTELLING"
        headingLines={['Built to stop', 'the scroll.']}
        heading="Built to stop the scroll."
        label="Client reels"
        flowAnchor="edge-right"
      />
    </section>
  )
}
