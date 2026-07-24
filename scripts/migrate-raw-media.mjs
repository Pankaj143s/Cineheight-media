/**
 * extract-posters (formerly migrate-raw-media) — generates REAL poster frames
 * for every verified client video already migrated into this project.
 *
 * IMPORTANT AUDIT FINDING (2026-07-25): the old project's
 * `Data to be used/Client photo and video/` folder was visually inspected
 * frame-by-frame and is STOCK FOOTAGE, not client work (a Mexican government
 * building labelled "Divija", a European university labelled "SES", a power
 * plant labelled "Yamaha", generic stock photos). None of it may be presented
 * as client media. This script therefore only touches the videos that the old
 * LIVE site actually served from `public/` (verified real: Sapale Auto Yamaha
 * showroom footage, SES campus reels, Divija Old Age Home films).
 * See docs/OLD-SITE-CONTENT-AUDIT.md §Excluded.
 *
 * Poster timestamps are representative frames (~30% in, never a black or
 * pre-roll frame) — verified visually. Recorded in docs/MEDIA-MANIFEST.md.
 * Run: node scripts/migrate-raw-media.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import ffmpegPath from 'ffmpeg-static'

const PUB = path.resolve('public')
const run = (args) => execFileSync(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' })

// [source video (public-relative), timestamp s, output poster (public-relative)]
const posters = [
  ['case-studies/sapale-yamaha/reels/sapale-reel-01.mp4', 11, 'case-studies/sapale-yamaha/posters/sapale-reel-01-poster.webp'],
  ['case-studies/sapale-yamaha/reels/sapale-reel-02.mp4', 12, 'case-studies/sapale-yamaha/posters/sapale-reel-02-poster.webp'],
  ['case-studies/sapale-yamaha/reels/sapale-reel-03.mp4', 8, 'case-studies/sapale-yamaha/posters/sapale-reel-03-poster.webp'],
  ['case-studies/sapale-yamaha/testimonial/sapale-testimonial.mp4', 14, 'case-studies/sapale-yamaha/posters/sapale-testimonial-poster.webp'],
  ['case-studies/ses/reels/ses-reel-01.mp4', 7, 'case-studies/ses/posters/ses-reel-01-poster.webp'],
  ['case-studies/ses/reels/ses-reel-02.mp4', 22, 'case-studies/ses/posters/ses-reel-02-poster.webp'],
  ['case-studies/ses/reels/ses-reel-03.mp4', 11, 'case-studies/ses/posters/ses-reel-03-poster.webp'],
  ['case-studies/divija/reels/divija-reel-01.mp4', 17, 'case-studies/divija/posters/divija-reel-01-poster.webp'],
  ['case-studies/divija/testimonials/divija-testimonial.mp4', 8, 'case-studies/divija/posters/divija-testimonial-poster.webp'],
]

for (const [srcRel, t, outRel] of posters) {
  const src = path.join(PUB, srcRel)
  if (!existsSync(src)) { console.warn('SKIP (missing src):', srcRel); continue }
  const out = path.join(PUB, outRel)
  mkdirSync(path.dirname(out), { recursive: true })
  run(['-ss', String(t), '-i', src, '-frames:v', '1', '-vf', "scale='min(1600,iw)':-2", '-quality', '82', out])
  console.log(`poster (t=${t}s) →`, outRel)
}
console.log('Done.')
