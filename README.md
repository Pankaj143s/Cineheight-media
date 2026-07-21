# CINEHEIGHT.media — single-flow v2

Fresh, standalone rebuild of the CINEHEIGHT.media website. The original project
(`../cineheight_design_2/`) is the read-only source of truth for all content and
client media; nothing in it is ever modified.

## Run

```bash
npm install
npm run dev        # http://localhost:3100
```

`npm run build` / `npm run start` for production. `npx tsc --noEmit` and
`npm run lint` must stay clean.

## Status

**Phase 2 complete (hero system + cloud-balance correction):** project scaffold,
locked design tokens (§5), fonts (Bebas Neue / Satoshi / Poppins, self-hosted),
content audit + media manifest, Higgsfield hero cloud generation (24 credits).
The hero is now one **unified pinned intro** (`components/hero/HeroIntroSequence.tsx`):
restrained left/right cloud groups + moving wisps over ~70–80% negative space,
continuous linear GSAP drift, one-progress depth parallax, and the brand
statement + navbar reveal folded into the same timeline (the old `HeroSection`,
`BrandStatement` and `.brand-overlap` margin hack are gone). Browser-tested at
7 viewports (390→2560 wide) incl. reduced-motion; no console errors, no overflow.

**Showreel section (done):** `components/showreel/ShowreelSection.tsx` plays the
real 32 s film (`public/media/showreel/showreel.mp4`, copied from the old
project) with a real extracted poster, poster-first playback, scrub expansion
(no pin) in continuous flow after the hero, restrained pointer depth, accessible
controls. See `docs/SHOWREEL-SYSTEM.md`.

Remaining phases (trusted logos, featured work, reels, posts, services, process,
about, testimonials, contact, footer, signal path, case-study detail pages, QA)
are **not started yet** — section slot marked in `app/page.tsx`.

## Key docs

- `docs/EXISTING-CONTENT-MAP.md` — full audit of the original project's usable content
- `docs/HIGGSFIELD-GENERATION-LOG.md` — every generation, prompt, credit, decision
- `docs/HERO-CLOUD-SYSTEM.md` — hero layer/compositing/choreography architecture
- `content/mediaManifest.ts` — every media item (real vs placeholder) with paths/ratios

## Structure

```
app/            layout (fonts/tokens), page (section order), globals.css (tokens, cloud masks)
components/     Navbar, hero/HeroIntroSequence (title + clouds + statement + navbar state)
content/        mediaManifest.ts (caseStudies.ts arrives in Phase 4)
lib/            gsap setup, heroProgress store, media-preference hooks
public/         copied real client media + generated/hero-v2 atmosphere
scripts/        process-hero-clouds.mjs (master → layer slices, local only)
```
