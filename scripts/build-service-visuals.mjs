/**
 * Normalises the selected Higgsfield candidates into one art-directed set.
 *
 * The raw generations are 2528×1696 (3:2), several carry baked letterbox bars,
 * and their contrast and colour temperature drift between seeds. Shipping them
 * as-is would look like six unrelated images. This step makes them a
 * collection:
 *
 *   1. detect and remove letterbox bars (measured per row, not guessed)
 *   2. crop to a common 1920×1200 (16:10) frame
 *   3. normalise contrast and saturation to shared targets
 *   4. composite the site's own signal language on top — one blue signal arc,
 *      corner crop marks, a vignette and fine grain, identical across all six
 *   5. export optimised WebP
 *
 * Selections were made by eye from the candidate contact sheets; the rejected
 * ones are recorded in docs/PRESENTATION-ASSET-AUDIT.md. Notably
 * content-creation candidate B rendered a white gallery interior, which breaks
 * the near-black direction entirely, so candidate A was taken.
 *
 *   node scripts/build-service-visuals.mjs
 */

import { mkdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC = path.resolve('.media-tmp/candidates')
const OUT = path.resolve('public/generated/presentation/services')

const W = 1920
const H = 1200

/** service id → chosen candidate file (see the doc for why each was picked). */
const SELECTED = {
  'brand-identity': 'brand-a.png',
  'social-media': 'social-a.png',
  'graphic-design': 'graphic-b.png',
  'video-production': 'video-b.png',
  'performance-marketing': 'perf-a.png',
  'content-creation': 'content-a.png',
}

/**
 * Find baked letterbox bars by measuring each row's brightest pixel. A bar is a
 * row whose maximum luminance is essentially black across the full width —
 * which real content in these images never is, because every frame has some
 * blue edge light or haze in it.
 */
async function letterboxBounds(file) {
  const img = sharp(file)
  const { width, height } = await img.metadata()
  const { data, info } = await img
    .clone()
    .greyscale()
    .resize({ width: 64, height, fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const rowMax = new Array(info.height).fill(0)
  for (let y = 0; y < info.height; y++) {
    let m = 0
    for (let x = 0; x < info.width; x++) {
      const v = data[y * info.width + x]
      if (v > m) m = v
    }
    rowMax[y] = m
  }
  const THRESH = 10
  let top = 0
  while (top < info.height && rowMax[top] <= THRESH) top++
  let bottom = info.height - 1
  while (bottom > top && rowMax[bottom] <= THRESH) bottom--

  // Guard: never trim more than a quarter of the frame.
  const maxTrim = Math.floor(height * 0.25)
  top = Math.min(top, maxTrim)
  bottom = Math.max(bottom, height - 1 - maxTrim)

  return { width, height, top, bottom, cropHeight: bottom - top + 1 }
}

/** The shared finish — identical on all six, which is what unifies the set. */
function signatureSvg(w, h) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="sig" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0089FF" stop-opacity="0"/>
        <stop offset="45%" stop-color="#0089FF" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#0089FF" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="vig" cx="52%" cy="46%" r="76%">
        <stop offset="54%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.5"/>
      </radialGradient>
      <linearGradient id="left" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#020306" stop-opacity="0.55"/>
        <stop offset="42%" stop-color="#020306" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <!-- keeps the left third quiet for the live HTML text -->
    <rect width="100%" height="100%" fill="url(#left)"/>
    <rect width="100%" height="100%" fill="url(#vig)"/>

    <!-- the signal: one long, shallow arc, the same gesture on every visual -->
    <path d="M -40 ${h * 0.78} C ${w * 0.3} ${h * 0.72}, ${w * 0.58} ${h * 0.3}, ${w + 40} ${h * 0.2}"
          fill="none" stroke="url(#sig)" stroke-width="2"/>

    <!-- corner crop marks, the editorial grammar of the set -->
    <g stroke="#0089FF" stroke-opacity="0.34" stroke-width="1.5" fill="none">
      <path d="M 56 30 L 56 62 M 40 46 L 72 46"/>
      <path d="M ${w - 56} ${h - 30} L ${w - 56} ${h - 62} M ${w - 40} ${h - 46} L ${w - 72} ${h - 46}"/>
    </g>
    <g stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" fill="none">
      <rect x="40" y="40" width="${w - 80}" height="${h - 80}"/>
    </g>
  </svg>`)
}

/** Fine monochrome grain, generated once and reused so all six match. */
async function grainBuffer(w, h) {
  const px = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const v = 118 + Math.floor(Math.random() * 20)
    px[i * 4] = v
    px[i * 4 + 1] = v
    px[i * 4 + 2] = v
    px[i * 4 + 3] = 12 // very low alpha — texture, not noise
  }
  return sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()
}

mkdirSync(OUT, { recursive: true })
console.log('Normalising selected candidates into one 1920×1200 collection\n')

const grain = await grainBuffer(W, H)
const signature = signatureSvg(W, H)

for (const [id, file] of Object.entries(SELECTED)) {
  const src = path.join(SRC, file)
  if (!existsSync(src)) {
    console.error(`  MISSING candidate ${file} for ${id}`)
    continue
  }

  const b = await letterboxBounds(src)
  const trimmed = b.top > 0 || b.bottom < b.height - 1

  const out = path.join(OUT, `${id}.webp`)
  await sharp(src)
    .extract({ left: 0, top: b.top, width: b.width, height: b.cropHeight })
    // Common frame. `attention` keeps the subject rather than the geometric
    // centre, which matters because every composition is weighted right.
    .resize(W, H, { fit: 'cover', position: 'attention' })
    // Shared grade: lift the blacks slightly off pure black so the images have
    // depth on an OLED, hold contrast, and keep the blue from going cyan.
    .linear(1.06, -4)
    .modulate({ saturation: 0.94, brightness: 1.02 })
    .composite([
      { input: signature, left: 0, top: 0 },
      { input: grain, left: 0, top: 0, blend: 'overlay' },
    ])
    .webp({ quality: 82, effort: 6 })
    .toFile(out)

  const kb = Math.round(statSync(out).size / 1024)
  console.log(
    `  ${id.padEnd(24)} ← ${file.padEnd(14)} ${trimmed ? `trimmed ${b.top}/${b.height - 1 - b.bottom}px  ` : 'no bars        '}${kb} KB`
  )
}

console.log(`\nwrote ${Object.keys(SELECTED).length} visuals to ${OUT}`)
