/**
 * Repair pass over the hero cloud assets.
 *
 *   assets/hero-cloud-masters/*.webp  ->  public/generated/hero-v4/*.webp
 *
 * Input and output are separate folders, so this is idempotent and re-runnable: tune a
 * number below and run it again. Dimensions are never changed (the masters are already
 * at final resolution).
 *
 * Usage: npm run clouds:repair
 *
 * ---- Why this script exists ----
 *
 * Two problems that could not be fixed at generation time, because the original masters
 * (g4-clouds-master.png, cloude-1.jpg, cloude-2.jpg) were scratchpad-only and are gone.
 * See assets/hero-cloud-masters/README.md.
 *
 * 1. THE RECTANGLE. `recoverCheckerAlpha()` in process-hero-clouds.mjs finished with
 *    `trim({ threshold: 8 })`, which crops to the alpha bounding box and therefore
 *    strips the black safety margin the four G4 assets keep. `cloud-haze-band.webp`
 *    came out truncated with alpha still averaging 132/255 on its right column and
 *    81/255 on its bottom row — a hard straight cut. It renders at 76vw as a marquee,
 *    so that edge drifted across the hero on a ~130s loop. `featherAlpha()` ramps every
 *    border to exactly 0.
 *
 * 2. TEXT GHOSTING THROUGH "SOLID" CLOUDS. The front clouds are meant to occlude the
 *    lower letters of CINEHEIGHT, but 15-25% of each asset sits in the alpha 120-190
 *    shoulder where a bright letter reads straight through. `solidifyAlpha()` maps that
 *    shoulder to opaque and keeps only a short soft rim.
 *
 * Plus a tone fix: the two stock clouds were left flat white (255,255,255) while the
 * four G4 clouds paint at 166,171,185. That was invisible while puff-accent ran at 0.55
 * layer opacity; at 1.0 it would read as a white blob against grey clouds.
 */
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'
import { solidifyAlpha, featherAlpha, borderAlphaStats } from './lib/cloud-alpha.mjs'

const SRC = path.resolve('assets/hero-cloud-masters')
const OUT = path.resolve('public/generated/hero-v4')

/**
 * @param solidify  narrow the rim so the body occludes text. FRONT TIER ONLY.
 * @param feather   border ramp width in px (number = all four edges, or per-edge).
 * @param rgb       overwrite the (flat) colour channels; omit to keep the master's own.
 */
const REPAIRS = {
  // ---- front tier: must occlude the letters, opacity 1 in the component ----
  'cloud-front-left.webp': { solidify: true, feather: 20 },
  'cloud-front-right.webp': { solidify: true, feather: 20 },
  // right column measured max 144 before the feather
  'cloud-traveller.webp': { solidify: true, feather: 20 },
  // Flat white -> match the three G4 front clouds. Mandatory: this layer goes from
  // 0.55 to 1.0 opacity, which is where a white-vs-grey mismatch stops hiding.
  'cloud-puff-accent.webp': { solidify: true, feather: 20, rgb: [166, 171, 185] },

  // ---- back tier: soft atmosphere at ~0.12 opacity, deliberately NOT solidified ----
  // left column measured max 104 before the feather
  'cloud-back-soft.webp': { solidify: false, feather: 20 },
  // The wide right/bottom ramps are sized from the measured inward alpha profile: still
  // 97 avg at 480px in from the right, and a uniform 85-94 across the whole bottom
  // region — i.e. the source wisp was cropped through its middle, not near its edge.
  // Without the original there is nothing to recover, so it dissolves instead of being
  // sliced. On a 0.12-opacity haze band a soft-bottomed fade is the right look anyway.
  'cloud-haze-band.webp': {
    solidify: false,
    feather: { top: 24, right: 340, bottom: 210, left: 24 },
    rgb: [116, 119, 128], // match cloud-back-soft, its same-tier sibling
  },
}

if (!fs.existsSync(SRC)) {
  throw new Error(`missing masters at ${SRC} — see assets/hero-cloud-masters/README.md`)
}
fs.mkdirSync(OUT, { recursive: true })

const rows = []
const failures = []

for (const [name, opts] of Object.entries(REPAIRS)) {
  const srcFile = path.join(SRC, name)
  if (!fs.existsSync(srcFile)) {
    failures.push(`${name}: master not found at ${srcFile}`)
    continue
  }

  const { data, info } = await sharp(srcFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const n = w * h

  // De-interleave so the alpha ops work on a contiguous 1-channel buffer.
  const alpha = Buffer.alloc(n)
  for (let p = 0; p < n; p++) alpha[p] = data[p * 4 + 3]

  const before = borderAlphaStats(alpha, w, h)

  // Order matters: solidify first, then feather. The other way round, the gain would
  // undo the border ramp and put the straight edge back.
  if (opts.solidify) solidifyAlpha(alpha)
  featherAlpha(alpha, w, h, opts.feather)

  const rgb = Buffer.alloc(n * 3)
  for (let p = 0; p < n; p++) {
    const o = p * 3
    if (opts.rgb) {
      rgb[o] = opts.rgb[0]
      rgb[o + 1] = opts.rgb[1]
      rgb[o + 2] = opts.rgb[2]
    } else {
      const s = p * 4
      rgb[o] = data[s]
      rgb[o + 1] = data[s + 1]
      rgb[o + 2] = data[s + 2]
    }
  }

  const file = path.join(OUT, name)
  await sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .webp({ quality: 88, alphaQuality: 95 })
    .toFile(file)

  // ---- Verify the ENCODED file, not the in-memory buffer: alpha survives a WebP
  // round-trip lossily, and it is the shipped bytes that have to be clean.
  const enc = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer()
  const after = borderAlphaStats(enc, w, h)
  let solid = 0
  let clear = 0
  for (let i = 0; i < enc.length; i++) {
    if (enc[i] > 230) solid++
    else if (enc[i] < 10) clear++
  }

  const bad = ['top', 'right', 'bottom', 'left'].filter((e) => after[e].max > 0)
  if (bad.length) {
    failures.push(
      `${name}: alpha still non-zero on ${bad.join('/')} — ` +
        bad.map((e) => `${e} max=${after[e].max}`).join(' ') +
        ' (widen the feather for that edge)'
    )
  }

  const edge = (s) => `${s.top.max}/${s.right.max}/${s.bottom.max}/${s.left.max}`
  rows.push(
    `${name.padEnd(26)}${w}x${h}  border T/R/B/L ${edge(before).padEnd(18)}-> ${edge(after).padEnd(10)}` +
      `solid>230 ${(100 * solid / n).toFixed(1)}%  clear<10 ${(100 * clear / n).toFixed(1)}%  ` +
      `${Math.round(fs.statSync(file).size / 1024)} KB`
  )
}

console.log('hero cloud repair — assets/hero-cloud-masters -> public/generated/hero-v4\n')
console.log(rows.join('\n'))

if (failures.length) {
  console.error('\nFAILED:\n' + failures.map((f) => '  ' + f).join('\n'))
  process.exit(1)
}
console.log('\nOK — every border row/column is alpha 0 on all six assets.')
