/**
 * Media manifest — every media asset the site serves, real or placeholder.
 * All dimensions verified with sharp, all video data with ffprobe (2026-07-25).
 * Poster frames are REAL frames extracted from the client videos at the
 * recorded timestamps (never frame 0). Full audit: docs/OLD-SITE-CONTENT-AUDIT.md.
 *
 * AUDIT NOTE: the old project's raw `Data to be used/Client photo and video/`
 * folder was inspected and is STOCK footage (not client work) — deliberately
 * EXCLUDED from this manifest and from the site.
 */

export type MediaKind = 'video' | 'image'
export type Preload = 'eager' | 'metadata' | 'none' | 'lazy'

export interface ManifestItem {
  id: string
  client: 'sapale-yamaha' | 'sindhudurg-education' | 'divija-old-age-home' | 'cineheight'
  /** Route(s) where the asset appears */
  route: string
  section: string
  title: string
  kind: MediaKind
  /** false ⇒ clearly-labelled placeholder ships at this path/ratio */
  actual: boolean
  /** Path in the old project (READ-ONLY source) this was copied from */
  oldSource: string
  src: string
  poster?: string
  /** Timestamp (s) the poster frame was extracted at, when derived from video */
  posterTimestamp?: number
  width: number
  height: number
  aspect: string
  /** Seconds — video only */
  duration?: number
  videoCodec?: string
  audioCodec?: string
  /** Approx size on disk */
  sizeKB: number
  alt: string
  preload: Preload
  notes?: string
}

const S = 'case-studies/sapale-yamaha'
const E = 'case-studies/ses'
const D = 'case-studies/divija'

export const mediaManifest: ManifestItem[] = [
  // ---- Hero atmosphere (generated, NOT client work — decorative only) ----
  { id: 'hero-cloud-back', client: 'cineheight', route: '/', section: 'hero', title: 'Hero background cloud haze', kind: 'image', actual: true, oldSource: '(generated in this project — Higgsfield, hero-v4 pass)', src: '/generated/hero-v4/cloud-back-soft.webp', width: 1600, height: 451, aspect: '~3.5:1', sizeKB: 97, alt: '', preload: 'eager', notes: 'True baked alpha; decorative (aria-hidden).' },
  { id: 'hero-cloud-front-left', client: 'cineheight', route: '/', section: 'hero', title: 'Hero front-left cloud', kind: 'image', actual: true, oldSource: '(generated in this project)', src: '/generated/hero-v4/cloud-front-left.webp', width: 720, height: 360, aspect: '2:1', sizeKB: 46, alt: '', preload: 'eager' },
  { id: 'hero-cloud-front-right', client: 'cineheight', route: '/', section: 'hero', title: 'Hero front-right cloud', kind: 'image', actual: true, oldSource: '(generated in this project)', src: '/generated/hero-v4/cloud-front-right.webp', width: 740, height: 360, aspect: '~2:1', sizeKB: 47, alt: '', preload: 'eager' },
  { id: 'hero-cloud-traveller', client: 'cineheight', route: '/', section: 'hero', title: 'Hero travelling cloud', kind: 'image', actual: true, oldSource: '(generated in this project)', src: '/generated/hero-v4/cloud-traveller.webp', width: 620, height: 329, aspect: '~2:1', sizeKB: 37, alt: '', preload: 'eager' },

  // ---- Showreel (real film the old live site served) ----
  { id: 'showreel', client: 'cineheight', route: '/', section: 'showreel', title: 'CINEHEIGHT showreel', kind: 'video', actual: true, oldSource: 'public/about/about-us-video-2-horizontal.mp4', src: '/media/showreel/showreel.mp4', poster: '/media/showreel/showreel-poster.webp', posterTimestamp: 6.4, width: 1920, height: 1080, aspect: '16:9', duration: 32.04, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 15059, alt: 'CINEHEIGHT showreel film', preload: 'metadata', notes: 'The old site’s about/showreel film (aerial production work). No dedicated showreel cut exists.' },

  // ---- Sapale Yamaha — reels ----
  { id: 'sapale-reel-01', client: 'sapale-yamaha', route: '/, /work/sapale-yamaha', section: 'reels', title: 'Bike Exchange Campaign', kind: 'video', actual: true, oldSource: `public/${S}/reels/sapale-reel-01.mp4`, src: `/${S}/reels/sapale-reel-01.mp4`, poster: `/${S}/posters/sapale-reel-01-poster.webp`, posterTimestamp: 11, width: 1080, height: 1080, aspect: '1:1', duration: 36.29, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 5196, alt: 'Sapale Yamaha bike exchange campaign reel', preload: 'none' },
  { id: 'sapale-reel-02', client: 'sapale-yamaha', route: '/, /work/sapale-yamaha', section: 'reels', title: 'Choose Your Style', kind: 'video', actual: true, oldSource: `public/${S}/reels/sapale-reel-02.mp4`, src: `/${S}/reels/sapale-reel-02.mp4`, poster: `/${S}/posters/sapale-reel-02-poster.webp`, posterTimestamp: 12, width: 1080, height: 1080, aspect: '1:1', duration: 37.8, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 4618, alt: 'Sapale Yamaha Choose Your Style product reel', preload: 'none', notes: 'Also the homepage featured-work preview for Sapale.' },
  { id: 'sapale-reel-03', client: 'sapale-yamaha', route: '/, /work/sapale-yamaha', section: 'reels', title: 'Fascino Brand Film', kind: 'video', actual: true, oldSource: `public/${S}/reels/sapale-reel-03.mp4`, src: `/${S}/reels/sapale-reel-03.mp4`, poster: `/${S}/posters/sapale-reel-03-poster.webp`, posterTimestamp: 8, width: 1080, height: 1080, aspect: '1:1', duration: 25.81, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 4992, alt: 'Sapale Yamaha Fascino brand film reel', preload: 'none' },

  // ---- Sapale Yamaha — testimonial ----
  { id: 'sapale-testimonial', client: 'sapale-yamaha', route: '/, /work/sapale-yamaha', section: 'testimonials', title: 'Sapale Yamaha Testimonial', kind: 'video', actual: true, oldSource: `public/${S}/testimonial/sapale-testimonial.mp4`, src: `/${S}/testimonial/sapale-testimonial.mp4`, poster: `/${S}/posters/sapale-testimonial-poster.webp`, posterTimestamp: 14, width: 1920, height: 1080, aspect: '16:9', duration: 46.7, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 4079, alt: 'Sapale Yamaha owner testimonial video', preload: 'none' },

  // ---- Sapale Yamaha — static posts (7 real) ----
  ...([138, 146, 153, 133, 143, 164, 168].map((kb, i) => ({
    id: `sapale-post-0${i + 1}`,
    client: 'sapale-yamaha' as const,
    route: '/, /work/sapale-yamaha',
    section: 'posts',
    title: ['Brand Campaign', 'Product Highlight', 'Festival Creative', 'Lifestyle Post', 'Offer Campaign', 'Product Showcase', 'Social Creative'][i],
    kind: 'image' as const,
    actual: true,
    oldSource: `public/${S}/posts/sapale-post-0${i + 1}.webp`,
    src: `/${S}/posts/sapale-post-0${i + 1}.webp`,
    width: i < 4 ? 1080 : 1200,
    height: i < 4 ? 1440 : 1600,
    aspect: '3:4',
    sizeKB: kb,
    alt: `Sapale Yamaha ${['brand campaign', 'product highlight', 'festival creative', 'lifestyle', 'offer campaign', 'product showcase', 'social media'][i]} post`,
    preload: 'lazy' as const,
  }))),

  // ---- SES — reels ----
  { id: 'ses-reel-01', client: 'sindhudurg-education', route: '/, /work/sindhudurg-education', section: 'reels', title: 'Pharmacy Campaign', kind: 'video', actual: true, oldSource: `public/${E}/reels/ses-reel-01.mp4`, src: `/${E}/reels/ses-reel-01.mp4`, poster: `/${E}/posters/ses-reel-01-poster.webp`, posterTimestamp: 7, width: 1080, height: 1080, aspect: '1:1', duration: 23.94, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 2687, alt: 'SES pharmacy college campaign reel', preload: 'none', notes: 'Doubles as the SES topVideo (campaign film) — no recorded testimonial exists.' },
  { id: 'ses-reel-02', client: 'sindhudurg-education', route: '/, /work/sindhudurg-education', section: 'reels', title: 'B.Pharm Farewell', kind: 'video', actual: true, oldSource: `public/${E}/reels/ses-reel-02.mp4`, src: `/${E}/reels/ses-reel-02.mp4`, poster: `/${E}/posters/ses-reel-02-poster.webp`, posterTimestamp: 22, width: 1080, height: 1080, aspect: '1:1', duration: 74.05, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 11520, alt: 'SES B.Pharm farewell event reel', preload: 'none', notes: '11.5 MB / 74 s — heaviest reel; loads only when activated.' },
  { id: 'ses-reel-03', client: 'sindhudurg-education', route: '/, /work/sindhudurg-education', section: 'reels', title: 'Consistency Story', kind: 'video', actual: true, oldSource: `public/${E}/reels/ses-reel-03.mp4`, src: `/${E}/reels/ses-reel-03.mp4`, poster: `/${E}/posters/ses-reel-03-poster.webp`, posterTimestamp: 11, width: 1080, height: 1080, aspect: '1:1', duration: 35.6, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 2697, alt: 'SES consistency story reel', preload: 'none' },

  // ---- SES — static posts (3 real) ----
  ...([65, 63, 130].map((kb, i) => ({
    id: `ses-post-0${i + 1}`,
    client: 'sindhudurg-education' as const,
    route: '/, /work/sindhudurg-education',
    section: 'posts',
    title: ['College Branding', 'Campus Creative', 'Academic Campaign'][i],
    kind: 'image' as const,
    actual: true,
    oldSource: `public/${E}/posts/ses-post-0${i + 1}.webp`,
    src: `/${E}/posts/ses-post-0${i + 1}.webp`,
    width: 1080,
    height: 1440,
    aspect: '3:4',
    sizeKB: kb,
    alt: `SES ${['college branding', 'campus creative', 'academic campaign'][i]} post`,
    preload: 'lazy' as const,
  }))),

  // ---- Divija — reels (1 real + 2 honest placeholders) ----
  { id: 'divija-reel-01', client: 'divija-old-age-home', route: '/, /work/divija-old-age-home', section: 'reels', title: 'Diwali Campaign', kind: 'video', actual: true, oldSource: `public/${D}/reels/divija-reel-01.mp4`, src: `/${D}/reels/divija-reel-01.mp4`, poster: `/${D}/posters/divija-reel-01-poster.webp`, posterTimestamp: 17, width: 1080, height: 1080, aspect: '1:1', duration: 57.3, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 11766, alt: 'Divija Old Age Home Diwali campaign reel', preload: 'none', notes: '11.8 MB / 57 s — loads only when activated.' },
  { id: 'divija-reel-02', client: 'divija-old-age-home', route: '/work/divija-old-age-home', section: 'reels', title: 'Resident Story Film', kind: 'video', actual: false, oldSource: '(never supplied — old data flags isPlaceholder)', src: `/${D}/reels/divija-reel-02.mp4`, width: 1080, height: 1920, aspect: '9:16', sizeKB: 0, alt: 'Resident story film — coming soon', preload: 'none', notes: 'HONEST PLACEHOLDER card. The raw-folder “divija-video-vertical.mp4” was audited and is STOCK — do not use it here.' },
  { id: 'divija-reel-03', client: 'divija-old-age-home', route: '/work/divija-old-age-home', section: 'reels', title: 'Donation Campaign Reel', kind: 'video', actual: false, oldSource: '(never supplied)', src: `/${D}/reels/divija-reel-03.mp4`, width: 1080, height: 1920, aspect: '9:16', sizeKB: 0, alt: 'Donation campaign reel — coming soon', preload: 'none', notes: 'HONEST PLACEHOLDER card.' },

  // ---- Divija — testimonial + poster ----
  { id: 'divija-testimonial', client: 'divija-old-age-home', route: '/, /work/divija-old-age-home', section: 'testimonials', title: 'Divija Community Story', kind: 'video', actual: true, oldSource: `public/${D}/testimonials/divija-testimonial.mp4`, src: `/${D}/testimonials/divija-testimonial.mp4`, poster: `/${D}/posters/divija-testimonial-poster.webp`, posterTimestamp: 8, width: 1920, height: 1080, aspect: '16:9', duration: 56.56, videoCodec: 'h264', audioCodec: 'aac', sizeKB: 9096, alt: 'Divija Old Age Home community story video', preload: 'none', notes: 'Also the homepage featured-work preview for Divija (captioned film).' },
  { id: 'divija-poster', client: 'divija-old-age-home', route: '/work/divija-old-age-home', section: 'posters', title: 'Divija cover image', kind: 'image', actual: true, oldSource: `public/${D}/posters/divija-poster.webp`, src: `/${D}/posters/divija-poster.webp`, width: 960, height: 960, aspect: '1:1', sizeKB: 225, alt: 'Divija Old Age Home', preload: 'lazy', notes: 'Derived from a real client photo in the old project.' },

  // ---- Services artwork (generated, non-client, from old services-final) ----
  ...(['brand-identity', 'social-media', 'graphic-design', 'video-production', 'performance-marketing', 'content-creation'].map((id, i) => ({
    id: `service-${id}`,
    client: 'cineheight' as const,
    route: '/, /services',
    section: 'services',
    title: ['Brand Identity & Design', 'Social Media Management', 'Graphic Design & Visuals', 'Video Production & Editing', 'Performance Marketing', 'Content Creation'][i],
    kind: 'image' as const,
    actual: true,
    oldSource: `public/generated/services-final/${id}.webp`,
    src: `/generated/services-final/${id}.webp`,
    width: 1536,
    height: 960,
    aspect: '8:5',
    sizeKB: [76, 78, 76, 104, 91, 108][i],
    alt: '',
    preload: 'lazy' as const,
    notes: 'Approved abstract service artwork (generated, non-client, decorative).',
  }))),

  // ---- Trusted-client logos (all real, from old public/logos) ----
  ...([
    ['yamaha-logo', 'Sapale Yamaha', 1115, 325, 112],
    ['ses-white-text-logo', 'Sindhudurg Education Society', 908, 266, 46],
    ['divija-logo', 'Divija Old Age Home', 406, 519, 82],
    ['ongc-logo', 'ONGC', 880, 929, 35],
    ['wetnjoy-logo-footer', 'WetNJoy', 400, 160, 54],
    ['walkswagon-logo', 'Walkswagon', 598, 600, 29],
    ['askara-logo', 'Askara', 300, 66, 14],
    ['dji-blue-logo', 'DJI', 835, 481, 146],
    ['sapale-logo', 'Sapale', 701, 198, 58],
    ['trusted/dave-and-busters', 'Dave and Busters', 200, 160, 10],
    ['trusted/election-commission', 'Election Commission of India', 200, 160, 4],
    ['trusted/imagica', 'Imagica', 200, 160, 10],
    ['trusted/nhai', 'NHAI', 200, 160, 7],
  ] as const).map(([file, name, w, h, kb]) => ({
    id: `logo-${file.replace('trusted/', '')}`,
    client: 'cineheight' as const,
    route: '/',
    section: 'trusted-clients',
    title: `${name} logo`,
    kind: 'image' as const,
    actual: true,
    oldSource: `public/logos/${file}.png`,
    src: `/logos/${file}.png`,
    width: w,
    height: h,
    aspect: `${w}:${h}`,
    sizeKB: kb,
    alt: name,
    preload: 'lazy' as const,
  })),

  // ---- Brand marks ----
  { id: 'brand-logo-white', client: 'cineheight', route: 'all', section: 'brand', title: 'Cineheight wordmark (white)', kind: 'image', actual: true, oldSource: 'public/logos/brand/cineheight-logo-white.png', src: '/logos/brand/cineheight-logo-white.png', width: 786, height: 120, aspect: '~6.5:1', sizeKB: 14, alt: 'CINEHEIGHT.media', preload: 'lazy' },
  { id: 'brand-logo-blue', client: 'cineheight', route: 'metadata', section: 'brand', title: 'Cineheight wordmark (blue)', kind: 'image', actual: true, oldSource: 'public/logos/brand/cineheight-logo-blue.png', src: '/logos/brand/cineheight-logo-blue.png', width: 786, height: 120, aspect: '~6.5:1', sizeKB: 24, alt: 'CINEHEIGHT.media', preload: 'lazy' },
]

export const getManifestItem = (id: string) => mediaManifest.find((m) => m.id === id)
