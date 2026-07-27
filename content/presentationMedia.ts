/**
 * The presentation-media layer.
 *
 * `content/caseStudies.ts` records what the client actually supplied.
 * `content/mediaManifest.ts` records where those files live. This module
 * records what the SITE renders and, critically, where each rendered asset came
 * from — so the UI can tell the difference between real client work, a reframe
 * of real client work, an illustrative service visual, and a temporary layout
 * prototype.
 *
 * Nothing here replaces a source file; every entry points at a derivative built
 * by a committed, re-runnable script in `scripts/`.
 */

import { caseStudies, type CaseStudy, type MediaItem } from './caseStudies'
import { services } from './siteContent'

export type MediaProvenance =
  /** Delivered by the client, untouched. */
  | 'real'
  /** Reframed/recomposed from real client media. Never labelled artificial. */
  | 'derived-real'
  /** Non-client artwork used to illustrate a service. */
  | 'illustrative'
  /** Layout prototype for a genuine gap. MUST be labelled in the UI. */
  | 'concept-placeholder'

export interface PresentationAsset {
  src: string
  poster?: string
  width: number
  height: number
  aspect: string
  provenance: MediaProvenance
  /** What must eventually replace this, when it is not final. */
  replacesWith?: string
  /** Where the derivative came from, for the audit trail. */
  derivedFrom?: string[]
}

/** True only for assets the UI must visibly badge. */
export const needsPlaceholderBadge = (a?: PresentationAsset | null) =>
  a?.provenance === 'concept-placeholder'

const PRES = '/generated/presentation'

/* ------------------------------------------------------------------ reels */

/**
 * Portrait presentation reels, derived from the square masters by
 * `scripts/build-presentation-reels.mjs`.
 *
 * Every real reel is 1080×1080; the phone frames are 9:16. Baking the
 * blurred-backdrop composition offline means the runtime renders ONE video
 * with `object-cover` instead of compositing two layers on every paint, and it
 * is the shape the eventual client masters will arrive in.
 */
export function portraitReel(cs: CaseStudy, reel: MediaItem): PresentationAsset | null {
  if (reel.isPlaceholder || !reel.src) return conceptReel(cs, reel)
  const base = reel.src.split('/').pop()!.replace('.mp4', '')
  return {
    src: `${PRES}/reels/${cs.id}/${base}.mp4`,
    poster: `${PRES}/reels/${cs.id}/${base}-poster.webp`,
    width: 1080,
    height: 1920,
    aspect: '9:16',
    provenance: 'derived-real',
    derivedFrom: [reel.src],
  }
}

/** The four Divija slots the client never supplied. */
const DIVIJA_CONCEPTS: Record<string, PresentationAsset> = {
  'Resident Story Film': {
    src: `${PRES}/concepts/divija-old-age-home/reels/divija-reel-02-concept.mp4`,
    poster: `${PRES}/concepts/divija-old-age-home/reels/divija-reel-02-concept-poster.webp`,
    width: 1080,
    height: 1920,
    aspect: '9:16',
    provenance: 'concept-placeholder',
    replacesWith: 'Final Resident Story Film master, 1080×1920',
    derivedFrom: ['/case-studies/divija/testimonials/divija-testimonial.mp4'],
  },
  'Donation Campaign Reel': {
    src: `${PRES}/concepts/divija-old-age-home/reels/divija-reel-03-concept.mp4`,
    poster: `${PRES}/concepts/divija-old-age-home/reels/divija-reel-03-concept-poster.webp`,
    width: 1080,
    height: 1920,
    aspect: '9:16',
    provenance: 'concept-placeholder',
    replacesWith: 'Final Donation Campaign Reel master, 1080×1920',
    derivedFrom: ['/case-studies/divija/reels/divija-reel-01.mp4'],
  },
  'Resident Story': {
    src: `${PRES}/concepts/divija-old-age-home/posts/divija-post-01-concept.webp`,
    width: 1080,
    height: 1350,
    aspect: '4:5',
    provenance: 'concept-placeholder',
    replacesWith: 'Final Resident Story creative, 1080×1350',
    derivedFrom: ['/case-studies/divija/posters/divija-reel-01-poster.webp'],
  },
  'Donation Appeal': {
    src: `${PRES}/concepts/divija-old-age-home/posts/divija-post-02-concept.webp`,
    width: 1080,
    height: 1350,
    aspect: '4:5',
    provenance: 'concept-placeholder',
    replacesWith: 'Final Donation Appeal creative, 1080×1350',
    derivedFrom: ['/case-studies/divija/posters/divija-testimonial-poster.webp'],
  },
}

function conceptReel(cs: CaseStudy, reel: MediaItem): PresentationAsset | null {
  if (cs.id !== 'divija-old-age-home') return null
  return DIVIJA_CONCEPTS[reel.title] ?? null
}

/** A post creative: the real file, or the labelled concept prototype. */
export function presentationPost(cs: CaseStudy, post: MediaItem): PresentationAsset | null {
  if (!post.isPlaceholder && post.src) {
    return {
      src: post.src,
      width: 1080,
      height: 1440,
      aspect: '3:4',
      provenance: 'real',
    }
  }
  if (cs.id !== 'divija-old-age-home') return null
  return DIVIJA_CONCEPTS[post.title] ?? null
}

/* ----------------------------------------------------------------- covers */

/**
 * Case covers, composed from real client frames by
 * `scripts/build-case-covers.mjs`.
 *
 * They exist because `caseStudies[].thumbnail` is a SQUARE 1080×1080 reel
 * poster, and `object-cover`-ing that into a full-width 16:9 stage discarded
 * roughly 40% of real client work.
 */
export interface CaseCover {
  desktop: PresentationAsset
  mobile: PresentationAsset
}

export function caseCover(id: string): CaseCover {
  return {
    desktop: {
      src: `${PRES}/case-covers/${id}-desktop.webp`,
      width: 2400,
      height: 1350,
      aspect: '16:9',
      provenance: 'derived-real',
    },
    mobile: {
      src: `${PRES}/case-covers/${id}-mobile.webp`,
      width: 1080,
      height: 1350,
      aspect: '4:5',
      provenance: 'derived-real',
    },
  }
}

/* --------------------------------------------------------------- services */

/**
 * Service artwork — generated as one coordinated collection and normalised to a
 * shared 1920×1200 frame by `scripts/build-service-visuals.mjs`. Illustrative,
 * never presented as client work.
 */
export function serviceVisual(id: string): PresentationAsset {
  return {
    src: `${PRES}/services/${id}.webp`,
    width: 1920,
    height: 1200,
    aspect: '16:10',
    provenance: 'illustrative',
  }
}

export const serviceVisuals = Object.fromEntries(
  services.map((s) => [s.id, serviceVisual(s.id)])
) as Record<string, PresentationAsset>

/* -------------------------------------------------------------- summaries */

/** Every asset the site renders, for the audit doc and the path checker. */
export function allPresentationAssets(): PresentationAsset[] {
  const out: PresentationAsset[] = []
  for (const cs of caseStudies) {
    out.push(caseCover(cs.id).desktop, caseCover(cs.id).mobile)
    for (const r of cs.reels) {
      const a = portraitReel(cs, r)
      if (a) out.push(a)
    }
    for (const p of cs.posts) {
      const a = presentationPost(cs, p)
      if (a) out.push(a)
    }
  }
  out.push(...Object.values(serviceVisuals))
  return out
}
