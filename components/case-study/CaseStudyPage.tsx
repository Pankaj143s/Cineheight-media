'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { caseStudies, getCaseStudy } from '@/content/caseStudies'
import { getPresentation } from '@/content/caseStudyPresentation'
import { portraitReel, presentationPost } from '@/content/presentationMedia'
import { contact } from '@/content/siteContent'
import CaseOpening from './CaseOpening'
import CaseStartingPoint from './CaseStartingPoint'
import CaseStrategy from './CaseStrategy'
import CaseMetrics from './CaseMetrics'
import NextProject from './NextProject'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import StrokeFillHeadline from '@/components/motion/StrokeFillHeadline'
import type { PhoneReelItem } from '@/components/media/PhoneReelShell'
import type { OrbitItem } from '@/components/media/CreativeOrbit'

const PhoneReelExperience = dynamic(() => import('@/components/media/PhoneReelExperience'))
const CreativeOrbit = dynamic(() => import('@/components/media/CreativeOrbit'))

/**
 * A case study as five connected acts:
 *
 *   1 Transformation  — what changed, one proof, the film
 *   2 Starting point  — the business problem, 35–60 words
 *   3 What we changed — three strategic moves
 *   4 The result      — one dominant metric, three supporting, one conclusion
 *   5 The work        — one editorial bridge, then the installations
 *
 * A visitor who reads only the opening and the results understands the case.
 * Everything verified still ships — the full objective, description, approach
 * list, resultSummary and complete stats are rendered for assistive technology
 * and drive the route metadata.
 */
export default function CaseStudyPage({ slug }: { slug: string }) {
  const cs = getCaseStudy(slug)!
  const presentation = getPresentation(slug)!
  const idx = caseStudies.findIndex((c) => c.id === slug)
  const next = caseStudies[(idx + 1) % caseStudies.length]

  /**
   * Reels use the derived 9:16 presentation masters. Slots the client never
   * supplied fall back to a clearly-labelled concept prototype rather than an
   * empty frame, so the installation can be judged — the badge is driven by
   * provenance, not by a hardcoded flag.
   */
  const reels = useMemo<PhoneReelItem[]>(
    () =>
      cs.reels.map((r, i) => {
        const asset = portraitReel(cs, r)
        return {
          id: `${cs.id}-reel-${i}`,
          title: r.title,
          src: asset?.src ?? '',
          poster: asset?.poster ?? cs.thumbnail,
          isPlaceholder: !asset,
          provenance: asset?.provenance,
          portrait: true,
          client: cs.client,
          accent: cs.accentColor,
        }
      }),
    [cs]
  )

  const posts = useMemo<OrbitItem[]>(
    () =>
      cs.posts.flatMap((p) => {
        const asset = presentationPost(cs, p)
        if (!asset) return []
        return [
          {
            src: asset.src,
            alt: p.alt ?? `${cs.client} — ${p.title}`,
            title: p.title,
            client: cs.client,
            accent: cs.accentColor,
            provenance: asset.provenance,
          },
        ]
      }),
    [cs]
  )

  const bridge = presentation.workBridge

  return (
    <main className="relative z-10">
      <CaseOpening cs={cs} presentation={presentation} />
      <CaseStartingPoint cs={cs} presentation={presentation} />
      <CaseStrategy cs={cs} presentation={presentation} />
      <CaseMetrics cs={cs} presentation={presentation} />

      {/* Act 5 — one bridge for BOTH installations. Previously each carried its
          own oversized multi-line heading, so the media had to fight two display
          statements before anyone saw it. */}
      <section
        aria-label="The work behind the growth"
        className="relative z-10"
        style={{ marginTop: 'calc(clamp(4.5rem, 16vh, 13rem) * var(--scene-gap))' }}
      >
        <div className="flow-gutter relative">
          <span
            aria-hidden="true"
            className="font-body absolute -top-7 left-[var(--gutter)] text-[11px] text-text-500"
            style={{ letterSpacing: '0.3em' }}
          >
            04
          </span>
          <KineticLabel text={bridge.eyebrow} />
          {/* Swept in the client's own accent — the transformation statement
              is the one place a case study borrows their colour for type. */}
          <StrokeFillHeadline
            as="h2"
            text={bridge.heading}
            accent={cs.accentColor}
            className="type-display-2 font-display mt-6 max-w-[20ch] font-bold uppercase text-text-100"
          />
          <p className="font-body mt-6 text-[15px] leading-relaxed text-text-300 sm:text-base" style={{ maxWidth: '52ch' }}>
            {bridge.supporting}
          </p>
        </div>
      </section>

      <div style={{ marginTop: 'calc(clamp(2rem, 7vh, 5rem) * var(--scene-gap))' }}>
        <PhoneReelExperience
          reels={reels}
          handle={contact.instagramHandle.replace('@', '')}
          eyebrow="REELS"
          explanation="Drag, or use the arrows. Tap the centre phone to open it full size."
          label={`${cs.client} reels`}
          flowAnchor="edge-left"
        />
      </div>

      {posts.length > 0 ? (
        <div style={{ marginTop: 'calc(clamp(2rem, 7vh, 5rem) * var(--scene-gap))' }}>
          <CreativeOrbit
            items={posts}
            accent={cs.accentColor}
            eyebrow="CREATIVES"
            explanation="Spin the ring, or use the arrows. Click the front creative to open it full size."
            label={`${cs.client} creatives`}
            flowAnchor="right"
          />
        </div>
      ) : (
        <section aria-label="Static creatives" className="flow-gutter relative z-10" style={{ marginTop: '12vh' }}>
          <p className="font-display text-[11px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.3em' }}>
            Creatives
          </p>
          <p className="font-body mt-5 text-sm leading-relaxed text-text-500" style={{ maxWidth: '46ch' }}>
            The post creatives from this campaign have not been supplied yet.
          </p>
        </section>
      )}

      <NextProject next={next} />
    </main>
  )
}
