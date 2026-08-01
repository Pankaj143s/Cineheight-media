# Cineheight Full UI/UX Audit

## Audit scope and method

This audit treats Cineheight as a motion-led digital experience. Recommendations preserve the cinematic system across desktop, tablet, and mobile; performance work is directed at loading, scheduling, media selection, and effect quality tiers rather than removing animation. Reduced-motion recommendations retain clear, elegant feedback with shorter travel, lower blur, and simpler transitions.

### Routes covered

- `/`
- `/work`
- `/work/sapale-yamaha`
- `/work/sindhudurg-education`
- `/work/divija-old-age-home`
- `/services`
- `/about`
- `/contact`
- Invalid route / 404
- `/api/contact` validation and provider behavior

### Viewports and conditions covered

- Phones: 320x568, 360x640, 390x844, 430x932
- Tablet and compact landscape: 600x800, 768x1024, 1024x768
- Desktop: 1280x720, 1366x768, 1440x900, 1920x1080
- Short desktop: 1920x600
- Large and ultrawide: 2560x1440, 3440x1440
- Reduced motion: 390x844, 768x1024, 1440x900, 1920x600
- Interaction coverage: keyboard navigation, menu focus containment, route transitions, browser Back, media lightboxes, video pause/resume, audio lifecycle, cursor trail, hover pause, touch targets, and contact form validation

### Validation baseline

- Next.js production build: passed; 14 pages generated.
- TypeScript (`npx tsc --noEmit`): passed.
- ESLint: 0 errors and 46 warnings.
- Media path checker: passed.
- Contact endpoint test: passed.
- Completed content-route captures: no document-level horizontal overflow, clipped headings, unexpected failed media, or runtime console errors.
- The expected 404 document response was not classified as a failed asset.

### Evidence rules and limitations

**Confirmed** means reproduced visually or through an interaction probe. **Code-verified** means the controlling implementation was traced and the consequence follows directly from it. **Risk** means the implementation warrants correction but the final user impact requires device or trace validation. **Enhancement** means no workflow is broken, but the experience can be made more coherent or premium.

Filmstrip frames were checked against settled captures. Transient states such as a partially revealed `KineticLabel`, a moving marquee, intentional 3D phone bleed, and an in-progress count-up were not misclassified as clipping. No Core Web Vitals are claimed: a Chrome performance-trace/Lighthouse facility was unavailable. Safari/iOS autoplay, real-device WebGL thermals, throttled-network timing, and hybrid-pointer behavior remain unverified.

## Final implementation status

Implementation completed on branch `feat/cineheight-full-audit-implementation`.
Of the 27 findings, **26 are Verified** and **1 is Deferred with evidence**.
L-05 remains deferred because every substantial candidate section owns scroll
geometry or signal-path bounds; applying unprofiled containment would add a
known measurement risk without evidence of a paint or layout bottleneck.

| Finding | Final status | Verified outcome |
| --- | --- | --- |
| H-01 | Verified | Mobile Client Stories separates the complete authored film, attribution, and 44 px controls. |
| H-02 | Verified | Featured Work is proximity-gated and selects one mobile or desktop film source before request. |
| M-01 | Verified | Capability taxonomy fits 320-430 px and 200% text without hidden content or overflow. |
| M-02 | Verified | About copy reaches a readable intermediate state and settles early with bounded blur. |
| M-03 | Verified | Work metrics start meaningfully, complete once, and do not rewind. |
| M-04 | Verified | Reduced-motion spacing and feedback retain sequence without large travel or hidden content. |
| M-05 | Verified | One guarded owner refreshes ScrollTrigger from late geometry, media, font, and viewport changes. |
| M-06 | Verified | Vanta selects a capability tier and pauses/resumes one instance by visibility. |
| M-07 | Verified | Cold reduced-motion loads do not request or mount Vanta/Three. |
| M-08 | Verified | Responsive alpha-safe cloud sources are selected before request for each viewport tier. |
| M-09 | Verified | The showreel uses one matched 540, 720, or 1080 H.264 source per viewport. |
| M-10 | Verified | Large media layers promote near the viewport and release compositor hints after exit. |
| M-11 | Verified | A first-focus skip link targets exactly one focusable route main. |
| M-12 | Verified | Invalid contact submission announces errors and focuses the first invalid field. |
| M-13 | Verified | Mobile kinetic labels complete within the shortened readable reveal range. |
| M-14 | Verified | Mobile Services carries one signal spine and active artwork handoff through chapters. |
| L-01 | Verified | Services keeps active, neighbour, and distant hierarchy at large widths. |
| L-02 | Verified | About gives the shared showreel distinct framing and choreography without forking controls. |
| L-03 | Verified | Reduced-motion route loading uses short non-spatial progress feedback. |
| L-04 | Verified | Ripple is a documented, dynamically isolated alternate mode; Vanta remains default and ripple stays unloaded. |
| L-05 | Deferred with evidence | No independent static owner justified containment without risking scroll and signal measurements. |
| L-06 | Verified | Backing blur planes use dedicated low-resolution lazy images while foreground media stays sharp. |
| L-07 | Verified | Desktop primary navigation links expose at least 44 px interaction areas. |
| L-08 | Verified | The combined contact field has neutral semantics and explicit email-or-phone guidance. |
| L-09 | Verified | MediaLightbox lint warnings are removed and focus, Escape, scroll lock, playback, and transitions pass. |
| L-10 | Verified | The QA harness uses current owners, non-aborting optional checks, and repeatable production probes. |
| L-11 | Verified | ESM audit scripts run without module-format warning noise. |

The detailed implementation evidence and limitations are recorded in
`CINEHEIGHT_AUDIT_IMPLEMENTATION_PLAN.md` and
`CINEHEIGHT_IMPLEMENTATION_COMPLETION_REPORT.md`. The original findings below
remain the baseline rationale for each change.

## 1. Critical bugs

No Critical blocker was found. Primary navigation, project discovery, case-study access, media lightboxes, contact submission validation, route history, and 404 recovery remained operable in the tested conditions. The two High defects below materially damage mobile communication or loading efficiency but do not block the entire journey.

### H-01 - Client Stories lower-third controls collide with film content

- **Route:** `/`
- **Component/file:** `components/home/ClientStories.tsx`
- **Viewport/device condition:** Confirmed at 320-430 px portrait widths; highest risk on short phones and source films with burned-in lower thirds.
- **Description:** The client, category, controls, sound helper, and optional film selector remain in a desktop-style flex overlay inside a `62svh` mobile canvas. They compete with each other and with text already embedded in the film, reducing legibility and making the controls look accidentally placed.
- **Severity:** High
- **Likely cause:** One overlay composition is reused across aspect ratios without a mobile safe-zone contract for source footage.
- **Exact fix:** Add mobile-specific overlay geometry below 768 px. Reserve authored top and bottom safe areas per film, keep client/category in a compact upper rail, place controls in a dedicated bottom control row, and replace the long visible sound sentence with a concise label plus an accessible description. Add per-poster focal point and safe-area metadata so each film can position its information correctly.
- **Classification:** Confirmed responsive UI bug; content legibility and media-control usability.
- **Animation/visual improvement:** Preserve the cinematic canvas. Introduce the upper rail and control row as two staggered, 180-260 ms opacity/translate reveals tied to the film transition, with reduced motion using opacity only. Do not reduce the film to a static card.

### H-02 - Featured Sapale film starts loading before its section and can send desktop media to mobile

- **Route:** `/`
- **Component/file:** `components/home/FeaturedWorkJourney.tsx`, `content/presentationMedia.ts`, `content/mediaSlots.ts`
- **Viewport/device condition:** Code-verified on initial page load; bandwidth impact is greatest on mobile and metered connections.
- **Description:** The first project is active by default and its playback effect can call `play()` before the section visibility observer gates the experience. This can request `/media/home-work/sapale-yamaha-desktop.mp4` (about 7.29 MB) well before the user reaches Featured Work. Slots without a mobile variant can also resolve to the desktop source on phones.
- **Severity:** High
- **Likely cause:** Project selection state and section visibility state are separate; playback is guarded by `active` but not by a root `inView` condition. Responsive source data is incomplete.
- **Exact fix:** Observe the journey root with a modest preload margin and require `inView && active` before assigning playback intent or calling `play()`. Keep posters visible before entry. Add portrait/compact mobile encodes and explicit `srcMobile`/poster metadata for every project; choose the source before playback rather than after the video element has requested the desktop file.
- **Classification:** Code-verified performance and responsive-media bug.
- **Animation/visual improvement:** Keep automatic cinematic playback when the journey approaches the viewport. Prewarm only metadata/poster one scene ahead, then crossfade from poster to the correct source after `canplay`; reduced motion should retain a short poster-to-film dissolve without autoplay.

## 2. Responsive issues

### M-01 - Capability taxonomy is visibly clipped on narrow phones

- **Route:** `/`
- **Component/file:** `components/home/HomeCapabilities.tsx`, `app/globals.css`
- **Viewport/device condition:** Confirmed at 320, 360, 390, and 430 px portrait widths.
- **Description:** Labels such as “Visual systems” extend beyond the right edge. The row combines full width, `gap-5`, a fixed calculated left inset, and inline wrapping. Global `overflow-x: clip` prevents a scrollbar but hides the overflow rather than solving the layout.
- **Severity:** Medium
- **Likely cause:** Desktop indentation and metadata spacing are preserved below the width at which the text can fit.
- **Exact fix:** Below 480 px, reduce the index-to-title gap and left inset, constrain the title column with `minmax(0, 1fr)`, and render taxonomy terms in a bounded two-column or wrapping grid. Test the longest authored term at 320 px and with 200% text zoom.
- **Classification:** Confirmed responsive bug.
- **Animation/visual improvement:** Preserve the accordion’s video reveal and line choreography. Let taxonomy terms enter with a 30-50 ms stagger after expansion and use a short press/progress accent on touch so the mobile version feels deliberately animated rather than compressed.

### M-13 - Kinetic labels can remain semantically incomplete too long on mobile

- **Route:** `/`, all case-study routes
- **Component/file:** `components/motion/KineticLabel.tsx`, callers in home and case-study sections
- **Viewport/device condition:** Observed in mobile filmstrips during normal scroll; settled labels are complete.
- **Description:** Word-safe character reveals avoid true clipping, but a user scrolling at a natural pace can see only part of a phrase such as “The work behind the growth” for long enough that it reads like missing content.
- **Severity:** Medium
- **Likely cause:** Character-level staging and trigger duration are tuned for large screens and slower desktop scroll travel.
- **Exact fix:** Add a compact timing profile below 768 px: trigger slightly earlier, shorten total reveal distance/duration by roughly 25-35%, and group the reveal by word before adding subtle per-character finish. Ensure the final state is reached when the label is comfortably within the viewport.
- **Classification:** Confirmed responsive motion-comprehension issue.
- **Animation/visual improvement:** Keep the kinetic reveal. Use word-level masks for immediate comprehension, then a small character settle for craft; reduced motion should use a 140-180 ms phrase fade/resolve.

### M-14 - Mobile Services loses the connected scene handoff of desktop

- **Route:** `/services`
- **Component/file:** `components/pages/ServicesPage.tsx`
- **Viewport/device condition:** Phone and tablet layouts below the desktop sticky-canvas breakpoint.
- **Description:** The stacked mobile service/artwork sequence is structurally clean, but each scene behaves as an isolated block. The persistent visual chain and shared-canvas continuity that make desktop feel authored are weakened on touch layouts.
- **Severity:** Medium
- **Likely cause:** The desktop sticky visual owner becomes repeated inline artwork on mobile without a replacement transition grammar.
- **Exact fix:** Keep inline artwork, but add a mobile scene handoff: carry the blue route line through sections, overlap the outgoing art edge with the next chapter marker, and preactivate the next scene when its heading enters the lower third. Keep section heights content-driven.
- **Classification:** Responsive experience enhancement.
- **Animation/visual improvement:** Use lightweight y-parallax, line-draw progression, and 200-300 ms artwork crossfades on mobile. Reduced motion should keep the line-state change and a short opacity handoff, not a static stack.

### L-01 - Inactive Services rows become too faint across ultrawide empty space

- **Route:** `/services`
- **Component/file:** `components/pages/ServicesPage.tsx`
- **Viewport/device condition:** Most visible at 2560x1440 and 3440x1440; also noticeable on tall desktop viewports.
- **Description:** The active service scene is strong, but adjacent rows fall to very low contrast over a large canvas. On ultrawide screens this produces long visually vacant intervals and weakens the sense of an intentional sequence.
- **Severity:** Low
- **Likely cause:** Inactive opacity was tuned at conventional desktop widths, while the content rail and scene spacing expand perceptually on ultrawide displays.
- **Exact fix:** Add a large-viewport inactive floor of approximately 0.16-0.22, keep the nearest previous/next heading more visible than distant rows, and cap vertical scene spacing independently of width. Validate that the active row still dominates.
- **Classification:** Visual hierarchy and ultrawide responsive enhancement.
- **Animation/visual improvement:** Preserve the focus-pull effect by using three opacity tiers and a restrained 4-8 px depth shift instead of near-disappearance. Reduced motion should change opacity without travel.

## 3. UI and visual consistency

### L-02 - About reuses the exact signature showreel without enough narrative differentiation

- **Route:** `/about` and `/`
- **Component/file:** `components/pages/AboutPage.tsx`, `components/showreel/ShowreelSection.tsx`
- **Viewport/device condition:** All viewports; most noticeable when users visit Home and About in one session.
- **Description:** Reusing the shared showreel creates visual continuity and browser caching helps, but the same signature asset and presentation can make About feel like a repeated Home module rather than a new chapter.
- **Severity:** Low
- **Likely cause:** A sound reuse decision was not paired with route-specific framing or entry choreography.
- **Exact fix:** Keep the shared film and controls, but provide route-level presentation props: alternate label, poster crop, opening frame, narrative caption, and entry direction. Preserve one media implementation to avoid divergent accessibility behavior.
- **Classification:** Visual-system enhancement.
- **Animation/visual improvement:** On About, enter from the page’s journey line or optical-focus motif rather than repeating the Home mask exactly. Reduced motion can use a distinct short dissolve and caption reveal.

### L-07 - Desktop Home navigation link has an undersized clickable rectangle

- **Route:** Global navigation on non-home routes
- **Component/file:** `components/Navbar.tsx`
- **Viewport/device condition:** Desktop fine-pointer navigation; mobile controls already meet the tested 44 px target.
- **Description:** The text link labelled “Home” was the recurring undersized target in automated geometry output. It is visually readable but less forgiving than adjacent controls.
- **Severity:** Low
- **Likely cause:** The clickable box follows the compact uppercase text dimensions instead of using an invisible interaction inset.
- **Exact fix:** Give every desktop nav link a minimum 36-40 px block height and 8-12 px horizontal padding while preserving the current optical spacing with flex gap adjustments. Keep the visible typography unchanged.
- **Classification:** UI consistency and pointer usability.
- **Animation/visual improvement:** Expand the existing active/hover indicator across the larger hit area, using a short line or signal pulse rather than adding a pill-shaped container.

## 4. Motion and interaction quality

### M-02 - About journey copy remains blurred and dim through too much resting scroll

- **Route:** `/about`
- **Component/file:** `components/pages/AboutPage.tsx`, `components/motion/ScrollHeadline.tsx`
- **Viewport/device condition:** Confirmed on desktop and mobile normal-motion runs; more pronounced with slow trackpad scrolling.
- **Description:** Key journey copy begins near 20% opacity with 3 px blur and vertical displacement, resolving against a long scrub. It remains substantially unreadable through a large normal resting-scroll range, so narrative content can feel disabled rather than intentionally focusing.
- **Severity:** Medium
- **Likely cause:** The optical resolve range and blur amount prioritize cinematic duration over minimum reading availability.
- **Exact fix:** Keep the focus transition but shorten the unresolved portion, reduce starting blur to about 1-1.5 px, raise the opacity floor to 0.35-0.45, and make the first line readable as soon as the block enters. Use a per-line handoff so one line is always legible.
- **Classification:** Confirmed motion/legibility issue.
- **Animation/visual improvement:** Retain optical depth with subtle luminance, y, and focus changes. Reduced motion should use a quick line-by-line opacity handoff with no blur, not simply expose a large static block.

### M-03 - Work metrics can communicate `0+` after the card is otherwise readable

- **Route:** `/work`
- **Component/file:** `components/work/WorkIndex.tsx`, `components/ui/CountUp.tsx`
- **Viewport/device condition:** Captured during normal scroll on phone and desktop; final authored values are correct.
- **Description:** Scroll-scrubbed counters can stay at or near zero while the associated project card has already become readable. `0+` briefly contradicts the intended evidence of impact.
- **Severity:** Medium
- **Likely cause:** Counter progress is coupled to a broader card scroll range and begins too early/finishes too late.
- **Exact fix:** Hold the authored value or a non-zero starting value until card entry, then animate the count over a short bounded interval after the metric label is visible. Clamp progress and force completion when the card crosses a stable viewport threshold.
- **Classification:** Confirmed motion-content synchronization issue.
- **Animation/visual improvement:** Keep the count-up but make it a decisive 450-700 ms acceleration with a subtle numeral settle. Reduced motion should reveal the final number with a 120-160 ms opacity change.

### M-04 - Reduced-motion layouts become overly static and vertically loose

- **Route:** Site-wide, most apparent on `/about`, `/services`, and long case-study pages
- **Component/file:** `app/globals.css`, motion components, `components/flow/RouteTransition.tsx`
- **Viewport/device condition:** `prefers-reduced-motion: reduce` at phone, tablet, desktop, and short desktop sizes.
- **Description:** Reduced motion correctly removes hazardous travel and scrub behavior, but several scenes retain spacing authored for animated transitions while their content snaps immediately to rest. The result is a longer, more inert page with weaker progression feedback.
- **Severity:** Medium
- **Likely cause:** Motion is disabled component by component, while scene spacing and alternate transition timing are not coordinated by one reduced-motion presentation profile.
- **Exact fix:** Define shared reduced-motion tokens for scene spacing, opacity duration, focus duration, and maximum transform travel. Collapse pin/scrub reserve space where it is no longer needed. Apply brief 120-220 ms opacity, line-draw, or color-state transitions so interactions still acknowledge input.
- **Classification:** Confirmed accessibility-motion quality issue.
- **Animation/visual improvement:** Replace large parallax, blur, and wipes with short fades, signal pulses, and instant spatial placement. Preserve sequencing and hierarchy rather than making every state simultaneous.

### M-05 - ScrollTrigger refresh is not tied to late media geometry changes

- **Route:** Site-wide; highest risk on `/`, `/work`, `/services`, and case-study routes
- **Component/file:** `components/flow/FlowDirector.tsx`
- **Viewport/device condition:** Risk on slow networks, cached-font variance, image decode delays, orientation changes, and mobile browser chrome changes.
- **Description:** Refreshes run after fonts, window load, and fixed 400/1400 ms delays. Lazy media or poster settlement can still change layout after those points, leaving pinned scenes or trigger boundaries stale.
- **Severity:** Medium
- **Likely cause:** Time-based refreshes substitute for observing the elements that can actually change route geometry.
- **Exact fix:** Add a route-level `ResizeObserver` on the main flow container and listen for relevant image/video metadata settlement. Debounce `ScrollTrigger.refresh()` into one animation frame and suppress refreshes during route-cover transitions. Keep the existing font/load safeguards as fallback.
- **Classification:** Code-verified motion reliability risk.
- **Animation/visual improvement:** This preserves every scroll sequence while reducing jumps, late pinning, and mismatched progress. No visual simplification is required.

### L-03 - Reduced-motion route loading feedback is almost static

- **Route:** All internal navigation
- **Component/file:** `components/flow/RouteTransition.tsx`
- **Viewport/device condition:** `prefers-reduced-motion: reduce`.
- **Description:** Route transitions remain functionally correct, including Back navigation and monotonic progress, but the reduced mode largely becomes a static loader and instant cover. It communicates less temporal feedback than the normal experience.
- **Severity:** Low
- **Likely cause:** The accessibility branch removes motion without defining an equally deliberate low-motion language.
- **Exact fix:** Add a 120-180 ms opacity cover, one restrained signal-line pulse, and a final color/opacity confirmation at 100%. Avoid directional travel and clip sweeps.
- **Classification:** Reduced-motion interaction enhancement.
- **Animation/visual improvement:** Keep progress legible through luminance and line-state changes, with no parallax or large translation.

## 5. Performance and media

### M-06 - Live Vanta hero has no device-capability quality tiers

- **Route:** `/`
- **Component/file:** `components/hero/HeroVantaBirds.tsx`, `components/hero/HeroIntroSequence.tsx`
- **Viewport/device condition:** Code-verified for normal motion; impact requires real-device testing on low-power phones, integrated GPUs, high-DPR screens, and thermally constrained devices.
- **Description:** The active hero initializes Three/Vanta and retains touch interaction on mobile, but does not vary bird quantity, scale, interaction intensity, or render density by device capability. A simple desktop/mobile split is insufficient for a long-lived WebGL hero.
- **Severity:** Medium
- **Likely cause:** The hero preserves a single premium configuration but lacks a runtime quality budget.
- **Exact fix:** Introduce high/medium/compact tiers using viewport area, DPR cap, coarse pointer, `hardwareConcurrency`, and a conservative default. Reduce quantity and interaction radius before reducing visual identity. Pause rendering when the hero is fully offscreen or the document is hidden, and resume without recreating the scene.
- **Classification:** Code-verified performance risk.
- **Animation/visual improvement:** Retain birds and touch response on all capable devices. Compact tier should use fewer, larger, slower birds and lower DPR, which can look more art-directed than a dense desktop simulation.

### M-07 - Reduced-motion preference is evaluated after the Vanta wrapper mounts

- **Route:** `/`
- **Component/file:** `components/hero/HeroVantaBirds.tsx`, `lib/useMediaPreferences.ts`
- **Viewport/device condition:** `prefers-reduced-motion: reduce`; especially relevant on first uncached visit.
- **Description:** The wrapper mounts and dynamic-import logic is available before the preference-driven rerender prevents initialization. This creates a window in which Three/Vanta modules may be requested even though the user should receive the simplified hero.
- **Severity:** Medium
- **Likely cause:** Reduced-motion gating lives inside the mounted client component instead of at the dynamic import boundary.
- **Exact fix:** Resolve the media preference before invoking the Three/Vanta imports, and keep a deterministic non-WebGL animated plate for reduced motion. Cache the preference result for the session and handle live changes by destroying/recreating only when necessary.
- **Classification:** Code-verified loading and accessibility-performance risk.
- **Animation/visual improvement:** The reduced-motion hero should retain cloud luminance drift or a slow opacity-based atmospheric change, with no flock simulation or pointer chase.

### M-08 - Hero cloud plates bypass responsive image delivery

- **Route:** `/`
- **Component/file:** `components/hero/HeroIntroSequence.tsx`, assets under `public/generated` and cloud media directories
- **Viewport/device condition:** All widths; bandwidth and decode cost are most important on mobile and high-DPR devices.
- **Description:** Cloud plates are raw `<img>` elements with asynchronous decoding but no responsive `srcset`/`sizes` contract or explicit priority policy. Phones can decode more pixels than needed, while critical layering order is left to generic browser behavior.
- **Severity:** Medium
- **Likely cause:** The plates are treated as animation layers rather than responsive media assets.
- **Exact fix:** Generate compact, standard, and large WebP/AVIF variants with transparency verified, then use `next/image` where compatible or authored `srcSet`/`sizes` on the existing elements. Prioritize only the first visible plate and lazy/defer deeper layers until intro progress requires them. Keep intrinsic dimensions stable.
- **Classification:** Code-verified responsive-media performance issue.
- **Animation/visual improvement:** Preserve all parallax layers and improve depth by assigning sharper near layers and softer lower-resolution far layers. Source switching must occur before animation starts to avoid visual pops.

### M-09 - The shared showreel is a 14.71 MB signature payload

- **Route:** `/` and `/about`
- **Component/file:** `components/showreel/ShowreelSection.tsx`, `content/mediaManifest.ts`
- **Viewport/device condition:** All devices; greatest impact on mobile, metered, and cache-cold visits.
- **Description:** `/media/showreel/showreel.mp4` is 15,059 KB (about 14.71 MB). Reuse benefits from browser cache, but either route can still make this a substantial first-session transfer when playback begins.
- **Severity:** Medium
- **Likely cause:** One 1920x1080 H.264 master is used as the shared delivery source.
- **Exact fix:** Produce at least 540/720/1080 variants with matched keyframes and an efficient H.264 baseline; add WebM only if measured browser savings justify dual packaging. Select by rendered size, DPR cap, and connection hints, keep `preload="metadata"`, and never preload the full film. Use a compact poster with identical framing.
- **Classification:** Measured media-weight issue.
- **Animation/visual improvement:** Preserve the full showreel, lightbox, and masked reveal. Crossfade from a visually matched poster on `canplay` so adaptive delivery is invisible.

### M-10 - Long routes keep multiple layers permanently promoted

- **Route:** `/`, `/work`, case-study routes, and media lightboxes
- **Component/file:** `components/home/FeaturedWorkJourney.tsx`, `components/showreel/ShowreelSection.tsx`, `components/media/CreativeOrbit.tsx`, `components/media/PhoneReelExperience.tsx`, other components using persistent `will-change`
- **Viewport/device condition:** Long sessions, mobile GPUs, high-DPR screens, and pages with several media scenes.
- **Description:** A visibility-based promotion helper exists, but many large transformed media layers still carry permanent `will-change-transform`. Persistent promotion can reserve texture memory long before or after animation.
- **Severity:** Medium
- **Likely cause:** Local motion components optimize their own animation start without sharing a page-level compositor budget.
- **Exact fix:** Extend `observeVisibleLayerPromotion` or a data-attribute convention to large media surfaces. Apply `will-change` shortly before intersection or interaction and clear it after settle/exit. Keep promotion permanent only for the cursor trail and continuously active pinned scene.
- **Classification:** Code-verified compositor-memory risk.
- **Animation/visual improvement:** Motion remains identical; nearby prepromotion protects animation start quality while offscreen cleanup improves long-page stability.

### L-04 - The substantial ripple hero implementation is orphaned

- **Route:** No live route; intended for `/`
- **Component/file:** `components/hero/HeroRippleBackground.tsx`, `components/hero/RippleDebugPanel.tsx`, `lib/useRippleTier.ts`, `lib/ripple/*`
- **Viewport/device condition:** All builds and maintenance workflows; no current runtime GPU cost was found.
- **Description:** `HeroRippleBackground` has no call sites. Its tiering, observers, shader resources, debug surface, and cleanup code increase conceptual and test surface without affecting the live site. It must not be counted as current render cost.
- **Severity:** Low
- **Likely cause:** The hero direction moved to Vanta/cloud plates while the previous ripple system remained in the repository.
- **Exact fix:** Decide explicitly between removal and future reintroduction. If retired, delete the component, debug panel, unused tier hook, shaders, and dead assets with a dedicated regression pass. If retained for a planned mode, document the feature flag and add a test proving it is off by default.
- **Classification:** Code-verified dead-code and architecture issue.
- **Animation/visual improvement:** Do not combine both heavy systems by default. If ripple returns, make it an intentional alternate hero mode with the existing compact tier and one visual owner at a time.

### L-05 - Long static sections do not use rendering containment

- **Route:** `/about`, `/services`, `/work`, and all case-study routes
- **Component/file:** Page/section components; only `RouteTransition` currently uses explicit containment
- **Viewport/device condition:** Long mobile pages and lower-memory devices; benefit requires profiling.
- **Description:** Offscreen static narrative sections are fully eligible for layout and paint throughout the route. The site has no `content-visibility`/intrinsic-size strategy outside the route cover.
- **Severity:** Low
- **Likely cause:** Scroll-driven sections make blanket containment unsafe, so no selective policy was introduced.
- **Exact fix:** Profile and apply `content-visibility: auto` only to non-pinned, non-scrubbed, layout-stable sections with authored `contain-intrinsic-size`. Exclude ScrollTrigger owners, sticky canvases, and sections whose bounds drive the signal path. Refresh triggers after first reveal where required.
- **Classification:** Performance enhancement; unmeasured opportunity.
- **Animation/visual improvement:** Restrict containment to static support sections so cinematic sequences remain eagerly measured and uninterrupted.

### L-06 - Blurred duplicate media backgrounds can add avoidable paint cost

- **Route:** Case-study media and phone-reel surfaces
- **Component/file:** `components/media/OrientationMedia.tsx`, `components/media/PhoneReelShell.tsx`
- **Viewport/device condition:** Portrait/square media on mobile and tablet; risk increases during simultaneous transform animation.
- **Description:** The orientation-safe treatment correctly preserves uncropped foreground media, but it duplicates the source behind it with 26-38 px CSS blur and scale. Large animated blur regions can be expensive to rasterize.
- **Severity:** Low
- **Likely cause:** A high-quality adaptive matte is generated live from the source for every surface.
- **Exact fix:** Retain the contained foreground. Prefer a preblurred lightweight poster/color field for static images, cap the live blur layer’s decoded resolution, and freeze or swap the backdrop while offscreen. Validate memory and paint time before changing the visual.
- **Classification:** Code-verified paint-cost risk; current visual behavior is correct.
- **Animation/visual improvement:** Keep the ambient color extension and add only a very slow, low-amplitude backdrop drift where budget allows; reduced motion keeps a static preblurred field.

## 6. Accessibility and usability

### M-11 - There is no skip link or stable main-content target

- **Route:** Site-wide
- **Component/file:** `app/layout.tsx`, page-level `<main>` elements
- **Viewport/device condition:** Keyboard and switch users, especially across repeated route navigation.
- **Description:** The pages expose main elements, but no first-focus “Skip to content” control or consistent `#main-content` target was found. Users must traverse global navigation on every route.
- **Severity:** Medium
- **Likely cause:** Main landmarks were implemented locally while bypass navigation was not centralized in the root layout.
- **Exact fix:** Add an initially visually hidden first-focus link in `app/layout.tsx` targeting a single stable `id="main-content"`. Ensure each rendered route has exactly one target, apply `scroll-margin-top` for the fixed nav, and focus the target only when skip navigation is activated.
- **Classification:** Accessibility defect.
- **Animation/visual improvement:** Reveal the skip link instantly or with a short opacity/outline transition only; it must not be delayed by route or hero animation.

### M-12 - Invalid contact submission does not focus the first invalid field

- **Route:** `/contact` and compact contact form placements
- **Component/file:** `components/contact/ProjectContactForm.tsx`
- **Viewport/device condition:** Keyboard, screen-reader, and mobile users after submitting incomplete/invalid data.
- **Description:** Labels, descriptions, `aria-invalid`, live status, autocomplete, and validation are strong, but focus remains on the submit control after an invalid submission. The user must search backward for the first error.
- **Severity:** Medium
- **Likely cause:** Validation updates field state and status text but has no ordered field-ref focus routine.
- **Exact fix:** Maintain refs in DOM order, determine the first invalid key after validation, call `focus({ preventScroll: true })`, then scroll it into view respecting the fixed navigation and reduced motion. Keep the summary live region and associate each field with its message via `aria-describedby`.
- **Classification:** Confirmed form usability/accessibility issue.
- **Animation/visual improvement:** Use a brief border/signal pulse on the focused invalid field. Avoid shake animation; reduced motion uses color and outline only.

### L-08 - One field combines email and phone but advertises only email autocomplete

- **Route:** `/contact` and compact contact form placements
- **Component/file:** `components/contact/ProjectContactForm.tsx`
- **Viewport/device condition:** Mobile keyboards, browser autofill, voice input, and assistive technology.
- **Description:** “Email or phone” is a valid compact prompt, but `autoComplete="email"` biases autofill and keyboard behavior against phone entry.
- **Severity:** Low
- **Likely cause:** A combined contact field was chosen for low friction while HTML autocomplete tokens describe only one data type.
- **Exact fix:** Prefer a small email/phone method selector that changes label, `type`, `inputMode`, autocomplete token, and validation. If the combined field remains, use neutral text input, explain accepted formats in the description, and avoid email-only autofill semantics.
- **Classification:** Form semantics and mobile usability issue.
- **Animation/visual improvement:** Transition the method-specific label/help text with a short opacity handoff; reduced motion switches instantly with a live-region announcement.

### L-09 - MediaLightbox lifecycle patterns generate React lint warnings

- **Route:** Case-study media lightboxes and showreel/media interactions
- **Component/file:** `components/media/MediaLightbox.tsx`
- **Viewport/device condition:** All devices; runtime probes passed, so this is maintainability and future-React risk.
- **Description:** The lightbox correctly traps/returns focus, locks body scroll, closes on Escape, uses contained media, and pauses inline reels. ESLint still flags ref access during render and synchronous effect-state patterns, which can become fragile under concurrent rendering.
- **Severity:** Low
- **Likely cause:** Animation lifecycle bookkeeping is coupled to render-time refs and effect-driven state synchronization.
- **Exact fix:** Move previous-value bookkeeping into effects or event handlers, derive render state directly where possible, and use a reducer/state-machine boundary for opening, open, closing, and closed phases. Preserve focus-return and media-pause tests.
- **Classification:** Code quality and accessibility-regression risk.
- **Animation/visual improvement:** Keep the existing scale/blur choreography; refactor lifecycle ownership without changing timing, then add a reduced-motion opacity-only test.

## 7. Recommended enhancements

### L-10 - The visual QA harness contains stale selectors and assertions

- **Route:** Audit coverage for `/`, `/work`, `/about`, and shared motion systems
- **Component/file:** `scripts/shoot.mjs`
- **Viewport/device condition:** Automated regression runs; not a production-runtime defect.
- **Description:** Several probes still expect removed process scenes, retired contour fields, old Work heading slices, previous inline-film markup, and old media-loading counts. `--probe` and `--refinement` can stop on missing nodes, obscuring valid later checks.
- **Severity:** Low
- **Likely cause:** The site evolved faster than selector-based test contracts.
- **Exact fix:** Replace implementation-detail selectors with stable `data-audit` hooks on behavior owners, mark optional/retired probes explicitly, isolate each probe so one missing surface cannot abort the suite, and emit pass/fail/not-applicable separately. Add viewport and reduced-motion tags to every result.
- **Classification:** QA infrastructure defect.
- **Animation/visual improvement:** Retain and strengthen motion assertions: settled-state capture, intermediate-state intent, trigger completion, cursor geometry, route progress monotonicity, and reduced-motion alternate feedback.

### L-11 - Audit scripts emit module-format warning noise

- **Route:** Development/QA tooling only
- **Component/file:** Node scripts under `scripts/`
- **Viewport/device condition:** Local and CI script execution.
- **Description:** Module-type warnings add noise around otherwise successful checks and make meaningful media or contact failures easier to miss.
- **Severity:** Low
- **Likely cause:** ESM syntax and file/package module declarations are not fully aligned across utility scripts.
- **Exact fix:** Standardize ESM scripts on `.mjs` and ESM-safe imports, or set a package-level module policy only after checking Next/config compatibility. Keep command output concise and exit non-zero only for actionable failures.
- **Classification:** QA/tooling enhancement.
- **Animation/visual improvement:** No production animation change. Cleaner test output should make motion/media regressions more visible in CI.

## 8. Prioritised implementation plan

### Phase 0 - Protect the baseline

1. Preserve the current production build, TypeScript, media-path, contact, route-transition, focus, cursor, audio, and lightbox passes as regression checks.
2. Repair `scripts/shoot.mjs` selectors and make probes independently fault-tolerant before broad UI changes.
3. Add representative settled and in-progress screenshots at 320x568, 390x844, 768x1024, 1440x900, 1920x600, and 3440x1440.

### Phase 1 - High-impact mobile and loading fixes

1. Recompose Client Stories mobile overlays with film-specific safe areas (H-01).
2. Gate Featured Work playback by section intersection and add mobile video sources (H-02).
3. Fix capability taxonomy geometry at 320-430 px (M-01).
4. Add skip navigation and first-invalid-field focus (M-11, M-12).

### Phase 2 - Motion legibility and accessibility

1. Shorten the About optical unresolved range while preserving focus choreography (M-02).
2. Retune count-up completion and compact-screen kinetic label timing (M-03, M-13).
3. Establish shared reduced-motion timing and spacing tokens, including route feedback (M-04, L-03).
4. Add connected mobile Services scene handoffs and ultrawide inactive-state tiers (M-14, L-01).

### Phase 3 - Media and rendering budget

1. Add Vanta capability tiers and gate its imports before reduced-motion initialization (M-06, M-07).
2. Build responsive cloud plates, showreel variants, and Featured Work mobile encodes (M-08, M-09, H-02).
3. Add media/ResizeObserver-driven ScrollTrigger refresh scheduling (M-05).
4. Scope compositor promotion by visibility and profile blurred backdrops/containment (M-10, L-05, L-06).

### Phase 4 - System refinement

1. Differentiate the About showreel presentation without forking media behavior (L-02).
2. Resolve the orphaned ripple architecture with an explicit retire-or-feature decision (L-04).
3. Normalize desktop navigation hit areas and contact method semantics (L-07, L-08).
4. Refactor MediaLightbox lifecycle warnings with interaction parity tests (L-09).

## Verified strengths to preserve

- The live hero remains centered and visually compelling on mobile; Vanta touch interaction and layered clouds establish a clear first-viewport identity.
- Navigation focus trapping, Escape handling, scroll lock, Lenis stop/restart, active states, and external `mailto:`/`tel:` handling passed.
- Route loading progress is monotonic, reaches 100%, supports browser Back, and does not intercept external protocols.
- Cursor drawing passed continuity, reversal, right-angle, idle-fade, action-halo, click, and DPR-cap checks.
- Client marquee uses one continuous track with hidden clones, continuous drift, hover pause, and a readable static reduced-motion arrangement.
- Work and case-study layouts are visually strong at settled states; transformed phone/orbit bleed is intentional and document overflow remains contained.
- Orientation-aware media keeps portrait and square work inspectable with a contained foreground, and lightboxes use `object-contain`.
- Contact forms have explicit labels, descriptions, required-state validation, `aria-invalid`, live status, sensible keyboard order, and direct-channel fallbacks.
- Mobile Footer layout is clean, touch targets are generally 44 px, and social placeholders remain semantic buttons rather than false links.
- Short-height display tokens and ultrawide content rails prevent the common heading clipping and unbounded-line-length failures.

## Executive summary

Cineheight already succeeds at the difficult part: it feels like one authored cinematic system rather than a set of template pages. The signal path, route cover, hero atmosphere, editorial type, controlled media reveals, case-study compositions, and custom cursor share a recognizable grammar. Across the tested matrix there were no Critical workflow blockers, no completed-route console failures, no unexpected missing media, and no document-level overflow or settled heading clipping.

The implementation preserved that premium intent while adapting it to compact screens and constrained devices. Client Stories now has a true mobile composition, Featured Work defers and selects media correctly, capability metadata has bounded compact geometry, and text and metric reveals use shorter mobile timing. The experience remains cinematic rather than being flattened to solve responsive defects.

Performance changes likewise retain the art direction: playback is visibility-gated, responsive encodes and cloud plates are selected before request, Vanta has quality tiers and lifecycle pause/resume, reduced motion gates WebGL imports, large layers use scoped promotion, and ScrollTrigger refreshes from observed geometry. Real-device WebGL thermals, Safari/iOS media behavior, paint-time gains, GPU-memory gains, throttled-network startup, and Core Web Vitals remain explicitly unclaimed.

## Issue totals by severity

| Severity | Count | Meaning in this audit |
| --- | ---: | --- |
| Critical | 0 | No blocked primary workflow or unrecoverable route failure found |
| High | 2 | Material mobile communication or loading defect requiring immediate correction |
| Medium | 14 | Clear usability, responsive, motion, accessibility, or performance issue |
| Low | 11 | Polish, maintainability, QA, or measured-risk improvement |
| **Total** | **27** | Distinct root causes; duplicate symptoms were consolidated |

## Implemented top 10 priorities

1. Rebuilt the Client Stories mobile composition around authored film safe areas.
2. Gated Featured Work playback by intersection and shipped reproducible mobile encodes.
3. Fixed Home capability taxonomy at 320-430 px without reducing its media reveal.
4. Added skip navigation and first-invalid-field focus recovery.
5. Shortened About's blurred reading interval while retaining optical focus.
6. Defined a coherent reduced-motion motion-and-spacing profile.
7. Added capability-based Vanta tiers and offscreen/hidden pause-resume behavior.
8. Delivered responsive cloud plates and adaptive showreel sources.
9. Refreshes ScrollTrigger from actual media and geometry settlement.
10. Repaired the visual QA harness and locked behavior into production probes.

## Regression risks

- **Scroll geometry:** Changing media aspect ratios, reduced-motion spacing, or mobile service overlap can shift ScrollTrigger bounds. Validate every pinned/scrubbed scene after each geometry change.
- **Autoplay and source switching:** Assign responsive video sources before a request starts; changing `src` after playback intent can double-download or reset current time.
- **Film readability:** Client Stories safe areas must be authored per source, not assumed globally. Validate burned-in captions against every overlay state.
- **Reduced motion:** Do not hide content behind animation-initial CSS when JavaScript or motion is disabled. Every scene needs a complete, readable initial/fallback state.
- **WebGL lifecycle:** Capability-tier changes must destroy Vanta once, remove listeners, pause offscreen work, and avoid duplicate canvases during live preference/orientation changes.
- **Compositor promotion:** Clearing `will-change` too early can reintroduce first-frame stutter. Prepromote within a tested intersection margin and clear only after settle.
- **Containment:** Never apply `content-visibility` blindly to pin owners, sticky canvases, or signal-path geometry sources; it can invalidate measured bounds.
- **Focus behavior:** Route covers, menu focus traps, lightboxes, skip navigation, and invalid-field focus can compete. Define ownership order and verify focus return after Escape and Back.
- **Ultrawide hierarchy:** Raising inactive service opacity must not diminish the active scene. Test 1440, 1920, 2560, and 3440 widths together.
- **Shared components:** Route-specific showreel choreography should be prop-driven. Forking the component risks divergent playback, keyboard, and reduced-motion behavior.
- **Existing user work:** Current cloud, atmosphere, showreel, About, cursor, and contour changes must be treated as the baseline and not reverted during implementation.