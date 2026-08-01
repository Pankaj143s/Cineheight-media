/**
 * Shared motion vocabulary.
 *
 * Every reveal, hover, scrub and route change on the site draws its easing and
 * duration from here rather than re-inventing a curve inline. The point is not
 * micro-optimisation — it is that two sections animating "at the same speed"
 * actually do, and that a change to the house feel is one edit rather than
 * forty.
 *
 * Values are exposed in both CSS (`cubic-bezier(...)` strings, ms) and GSAP
 * (named eases, seconds) flavours because both engines are in use: GSAP owns
 * `transform` and ScrollTrigger work, CSS owns hover/focus states and the
 * `translate`/`scale` properties the parallax field writes.
 */

/* ------------------------------------------------------------------ easing */

/** House curve — a long, confident settle. Reveals, route panels, layout moves. */
export const EASE_SIGNAL = 'cubic-bezier(0.16, 1, 0.3, 1)'
/** Slightly quicker settle for controls and smaller UI that must feel responsive. */
export const EASE_CONTROL = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** Symmetric curve for things that travel and stop, e.g. a carousel snap. */
export const EASE_TRAVEL = 'cubic-bezier(0.65, 0, 0.35, 1)'
/** Fast out — dismissals, fades that should not linger. */
export const EASE_EXIT = 'cubic-bezier(0.4, 0, 1, 1)'

/** framer-motion cubic array form of {@link EASE_CONTROL}. */
export const EASE_CONTROL_ARRAY = [0.22, 1, 0.36, 1] as const
/** framer-motion cubic array form of {@link EASE_SIGNAL}. */
export const EASE_SIGNAL_ARRAY = [0.16, 1, 0.3, 1] as const

/** GSAP named eases matched as closely as practical to the CSS curves above. */
export const GSAP_EASE = {
  signal: 'expo.out',
  control: 'power3.out',
  travel: 'power2.inOut',
  exit: 'power2.in',
  /** Node/pulse emphasis — a small, crisp pop. */
  emphasis: 'power2.out',
} as const

/* --------------------------------------------------------------- durations */

/** Milliseconds. CSS transitions, timers, audio envelopes. */
export const DURATION_MS = {
  /** Hover/focus state changes on controls. */
  hover: 320,
  /** Pressed/active feedback. */
  press: 130,
  /** A single line or word band resolving. */
  reveal: 900,
  /** A full multi-line headline, longest band included. */
  revealLong: 1200,
  /** Route loader: mask closing over the outgoing page. */
  routeOut: 430,
  /** Route loader: destination revealing. */
  routeIn: 390,
  /** Route loader: bar completing to 100%. */
  routeComplete: 140,
  /** Tooltip/toast auto-dismiss. */
  toast: 2600,
  /** Last-resort "show the content anyway" guard for observer-driven reveals. */
  failsafe: 2600,
} as const

/** Seconds. GSAP tweens. */
export const DURATION_S = {
  hover: DURATION_MS.hover / 1000,
  reveal: DURATION_MS.reveal / 1000,
  revealLong: DURATION_MS.revealLong / 1000,
  emphasis: 0.34,
} as const

/** Stagger steps, in seconds, for grouped reveals. */
export const STAGGER_S = {
  /** Between headline lines. */
  line: 0.09,
  /** Between words. */
  word: 0.045,
  /** Between characters in a small kinetic label. */
  char: 0.022,
  /** Between sibling blocks (steps, cards, list rows). */
  block: 0.12,
} as const

/* ------------------------------------------------------------------- scrub */

/**
 * ScrollTrigger scrub values. Higher = more lag behind the scrollbar, which
 * reads as weight; too high and the animation feels disconnected from the
 * gesture.
 */
export const SCRUB = {
  /** Headline depth/tracking — should feel attached to the scroll. */
  text: 0.6,
  /** Long drawn paths and signal work. */
  signal: 0.75,
  /** Large staged sequences that own a pinned viewport. */
  stage: 0.6,
} as const

/** Common ScrollTrigger windows, so sections start and finish in sympathy. */
export const TRIGGER = {
  /** A section's motion begins when its top is this far up the viewport. */
  sectionStart: 'top 78%',
  /** …and completes when its bottom reaches here. */
  sectionEnd: 'bottom 42%',
  /** A single heading resolving. */
  headlineStart: 'top 88%',
  headlineEnd: 'top 42%',
} as const

/* -------------------------------------------------------------- damping ---- */

/**
 * Per-frame closure fractions for `damp(f, dt)` in `lib/utils`. Named so a
 * carousel and a pointer follower can deliberately share — or deliberately not
 * share — a feel.
 */
export const DAMP = {
  /** Pointer followers, cursor trails — must feel immediate. */
  pointer: 0.18,
  /** Media drift, atmospheric layers — slow and heavy. */
  atmosphere: 0.08,
  /** Carousel/orbit snapping. */
  snap: 0.15,
  /** Parallax field settle. */
  parallax: 0.14,
} as const

/* ----------------------------------------------------- reduced-motion ------ */

/**
 * What every animated component collapses to when the visitor asks for reduced
 * motion: no travel, no scrub, and a duration short enough to read as a state
 * change rather than an animation.
 */
export const REDUCED = {
  durationMs: 160,
  focusMs: 180,
  sceneGap: 0.78,
  maxTravelPx: 4,
  ease: 'ease-out',
  /** Route loader stages, milliseconds. */
  routeOutMs: 160,
  routeInMs: 180,
  routeCompleteMs: 32,
} as const

/** Resolve a duration against the visitor's motion preference. */
export const motionMs = (ms: number, reduced: boolean) => (reduced ? REDUCED.durationMs : ms)
