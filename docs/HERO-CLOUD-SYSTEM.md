# HERO-CLOUD-SYSTEM — cineheight-single-flow-v2

Correction pass (2026-07-21): cloud density rebalanced to the approved reference,
drift made continuous/linear, parallax unified on one progress value, and the
hero + brand statement merged into a single pinned sequence.

Reference target: monumental CINEHEIGHT (live Bebas Neue HTML) on near-black,
**~70–80% clean negative space**, a small cloud group crossing the lower-left
letters, a slightly wider group crossing the lower-right letters, 1–2 faint
centre wisps, and near-invisible haze behind. Clouds cover ≤12–20% of the word
at rest. No cloud wall, no storm, no Hollywood framing.

## Component

`components/hero/HeroIntroSequence.tsx` — ONE section (desktop 220vh, mobile
175vh, reduced-motion: auto/no pin) with a sticky 100vh stage containing every
layer AND the brand statement. `HeroSection.tsx`, `BrandStatement.tsx` and the
`.brand-overlap` negative-margin hack are **removed**.

## Layer stack (back → front)

| Layer | Element | Asset | Placement (desktop 1440) |
|---|---|---|---|
| L1 base | two radials | — | navy depth + #0089FF title-base light at effective ~0.05 opacity |
| L2 haze | `[data-layer="haze"]` | `cloud-back-desktop.mp4` (376 KB, screen-blend) · mobile/reduced: poster | left 15%, w 70%, top 47%, h 24%, **opacity 0.18** (mobile 0.16), `.mask-haze` |
| L3 title | `[data-hero]` h1 | Bebas Neue 400, clamp(64px, 18.6vw, 21.5rem) ≈ 72–74vw word, gradient #F5F7FA→#B8BFC9 | centred, −1vh |
| L4 groups | `[data-layer="group-left/right"]` | `cloud-group-left.webp` (16 KB) / `cloud-group-right.webp` (16 KB) — crest-only slices of the G1 master | left: max(−3vw, calc(50% − 1045px)), top 45%, w min(40vw, 620px) · right: max(−5vw, calc(50% − 1080px)), top 44%, w min(46vw, 700px); `aspect-ratio` boxes so mask == image at every viewport |
| L5 wisps | `[data-drift="wisp-1..3"]` | `cloud-wisp-accent.webp`, `wisp-mid-2.webp`, `wisp-mid-1.webp` (8–9 KB) | tops 41% / 53% / 34%, widths min(14vw, 260px) / min(10vw, 190px) / min(8vw, 150px), opacities 0.38 / 0.28 / 0.24 |
| Transition light | `[data-layer="transition-light"]` | — | #0089FF radial, opacity 0 → 0.10 (55–72%) → 0.05 |
| Statement | `[data-layer="statement"]` | — | absolute inset-0, enters via the same timeline |

Assets no longer in the live composition (kept on disk):
`cloud-middle-desktop.webp`, `cloud-front-left.webp`, `cloud-front-right.webp`.

## Masks (`app/globals.css`)

One mask-image per element (Chromium composites multiple masks with `add`,
re-hardening edges): `.mask-group-left` (dense far-left, fades centre/top/bottom),
`.mask-group-right` (mirrored), `.mask-center-soft` (wisps, mobile group),
`.mask-haze`. All single radial gradients. Poster == video first frame (both from
the G1 master), so no start flash.

## Continuous drift (no `alternate` easing)

All GSAP, created in `HeroIntroSequence`, stored in `driftTweens`:

| Element | Method | Direction | Duration |
|---|---|---|---|
| wisp-1 | linear traversal −30vw → 130vw, `repeat: -1` (loop jump happens fully offscreen) | L → R | 55 s |
| wisp-2 | same | R → L | 65 s |
| wisp-3 (desktop only) | same | L → R | 82 s |
| group-left | ±1.5vw sine sway | starts leftward | 84 s |
| group-right | ±1.3vw sine sway | opposite | 96 s |
| haze video | its own internal motion only | — | 10 s loop (seam 0.39/255) |

Drift + video pause via IntersectionObserver (threshold 0.02) and
`visibilitychange`. The old CSS `cloud-drift` keyframes
(`ease-in-out infinite alternate`) are deleted.

## One-progress parallax physics

Single timeline, `scrub: 1.2`, `invalidateOnRefresh`, progress published to
`lib/heroProgress.ts`. Every movement tween runs `ease: 'none'` over the same
**0.15 → 1.0** window, so layer ratios hold at any scroll position
(0–15% = hold, idle drift only). Base travel 60vh:

| Layer | y | x | scale |
|---|---|---|---|
| Haze | −9vh (0.15) | 0 | 1.01 |
| Groups | −27vh (0.45) | outward ±8vw | 1.025 |
| Wisps | −45vh (0.75, mobile −30vh) | drift continues | 1.04 |
| Title | −19vh (0.32, mobile −14vh) | 0 | **1.07 max** (mobile 1.05) |

Opacity happens only after movement (§9): title fades 58–86%, wisps 60–78%,
haze dims to 0.12 from 60%, groups drop to 0.12/0.14 residuals at 72–88% —
by then they've risen into the upper corners (residual handoff clouds behind
the statement's upper edges; they never cover its text).

Timeline beats: 0–15 hold · 15–55 depth/main parallax · 55–72 title fade
starts, statement enters (y 55vh→0, opacity, scale 0.985→1), blue transition
light to 0.10 · 62–78 line-clip reveals (two lines, staggered) · 74–88 support
copy · 88–100 stable statement, light settles to 0.05, pin releases. Reverse
scroll restores the opening state exactly (verified pixel-identical).

## Navbar

Hidden at first paint. Subscribes to `heroProgress`; shows > **0.68**, hides
< **0.60** (hysteresis, no flicker), 0.6 s fade + −12px→0 translate. #0089FF on
link hover/focus and the CTA border. Backing: gradient rgba(2,3,6,0.9)→0.4→
transparent so released content never reads through the bar.

## #0089FF usage (complete list)

1. Title-base light (~0.05 effective) · 2. transition illumination (≤0.10) ·
3. navbar hover/focus/CTA border · 4. `BRANDS.` in the statement. Nothing else.
No #3B82F6 anywhere in the project.

## Mobile (≤767px / coarse pointer)

175vh sequence, no video (poster haze at 0.16), **one** centred lower cloud
group (min(78vw, 330px), opacity 0.85), **one** moving wisp pair (wisp-1/2 only,
no wisp-3), no left/right walls, first/last letters never cropped, same unified
statement handoff and navbar timing.

## Reduced motion

No pin (section height auto): static 100vh hero composition (poster haze,
static groups, no drift, no video), statement rendered as a normal block below,
navbar via simple scroll threshold. All content accessible without animation.

## Performance safeguards

One video max; webp layers 8–34 KB; transform/opacity only; no per-frame React
state (heroProgress is a subscription store); drift + video pause offscreen and
on hidden tab; `gsap.context` revert on unmount; `will-change` only on animated
layers; no WebGL; no autoplay audio.
