/**
 * Clean "New clouds" masters → true-alpha WebPs for the cinematic hero recomposition.
 *
 * Reads DIRECTLY from the supplied `New clouds/` folder (single source of truth).
 *
 * Quality goals (v5.1):
 *  - NO hard alpha thresholds — the previous pass posterized the masters' soft
 *    edges into a stair-stepped grey outline. Alpha is kept continuous and only
 *    lightly smoothed.
 *  - De-checker: `right updated.png` has a checkerboard texture baked into the
 *    RGB of its semi-transparent tendrils. RGB under mid/low alpha is blended
 *    toward a blurred copy of itself, which erases high-frequency checker while
 *    leaving the dense core untouched.
 *  - Premultiply toward black only in the near-zero alpha tail (halo guard on a
 *    dark background) — not through the whole mid-alpha shoulder.
 *  - alphaQuality 100 so WebP encoding cannot band the alpha ramp.
 *
 * Outputs (public/generated/hero-v5/):
 *   cloud-center-clean.webp  ← middle bottom.png   (far accent)
 *   cloud-left-clean.webp    ← left updated.png    (mid plane, left)
 *   cloud-right-clean.webp   ← right updated.png   (mid plane, right)
 *   cloud-bottom-clean.webp  ← bottom updated.png  (foreground bank)
 *
 * Usage: node scripts/process-hero-clouds-v5.mjs
 */
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'
import { featherAlpha, borderAlphaStats, smoothstep } from './lib/cloud-alpha.mjs'

const root = path.resolve('New clouds')
const out = path.resolve('public/generated/hero-v5')
fs.mkdirSync(out, { recursive: true })

const FILES = [
  { src: 'middle bottom.png', out: 'cloud-center-clean.webp' },
  { src: 'left updated.png', out: 'cloud-left-clean.webp' },
  { src: 'right updated.png', out: 'cloud-right-clean.webp' },
  { src: 'bottom updated.png', out: 'cloud-bottom-clean.webp' },
]

const MARGIN = 36
const TRIM_THRESHOLD = 10

/** Two passes of a separable 3x3 box blur ≈ small gaussian; keeps ramps, kills stair-steps. */
function smoothAlpha(alpha, w, h, passes = 2) {
  const tmp = new Uint8Array(alpha.length)
  for (let p = 0; p < passes; p++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      const row = y * w
      for (let x = 0; x < w; x++) {
        const a = alpha[row + Math.max(0, x - 1)]
        const b = alpha[row + x]
        const c = alpha[row + Math.min(w - 1, x + 1)]
        tmp[row + x] = (a + b + b + c) >> 2
      }
    }
    // vertical
    for (let y = 0; y < h; y++) {
      const row = y * w
      const up = Math.max(0, y - 1) * w
      const dn = Math.min(h - 1, y + 1) * w
      for (let x = 0; x < w; x++) {
        alpha[row + x] = (tmp[up + x] + tmp[row + x] * 2 + tmp[dn + x]) >> 2
      }
    }
  }
  return alpha
}

function contentBBox(alpha, w, h, threshold) {
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      if (alpha[row + x] > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) throw new Error('no opaque content found')
  return { minX, minY, maxX, maxY }
}

/**
 * Blend RGB toward its blurred copy in the semi-transparent shoulder (alpha < 200).
 * Checker/dither artifacts are high-frequency RGB noise that only survives where the
 * pixel is partly see-through — the blur erases the pattern, the blend weight fades
 * to zero at the dense core so real cloud texture is preserved.
 */
function deCheckerRgb(rgb, blurred, alpha, n) {
  for (let i = 0, p = 0; i < n; i++, p += 3) {
    const a = alpha[i]
    if (a >= 200) continue
    const k = smoothstep((200 - a) / 200)
    rgb[p] = Math.round(rgb[p] + (blurred[p] - rgb[p]) * k)
    rgb[p + 1] = Math.round(rgb[p + 1] + (blurred[p + 1] - rgb[p + 1]) * k)
    rgb[p + 2] = Math.round(rgb[p + 2] + (blurred[p + 2] - rgb[p + 2]) * k)
  }
}

/** Halo guard: fade RGB to black only in the near-zero alpha tail (a < 24). */
function guardHalo(rgb, alpha, n) {
  for (let i = 0, p = 0; i < n; i++, p += 3) {
    const a = alpha[i]
    if (a >= 24) continue
    const k = a / 24
    rgb[p] = Math.round(rgb[p] * k)
    rgb[p + 1] = Math.round(rgb[p + 1] * k)
    rgb[p + 2] = Math.round(rgb[p + 2] * k)
  }
}

/** Residual checker detector: high local luminance variance in the mid-alpha shoulder. */
function fringeCheckerScore(rgb, alpha, w, h) {
  let fringe = 0
  let checkerish = 0
  for (let y = 0; y < h - 1; y += 2) {
    for (let x = 0; x < w - 1; x += 2) {
      const i = y * w + x
      const a = alpha[i]
      if (a <= 12 || a >= 160) continue
      fringe++
      const j = (y + 1) * w + (x + 1)
      const p = i * 3
      const q = j * 3
      const lum = (rgb[p] + rgb[p + 1] + rgb[p + 2]) / 3
      const lum2 = (rgb[q] + rgb[q + 1] + rgb[q + 2]) / 3
      if (Math.abs(lum - lum2) > 46) checkerish++
    }
  }
  return { fringe, checkerish }
}

async function processOne({ src, out: name }) {
  const srcFile = path.join(root, src)
  if (!fs.existsSync(srcFile)) throw new Error(`missing master: ${srcFile}`)

  const resized = await sharp(srcFile)
    .ensureAlpha()
    .resize({ width: 1920, withoutEnlargement: true, kernel: 'lanczos3' })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width: w0, height: h0, channels } = resized.info
  if (channels !== 4) throw new Error(`${src}: expected 4 channels, got ${channels}`)

  const rgbaIn = resized.data
  const n0 = w0 * h0
  const rgb0 = Buffer.alloc(n0 * 3)
  const alpha0 = Buffer.alloc(n0)
  for (let i = 0, p = 0, a = 0; a < n0; i += 4, p += 3, a++) {
    rgb0[p] = rgbaIn[i]
    rgb0[p + 1] = rgbaIn[i + 1]
    rgb0[p + 2] = rgbaIn[i + 2]
    alpha0[a] = rgbaIn[i + 3]
  }

  smoothAlpha(alpha0, w0, h0)

  // De-checker against a blurred copy of the full-frame RGB
  const blurred0 = await sharp(rgb0, { raw: { width: w0, height: h0, channels: 3 } })
    .blur(4)
    .raw()
    .toBuffer()
  deCheckerRgb(rgb0, blurred0, alpha0, n0)

  // Trim to content bbox + margin
  const { minX, minY, maxX, maxY } = contentBBox(alpha0, w0, h0, TRIM_THRESHOLD)
  const left = Math.max(0, minX - MARGIN)
  const top = Math.max(0, minY - MARGIN)
  const right = Math.min(w0 - 1, maxX + MARGIN)
  const bottom = Math.min(h0 - 1, maxY + MARGIN)
  const cw = right - left + 1
  const ch = bottom - top + 1
  const n = cw * ch

  const rgb = Buffer.alloc(n * 3)
  const alpha = Buffer.alloc(n)
  for (let y = 0; y < ch; y++) {
    const srcRow = (top + y) * w0 + left
    const dstRow = y * cw
    rgb0.copy(rgb, dstRow * 3, srcRow * 3, (srcRow + cw) * 3)
    alpha0.copy(alpha, dstRow, srcRow, srcRow + cw)
  }

  featherAlpha(alpha, cw, ch, 32)

  // Keep master color/brightness — no cinematic dim/desat washout
  const graded = Buffer.from(rgb)

  guardHalo(graded, alpha, n)

  const score = fringeCheckerScore(graded, alpha, cw, ch)
  if (score.checkerish > 120) {
    throw new Error(`${name}: residual checker in fringe (checkerish=${score.checkerish})`)
  }

  const file = path.join(out, name)
  await sharp(graded, { raw: { width: cw, height: ch, channels: 3 } })
    .joinChannel(alpha, { raw: { width: cw, height: ch, channels: 1 } })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(file)

  const encAlpha = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer()
  const meta = await sharp(file).metadata()
  const border = borderAlphaStats(encAlpha, meta.width, meta.height)
  const bad = ['top', 'right', 'bottom', 'left'].filter((e) => border[e].max > 8)
  if (bad.length) throw new Error(`${name}: border alpha not zero on ${bad.join('/')}`)

  let nz = 0
  for (let i = 0; i < encAlpha.length; i++) if (encAlpha[i] > 12) nz++
  console.log(
    `${name}\t${meta.width}x${meta.height}\tnonTransp=${((100 * nz) / encAlpha.length).toFixed(1)}%\tcheckerish=${score.checkerish}\t${Math.round(fs.statSync(file).size / 1024)} KB`
  )
}

for (const f of FILES) await processOne(f)
console.log('cleaned hero-v5 clouds ready →', out)
