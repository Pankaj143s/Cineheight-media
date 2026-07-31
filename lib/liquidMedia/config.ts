/**
 * Liquid-media signature flags.
 *
 * Homepage prototype remains the visual reference. Sitewide pages borrow the
 * same vocabulary through shared tokens/primitives — not by cloning the hero
 * wordmark refraction or Selected Work diagonal wipe wholesale.
 */

export const LIQUID_MEDIA_PROTO = {
  /** Master switch for liquid-media signatures (homepage + sitewide). */
  enabled: true,
  /**
   * High-tier soft matte edge. When false, all devices use the base SVG/CSS
   * matte even on high-capability desktops.
   */
  enhancedMatteEdge: true,
  /** Hide Selected Work intro body visually (reversible). */
  hideSelectedWorkIntroBody: true,
  /** Sitewide optical title resolves (Work / About / case openings). */
  opticalTitles: true,
  /** Sitewide editorial matte media reveals (Work index / case openings). */
  editorialMattes: true,
} as const
