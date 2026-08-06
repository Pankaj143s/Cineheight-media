/**
 * The handshake between the wordmark's two lowercase `i`s — matched to a
 * reference mark supplied by the user: straight tapered arms and a solid
 * node at the join. Both arms are white, matching the wordmark; the node is
 * the only blue element, so it reads as the single point of contact rather
 * than either figure "owning" the colour.
 *
 * ## The shape
 *
 * Each arm is a FILLED polygon, not a stroke — a stroke cannot taper along
 * its length, and the reference tapers visibly from shoulder to node. The
 * polygon is built by offsetting the shoulder→node axis by a half-width that
 * shrinks from {@link HALF_W_SHOULDER} to {@link HALF_W_NODE}, which preserves
 * the 0.40 / 0.29-of-stem-width ratios verified against the live font in
 * earlier rounds. The arm runs all the way to the node's CENTRE; the node
 * circle simply covers the end, so there is no seam to hide.
 *
 * ## The viewBox encodes the PROPORTIONS, not just the shape
 *
 * Measured off the live font (per em, so they hold at any size):
 *   figure height H (dot top -> baseline) = 0.740em
 *   stem height (x-height)                = 0.500em
 *   stem width                            = 0.1225em
 *
 * Ratios, checked against the reference and matching within a few percent:
 *   gap (i centre -> i centre) = 1.05 x H
 *   shoulder                   = 0.20 down the stem
 *   node                       = 0.58 down the stem
 *
 * An earlier version derived the gap from FONT SIZE rather than figure
 * height, which made the arms ~60% too long for the bodies — see
 * HeroIntroSequence's `gapPx()` for the fix and the reasoning.
 *
 * ## Two placement invariants the timeline depends on
 *
 *  1. **Shoulders sit on the x edges** (x=0 and x=240). Set the SVG's width to
 *     the i-centre-to-i-centre distance and both shoulders land exactly on
 *     their own stem.
 *  2. **Shoulders sit at the exact vertical centre** ({@link SHOULDER_Y} ===
 *     VIEW_H / 2). Placing the SVG is then one rule — centre it on (word
 *     centre X, shoulder Y) — with no correction term to get wrong.
 *
 * ## Reveal is a clip sweep, not a stroke draw-on
 *
 * Filled shapes have no stroke to dash, so each arm sits behind a
 * `<clipPath>` whose rect sweeps from the shoulder outward. The right arm's
 * sweep is the left's mirrored: fixed width, moving edge. See
 * `applyHandshakeLayout`'s neighbour in HeroIntroSequence for the exact tween.
 *
 * ## Shake
 *
 * Earlier rounds rotated each arm about its own shoulder. That does not work
 * with a shared, fixed node: rotating either arm independently would swing
 * its end away from the node and break the clasp. Instead the WHOLE
 * assembly — both arms and the node — sits in `[data-shake]`, and the
 * timeline oscillates that group's `y`. A few px of shared bob reads as the
 * clasp pumping without ever separating from itself.
 *
 * `--hand-rim` (0 -> 1 at contact) drives the blue bloom in `.hero-hand-svg`,
 * timed with the background's pulse (lib/heroSignalPulse.ts).
 */

/** viewBox. Shoulders live on the x edges — see the placement invariants. */
export const VIEW_W = 240
export const VIEW_H = 140
/** Shoulder height. MUST stay VIEW_H / 2 — the placement rule depends on it. */
export const SHOULDER_Y = VIEW_H / 2
/** Where the two arms meet — 0.58 down the stem, matched to the reference. */
export const NODE_X = VIEW_W / 2
export const NODE_Y = 131
/** Node radius, in viewBox units. */
export const NODE_R = 14

/** Half-width of each arm at the shoulder / at the node — the taper. */
const HALF_W_SHOULDER = 7.5
const HALF_W_NODE = 5.5

const BLUE = '#0089ff'
const WHITE = '#f5f7fa'

const r1 = (n: number) => Math.round(n * 10) / 10

/** One arm's polygon, built from its own shoulder point to the shared node. */
function armPolygon(shoulderX: number) {
  const dx = NODE_X - shoulderX
  const dy = NODE_Y - SHOULDER_Y
  const len = Math.hypot(dx, dy)
  // Unit perpendicular to the shoulder->node axis.
  const nx = -dy / len
  const ny = dx / len

  const shoulderA = { x: shoulderX + nx * HALF_W_SHOULDER, y: SHOULDER_Y + ny * HALF_W_SHOULDER }
  const shoulderB = { x: shoulderX - nx * HALF_W_SHOULDER, y: SHOULDER_Y - ny * HALF_W_SHOULDER }
  const nodeA = { x: NODE_X + nx * HALF_W_NODE, y: NODE_Y + ny * HALF_W_NODE }
  const nodeB = { x: NODE_X - nx * HALF_W_NODE, y: NODE_Y - ny * HALF_W_NODE }

  const pt = (p: { x: number; y: number }) => `${r1(p.x)},${r1(p.y)}`
  return `${pt(shoulderB)} ${pt(nodeB)} ${pt(nodeA)} ${pt(shoulderA)}`
}

const LEFT_POLYGON = armPolygon(0)
const RIGHT_POLYGON = armPolygon(VIEW_W)

/*
 * Clip rects for the reveal sweep. Both arms span roughly x=[0,123] (left) /
 * [117,240] (right), y=[63,136]; y=30/h=130 gives clearance on both sides.
 *
 * Left: width grows 0 -> 160 from a rect anchored at x=-30, so the visible
 * right edge sweeps from -30 up to 130 — past the node — revealing outward
 * from the shoulder (x=0).
 *
 * Right: fixed width 160, x (the left edge) sweeps 270 -> 110. The right edge
 * (x+160) stays >= 243 throughout, so it is never the limiting edge; the
 * visible region is effectively [x, 243], which shrinks from empty (x=270,
 * past the shoulder) down to the full arm (x=110), revealing outward from the
 * shoulder (x=240) exactly as the left arm does from its own shoulder.
 */
const CLIP_Y = 30
const CLIP_H = 130
const CLIP_W = 160

export default function HeroHandshake() {
  return (
    <div data-layer="handshake" aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-0">
      {/* overflow visible: the node and shoulder ends extend slightly past the
          viewBox edges by design. They tuck behind the `i` stems anyway,
          since the handshake paints under the letters. */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="hero-hand-svg"
        style={{ overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          <clipPath id="hero-hand-clip-left" clipPathUnits="userSpaceOnUse">
            <rect data-arm-clip="left" x={-30} y={CLIP_Y} width={0} height={CLIP_H} />
          </clipPath>
          <clipPath id="hero-hand-clip-right" clipPathUnits="userSpaceOnUse">
            <rect data-arm-clip="right" x={270} y={CLIP_Y} width={CLIP_W} height={CLIP_H} />
          </clipPath>
        </defs>

        <g data-shake>
          {/* Both arms white, matching the wordmark — the node is the only
              blue element, so it reads as the single point of contact. */}
          <polygon points={LEFT_POLYGON} fill={WHITE} clipPath="url(#hero-hand-clip-left)" />
          <polygon points={RIGHT_POLYGON} fill={WHITE} clipPath="url(#hero-hand-clip-right)" />
          {/* The clasp. Radius is animated, never a transform — a scale would
              drift it off the point where the two arms actually meet. */}
          <circle data-node cx={NODE_X} cy={NODE_Y} r={0} fill={BLUE} />
        </g>
      </svg>
    </div>
  )
}
