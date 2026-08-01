import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

const run = promisify(execFile)
const FFMPEG = ffmpegPath
const FFPROBE = ffprobeStatic.path
const FORCE = process.argv.includes('--force')
const ONLY = process.argv.find((argument) => argument.startsWith('--only='))?.split('=')[1]
const ROOT = path.resolve('public/media/showreel')
const SOURCE = path.join(ROOT, 'showreel.mp4')

const VARIANTS = [
  { height: 540, width: 960, crf: 23, maxrate: 1600 },
  { height: 720, width: 1280, crf: 22, maxrate: 2600 },
  { height: 1080, width: 1920, crf: 22, maxrate: 4200 },
]

async function probe(file) {
  const { stdout } = await run(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=index,codec_type,codec_name,width,height,avg_frame_rate',
    '-of', 'json',
    file,
  ])
  return JSON.parse(stdout)
}

async function keyframes(file) {
  const { stdout } = await run(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-skip_frame', 'nokey',
    '-show_entries', 'frame=best_effort_timestamp_time',
    '-of', 'csv=p=0',
    file,
  ])
  return stdout.trim().split(/\r?\n/).filter(Boolean).map(Number)
}

function assertFaststart(file) {
  const bytes = readFileSync(file)
  const moov = bytes.indexOf(Buffer.from('moov'))
  const mdat = bytes.indexOf(Buffer.from('mdat'))
  if (moov < 0 || mdat < 0 || moov > mdat) {
    throw new Error(`${path.basename(file)} does not place moov before mdat`)
  }
}

mkdirSync(ROOT, { recursive: true })

for (const variant of VARIANTS) {
  const output = path.join(ROOT, `showreel-${variant.height}.mp4`)
  if (ONLY && String(variant.height) !== ONLY) continue
  if (!FORCE && existsSync(output)) {
    console.log(`skip  ${path.basename(output)} (exists; use --force to rebuild)`)
    continue
  }

  await run(FFMPEG, [
    '-y',
    '-i', SOURCE,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-vf', `scale=${variant.width}:${variant.height}:flags=lanczos`,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', String(variant.crf),
    '-maxrate', `${variant.maxrate}k`,
    '-bufsize', `${variant.maxrate * 2}k`,
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-r', '24',
    '-g', '48',
    '-keyint_min', '48',
    '-sc_threshold', '0',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '48000',
    '-movflags', '+faststart',
    output,
  ], { maxBuffer: 1024 * 1024 * 32 })
}

const sourceMeta = await probe(SOURCE)
const sourceDuration = Number(sourceMeta.format.duration)
let sharedKeyframes = null

for (const variant of VARIANTS) {
  const output = path.join(ROOT, `showreel-${variant.height}.mp4`)
  const metadata = await probe(output)
  const video = metadata.streams.find((stream) => stream.codec_type === 'video')
  const audio = metadata.streams.find((stream) => stream.codec_type === 'audio')
  const duration = Number(metadata.format.duration)
  const frames = await keyframes(output)

  if (
    video?.codec_name !== 'h264' || video.width !== variant.width || video.height !== variant.height ||
    audio?.codec_name !== 'aac' || Math.abs(duration - sourceDuration) > 0.12
  ) {
    throw new Error(`${path.basename(output)} failed codec, dimensions, audio, or duration validation`)
  }
  if (sharedKeyframes && (
    frames.length !== sharedKeyframes.length ||
    frames.some((time, index) => Math.abs(time - sharedKeyframes[index]) > 0.002)
  )) {
    throw new Error(`${path.basename(output)} keyframes do not align with the other variants`)
  }
  sharedKeyframes ??= frames
  assertFaststart(output)

  console.log(
    `${path.basename(output)}\t${video.width}x${video.height}\t${duration.toFixed(2)}s\t` +
    `${(statSync(output).size / 1024 / 1024).toFixed(2)} MB\t${frames.length} aligned keyframes\tH.264 + AAC + faststart`
  )
}
