# HIGGSFIELD-GENERATION-LOG — cineheight-single-flow-v2

Account balance at session start: **492.52 credits** (pro plan).
Hard cap for this project: **420 credits**. Reserve: **≥70 credits**.

Policy honoured before every generation (spec §7):
1. Asset + purpose stated. 2. Why generation is needed. 3. Existing-media/CSS/SVG
alternative ruled out (see EXISTING-CONTENT-MAP.md §13 — all legacy cloud assets
rejected: storm-navy tones / smoke wisps / planet-horizon deck, none match the
approved white-cumulus-on-black reference). 4. Least expensive suitable method.
5. One primary version; a second only if technically unusable.

No credits are ever spent on: icons, UI, service images, client work, posters
(extracted locally with ffmpeg/sharp), gradients, textures.

---

## Planned generations (hero-v2 cloud system only)

| # | Asset | Method | Why generation is required | Priority |
|---|---|---|---|---|
| G1 | Master cloud plate — white cumulus banks (left + right) on pure black, 16:9, 2K still | `nano_banana_2` text-to-image | Photoreal white clouds cannot be produced with CSS/SVG at this fidelity; no usable existing media (all rejected, see above). One still triples as: video anchor frame, hero poster source, middle-layer slice. | A/C |
| G2 | Sparse foreground wisps on pure black, 16:9, 2K still | `nano_banana_2` text-to-image | Foreground layer needs different cloud shapes than G1 (otherwise duplicated silhouettes between layers). Sliced locally into front-left / front-right plates; animated with CSS drift + GSAP parallax — no video credits needed for this layer. | B |
| G3 | Background cloud deck video, 1920×1080, ~10 s, locked camera, extremely slow lateral drift | `cinematic_studio_3_0` image-to-video, `start_image` = `end_image` = G1 (the old project's proven seamless-loop anchor technique), audio off | Organic cloud evolution cannot be faked with transforms on a still without visible flatness on a 100vh hero. Single video, loop-anchored, re-encoded locally with ffmpeg (crf ~24) to ≤2 MB. | A |

Explicitly NOT generated: mobile variation (Priority D — desktop stills adapt via
posters/art direction; revisit only if browser testing proves otherwise), transition
remnant (E) and footer remnant (F) — decided after hero integration, reusing G1/G2
slices if possible. Posters extracted locally (zero credits).

## Generation record

### G1 — Master cloud plate — ACCEPTED (attempt 1 of 1)
- **Job:** `ac69c958-6dca-432d-9838-79df26411260` · model routed to `nano_banana_flash` (nano_banana_2 request) · 2752×1536 (2K, 16:9) · **2 credits** · 2026-07-20 19:04 UTC
- **Prompt:** "Calm high-altitude white cloud formations on a pure black night sky, photorealistic soft cumulus clouds in bright white and light gray with restrained cool blue-gray shadows, one moderate horizontal cloud band stretching across the middle and lower-middle of the frame, a denser billowing cloud mass entering from the left edge and a second denser cloud mass entering from the right edge, thin soft cloud haze between them near the centre, generous pure black negative space across the upper third and bottom of the frame, premium minimal branding atmosphere, elegant and calm, no storm, no lightning, no rain, no sunset, no sun, no moon, no stars, no mountains, no horizon line, no ground, no birds, no people, no text, no logos, no watermark"
- **Result:** matches approved reference arrangement (left/right white banks, thin centre haze, black above). No text/logos. Accepted first try.
- **Local derivatives (sharp, zero credits):** `hero-cloud-desktop-poster.webp` (1920×1080, 34 KB), `hero-cloud-mobile-poster.webp` (1080×1920, 18 KB), `cloud-middle-desktop.webp` (1600×656, 20 KB), `cloud-front-left.webp` (1150×920, 27 KB), `cloud-front-right.webp` (1150×903, 27 KB) — script: `scripts/process-hero-clouds.mjs`.

### G2 — Sparse foreground wisps — ACCEPTED (attempt 1 of 1)
- **Job:** `28b9dd95-2470-4911-b35a-b610c94912f0` · same model/route · 2752×1536 (2K, 16:9) · **2 credits** · 2026-07-20 19:04 UTC
- **Prompt:** "Sparse small white cloud wisps scattered across a pure black background, a few soft realistic cloud fragments and thin drifting wisps with delicate feathered edges, mostly empty pure black canvas, photorealistic bright white clouds with subtle cool light-gray shading, wisps loosely concentrated in the lower half of the frame with one small wisp in the upper left area, no large cloud mass, no storm, no lightning, no fog wash, no haze filling the frame, no text, no logos, no watermark, premium minimal branding atmosphere"
- **Result:** exactly the sparse realistic wisps needed. Accepted first try.
- **Local derivative:** `cloud-wisp-accent.webp` (760×380, 8 KB).

### G3 — Background cloud deck video — ACCEPTED (attempt 1 of 1)
- **Job:** `4787ef90-e331-48e8-b89c-4925ca33055b` · `kling3_0` (std) image-to-video, `start_image` = `end_image` = G1 · 1284×716 · 10.04 s · 24 fps · **20 credits** · 2026-07-20 19:05 UTC
- **Prompt:** "Locked static camera, no camera movement at all. Calm white cumulus clouds drifting extremely slowly and laterally to the right across a pure black night sky, gentle soft internal cloud evolution, billows softly changing shape, restrained cool blue-gray shadows, clouds remain in a horizontal band across the middle of the frame, upper third stays pure black empty sky, premium minimal branding atmosphere, elegant and calm, seamless loop, the final frame matches the first frame exactly, no storm, no lightning, no rain, no sunset, no birds, no text, no logos, no camera rush, no zoom, no pan"
- **Loop seam check:** first-vs-last frame mean abs pixel diff **0.39/255** — seamless (old project accepted 1.2/255).
- **Optimisation (ffmpeg-static, zero credits):** stripped AAC audio, lanczos upscale 1284×716 → 1936×1080, centre-crop 1920×1080, libx264 crf 23 preset slow, yuv420p, faststart → **`cloud-back-desktop.mp4`, 376 KB** (≤2 MB target). 720p→1080p upscale chosen deliberately over pro-mode regeneration or paid `upscale_video`: soft low-frequency cloud footage upscales transparently, and §7 mandates the least expensive suitable method.

## Totals

| | |
|---|---|
| Credits spent (this project) | **24** (2 + 2 + 20) |
| Balance at session start | 492.52 |
| Balance after generation | **468.52** |
| Budget cap / remaining headroom | 420 cap → 396 unused |
| Attempts / rejections | 3 generations, 0 rejected, 0 retries |

Priorities D (mobile video), E (transition remnant), F (footer remnant): **not generated** —
posters + slices cover mobile; remnant decisions deferred to post-hero phases per plan.
