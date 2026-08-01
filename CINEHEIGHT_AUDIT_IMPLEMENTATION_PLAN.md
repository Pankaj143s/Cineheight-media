# Cineheight Audit Implementation Plan

## Control record

- **Source of truth:** `CINEHEIGHT_FULL_UI_UX_AUDIT.md`
- **Implementation branch:** `feat/cineheight-full-audit-implementation`
- **Started:** 2026-08-01
- **Status vocabulary:** Pending, In progress, Implemented, Verified, Blocked, Deferred with reason, Not applicable with evidence
- **Safety rule:** Existing user work is preserved. It is not staged in audit commits unless an implementation must deliberately layer onto the same file, in which case only the implementation hunk is staged.

## Initial worktree state

Branch before implementation: `main`.

Pre-existing modified files carried onto the implementation branch:

- `app/globals.css`
- `components/flow/AtmosphereLayer.tsx`
- `components/flow/CursorTrail.tsx`
- `components/pages/AboutPage.tsx`
- `components/showreel/ShowreelSection.tsx`
- `lib/ripple/contours.ts`

Pre-existing untracked files carried onto the implementation branch:

- `CINEHEIGHT_FULL_UI_UX_AUDIT.md`
- `New clouds/bottom updated.png`
- `New clouds/left updated.png`
- `New clouds/middle bottom.png`
- `New clouds/right updated.png`

No reset, checkout restore, clean, or destructive worktree command is permitted. The baseline audit document remains uncommitted user work until the final documentation batch, where it may be committed intentionally with implementation status updates.

## Baseline validation

| Check | Baseline result |
| --- | --- |
| Node | v24.12.0 |
| npm | 11.7.0 |
| Dependency verification | Declared top-level dependencies present; three pre-existing extraneous transitive packages |
| ESLint | Passed with 0 errors, 46 warnings |
| TypeScript | Passed with no diagnostics |
| Next.js production build | Passed; 14/14 pages generated |
| Media path validation | Passed; module-type warning reproduced |
| Contact validation/provider tests | Passed; module-type warning reproduced |
| Existing visual coverage | 14 viewport configurations, all content routes, reduced-motion matrix, focused interaction probes |
| Existing harness limitation | `--probe` and `--refinement` contain stale selectors and can abort before later checks |

## Finding ledger

| ID | Issue title | Severity | Batch | Affected routes | Affected files | Current status | Implementation notes | Verification requirements | Final verification result | Blocker or limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L-10 | Visual QA harness contains stale selectors and assertions | Low | 0 | `/`, `/work`, `/about`, shared probes | `scripts/shoot.mjs`, `components/home/HomeCapabilities.tsx`, `components/work/WorkIndex.tsx`, `components/motion/OpticalResolve.tsx` | Verified | Added tri-state Pass/Fail/Not applicable output, non-aborting optional process evidence, stable live-owner hooks, current semantic Work heading checks, and corrected active loading/media assertions without weakening cursor, route, form, lightbox, reduced-motion, overflow, or clipping coverage. | Repaired `--probe` and `--refinement` complete; cursor, route, media, form, reduced motion, overflow, and clipping checks remain. | Verified: probe completes with 46 Pass, 3 Not applicable backed by no-call-site evidence, and one genuine H-02 Fail; refinement capture completes. | None |
| L-11 | Audit scripts emit module-format warning noise | Low | 0 | Tooling | `package.json`, `postcss.config.js` | Verified | Declared the package ESM and converted PostCSS configuration to a named ESM default export. | Media and contact scripts pass with no `MODULE_TYPELESS_PACKAGE_JSON` warning; build remains green. | Verified: media and contact scripts pass without warning; TypeScript and 14/14-page production build pass; lint remains baseline 0 errors/46 warnings. | None |
| H-01 | Client Stories lower-third controls collide with film content | High | 1 | `/` | `components/home/ClientStories.tsx`, `components/media/OrientationMedia.tsx` | Implemented | Mobile uses explicit attribution, complete 16:9 authored-film, and 44 px control bands; desktop remains full-bleed. | Browser geometry probe passes; 390x844 visual capture inspected; complete baked-in lower-third remains visible; reduced motion uses short opacity choreography. | Verified | Only Divija currently has an eligible Home testimonial; layout is data-driven for future stories. |
| H-02 | Featured Sapale film loads early and desktop media can reach mobile | High | 1 + 3 | `/` | `components/home/FeaturedWorkJourney.tsx`, `components/media/MediaSpecPlaceholder.tsx`, `content/mediaSlots.ts`, generated derivatives | Implemented | Source and playback are proximity-gated; only the active film mounts; three reproducible 720x900 H.264/WebP mobile derivatives were generated without replacing masters. | Browser probes confirm poster-only initial state, one mobile source with no desktop duplicate, active desktop playback, visibility pause, and no missing media paths; production build passes. | Verified | Dedicated ultrawide variants remain optional and are not advertised until supplied; desktop source is the ultrawide fallback. |
| M-01 | Capability taxonomy clips on narrow phones | Medium | 1 | `/` | `components/home/HomeCapabilities.tsx` | Implemented | Removed mobile 12-column gap overflow, zeroed intrinsic grid minimums, and added bounded two-column taxonomy while retaining active-film and line choreography. | Browser geometry passes at 320/360/390/430 and doubled text at 320; 390x844 visual capture inspected; no hidden taxonomy or viewport clipping. | Verified | None |
| M-11 | Missing skip link and stable main-content target | Medium | 1 | Site-wide | `app/layout.tsx`, `components/ui/SkipLink.tsx`, seven page main owners | Implemented | Added one root first-focus skip control and exactly one focusable `main-content` landmark per rendered route owner. | Browser probe verifies first Tab, focus transfer, one route target, non-negative clipping, and route-transition compatibility. | Verified | Native document-top main may remain at viewport top; focus transfer is the accessibility requirement. |
| M-12 | Invalid contact submission does not focus first invalid field | Medium | 1 | `/contact`, compact form | `components/contact/ProjectContactForm.tsx` | Implemented | Client and server field errors use deterministic form order, focus without scroll jump, centered smooth/instant recovery, and a non-layout-shifting border signal. | Browser probe verifies first invalid focus, four invalid semantics, and live message; contact provider tests and keyboard-order probes pass. | Verified | Signal duration collapses to 1 ms for reduced motion. |
| L-07 | Desktop Home navigation target is too small | Low | 1 | Global navigation | `components/Navbar.tsx` | Implemented | Desktop text links now have transparent 44x44 minimum hit regions; visual type and header treatment are unchanged. | Browser geometry probe verifies every desktop primary link is at least 44 px in both dimensions. | Verified | None |
| L-08 | Combined email/phone field has email-only semantics | Low | 1 | `/contact`, compact form | `components/contact/ProjectContactForm.tsx` | Implemented | Retained one neutral combined field to preserve API and keyboard order; removed email-only autocomplete semantics and added explicit accepted-value guidance. | Compact/full keyboard order, input semantics, validation recovery, TypeScript, and contact provider tests pass. | Verified | An extra contact-method selector was rejected because it would add interaction cost without changing the backend contract. |
| M-02 | About journey copy stays blurred and dim too long | Medium | 2 | `/about` | `components/pages/AboutPage.tsx`, `components/motion/ScrollHeadline.tsx` | Implemented | Raised the readable floor to 42%, limited blur to 1.25 px and travel to 6%, and shortened journey/closing resolution ranges while retaining scroll-owned focus choreography. | Settled/intermediate mobile and desktop captures; reduced motion; repeat navigation. | Verified: measured intermediate state averaged 0.71 opacity with 1.19 px maximum blur, then settled at 1/0; phone through ultrawide and reduced captures have no clipping or overflow. | None; layered only the required About hunks over preserved user work. |
| M-03 | Work metrics can show `0+` as the readable state | Medium | 2 | `/work` | `components/work/WorkIndex.tsx`, `components/ui/CountUp.tsx` | Implemented | Self-triggered metrics now start at a meaningful non-zero baseline, run once for 450–700 ms at the readable threshold, and hold their authored result after reverse scroll or teardown. | Forward/reverse scroll, resize, browser Back, repeated route visits, reduced motion. | Verified: browser probe measured `1 → 3 → 3`; full route probes, reduced motion, TypeScript, and production build pass. | None |
| M-04 | Reduced-motion layouts are overly static and vertically loose | Medium | 2 | Site-wide | `app/globals.css`, motion and route components | Implemented | Added shared 160/180 ms state/focus timing, 4 px maximum travel, and 0.78 scene-gap tokens; About/Services consume the compact scene rhythm and route feedback remains communicative. | Reduced-motion route matrix, hierarchy and sequence retained, no hidden content. | Verified: reduced phone/desktop capture matrix reports zero clipping, overflow, bleed, errors, or failed requests; all six mobile service titles remain visible after preference/tier hydration. | None; isolated additions preserve existing global CSS work. |
| M-13 | Kinetic labels remain incomplete too long on mobile | Medium | 2 | `/`, case studies | `components/motion/KineticLabel.tsx` and callers | Implemented | Mobile labels use a word-first reveal with a subtle character finish across a shorter 94%→62% range; desktop choreography remains unchanged. | Mobile intermediate/settled captures; tablet/desktop parity; reduced motion. | Verified: every mobile character and rule reaches opacity/identity transform by the shortened endpoint; phone/tablet/desktop and reduced captures pass. | None |
| M-14 | Mobile Services loses connected scene handoff | Medium | 2 | `/services` | `components/pages/ServicesPage.tsx` | Implemented | Added one continuous mobile signal spine, active chapter markers, artwork emphasis handoff, and responsive GSAP state reset so desktop initial transforms cannot strand mobile/reduced titles. | Phone/tablet screenshots, touch scrolling, reduced motion, no desktop sticky regression. | Verified: emulated touch drag moved 365 px; chapter 3 became the sole active marker/art pair; spine advanced to 0.485; all six reduced titles are fully visible; desktop probe remains green. | None |
| L-01 | Inactive Services rows become too faint on ultrawide | Low | 2 | `/services` | `components/pages/ServicesPage.tsx` | Implemented | Added active/neighbor/distant opacity tiers of 1/0.64/0.38/0.24, capped rows at 23 rem, and limited non-active depth travel to 6 px. | 1440/1920/2560/3440 comparisons and reduced motion. | Verified: 2560 browser geometry measured the intended tiers, 368 px maximum row height, and 6 px maximum travel; desktop/ultrawide captures show active dominance without disappearing context. | 3440 physical capture is unavailable locally; responsive cap/tier behavior is deterministic beyond 2560 and verified by computed geometry. |
| L-02 | About repeats Home showreel without enough differentiation | Low | 2 | `/about`, `/` | `components/pages/AboutPage.tsx`, `components/showreel/ShowreelSection.tsx` | Implemented | Added route-aware context, About-specific “How we see it” framing/caption/crop and entry dissolve while preserving one shared media lifecycle and control state machine; transformed media is clipped inside its frame. | Home/About comparison, caching, controls, lightbox, reduced motion. | Verified: browser comparison confirms distinct context, label, caption, crop, and choreography with identical shared control count; visual sweep has zero bleed and existing audio/control probes pass. | None; pre-existing user changes were preserved. |
| L-03 | Reduced-motion route loading feedback is too static | Low | 2 | All internal routes | `components/flow/RouteTransition.tsx`, motion tokens | Implemented | Replaced the static reduced loader with short opacity and luminance feedback, a fixed-position signal pulse, and monotonic 100% confirmation without clip sweeps or directional travel. | Reduced-motion internal navigation, progress monotonicity, browser Back, external protocols. | Verified: live samples measured cover 0.38→0.97, signal 0.30→0.91, 0 px travel, progress 0→100→100, scene gap 0.78, successful navigation; Back and mailto/tel probes pass. | None |
| M-05 | ScrollTrigger refresh ignores late media geometry | Medium | 3 | Site-wide | `components/flow/FlowDirector.tsx` | Pending | Debounced ResizeObserver and media settlement refreshes with loop and transition guards. | Slow media, orientation, resize, pins, scrubs, no refresh loop. | Pending | None |
| M-06 | Vanta hero lacks device-capability tiers | Medium | 3 | `/` | `components/hero/HeroVantaBirds.tsx`, hero config | Pending | High/standard/compact tiers; visibility/document pause; safe resume and cleanup. | Tier selection, one canvas/listener set, offscreen/hidden pause, mobile interaction. | Pending | Real-device thermal impact cannot be fully verified locally. |
| M-07 | Reduced-motion preference is evaluated after Vanta mounts | Medium | 3 | `/` | `components/hero/HeroVantaBirds.tsx`, `lib/useMediaPreferences.ts` | Pending | Gate expensive imports before initialization and provide non-WebGL atmospheric motion. | Reduced-motion network/import evidence, live preference changes, no duplicate canvas. | Pending | Browser module cache can affect repeated network observations; use cold profile. |
| M-08 | Hero cloud plates bypass responsive image delivery | Medium | 3 | `/` | `components/hero/HeroIntroSequence.tsx`, cloud derivatives/content | Pending | Generate alpha-safe variants and add intrinsic responsive source contracts without depth pops. | Dimensions, alpha, visual layer comparison, phone/desktop network source selection. | Pending | Current cloud files include user-provided untracked assets that must not be overwritten. |
| M-09 | Shared showreel is an oversized signature payload | Medium | 3 | `/`, `/about` | `components/showreel/ShowreelSection.tsx`, media metadata, generated variants | Pending | Generate 540/720/1080 derivatives and select before request; retain master and controls. | ffprobe dimensions/duration/codec/audio, cold/cached network, no duplicate download, lightbox. | Pending | User-modified showreel component requires isolated edits. |
| M-10 | Long routes keep layers permanently promoted | Medium | 3 | `/`, `/work`, case studies, lightbox | Media/motion components, `lib/visibleLayerPromotion.ts` | Pending | Scope promotion to near-visible or active surfaces and clear after exit/settle. | Computed `will-change` before/near/after viewport; animation start remains smooth. | Pending | Real GPU memory improvement requires device profiling. |
| L-05 | Long static sections lack selective rendering containment | Low | 3 | `/about`, `/services`, `/work`, case studies | Safe static section roots, `app/globals.css` | Pending | Apply containment only to measured non-trigger geometry with intrinsic size. | Trigger measurements unchanged; no skipped content or scrollbar jump. | Pending | Must be Deferred with reason if profiling finds no demonstrably safe section. |
| L-06 | Blurred duplicate media backgrounds may cost excess paint | Low | 3 | Case-study media | `components/media/OrientationMedia.tsx`, `components/media/PhoneReelShell.tsx`, derivatives | Pending | Lower decode resolution/freeze by visibility or preblur safely while retaining ambient field. | Side-by-side quality, media containment, visibility behavior, no animation regression. | Pending | Paint improvement requires trace/real-device confirmation. |
| L-04 | Ripple hero architecture is orphaned | Low | 4 | Intended `/`; no live route | `components/hero/HeroRippleBackground.tsx`, `components/hero/RippleDebugPanel.tsx`, `lib/useRippleTier.ts`, `lib/ripple/*` | Pending | Determine ownership from call sites/docs; remove only proven dead code or add explicit default-off flag. | No remaining runtime import/reference, live hero visual regression, build. | Pending | `lib/ripple/contours.ts` contains user changes and cannot be silently removed. |
| L-09 | MediaLightbox lifecycle generates React warnings | Low | 4 | Media lightboxes | `components/media/MediaLightbox.tsx` | Pending | Refactor lifecycle ownership without changing focus, media, body-lock, or transition behavior. | ESLint warning reduction, focus trap/return, Escape, pause/resume, normal/reduced transitions. | Pending | None |

## Batch commit plan

1. `chore(qa): establish cineheight audit baseline`
2. `fix(ui): resolve high-priority responsive and accessibility issues`
3. `feat(motion): refine cinematic motion across devices`
4. `perf(media): optimize media and motion runtime`
5. `refactor(ui): complete audit architecture refinements`
6. `docs(audit): finalize implementation verification`

Before every commit: inspect the complete diff, stage only the batch's intentional files or hunks, verify pre-existing user work is preserved, and run the batch-specific validation listed above.