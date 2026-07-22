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
  v4.push(`${name}\t${meta.width}x${meta.height}\t${meta.channels}ch\taMin=${min} aMax=${max} nonTransp=${(100 * nz / a.length).toFixed(1)}%\t${Math.round(fs.statSync(file).size / 1024)} KB`)
}

// LOW-PROFILE crops (~2:1, wider than tall) so the natural on-screen aspect is
// a low cloud band that sits at the letter baseline — no vertical stretch, and
// crossing only the lower letters (not muddying the middle). Brightened so they
// read IN FRONT of the white letters (soft shadow underside survives the gentle
// alpha curve). Rendered at NATURAL aspect in the component (no h-full).

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

console.log([...report, '--- hero-v3 ---', ...v3, '--- hero-v4 (active) ---', ...v4].join('\n'))
