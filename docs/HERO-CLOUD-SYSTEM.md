# HERO-CLOUD-SYSTEM — cineheight-single-flow-v2

Approved reference: monumental condensed CINEHEIGHT on near-black, white cloud
banks crossing the lower letters from the left and right, sparse wisps in front,
generous black negative space. Title is **live HTML** (Bebas Neue 400) — never
baked into media.

## Layer stack (back → front)

| # | Layer | Element | Asset | Motion |
|---|---|---|---|---|
| 0 | Base | stage div | `--bg-950` + faint navy radial | none |
| 1 | Back deck | `[data-cloud="back"]` — band container (top 26%, height 62%) with `.cloud-feather-band` vertical mask | `cloud-back-desktop.mp4` (1920×1080 · 10 s · 376 KB, screen-blended). Mobile/reduced: posters | video's own drift; scroll y → −14vh, fade → 0.22 |
| 2 | Middle haze | `[data-cloud="middle"]` (top 40%, h 34%, opacity 0.38) | `cloud-middle-desktop.webp` (20 KB) | CSS drift 72 s alternate; scroll y → −24vh, fade → 0.1 |
| 3 | **Title** | `[data-hero="title"]` — one semantic `<h1>`, sr-only expansion "Cineheight Media — Branding and Digital Growth Agency" | Bebas Neue 400 · clamp(64px, 18.6vw, 21.5rem) · lh 0.8 · gradient #F5F7FA→#B8BFC9 | scroll y → −46vh, scale ≤1.10, fades 68–92% |
| 4 | Front-left bank | `[data-cloud="front-left"]` (left −10%, top 44%) | `cloud-front-left.webp` (27 KB) | drift 38 s; scroll y → −46vh, fades 38–62% |
| 5 | Wisp accent | `[data-cloud="wisp"]` (left 16%, top 32%, opacity 0.55 — crosses C-I-N) | `cloud-wisp-accent.webp` (8 KB) | drift 30 s (fastest); scroll y → −58vh |
| 6 | Front-right bank | `[data-cloud="front-right"]` (right −11%, top 47%) | `cloud-front-right.webp` (27 KB) | drift 46 s, opposite direction; scroll y → −52vh |

**Compositing:** every plate/video is `mix-blend-mode: screen` over the near-black
stage — black media pixels vanish, white clouds remain. Since crops contain
mid-gray, every layer also carries a feather mask (`.cloud-feather-band` vertical
gradient for the deck, `.cloud-feather-box` radial for plates). NOTE: never stack
two mask-images on one element — Chromium composites them with `add` (union),
which re-hardens the edges (this bug was hit and fixed in browser testing).

## Idle motion (§11)

Back = video's internal drift (~10 s loop, seam diff 0.39/255). Middle/front =
`cloud-drift` CSS keyframes (translate3d, alternate) at 72 s / 46 s / 38 s / 30 s
with alternating directions. Paused automatically under reduced motion
(CSS media query) and when the tab is hidden / hero offscreen (IntersectionObserver
+ visibilitychange pause the video; CSS animations are compositor-managed).

## Scroll choreography (§12)

One GSAP timeline, `scrub: 0.6`, trigger = hero section (210vh desktop / 160vh
mobile), sticky 100vh stage. Progress → `lib/heroProgress.ts` store.

| Progress | What happens |
|---|---|
| 0–15% | Hold — idle drift only |
| 15–38% | Depth separation: front banks/wisp rise fastest, middle medium, deck least; title lifts −8vh, scale 1.04 |
| 38–62% | Front layers fade **while** crossing the letters (veil, not whiteout); title −18vh scale 1.08 |
| 50–70% | Middle haze fades to 0.1; deck thins to 0.22 and rises −14vh |
| 62% | Navbar reveals (hysteresis: shows >0.62, hides <0.55) |
| 68–92% | Title departs: −46vh, scale 1.10 (spec cap 1.15), fades to 0 |
| 72%+ | Brand statement (`.brand-overlap`, margin-top −72vh, z-10) rises over the pinned stage's dark lower half — no visible section cut |

Reverse scrolling reverses everything (scrubbed timeline; verified in browser).

## Tiers

- **Desktop fine-pointer:** full stack as above.
- **Mobile / coarse pointer:** 160vh range, reduced travel distances, **no video**
  (9:16 poster crop `hero-cloud-mobile-poster.webp`, 18 KB), same plate drift.
- **Reduced motion:** 100vh static composition, no pin, no drift, no video, no
  timeline; navbar appears once past the fold via a passive progress tracker;
  brand statement margin reset to 0.

## Assets & weights

All in `public/generated/hero-v2/` — see HIGGSFIELD-GENERATION-LOG.md for
provenance. Essential desktop payload: video 376 KB + plates 82 KB ≈ **458 KB**
(target was ≤2 MB/layer). Mobile: 26 KB images total, no video. Posters extracted
locally (sharp) — zero credits. Regeneration sources kept in session scratchpad
only; masters are reproducible from the logged prompts.

## Cleanup

`gsap.context` + revert on unmount; IntersectionObserver and visibilitychange
listeners removed; no per-frame React state (progress store is subscription-based;
Navbar re-renders only on visibility flips).
