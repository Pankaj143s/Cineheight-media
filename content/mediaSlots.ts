import { caseStudies } from './caseStudies'

export type MediaSlotStatus = 'placeholder' | 'ready'
export type MediaSlotUsage = 'home-featured-work' | 'work-index'
export type MediaSlotKind = 'video' | 'image'

export interface MediaSlotVariant {
  src: string
  poster?: string
  width: number
  height: number
  aspect: string
  format: string
}

export interface MediaSlotSpec {
  id: string
  usage: MediaSlotUsage
  client: string
  status: MediaSlotStatus
  mediaKind: MediaSlotKind
  accentColor: string
  label: string
  brief: string
  notes: string[]
  desktop: MediaSlotVariant
  mobile: MediaSlotVariant
  ultrawide?: MediaSlotVariant
}

const CLIENTS = [
  {
    id: 'sapale-yamaha',
    label: 'Sapale Yamaha',
    brief: 'Showroom/product hero shot matching the Fascino brand-film tone.',
  },
  {
    id: 'sindhudurg-education',
    label: 'Sindhudurg Education Society',
    brief: 'Campus and academic-life hero shot matching the SES visual identity.',
  },
  {
    id: 'divija-old-age-home',
    label: 'Divija Old Age Home',
    brief: 'Warm, dignified resident/community imagery matching the Divija film series.',
  },
] as const

const accentOf = (id: string) =>
  caseStudies.find((study) => study.id === id)?.accentColor ?? '#0089FF'

export const featuredWorkSlots: Record<string, MediaSlotSpec> = Object.fromEntries(
  CLIENTS.map(({ id, label, brief }) => [
    id,
    {
      id: `home-featured-work.${id}`,
      usage: 'home-featured-work',
      client: label,
      status: 'placeholder',
      mediaKind: 'video',
      accentColor: accentOf(id),
      label: `${label} — homepage featured film`,
      brief,
      notes: [
        'Muted-loop-safe; 15–30 seconds desktop and 10–20 seconds mobile.',
        'Keep essential content outside the outer 8% desktop edge and inside the central 80% mobile safe area.',
      ],
      desktop: {
        src: `/media/home-work/${id}-desktop.mp4`,
        poster: `/media/home-work/${id}-desktop.webp`,
        width: 2560,
        height: 1440,
        aspect: '16:9',
        format: 'MP4 H.264 + WebP poster',
      },
      mobile: {
        src: `/media/home-work/${id}-mobile.mp4`,
        poster: `/media/home-work/${id}-mobile.webp`,
        width: 1080,
        height: 1350,
        aspect: '4:5',
        format: 'MP4 H.264 + WebP poster',
      },
      ultrawide: {
        src: `/media/home-work/${id}-ultrawide.mp4`,
        poster: `/media/home-work/${id}-ultrawide.webp`,
        width: 3840,
        height: 1600,
        aspect: '12:5',
        format: 'Optional MP4 H.264 + WebP poster',
      },
    } satisfies MediaSlotSpec,
  ])
)

export const workIndexSlots: Record<string, MediaSlotSpec> = Object.fromEntries(
  CLIENTS.map(({ id, label, brief }) => [
    id,
    {
      id: `work-index.${id}`,
      usage: 'work-index',
      client: label,
      status: 'placeholder',
      mediaKind: 'image',
      accentColor: accentOf(id),
      label: `${label} — work-index cover`,
      brief,
      notes: [
        'Art-directed still; a short muted loop can be enabled later by changing mediaKind and paths.',
        'Keep essential content inside the central safe area.',
      ],
      desktop: {
        src: `/media/work-index/${id}-desktop.webp`,
        width: 2560,
        height: 1440,
        aspect: '16:9',
        format: 'WebP still',
      },
      mobile: {
        src: `/media/work-index/${id}-mobile.webp`,
        width: 1080,
        height: 1350,
        aspect: '4:5',
        format: 'WebP still',
      },
    } satisfies MediaSlotSpec,
  ])
)
