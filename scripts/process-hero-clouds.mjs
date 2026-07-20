/**
 * Slice the two generated master plates (G1 clouds, G2 wisps) into the
 * hero-v2 layer set + posters. Zero generation credits — all local.
 *
 * Inputs (scratchpad):  g1-cloud-master.png (2752×1536), g2-cloud-wisps.png (2752×1536)
 * Outputs (public/generated/hero-v2/): posters + middle/front layer webps.
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

// 6. Wisp accent — the distinct upper-left wisp from G2 (slow front accent)
await save(sharp(g2).extract({ left: 240, top: 260, width: 760, height: 380 }), 'cloud-wisp-accent.webp', { q: 82 })

console.log(report.join('\n'))
