# Final Work Media Specs

The homepage **Selected Work** stage (`components/home/FeaturedWorkJourney.tsx`)
and the **/work index** (`components/work/WorkIndex.tsx`) currently render a
designed placeholder (`components/media/MediaSpecPlaceholder.tsx`) instead of
real client media. The layout was deliberately **not** built around the ratios
of the existing client reels — the client is producing new, final media
specifically for this design.

Every slot below is defined in `content/mediaSlots.ts`. Dropping the real file
at the exact `targetSrc` path and flipping that slot's `status` from
`'placeholder'` to `'ready'` is the **only** change required — no component or
layout code needs to change.

**This does not affect the individual `/work/[slug]` case-study pages** — those
keep rendering real client reels, testimonials and posts untouched.

---

## 1 · Homepage Selected Work (`featuredWorkSlots` / `featuredWorkMobileSlots`)

Full-width cinematic master per project.

| Client | Desktop target | Desktop spec | Mobile target | Mobile spec |
|---|---|---|---|---|
| Sapale Yamaha | `/media/home-work/sapale-yamaha-desktop.mp4` | 2560×1440 · 16:9 | `/media/home-work/sapale-yamaha-mobile.mp4` | 1080×1350 · 4:5 |
| Sindhudurg Education Society | `/media/home-work/sindhudurg-education-desktop.mp4` | 2560×1440 · 16:9 | `/media/home-work/sindhudurg-education-mobile.mp4` | 1080×1350 · 4:5 |
| Divija Old Age Home | `/media/home-work/divija-old-age-home-desktop.mp4` | 2560×1440 · 16:9 | `/media/home-work/divija-old-age-home-mobile.mp4` | 1080×1350 · 4:5 |

Each desktop slot also needs a matching poster at
`/media/home-work/{id}-desktop.webp` (2560×1440) and mobile poster
at `/media/home-work/{id}-mobile.webp` (1080×1350).

**Format:** MP4 (H.264), muted-loop-safe, 15–30s desktop and 10–20s mobile.
Target size is ≤15 MB desktop and ≤8 MB mobile. No essential text/subject
inside the outer 8% edge margin (the stage crops and drifts slightly under
scroll parallax).

**Optional ultrawide** (`featuredWorkUltrawide` in `content/mediaSlots.ts`,
used only if supplied): `/media/home-work/{id}-ultrawide.mp4` with matching
`.webp` poster, 3840×1600, 12:5 / 2.4:1, target ≤18 MB.

**Creative brief per client:**
- **Sapale Yamaha** — showroom/product hero shot, landscape, matching the
  existing Fascino brand-film tone already used on `/work/sapale-yamaha`.
- **Sindhudurg Education Society** — campus/academic-life hero shot, matching
  the SES visual identity already established in its case study.
- **Divija Old Age Home** — a warm, dignified resident/community shot,
  matching the tone of the existing Divija film series (never stock footage —
  see `content/caseStudies.ts`'s own honesty note on this client's gaps).

---

## 2 · /work index covers (`workIndexSlots` / `workIndexMobileSlots`)

Art-directed cover per client — still image or short cinematic loop, not the
square reel poster (`caseStudies[].thumbnail`) blown up, which would crop
~40% of the real work.

| Client | Desktop target | Desktop spec | Mobile target | Mobile spec |
|---|---|---|---|---|
| Sapale Yamaha | `/media/work-index/sapale-yamaha-desktop.webp` | 2560×1440 · 16:9 | `/media/work-index/sapale-yamaha-mobile.webp` | 1080×1350 · 4:5 |
| Sindhudurg Education Society | `/media/work-index/sindhudurg-education-desktop.webp` | 2560×1440 · 16:9 | `/media/work-index/sindhudurg-education-mobile.webp` | 1080×1350 · 4:5 |
| Divija Old Age Home | `/media/work-index/divija-old-age-home-desktop.webp` | 2560×1440 · 16:9 | `/media/work-index/divija-old-age-home-mobile.webp` | 1080×1350 · 4:5 |

**Format:** WebP still targeting ≤500 KB, or a short (≤6s, ≤5 MB) muted
looping MP4 if a motion cover is preferred later. `MediaSpecPlaceholder`
already supports changing `mediaKind` and paths without a layout change.

The homepage and /work-index assets **may** be the same source composition if
it reads well cropped both ways, but the two slot maps are independent so a
client can supply different assets for each context without any code change.

---

## 3 · Safe areas & general notes

- Desktop 16:9 stage: keep essential subject matter inside the central ~84% —
  the outer edges are where the readability scrim and, on the homepage stage,
  a subtle scroll-parallax scale (~1–2%) apply.
- Mobile 4:5 stage: keep subjects inside the central 80% safe area.
- Posters must match their video's exact pixel dimensions — the placeholder
  and the real media occupy an identical aspect-locked box, so a mismatched
  poster ratio would shift layout the moment a slot goes live.
- Once a slot's real asset lands, update only `content/mediaSlots.ts`: set
  `status: 'ready'` and confirm `targetSrc`/`targetPoster` match the delivered
  filenames exactly.
