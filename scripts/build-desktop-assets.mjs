/**
 * Converts the real desktop media dropped in cineheight-desktop-assets/ into
 * the exact files content/mediaSlots.ts expects for the "desktop-ready"
 * variants of sapale-yamaha, sindhudurg-education and divija-old-age-home.
 *
 * Source folder is read-only input — nothing inside it is ever written,
 * renamed, or deleted. Sources are matched by predicate rather than exact
 * filename since the Divija files carry inconsistent casing/spacing on disk.
 *
 * Mobile/ultrawide variants are NOT built here — those files are not supplied
 * yet and content/mediaSlots.ts intentionally stays on 'desktop-ready' until
 * they arrive.
 *
 *   node scripts/build-desktop-assets.mjs
 *   node scripts/build-desktop-assets.mjs --only=sapale-yamaha
 *   node scripts/build-desktop-assets.mjs --force
 *   node scripts/build-desktop-assets.mjs --crf=21          # override video CRF for all
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, existsSync, statSync, readdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

const run = promisify(execFile)
const FFMPEG = ffmpegPath
const FFPROBE = ffprobeStatic.path

const argOf = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.split('=')[1] : d
}
const FORCE = process.argv.includes('--force')
const ONLY = argOf('only', null)
const CRF = argOf('crf', '19')

const SRC_DIR = path.resolve('cineheight-desktop-assets')
const entries = readdirSync(SRC_DIR)

function findOne(test, label) {
  const hit = entries.find((e) => test(e.toLowerCase()))
  if (!hit) throw new Error(`Source not found for ${label} in cineheight-desktop-assets/`)
  return path.join(SRC_DIR, hit)
}

const SOURCES = {
  yamahaVideo: findOne((n) => n === 'sapale-yamaha-video.mp4', 'sapale-yamaha-video.mp4'),
  sesVideo: findOne((n) => n === 'ses_colleges_video.mp4', 'ses_colleges_video.mp4'),
  divijaVideo: findOne(
    (n) => n.includes('divija') && n.includes('video') && n.endsWith('.mp4'),
    'Divija website video'
  ),
  yamahaHomePoster: findOne((n) => n === 'yamaha-poster.png', 'yamaha-poster.png'),
  sesHomePoster: findOne((n) => n === 'ses-poster.png', 'ses-poster.png'),
  divijaHomePoster: findOne((n) => n === 'divija-poster.png', 'divija-poster.png'),
  yamahaWorkCover: findOne((n) => n === 'yamaha-work-cover.png', 'yamaha-work-cover.png'),
  sesWorkCover: findOne((n) => n === 'ses-poster-2.png', 'ses-poster-2.png'),
  divijaWorkCover: findOne(
    (n) => n.includes('divija-old-age-home-desktop') && n.endsWith('.webp'),
    'divija-old-age-home-desktop(1).webp'
  ),
}

const IMAGE_JOBS = [
  { id: 'sapale-yamaha', src: SOURCES.yamahaHomePoster, dest: 'public/media/home-work/sapale-yamaha-desktop.webp' },
  { id: 'sindhudurg-education', src: SOURCES.sesHomePoster, dest: 'public/media/home-work/sindhudurg-education-desktop.webp' },
  { id: 'divija-old-age-home', src: SOURCES.divijaHomePoster, dest: 'public/media/home-work/divija-old-age-home-desktop.webp' },
  { id: 'sapale-yamaha', src: SOURCES.yamahaWorkCover, dest: 'public/media/work-index/sapale-yamaha-desktop.webp' },
  { id: 'sindhudurg-education', src: SOURCES.sesWorkCover, dest: 'public/media/work-index/sindhudurg-education-desktop.webp' },
  { id: 'divija-old-age-home', src: SOURCES.divijaWorkCover, dest: 'public/media/work-index/divija-old-age-home-desktop.webp' },
]

const VIDEO_JOBS = [
  { id: 'sapale-yamaha', src: SOURCES.yamahaVideo, dest: 'public/media/home-work/sapale-yamaha-desktop.mp4' },
  { id: 'sindhudurg-education', src: SOURCES.sesVideo, dest: 'public/media/home-work/sindhudurg-education-desktop.mp4' },
  { id: 'divija-old-age-home', src: SOURCES.divijaVideo, dest: 'public/media/home-work/divija-old-age-home-desktop.mp4' },
]

async function buildImage(job) {
  if (ONLY && job.id !== ONLY) return
  const destAbs = path.resolve(job.dest)
  if (!FORCE && existsSync(destAbs)) {
    console.log(`  skip   ${job.dest} (exists — use --force to rebuild)`)
    return
  }
  mkdirSync(path.dirname(destAbs), { recursive: true })
  await sharp(job.src)
    .resize(2560, 1440, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toFile(destAbs)
  const meta = await sharp(destAbs).metadata()
  const kb = Math.round(statSync(destAbs).size / 1024)
  console.log(`  built  ${job.dest.padEnd(52)} ${meta.width}x${meta.height} ${meta.format}  ${kb} KB`)
}

async function probeVideo(file) {
  const { stdout } = await run(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'format=duration:stream=width,height,codec_name,pix_fmt,avg_frame_rate',
    '-of', 'json',
    file,
  ])
  const j = JSON.parse(stdout)
  const s = j.streams[0]
  const [num, den] = s.avg_frame_rate.split('/').map(Number)
  return {
    width: s.width,
    height: s.height,
    codec: s.codec_name,
    pixFmt: s.pix_fmt,
    fps: den ? num / den : num,
    duration: Number(j.format.duration),
  }
}

async function buildVideo(job) {
  if (ONLY && job.id !== ONLY) return
  const destAbs = path.resolve(job.dest)
  if (!FORCE && existsSync(destAbs)) {
    console.log(`  skip   ${job.dest} (exists — use --force to rebuild)`)
    return
  }
  mkdirSync(path.dirname(destAbs), { recursive: true })
  await run(FFMPEG, [
    '-y',
    '-i', job.src,
    '-map', '0:v:0',
    '-vf', 'scale=2560:1440:flags=lanczos',
    '-an',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', CRF,
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-movflags', '+faststart',
    destAbs,
  ], { maxBuffer: 1024 * 1024 * 32 })
  const meta = await probeVideo(destAbs)
  const mb = (statSync(destAbs).size / 1024 / 1024).toFixed(2)
  console.log(
    `  built  ${job.dest.padEnd(52)} ${meta.width}x${meta.height} ${meta.codec} ${meta.pixFmt} ${meta.fps.toFixed(2)}fps ${meta.duration.toFixed(1)}s  ${mb} MB`
  )
}

console.log('ffmpeg:', FFMPEG)
console.log('\nImages:')
for (const job of IMAGE_JOBS) await buildImage(job)
console.log('\nVideos:')
for (const job of VIDEO_JOBS) await buildVideo(job)
console.log('\nDone.')
