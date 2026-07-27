/**
 * Temporary concept media for Divija's four unsupplied slots.
 *
 * `content/caseStudies.ts` records two reel slots and two post slots that the
 * client never supplied. Until now those rendered as empty dashed frames, which
 * is honest but makes the layout impossible to judge. These are LAYOUT
 * PROTOTYPES at the exact final dimensions so the composition can be designed
 * and tested, and so replacing them later is a file swap.
 *
 * Every frame is derived from REAL Divija material — testimonial frames, the
 * Diwali campaign reel, the real cover photo and the verified accent colour.
 * Nothing depicts a fictional resident, building or event.
 *
 * Every output carries a baked-in CONCEPT PLACEHOLDER mark so it can never be
 * mistaken for delivered client work, in the file itself as well as in the UI.
 *
 *   node scripts/build-divija-concepts.mjs
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, existsSync, statSync, rmSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'
import { getCaseStudy } from '../content/caseStudies.ts'

const run = promisify(execFile)
const cs = getCaseStudy('divija-old-age-home')
const ACCENT = cs.accentColor

const OUT_REELS = path.resolve('public/generated/presentation/concepts/divija-old-age-home/reels')
const OUT_POSTS = path.resolve('public/generated/presentation/concepts/divija-old-age-home/posts')
const TMP = path.resolve('.media-tmp/divija')

const REEL_W = 1080
const REEL_H = 1920
const POST_W = 1080
const POST_H = 1350

/** Real Divija sources — nothing else is used. */
const SOURCES = {
  testimonialVideo: 'public/case-studies/divija/testimonials/divija-testimonial.mp4',
  reelVideo: 'public/case-studies/divija/reels/divija-reel-01.mp4',
  cover: 'public/case-studies/divija/posters/divija-poster.webp',
  reelPoster: 'public/case-studies/divija/posters/divija-reel-01-poster.webp',
  testimonialPoster: 'public/case-studies/divija/posters/divija-testimonial-poster.webp',
}

/**
 * The placeholder mark. Rendered with a system font via SVG rather than
 * ffmpeg's drawtext, because the project ships woff2 only and drawtext needs a
 * TTF/OTF on disk.
 */
function markSvg(w, h, title) {
  const barH = Math.round(h * 0.085)
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="fade" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#020306" stop-opacity="0.94"/>
        <stop offset="100%" stop-color="#020306" stop-opacity="0"/>
      </linearGradient>
      <pattern id="hatch" width="18" height="18" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="18" stroke="${ACCENT}" stroke-opacity="0.16" stroke-width="6"/>
      </pattern>
    </defs>

    <!-- diagonal hatch: unmistakably "not final artwork" at any size -->
    <rect width="100%" height="100%" fill="url(#hatch)"/>
    <rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none"
          stroke="${ACCENT}" stroke-opacity="0.55" stroke-width="4" stroke-dasharray="26 18"/>

    <rect y="${h - barH * 2.1}" width="100%" height="${barH * 2.1}" fill="url(#fade)"/>
    <text x="${Math.round(w * 0.06)}" y="${h - barH * 1.1}"
          font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(w * 0.042)}"
          font-weight="700" letter-spacing="${Math.round(w * 0.006)}"
          fill="#ffffff" fill-opacity="0.96">CONCEPT PLACEHOLDER</text>
    <text x="${Math.round(w * 0.06)}" y="${h - barH * 0.45}"
          font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(w * 0.026)}"
          fill="#ffffff" fill-opacity="0.62">${title} · replace with final client media</text>
  </svg>`)
}

/** Real pixel size of a source's first video stream. */
async function probeSize(src) {
  const { stdout } = await run(ffprobe.path, [
    '-v', 'quiet', '-print_format', 'json',
    '-select_streams', 'v:0', '-show_streams', path.resolve(src),
  ])
  const s = JSON.parse(stdout).streams[0]
  return { w: s.width, h: s.height }
}

/** A slow drift over a real frame — enough motion to test the installation. */
async function buildConceptReel({ src, seek, title, out }) {
  if (existsSync(out)) {
    console.log(`  skip  ${path.basename(out)}`)
    return
  }
  mkdirSync(path.dirname(out), { recursive: true })
  mkdirSync(TMP, { recursive: true })

  const markFile = path.join(TMP, `mark-${path.basename(out, '.mp4')}.png`)
  await sharp(markSvg(REEL_W, REEL_H, title)).png().toFile(markFile)

  // The sharp plane must be the COMPLETE source frame. The Divija sources are
  // 1920×1080 and 1080×1080, so its height is derived rather than assumed —
  // hardcoding a 1080×1080 zoompan canvas squashed the 16:9 testimonial and
  // pushed it off centre.
  const { w: sw, h: sh } = await probeSize(src)
  const fgH = Math.round((1080 * sh) / sw / 2) * 2

  // 9 s excerpt of real footage, portrait-composed like the real presentation
  // reels, plus a very slow zoom so it reads as a motion study, not a still.
  //
  // The backdrop is pushed much darker than the real reels use (-0.62 against
  // -0.26). A concept frame is judged as a layout prototype, so the bands must
  // be a consistent dark field — the 12 s testimonial frame is almost entirely
  // white clothing, and at -0.34 the top of the phone came out light grey while
  // the marked bottom stayed black, which read as a rendering fault.
  await run(ffmpegPath, [
    '-y',
    '-ss', String(seek),
    '-t', '9',
    '-i', path.resolve(src),
    '-loop', '1', '-i', markFile,
    '-filter_complex',
      '[0:v]split=2[bg][fg];' +
      '[bg]scale=1920:1920:force_original_aspect_ratio=increase,crop=1080:1920,' +
      'gblur=sigma=54,eq=brightness=-0.62:saturation=0.5:contrast=0.82[bgb];' +
      `[fg]scale=1080:${fgH},zoompan=z='min(zoom+0.0006,1.10)':d=225:s=1080x${fgH}:fps=25,` +
      'eq=brightness=-0.06:saturation=0.86[fgz];' +
      '[bgb][fgz]overlay=(W-w)/2:(H-h)/2[base];' +
      '[base][1:v]overlay=0:0,format=yuv420p[v]',
    '-map', '[v]',
    '-an', // concept media carries no audio
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '30',
    '-maxrate', '700k', '-bufsize', '1400k',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    // Without this the looping mark image is an infinite input and the encode
    // never terminates — measured, it reached 825 MB before being killed.
    '-t', '9',
    '-shortest',
    out,
  ], { maxBuffer: 1024 * 1024 * 32 })

  // Poster from the same composition.
  const poster = out.replace(/\.mp4$/, '-poster.webp')
  const rawPoster = path.join(TMP, `poster-${path.basename(out, '.mp4')}.png`)
  await run(ffmpegPath, [
    '-y', '-ss', '1', '-i', out, '-frames:v', '1', rawPoster,
  ], { maxBuffer: 1024 * 1024 * 32 })
  await sharp(rawPoster).webp({ quality: 76 }).toFile(poster)
  rmSync(rawPoster, { force: true })

  console.log(
    `  built ${path.basename(out).padEnd(34)} ${(statSync(out).size / 1024 / 1024).toFixed(2)} MB`
  )
}

/** 1080×1350 concept creative from a real frame. */
async function buildConceptPost({ src, title, out }) {
  if (existsSync(out)) {
    console.log(`  skip  ${path.basename(out)}`)
    return
  }
  mkdirSync(path.dirname(out), { recursive: true })

  // Same reasoning as the reels: a prototype sitting in a near-black page must
  // not shout louder than the delivered work around it. At 0.72 the red facade
  // was the brightest thing on the route.
  const base = await sharp(path.resolve(src))
    .resize(POST_W, POST_H, { fit: 'cover', position: 'attention' })
    .modulate({ brightness: 0.44, saturation: 0.62 })
    .blur(4)
    .png()
    .toBuffer()

  await sharp({ create: { width: POST_W, height: POST_H, channels: 3, background: '#020306' } })
    .composite([
      { input: base, left: 0, top: 0 },
      { input: markSvg(POST_W, POST_H, title), left: 0, top: 0 },
    ])
    .webp({ quality: 78 })
    .toFile(out)

  console.log(`  built ${path.basename(out).padEnd(34)} ${Math.round(statSync(out).size / 1024)} KB`)
}

console.log('Divija concept placeholders (layout prototypes, from real Divija frames)\n')

console.log('reels')
await buildConceptReel({
  src: SOURCES.testimonialVideo,
  seek: 12,
  title: 'Resident Story Film',
  out: path.join(OUT_REELS, 'divija-reel-02-concept.mp4'),
})
await buildConceptReel({
  src: SOURCES.reelVideo,
  seek: 22,
  title: 'Donation Campaign Reel',
  out: path.join(OUT_REELS, 'divija-reel-03-concept.mp4'),
})

console.log('\nposts')
// NOTE: `divija-poster.webp` is NOT used as a source. Inspected, it is an
// aerial industrial/plant photograph that does not depict Divija at all — it
// is flagged as questionable in docs/PRESENTATION-ASSET-AUDIT.md. These
// concepts derive only from footage that genuinely shows Divija's work.
await buildConceptPost({
  src: SOURCES.reelPoster,
  title: 'Resident Story',
  out: path.join(OUT_POSTS, 'divija-post-01-concept.webp'),
})
await buildConceptPost({
  src: SOURCES.testimonialPoster,
  title: 'Donation Appeal',
  out: path.join(OUT_POSTS, 'divija-post-02-concept.webp'),
})

console.log('\nAll four carry a baked-in CONCEPT PLACEHOLDER mark.')
