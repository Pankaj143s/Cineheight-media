/**
 * Measured signal-path geometry.
 *
 * Both the route-spanning thread and the "How we work" process line draw a
 * smooth curve through a set of points that only exist once the DOM has laid
 * out. Hard-coding SVG coordinates and stretching them with
 * `preserveAspectRatio="none"` looks right at one viewport and wrong at every
 * other one — the line drifts off its nodes, and non-uniform scaling squashes
 * anything circular. So the path is built in real pixels from measured
 * positions instead.
 */

import { clamp } from '@/lib/utils'

export interface PathPoint {
  x: number
  y: number
}

export interface PathSample {
  len: number
  x: number
  y: number
}

export interface BuildPathOptions {
  /**
   * Dominant travel direction. Control points are clamped along this axis so
   * the curve advances monotonically and can never hook back on itself.
   */
  axis?: 'x' | 'y'
  /**
   * Perpendicular bow applied to each segment's control points, as a fraction
   * of that segment's length. The curve still passes exactly through every
   * point — only the approach into each one bends — so nodes stay on the line
   * while the line stops looking like a ruler. Alternates sign per segment.
   */
  bow?: number
  /** Absolute cap on the bow offset, in pixels. */
  maxBow?: number
}

/**
 * Catmull-Rom through `pts`, emitted as cubic Béziers.
 *
 * The tangent handles are the usual (p2 − p0) / 6 form, then clamped: along the
 * travel axis they stay inside the segment (monotonic advance), and across it
 * they are limited relative to the segment's extent so a wide gap cannot
 * produce a wild sideways loop.
 */
export function buildSignalPath(pts: PathPoint[], options: BuildPathOptions = {}): string {
  if (pts.length < 2) return ''
  const { axis = 'y', bow = 0, maxBow = 26 } = options

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]

    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const span = Math.max(1, Math.hypot(dx, dy))

    // Cross-axis lean cap: a control point may lean sideways by at most 60 % of
    // the segment's extent along the travel axis.
    const along = axis === 'y' ? Math.max(1, Math.abs(dy)) : Math.max(1, Math.abs(dx))
    const maxCross = along * 0.6

    // Alternating perpendicular offset, so consecutive segments bow opposite
    // ways and the whole path reads as one relaxed wave.
    const bowAmount = Math.min(span * bow, maxBow) * (i % 2 === 0 ? 1 : -1)
    const nx = -(dy / span) * bowAmount
    const ny = (dx / span) * bowAmount

    let c1x = p1.x + (p2.x - p0.x) / 6
    let c2x = p2.x - (p3.x - p1.x) / 6
    let c1y = p1.y + (p2.y - p0.y) / 6
    let c2y = p2.y - (p3.y - p1.y) / 6

    if (axis === 'y') {
      c1x = p1.x + clamp(c1x - p1.x, -maxCross, maxCross)
      c2x = p2.x + clamp(c2x - p2.x, -maxCross, maxCross)
      c1y = clamp(c1y, Math.min(p1.y, p2.y), Math.max(p1.y, p2.y))
      c2y = clamp(c2y, Math.min(p1.y, p2.y), Math.max(p1.y, p2.y))
    } else {
      c1y = p1.y + clamp(c1y - p1.y, -maxCross, maxCross)
      c2y = p2.y + clamp(c2y - p2.y, -maxCross, maxCross)
      c1x = clamp(c1x, Math.min(p1.x, p2.x), Math.max(p1.x, p2.x))
      c2x = clamp(c2x, Math.min(p1.x, p2.x), Math.max(p1.x, p2.x))
    }

    d +=
      ` C ${(c1x + nx).toFixed(1)} ${(c1y + ny).toFixed(1)},` +
      ` ${(c2x + nx).toFixed(1)} ${(c2y + ny).toFixed(1)},` +
      ` ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }

  return d
}

/**
 * Sample a laid-out path into a `{len, x, y}` lookup table.
 *
 * Arc length is not proportional to straight-line distance — wherever the curve
 * bends it covers a lot of length for very little travel — so anything that
 * needs "how far along is this point" must search a table rather than assume a
 * linear map. Sampling costs one pass per rebuild and nothing per frame.
 */
export function sampleSignalPath(path: SVGPathElement, count = 240): PathSample[] {
  const length = path.getTotalLength()
  const samples: PathSample[] = new Array(count + 1)
  for (let i = 0; i <= count; i++) {
    const len = (length * i) / count
    const pt = path.getPointAtLength(len)
    samples[i] = { len, x: pt.x, y: pt.y }
  }
  return samples
}

/**
 * Arc-length fraction (0–1) of the sampled point closest to `target`.
 *
 * Used to work out where each measured node sits along the drawn line, so the
 * node can light up at exactly the moment the travelling pulse reaches it.
 */
export function fractionAtPoint(samples: PathSample[], target: PathPoint): number {
  if (!samples.length) return 0
  const total = samples[samples.length - 1].len
  if (total <= 0) return 0

  let bestLen = 0
  let bestDist = Infinity
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    const d = (s.x - target.x) ** 2 + (s.y - target.y) ** 2
    if (d < bestDist) {
      bestDist = d
      bestLen = s.len
    }
  }
  return clamp(bestLen / total, 0, 1)
}

/** Point at an arc-length fraction, read from the sample table (no DOM call). */
export function pointAtFraction(samples: PathSample[], fraction: number): PathPoint {
  if (!samples.length) return { x: 0, y: 0 }
  const idx = clamp(Math.round(fraction * (samples.length - 1)), 0, samples.length - 1)
  return { x: samples[idx].x, y: samples[idx].y }
}
