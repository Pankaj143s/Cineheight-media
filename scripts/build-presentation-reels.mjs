/**
 * Derives true 9:16 presentation reels from the square client masters.
 *
 * Every real reel is 1080×1080. The phone frames are 9:16, so at runtime the
 * app has been compositing a blurred backdrop behind the square in the DOM on
 * every paint. This bakes that composition once, offline, into a real portrait
 * file — which is both cheaper at runtime and the shape the final client
 * masters will eventually arrive in, so swapping them later is a file
 * replacement rather than a code change.
 *
 * The client's footage is NEVER cropped: the complete 1080×1080 frame sits
 * sharp and centred over a blurred, darkened, cover-scaled copy of itself plus
 * a restrained client-accent wash.
 *
 * What is deliberately NOT baked in: Instagram chrome, handles, captions and
 * engagement figures. Those stay DOM overlays so they remain real text, remain
 * accessible, and can never be mistaken for part of the client's video.
 *
 *   node scripts/build-presentation-reels.mjs
 *   node scripts/build-presentation-reels.mjs --only=sapale-yamaha
 *   node scripts/build-presentation-reels.mjs --force
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, existsSync, statSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import { caseStudies } from '../content/caseStudies.ts'

const run = promisify(execFile)
const FFMPEG = ffmpegPath
const FFPROBE = ffprobeStatic.path

const OUT_ROOT = path.resolve('public/generated/presentation/reels')
const TMP = path.resolve('.media-tmp')

const argOf = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.split('=')[1] : d
}
const FORCE = process.argv.includes('--force')
const ONLY = argOf('only', null)

const W = 1080
const H = 1920

/**
 * Encoding budget per reel.
 *
 * CRF alone does not control size here — measured, a 74 s reel came out at
 * 13 MB at CRF 28 — and once a VBV cap is added the cap, not the CRF, decides
 * the size. So the budget is expressed as a size target, converted to a video
 * bitrate, and CRF rides underneath as a quality floor so easy passages still
 * come in under budget rather than spending the whole allowance.
 *
 * Longer reels get more megabytes but fewer bits per second, which is the right
 * trade: the set stays ~25 MB and no single file is visibly crushed.
 */
const AUDIO_KBPS = 96

function budgetFor(durationSec) {
  const targetMB =
    durationSec <= 30 ? 2.6 : durationSec <= 45 ? 3.4 : durationSec <= 60 ? 4.4 : 5.6
  const totalKbps = (targetMB * 8192) / durationSec
  const videoKbps = Math.round(Math.max(420, totalKbps - AUDIO_KBPS))
  return { targetMB, videoKbps }
}

/** A 1080×1920 accent + vignette overlay, cached per client colour. */
async function accentOverlay(accent) {
  mkdirSync(TMP, { recursive: true })
  const file = path.join(TMP, `accent-${accent.replace('#', '')}.png`)
  if (existsSync(file)) return file
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bot" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="vig" cx="50%" cy="50%" r="72%">
        <stop offset="55%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="34%" fill="url(#top)"/>
    <rect y="66%" width="100%" height="34%" fill="url(#bot)"/>
    <rect width="100%" height="100%" fill="url(#vig)"/>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(file)
  return file
}

/**
 * bg: cover-scale the square to fill 1080×1920, blur hard, darken.
 * accent: the client wash on top of the blur.
 * fg: the untouched 1080×1080 frame, centred — the client's actual work.
 */
const FILTER =
  '[0:v]split=2[bg][fg];' +
  '[bg]scale=1920:1920:force_original_aspect_ratio=increase,crop=1080:1920,' +
  'gblur=sigma=44,eq=brightness=-0.26:saturation=1.12[bgb];' +
  '[bgb][1:v]overlay=0:0[bga];' +
  '[fg]scale=1080:1080[fgs];' +
  '[bga][fgs]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]'

async function probe(file) {
  const { stdout } = await run(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'format=duration:stream=width,height',
    '-of', 'json',
    file,
  ])
  const j = JSON.parse(stdout)
  return {
    width: j.streams[0].width,
    height: j.streams[0].height,
    duration: Number(j.format.duration),
  }
}

async function buildReel({ srcAbs, outDir, base, accent, posterAt }) {
  mkdirSync(outDir, { recursive: true })
  const outMp4 = path.join(outDir, `${base}.mp4`)
  const outPoster = path.join(outDir, `${base}-poster.webp`)

  if (!FORCE && existsSync(outMp4) && existsSync(outPoster)) {
    console.log(`  skip   ${base} (exists — use --force to rebuild)`)
    return { skipped: true }
  }

  const meta = await probe(srcAbs)
  const overlay = await accentOverlay(accent)
  const { videoKbps } = budgetFor(meta.duration)

  await run(FFMPEG, [
    '-y',
    '-i', srcAbs,
    '-loop', '1', '-i', overlay,
    '-filter_complex', FILTER,
    '-map', '[v]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'slow',
    // Quality floor + VBV cap: easy passages spend less, busy ones never
    // exceed the budget.
    '-crf', '27',
    '-maxrate', `${videoKbps}k`,
    '-bufsize', `${videoKbps * 2}k`,
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-movflags', '+faststart',
    // Audio is kept: the lightbox can unmute. Inline phones stay muted.
    '-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`,
    '-shortest',
    outMp4,
  ], { maxBuffer: 1024 * 1024 * 32 })

  // Poster from the SAME composition at the recorded timestamp, so the poster
  // and the first video frame line up exactly — no jump when playback starts.
  const rawPoster = path.join(TMP, `${base}-poster.png`)
  await run(FFMPEG, [
    '-y',
    '-ss', String(Math.min(posterAt ?? 1, Math.max(0, meta.duration - 0.5))),
    '-i', srcAbs,
    '-loop', '1', '-i', overlay,
    '-filter_complex', FILTER,
    '-map', '[v]',
    '-frames:v', '1',
    rawPoster,
  ], { maxBuffer: 1024 * 1024 * 32 })
  await sharp(rawPoster).webp({ quality: 78 }).toFile(outPoster)
  rmSync(rawPoster, { force: true })

  const mb = (statSync(outMp4).size / 1024 / 1024).toFixed(2)
  const posterKb = Math.round(statSync(outPoster).size / 1024)
  console.log(
    `  built  ${base.padEnd(20)} ${meta.duration.toFixed(0)}s  ${videoKbps}kbps  ${mb} MB  poster ${posterKb} KB`
  )
  return { mb: Number(mb) }
}

// ---------------------------------------------------------------- main
console.log('ffmpeg:', FFMPEG)
mkdirSync(TMP, { recursive: true })

const built = []
for (const cs of caseStudies) {
  if (ONLY && cs.id !== ONLY) continue
  const real = cs.reels.filter((r) => !r.isPlaceholder && r.src)
  if (!real.length) continue
  console.log(`\n${cs.client}`)
  for (const reel of real) {
    const srcAbs = path.resolve('public' + reel.src)
    if (!existsSync(srcAbs)) {
      console.error(`  MISSING ${reel.src}`)
      continue
    }
    const base = path.basename(reel.src, '.mp4')
    const res = await buildReel({
      srcAbs,
      outDir: path.join(OUT_ROOT, cs.id),
      base,
      accent: cs.accentColor,
      // Reuse the verified poster timestamps from the media manifest era.
      posterAt: 8,
    })
    if (res.mb) built.push(res.mb)
  }
}

if (built.length) {
  const total = built.reduce((a, b) => a + b, 0)
  console.log(`\n${built.length} reels · ${total.toFixed(1)} MB total · ${(total / built.length).toFixed(2)} MB avg`)
}
console.log('intermediates in .media-tmp (gitignored, safe to delete)')
