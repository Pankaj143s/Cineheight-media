import { mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve('public/generated/hero-v5')
const OUT = path.join(ROOT, 'responsive')
const WIDTHS = [640, 960]
const SOURCES = [
  'cloud-center-clean.webp',
  'cloud-left-clean.webp',
  'cloud-right-clean.webp',
]

mkdirSync(OUT, { recursive: true })

for (const sourceName of SOURCES) {
  const source = path.join(ROOT, sourceName)
  const base = sourceName.replace('-clean.webp', '')

  for (const width of WIDTHS) {
    const output = path.join(OUT, `${base}-${width}.webp`)
    await sharp(source)
      .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
      .webp({ quality: 82, alphaQuality: 92 })
      .toFile(output)

    const metadata = await sharp(output).metadata()
    const alpha = await sharp(output).ensureAlpha().extractChannel(3).stats()
    if (metadata.channels !== 4 || alpha.channels[0].min !== 0 || alpha.channels[0].max < 32) {
      throw new Error(`${path.basename(output)} lost its usable alpha channel`)
    }

    console.log(
      `${path.basename(output)}\t${metadata.width}x${metadata.height}\t${Math.round(statSync(output).size / 1024)} KB\talpha ${alpha.channels[0].min}-${alpha.channels[0].max}`
    )
  }
}
