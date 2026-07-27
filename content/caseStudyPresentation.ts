/**
 * Display copy for the case-study pages.
 *
 * `content/caseStudies.ts` remains the factual record and is not edited: the
 * verified objective, description, approach list, stats, growth metrics and
 * resultSummary all stay exactly as audited. This file is the *presentation*
 * layer on top of it.
 *
 * Why it exists: rendering the source data directly meant the same facts
 * appeared four and five times on one page — the tagline as the opening H1 and
 * again inside "The Story"; every metric inside the resultSummary prose, then
 * as a headline stat, then as supporting stats, then again as four growth
 * comparison rows. A visitor had to read everything to learn anything.
 *
 * Every line below is grounded in that source data. Nothing is invented, no
 * figure is altered, and the original copy still ships as the accessible /
 * metadata text.
 */

import { caseStudies } from './caseStudies'

export interface CaseMetric {
  value: string
  prefix?: string
  suffix?: string
  label: string
  /** One short clause explaining what moved. Verified insight text. */
  note?: string
  /** Optional before → after detail, shown INSIDE the metric, not as a row. */
  before?: number
  after?: number
  maxValue?: number
}

export interface StrategyMove {
  title: string
  description: string
}

export interface CasePresentation {
  /** Act 1 — the transformation, at display scale. */
  transformation: string
  supporting: string
  /** The single proof shown in the opening. */
  primaryMetric: CaseMetric
  /** Act 2 — 35–60 words, the business problem, no marketing filler. */
  startingPoint: string
  /** Act 3 — exactly three moves. */
  strategyMoves: StrategyMove[]
  /** Act 4 — one sentence that does NOT restate the numbers. */
  resultLead: string
  /** Act 4 — the supporting figures, deliberately excluding near-duplicates. */
  metrics: CaseMetric[]
  /** Optional extra proof shown quietly, away from the main group. */
  secondaryProof?: CaseMetric
  /** Act 5 — the editorial bridge into the work itself. */
  workBridge: { eyebrow: string; heading: string; supporting: string }
}

export const casePresentation: Record<string, CasePresentation> = {
  'sapale-yamaha': {
    transformation: 'From local dealer to digital powerhouse.',
    supporting:
      'We built a premium digital identity, a consistent content engine and targeted campaigns that turned attention into showroom enquiries and sales.',
    primaryMetric: { value: '3', suffix: '×', label: 'Qualified leads' },
    startingPoint:
      'Sapale Yamaha already had strong local trust, but its digital presence lacked a consistent identity, a regular content system and a predictable way to turn online attention into qualified enquiries.',
    strategyMoves: [
      {
        title: 'Position the brand',
        description:
          'Defined a premium, performance-led digital identity that aligned the dealership’s local reputation with Yamaha’s product and lifestyle appeal.',
      },
      {
        title: 'Build a content engine',
        description:
          'Created monthly content systems, cinematic product reels, event coverage and customer-led stories that kept the brand visible and recognisable.',
      },
      {
        title: 'Convert attention',
        description:
          'Connected the content with targeted campaigns and lead-focused communication to generate enquiries, showroom visits and measurable sales growth.',
      },
    ],
    resultLead:
      'A consistent digital system turned online visibility into qualified interest, showroom movement and sales.',
    metrics: [
      {
        value: '250',
        suffix: '+',
        label: 'Sales enquiries',
        note: 'Generated from digital campaigns.',
      },
      {
        value: '2',
        suffix: '×',
        label: 'Showroom walk-ins',
        note: 'Directly attributed to digital campaigns.',
        before: 1,
        after: 2,
        maxValue: 3,
      },
      {
        value: '50',
        prefix: '+',
        suffix: '%',
        label: 'Sales growth',
        note: 'Through campaigns and lead funnels.',
        before: 100,
        after: 150,
        maxValue: 200,
      },
    ],
    // Verified in the source description: "their content views crossed 714K".
    secondaryProof: { value: '714K', suffix: '+', label: 'Content views' },
    workBridge: {
      eyebrow: 'THE WORK BEHIND THE GROWTH',
      heading: 'Content built to attract — and convert.',
      supporting:
        'Product stories, campaign reels and consistent brand creatives gave the strategy a recognisable public face.',
    },
  },

  'sindhudurg-education': {
    transformation: 'A presence that matches their legacy in education.',
    supporting:
      'We unified four college pages into one visual system and built a steady stream of content that made academic strength visible to students and parents.',
    primaryMetric: { value: '1000', suffix: '+', label: 'Qualified admission leads' },
    startingPoint:
      'The institutions had established academic credibility, but their online presence was fragmented and did not communicate that strength consistently to students or parents.',
    strategyMoves: [
      {
        title: 'Unify the presence',
        description:
          'Created a consistent visual and communication system across the society and its college pages.',
      },
      {
        title: 'Make academic value visible',
        description:
          'Built regular content around programmes, achievements, admissions, campus life, faculty and student experiences.',
      },
      {
        title: 'Turn reach into admission interest',
        description:
          'Used collaborative distribution, reels and admission-led campaigns to reach students and parents at the right time.',
      },
    ],
    resultLead:
      'Consistent, visible communication turned established academic credibility into real admission interest.',
    metrics: [
      {
        value: '4',
        suffix: '×',
        label: 'Admission enquiries',
        note: 'Year-over-year, through visibility.',
        before: 1,
        after: 4,
        maxValue: 5,
      },
      {
        value: '3',
        suffix: '×',
        label: 'Website visitors',
        note: 'Driven by the content strategy.',
        before: 1,
        after: 3,
        maxValue: 4,
      },
      {
        value: '10',
        suffix: '×',
        label: 'Video views',
        note: 'Across educational and campus films.',
        before: 1,
        after: 10,
        maxValue: 12,
      },
    ],
    workBridge: {
      eyebrow: 'THE WORK BEHIND THE GROWTH',
      heading: 'Content that made academic value visible.',
      supporting:
        'Campaign reels and a consistent creative system gave four college pages one recognisable voice.',
    },
  },

  'divija-old-age-home': {
    transformation: 'Giving a voice to Divija’s mission.',
    supporting:
      'We rebuilt the brand around warmth and dignity, then told the residents’ stories consistently enough for the community to respond.',
    primaryMetric: { value: '70', prefix: '+', suffix: '%', label: 'Donation growth' },
    startingPoint:
      'Divija was doing meaningful community work, but limited visibility and inconsistent digital communication made it difficult to attract sustained donations and volunteer support.',
    strategyMoves: [
      {
        title: 'Build trust',
        description:
          'Created a warmer and more consistent identity rooted in dignity, empathy and community support.',
      },
      {
        title: 'Tell human stories',
        description:
          'Produced emotional films and social content that made residents, volunteers and the organisation’s impact visible.',
      },
      {
        title: 'Turn awareness into support',
        description:
          'Connected the storytelling with donation appeals, volunteer communication and consistent outreach.',
      },
    ],
    resultLead:
      'Consistent, human storytelling turned quiet community work into sustained support.',
    metrics: [
      {
        value: '3',
        suffix: '×',
        label: 'Website visitors',
        note: 'More people discovering the mission.',
        before: 1,
        after: 3,
        maxValue: 4,
      },
      {
        value: '50',
        suffix: '+',
        label: 'Volunteer sign-ups',
        note: 'New volunteers after launch.',
        before: 10,
        after: 50,
        maxValue: 60,
      },
      {
        value: '20',
        suffix: '%',
        label: 'Recurring donors',
        note: 'Donors who became monthly supporters.',
        before: 0,
        after: 20,
        maxValue: 25,
      },
    ],
    workBridge: {
      eyebrow: 'THE WORK BEHIND THE GROWTH',
      heading: 'Storytelling that earned support.',
      supporting:
        'Films and campaign creatives made the residents, the volunteers and the impact visible.',
    },
  },
}

export const getPresentation = (id: string): CasePresentation | undefined =>
  casePresentation[id]

/**
 * Every case study must have presentation copy — a missing entry would silently
 * render an empty page, so fail loudly at module load instead.
 */
const missing = caseStudies.filter((cs) => !casePresentation[cs.id]).map((cs) => cs.id)
if (missing.length) {
  throw new Error(`caseStudyPresentation.ts is missing entries for: ${missing.join(', ')}`)
}
