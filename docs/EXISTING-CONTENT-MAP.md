# EXISTING-CONTENT-MAP — cineheight-single-flow-v2

Source of truth: `../cineheight_design_2/` (READ-ONLY — never modified by this project).
All assets listed below are **copied** into this project; originals stay untouched.

Audit date: 2026-07-21. Image dimensions verified with sharp; video dimensions
verified with ffprobe (ffmpeg-static) during migration — noted "docs" where taken
from the old project's ASSET-MANIFEST.md pending probe.

Legend — **Real**: actual client media. **PH**: placeholder required (real asset absent).

---

## 1. Case-study data (text) — `lib/caseStudies.ts` (old) → `content/caseStudies.ts` (new)

Three case studies migrate verbatim (client, tagline, hook, category, year, objective,
description, approach[], resultSummary, stats[], growthMetrics[], accent colours):

| id | Client | Category | Year | Accent | Verified headline metrics |
|---|---|---|---|---|---|
| `sapale-yamaha` | Sapale Yamaha | Social Media • Brand Strategy | 2024 | `#204497` | 3x qualified leads, 250+ enquiries, +50% sales, 2x walk-ins, 714K+ content views (in description) |
| `sindhudurg-education` | Sindhudurg Education Society | Brand Identity • Content Strategy | 2024 | `#334FA2` | 1000+ qualified leads, 4x admission enquiries, 3x website visitors, 10x video views |
| `divija-old-age-home` | Divija Old Age Home | Brand Rebuild • Film Production | 2023 | `#0092CB` | +70% donations, 3x website visitors, 50+ volunteer sign-ups, 20% recurring donors |

Routes (old + new): `/` and `/work/[slug]` for the three ids above.

## 2. Reels (target: 3 per client, 9 total)

| Asset | Client | Type | Original path (old `public/`) | Dims | Ratio | Size | Use | New destination | Status |
|---|---|---|---|---|---|---|---|---|---|
| Bike Exchange Campaign | Sapale | mp4 | `case-studies/sapale-yamaha/reels/sapale-reel-01.mp4` | 1080×1080 (docs) | 1:1 | 5.1 MB | home reel gallery + detail | same path | **Real** |
| Choose Your Style | Sapale | mp4 | `case-studies/sapale-yamaha/reels/sapale-reel-02.mp4` | 1080×1080 (docs) | 1:1 | 4.5 MB | home + detail + featured hero | same path | **Real** |
| Fascino Brand Film | Sapale | mp4 | `case-studies/sapale-yamaha/reels/sapale-reel-03.mp4` | 1080×1080 (docs) | 1:1 | 4.9 MB | home + detail | same path | **Real** |
| Pharmacy Campaign | SES | mp4 | `case-studies/ses/reels/ses-reel-01.mp4` | 1080×1080 (docs) | 1:1 | 2.6 MB | home + detail + SES topVideo (no testimonial exists) | same path | **Real** |
| B.Pharm Farewell | SES | mp4 | `case-studies/ses/reels/ses-reel-02.mp4` | 1080×1080 (docs) | 1:1 | 11.3 MB | home + detail (re-encode target ≤6 MB) | same path | **Real** |
| Consistency Story | SES | mp4 | `case-studies/ses/reels/ses-reel-03.mp4` | 1080×1080 (docs) | 1:1 | 2.6 MB | home + detail | same path | **Real** |
| Diwali Campaign | Divija | mp4 | `case-studies/divija/reels/divija-reel-01.mp4` | 1080×1080 (docs) | 1:1 | 11.5 MB | home + detail (re-encode target ≤6 MB) | same path | **Real** |
| Resident Story Film | Divija | — | — (old data flags `isPlaceholder`) | 9:16 intended | 9:16 | — | detail | `case-studies/divija/reels/divija-reel-02.mp4` reserved | **PH** — labelled placeholder card, path + ratio preserved |
| Donation Campaign Reel | Divija | — | — (old data flags `isPlaceholder`) | 9:16 intended | 9:16 | — | detail | `case-studies/divija/reels/divija-reel-03.mp4` reserved | **PH** — labelled placeholder card |

Real reels available: **7 of 9**. Divija has 1 real reel; slots 2–3 ship as honest
labelled placeholders (no fabricated client work, no Higgsfield client media).

## 3. Static posts

| Asset | Client | Type | Original path | Dims | Ratio | Size | New destination | Status |
|---|---|---|---|---|---|---|---|---|
| sapale-post-01…04 | Sapale | webp | `case-studies/sapale-yamaha/posts/` | 1080×1440 | 3:4 | 133–153 KB | same paths | **Real** ×4 |
| sapale-post-05…07 | Sapale | webp | `case-studies/sapale-yamaha/posts/` | 1200×1600 | 3:4 | 143–168 KB | same paths | **Real** ×3 |
| ses-post-01…03 | SES | webp | `case-studies/ses/posts/` | 1080×1440 | 3:4 | 63–130 KB | same paths | **Real** ×3 |
| Divija posts 01–04 | Divija | — | — (flagged `isPlaceholder` in old data) | 3:4 intended | 3:4 | — | `case-studies/divija/posts/post-0{1..4}.webp` reserved | **PH** ×4 — labelled placeholders |

Real posts: **10** (7 Sapale + 3 SES). Divija: 0 real posts.

## 4. Testimonial / campaign videos

| Asset | Client | Orientation | Original path | Size | New destination | Status |
|---|---|---|---|---|---|---|
| Sapale testimonial | Sapale | landscape 16:9 | `case-studies/sapale-yamaha/testimonial/sapale-testimonial.mp4` | 4.0 MB | same path | **Real** |
| Divija testimonial | Divija | landscape 16:9 | `case-studies/divija/testimonials/divija-testimonial.mp4` | 8.9 MB | same path | **Real** |
| SES testimonial | SES | — | none recorded (old topVideo falls back to `ses-reel-01.mp4` as "Campaign Film") | — | same fallback strategy | **PH** strategy: real reel as campaign film, honestly badged |
| Divija poster | Divija | 1:1 960×960 | `case-studies/divija/posters/divija-poster.webp` | 225 KB | same path | **Real** (derived from client photo) |

## 5. Showreel

| Field | Value |
|---|---|
| Real file | `public/about/about-us-video-2-horizontal.mp4` — 14.7 MB, 1920×1080 (docs; old project compressed from 28 MB) |
| Poster | `public/media/showreel/showreel-poster.webp` — 1920×1080, 12 KB (generated card, not a video still) |
| New destination | `public/media/showreel/showreel.mp4` + same poster path |
| Status | **Real** video. No dedicated client showreel cut exists; the About film doubles as showreel (old site did the same). Poster is a generated card — replace with a graded video still at migration (extract via ffmpeg, no credits). |

## 6. Client logos (trusted-by)

All PNG, copied to `public/logos/` (same filenames):

| Logo | Dims | Size | Notes |
|---|---|---|---|
| yamaha-logo.png | 1115×325 | 112 KB | Sapale Yamaha |
| ses-white-text-logo.png | 908×266 | 46 KB | SES |
| divija-logo.png | 406×519 | 82 KB | needs light plate (dark logo) |
| ongc-logo.png | 880×929 | 35 KB | needs light plate |
| wetnjoy-logo-footer.png | 400×160 | 54 KB | |
| walkswagon-logo.png | 598×600 | 29 KB | needs light plate |
| askara-logo.png | 300×66 | 14 KB | |
| dji-blue-logo.png | 835×481 | 146 KB | needs light plate |
| sapale-logo.png | 701×198 | 58 KB | |
| trusted/dave-and-busters.png | 200×160 | 10 KB | |
| trusted/election-commission.png | 200×160 | 4 KB | |
| trusted/imagica.png | 200×160 | 10 KB | |
| trusted/nhai.png | 200×160 | 7 KB | |
| brand/cineheight-logo-white.png | 786×120 | 14 KB | navbar wordmark |
| brand/cineheight-logo-blue.png | 786×120 | 24 KB | alt |

## 7. Service images (final artwork — REUSED, no regeneration)

`public/generated/services-final/*.webp` → copied to same path. All 1536×960 (16:10), 64–108 KB:
brand-identity, social-media, graphic-design, video-production, performance-marketing, content-creation.

Service copy (from `components/services/ServiceRows.tsx`):
1. **Brand Identity & Design** — "Distinctive brand identities that capture your essence and resonate with your audience."
2. **Social Media Management** — "Strategic social presence that builds community and converts followers into customers."
3. **Graphic Design & Visuals** — "Eye-catching visual content that communicates your message and stops the scroll."
4. **Video Production & Editing** — "Cinematic storytelling that captivates your audience from concept to final cut."
5. **Performance Marketing** — "Data-driven campaigns that deliver measurable results and real growth."
6. **Content Creation** — "Compelling content that tells your story through photography, video, and copy."

## 8. About media

| Asset | Path | Size | Status |
|---|---|---|---|
| about-us-video-2-horizontal.mp4 | `public/about/` | 14.7 MB | **Real** — doubles as showreel (§5). Old About section is typography-only; new About may reuse this or stay typographic. |
| about-us-video-1/3 | only in `Data to be used/` (28–48 MB raw) | — | not web-ready; not copied. Note for client. |

## 9. Fonts

| File | Weights | Old path | New path | Role |
|---|---|---|---|---|
| satoshi-500.woff2, satoshi-700.woff2 | 500/700 | `public/fonts/` | `public/fonts/` | Editorial headings (§6) |
| poppins-400/500/600.woff2 | 400/500/600 | `public/fonts/` | `public/fonts/` | Body copy |
| Bebas Neue | 400 | **not in old project** | `public/fonts/bebas-neue-400.woff2` via `@fontsource/bebas-neue` (OFL) npm package | Hero CINEHEIGHT (live HTML) |

## 10. Contact information (verified, from old `Contact.tsx` / `Footer.tsx` / `Navbar.tsx`)

- Phone: **+91 8308765466**
- Emails: **grow@cineheight.com** (contact section) · **shreyas@cineheight.com** (footer/nav)
- Instagram: **@cineheight.media** → https://instagram.com/cineheight.media
- WhatsApp: https://wa.me/918308765466
- Location: Kankavli, Maharashtra, India
- Contact form: old form has **no real endpoint** (simulated submit) → new site uses direct
  mailto/tel/WhatsApp CTAs, no fake form (§29 of the build spec).

## 11. Navigation & legal

- Old nav: Home, Work, Showreel, Services, About, Contact (+ Start a Project CTA `#contact`).
- New nav (per approved direction): Work, Services, Process, About, Contact, Start a Project.
  ("Insights" has no real content in the old project — omitted rather than shipping an empty link.)
- Legal: the old project has **no privacy/terms pages**. Footer shipped only section links +
  copyright. New footer includes Privacy & Terms links to clearly-labelled interim pages
  pending client legal copy (documented in MEDIA-REPLACEMENT-GUIDE.md).

## 12. Copy blocks reused verbatim

- Brand statement: **WE TURN BUSINESSES INTO BRANDS.** (old `TaglineSection.tsx`)
- About: **Everything a brand needs. One team.** / "Strategy, design, content and campaigns — under one roof."
- Footer closing: "Your journey from business to brand begins here."
- Trusted heading: "Trusted by brands, institutions and businesses"
- Process (old, 5 steps): Discovery / Strategy / Creation / Execution / Optimization with
  one-line descriptions. New spec (§26) uses 4 steps — mapped: Discover ("Understand goals,
  audience, brand essence"), Strategize ("Roadmap combining creativity + marketing insights"),
  Create ("Design and content teams bring ideas to life"), Deliver ("Launch, publish, manage
  and optimize campaigns for impact" — merges old steps 04+05).

## 13. Cloud/atmosphere assets evaluated for reuse — ALL REJECTED for hero-v2

| Asset | Verdict |
|---|---|
| `generated/hero-cloud/hero-cloud-base-loop.mp4` + posters | Dark navy storm-like frame-edge clouds — violates "white clouds / no storm" direction. Not copied. |
| `generated/hero-cloud/cloud-{left,right,centre-wisp}.webp` | Blue-gray smoke-like puffs, wrong tone vs approved white cumulus. Not copied. |
| `design-explorations/assets/cloud-deck*.webp` | Reads as ocean/planet horizon — previously rejected direction. Not copied. |
| `design-explorations/assets/cloud-wisps*.webp` | Thin smoke streaks, not realistic white cloud wisps. Not copied. |

→ Fresh Higgsfield generation for the hero-v2 cloud system is required (see
HIGGSFIELD-GENERATION-LOG.md). Everything else on the page uses CSS/SVG/existing media.

## 14. Approved hero visual reference

`../cineheight_design_2/design-review/gate2-hero-stills/direction-1/d1-desktop-01.png`
(2752×1536): monumental condensed white CINEHEIGHT on near-black, white cloud band
crossing the lower-middle letters (in front of some, behind others), sparse upper wisps,
restrained `#0089FF` slot light between letters, generous black negative space.
Live build renders the title as real HTML (Bebas Neue) over layered cloud media.

## 15. Not copied (out of scope / superseded in old repo)

`generated/services-v2/*` (superseded by services-final), `og-image.jpg` (old branding —
new OG card generated in-repo later), `textures/noise.png` (new grain is inline SVG),
`sounds/` (empty), `.git`, `node_modules`, `unwanted/`, backups, design-review PNGs
(reference only), `Data to be used/` raw exports (already curated into `public/`).
