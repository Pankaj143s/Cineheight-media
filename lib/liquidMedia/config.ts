/**
 * Liquid-media signature prototype flags.
 *
 * Toggle `enhancedMatteEdge` to compare base SVG/CSS mattes vs high-tier soft
 * optical edge without changing the concept. Defaults favour the safer base
 * path; high-tier code still gates on capability.
 */

export const LIQUID_MEDIA_PROTO = {
  /** Master switch for the experiment branch signatures. */
  enabled: true,
  /**
   * High-tier soft matte edge (Work Option B). When false, all devices use the
   * base SVG/CSS matte even on high-capability desktops.
   */
  enhancedMatteEdge: true,
  /** Hide Selected Work intro body visually (reversible). */
  hideSelectedWorkIntroBody: true,
} as const
