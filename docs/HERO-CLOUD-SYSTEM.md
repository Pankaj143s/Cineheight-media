# HERO-CLOUD-SYSTEM — cineheight-single-flow-v2

> ## experiment/cineheight-layered-cloud-hero-v1 — stationary layered banks (CURRENT on this branch)
>
> Marquee / traverse continuous drift is **removed** on this experiment branch.
> `HeroIntroSequence` is a stationary three-depth composition at rest:
>
> | Layer | Role | z (sticky stage) |
> |---|---|---|
> | Atmosphere + ripple | base | below |
> | L1 Distant (`back-soft`, `haze-band`) | soft bank behind wordmark | `z-0` |
> | L2 Midground (`front-left/right`, `puff`) | wider bottom band | `z-1` |
> | Title + refraction | CINEHEIGHT | `z-2` |
> | L3 Foreground bank | occludes lower letters (~15–22% desktop) | `z-4` |
> | Hero→showreel dark blend | dissolves into `#020306` | `z-5` |
> | Statement | brand line | `z-6` |
>
> Motion: restrained **scroll parallax only** (distant ≪ mid ≪ fore); none under
> reduced-motion or capability `static`. Mobile drops haze/puff/right mid plates.
> Asset pipeline / repair notes below still apply; live layout contract above
> supersedes marquee/traverse placement in older sections.
>
> ## hero-v4 repair — the drifting rectangle + solid occlusion (2026-07-30)
>
> Two defects, both fixed by a new post-process pass,
> `scripts/repair-hero-clouds.mjs`, run via `npm run clouds:repair`.
>
> ### 1. A visible rectangle drifted across the hero
>
> The `trim({ threshold: 8 })` that closed `recoverCheckerAlpha()` crops to the
> alpha bounding box, which **removes the black safety margin** the four G4 crops
> keep by hand. `cloude-1.jpg`'s wisp runs off its own frame, so the bounding box
> *was* the frame and `cloud-haze-band.webp` shipped truncated. Measured alpha
> (0–255) on the shipped file:
>
> | edge | max | avg | px > 40 |
> |---|---|---|---|
> | right | 248 | **131.7** | 483 / 575 |
> | bottom | 253 | **80.7** | 865 / 1800 |
> | top / left | 19 / 18 | 0.0 / 0.2 | 0 |
>
> Rendered at 76vw as a marquee, that hard cut swept across the stage on a ~130s
> loop. Minor residue elsewhere: `cloud-traveller` right column max 144,
> `cloud-back-soft` left column max 104, `cloud-puff-accent` top row max 47.
>
> **The spec always claimed "every crop keeps black margin so alpha reaches 0
> before the edge". It is now enforced rather than assumed:**
> `scripts/lib/cloud-alpha.mjs` `featherAlpha()` ramps each border to exactly 0
> with a smoothstep, and **both** asset scripts assert a zero border and fail
> otherwise. All six assets now measure 0 on all four borders.
>
> `cloud-haze-band` needed wide ramps (right 340px, bottom 210px) because the
> inward profile showed alpha still ~97 avg 480px in from the right and a uniform
> 85–94 across the whole bottom — the wisp was cropped through its **middle**, not
> near its edge. The sources are gone (see below), so that content dissolves
> rather than being recovered. On a 0.12-opacity haze band a soft-bottomed fade is
> the right look anyway.
>
> ### 2. Letters ghosted through "solid" clouds
>
> 15–25% of each front asset sat in the alpha 120–190 shoulder — exactly where a
> bright letter reads through a cloud meant to occlude it. `solidifyAlpha()`
> (`a' = 255·clamp((a−40)/110)^0.85`) maps ≥150 to fully opaque and compresses the
> shoulder, keeping a soft rim. Layer opacity then goes to a flat 1 so the baked
> alpha alone decides what shows.
>
> | asset | % alpha > 230 before → after |
> |---|---|
> | `cloud-front-left` | 14.5% → 37.4% |
> | `cloud-front-right` | 15.4% → 38.1% |
> | `cloud-traveller` | 24.7% → 41.5% |
> | `cloud-puff-accent` | 6.8% → 39.9% |
>
> Deliberately **not** solidified: `back-soft` and `haze-band` stay soft
> atmosphere. Component opacities: `front-left`/`front-right`/`puff-accent`
> 0.9/0.9/0.55 → **1**; `traveller` 0.34/0.4 → **0.85/0.9** (held under 1 because
> it crosses the middle of the word, not the baseline); hazes unchanged at
> 0.1/0.12.
>
> ### 3. Tone — the stock clouds were flat white
>
> Mean RGB where alpha > 200: the G4 front clouds paint **166,171,185** and
> `back-soft` **116,119,128**, but both stock clouds were **255,255,255**.
> Invisible at 0.55/0.12 opacity; a white blob at 1. `puff-accent` is retoned to
> 166,171,185 and `haze-band` to 116,119,128 (it was painting ~2.2× brighter than
> its same-tier sibling at identical opacity).
>
> ### 4. Marquee seam
>
> Both hazes tiled at `cloudWidthVw === periodVw`, i.e. edge-to-edge. Once the
> edges feather to 0 that seam becomes a thinning band sweeping through, so the
> copies now overlap: `back` 54/64vw, `haze-band` 62/76vw, with `dur` scaled
> (110→93, 130→106) to hold the previous drift speed. Two copies still cover the
> track at every offset — the excess width means a gap can never open, so no third
> copy is needed.
>
> ### 5. The masters are now committed
>
> `g4-clouds-master.png`, `cloude-1.jpg` and `cloude-2.jpg` were scratchpad-only
> by design and **have been lost**. The shipped WebPs are the only surviving
> source, so they are committed to `assets/hero-cloud-masters/` (outside `public/`,
> deliberately NOT gitignored — the "raw sources stay out of git" rule stated
> below is exactly how the originals were lost). `repair-hero-clouds.mjs` reads
> that folder and writes `public/generated/hero-v4/`, so it is idempotent and
> re-runnable. See `assets/hero-cloud-masters/README.md`.

> ## hero-v4 addendum — two stock clouds (2026-07-30)
>
> Two user-supplied stock images (`cloude-1.jpg`, wide wispy haze/smoke ~3.5:1;
> `cloude-2.jpg`, one well-defined puffy cumulus ~1.6:1) added as two more
> depth layers in the SAME hero-v4 system — no version bump, same palette,
> same master timeline. Both were JPEGs (no alpha) whose "transparent"
> background was baked in as a checkerboard-over-composite; recovered via
> `recoverCheckerAlpha()` in `scripts/process-hero-clouds.mjs` (wide pre-blur
> to flatten the checker's high-frequency contrast, a background-band
> percentile cutoff, a median filter to kill sparse JPEG speckle a percentile
> alone can't catch, then `trim()`). Outputs live alongside the four G4
> assets in `public/generated/hero-v4/`: `cloud-haze-band.webp` (1800px wide)
> and `cloud-puff-accent.webp` (900px wide). Raw source JPEGs and the
> recovery script's throwaway draft were not committed (same rule as every
> earlier G1–G4 master: raw generation/source material stays out of git).
>
> **Superseded on two points by the repair above:** the closing `trim()` is what
> produced the drifting rectangle and is now followed by a transparent `extend()`
> + `featherAlpha()` + a zero-border assertion; and the "raw source stays out of
> git" rule cost us these masters permanently, so `assets/hero-cloud-masters/` is
> committed.
>
> Layers (`components/hero/HeroIntroSequence.tsx`, desktop only — same rule
> as `front-right`, mobile stays limited to one front cloud + traveller):
> - `haze-band` (**z-2**, back tier, with `back`) — second Marquee, left 8%/w
>   76%/top 42%/h 10vh, opacity 0.12, drifts opposite `back` (reverse, 106s).
>   Parallax −7vh (rise→0.96), matching `back`'s "slowest" role.
> - `puff-accent` (**z-4**, front tier, with `front-left`/`front-right`) — a
>   third distinct silhouette, driven by its own offscreen `data-traverse`
>   pass (17vw wide, 85s, phase 0.7) rather than a marquee, at top 49% (a
>   touch higher than the other front clouds) for variety. Parallax −41vh
>   (rise→0.9), opacity crossfade grouped with fl/fr (→0.08 remnant, [0.6,0.84]).

> ## hero-v4 (CURRENT) — natural clouds + labelled master timeline
>
> hero-v3 (below) fixed the plate/pedestal problem with true-alpha wisps, but the
> wisps were sliced from a **cirrus** master and read as smoke / torn fog, and
> `cloud-wisp-moving` shipped with an **empty alpha channel** (invisible). hero-v4
> replaces the sources with a fresh Higgsfield sheet of **four separated rounded
> low-profile cumulus clouds** on pure black (see HIGGSFIELD-GENERATION-LOG.md
> "G4"), and rebuilds the intro as one **named-label master timeline**.
>
> ### Assets — `public/generated/hero-v4/` (alpha-clean, `alphaCloud()` in `scripts/process-hero-clouds.mjs`)
> All verified: 4-channel, alpha min 0, ~29–33% non-transparent (traveller **32.9%**,
> no longer empty). front-left 700×580·45 KB, front-right 730×560·47 KB,
> traveller 560×458·30 KB, back-soft 2000×320·69 KB. Luminance→alpha, gentle curve
> (`linear ~1.5, -12`, blur ~0.8) to preserve soft cloud edges; RGB toned
> (brightness 0.66–0.9, saturation 0.5–0.6 → neutral, not blue, no blown whites).
> Composited normally over #020306 — no screen-blend, no radial masks.
>
> ### Clouds read IN FRONT, at the BASELINE, and NOT stretched
> Front clouds are **bright** (`modulate brightness 1.0`, shadow underside kept via
> the gentle alpha curve — that shadow is what registers over the white letters) so
> they clearly pass in front. They are cropped **low-profile (~2:1)** from the g4
> master and rendered at **natural aspect** (`Marquee` imgs are `width:{n}vw;
> height:auto` — no `h-full`), so they never distort. They sit at the letter
> **baseline** (`top ~53–55%`) crossing only the lower band of the letters, so the
> text above the cloud line stays crisp (no "mixing" through the letter middles).
>
> ### Live layers (`HeroIntroSequence.tsx`)
> | z | Layer | Asset (low-profile) | Opening placement (desktop) | Opacity |
> |---|---|---|---|---|
> | 0 | back haze | cloud-back-soft (natural, no fit:fill) | left 18% w 64%, top 52% | 0.12 |
> | 1 | title | Bebas Neue ~72vw | centred, −1vh | 1 |
> | 3 | front-left | cloud-front-left (720×360) | left −14vw w 52vw, **top 53%** | 0.66 |
> | 3 | front-right | cloud-front-right (740×360, distinct) | left 62vw w 52vw, **top 54.5%** | 0.62 |
> | 4 | traveller | cloud-traveller (620×329) | full width, **top 54%**, w 12vw | 0.40 |
>
> The hero sticky **stage background is transparent** (body bg is the same #020306)
> so the fixed background **signal route** (`components/signal/SignalField.tsx`, see
> `docs/SIGNAL-PATH.md`) shows through the hero's dark negative space.
>
> Drift: seamless two-copy marquees for back/front clouds (no yoyo/snap), one
> offscreen traversal for the traveller — durations 110 / 78 / 90 / 72 s.
>
> ### Smooth parallax timeline (one continuous pass, `ease: 'none'`, scrub 1.05)
> The staged "master-label / title clear-out" version was replaced: it snapped the
> title (a 0.08-duration −26vh jump) and read as staged, not smooth. Now every
> position tween runs `ease:'none'` over a **long, overlapping** window so the hero
> is one scroll-linked camera rise through the cloud layer into the statement — no
> snaps. **Parallax = per-layer travel distance** (all start at 0.12):
> traveller −48vh (closest, fastest) · front clouds −40/−42vh · title −30vh
> scale→1.06 (medium) · back haze −8vh (slowest, lingers). Opacity crossfades
> gently, always after the layer starts moving: traveller fades [0.34→0.56];
> **title fades gradually [0.44→0.76]** as it rises (no snap); front clouds →0.08
> upper remnants [0.6→0.84]; back haze →0.4 then dissolves last [0.7→0.92].
> Statement rises `y 42vh→0` [0.44→0.86] with two staggered line clip-reveals
> [0.58/0.62→~0.78] and support copy [0.7→0.86]; #0089FF transition light
> 0→0.10 [0.5→0.7]. Navbar reveals ~**0.66** (Navbar subscribes to `heroProgress`,
> hysteresis 0.66/0.58). 0.86→1.0: a barely-there upward drift so the lower edge is
> ready for the showreel. Reverse scroll restores the opening cleanly.
>
> ### Title / statement crossover
> Title rises and fades **gradually** across the whole scroll; the statement
> crossfades in from below as the title thins — a continuous parallax handoff, not
> a staged swap. #0089FF appears only as the faint title-base light, the ≤0.10
> transition illumination, `BRANDS.`, and navbar hover/focus/CTA.
>
> ### Mobile / reduced motion
> Mobile: back haze + ONE front cloud (left, widened) + traveller; no right cloud,
> reduced parallax, no clipping. Reduced motion: static composition, statement as
> a normal block below, navbar via threshold.
>
> ---
>
> ## hero-v3 (superseded — rollback only) — restrained transparent wisps
>
> The hero-v2 system below used opaque cloud crops + `mix-blend-mode: screen` +
> radial masks. Even black-crushed, those read as pasted cloud **plates** with
> soft-oval pedestals sitting beside the word. **hero-v3 replaces them entirely**
> with true-alpha wisps and a thin-ribbon composition. The v2 section is kept
> below for history; its assets remain on disk for rollback but are **not**
> referenced by the live hero.
>
> ### Target (v3)
> Monumental CINEHEIGHT on near-black, **~80–85% clean negative space**. A faint
> wide background ribbon behind the word, two ASYMMETRIC front wisps crossing the
> lower C-I-N and G-H-T, one small travelling centre wisp. Clouds cover ~8–15% of
> the word. No plates, no ovals, no rectangles, no straight edges, no cloud wall.
>
> ### Assets — `public/generated/hero-v3/` (alpha-clean WebP)
> Built from the **G2 wisp master** (already sparse thin wisps on near-black) via
> `scripts/process-hero-clouds.mjs` → `alphaWisp()`. Zero Higgsfield credits.
>
> | Asset | Dims | Size | Role |
> |---|---|---|---|
> | `cloud-ribbon-back.webp` | 2000×360 | 61 KB | faint wide background ribbon (stretched thin, toned dark) |
> | `cloud-wisp-left.webp` | 760×389 | 36 KB | front-left wisp (over C-I-N) |
> | `cloud-wisp-right.webp` | 800×436 | 46 KB | front-right wisp (over G-H-T), **flopped** for asymmetry |
> | `cloud-wisp-moving.webp` | 440×300 | 1 KB | small travelling centre wisp |
>
> ### Alpha extraction (the key fix)
> Each asset's alpha is derived from the source **luminance**, so black / dark-navy
> background → 0 alpha and cloud → opaque. Per asset: resize → `removeAlpha` →
> build alpha = `greyscale().linear(aSlope, aLift).blur(aBlur)` (maps the dark
> pedestal to zero, feathers edges) → tone RGB with `modulate({brightness<1,
> saturation~0.45})` (no blown whites, blue cast neutralised) → `joinChannel(alpha)`
> → transparent WebP. Every crop keeps black margin so alpha reaches 0 before the
> edge → **no straight edges, no rectangle**. Transparency lives in the asset;
> **no `mix-blend-mode: screen`, no radial CSS masks** are used.
>
> ### Layers (`HeroIntroSequence.tsx`)
> | z | Layer | Element | Placement (desktop) | Opacity |
> |---|---|---|---|---|
> | 0 | ribbon | `[data-layer="ribbon"]` | full width, top 50%, h 13vh | 0.15 (0.13 mobile) |
> | 1 | title | `[data-layer="title"]` | Bebas Neue, ~72vw word | 1 |
> | 3 | front-left wisp | `[data-layer="wisp-left"]` | left −16vw, w 58vw, top 46%, h 13vh | asset alpha |
> | 3 | front-right wisp | `[data-layer="wisp-right"]` (desktop only) | left 58vw, w 58vw, top 50%, h 14vh (asymmetric) | asset alpha |
> | 4 | moving wisp | `[data-layer="wisp-moving"]` | full width, top 41%, w 12vw | 0.28 (0.24 mobile) |
> | 2 / 5 | transition light / statement | — | as before |
>
> ### Live drift (`Marquee`, no yoyo/alternate)
> Ribbon + both front wisps are **seamless two-copy marquees**: a track of width
> `periodVw` holds copy-2 one period away, and `xPercent` 0→±100 (= one period)
> lands copy-2 where copy-1 was — continuous, NO reversal, NO snap. The moving
> wisp is a single **offscreen traversal** (−30vw→130vw). Durations: ribbon 98 s
> (R→L), left wisp 86 s, right wisp 78 s (opposite dir via `reverse`), moving
> 66 s. Drift pauses via IntersectionObserver + `visibilitychange`. Scroll
> parallax animates the OUTER wrapper (x/y/scale) while the marquee animates the
> INNER track (xPercent) — separate elements, no transform collision.
>
> ### Parallax (v3, reduced distances) — `scrub: 1.25`, shared 0.15→1 window
> ribbon y −6vh scale 1.01 · front wisps y −17vh (mobile −12) x ±3vw scale 1.03 ·
> moving y −25vh (mobile −18) scale 1.04 · title y −12vh (mobile −9) scale ≤1.05.
> Opacity after movement: title fades from 58%, moving wisp from 60%, front wisps
> settle to 0.1 residual at 72%, ribbon stays visible longest (autoAlpha 0.4 at
> 66%) then dissolves — the statement enters at 55% while wisps are still up.
>
> ### Mobile / reduced motion
> Mobile: ribbon + ONE front wisp (left, widened) + moving wisp; no right wisp, no
> video, no clipping. Reduced motion: static composition (ribbon + wisps rendered,
> no drift, no pin), statement as a normal block below.
>
> ### Colour / brightness
> Highlights land ~#E8EDF2–#F5F7FA (brightness modulate 0.72–0.9, no pure-white
> areas), saturation ~0.4–0.45 (neutral grey, no blue cloud wash). #0089FF only in
> the base title-light (~0.04), the transition illumination (≤0.10), navbar
> hover/focus/CTA and `BRANDS.`.
>
> ---
>
> ## hero-v2 (superseded — rollback only)

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
| L4 groups (z-3, **in front** of title) | `[data-layer="group-left/right"]` | `cloud-group-left.webp` (19 KB) / `cloud-group-right.webp` (17 KB) — crest-only slices of the G1 master, **black-crushed** (see below) | left: `calc(50% − min(48vw, 900px))`, right symmetric — anchors to the **wordmark edge** at every width (word half-width caps ~860px, so on ultrawide they stay on the C/T instead of drifting into the margin); top 40%, w min(31vw, 460px) / min(33vw, 500px); `aspect-ratio` boxes so mask == image |
| L5 wisps (z-4) | `[data-drift="wisp-1..3"]` | `cloud-wisp-accent.webp`, `wisp-mid-2.webp`, `wisp-mid-1.webp` (9–11 KB, black-crushed) | tops 43% / 54% / 37%, widths min(13vw, 240px) / min(9vw, 175px) / min(7vw, 135px), opacities 0.34 / 0.26 / 0.20 |
| Transition light | `[data-layer="transition-light"]` | — | #0089FF radial, opacity 0 → 0.10 (55–72%) → 0.05 |
| Statement | `[data-layer="statement"]` | — | absolute inset-0, enters via the same timeline |

Assets no longer in the live composition (kept on disk):
`cloud-middle-desktop.webp`, `cloud-front-left.webp`, `cloud-front-right.webp`.

## Compositing — black-crush + masks

Cloud plates are `mix-blend-mode: screen` over the near-black stage, so pure-black
pixels vanish and only the cloud shows. The G1/G2 crops carried a faint dark-navy
pedestal, which screen-blend lightened into a visible **rectangular sprite box**.
Fix (`scripts/process-hero-clouds.mjs`): every group/wisp slice is run through a
`linear()` curve that maps the pedestal to pure black before export — groups
`linear(1.4, -26)`, wisps `linear(1.28, -16)`. The box is gone at the source; the
radial masks then only soften the cloud's own edges.

One mask-image per element (Chromium composites multiple masks with `add`,
re-hardening edges): `.mask-group-left` (dense far-left, fades centre/top/bottom),
`.mask-group-right` (mirrored), `.mask-center-soft` (wisps, mobile group),
`.mask-haze` (tight, opacity 0.085 desktop — a near-invisible base glow, not a
central cloud bridge). All single radial gradients. Poster == video first frame
(both from the G1 master), so no start flash.

## Z-order (in-front reading)

`haze z-0` (behind title) → `title z-1` → `transition-light z-2` →
`groups z-3` → `wisps z-4` → `statement z-5`. Groups and wisps sit **above** the
title so they pass in front of the outer letters (C-I-N / G-H-T), giving the
"clouds crossing the wordmark" reading rather than a backdrop.

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
