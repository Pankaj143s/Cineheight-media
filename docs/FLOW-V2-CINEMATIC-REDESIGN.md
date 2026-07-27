# Flow V2 — Cinematic Continuous-Flow Redesign

Implementation map for the redesign of everything **after the approved showreel**, plus the
four secondary routes. Branch: `redesign/cinematic-flow` (checkpoint `d8218f4`; `master` is the
clean fallback).

---

## 1. The problem this reverses

The first Flow V2 build produced a *stack of website sections*. Every module repeated the same
five moves:

1. `<section className="relative pb-[12vh]">` (or `pb-[16vh]`)
2. `<div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">`
3. `<Reveal variant="fade-up">` wrapping an eyebrow label in `letterSpacing: 0.32em`
4. an `<h2>` at `clamp(1.8rem, 3.4vw, 3.2rem)`
5. an isolated grid / card row / strip below it

Result: twelve visually disconnected rectangles with identical introductions, hard vertical
gaps between them, and no visual relationship between adjacent content. `border-t` rules on
`/work`, `/services` and the case-study approach list made the boundaries literal.

**The redesign is not "less padding".** It changes composition and choreography: content
transforms into the next content, the background crosses every boundary, and one signal thread
runs the height of each route.

---

## 2. What is locked

| Locked | Why |
|---|---|
| `components/hero/HeroIntroSequence.tsx` | Approved hero, cloud system, title animation |
| `lib/heroProgress.ts` | Hero → navbar reveal contract |
| `public/generated/hero-v4/*` | Approved cloud assets |
| `components/showreel/ShowreelSection.tsx` | Approved full-bleed showreel + playback/controls |
| Navbar reveal timing (`subscribeHeroProgress`, 0.58/0.66 hysteresis) | Synchronised to the hero |
| All verified copy, metrics, client names, media paths in `content/*` | Content audit is the source of truth |

The redesign begins at the first pixel **after** the showreel. The showreel→clients handoff may
be improved; the showreel itself is untouched.

---

## 3. Component map

### New — `components/flow/` (global continuous system)

| File | Responsibility |
|---|---|
| `SmoothScrollProvider.tsx` | The single Lenis instance, driven by `gsap.ticker`, updating `ScrollTrigger`. Mounted once in `app/layout.tsx`. Disabled under reduced motion. |
| `FlowDirector.tsx` | Per-route orchestrator. Collects `[data-flow-anchor]` elements after fonts + layout settle, publishes them via context, owns the single `ScrollTrigger.refresh()` scheduler and the shared scroll-progress signal. |
| `FlowThread.tsx` | The blue signal. A **document-height** SVG whose path is *generated* from the route's anchors as clamped cubic Béziers. Grows on scroll down, retracts on scroll up. Leading light point in pixel space. |
| `AtmosphereLayer.tsx` | One route-level background — radial light, dark-blue gradients, optional local client accent, grain. Crosses every content boundary; scenes never carry their own opaque background. |
| `PointerAtmosphere.tsx` | Desktop-only Canvas 2D cursor light + drifting signal particles. Off for coarse pointers, reduced motion and low-power devices. |
| `RouteTransition.tsx` | Short blue sweep + clip reveal, mounted from `app/template.tsx`. |

`components/signal/SignalField.tsx` is **removed** — it was a fixed viewport SVG with a
hardcoded path stretched over a `0 0 100 100` viewBox, which cannot span a route.

### New — `components/motion/` (typography system)

`SplitLineReveal` · `WordMaskReveal` · `TrackingReveal` · `ScrollHeadline` · `KineticLabel`

Shared contract for every one of them:

- The **real, unsplit string stays in the DOM** as `sr-only`; animated spans are `aria-hidden`.
- Reduced motion renders the completed state immediately — never a hidden element with a
  zero-duration animation.
- Used on **headings only**. Body copy keeps the calm `components/ui/Reveal.tsx` entrance.

### New — `components/media/`

| File | Restores |
|---|---|
| `PhoneReelShell.tsx` | Old `PhoneReel` — Instagram-style phone frame, chrome, deterministic counts |
| `PhoneReelExperience.tsx` | Old `ReelsCoverflow` — 3D phone coverflow, rebuilt on ref-based physics |
| `CreativeOrbit.tsx` | Old `PostsRing` — 3D circular post installation |
| `CreativeLightbox.tsx` | Old `MediaModal` — expanded view with flip entry |

### Deleted

`components/home/TrustedClients.tsx`, `FeaturedWork.tsx`, `ReelsExperience.tsx`,
`PostsGallery.tsx`, `ServicesGrid.tsx`, `ProcessFlow.tsx`, `AboutSection.tsx`,
`Testimonials.tsx`, `ContactCTA.tsx`, `components/signal/SignalField.tsx`.

---

## 4. Homepage choreography

One composition. Each scene is a semantic `<section>` for AT and SEO, but none of them has an
eyebrow-block introduction, a repeated max-width container, or a hard gap before the next.

| # | Scene | How it enters from the previous | How it leaves into the next |
|---|---|---|---|
| 1 | `ClientTrustBridge` | The showreel's bottom feather keeps going — same dark field, no boundary | Logos thin out as the first project label rises through them |
| 2 | `FeaturedWorkJourney` | Project 1's media grows out of the logo field | Final media frame contracts toward the centre |
| 3 | `PhoneReelExperience` | The contracting frame's vertical edges become phone silhouettes | Phones recede and rotate away |
| 4 | `CreativeOrbit` | Statics assemble in the space the phones vacated | Orbit tilts back, first service numeral rises through it |
| 5 | `ServicesJourney` | Six chapters, each transitioning into the next with no divider | Last artwork dissolves as the thread brightens |
| 6 | `ProcessJourney` | The thread arrives at `DISCOVER` | The final word settles behind the manifesto type |
| 7 | `VoicesScene` | Manifesto type; a media window opens *through* it and expands into the testimonial film | Film shrinks back into type |
| 8 | `ClosingScene` | Typographic takeover; thread completes at the CTA | Footer detail emerges below — no border, no boxed band |

Copy hierarchy (integrated into the composition, never as eight large section headers):
`SELECTED WORK` · `PROOF, NOT PROMISES.` · `SHORT-FORM STORYTELLING` ·
`BUILT TO STOP THE SCROLL.` · `CAMPAIGN SYSTEMS` · `NOT ISOLATED POSTS.` ·
`EVERYTHING A BRAND NEEDS TO RISE — UNDER ONE ROOF.` · `ONE TEAM. ONE CONTINUOUS JOURNEY.` ·
`IN THEIR OWN WORDS.` · `READY TO RISE ABOVE YOUR CATEGORY?` · `LET'S BUILD YOUR BRAND.`

---

## 5. Motion ownership — one job, one owner

| Technique | Owner | Never used for |
|---|---|---|
| Scroll-directed sequences, pins, scrubs | GSAP + ScrollTrigger | Simple entrances |
| Simple entrances | `Reveal` (IntersectionObserver + CSS transition) | Anything scroll-scrubbed |
| Continuous drag physics (coverflow, orbit) | `requestAnimationFrame` + refs | Anything React re-renders per frame |
| Spring/presence UI (lightbox) | Framer Motion | Scroll choreography |
| Smooth scroll | One Lenis instance at the root | Per-component smooth scroll |

**Hard rules**

- No `setState` inside an animation loop. Transforms are written straight to DOM nodes.
- Every component that starts a rAF loop stops it when offscreen (IntersectionObserver) and when
  `document.hidden`.
- Every `gsap.context()` is `revert()`ed, every observer `disconnect()`ed, every listener removed.
- Exactly **one** long pin on the homepage (`FeaturedWorkJourney`) and at most one short pin
  (`ProcessJourney`). Pins are disabled entirely on the mobile tier so scrolling is never trapped.

---

## 6. Media rules

### Square reels in portrait phones

Every real reel is **1080×1080**. The phone screen is 9:16. The client footage is **never
cropped**:

```
┌───────────┐  layer 1  same source, object-cover, scale 1.06, blur 28px, brightness .45
│░░blur░░░░░│  layer 2  sharp 1:1 media, object-contain, centred
├───────────┤  layer 3  Instagram chrome — overlays the FULL 9:16 screen
│  1080²    │
│  SHARP    │
├───────────┤
│░░blur░░░░░│
└───────────┘
```

Poster and video use identical geometry, so starting playback causes **zero layout shift**.

### Playback discipline

- Only the **active** phone mounts a `<video>`; every other phone shows its poster.
- `preload="none"`, `muted`, `playsInline`, `loop`. No autoplay audio anywhere.
- Pause when the installation leaves the viewport and on `visibilitychange`.
- User pause state is preserved across visibility and scroll changes.
- Placeholder reels (`isPlaceholder`) render a labelled frame with **no `<video>` element** —
  they never attempt playback.

### Honest gaps (never filled with generated or stock media)

| Client | Gap |
|---|---|
| Divija Old Age Home | 2 of 3 reels never supplied; **0 real posts** — no orbit renders on its case page |
| Sindhudurg Education Society | No testimonial was ever recorded — its `topVideo` is honestly badged "Campaign Film" |
| All clients | All reels are square-sourced; no 9:16 masters exist |

---

## 7. Accessibility

- Screen readers receive one clean string per heading; split spans are `aria-hidden`.
- No essential information is hover-only — touch and reduced-motion tiers show it directly.
- The native cursor is never hidden.
- All controls ≥ 44 px; visible focus everywhere (`:focus-visible` outline is already global).
- Coverflow and orbit: pointer, touch, arrow keys and Enter all work; `aria-live` announces the
  active item; lightboxes trap focus, close on Escape and restore focus.
- Reduced motion: no autoplay, no 3D, no pins, completed text immediately, a static thread.

---

## 8. Responsive tiers

| Tier | Behaviour |
|---|---|
| ≥ 1024 px, fine pointer | Full choreography, pins, pointer atmosphere, 3D depth |
| 768–1023 px | Full layout, pins retained, pointer effects off |
| ≤ 767 px or coarse pointer | No pins (never trap scroll), simplified side-peek coverflow, reduced orbit radius, blur off, natural vertical scroll — but still animated, never a plain list |
| `prefers-reduced-motion` | Static completed states, scroll-snap fallbacks, no rAF loops |

Verified widths: 1366×768 · 1440×900 · 1920×1080 · 2560×1440 · 768×1024 · 1024×1366 · 390×844 ·
430×932 · mobile landscape.

---

## 9. Verification gate

```
npx tsc --noEmit
npm run lint
npm run build
node --experimental-strip-types scripts/check-media-paths.mjs
```

Then every route in the browser: console clean, no 404 media, no simultaneous reel loading,
keyboard paths, reduced motion, no horizontal overflow
(`document.documentElement.scrollWidth <= clientWidth`), thread grows on scroll down and
retracts on scroll up, videos pause offscreen, hero and showreel unchanged, phone frames and
post orbit visibly restored, and full-page screenshots reviewed as whole vertical compositions.

### Verification status

**Passed** — `tsc --noEmit`, `next lint`, `next build` (all 14 routes, 3 case-study slugs
prerendered), `check-media-paths` (every path resolves), zero console errors on every route,
zero network 404s, **zero video requests on load** (`preload="none"` holding), zero horizontal
overflow at 1440×900 / 1425 / 390×844 on `/`, `/work`, all three `/work/[slug]`, `/services`,
`/about`, `/contact`, every heading exposing one clean string to assistive tech (no character
or word spam from the split reveals), no surviving `border-t` dividers, no per-scene opaque
backgrounds, no repeated `max-w-[1500px]` container outside the locked hero and the 404 page,
and no uniform `pb-[12vh]`/`pb-[16vh]` gaps anywhere.

**Blocked, pending a displayed browser** — every check that needs the page to composite frames.
`requestAnimationFrame` and `IntersectionObserver` do not fire while the Browser pane is hidden
(measured: 0 rAF callbacks over 300 scheduled frames, 0 IO callbacks), so the following could
not be exercised and no screenshot could be captured:

- signal thread growing on scroll down and retracting on scroll up
- coverflow and orbit drag/inertia/snap physics, and clicking a side card
- the active reel mounting its `<video>`, and videos pausing offscreen / on tab hide
- metric count-ups, GSAP scroll choreography, the pinned work and process sequences
- route transitions, reduced-motion runtime behaviour
- full-page desktop and mobile screenshots of the whole vertical composition

Re-run the browser section of this gate with the pane displayed before calling the redesign done.

### Known pre-existing behaviour (not introduced here)

The approved showreel's play/mute buttons are 44 px but sit inside a frame GSAP holds at
`scale: 0.78` until the section scrolls in, so they measure ~34 px at rest. They reach full size
as the section enters the viewport, which is when they become usable. `ShowreelSection.tsx` is
locked, so this was left untouched.

---

# Correction & clarity pass

The first redesign built the right systems but produced a ~22-screen homepage on
which a first-time visitor could not answer "what does this company sell?". This
pass keeps every system and fixes the communication.

## What changed on the homepage

| Before | After |
|---|---|
| 22 screens | **12.5 screens** (First Load JS 221 kB → **173 kB**) |
| No plain statement of the offering | `AgencyProposition` — one H2, one paragraph naming every discipline, two CTAs |
| 96vh scattered logo field, four marks at ~20px | `ClientMarquee` — ~30vh, two scroll-driven rows, optically normalised |
| Six full-screen service chapters | `HomeCapabilities` — three labelled pillars backed by real client films |
| 260vh pinned process | `ProcessCompact` — same idea, no pin, ~⅔ screen |
| Phone coverflow + post orbit on the front door | Moved to `/work/[slug]` only; components unchanged |
| Testimonial capped at 92vw/1500px | `ClientStories` — full width, orientation-aware |

Every scene now carries a readable label: `WHAT WE DO`, `BRANDS WE HAVE WORKED
WITH`, `SELECTED WORK`, `HOW WE HELP BRANDS GROW`, `HOW WE WORK`, `CLIENT STORIES`.

## Root causes fixed (not symptoms)

- **`CAMP` / `SYSTE` / `SHOR` fragments** — `KineticLabel` made every character
  its own `inline-block`, so the browser could break a line *between any two
  characters*. Characters are now grouped into per-word `nowrap` spans. The
  remaining fragments came from `max-w-[15ch]` caps on the installation headings
  plus a hard hyphen in "Short-form"; the caps are gone and the display copy uses
  a non-breaking hyphen (U+2011).
- **Logos inconsistent** — the four `trusted/*.png` were 67–81 % transparent
  padding. `scripts/trim-logos.mjs` writes trimmed copies; `logoBox()` then sizes
  every mark to a constant **ink area** (not a constant height) so a 4.5:1
  wordmark and a 1:1 roundel carry equal weight. Dark marks get a soft radial
  glow and a brightness lift instead of a plate — plates read as cards.
- **Signal tip lagging** — document-Y was mapped *linearly* onto arc length, which
  is wrong wherever the path curves sideways. The path is now sampled into a
  360-entry `{len,x,y}` table and binary-searched by Y. Measured: tip holds
  **0.62** of the viewport at every scroll position tested.
- **Client footage cropped** — square sources were forced into wide stages with
  `object-cover`. `OrientationMedia` now shows square/portrait sources complete
  (`object-contain`) over a blurred, darkened copy of themselves.
- **Route transition felt late** — it only reacted after `usePathname()` changed.
  A capture-phase document click listener now starts the sweep on the click and
  reveals the destination after `router.push`, while leaving external, `mailto:`,
  `tel:`, hash and modified clicks completely alone.
- **Reduced-motion headline stuck at 0.18 opacity** — `useReducedMotion()` is
  false on first render, so GSAP had already written the dim state before the
  hook flipped. `ScrollHeadline` now forces the completed state explicitly.
- **Showreel controls 34 px on touch** — GSAP holds the frame at `scale: 0.78`
  until it scrolls in. Hit area expanded with a `::before` inset; the visual is
  untouched. (Showreel design, timing and playback are otherwise unchanged.)

## Verification tooling

`scripts/shoot.mjs` drives a real headless Chrome over the DevTools Protocol
using Node's built-in `WebSocket` — no Playwright, no Puppeteer, no install. The
in-app browser pane does not composite unless displayed, so rAF and
IntersectionObserver never fire there and nothing scroll-driven could be checked.

- default — filmstrip of real viewport frames per route (fixed layers render correctly)
- `--measure` — responsive audit across many widths without writing frames
- `--probe` — interaction assertions
- `--focus=route::selector::name` — focused element shots
- `--reduced` — emulates `prefers-reduced-motion`

`scripts/sheet.mjs` composes filmstrips into one contact sheet so a 19,000 px page
can actually be looked at.

## Results

- **104 route × viewport combinations**, 320×568 → 3840×2160: zero horizontal
  overflow, zero clipped headings, zero console errors, zero failed requests,
  zero sub-44px touch targets, never more than **one video playing**.
- **14/14 interaction probes pass**: signal tracking and retraction, undrawn at
  top, both lightboxes open/close on Escape with body-scroll lock and
  `object-contain`, inline video pauses behind the modal, videos pause when the
  document hides, route transition navigates, `mailto:`/`tel:` untouched.
- TypeScript, ESLint and the production build are clean.
