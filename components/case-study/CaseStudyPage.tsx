'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { caseStudies, getCaseStudy } from '@/content/caseStudies'
import { contact } from '@/content/siteContent'
import CaseOpening from './CaseOpening'
import CaseNarrative from './CaseNarrative'
import CaseMetrics from './CaseMetrics'
import NextProject from './NextProject'
import type { PhoneReelItem } from '@/components/media/PhoneReelShell'
import type { OrbitItem } from '@/components/media/CreativeOrbit'

const PhoneReelExperience = dynamic(() => import('@/components/media/PhoneReelExperience'))
const CreativeOrbit = dynamic(() => import('@/components/media/CreativeOrbit'))

/**
 * A case study as ONE vertical design: opening scene → narrative sequence →
 * results takeover → phone reels → creative orbit → the next project beginning.
 *
 * There is no hero-then-video-then-overview-then-approach stack, no bordered
 * item lists, and no returning to a centred container between beats — the
 * scenes overlap and the route's atmosphere (carrying this client's accent)
 * runs behind all of them.
 */
export default function CaseStudyPage({ slug }: { slug: string }) {
  const cs = getCaseStudy(slug)!
  const idx = caseStudies.findIndex((c) => c.id === slug)
  const next = caseStudies[(idx + 1) % caseStudies.length]

  // This client's reels — placeholders included, so the gaps stay visible and
  // honest on the page they belong to.
  const reels = useMemo<PhoneReelItem[]>(
    () =>
      cs.reels.map((r, i) => ({
        id: `${cs.id}-reel-${i}`,
        title: r.title,
        src: r.src,
        poster: r.poster ?? cs.thumbnail,
        isPlaceholder: r.isPlaceholder || !r.src,
        client: cs.client,
        accent: cs.accentColor,
      })),
    [cs]
  )

  const posts = useMemo<OrbitItem[]>(
    () =>
      cs.posts
        .filter((p) => !p.isPlaceholder && p.src)
        .map((p) => ({
          src: p.src,
          alt: p.alt ?? `${cs.client} — ${p.title}`,
          title: p.title,
          client: cs.client,
          accent: cs.accentColor,
        })),
    [cs]
  )

  return (
    <main className="relative z-10">
      <CaseOpening cs={cs} />
      <CaseNarrative cs={cs} />
      <CaseMetrics cs={cs} />

      <div style={{ marginTop: '6vh' }}>
        <PhoneReelExperience
          reels={reels}
          handle={contact.instagramHandle.replace('@', '')}
          eyebrow="THE REELS"
          headingLines={['Short-form', 'that shipped.']}
          heading="Short-form that shipped."
          label={`${cs.client} reels`}
          flowAnchor="edge-left"
        />
      </div>

      {posts.length > 0 ? (
        <div style={{ marginTop: '4vh' }}>
          <CreativeOrbit
            items={posts}
            accent={cs.accentColor}
            eyebrow="THE CREATIVES"
            headingLines={['The campaign', 'system.']}
            heading="The campaign system."
            label={`${cs.client} creatives`}
            flowAnchor="right"
          />
        </div>
      ) : (
        /* An honest gap: this client's post creatives were never supplied, and
           nothing generated or borrowed stands in for them. */
        <section aria-label="Static creatives" className="flow-gutter relative z-10" style={{ marginTop: '14vh' }}>
          <p className="font-display text-[11px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.3em' }}>
            The creatives
          </p>
          <p className="font-body measure mt-5 text-sm leading-relaxed text-text-500">
            The post creatives from this campaign have not been supplied yet. When they arrive they will take their
            place here — nothing stands in for them in the meantime.
          </p>
        </section>
      )}

      <NextProject next={next} />
    </main>
  )
}
