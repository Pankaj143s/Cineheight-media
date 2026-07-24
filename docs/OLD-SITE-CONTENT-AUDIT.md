# OLD-SITE CONTENT AUDIT — cineheight_design_2 → cineheight-single-flow-v2

Audit date: 2026-07-25. Source project `../cineheight_design_2/` is READ-ONLY —
nothing in it was modified. Every file below was opened and verified (text read
in place, videos ffprobe'd + frame-inspected, images opened with sharp).

## 1. Old project inspected

| Area | Files | Finding |
|---|---|---|
| Routes | `app/page.tsx`, `app/work/[slug]/page.tsx`, `app/{error,loading,not-found}.tsx` | Public routes: `/` and `/work/[slug]` (3 slugs). **No** `/work` index, `/about`, `/services`, `/contact`, `/insights` or legal routes exist. Those were homepage anchor sections only. |
| Case-study data | `lib/caseStudies.ts` | THE source of truth. 3 studies with full verified copy + metrics (below). |
| Homepage content | `components/{About,Contact,Process,TrustedBy,Footer,TaglineSection,StartProjectCTA}.tsx`, `components/services/ServiceRows.tsx` | All verified copy extracted into `content/siteContent.ts`. |
| Metadata | `app/layout.tsx` | Title/description/OG migrated & updated; `og-image.jpg` was flagged TODO in the old project itself. |
| Media | `public/case-studies/**`, `public/logos/**`, `public/about/**`, `public/media/**`, `public/generated/services-final/**` | All real; all migrated (details below). |
| Raw media | `Data to be used/Client photo and video/**` | **STOCK FOOTAGE — excluded** (see §5). |
| Manifests | `ASSET-MANIFEST.md`, `CINEHEIGHT-EDITOR-ASSET-SPECS.md` | Cross-checked for authoritative names/dims. |

## 2. Verified written content migrated (verbatim)

- **3 case studies** — client, tagline, hook, category, year, objective,
  description, approach[], resultSummary, 4 stats + 4 growth metrics each,
  accent colours (`#204497` / `#334FA2` / `#0092CB`) → `content/caseStudies.ts`.
- **Services ×6** — titles + descriptions from `ServiceRows.tsx` → `content/siteContent.ts`.
- **Process** — old 5-step copy (Discovery/Strategy/Creation/Execution/Optimization)
  simplified to the approved 4 beats (Discover/Strategize/Create/Deliver);
  Deliver merges Execution + Optimization copy so nothing verified is lost.
- **About** — "Everything a brand needs. One team." + "Strategy, design, content
  and campaigns — under one roof." + 4 capability chips.
- **Trusted clients ×13** — names, logo files, per-logo sizing and light-plate
  flags from `TrustedBy.tsx`.
- **Contact** — phone `+91 8308765466`, email `grow@cineheight.com` (primary,
  from the old Contact section), `shreyas@cineheight.com` (direct, old
  footer/nav), Kankavli location, Instagram `@cineheight.media`, WhatsApp link.
  *Discrepancy noted:* old project used both emails; the structured
  `contactInfo` object in `Contact.tsx` treats `grow@` as the inquiry address —
  adopted as primary, `shreyas@` kept as the direct line in the footer.
- **Footer line** — "Your journey from business to brand begins here."

## 3. Real media migrated (all verified real client work)

| Asset | Client | Dims / dur / size | Old source (public/) | New path | Poster |
|---|---|---|---|---|---|
| Bike Exchange Campaign | Sapale | 1080×1080 · 36.3 s · 5.2 MB · h264/aac | sapale-yamaha/reels/sapale-reel-01.mp4 | same | real frame @ t=11s |
| Choose Your Style | Sapale | 1080×1080 · 37.8 s · 4.6 MB | …/sapale-reel-02.mp4 | same | t=12s |
| Fascino Brand Film | Sapale | 1080×1080 · 25.8 s · 5.0 MB | …/sapale-reel-03.mp4 | same | t=8s |
| Sapale Testimonial | Sapale | 1920×1080 · 46.7 s · 4.1 MB | …/testimonial/sapale-testimonial.mp4 | same | t=14s |
| Sapale posts ×7 | Sapale | 1080×1440 ×4, 1200×1600 ×3 (3:4) | …/posts/ | same | — |
| Pharmacy Campaign | SES | 1080×1080 · 23.9 s · 2.7 MB | ses/reels/ses-reel-01.mp4 | same | t=7s |
| B.Pharm Farewell | SES | 1080×1080 · 74.0 s · 11.5 MB | …/ses-reel-02.mp4 | same | t=22s |
| Consistency Story | SES | 1080×1080 · 35.6 s · 2.7 MB | …/ses-reel-03.mp4 | same | t=11s |
| SES posts ×3 | SES | 1080×1440 (3:4) | …/posts/ | same | — |
| Diwali Campaign | Divija | 1080×1080 · 57.3 s · 11.8 MB | divija/reels/divija-reel-01.mp4 | same | t=17s |
| Divija Community Story | Divija | 1920×1080 · 56.6 s · 9.1 MB | …/testimonials/divija-testimonial.mp4 | same | t=8s |
| Divija cover | Divija | 960×960 | …/posters/divija-poster.webp | same | — |
| Showreel | Cineheight | 1920×1080 · 32.0 s · 15.1 MB | about/about-us-video-2-horizontal.mp4 | /media/showreel/showreel.mp4 | t=6.4s |
| Logos ×13 + brand ×2 | — | see mediaManifest | logos/ | same | — |
| Service artwork ×6 | — | 1536×960 webp | generated/services-final/ | same | — |

Reality check performed on video content (frame inspection): Sapale reels show
the actual Sapale Auto Yamaha showroom (branded uniforms, Marathi captions);
SES reels carry Sindhudurg Education Society lockups; Divija films show the
actual Divija Old Age Home and its Diwali celebration. Confirmed real.

All videos H.264 yuv420p + AAC (streamable); posters are real extracted frames.

## 4. Missing real media (honest placeholders, never faked)

| Slot | Client | Status |
|---|---|---|
| Reel 2 "Resident Story Film" | Divija | Placeholder card — file never supplied |
| Reel 3 "Donation Campaign Reel" | Divija | Placeholder card — file never supplied |
| Static posts | Divija | None exist — detail page shows honest gap, homepage gallery shows real posts only |
| SES testimonial | SES | Never recorded — first campaign reel stands in, badged "Campaign Film" (old site's own strategy) |
| Dedicated showreel cut | Cineheight | About film doubles as showreel (old site did the same) |
| OG image | Cineheight | Old `og-image.jpg` was itself flagged TODO; new OG uses real showreel poster |

**Real reels: 7 of 9 slots** (3 Sapale, 3 SES, 1 Divija). Real posts: 10 (7+3+0).

## 5. EXCLUDED: `Data to be used/Client photo and video/` is stock footage

Frame-by-frame inspection (2026-07-25) of the raw folder that was initially
assumed to hold extra client media:

| File | Claims to be | Actually shows | Verdict |
|---|---|---|---|
| Yamaha/yamaha-video-1-horizontal.mp4 | Yamaha film | Industrial power plant, unrelated logo | STOCK |
| SES/ses-video-1-horizontal.mp4 | SES film | European Gothic university campus | STOCK |
| Divija/divija-video-horizontal.mp4 | Divija film | Road-construction site | STOCK |
| Divija/divija-video-vertical.mp4 | Divija reel | Mexican government palace w/ Mexican flag | STOCK |
| Yamaha/yamaha-photo-01… | Yamaha photo | Generic warehouse stock photo | STOCK |
| cineheight…/about-us-video-1 | About film | Generic photographer street stock clip | STOCK |

**Decision:** none of these files ship. Presenting them as client work would
fabricate client media. Derived files created during the initial (pre-audit)
processing pass were deleted the same day. Only `about-us-video-2` survives —
it is the film the old LIVE site actually served as its about/showreel and its
content (Konkan aerial production work) is consistent with the client list.

## 6. Intentionally NOT copied (design, per brief)

Old homepage JSX/section structure, all old CSS/layout/spacing, old card and
carousel styling (`PostsRing`, `CaseStudyVideoGallery`, `WorkChapters`), old
navbar/footer design, old animation values, `AtmosphereField`/`SignalStage`
WebGL system, Lenis/Sound/Theme providers, loader. Playback *logic patterns*
(active-only video, IO thresholds) were studied and re-implemented fresh.

## 7. Route decisions

- Old public routes `/` + `/work/[slug]` ×3 → rebuilt in the new system.
- `/work` index — new (old had none; nav pointed at `/#work`).
- `/about`, `/services`, `/contact` — new full pages (old had sections only).
- **Insights** — old live nav had NO insights item and zero insight content
  exists → no insights route, no nav item (documented intent, not an omission).
- **Legal** — the old project deliberately removed legal placeholder links
  ("nothing inactive pretends to be a link"). No legal text exists to migrate →
  no fabricated privacy/terms routes; footer carries the real copyright line.
