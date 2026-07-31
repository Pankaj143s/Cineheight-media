/**
 * Slice the two generated master plates (G1 clouds, G2 wisps) into hero cloud
 * assets. Zero generation credits — all local.
 *
 * Inputs (scratchpad):  g1-cloud-master.png (2752×1536), g2-cloud-wisps.png (2752×1536)
 * Outputs:
 *   public/generated/hero-v2/  — DEPRECATED plates/posters (rollback only, not
 *                                referenced by the live hero any more).
 *   public/generated/hero-v3/  — ACTIVE alpha-clean transparent wisps used by
 *                                components/hero/HeroIntroSequence.tsx.
 *
 * Usage: node scripts/process-hero-clouds.mjs <scratchpadDir>
 */
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'
import { featherAlpha, solidifyAlpha, borderAlphaStats } from './lib/cloud-alpha.mjs'

const scratch = process.argv[2]
if (!scratch) throw new Error('pass scratchpad dir')

const g1 = path.join(scratch, 'g1-cloud-master.png')
const g2 = path.join(scratch, 'g2-cloud-wisps.png')
const out = path.resolve('public/generated/hero-v2')
fs.mkdirSync(out, { recursive: true })

const report = []
async function save(pipeline, name, opts = {}) {
  const file = path.join(out, name)
  await pipeline.webp({ quality: opts.q ?? 80 }).toFile(file)
  const meta = await sharp(file).metadata()
  const kb = Math.round(fs.statSync(file).size / 1024)
  report.push(`${name}\t${meta.width}x${meta.height}\t${kb} KB`)
}

// g1/g2 (and later g4) are one-off Higgsfield masters that were never
// committed (by design — see file header). Guard each stage on its own
// input so re-running this script for JUST the stock-cloud addendum below
// doesn't require regenerating history that no longer has source material.
if (fs.existsSync(g1) && fs.existsSync(g2)) {
// 1. Desktop poster — full G1 frame at 1920×1080
await save(sharp(g1).resize(1920, 1080, { kernel: 'lanczos3' }), 'hero-cloud-desktop-poster.webp', { q: 78 })

// 2. Mobile poster — central 9:16 crop (cloud band crosses the middle)
await save(
  sharp(g1).extract({ left: 944, top: 0, width: 864, height: 1536 }).resize(1080, 1920, { kernel: 'lanczos3' }),
  'hero-cloud-mobile-poster.webp',
  { q: 78 }
)

// 3. Middle haze band — central strip between the two banks, softened
await save(
  sharp(g1).extract({ left: 600, top: 620, width: 1560, height: 640 }).resize(1600).blur(1.2),
  'cloud-middle-desktop.webp',
  { q: 78 }
)

// 4. Front-left bank — crest + body of the left cumulus mass
await save(sharp(g1).extract({ left: 0, top: 430, width: 1150, height: 920 }).resize(1150), 'cloud-front-left.webp', { q: 82 })

// 5. Front-right bank — crest + body of the right cumulus mass
await save(sharp(g1).extract({ left: 1580, top: 440, width: 1172, height: 920 }).resize(1150), 'cloud-front-right.webp', { q: 82 })

// crush(): map near-black background to PURE black so `mix-blend-mode: screen`
// shows only the actual cloud, with no faint rectangular sprite box. G1 crops
// carry more ambient dark-navy than the G2 wisps, so they get a stronger curve.
// linear(a, b): out = a*in + b (clamped) — subtracts the pedestal, lifts clouds.
const crushGroup = (p) => p.linear(1.4, -26)
const crushWisp = (p) => p.linear(1.28, -16)

// 6. Wisp accent — the distinct upper-left wisp from G2 (primary moving wisp)
await save(crushWisp(sharp(g2).extract({ left: 240, top: 260, width: 760, height: 380 })), 'cloud-wisp-accent.webp', { q: 82 })

// ---- Correction pass (cloud-balance refinement): smaller, sparser slices ----

// 7. Left group — crest-only crop of G1's left bank (lower-left accent)
await save(
  crushGroup(sharp(g1).extract({ left: 30, top: 470, width: 990, height: 560 }).resize(900)),
  'cloud-group-left.webp',
  { q: 82 }
)

// 8. Right group — crest-only crop of G1's right bank
await save(
  crushGroup(sharp(g1).extract({ left: 1690, top: 470, width: 1030, height: 580 }).resize(940)),
  'cloud-group-right.webp',
  { q: 82 }
)

// 9-10. Two small low-density wisps from G2's lower chain (centre connectors
// and moving foreground wisps)
await save(crushWisp(sharp(g2).extract({ left: 880, top: 890, width: 740, height: 330 })), 'wisp-mid-1.webp', { q: 82 })
await save(crushWisp(sharp(g2).extract({ left: 1860, top: 900, width: 820, height: 400 })), 'wisp-mid-2.webp', { q: 82 })
}

// ============================================================
// hero-v3 — ALPHA-CLEAN thin wisps (spec: true transparency)
// ============================================================
// The v2 plates used opaque crops + screen-blend + radial masks, which read
// as pasted cloud "plates" with oval pedestals. v3 bakes real transparency
// into each asset: the alpha channel is derived from the source LUMINANCE
// (black/dark-navy background → 0 alpha, cloud → opaque), so compositing is
// ordinary `normal` blend over #020306 with NO screen-blend and NO radial
// mask. RGB is toned down (no blown whites, blue cast neutralised). Every
// crop keeps black margin so alpha feathers to 0 before the edge → no
// straight image edges, no rectangle.
const outV3 = path.resolve('public/generated/hero-v3')
fs.mkdirSync(outV3, { recursive: true })
const v3 = []

/**
 * @param src         sharp pipeline already `.extract()`-ed from G2
 * @param resizeOpts  sharp resize options (width, optionally height+fit:'fill')
 * @param brightness  RGB modulate brightness (<1 tones down highlights)
 * @param saturation  RGB modulate saturation (<1 neutralises the cool cast)
 * @param aSlope,aLift  alpha curve: alpha = clamp(aSlope*luminance + aLift)
 * @param aBlur       soft-feather the alpha edges
 */
async function alphaWisp(src, name, { resizeOpts, brightness, saturation, aSlope, aLift, aBlur }) {
  const inter = await src.resize(resizeOpts).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = inter.info
  const rgb = await sharp(inter.data, { raw: inter.info }).modulate({ brightness, saturation }).raw().toBuffer()
  const alpha = await sharp(inter.data, { raw: inter.info }).greyscale().linear(aSlope, aLift).blur(aBlur).raw().toBuffer()
  const file = path.join(outV3, name)
  await sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .webp({ quality: 82, alphaQuality: 92 })
    .toFile(file)
  const meta = await sharp(file).metadata()
  v3.push(`${name}\t${meta.width}x${meta.height}\t${Math.round(fs.statSync(file).size / 1024)} KB\talpha=${meta.hasAlpha}`)
}

if (fs.existsSync(g2)) {
// Front-left wisp — the isolated upper-left G2 wisp, thin & horizontal.
await alphaWisp(sharp(g2).extract({ left: 150, top: 250, width: 860, height: 440 }), 'cloud-wisp-left.webp', {
  resizeOpts: { width: 760 }, brightness: 0.9, saturation: 0.45, aSlope: 1.8, aLift: -16, aBlur: 0.6,
})

// Front-right wisp — the lower-right G2 cluster, FLOPPED for asymmetry.
await alphaWisp(sharp(g2).extract({ left: 1680, top: 820, width: 880, height: 480 }).flop(), 'cloud-wisp-right.webp', {
  resizeOpts: { width: 800 }, brightness: 0.88, saturation: 0.45, aSlope: 1.8, aLift: -16, aBlur: 0.6,
})

// Travelling centre wisp — one small single G2 wisp.
await alphaWisp(sharp(g2).extract({ left: 760, top: 620, width: 440, height: 300 }), 'cloud-wisp-moving.webp', {
  resizeOpts: { width: 440 }, brightness: 0.9, saturation: 0.45, aSlope: 1.9, aLift: -18, aBlur: 0.5,
})

// Faint wide background ribbon — the middle+right G2 chain, stretched into a
// thin low strip (fit:'fill' compresses vertically) and toned very dark; CSS
// opacity dials it to ~0.14 at runtime. No bright core.
await alphaWisp(sharp(g2).extract({ left: 620, top: 660, width: 1940, height: 520 }), 'cloud-ribbon-back.webp', {
  resizeOpts: { width: 2000, height: 360, fit: 'fill' }, brightness: 0.72, saturation: 0.4, aSlope: 1.5, aLift: -12, aBlur: 1.1,
})
}

// ============================================================
// hero-v4 — NATURAL rounded low-profile clouds (G4 master)
// ============================================================
// The v3 wisps (sliced from the G2 cirrus master) read as smoke / torn fog
// and `cloud-wisp-moving` had an EMPTY alpha channel (all zero → invisible).
// v4 uses a fresh Higgsfield source (g4-clouds-master.png): four separated
// natural rounded cumulus puffs on pure black. Same luminance→alpha pipeline
// as alphaWisp(), tuned gentler to preserve the soft cloud edges. Each crop
// keeps black margin → alpha reaches 0 before the edge, no straight edges.
const g4 = path.join(scratch, 'g4-clouds-master.png')
const outV4 = path.resolve('public/generated/hero-v4')
fs.mkdirSync(outV4, { recursive: true })
const v4 = []

async function alphaCloud(src, name, { resizeOpts, brightness, saturation, aSlope, aLift, aBlur }) {
  const inter = await src.resize(resizeOpts).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = inter.info
  const rgb = await sharp(inter.data, { raw: inter.info }).modulate({ brightness, saturation }).raw().toBuffer()
  const alpha = await sharp(inter.data, { raw: inter.info }).greyscale().linear(aSlope, aLift).blur(aBlur).raw().toBuffer()
  const file = path.join(outV4, name)
  await sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .webp({ quality: 84, alphaQuality: 94 })
    .toFile(file)
  // Alpha verification (spec §5): dims, mode, alpha min/max, %non-transparent, size.
  const a = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer()
  let min = 255, max = 0, nz = 0
  for (let i = 0; i < a.length; i++) { const v = a[i]; if (v < min) min = v; if (v > max) max = v; if (v > 12) nz++ }
  const meta = await sharp(file).metadata()
  // These crops keep black margin by hand, so the border SHOULD already be 0 — assert it
  // rather than trust it. An edited `extract()` that clips a cloud is the same defect
  // `trim()` produced in the stock-cloud pass below.
  const border = borderAlphaStats(a, meta.width, meta.height)
  const badEdge = ['top', 'right', 'bottom', 'left'].filter((e) => border[e].max > 8)
  if (badEdge.length) {
    throw new Error(
      `${name}: crop clips the cloud on ${badEdge.join('/')} (` +
        badEdge.map((e) => `${e} max=${border[e].max}`).join(', ') +
        ') — widen the extract() so alpha reaches 0 before the frame'
    )
  }
  v4.push(`${name}\t${meta.width}x${meta.height}\t${meta.channels}ch\taMin=${min} aMax=${max} nonTransp=${(100 * nz / a.length).toFixed(1)}%\tborder ok\t${Math.round(fs.statSync(file).size / 1024)} KB`)
}

// LOW-PROFILE crops (~2:1, wider than tall) so the natural on-screen aspect is
// a low cloud band that sits at the letter baseline — no vertical stretch, and
// crossing only the lower letters (not muddying the middle). Brightened so they
// read IN FRONT of the white letters (soft shadow underside survives the gentle
// alpha curve). Rendered at NATURAL aspect in the component (no h-full).

if (fs.existsSync(g4)) {
// Front-left cloud — G4 cloud #1 (leftmost), low band.
await alphaCloud(sharp(g4).extract({ left: 20, top: 620, width: 720, height: 360 }), 'cloud-front-left.webp', {
  resizeOpts: { width: 720 }, brightness: 1.0, saturation: 0.62, aSlope: 1.5, aLift: -12, aBlur: 0.8,
})

// Front-right cloud — G4 cloud #4 (rightmost, distinct shape → asymmetry), low band.
await alphaCloud(sharp(g4).extract({ left: 2000, top: 610, width: 740, height: 360 }), 'cloud-front-right.webp', {
  resizeOpts: { width: 740 }, brightness: 1.0, saturation: 0.62, aSlope: 1.5, aLift: -12, aBlur: 0.8,
})

// Travelling cloud — G4 cloud #2 (compact), low band; rendered small on-screen.
await alphaCloud(sharp(g4).extract({ left: 700, top: 640, width: 640, height: 340 }), 'cloud-traveller.webp', {
  resizeOpts: { width: 620 }, brightness: 1.0, saturation: 0.62, aSlope: 1.6, aLift: -12, aBlur: 0.7,
})

// Soft background haze — wide NATURAL crop of the centre clouds (NO fit:'fill'
// stretch), toned dark & faint; a barely-there depth layer behind the word.
await alphaCloud(sharp(g4).extract({ left: 640, top: 600, width: 1420, height: 400 }), 'cloud-back-soft.webp', {
  resizeOpts: { width: 1600 }, brightness: 0.66, saturation: 0.5, aSlope: 1.2, aLift: -8, aBlur: 1.4,
})
}

// ============================================================
// hero-v4 addendum — two stock clouds, added to the SAME public/generated/hero-v4/
// folder as the four G4-derived assets above (no new version bump: same
// palette, same layer system, just two more depth layers).
// ============================================================
// Inputs (scratchpad): cloude-1.jpg (wide wispy haze/smoke trail, ~3.5:1),
// cloude-2.jpg (one well-defined puffy cumulus cloud, ~1.6:1). Both are
// JPEGs (no alpha channel) whose "transparent" background was exported as a
// checkerboard-over-composite: `observed = alpha*white + (1-alpha)*checker`.
// Luminance alone recovers alpha (checker and cloud are both greyscale), but
// two things a plain luminance-threshold misses, both fixed below:
//   1. The checker has real spatial contrast (alternating tile luminance),
//      which is HIGH-FREQUENCY — a wide pre-blur (order of one checker
//      tile) averages it toward flat while the cloud's own soft low-frequency
//      shape survives.
//   2. JPEG re-encoding leaves sparse single-pixel luminance outliers in
//      nominally-empty regions — well below the cloud's own tone, but above
//      a naive cutoff often enough to leave a scattered "dust" of low alpha
//      that blocks `trim()` (which requires the WHOLE border row/column to
//      be near-zero). A median filter erases isolated speckle a percentile
//      cutoff can't distinguish from real edge pixels.
//
// !! `trim()` ALONE IS NOT SAFE HERE, and shipping it that way is what put a
// visible rectangle in the hero. It crops to the alpha bounding box, which
// REMOVES the black safety margin the G4 crops above deliberately keep. If the
// source cloud runs off its own frame — as cloude-1.jpg does on the right and
// bottom — the bounding box is the frame, and the output has a hard straight
// cut with alpha still averaging 132/255 (right) and 81/255 (bottom). Rendered
// as a 76vw marquee, that edge drifted across the hero on a ~130s loop. So the
// trim is now followed by a transparent `extend()` plus `featherAlpha()`, and
// the border is ASSERTED to be 0 before the file is accepted. See
// scripts/repair-hero-clouds.mjs, which had to undo this after the fact
// because the source JPEGs were scratchpad-only and no longer exist.
// RGB carries no detail from these sources (the checkerboard composite destroyed it),
// so it is written as a flat constant and the cloud's shading comes from the alpha map
// alone. That constant must MATCH THE G4 CLOUDS' OWN TONE, though — leaving it at pure
// white was fine only while these two layers ran at 0.55 / 0.12 opacity. At full opacity
// a 255,255,255 cloud reads as a white blob beside G4 clouds that paint at 166,171,185.
// Measured mean RGB of pixels with alpha > 200: front-left / front-right / traveller
// 166,171,185 — back-soft 116,119,128.
const scratchStockDir = scratch
const stockSources = {
  haze: path.join(scratchStockDir, 'cloude-1.jpg'),
  accent: path.join(scratchStockDir, 'cloude-2.jpg'),
}

/**
 * @param aBandFrac  fraction of the image height (from the top) sampled to
 *                   estimate the background's own luminance ceiling — must
 *                   be a region with no real cloud content.
 * @param aMargin    px added above that ceiling before clamping to alpha 0.
 * @param aDeadzone  post-median alpha floor (0-255); anything below is
 *                   forced to exactly 0 so `trim()` can find a true edge.
 * @param feather    border ramp width in px (number = all four edges, or per-edge)
 *                   applied AFTER the trim, on the final resized pixels. This is the
 *                   guarantee that there is no straight edge — see the note above.
 * @param tone       flat [r,g,b] for the colour channels; must match the tier this
 *                   cloud sits in (see the note above).
 * @param solidify   front tier only — narrow the rim so the cloud body occludes the
 *                   letters behind it rather than letting them ghost through.
 */
async function recoverCheckerAlpha(
  srcPath,
  name,
  { preBlur, aBandFrac, aMargin, aDeadzone, resizeWidth, feather = 20, tone, solidify = false }
) {
  const { data: lum, info } = await sharp(srcPath).greyscale().blur(preBlur).raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const n = w * h

  const bandH = Math.round(h * aBandFrac)
  const bandSamples = new Array(bandH * w)
  for (let y = 0; y < bandH; y++) for (let x = 0; x < w; x++) bandSamples[y * w + x] = lum[y * w + x]
  bandSamples.sort((a, b) => a - b)
  const cutoff = bandSamples[Math.floor(bandSamples.length * 0.995)] + aMargin

  const allSorted = Array.from(lum).sort((a, b) => a - b)
  const foreground = allSorted[Math.floor(allSorted.length * 0.995)]
  const denom = Math.max(1, foreground - cutoff)

  const alpha = Buffer.alloc(n)
  for (let p = 0; p < n; p++) {
    const a = Math.max(0, Math.min(1, (lum[p] - cutoff) / denom))
    alpha[p] = Math.round(a * 255)
  }

  // median() on a raw single-channel buffer silently upsamples to 3
  // channels in sharp — round-trip through a PNG + toColourspace('b-w') to
  // keep it 1-channel, or the deadzone loop below reads scrambled data.
  const alphaPng = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer()
  const { data: smoothed } = await sharp(alphaPng).median(5).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })
  for (let p = 0; p < n; p++) if (smoothed[p] < aDeadzone) smoothed[p] = 0

  const [tr, tg, tb] = tone
  const rgba = Buffer.alloc(n * 4)
  for (let p = 0; p < n; p++) {
    const o = p * 4
    rgba[o] = tr
    rgba[o + 1] = tg
    rgba[o + 2] = tb
    rgba[o + 3] = smoothed[p]
  }

  const trimmed = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().trim({ threshold: 8 }).toBuffer()

  // Put a transparent safety margin BACK where trim() removed it, then ramp alpha to 0
  // across it. Resize short of the target so the padding lands inside `resizeWidth`
  // rather than growing the asset. With PAD 12 and a 20px ramp, only the outer ~8px of
  // real cloud is attenuated — the margin absorbs the rest.
  const PAD = 12
  const staged = await sharp(trimmed)
    .resize({ width: Math.max(1, resizeWidth - 2 * PAD) })
    .extend({ top: PAD, right: PAD, bottom: PAD, left: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const { data: sd, info: si } = await sharp(staged).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: fw, height: fh } = si
  const fn = fw * fh
  const alphaOut = Buffer.alloc(fn)
  const rgbOut = Buffer.alloc(fn * 3)
  for (let p = 0; p < fn; p++) {
    const s = p * 4
    const o = p * 3
    alphaOut[p] = sd[s + 3]
    rgbOut[o] = sd[s]
    rgbOut[o + 1] = sd[s + 1]
    rgbOut[o + 2] = sd[s + 2]
  }
  // Solidify BEFORE feathering — the other way round, the gain undoes the border ramp
  // and puts the straight edge back.
  if (solidify) solidifyAlpha(alphaOut)
  featherAlpha(alphaOut, fw, fh, feather)

  const file = path.join(outV4, name)
  await sharp(rgbOut, { raw: { width: fw, height: fh, channels: 3 } })
    .joinChannel(alphaOut, { raw: { width: fw, height: fh, channels: 1 } })
    .webp({ quality: 88, alphaQuality: 95 })
    .toFile(file)

  // The assertion that was missing. A non-zero border row/column IS the rectangle.
  const encAlpha = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer()
  const border = borderAlphaStats(encAlpha, fw, fh)
  const bad = ['top', 'right', 'bottom', 'left'].filter((e) => border[e].max > 0)
  if (bad.length) {
    throw new Error(
      `${name}: alpha still non-zero on ${bad.join('/')} (` +
        bad.map((e) => `${e} max=${border[e].max} avg=${border[e].avg}`).join(', ') +
        ') — widen `feather` for that edge; the source cloud runs off its own frame there'
    )
  }
  const meta = await sharp(file).metadata()
  v4.push(`${name}\t${meta.width}x${meta.height}\t${meta.channels}ch\tborder=0 ok\t${Math.round(fs.statSync(file).size / 1024)} KB`)
}

if (fs.existsSync(stockSources.haze) && fs.existsSync(stockSources.accent)) {
  v4.push('--- stock clouds (cloude-1/2, checker-alpha recovered) ---')
  // Wide pre-blur (~one checker tile at full 8050px res) — the wisp trail
  // itself is soft atmosphere, so a hazier final edge suits its back-tier role.
  // Wide right/bottom ramps: this source's wisp trail is cropped through its MIDDLE on
  // those two edges (alpha still ~97 avg 480px in from the right, a uniform 85-94 across
  // the whole bottom), so a 20px ramp cannot hide the cut. These widths match
  // scripts/repair-hero-clouds.mjs — keep the two in sync.
  await recoverCheckerAlpha(stockSources.haze, 'cloud-haze-band.webp', {
    preBlur: 22, aBandFrac: 0.12, aMargin: 14, aDeadzone: 18, resizeWidth: 1800,
    feather: { top: 24, right: 340, bottom: 210, left: 24 },
    tone: [116, 119, 128], // back tier — match cloud-back-soft
  })
  // Narrower pre-blur — this one is a discrete front-tier cloud, so it keeps
  // a more defined silhouette. Higher margin/deadzone: this source's "empty"
  // regions carry more residual JPEG noise than the haze source does.
  await recoverCheckerAlpha(stockSources.accent, 'cloud-puff-accent.webp', {
    preBlur: 3, aBandFrac: 0.1, aMargin: 25, aDeadzone: 30, resizeWidth: 900, feather: 20,
    tone: [166, 171, 185], // front tier — match the three G4 front clouds
    solidify: true, // front tier — must occlude the letters at opacity 1
  })
}

console.log([...report, '--- hero-v3 ---', ...v3, '--- hero-v4 (active) ---', ...v4].join('\n'))
