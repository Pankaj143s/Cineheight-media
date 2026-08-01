/**
 * Re-trim trusted-client logos in public/logos/optimized/ (already black→alpha).
 * Prefer scripts/process-brand-logos-v2.mjs when replacing source art.
 *
 * Run: node scripts/trim-logos.mjs
 */

import sharp from 'sharp'
import { mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('public/logos/optimized')

const FILES = [
  'yamaha-logo.png',
  'ses-logo.png',
  'divija-logo.png',
  'wet-n-joy-logo.png',
  'askara-group-logo.png',
  'dji-logo.png',
  'dave-and-busters-logo.png',
  'election-commission-india-logo.png',
  'imagicaa-logo.png',
  'nhai-logo.png',
  'volkswagen-logo.png',
]

mkdirSync(OUT, { recursive: true })

const results = []

for (const file of FILES) {
  const src = path.join(OUT, file)
  if (!existsSync(src)) {
    console.error('MISSING:', file)
    continue
  }

  const before = await sharp(src).metadata()
  const buf = await sharp(src).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
  await sharp(buf.data).toFile(src)

  const { width, height } = buf.info
  results.push({ file, width, height, ratio: +(width / height).toFixed(3) })
  console.log(
    `${file.padEnd(42)} ${String(before.width + 'x' + before.height).padEnd(11)} → ` +
      `${width}x${height}`
  )
}

console.log('\n--- trimmed intrinsic sizes (paste into content/siteContent.ts) ---')
for (const r of results) {
  console.log(`  '${r.file}': { w: ${r.width}, h: ${r.height} },  // ${r.ratio}:1`)
}
