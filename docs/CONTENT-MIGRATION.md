# CONTENT-MIGRATION — cineheight-single-flow-v2

Tracks real content/media reused from the old project (`../cineheight_design_2/`,
read-only). Full asset inventory: `EXISTING-CONTENT-MAP.md`.

**Principle:** only verified content and real media are reused. **No old homepage
component, layout, CSS or animation is copied** — every section is newly designed
for the single-flow site.

## Migrated so far

| Item | Old source | New path | Notes |
|---|---|---|---|
| Showreel video | `public/about/about-us-video-2-horizontal.mp4` | `public/media/showreel/showreel.mp4` | Real film, copied verbatim (1920×1080, 32.04 s, H.264/AAC, 14.7 MB). Old source untouched. |
| Showreel poster | — (extracted) | `public/media/showreel/showreel-poster.webp` | **Real frame** from the video at t=6.4 s via ffmpeg; 1600×900 WebP, 178 KB. Not the old generated placeholder card. |
| Brand statement copy | old `TaglineSection.tsx` (text only) | in `HeroIntroSequence.tsx` | "WE TURN BUSINESSES INTO BRANDS." + support line — text reused, layout new. |
| Hero fonts / tokens / logos / case-study media | see `EXISTING-CONTENT-MAP.md` | `public/...` | Copied earlier; only the assets, no components. |

## Component provenance (new, not copied)

- `components/hero/HeroIntroSequence.tsx` — new.
- `components/showreel/ShowreelSection.tsx` — new; the old `ShowreelSection.tsx`
  (Framer Motion + GSAP clip reveal + SoundProvider + section wrapper) was **not**
  used as a base. The new one shares nothing with it beyond pointing at the same
  real video file.
- `components/Navbar.tsx` — new (progress-subscribed reveal).

## Still pending (real content available, not yet built)

Trusted-client logos, three case studies (Sapale / SES / Divija) with real reels
+ posts + verified metrics, six final service images, process/about/testimonials/
contact/footer copy — all inventoried in `EXISTING-CONTENT-MAP.md`, to be built in
later phases (not this task).
