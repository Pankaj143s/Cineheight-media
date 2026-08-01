/**
 * Process standardized brand logos (color on solid black) into trimmed
 * transparent PNGs for the trusted-client marquee.
 *
 * Run: node scripts/process-brand-logos-v2.mjs
 */

import sharp from 'sharp'
import { mkdirSync, existsSync, readdirSync, rmSync, unlinkSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('.')
const SRC_DIR = path.join(ROOT, 'new brand logos')
const OUT = path.join(ROOT, 'public', 'logos', 'optimized')

/** Near-black luminance threshold (0–255). Pixels at/below become transparent. */
const BLACK_THRESHOLD = 18

const MAP = [
  ['yamaha-logo-standardized.png', 'yamaha-logo.png'],
  ['ses-logo-standardized-correct.png', 'ses-logo.png'],
  ['divija-logo-standardized-correct.png', 'divija-logo.png'],
  ['wet-n-joy-logo-standardized.png', 'wet-n-joy-logo.png'],
  ['askara-group-logo-standardized.png', 'askara-group-logo.png'],
  ['dji-logo-standardized.png', 'dji-logo.png'],
  ['dave-and-busters-logo-standardized.png', 'dave-and-busters-logo.png'],
  ['election-commission-india-logo-standardized.png', 'election-commission-india-logo.png'],
  ['imagicaa-logo-standardized.png', 'imagicaa-logo.png'],
  ['nhai-logo-standardized.png', 'nhai-logo.png'],
  ['volkswagen-logo-standardized.png', 'volkswagen-logo.png'],
]

const KEEP = new Set(MAP.map(([, dest]) => dest))

mkdirSync(OUT, { recursive: true })

async function blackToAlpha(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // Luma-ish; treat near-black as background regardless of tiny channel noise.
    if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
      data[i + 3] = 0
    }
  }

  return sharp(data, { raw: { width, height, channels } })
}

const results = []

for (const [srcName, destName] of MAP) {
  const src = path.join(SRC_DIR, srcName)
  if (!existsSync(src)) {
    console.error('MISSING:', srcName)
    continue
  }
  const dest = path.join(OUT, destName)

  let pipeline = await blackToAlpha(src)

  // VW navy on dark site can vanish — modest luminance lift before trim.
  if (destName === 'volkswagen-logo.png') {
    pipeline = pipeline.modulate({ brightness: 1.45, saturation: 1.05 })
  }

  const buf = await pipeline
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true })

  await sharp(buf.data).toFile(dest)

  const { width, height } = buf.info
  results.push({ file: destName, width, height, ratio: +(width / height).toFixed(3) })
  console.log(`${destName.padEnd(42)} ${width}x${height}`)
}

// Remove obsolete optimized logos not in the new set.
for (const name of readdirSync(OUT)) {
  if (!KEEP.has(name)) {
    unlinkSync(path.join(OUT, name))
    console.log('removed old:', name)
  }
}

// Drop staging folder so it is not a second source of truth.
if (existsSync(SRC_DIR)) {
  rmSync(SRC_DIR, { recursive: true, force: true })
  console.log('removed staging: new brand logos/')
}

console.log('\n--- paste into content/siteContent.ts ---')
for (const r of results) {
  console.log(`  // ${r.file}  ${r.width}x${r.height}  (${r.ratio}:1)`)
}
