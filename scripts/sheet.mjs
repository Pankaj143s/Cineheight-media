/**
 * Turns a very tall full-page screenshot into a readable contact sheet.
 *
 * A 1440×19745 PNG cannot be judged as a single image, so this slices the page
 * into viewport-height panels, scales them down and lays them out left-to-right,
 * top-to-bottom, with the scroll offset burned into each panel's corner. The
 * result is one image in which the whole vertical composition can actually be
 * read — which is the point of the exercise.
 *
 *   node scripts/sheet.mjs .shots/home__1440x900.png
 *   node scripts/sheet.mjs .shots/home__1440x900.png --cols=5 --panel=460
 */

import sharp from 'sharp'
import path from 'node:path'
import { readdirSync, existsSync } from 'node:fs'

const args = process.argv.slice(2)
const files = args.filter((a) => !a.startsWith('--'))
const argOf = (n, d) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.split('=')[1] : d
}

const COLS = Number(argOf('cols', 5))
const PANEL_W = Number(argOf('panel', 440))
const GAP = 10
const LABEL_H = 20

async function sheet(file) {
  const src = sharp(file)
  const { width, height } = await src.metadata()
  // Panel height mirrors the capture viewport so each panel is one "screen".
  const vh = Number(argOf('vh', 0)) || inferViewportHeight(file)
  const slices = Math.max(1, Math.ceil(height / vh))
  const scale = PANEL_W / width
  const panelH = Math.round(vh * scale)
  const rows = Math.ceil(slices / COLS)

  const sheetW = COLS * PANEL_W + (COLS + 1) * GAP
  const sheetH = rows * (panelH + LABEL_H + GAP) + GAP

  const composites = []
  for (let i = 0; i < slices; i++) {
    const top = i * vh
    const h = Math.min(vh, height - top)
    if (h <= 0) continue
    const buf = await sharp(file)
      .extract({ left: 0, top, width, height: h })
      .resize({ width: PANEL_W })
      .png()
      .toBuffer()
    const col = i % COLS
    const row = Math.floor(i / COLS)
    composites.push({
      input: buf,
      left: GAP + col * (PANEL_W + GAP),
      top: GAP + row * (panelH + LABEL_H + GAP) + LABEL_H,
    })
    // panel index + scroll offset, so a problem can be located on the real page
    const label = Buffer.from(
      `<svg width="${PANEL_W}" height="${LABEL_H}">
         <rect width="100%" height="100%" fill="#0b0f16"/>
         <text x="6" y="14" font-family="monospace" font-size="12" fill="#5bb0ff">
           ${String(i + 1).padStart(2, '0')}/${slices}  y=${top}px
         </text>
       </svg>`
    )
    composites.push({
      input: label,
      left: GAP + col * (PANEL_W + GAP),
      top: GAP + row * (panelH + LABEL_H + GAP),
    })
  }

  const out = file.replace(/\.png$/, '.sheet.png')
  await sharp({
    create: { width: sheetW, height: sheetH, channels: 3, background: '#05070b' },
  })
    .composite(composites)
    .png()
    .toFile(out)

  console.log(`${path.basename(out)}  ${sheetW}x${sheetH}  (${slices} panels of ${vh}px)`)
  return out
}

/** "…__1440x900.png" → 900 */
function inferViewportHeight(file) {
  const m = path.basename(file).match(/__(\d+)x(\d+)/)
  return m ? Number(m[2]) : 900
}

/**
 * Compose a sheet from a filmstrip of real viewport frames
 * (.shots/frames/<slug>__<size>__NN.png). This is the accurate path: each
 * frame is exactly what a visitor sees at that scroll position, fixed layers
 * included.
 */
async function sheetFromFrames(prefix) {
  const dir = path.join('.shots', 'frames')
  const frames = readdirSync(dir)
    .filter((f) => f.startsWith(prefix + '__') && f.endsWith('.png'))
    .sort()
  if (!frames.length) return null

  const vh = inferViewportHeight(prefix + '__' + frames[0].split('__')[1])
  const first = await sharp(path.join(dir, frames[0])).metadata()
  const scale = PANEL_W / first.width
  const panelH = Math.round(first.height * scale)
  const rows = Math.ceil(frames.length / COLS)
  const sheetW = COLS * PANEL_W + (COLS + 1) * GAP
  const sheetH = rows * (panelH + LABEL_H + GAP) + GAP

  const composites = []
  for (let i = 0; i < frames.length; i++) {
    const buf = await sharp(path.join(dir, frames[i])).resize({ width: PANEL_W }).png().toBuffer()
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const left = GAP + col * (PANEL_W + GAP)
    const top = GAP + row * (panelH + LABEL_H + GAP)
    composites.push({ input: buf, left, top: top + LABEL_H })
    composites.push({
      input: Buffer.from(
        `<svg width="${PANEL_W}" height="${LABEL_H}">
           <rect width="100%" height="100%" fill="#0b0f16"/>
           <text x="6" y="14" font-family="monospace" font-size="12" fill="#5bb0ff">
             ${String(i + 1).padStart(2, '0')}/${frames.length}  y≈${i * vh}px
           </text>
         </svg>`
      ),
      left,
      top,
    })
  }

  const out = path.join('.shots', `${prefix}.sheet.png`)
  await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#05070b' } })
    .composite(composites)
    .png()
    .toFile(out)
  console.log(`${path.basename(out)}  ${sheetW}x${sheetH}  (${frames.length} viewport frames)`)
  return out
}

const framesDir = path.join('.shots', 'frames')

if (files.length) {
  for (const f of files) {
    if (f.endsWith('.png') && existsSync(f)) await sheet(f)
    else await sheetFromFrames(f)
  }
} else if (existsSync(framesDir)) {
  // one sheet per <slug>__<size> group
  const groups = [...new Set(
    readdirSync(framesDir)
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.replace(/__\d+\.png$/, ''))
  )]
  for (const g of groups) await sheetFromFrames(g)
} else {
  for (const f of readdirSync('.shots').filter((f) => f.endsWith('.png') && !f.includes('.sheet.'))) {
    await sheet(path.join('.shots', f))
  }
}
