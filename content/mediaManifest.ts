/**
 * Media manifest (spec §34) — every media item the site serves, real or placeholder.
 * Placeholders preserve final path + aspect ratio so real files are drop-in.
 * Full replacement notes: docs/EXISTING-CONTENT-MAP.md and docs/MEDIA-REPLACEMENT-GUIDE.md.
 */

export type MediaKind = 'video' | 'image'

export interface ManifestItem {
  id: string
  client: 'sapale-yamaha' | 'sindhudurg-education' | 'divija-old-age-home' | 'cineheight'
  section: string
  kind: MediaKind
  /** false ⇒ clearly-labelled local placeholder ships at this path/ratio */
  actual: boolean
  src: string
  poster?: string
  width: number
  height: number
  aspect: string
  format: string
  notes?: string
}

export const mediaManifest: ManifestItem[] = [
  // ---- Hero (generated atmosphere — NOT client work) ----
  {
    id: 'hero-cloud-back',
    client: 'cineheight',
    section: 'hero',
    kind: 'video',
    actual: true,
    src: '/generated/hero-v2/cloud-back-desktop.mp4',
    poster: '/generated/hero-v2/hero-cloud-desktop-poster.webp',
    width: 1920,
    height: 1080,
    aspect: '16:9',
    format: 'mp4/h264',
    notes: 'Higgsfield-generated background cloud deck; screen-blended over --bg-950.',
  },
  {
    id: 'hero-cloud-middle',
    client: 'cineheight',
    section: 'hero',
    kind: 'image',
    actual: true,
    src: '/generated/hero-v2/cloud-middle-desktop.webp',
    width: 1920,
    height: 1080,
    aspect: '16:9',
    format: 'webp',
    notes: 'Middle cloud band on black — CSS drift + scroll parallax.',
  },
  {
    id: 'hero-cloud-front',
    client: 'cineheight',
    section: 'hero',
    kind: 'image',
    actual: true,
    src: '/generated/hero-v2/cloud-front-desktop.webp',
    width: 1920,
    height: 1080,
    aspect: '16:9',
    format: 'webp',
    notes: 'Sparse foreground wisps on black — fastest parallax layer, passes over letters.',
  },

  // ---- Showreel ----
  {
    id: 'showreel',
    client: 'cineheight',
    section: 'showreel',
    kind: 'video',
    actual: true,
    src: '/media/showreel/showreel.mp4',
    poster: '/media/showreel/showreel-poster.webp',
    width: 1920,
    height: 1080,
    aspect: '16:9',
    format: 'mp4/h264',
    notes: 'Real showreel: copied verbatim from the old project public/about/about-us-video-2-horizontal.mp4 (1920×1080, 32.04s, H.264 High 24fps, AAC 48k stereo, 14.7 MB). Poster is a REAL frame extracted at t=6.4s (~20%) → showreel-poster.webp 1600×900, 178 KB (no longer the generated placeholder card). Replace with a dedicated showreel cut if the client supplies one.',
  },

  // ---- Sapale Yamaha ----
  { id: 'sapale-reel-01', client: 'sapale-yamaha', section: 'reels', kind: 'video', actual: true, src: '/case-studies/sapale-yamaha/reels/sapale-reel-01.mp4', poster: '/case-studies/sapale-yamaha/posts/sapale-post-01.webp', width: 1080, height: 1080, aspect: '1:1', format: 'mp4/h264' },
  { id: 'sapale-reel-02', client: 'sapale-yamaha', section: 'reels', kind: 'video', actual: true, src: '/case-studies/sapale-yamaha/reels/sapale-reel-02.mp4', poster: '/case-studies/sapale-yamaha/posts/sapale-post-01.webp', width: 1080, height: 1080, aspect: '1:1', format: 'mp4/h264' },
  { id: 'sapale-reel-03', client: 'sapale-yamaha', section: 'reels', kind: 'video', actual: true, src: '/case-studies/sapale-yamaha/reels/sapale-reel-03.mp4', poster: '/case-studies/sapale-yamaha/posts/sapale-post-01.webp', width: 1080, height: 1080, aspect: '1:1', format: 'mp4/h264' },
  { id: 'sapale-testimonial', client: 'sapale-yamaha', section: 'testimonials', kind: 'video', actual: true, src: '/case-studies/sapale-yamaha/testimonial/sapale-testimonial.mp4', poster: '/case-studies/sapale-yamaha/posts/sapale-post-01.webp', width: 1920, height: 1080, aspect: '16:9', format: 'mp4/h264' },
  ...Array.from({ length: 7 }, (_, i) => ({
    id: `sapale-post-0${i + 1}`,
    client: 'sapale-yamaha' as const,
    section: 'posts',
    kind: 'image' as const,
    actual: true,
    src: `/case-studies/sapale-yamaha/posts/sapale-post-0${i + 1}.webp`,
    width: i < 4 ? 1080 : 1200,
    height: i < 4 ? 1440 : 1600,
    aspect: '3:4',
    format: 'webp',
  })),

  // ---- Sindhudurg Education Society ----
  { id: 'ses-reel-01', client: 'sindhudurg-education', section: 'reels', kind: 'video', actual: true, src: '/case-studies/ses/reels/ses-reel-01.mp4', poster: '/case-studies/ses/posts/ses-post-01.webp', width: 1080, height: 1080, aspect: '1:1', format: 'mp4/h264', notes: 'Also SES topVideo (campaign film) — no recorded testimonial exists.' },
  { id: 'ses-reel-02', client: 'sindhudurg-education', section: 'reels', kind: 'video', actual: true, src: '/case-studies/ses/reels/ses-reel-02.mp4', poster: '/case-studies/ses/posts/ses-post-01.webp', width: 1080, height: 1080, aspect: '1:1', format: 'mp4/h264', notes: '11.3 MB — re-encode to ≤6 MB during performance pass.' },
  { id: 'ses-reel-03', client: 'sindhudurg-education', section: 'reels', kind: 'video', actual: true, src: '/case-studies/ses/reels/ses-reel-03.mp4', poster: '/case-studies/ses/posts/ses-post-01.webp', width: 1080, height: 1080, aspect: '1:1', format: 'mp4/h264' },
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `ses-post-0${i + 1}`,
    client: 'sindhudurg-education' as const,
    section: 'posts',
    kind: 'image' as const,
    actual: true,
    src: `/case-studies/ses/posts/ses-post-0${i + 1}.webp`,
    width: 1080,
    height: 1440,
    aspect: '3:4',
    format: 'webp',
  })),

  // ---- Divija ----
  { id: 'divija-reel-01', client: 'divija-old-age-home', section: 'reels', kind: 'video', actual: true, src: '/case-studies/divija/reels/divija-reel-01.mp4', poster: '/case-studies/divija/posters/divija-poster.webp', width: 1080, height: 1080, aspect: '1:1', format: 'mp4/h264', notes: '11.5 MB — re-encode to ≤6 MB during performance pass.' },
  { id: 'divija-reel-02', client: 'divija-old-age-home', section: 'reels', kind: 'video', actual: false, src: '/case-studies/divija/reels/divija-reel-02.mp4', width: 1080, height: 1920, aspect: '9:16', format: 'mp4/h264', notes: 'PLACEHOLDER — "Resident Story Film" not yet supplied. Labelled card ships; drop real file at this path.' },
  { id: 'divija-reel-03', client: 'divija-old-age-home', section: 'reels', kind: 'video', actual: false, src: '/case-studies/divija/reels/divija-reel-03.mp4', width: 1080, height: 1920, aspect: '9:16', format: 'mp4/h264', notes: 'PLACEHOLDER — "Donation Campaign Reel" not yet supplied.' },
  { id: 'divija-testimonial', client: 'divija-old-age-home', section: 'testimonials', kind: 'video', actual: true, src: '/case-studies/divija/testimonials/divija-testimonial.mp4', poster: '/case-studies/divija/posters/divija-poster.webp', width: 1920, height: 1080, aspect: '16:9', format: 'mp4/h264' },
  { id: 'divija-poster', client: 'divija-old-age-home', section: 'posters', kind: 'image', actual: true, src: '/case-studies/divija/posters/divija-poster.webp', width: 960, height: 960, aspect: '1:1', format: 'webp' },
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `divija-post-0${i + 1}`,
    client: 'divija-old-age-home' as const,
    section: 'posts',
    kind: 'image' as const,
    actual: false,
    src: `/case-studies/divija/posts/post-0${i + 1}.webp`,
    width: 1080,
    height: 1440,
    aspect: '3:4',
    format: 'webp',
    notes: 'PLACEHOLDER — no real Divija posts supplied yet.',
  })),

  // ---- About ----
  {
    id: 'about-film',
    client: 'cineheight',
    section: 'about',
    kind: 'video',
    actual: true,
    src: '/about/about-us-video-2-horizontal.mp4',
    width: 1920,
    height: 1080,
    aspect: '16:9',
    format: 'mp4/h264',
    notes: 'Real team film. 14.7 MB — also serves as showreel source.',
  },
]
