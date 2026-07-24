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

export const services: Service[] = [
  {
    id: 'brand-identity',
    index: '01',
    title: 'Brand Identity & Design',
    description: 'Distinctive brand identities that capture your essence and resonate with your audience.',
    detail:
      'Positioning, naming systems, logo and visual identity, brand guidelines and the design language your audience will remember you by.',
    image: '/generated/services-final/brand-identity.webp',
  },
  {
    id: 'social-media',
    index: '02',
    title: 'Social Media Management',
    description: 'Strategic social presence that builds community and converts followers into customers.',
    detail:
      'Monthly content calendars, platform strategy, community management and consistent brand presentation across every channel.',
    image: '/generated/services-final/social-media.webp',
  },
  {
    id: 'graphic-design',
    index: '03',
    title: 'Graphic Design & Visuals',
    description: 'Eye-catching visual content that communicates your message and stops the scroll.',
    detail:
      'Campaign creatives, social posts, infographics and print — visuals built on one coherent system, not one-off graphics.',
    image: '/generated/services-final/graphic-design.webp',
  },
  {
    id: 'video-production',
    index: '04',
    title: 'Video Production & Editing',
    description: 'Cinematic storytelling that captivates your audience from concept to final cut.',
    detail:
      'Product films, reels, campaign videos and testimonials — shot, edited and graded for the platforms they live on.',
    image: '/generated/services-final/video-production.webp',
  },
  {
    id: 'performance-marketing',
    index: '05',
    title: 'Performance Marketing',
    description: 'Data-driven campaigns that deliver measurable results and real growth.',
    detail:
      'Targeted campaigns, lead funnels and continuous optimisation — the discipline that turns attention into enquiries and sales.',
    image: '/generated/services-final/performance-marketing.webp',
  },
  {
    id: 'content-creation',
    index: '06',
    title: 'Content Creation',
    description: 'Compelling content that tells your story through photography, video, and copy.',
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
  logo: string
  maxW: number
  maxH: number
  /** Dark/colour-on-transparent marks need a faint light plate to read */
  needsLightPlate?: boolean
}

export const trustedClients: TrustedClient[] = [
  { name: 'Sapale Yamaha', logo: '/logos/yamaha-logo.png', maxW: 155, maxH: 45 },
  { name: 'Sindhudurg Education Society', logo: '/logos/ses-white-text-logo.png', maxW: 148, maxH: 43 },
  { name: 'Divija Old Age Home', logo: '/logos/divija-logo.png', maxW: 46, maxH: 60, needsLightPlate: true },
  { name: 'ONGC', logo: '/logos/ongc-logo.png', maxW: 56, maxH: 58, needsLightPlate: true },
  { name: 'WetNJoy', logo: '/logos/wetnjoy-logo-footer.png', maxW: 130, maxH: 46 },
  { name: 'Walkswagon', logo: '/logos/walkswagon-logo.png', maxW: 58, maxH: 58, needsLightPlate: true },
  { name: 'Askara', logo: '/logos/askara-logo.png', maxW: 160, maxH: 36 },
  { name: 'DJI', logo: '/logos/dji-blue-logo.png', maxW: 110, maxH: 63, needsLightPlate: true },
  { name: 'Sapale', logo: '/logos/sapale-logo.png', maxW: 150, maxH: 42 },
  { name: 'Dave and Busters', logo: '/logos/trusted/dave-and-busters.png', maxW: 130, maxH: 46 },
  { name: 'Election Commission of India', logo: '/logos/trusted/election-commission.png', maxW: 130, maxH: 46 },
  { name: 'Imagica', logo: '/logos/trusted/imagica.png', maxW: 130, maxH: 46 },
  { name: 'NHAI', logo: '/logos/trusted/nhai.png', maxW: 130, maxH: 46 },
]

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
