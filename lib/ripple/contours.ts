/**
 * Rasterises AtmosphereLayer's contour field into a texture for the ripple
 * shader.
 *
 * The hero water surface is opaque, so it has to reproduce everything the DOM
 * paints beneath it — otherwise fading it out mid-hero reads as a background
 * cross-dissolve. Every other layer in that stack is an analytic gradient and
 * lives in the shader, but these nine hairlines are cubic beziers. Curve-fitting
 * them (sine series, then a degree-7 polynomial) left a ~2px positional error,
 * which for a 0.6px non-scaling stroke means the reproduction lands *beside*
 * the real line rather than on it — visibly worse than not drawing them at all.
 *
 * Path2D consumes SVG path data directly, so rasterising the real `d` strings
 * at the canvas's own device resolution is both exact and trivial. It also
 * means the hairlines get refracted along with the rest of the surface.
 */

/**
 * Verbatim from `components/flow/AtmosphereLayer.tsx`. Kept as a copy rather
 * than an import because that module is a server component: importing it here
 * would drag JSX into the WebGL chunk. If those paths ever change, this array
 * has to change with them — the plate-fidelity check in the verification pass
 * is what catches a drift.
 */
const STATIC_CONTOURS = [
  'M-40 110 C230 82 420 148 710 112 S1160 76 1520 126',
  'M-40 190 C250 228 470 156 760 196 S1190 238 1520 178',
  'M-40 275 C220 238 455 306 730 270 S1190 232 1520 286',
  'M-40 365 C260 408 500 326 780 370 S1190 410 1520 350',
  'M-40 455 C220 414 480 496 750 450 S1170 412 1520 468',
  'M-40 545 C250 588 480 510 780 552 S1210 590 1520 532',
  'M-40 635 C210 598 450 678 740 632 S1170 596 1520 652',
  'M-40 725 C250 768 500 686 780 730 S1200 770 1520 712',
  'M-40 815 C220 778 470 852 750 810 S1190 778 1520 828',
]

/** The SVG's own viewBox, with preserveAspectRatio="none". */
const VIEW_W = 1440
const VIEW_H = 900
/** `.static-contour-field { opacity: 0.24 }` in globals.css. */
const FIELD_OPACITY = 0.24

/**
 * Draw the contour field at `width` × `height` device pixels.
 *
 * `preserveAspectRatio="none"` means the geometry is stretched to fill, while
 * `vectorEffect="non-scaling-stroke"` means the stroke stays the authored width
 * in device pixels. Those two pull in opposite directions, so the geometry is
 * transformed via `Path2D.addPath(..., DOMMatrix)` and the stroke is applied
 * afterwards with no context transform — which is exactly what the SVG does.
 */
export function drawContourField(width: number, height: number): HTMLCanvasElement | null {
  if (width < 1 || height < 1) return null
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx || typeof Path2D === 'undefined') return null

  const sx = width / VIEW_W
  const sy = height / VIEW_H
  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = '#0089FF'
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'round'

  for (let i = 0; i < STATIC_CONTOURS.length; i++) {
    const source = new Path2D(STATIC_CONTOURS[i])
    const scaled = new Path2D()
    try {
      scaled.addPath(source, new DOMMatrix([sx, 0, 0, sy, 0, 0]))
    } catch {
      // No DOMMatrix overload (very old Safari) — fall back to a context
      // transform and accept a slightly anisotropic stroke.
      ctx.save()
      ctx.setTransform(sx, 0, 0, sy, 0, 0)
      ctx.globalAlpha = FIELD_OPACITY * (i === 4 ? 0.36 : 0.2)
      ctx.lineWidth = (i === 4 ? 0.9 : 0.6) / Math.max(sx, sy)
      ctx.stroke(source)
      ctx.restore()
      continue
    }
    ctx.globalAlpha = FIELD_OPACITY * (i === 4 ? 0.36 : 0.2)
    ctx.lineWidth = i === 4 ? 0.9 : 0.6
    ctx.stroke(scaled)
  }
  ctx.globalAlpha = 1
  return canvas
}
