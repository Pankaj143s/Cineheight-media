# Presentation Asset Audit

Every asset the site renders, where it came from, and what must eventually
replace it. Measured with `sharp` and `ffprobe` — nothing here is estimated.

**Provenance vocabulary** (`content/presentationMedia.ts`):

| Value | Meaning | Labelled in UI? |
|---|---|---|
| `real` | Delivered by the client, untouched | no |
| `derived-real` | Reframed/recomposed from real client media | **no** — it is still their work |
| `illustrative` | Non-client artwork illustrating a service | no (never shown as client work) |
| `concept-placeholder` | Layout prototype for a genuine gap | **yes — always** |

---

## 1 · Source inventory (client-supplied)

### Reels — 7 real, **all 1080×1080 square**

| Client | File | Duration | Size |
|---|---|---|---|
| Sapale Yamaha | `sapale-reel-01/02/03.mp4` | 36 s / 38 s / 26 s | 5.2 / 4.6 / 5.0 MB |
| SES | `ses-reel-01/02/03.mp4` | 24 s / 74 s / 36 s | 2.7 / 11.5 / 2.7 MB |
| Divija | `divija-reel-01.mp4` | 57 s | 11.8 MB |

**Problem:** the phone frames are 9:16. Every reel had to be composited against
a blurred backdrop in the DOM on every paint.
**Resolution:** derived portrait masters — §2.

### Films — 2 real, 1920×1080

`sapale-testimonial.mp4` (47 s) · `divija-testimonial.mp4` (57 s).
**SES has no testimonial** — none was ever recorded, so the SES case study has
no client film and Client Stories on the homepage carries two entries, not three.

### Static posts — all **3:4**, not 4:5

Sapale 7 (1080×1440 / 1200×1600) · SES 3 (1080×1440) · **Divija 0**.

**Problem:** three posts rendered as a full 360° ring were mostly empty space
and implied more work than the client supplied.
**Resolution:** item-count-aware geometry — §5.

### Questionable source

`public/case-studies/divija/posters/divija-poster.webp` (960×960) is recorded as
"derived from a real client photo", but on inspection it is an **aerial
industrial/plant photograph** that does not depict Divija at all. It is **not
used** as a source for anything in this pass. It should be verified or removed.

### Service artwork — superseded

`public/generated/services-final/*.webp` (6 × 1536×960). Retained on disk as a
fallback, **no longer referenced**: laptops, analytics dashboards and platform
icons read as a generic technology template. Replaced in §4.

---

## 2 · Derived portrait reels — `derived-real`

`scripts/build-presentation-reels.mjs` → `public/generated/presentation/reels/{client}/`

Composition: the complete 1080×1080 frame, sharp and centred, over a
cover-scaled, 44 px-blurred, darkened copy of itself plus a restrained client
accent wash. **The client's footage is never cropped.** Instagram chrome and
engagement figures are deliberately NOT baked in — they stay DOM overlays so
they remain real text and can never be mistaken for part of the client's video.

| Output | Duration | Bitrate | Size |
|---|---|---|---|
| sapale-reel-01 | 36 s | 672 kbps | 3.34 MB |
| sapale-reel-02 | 38 s | 641 kbps | 3.30 MB |
| sapale-reel-03 | 26 s | 729 kbps | 2.53 MB |
| ses-reel-01 | 24 s | 794 kbps | 2.53 MB |
| ses-reel-02 | 74 s | 524 kbps | 5.55 MB |
| ses-reel-03 | 36 s | 686 kbps | 3.11 MB |
| divija-reel-01 | 57 s | 533 kbps | 4.34 MB |

**7 reels · 24.7 MB · 3.53 MB average.** All 1080×1920, H.264, yuv420p,
faststart, audio retained for the lightbox. Each ships a 1080×1920 WebP poster
built from the *same* composition, so poster and first frame align exactly.

> CRF alone does not control size here: at CRF 28 the 74 s reel came out at
> 13 MB, and once a VBV cap is added the cap decides the size. The budget is
> therefore expressed as a target size per duration band, converted to a
> bitrate, with CRF 27 underneath as a quality floor.

**Replace with:** true 9:16 client masters when they exist. The phone shell
already supports both — `portrait: true` renders `object-cover`; without it the
square fallback composition applies. Never both.

---

## 3 · Case covers — `derived-real`

`scripts/build-case-covers.mjs` → `public/generated/presentation/case-covers/`
`{slug}-desktop.webp` 2400×1350 (16:9) · `{slug}-mobile.webp` 1080×1350 (4:5)

**Problem solved:** `caseStudies[].thumbnail` is a square 1080×1080 reel poster.
`/work` and Next Project `object-cover`-ed it into full-width 16:9 stages,
discarding ~40% of the frame — usually the part with the product or subject.

Composed from **real frames only**: the testimonial/reel poster as a blurred
base, then the same frame and one or two post creatives as sharp layered planes,
client accent as light, vignette, and a deliberately quiet lower-left band
because that is where every stage overlays the client name and metric.

No generated photography. No baked-in headings, metrics or logos.

| Cover | Sources | Size |
|---|---|---|
| sapale-yamaha | testimonial poster + reel-01 poster + post-01 | 81 / 37 KB |
| sindhudurg-education | reel-01 poster + post-01 | 73 / 38 KB |
| divija-old-age-home | testimonial poster + reel-01 poster | 57 / 36 KB |

Consumed by `WorkIndex.tsx` and `NextProject.tsx` through `<picture>`.

---

## 4 · Service artwork — `illustrative`

`scripts/build-service-visuals.mjs` → `public/generated/presentation/services/`
Six × **1920×1200** WebP, 30–72 KB each.

Generated as one coordinated collection (Higgsfield `cinematic_studio_2_5`, 2k,
3:2), then normalised locally: letterbox bars measured and removed per row,
cropped to a common frame, graded to shared contrast/saturation targets, and
finished with the site's own signal language — one long blue arc, corner crop
marks, a frame and fine grain, **identical on all six**, which is what makes
them a set rather than six unrelated images.

| Service | Candidate | Notes |
|---|---|---|
| Brand Identity | brand-a | nested plates + alignment marks; 132/131 px bars trimmed |
| Social Media | social-a | curved ribbon of frames; no bars |
| Graphic Design | graphic-b | fanned poster planes; chosen over A for right-weighted composition |
| Video Production | video-b | nested apertures + anamorphic flare; chosen over A, whose blue line read as a crack |
| Performance Marketing | perf-a | scattered points converging into nodes; chosen over B, which had a green cast |
| Content Creation | content-a | four panels bound by one thread |

**Rejected:** `content-b` rendered a **white gallery interior**, breaking the
near-black direction entirely. No output contained text, logos, dashboards,
platform icons, laptops or people.

---

## 5 · Divija concept placeholders — `concept-placeholder`

`scripts/build-divija-concepts.mjs` → `public/generated/presentation/concepts/divija-old-age-home/`

`caseStudies.ts` records **two reel slots and two post slots** the client never
supplied. (Older documentation mentioning four Divija post placeholders is
stale; the current data is authoritative.) These are layout prototypes at the
exact final dimensions so the installations can be designed and judged.

| Output | Derived from | Size |
|---|---|---|
| `divija-reel-02-concept.mp4` + poster | testimonial footage @12 s | 0.71 MB |
| `divija-reel-03-concept.mp4` + poster | Diwali reel footage @22 s | 0.75 MB |
| `divija-post-01-concept.webp` | reel-01 poster | 74 KB |
| `divija-post-02-concept.webp` | testimonial poster | 68 KB |

Every one carries a **baked-in `CONCEPT PLACEHOLDER` mark**, a dashed accent
border and a diagonal hatch — visible at any size, in the file itself as well as
in the UI badge. Nothing depicts a fictional resident, building or event.

**Replace with:** final Resident Story Film and Donation Campaign Reel masters
(1080×1920) and final Resident Story / Donation Appeal creatives (1080×1350).
Swapping the entries in `presentationMedia.ts` from `concept-placeholder` to
`real` removes every badge automatically.

---

## 6 · Still required from the client

1. **Divija** — 2 reel masters + 2 post creatives (currently concept prototypes).
2. **SES** — a recorded testimonial, if one is ever produced.
3. **All clients** — native 9:16 reel masters, which would retire the derived
   portrait layer entirely.
4. **Divija** — confirmation on `divija-poster.webp`, which does not appear to
   show Divija.
