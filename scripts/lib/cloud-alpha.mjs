/**
 * Shared alpha-channel operations for the hero cloud assets.
 *
 * Imported by BOTH `scripts/process-hero-clouds.mjs` (generation, from masters that no
 * longer exist) and `scripts/repair-hero-clouds.mjs` (the repair pass that runs on the
 * surviving WebPs). One implementation so a fix to the feather ramp can't end up
 * applying to only half the pipeline — which is how the hero shipped a visible
 * rectangle in the first place.
 *
 * Everything here works on a plain 1-channel Uint8 alpha buffer in JS rather than via
 * sharp filters, deliberately: `median()` on a raw 1-channel buffer silently upsamples
 * to 3 channels in sharp (see the note in process-hero-clouds.mjs), and that class of
 * surprise is what these helpers exist to avoid.
 */

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t)

/** Hermite ease, 0 at t<=0 and 1 at t>=1 — a straight linear ramp leaves a faint but
 *  perceptible crease where the gradient starts. */
export const smoothstep = (t) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

/**
 * Narrow a cloud's soft rim so its body OCCLUDES the letters behind it instead of
 * letting them ghost through.
 *
 * The G4 assets carry a wide mid-alpha shoulder (15-25% of pixels sit in 120-190),
 * which is exactly the range where a bright letter reads through a cloud that is
 * meant to be solid. This maps `hi` and above to fully opaque and compresses the
 * shoulder into a shorter ramp, while anything at or below `lo` stays fully clear so
 * the silhouette keeps a soft wispy edge.
 *
 * FRONT-TIER ONLY. The two back-tier hazes must stay soft atmosphere — solidifying
 * them turns a barely-there veil into a grey slab.
 *
 * @param alpha  1-channel buffer, mutated in place and returned
 */
export function solidifyAlpha(alpha, { lo = 40, hi = 150, gamma = 0.85 } = {}) {
  const span = Math.max(1, hi - lo)
  // 256-entry LUT — the curve is a pure function of the input byte.
  const lut = new Uint8Array(256)
  for (let v = 0; v < 256; v++) {
    lut[v] = Math.round(255 * clamp01((v - lo) / span) ** gamma)
  }
  for (let i = 0; i < alpha.length; i++) alpha[i] = lut[alpha[i]]
  return alpha
}

/**
 * Ramp alpha to EXACTLY 0 at every border, so an asset can never show a straight edge
 * no matter how it is positioned, scaled or tiled.
 *
 * This is the guarantee the hero-v4 spec always claimed ("every crop keeps black margin
 * so alpha reaches 0 before the edge") but which `trim()` silently broke by cropping to
 * the alpha bounding box.
 *
 * @param feather  px ramp width per edge; a number applies to all four. An edge given
 *                 width 0 is left untouched.
 */
export function featherAlpha(alpha, width, height, feather = 20) {
  const f =
    typeof feather === 'number'
      ? { top: feather, right: feather, bottom: feather, left: feather }
      : { top: 0, right: 0, bottom: 0, left: 0, ...feather }

  // Separable: the horizontal ramp depends only on x, the vertical only on y.
  const rampX = new Float32Array(width)
  for (let x = 0; x < width; x++) {
    const l = f.left > 0 ? smoothstep(x / f.left) : 1
    const r = f.right > 0 ? smoothstep((width - 1 - x) / f.right) : 1
    rampX[x] = Math.min(l, r)
  }
  const rampY = new Float32Array(height)
  for (let y = 0; y < height; y++) {
    const t = f.top > 0 ? smoothstep(y / f.top) : 1
    const b = f.bottom > 0 ? smoothstep((height - 1 - y) / f.bottom) : 1
    rampY[y] = Math.min(t, b)
  }

  for (let y = 0; y < height; y++) {
    const row = y * width
    const ry = rampY[y]
    for (let x = 0; x < width; x++) {
      // min(), not multiply: multiplying the two ramps attenuates the corners twice and
      // pulls a visible rounded-corner vignette into the cloud.
      const k = ry < rampX[x] ? ry : rampX[x]
      if (k < 1) alpha[row + x] = Math.round(alpha[row + x] * k)
    }
  }
  return alpha
}

/** Max/avg alpha on each of the four border rows/columns — the measurement that detects
 *  a truncated asset. A clean cloud reads 0 on all four. */
export function borderAlphaStats(alpha, width, height) {
  const stat = (get, n) => {
    let max = 0
    let sum = 0
    let over = 0
    for (let i = 0; i < n; i++) {
      const v = get(i)
      if (v > max) max = v
      sum += v
      if (v > 40) over++
    }
    return { max, avg: +(sum / n).toFixed(1), over, n }
  }
  return {
    top: stat((x) => alpha[x], width),
    bottom: stat((x) => alpha[(height - 1) * width + x], width),
    left: stat((y) => alpha[y * width], height),
    right: stat((y) => alpha[y * width + width - 1], height),
  }
}
