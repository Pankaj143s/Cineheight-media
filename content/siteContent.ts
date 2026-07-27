/**
 * Site-wide verified content — every string here traces to the old live
 * project (components/About, Contact, Process, TrustedBy, Footer,
 * services/ServiceRows, app/layout metadata). Nothing invented.
 * See docs/OLD-SITE-CONTENT-AUDIT.md for source mapping.
 */

// ---------------------------------------------------------------- contact
export const contact = {
  /** Primary project-inquiry address (old Contact section's contactInfo). */
  email: 'grow@cineheight.com',
  /** Direct address used in the old footer/nav. */
  directEmail: 'shreyas@cineheight.com',
  phone: '+91 8308765466',
  phoneHref: 'tel:+918308765466',
  whatsapp: 'https://wa.me/918308765466',
  location: 'Kankavli, Maharashtra, India',
  instagramHandle: '@cineheight.media',
  instagramUrl: 'https://instagram.com/cineheight.media',
}

export type SocialPlatform = 'facebook' | 'instagram' | 'youtube' | 'linkedin'

export interface SocialLink {
  platform: SocialPlatform
  label: string
  /** Populated as soon as a profile is known, regardless of `status`. */
  href: string | null
  /**
   * `live` navigates; `placeholder` renders an interactive button that
   * explains itself instead of going anywhere.
   */
  status: 'live' | 'placeholder'
}

/**
 * Every channel is a launch placeholder for now.
 *
 * Instagram's URL is verified and kept here so going live is a one-word edit
 * (`placeholder` → `live`) rather than a Footer redesign. The other three had
 * no authoritative company profile at the 2026-07-28 audit. Placeholders are
 * still fully interactive — a dead grey icon tells a visitor nothing, whereas a
 * button that says "coming soon" does.
 */
export const socialLinks: SocialLink[] = [
  { platform: 'facebook', label: 'Facebook', href: null, status: 'placeholder' },
  {
    platform: 'instagram',
    label: 'Instagram',
    href: contact.instagramUrl,
    status: 'placeholder',
  },
  { platform: 'youtube', label: 'YouTube', href: null, status: 'placeholder' },
  { platform: 'linkedin', label: 'LinkedIn', href: null, status: 'placeholder' },
]

// ------------------------------------------------------------------- nav
/** Old live nav had NO Insights item and no insight content exists —
 *  the item is intentionally absent (docs/ROUTE-MAP.md). */
export const navItems = [
  { label: 'Work', href: '/work' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

// -------------------------------------------------------------- services
export interface Service {
  id: string
  index: string
  title: string
  description: string
  /** Deeper copy for the /services page — grounded in the six approved services */
  detail: string
  image: string
}

/**
 * The approved 1536×960 service artwork from the original production set.
 * The later `/generated/presentation/services` collection remains on disk for
 * provenance, but the Services page deliberately does not render it.
 */
export const services: Service[] = [
  {
    id: 'brand-identity',
    index: '01',
    title: 'Brand Identity & Design',
    description: 'Brand identities built to be recognised, remembered and ready to grow.',
    detail:
      'Positioning, naming systems, logo and visual identity, brand guidelines and the design language your audience will remember you by.',
    image: '/generated/services-final/brand-identity.webp',
  },
  {
    id: 'social-media',
    index: '02',
    title: 'Social Media Management',
    description: 'Social strategy and content systems that build community and demand.',
    detail:
      'Monthly content calendars, platform strategy, community management and consistent brand presentation across every channel.',
    image: '/generated/services-final/social-media.webp',
  },
  {
    id: 'graphic-design',
    index: '03',
    title: 'Graphic Design & Visuals',
    description: 'Campaign visuals designed for clarity, consistency and attention.',
    detail:
      'Campaign creatives, social posts, infographics and print — visuals built on one coherent system, not one-off graphics.',
    image: '/generated/services-final/graphic-design.webp',
  },
  {
    id: 'video-production',
    index: '04',
    title: 'Video Production & Editing',
    description: 'Story-led films and reels, from concept to final cut.',
    detail:
      'Product films, reels, campaign videos and testimonials — shot, edited and graded for the platforms they live on.',
    image: '/generated/services-final/video-production.webp',
  },
  {
    id: 'performance-marketing',
    index: '05',
    title: 'Performance Marketing',
    description: 'Targeted campaigns optimised for qualified leads and growth.',
    detail:
      'Targeted campaigns, lead funnels and continuous optimisation — the discipline that turns attention into enquiries and sales.',
    image: '/generated/services-final/performance-marketing.webp',
  },
  {
    id: 'content-creation',
    index: '06',
    title: 'Content Creation',
    description: 'Photography, short-form video and copy built as one system.',
    detail:
      'Photography, short-form video and copywriting produced as one connected stream — so every post sounds and looks like you.',
    image: '/generated/services-final/content-creation.webp',
  },
]

// --------------------------------------------------------------- process
/** Old five-step copy (Discovery/Strategy/Creation/Execution/Optimization)
 *  simplified into the approved four beats; Deliver merges Execution +
 *  Optimization so no verified idea is lost. */
export interface ProcessStep {
  index: string
  title: string
  description: string
}

export const processSteps: ProcessStep[] = [
  { index: '01', title: 'Discover', description: 'Understand goals, audience and brand essence.' },
  { index: '02', title: 'Strategize', description: 'Turn insight into a focused creative roadmap.' },
  { index: '03', title: 'Create', description: 'Bring the strongest ideas to life.' },
  { index: '04', title: 'Deliver', description: 'Launch, measure and refine for better outcomes.' },
]

// ----------------------------------------------------------------- about
export const about = {
  headline: 'Everything a brand needs. One team.',
  supporting: 'Strategy, design, content and campaigns — under one roof.',
  journey: 'One team, the whole journey: strategy to launch to growth.',
  capabilities: ['Creative Excellence', 'Strategic Approach', 'Complete Solutions', 'Results-Driven'],
}

// ------------------------------------------------------- trusted clients
export interface TrustedClient {
  name: string
  /** Trimmed copy — see scripts/trim-logos.mjs. Originals stay in /logos. */
  logo: string
  /** Intrinsic size of the TRIMMED artwork (measured, not guessed). */
  w: number
  h: number
  /**
   * Per-mark optical correction. Area normalisation gets it ~90% right; this
   * nudges the marks whose perceived weight differs from their bounding box —
   * a thin wordmark reads lighter than a solid roundel of the same area.
   */
  scale?: number
  /** Dark/colour-on-transparent marks need a faint light plate to read */
  needsLightPlate?: boolean
}

/**
 * Logos point at the TRIMMED copies. The four `trusted/*` marks were 67–81%
 * transparent padding, so at a shared max-height they rendered roughly a third
 * the size of everything else. See `logoBox` below for how they are sized.
 */
export const trustedClients: TrustedClient[] = [
  { name: 'Sapale Yamaha', logo: '/logos/optimized/yamaha-logo.png', w: 1096, h: 299 },
  { name: 'Sindhudurg Education Society', logo: '/logos/optimized/ses-white-text-logo.png', w: 874, h: 233 },
  { name: 'Divija Old Age Home', logo: '/logos/optimized/divija-logo.png', w: 384, h: 500, needsLightPlate: true, scale: 0.92 },
  { name: 'ONGC', logo: '/logos/optimized/ongc-logo.png', w: 850, h: 906, needsLightPlate: true, scale: 0.92 },
  { name: 'WetNJoy', logo: '/logos/optimized/wetnjoy-logo-footer.png', w: 400, h: 154 },
  { name: 'Walkswagon', logo: '/logos/optimized/walkswagon-logo.png', w: 572, h: 572, needsLightPlate: true, scale: 0.9 },
  // Already the widest mark; the height floor gives it enough presence.
  { name: 'Askara', logo: '/logos/optimized/askara-logo.png', w: 300, h: 66 },
  { name: 'DJI', logo: '/logos/optimized/dji-blue-logo.png', w: 835, h: 481, needsLightPlate: true, scale: 0.95 },
  { name: 'Sapale', logo: '/logos/optimized/sapale-logo.png', w: 701, h: 198 },
  { name: 'Dave and Busters', logo: '/logos/optimized/trusted-dave-and-busters.png', w: 78, h: 78, scale: 0.95 },
  { name: 'Election Commission of India', logo: '/logos/optimized/trusted-election-commission.png', w: 93, h: 88, scale: 0.95 },
  { name: 'Imagica', logo: '/logos/optimized/trusted-imagica.png', w: 159, h: 66 },
  { name: 'NHAI', logo: '/logos/optimized/trusted-nhai.png', w: 106, h: 70 },
]

/**
 * Optical sizing for a logo.
 *
 * Sizing every mark to a constant HEIGHT makes wide wordmarks dominate and
 * square roundels vanish; sizing to a constant WIDTH does the opposite. Sizing
 * to a constant ink AREA is what actually makes a 4.5:1 wordmark and a 1:1
 * roundel feel like they carry the same weight — then the result is clamped
 * into the allowed box so nothing runs away.
 *
 * Aspect ratio is always preserved; the returned box is what the <img> is
 * constrained to, never a stretch.
 */
export function logoBox(
  client: TrustedClient,
  /** Multiplier for the tier (mobile rows are smaller than desktop). */
  tier = 1
): { width: number; height: number } {
  const MAX_W = 175
  const MIN_W = 110
  const MAX_H = 68
  const MIN_H = 38
  /** Target ink area in px² — tuned so the mid-ratio marks land mid-box. */
  const TARGET_AREA = 4300

  const ratio = client.w / client.h
  // area = w * h and w = ratio * h  ⇒  h = sqrt(area / ratio)
  let h = Math.sqrt(TARGET_AREA / ratio) * (client.scale ?? 1) * tier
  let w = h * ratio

  // Clamp into the box, preserving the ratio on whichever axis binds first.
  if (w > MAX_W) { w = MAX_W; h = w / ratio }
  if (h > MAX_H) { h = MAX_H; w = h * ratio }
  if (h < MIN_H) { h = MIN_H; w = h * ratio }
  if (w > MAX_W) { w = MAX_W; h = w / ratio }
  // MIN_W is a floor for the *slot*, not a stretch — a tall mark may be narrower.
  return { width: Math.round(w), height: Math.round(h) }
}

/** Consistent slot width so the rows read as an even rhythm. */
export const LOGO_SLOT_MIN_W = 110

// -------------------------------------------------------------- showreel
export const showreel = {
  src: '/media/showreel/showreel.mp4',
  poster: '/media/showreel/showreel-poster.webp',
  label: 'Showreel',
  microcopy: 'A glimpse of how we turn strategy into stories, content and growth.',
}

// ------------------------------------------------------------ closing CTA
export const closing = {
  question: 'READY TO RISE ABOVE YOUR CATEGORY?',
  cta: 'LET’S BUILD YOUR BRAND.',
  footerLine: 'Your journey from business to brand begins here.',
}
