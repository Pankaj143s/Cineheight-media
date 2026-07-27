/**
 * Builds dedicated case-study cover art for /work, Next Project and OG images.
 *
 * The problem: `caseStudies[].thumbnail` points at a SQUARE 1080×1080 reel
 * poster, which those full-width 16:9 stages then `object-cover` — throwing
 * away roughly 40% of the height of real client work, usually the part with the
 * product or the subject in it.
 *
 * These covers are composites of REAL client frames only: reel posters, post
 * creatives and testimonial frames, arranged as layered planes over a dark
 * field with the client's accent as light. Nothing is generated, nothing is
 * invented, and no heading, metric or logo is baked in — the site overlays live
 * text so it stays selectable, translatable and accessible.
 *
 * Composition leaves the lower-left quiet, because that is where every stage
 * puts the client name and metric.
 *
 *   node scripts/build-case-covers.mjs
 *   node scripts/build-case-covers.mjs --force
 */

import { mkdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { caseStudies } from '../content/caseStudies.ts'

const OUT = path.resolve('public/generated/presentation/case-covers')
const FORCE = process.argv.includes('--force')

const DESKTOP = { w: 2400, h: 1350 } // 16:9
const MOBILE = { w: 1080, h: 1350 } // 4:5

/** Real source frames per client, in visual priority order. */
function sourcesFor(cs) {
  const real = []
  // The hero frame: prefer a post creative (already portrait, art-directed),
  // fall back to the reel poster.
  const posts = cs.posts.filter((p) => !p.isPlaceholder && p.src)
  const reels = cs.reels.filter((r) => !r.isPlaceholder && r.poster)
  return {
    hero: cs.topVideo.poster ?? reels[0]?.poster ?? posts[0]?.src,
    supports: [reels[0]?.poster, posts[0]?.src, reels[1]?.poster, posts[1]?.src]
      .filter(Boolean)
      .filter((s) => s !== (cs.topVideo.poster ?? '')),
    real,
  }
}

const abs = (p) => path.resolve('public' + p)

/**
 * The darkening sits BETWEEN the blurred base and the sharp planes, not over
 * everything. Stacking floor + left + vignette on top of the planes as well
 * buried the client's actual work under four layers of black — measured, the
 * first build came out unreadably dark.
 */
function backdropSvg(w, h, accent, mobile) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="floor" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#020306" stop-opacity="0.94"/>
        <stop offset="${mobile ? 46 : 40}%" stop-color="#020306" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#020306" stop-opacity="0.08"/>
      </linearGradient>
      <linearGradient id="left" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#020306" stop-opacity="0.86"/>
        <stop offset="52%" stop-color="#020306" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#020306" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="accent" cx="70%" cy="32%" r="62%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#accent)"/>
    <rect width="100%" height="100%" fill="url(#left)"/>
    <rect width="100%" height="100%" fill="url(#floor)"/>
  </svg>`)
}

/** Only a gentle finish over the planes, so the real frames stay crisp. */
function finishSvg(w, h, accent, mobile) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="vig" cx="50%" cy="44%" r="78%">
        <stop offset="58%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.42"/>
      </radialGradient>
      <linearGradient id="textsafe" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#020306" stop-opacity="0.8"/>
        <stop offset="${mobile ? 34 : 26}%" stop-color="#020306" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#020306" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#vig)"/>
    <!-- keeps the lower band quiet for the overlaid client name and metric -->
    <rect width="100%" height="100%" fill="url(#textsafe)"/>
    <!-- one restrained accent hairline, the site's signal language -->
    <rect x="0" y="${h - 4}" width="100%" height="4" fill="${accent}" opacity="0.6"/>
  </svg>`)
}

async function plane(src, width, height, opts = {}) {
  const img = sharp(abs(src)).resize(width, height, { fit: 'cover', position: opts.position ?? 'attention' })
  if (opts.blur) img.blur(opts.blur)
  if (opts.brightness) img.modulate({ brightness: opts.brightness })
  return img.png().toBuffer()
}

async function buildCover(cs, variant) {
  const { w, h } = variant === 'desktop' ? DESKTOP : MOBILE
  const mobile = variant === 'mobile'
  const out = path.join(OUT, `${cs.id}-${variant}.webp`)
  if (!FORCE && existsSync(out)) {
    console.log(`  skip  ${path.basename(out)}`)
    return
  }

  const { hero, supports } = sourcesFor(cs)
  if (!hero) {
    console.error(`  SKIP ${cs.id} — no real source frame`)
    return
  }

  // Base: the strongest real frame, cover-scaled, softened and darkened so the
  // supporting planes and the live text both read over it.
  const base = await plane(hero, w, h, { blur: mobile ? 10 : 14, brightness: 0.62 })

  // base → darkening → sharp planes → gentle finish
  const layers = [
    { input: base, left: 0, top: 0 },
    { input: backdropSvg(w, h, cs.accentColor, mobile), left: 0, top: 0 },
  ]

  // Supporting planes: real frames at their true aspect, inset and offset like
  // prints laid on a dark surface. Never stretched.
  if (variant === 'desktop') {
    const bigW = Math.round(w * 0.42)
    const bigH = Math.round(h * 0.74)
    layers.push({
      input: await plane(hero, bigW, bigH, {}),
      left: Math.round(w * 0.5),
      top: Math.round(h * 0.1),
    })
    if (supports[0]) {
      const sW = Math.round(w * 0.2)
      const sH = Math.round(sW * 1.333)
      layers.push({
        input: await plane(supports[0], sW, sH, {}),
        left: Math.round(w * 0.31),
        top: Math.round(h * 0.24),
      })
    }
    if (supports[1]) {
      const sW = Math.round(w * 0.17)
      const sH = Math.round(sW * 1.333)
      layers.push({
        input: await plane(supports[1], sW, sH, { brightness: 0.86 }),
        left: Math.round(w * 0.79),
        top: Math.round(h * 0.42),
      })
    }
  } else {
    // Mobile 4:5: one dominant plane high, one supporting plane behind it.
    const bigW = Math.round(w * 0.72)
    const bigH = Math.round(bigW * 1.25)
    layers.push({
      input: await plane(hero, bigW, bigH, {}),
      left: Math.round(w * 0.18),
      top: Math.round(h * 0.08),
    })
    if (supports[0]) {
      const sW = Math.round(w * 0.36)
      const sH = Math.round(sW * 1.333)
      layers.push({
        input: await plane(supports[0], sW, sH, { brightness: 0.8 }),
        left: Math.round(w * 0.02),
        top: Math.round(h * 0.38),
      })
    }
  }

  layers.push({ input: finishSvg(w, h, cs.accentColor, mobile), left: 0, top: 0 })

  mkdirSync(OUT, { recursive: true })
  await sharp({ create: { width: w, height: h, channels: 3, background: '#020306' } })
    .composite(layers)
    .webp({ quality: 80 })
    .toFile(out)

  const kb = Math.round(statSync(out).size / 1024)
  console.log(`  built ${path.basename(out).padEnd(40)} ${w}×${h}  ${kb} KB`)
}

console.log('Building case covers from real client frames only\n')
for (const cs of caseStudies) {
  console.log(cs.client)
  await buildCover(cs, 'desktop')
  await buildCover(cs, 'mobile')
}
