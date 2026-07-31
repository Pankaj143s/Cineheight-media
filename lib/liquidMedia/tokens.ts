/**
 * Liquid-media sitewide timing — extends lib/motionTokens without replacing it.
 * Page signatures borrow these ranges so Work / case / services / about / contact
 * share one clock language with the homepage prototype.
 */

import { DURATION_S, GSAP_EASE, SCRUB, STAGGER_S } from '@/lib/motionTokens'

/** Shared narrative beats: anticipation → reveal → hold → transition → resolution. */
export const LIQUID_BEAT = {
  anticipate: 0.18,
  reveal: DURATION_S.reveal,
  revealLong: DURATION_S.revealLong,
  hold: 0.35,
  transition: 0.72,
  resolve: 0.55,
} as const

export const LIQUID_EASE = {
  reveal: GSAP_EASE.signal,
  travel: GSAP_EASE.travel,
  exit: GSAP_EASE.exit,
  control: GSAP_EASE.control,
} as const

export const LIQUID_STAGGER = {
  line: STAGGER_S.line,
  word: STAGGER_S.word,
  block: STAGGER_S.block,
} as const

export const LIQUID_SCRUB = {
  media: SCRUB.stage,
  title: SCRUB.text,
  signal: SCRUB.signal,
} as const

/** Soft optical limits — keep displacement readable, never a gimmick. */
export const LIQUID_OPTICAL = {
  /** Max CSS blur (px) during optical title resolve. */
  blurPx: 8,
  /** Starting letter-spacing during resolve (em). */
  trackingFrom: 0.06,
  trackingTo: -0.035,
  /** Fail-open: force sharp text if resolve stalls (ms). */
  failOpenMs: 2200,
} as const

export type CaseOpeningSignature =
  | 'film-gate'
  | 'optical-title'
  | 'diagonal-media'
  | 'signal-trace'

/** Per-case opening — one signature each, not a stack of effects. */
export const CASE_OPENING_SIGNATURE: Record<string, CaseOpeningSignature> = {
  'sapale-yamaha': 'film-gate',
  'sindhudurg-education': 'optical-title',
  'divija-old-age-home': 'diagonal-media',
}
