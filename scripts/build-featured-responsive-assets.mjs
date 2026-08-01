/**
 * Builds compact 4:5 Featured Work films from the retained client masters.
 * The complete source frame stays sharp and centered over a dark, blurred
 * extension, so mobile delivery never gains bandwidth by cropping client work.
 * Source masters and desktop derivatives are read-only.
 *
 *   npm run media:featured
 *   npm run media:featured -- --force
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import sharp from 'sharp'

const run = promisify(execFile)
const force = process.argv.includes('--force')
const sourceRoot = path.resolve('cineheight-desktop-assets')
const outputRoot = path.resolve('public/media/home-work')
const sourceNames = readdirSync(sourceRoot)

function findSource(predicate, label) {
  const name = sourceNames.find((entry) => predicate(entry.toLowerCase()))
  if (!name) throw new Error(`Source not found for ${label}`)
  return path.join(sourceRoot, name)
}

const jobs = [
  {
    id: 'sapale-yamaha',
    source: findSource((name) => name === 'sapale-yamaha-video.mp4', 'Sapale Yamaha'),
  },
  {
    id: 'sindhudurg-education',
    source: findSource((name) => name === 'ses_colleges_video.mp4', 'Sindhudurg Education'),
  },
  {
    id: 'divija-old-age-home',
    source: findSource(
      (name) => name.includes('divija') && name.includes('video') && name.endsWith('.mp4'),
      'Divija Old Age Home'
    ),
  },
]

const filter =
  '[0:v]split=2[background][foreground];' +
  '[background]scale=720:900:force_original_aspect_ratio=increase,crop=720:900,' +
  'gblur=sigma=28,eq=brightness=-0.34:saturation=1.08[backdrop];' +
  '[foreground]scale=720:900:force_original_aspect_ratio=decrease[subject];' +
  '[backdrop][subject]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[video]'

async function buildVideo(job) {
  const destination = path.join(outputRoot, `${job.id}-mobile.mp4`)
  if (existsSync(destination) && !force) return destination
  await run(ffmpegPath, [
    '-y',
    '-i', job.source,
    '-filter_complex', filter,
    '-map', '[video]',
    '-an',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-maxrate', '1600k',
    '-bufsize', '3200k',
    '-g', '60',
    '-keyint_min', '60',
    '-sc_threshold', '0',
    '-movflags', '+faststart',
    destination,
  ], { maxBuffer: 1024 * 1024 * 8 })
  return destination
}

async function buildPoster(job) {
  const source = path.join(outputRoot, `${job.id}-desktop.webp`)
  const destination = path.join(outputRoot, `${job.id}-mobile.webp`)
  if (existsSync(destination) && !force) return destination
  const input = readFileSync(source)
  const background = await sharp(input)
    .resize(720, 900, { fit: 'cover' })
    .blur(28)
    .modulate({ brightness: 0.52, saturation: 1.08 })
    .toBuffer()
  const foreground = await sharp(input)
    .resize(720, 900, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await sharp(background)
    .composite([{ input: foreground }])
    .webp({ quality: 80 })
    .toFile(destination)
  return destination
}

async function probe(file) {
  const { stdout } = await run(ffprobeStatic.path, [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_name,width,height,pix_fmt,codec_type',
    '-of', 'json',
    file,
  ])
  const result = JSON.parse(stdout)
  const video = result.streams.find((stream) => stream.codec_type === 'video')
  const audio = result.streams.find((stream) => stream.codec_type === 'audio')
  return {
    width: video?.width,
    height: video?.height,
    codec: video?.codec_name,
    pixelFormat: video?.pix_fmt,
    duration: Number(result.format.duration),
    audio: audio?.codec_name ?? 'none',
  }
}

mkdirSync(outputRoot, { recursive: true })

for (const job of jobs) {
  const video = await buildVideo(job)
  const poster = await buildPoster(job)
  const metadata = await probe(video)
  if (metadata.width !== 720 || metadata.height !== 900 || metadata.codec !== 'h264') {
    throw new Error(`${job.id} produced an invalid mobile video: ${JSON.stringify(metadata)}`)
  }
  const videoKB = Math.round(statSync(video).size / 1024)
  const posterKB = Math.round(statSync(poster).size / 1024)
  console.log(
    `${job.id}: ${metadata.width}x${metadata.height} ${metadata.codec}/${metadata.pixelFormat}, ` +
    `${metadata.duration.toFixed(2)}s, audio=${metadata.audio}, ${videoKB} KB video, ${posterKB} KB poster`
  )
}