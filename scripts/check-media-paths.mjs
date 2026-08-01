/**
 * Validates every src/poster path in mediaManifest.ts, caseStudies.ts and
 * siteContent.ts actually exists under public/ (spec §39 media path
 * validation + missing-poster check). Run: node scripts/check-media-paths.mjs
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { mediaManifest } from '../content/mediaManifest.ts'
import { caseStudies } from '../content/caseStudies.ts'
import { trustedClients, services } from '../content/siteContent.ts'
import { featuredWorkSlots, workIndexSlots } from '../content/mediaSlots.ts'

const PUB = path.resolve('public')
let missing = 0
const check = (p, label) => {
  if (!p) return
  const full = path.join(PUB, p)
  if (!existsSync(full)) {
    console.error('MISSING:', label, '→', p)
    missing++
  }
}

for (const item of mediaManifest) {
  if (item.actual) {
    check(item.src, `manifest:${item.id}`)
    if (item.poster) check(item.poster, `manifest:${item.id}:poster`)
  }
}
for (const cs of caseStudies) {
  check(cs.topVideo.src, `${cs.id}:topVideo`)
  check(cs.topVideo.poster, `${cs.id}:topVideo:poster`)
  check(cs.heroMedia.src, `${cs.id}:heroMedia`)
  check(cs.heroMedia.poster, `${cs.id}:heroMedia:poster`)
  check(cs.thumbnail, `${cs.id}:thumbnail`)
  for (const r of cs.reels) if (!r.isPlaceholder) { check(r.src, `${cs.id}:reel:${r.title}`); check(r.poster, `${cs.id}:reel:${r.title}:poster`) }
  for (const p of cs.posts) if (!p.isPlaceholder) check(p.src, `${cs.id}:post:${p.title}`)
}
for (const c of trustedClients) check(c.logo, `trusted:${c.name}`)
for (const s of services) check(s.image, `service:${s.id}`)
for (const slots of [featuredWorkSlots, workIndexSlots]) {
  for (const spec of Object.values(slots)) {
    if (spec.status === 'placeholder') continue
    check(spec.desktop.src, `mediaSlots:${spec.id}:desktop`)
    if (spec.desktop.poster) check(spec.desktop.poster, `mediaSlots:${spec.id}:desktop:poster`)
    if (spec.status === 'ready') {
      check(spec.mobile.src, `mediaSlots:${spec.id}:mobile`)
      if (spec.mobile.poster) check(spec.mobile.poster, `mediaSlots:${spec.id}:mobile:poster`)
      if (spec.ultrawide) {
        check(spec.ultrawide.src, `mediaSlots:${spec.id}:ultrawide`)
        if (spec.ultrawide.poster) check(spec.ultrawide.poster, `mediaSlots:${spec.id}:ultrawide:poster`)
      }
    }
  }
}

console.log(missing === 0 ? 'All media paths resolve.' : `${missing} missing path(s).`)
process.exit(missing === 0 ? 0 : 1)
