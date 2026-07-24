/**
 * Case-study content — migrated VERBATIM from the old project's
 * `lib/caseStudies.ts` (the live site's source of truth). Only the data shape
 * was modernised (deprecated fields dropped, per-reel real posters added).
 * Every word of client copy, every metric and every media path maps to real,
 * visually-verified client work — see docs/OLD-SITE-CONTENT-AUDIT.md.
 *
 * Placeholder slots (`isPlaceholder: true`) are honest gaps: the client never
 * supplied that file. Never fill them with generated or stock media.
 */

export interface GrowthMetric {
  label: string
  before: number
  after: number
  suffix?: string
  prefix?: string
  maxValue?: number
  /** Short explanation shown beside the growth figure */
  insight?: string
}

export interface Stat {
  value: string
  label: string
  suffix?: string
  prefix?: string
}

/** A single media asset: post image or reel video */
export interface MediaItem {
  title: string
  src: string
  alt?: string
  poster?: string
  /** 'portrait' = 9:16; 'landscape' = 16:9; 'square' = 1:1 */
  orientation: 'portrait' | 'landscape' | 'square'
  /** true ⇒ honest labelled placeholder card (real file never supplied) */
  isPlaceholder?: boolean
}

export interface TopVideo {
  /** 'testimonial' — recorded client testimonial; 'cinematic' — campaign film */
  type: 'testimonial' | 'cinematic'
  src: string
  poster: string
  orientation: 'portrait' | 'landscape' | 'square'
  title: string
}

export interface CaseStudy {
  id: string
  client: string
  tagline: string
  /** One-sentence supporting line under the homepage/work headline */
  hook: string
  category: string
  year: string
  objective: string
  description: string
  approach: string[]
  resultSummary: string
  /** The single headline metric used in the homepage featured block */
  headlineStat: Stat
  stats: Stat[]
  growthMetrics: GrowthMetric[]
  topVideo: TopVideo
  /** Primary preview video for homepage featured work (real reel) */
  heroMedia: { src: string; poster: string; orientation: 'portrait' | 'landscape' | 'square' }
  thumbnail: string
  reels: MediaItem[]
  posts: MediaItem[]
  /** Client accent — used ONLY inside this project's own presentation */
  accentColor: string
}

export const caseStudies: CaseStudy[] = [
  {
    id: 'sapale-yamaha',
    client: 'Sapale Yamaha',
    tagline: 'From Local Dealer to Digital Powerhouse',
    hook: 'Cinematic product storytelling and targeted campaigns that filled the showroom.',
    category: 'Social Media • Brand Strategy',
    year: '2024',
    objective:
      "To strengthen Sapale Yamaha's digital presence by creating a premium, performance-driven brand identity on social media that reflects Yamaha's style and connects with local audiences through engaging campaigns and product-focused storytelling.",
    description:
      "Sapale Yamaha came to us as a well-respected local dealer with no real digital footprint. We started from scratch — brand positioning, content calendar, cinematic product shoots, and performance-driven social campaigns. Within months, their reels were going viral across Maharashtra, showroom footfalls increased, and their content views crossed 714K. We didn't just grow their numbers; we built a brand that Yamaha riders felt proud to follow.",
    approach: [
      'Developed monthly content calendars with a balance of product highlights, event promotions, and brand storytelling.',
      'Designed high-quality visuals and reels emphasizing design, features, and lifestyle appeal.',
      'Showcased customer experiences, test-ride events, and dealership activities to build community connection.',
      'Maintained consistency in tone, layout, and brand presentation across all platforms.',
    ],
    resultSummary:
      'From a local dealership to a performance-driven digital brand — 3X qualified leads, 250+ sales enquiries generated, 2x showroom walk-ins, and a 50% increase in total sales through targeted digital campaigns.',
    headlineStat: { value: '3', label: 'Qualified Leads Growth', suffix: 'x' },
    stats: [
      { value: '3', label: 'Qualified Leads Growth', suffix: 'x' },
      { value: '250', label: 'Sales Enquiries Generated', suffix: '+' },
      { value: '50', label: 'Sales Growth', suffix: '%', prefix: '+' },
      { value: '4', label: 'More Enquiries', suffix: 'x' },
    ],
    growthMetrics: [
      { label: 'Sales Growth', before: 100, after: 150, suffix: '%', maxValue: 200, insight: '50% increase in total sales through digital campaigns and lead funnels' },
      { label: 'Sales Enquiries', before: 60, after: 250, maxValue: 280, insight: '250+ qualified sales enquiries generated from digital campaigns' },
      { label: 'Qualified Leads', before: 1, after: 3, suffix: 'x', maxValue: 4, insight: '3X growth in qualified leads through targeted content strategy' },
      { label: 'Showroom Walk-ins', before: 1, after: 2, suffix: 'x', maxValue: 3, insight: '2x more showroom walk-ins directly attributed to digital campaigns' },
    ],
    topVideo: {
      type: 'testimonial',
      src: '/case-studies/sapale-yamaha/testimonial/sapale-testimonial.mp4',
      poster: '/case-studies/sapale-yamaha/posters/sapale-testimonial-poster.webp',
      title: 'Sapale Yamaha Testimonial',
      orientation: 'landscape',
    },
    heroMedia: {
      src: '/case-studies/sapale-yamaha/reels/sapale-reel-02.mp4',
      poster: '/case-studies/sapale-yamaha/posters/sapale-reel-02-poster.webp',
      orientation: 'square',
    },
    thumbnail: '/case-studies/sapale-yamaha/posters/sapale-reel-02-poster.webp',
    reels: [
      {
        title: 'Bike Exchange Campaign',
        src: '/case-studies/sapale-yamaha/reels/sapale-reel-01.mp4',
        poster: '/case-studies/sapale-yamaha/posters/sapale-reel-01-poster.webp',
        orientation: 'square',
      },
      {
        title: 'Choose Your Style',
        src: '/case-studies/sapale-yamaha/reels/sapale-reel-02.mp4',
        poster: '/case-studies/sapale-yamaha/posters/sapale-reel-02-poster.webp',
        orientation: 'square',
      },
      {
        title: 'Fascino Brand Film',
        src: '/case-studies/sapale-yamaha/reels/sapale-reel-03.mp4',
        poster: '/case-studies/sapale-yamaha/posters/sapale-reel-03-poster.webp',
        orientation: 'square',
      },
    ],
    posts: [
      { title: 'Brand Campaign', src: '/case-studies/sapale-yamaha/posts/sapale-post-01.webp', alt: 'Sapale Yamaha brand campaign post', orientation: 'portrait' },
      { title: 'Product Highlight', src: '/case-studies/sapale-yamaha/posts/sapale-post-02.webp', alt: 'Sapale Yamaha product highlight post', orientation: 'portrait' },
      { title: 'Festival Creative', src: '/case-studies/sapale-yamaha/posts/sapale-post-03.webp', alt: 'Sapale Yamaha festival creative post', orientation: 'portrait' },
      { title: 'Lifestyle Post', src: '/case-studies/sapale-yamaha/posts/sapale-post-04.webp', alt: 'Sapale Yamaha lifestyle post', orientation: 'portrait' },
      { title: 'Offer Campaign', src: '/case-studies/sapale-yamaha/posts/sapale-post-05.webp', alt: 'Sapale Yamaha offer campaign post', orientation: 'portrait' },
      { title: 'Product Showcase', src: '/case-studies/sapale-yamaha/posts/sapale-post-06.webp', alt: 'Sapale Yamaha product showcase post', orientation: 'portrait' },
      { title: 'Social Creative', src: '/case-studies/sapale-yamaha/posts/sapale-post-07.webp', alt: 'Sapale Yamaha social media creative', orientation: 'portrait' },
    ],
    accentColor: '#204497',
  },
  {
    id: 'sindhudurg-education',
    client: 'Sindhudurg Education Society',
    tagline: 'Building a Presence That Matches Their Legacy in Education',
    hook: 'A unified digital identity that turned academic credibility into admission momentum.',
    category: 'Brand Identity • Content Strategy',
    year: '2024',
    objective:
      'To build a strong and unified digital presence for Sindhudurg Education Society and its colleges — highlighting academic excellence, campus life, and achievements while engaging students and parents through creative social media communication.',
    description:
      "SES Institutions had the academic credibility, but their digital presence didn't reflect it. We built a strategy focused on visibility and consistency across their brand. This shift turned online presence into a real driver of admission leads — generating over 1000 qualified enquiries and driving 10x growth in video views.",
    approach: [
      'Created a main SES Instagram page with collaborative posts across all four college pages to ensure consistency and reach.',
      'Designed a visual identity system using clean layouts, college-specific color accents, and academic-themed graphics.',
      'Crafted monthly content plans covering achievements, campus events, admissions, and faculty highlights.',
      'Used reels, infographics, and carousel posts to make information visually appealing.',
    ],
    resultSummary:
      'A digital strategy that matched SES’s academic excellence — 1000+ qualified admission leads generated, 4x more admission enquiries, 3x website visitors, and 10x growth in video views.',
    headlineStat: { value: '1000', label: 'Qualified Leads Generated', suffix: '+' },
    stats: [
      { value: '1000', label: 'Qualified Leads Generated', suffix: '+' },
      { value: '3', label: 'Website Visitors Growth', suffix: 'x' },
      { value: '4', label: 'Admission Enquiries', suffix: 'x' },
      { value: '10', label: 'Video Views Growth', suffix: 'x' },
    ],
    growthMetrics: [
      { label: 'Qualified Leads', before: 250, after: 1000, suffix: '+', maxValue: 1200, insight: '1000+ qualified admission leads generated through digital strategy' },
      { label: 'Admission Enquiries', before: 1, after: 4, suffix: 'x', maxValue: 5, insight: '4x more admission enquiries year-over-year through visibility' },
      { label: 'Website Visitors', before: 1, after: 3, suffix: 'x', maxValue: 4, insight: '3x increase in website visitors from content strategy' },
      { label: 'Video Views', before: 1, after: 10, suffix: 'x', maxValue: 12, insight: '10x growth in educational and campus video views' },
    ],
    topVideo: {
      // No client testimonial was ever recorded — the first campaign reel
      // stands in as the featured film, honestly badged "Campaign Film"
      // (same strategy the old live site used).
      type: 'cinematic',
      src: '/case-studies/ses/reels/ses-reel-01.mp4',
      poster: '/case-studies/ses/posters/ses-reel-01-poster.webp',
      title: 'Campaign Film',
      orientation: 'square',
    },
    heroMedia: {
      src: '/case-studies/ses/reels/ses-reel-01.mp4',
      poster: '/case-studies/ses/posters/ses-reel-01-poster.webp',
      orientation: 'square',
    },
    thumbnail: '/case-studies/ses/posters/ses-reel-01-poster.webp',
    reels: [
      {
        title: 'Pharmacy Campaign',
        src: '/case-studies/ses/reels/ses-reel-01.mp4',
        poster: '/case-studies/ses/posters/ses-reel-01-poster.webp',
        orientation: 'square',
      },
      {
        title: 'B.Pharm Farewell',
        src: '/case-studies/ses/reels/ses-reel-02.mp4',
        poster: '/case-studies/ses/posters/ses-reel-02-poster.webp',
        orientation: 'square',
      },
      {
        title: 'Consistency Story',
        src: '/case-studies/ses/reels/ses-reel-03.mp4',
        poster: '/case-studies/ses/posters/ses-reel-03-poster.webp',
        orientation: 'square',
      },
    ],
    posts: [
      { title: 'College Branding', src: '/case-studies/ses/posts/ses-post-01.webp', alt: 'SES college branding post', orientation: 'portrait' },
      { title: 'Campus Creative', src: '/case-studies/ses/posts/ses-post-02.webp', alt: 'SES campus creative post', orientation: 'portrait' },
      { title: 'Academic Campaign', src: '/case-studies/ses/posts/ses-post-03.webp', alt: 'SES academic campaign post', orientation: 'portrait' },
    ],
    accentColor: '#334FA2',
  },
  {
    id: 'divija-old-age-home',
    client: 'Divija Old Age Home',
    tagline: "Giving a Voice to Divija's Mission",
    hook: 'Emotional storytelling that turned quiet, meaningful work into a supported mission.',
    category: 'Brand Rebuild • Film Production',
    year: '2023',
    objective:
      'Rebuilt their digital presence with warmth and trust, driving awareness and donations through emotional storytelling.',
    description:
      'Divija Old Age Home was doing meaningful work, but few people knew about it. We built a system of consistent outreach and automation to put their story in front of the right people — turning attention into donations and volunteer support through emotional storytelling and targeted campaigns.',
    approach: [
      'Rebuilt the brand identity from scratch — rooted in warmth, dignity, and community trust',
      "Produced an emotional film series documenting residents' daily lives and stories",
      'Created a social media strategy centred on empathy-driven storytelling',
      'Designed donation appeal content that turned passive viewers into active supporters',
      'Shared volunteer stories and community impact updates to maintain ongoing engagement',
    ],
    resultSummary:
      'From overlooked to overwhelmed with support — 70% growth in donations, 3x more website visitors, 20% new recurring donors, and 50+ volunteer sign-ups from a community that finally found its voice.',
    headlineStat: { value: '70', label: 'Donation Growth', suffix: '%', prefix: '+' },
    stats: [
      { value: '70', label: 'Donation Growth', suffix: '%', prefix: '+' },
      { value: '3', label: 'Website Visitors', suffix: 'x' },
      { value: '50', label: 'Volunteer Sign-ups', suffix: '+' },
      { value: '20', label: 'Recurring Donors', suffix: '%' },
    ],
    growthMetrics: [
      { label: 'Donation Growth', before: 100, after: 170, suffix: '%', maxValue: 200, insight: '70% growth in total donations through consistent outreach campaigns' },
      { label: 'Website Visitors', before: 1, after: 3, suffix: 'x', maxValue: 4, insight: '3x more people discovering Divija’s mission online' },
      { label: 'Volunteer Sign-ups', before: 10, after: 50, suffix: '+', maxValue: 60, insight: '50+ new volunteers signed up after campaign launch' },
      { label: 'Recurring Donors', before: 0, after: 20, suffix: '%', maxValue: 25, insight: '20% of donors became recurring monthly supporters' },
    ],
    topVideo: {
      type: 'testimonial',
      src: '/case-studies/divija/testimonials/divija-testimonial.mp4',
      poster: '/case-studies/divija/posters/divija-testimonial-poster.webp',
      title: 'Divija Community Story',
      orientation: 'landscape',
    },
    heroMedia: {
      src: '/case-studies/divija/testimonials/divija-testimonial.mp4',
      poster: '/case-studies/divija/posters/divija-testimonial-poster.webp',
      orientation: 'landscape',
    },
    thumbnail: '/case-studies/divija/posters/divija-reel-01-poster.webp',
    reels: [
      {
        title: 'Diwali Campaign',
        src: '/case-studies/divija/reels/divija-reel-01.mp4',
        poster: '/case-studies/divija/posters/divija-reel-01-poster.webp',
        orientation: 'square',
      },
      {
        // Real file never supplied. The raw folder's "divija-video-vertical"
        // was audited and is STOCK footage — must not fill this slot.
        title: 'Resident Story Film',
        src: '',
        orientation: 'portrait',
        isPlaceholder: true,
      },
      {
        title: 'Donation Campaign Reel',
        src: '',
        orientation: 'portrait',
        isPlaceholder: true,
      },
    ],
    posts: [
      { title: 'Resident Story', src: '', alt: 'Divija resident story post', orientation: 'portrait', isPlaceholder: true },
      { title: 'Donation Appeal', src: '', alt: 'Divija donation appeal creative', orientation: 'portrait', isPlaceholder: true },
    ],
    accentColor: '#0092CB',
  },
]

export const getCaseStudy = (id: string) => caseStudies.find((c) => c.id === id)

/** Ordered ids for prev/next navigation on detail pages */
export const caseStudyOrder = caseStudies.map((c) => c.id)
