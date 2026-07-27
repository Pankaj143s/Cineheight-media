/**
 * Media-slot specs for the homepage Selected Work and /work index media.
 *
 * The client is producing new, final media specifically for this design — the
 * layout must not be constrained around the ratios of the currently available
 * client reels. Every slot below documents exactly what file must land where,
 * at what dimensions, before `status` flips from `'placeholder'` to `'ready'`.
 * `MediaSpecPlaceholder` renders an identical box either way, so flipping the
 * status later requires zero layout changes — only a data edit here.
 *
 * This mirrors the discipline already established in `content/presentationMedia.ts`
 * (`PresentationAsset`/`caseCover()`), but covers slots that have no real asset
 * yet, which that module deliberately never does.
 */

import { caseStudies } from './caseStudies'

export type MediaSlotStatus = 'placeholder' | 'ready'

export interface MediaSlotVariant {
  targetSrc: string
  targetPoster?: string
  width: number
  height: number
  aspect: string
}

export interface MediaSlotSpec extends MediaSlotVariant {
  id: string
  client: string
  status: MediaSlotStatus
  /** Optional ultrawide/hero alternate for the same slot — used only if supplied. */
  ultrawide?: MediaSlotVariant
  accentColor: string
  label: string
  /** What kind of shot this slot needs — shown on the placeholder plate. */
  brief: string
}

const accentOf = (id: string) => caseStudies.find((c) => c.id === id)?.accentColor ?? 'var(--blue-500)'

const CLIENT_IDS = ['sapale-yamaha', 'sindhudurg-education', 'divija-old-age-home'] as const

const BRIEFS: Record<(typeof CLIENT_IDS)[number], string> = {
  'sapale-yamaha': 'Showroom/product hero shot — matches the Fascino brand-film tone.',
  'sindhudurg-education': 'Campus/academic-life hero shot — matches the SES visual identity.',
  'divija-old-age-home': 'Warm, dignified resident/community shot — matches the Divija film series.',
}

const LABEL_OF: Record<(typeof CLIENT_IDS)[number], string> = {
  'sapale-yamaha': 'Sapale Yamaha',
  'sindhudurg-education': 'Sindhudurg Education Society',
  'divija-old-age-home': 'Divija Old Age Home',
}

function buildSlots(
  usage: 'home-featured-work' | 'work-index',
  variant: 'desktop' | 'mobile'
): Record<string, MediaSlotSpec> {
  const kind = usage === 'home-featured-work' ? 'featured' : 'work-index'
  const isDesktop = variant === 'desktop'
  const width = usage === 'home-featured-work' ? (isDesktop ? 2560 : 1080) : isDesktop ? 2400 : 1080
  const height = usage === 'home-featured-work' ? (isDesktop ? 1440 : 1350) : isDesktop ? 1350 : 1350
  const aspect = isDesktop ? '16:9' : '4:5'
  const ext = usage === 'home-featured-work' ? 'mp4' : 'webp'
  const dir = usage === 'home-featured-work' ? 'work/featured' : 'work-index'

  return Object.fromEntries(
    CLIENT_IDS.map((id) => {
      const base = `/media/${dir}/${id}-${variant}`
      const spec: MediaSlotSpec = {
        id: `${kind}.${id}.${variant}`,
        client: LABEL_OF[id],
        status: 'placeholder',
        targetSrc: `${base}.${ext}`,
        targetPoster: usage === 'home-featured-work' ? `${base}-poster.webp` : undefined,
        width,
        height,
        aspect,
        accentColor: accentOf(id),
        label: `${LABEL_OF[id]} — ${usage === 'home-featured-work' ? 'hero reel' : 'index cover'}`,
        brief: BRIEFS[id],
      }
      return [id, spec]
    })
  )
}

/** Homepage Selected Work — desktop 2560×1440 16:9 cinematic master, MP4. */
export const featuredWorkSlots: Record<string, MediaSlotSpec> = buildSlots('home-featured-work', 'desktop')

/** Homepage Selected Work — mobile 1080×1350 4:5, MP4. */
export const featuredWorkMobileSlots: Record<string, MediaSlotSpec> = buildSlots('home-featured-work', 'mobile')

/** /work index — desktop 2400×1350 16:9 cover, still or short cinematic, WebP. */
export const workIndexSlots: Record<string, MediaSlotSpec> = buildSlots('work-index', 'desktop')

/** /work index — mobile 1080×1350 4:5 cover, WebP. */
export const workIndexMobileSlots: Record<string, MediaSlotSpec> = buildSlots('work-index', 'mobile')

/** Optional ultrawide alternate for the homepage stage, only if ever supplied. */
export const featuredWorkUltrawide: Record<string, MediaSlotVariant> = Object.fromEntries(
  CLIENT_IDS.map((id) => [
    id,
    {
      targetSrc: `/media/work/featured/${id}-ultrawide.mp4`,
      targetPoster: `/media/work/featured/${id}-ultrawide-poster.webp`,
      width: 3840,
      height: 1600,
      aspect: '12:5',
    },
  ])
)
