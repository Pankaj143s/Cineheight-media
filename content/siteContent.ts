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
 * `image` points at the new coordinated collection in
 * /generated/presentation/services (see scripts/build-service-visuals.mjs).
 * The previous /generated/services-final artwork is retained on disk as a
 * fallback but is no longer referenced: it showed laptops, analytics
 * dashboards and platform icons, which read as a generic technology template
 * rather than a creative agency.
 */
export const services: Service[] = [
  {
    id: 'brand-identity',
    index: '01',
    title: 'Brand Identity & Design',
    description: 'Distinctive brand identities that capture your essence and resonate with your audience.',
    detail:
      'Positioning, naming systems, logo and visual identity, brand guidelines and the design language your audience will remember you by.',
    image: '/generated/presentation/services/brand-identity.webp',
  },
  {
    id: 'social-media',
    index: '02',
    title: 'Social Media Management',
    description: 'Strategic social presence that builds community and converts followers into customers.',
    detail:
      'Monthly content calendars, platform strategy, community management and consistent brand presentation across every channel.',
    image: '/generated/presentation/services/social-media.webp',
  },
  {
    id: 'graphic-design',
    index: '03',
    title: 'Graphic Design & Visuals',
    description: 'Eye-catching visual content that communicates your message and stops the scroll.',
    detail:
      'Campaign creatives, social posts, infographics and print — visuals built on one coherent system, not one-off graphics.',
    image: '/generated/presentation/services/graphic-design.webp',
  },
  {
    id: 'video-production',
    index: '04',
    title: 'Video Production & Editing',
    description: 'Cinematic storytelling that captivates your audience from concept to final cut.',
    detail:
      'Product films, reels, campaign videos and testimonials — shot, edited and graded for the platforms they live on.',
    image: '/generated/presentation/services/video-production.webp',
  },
  {
    id: 'performance-marketing',
    index: '05',
    title: 'Performance Marketing',
    description: 'Data-driven campaigns that deliver measurable results and real growth.',
    detail:
      'Targeted campaigns, lead funnels and continuous optimisation — the discipline that turns attention into enquiries and sales.',
    image: '/generated/presentation/services/performance-marketing.webp',
  },
  {
    id: 'content-creation',
    index: '06',
    title: 'Content Creation',
    description: 'Compelling content that tells your story through photography, video, and copy.',
    detail:
      'Photography, short-form video and copywriting produced as one connected stream — so every post sounds and looks like you.',
    image: '/generated/presentation/services/content-creation.webp',
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
  { index: '02', title: 'Strategize', description: 'A roadmap combining creativity with marketing insights.' },
  { index: '03', title: 'Create', description: 'Design and content teams bring ideas to life.' },
  { index: '04', title: 'Deliver', description: 'Launch, publish and manage campaigns — then monitor and refine for better outcomes.' },
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
