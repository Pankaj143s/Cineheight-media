/**
 * Trims transparent margins from the client logos and writes optimised copies
 * to public/logos/optimized/, then prints the measured trimmed dimensions.
 *
 * Why this exists: the four `trusted/*.png` marks are 200x160 canvases that are
 * 67–81% transparent padding (dave-and-busters' ink is only 78x78, election
 * 93x88, imagica 159x66, nhai 106x70). Because every logo declared a similar
 * max height, those four rendered at roughly 20px of actual ink while the
 * already-tight marks rendered at full size — which is why the logo row looked
 * inconsistent and several marks looked tiny.
 *
 * Trimming is only half the fix; the other half is sizing by ink area rather
 * than by height (see `logoBox` in content/siteContent.ts).
 *
 * Originals are never modified.  Run: node scripts/trim-logos.mjs
 */

import sharp from 'sharp'
import { mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const SRC = path.resolve('public/logos')
const OUT = path.resolve('public/logos/optimized')

const FILES = [
  'yamaha-logo.png',
  'ses-white-text-logo.png',
  'divija-logo.png',
  'ongc-logo.png',
  'wetnjoy-logo-footer.png',
  'walkswagon-logo.png',
  'askara-logo.png',
  'dji-blue-logo.png',
  'sapale-logo.png',
  'trusted/dave-and-busters.png',
  'trusted/election-commission.png',
  'trusted/imagica.png',
  'trusted/nhai.png',
]

mkdirSync(OUT, { recursive: true })

const results = []

for (const rel of FILES) {
  const src = path.join(SRC, rel)
  if (!existsSync(src)) {
    console.error('MISSING:', rel)
    continue
  }
  const flat = rel.replace(/\//g, '-')
  const dest = path.join(OUT, flat)

  const before = await sharp(src).metadata()
  // threshold 1 → treat near-zero alpha as background; keepAlpha preserves the
  // transparent cutout inside the mark itself.
  const buf = await sharp(src).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
  await sharp(buf.data).toFile(dest)

  const { width, height } = buf.info
  results.push({ file: flat, width, height, ratio: +(width / height).toFixed(3) })
  const saved = (1 - (width * height) / (before.width * before.height)) * 100
  console.log(
    `${rel.padEnd(34)} ${String(before.width + 'x' + before.height).padEnd(11)} → ` +
    `${String(width + 'x' + height).padEnd(11)} (${saved.toFixed(0)}% padding removed)`
  )
}

console.log('\n--- trimmed intrinsic sizes (paste into content/siteContent.ts) ---')
for (const r of results) {
  console.log(`  '${r.file}': { w: ${r.width}, h: ${r.height} },  // ${r.ratio}:1`)
}
