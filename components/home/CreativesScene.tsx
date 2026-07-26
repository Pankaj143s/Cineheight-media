'use client'

import { useMemo, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import CreativeOrbit, { type OrbitItem } from '@/components/media/CreativeOrbit'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Moving content becoming campaign systems: the phones tilt away and the static
 * creatives assemble into the ring in the space they vacate. One idea
 * transforming into the next, not a new gallery starting.
 *
 * Homepage set: a curated interleave of the ten real creatives (7 Sapale,
 * 3 SES) so the ring alternates clients as it turns rather than showing one
 * brand's whole feed then another's. Divija supplied no post creatives — its
 * absence is honest and is stated on its own case-study page.
 */
export default function CreativesScene() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  const items = useMemo<OrbitItem[]>(() => {
    const perClient = caseStudies.map((cs) =>
      cs.posts
        .filter((p) => !p.isPlaceholder && p.src)
        .map((p) => ({
          src: p.src,
          alt: p.alt ?? `${cs.client} — ${p.title}`,
          title: p.title,
          client: cs.client,
          accent: cs.accentColor,
        }))
    )
    // Round-robin so neighbouring cards on the ring come from different brands.
    const out: OrbitItem[] = []
    const depth = Math.max(...perClient.map((l) => l.length))
    for (let i = 0; i < depth; i++) {
      for (const list of perClient) if (list[i]) out.push(list[i])
    }
    return out
  }, [])

  useIsomorphicLayoutEffect(() => {
    if (reduced || mobile) return
    const ctx = gsap.context(() => {
      // The whole installation arrives tilted back and settles upright — it
      // reads as the ring rotating into place, not as a block fading in.
      gsap.fromTo(
        rootRef.current,
        { rotateX: 9, y: 70, autoAlpha: 0.25, transformPerspective: 1400 },
        {
          rotateX: 0,
          y: 0,
          autoAlpha: 1,
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, start: 'top 88%', end: 'top 34%', scrub: 0.8 },
        }
      )
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  if (items.length === 0) return null

  return (
    <section
      ref={rootRef}
      id="creatives"
      aria-label="Static campaign creatives"
      className="relative z-10"
      style={{ marginTop: mobile ? '4vh' : '-4vh' }}
    >
      <CreativeOrbit
        items={items}
        eyebrow="CAMPAIGN SYSTEMS"
        headingLines={['Not isolated', 'posts.']}
        heading="Not isolated posts."
        label="Static campaign creatives"
        flowAnchor="left"
      />
    </section>
  )
}
