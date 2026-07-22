# SHOWREEL-SYSTEM — cineheight-single-flow-v2

The showreel section plays the **real** CINEHEIGHT film. Only the media asset is
reused from the old project — the component, layout, animation and controls are
all newly designed for the single-flow site. **No old homepage component was
copied.**

## Media

| | |
|---|---|
| Old source | `../cineheight_design_2/public/about/about-us-video-2-horizontal.mp4` |
| New path | `public/media/showreel/showreel.mp4` (copied verbatim, 14.7 MB) |
| Video | 1920×1080 · 16:9 · 32.04 s · H.264 High · 24 fps |
| Audio | AAC · 48 kHz · stereo (off by default; user-enabled only) |
| Poster | `public/media/showreel/showreel-poster.webp` — a **real frame** extracted with ffmpeg at **t = 6.4 s (~20%)**, resized 1600×900, WebP q82, **178 KB** (replaces the old generated placeholder card) |

The old source is left untouched. No AI replacement was created.

## Component

`components/showreel/ShowreelSection.tsx` — placed in `app/page.tsx` after
`HeroIntroSequence`, in normal document flow. Showreel logic lives here, not in
the hero component.

## Continuous handoff (spec §19)

The hero section (230vh, sticky stage) **releases cleanly** before the showreel;
the showreel has its own scrub ScrollTrigger with **no pin**, so there are no
competing sticky containers. Both sit on the shared `#020306` body background
with no section container, no divider and no hard boundary. As the brand
statement scrolls up and out, the SHOWREEL label + frame enter from below and the
frame expands into the primary focus.

## Full-bleed (update)

The frame is now **full-bleed**: `width:100vw; aspect-ratio:16/9; max-height:100dvh`,
centred, **no max-width cap, no border radius, no framed card**. The video stays
`object-cover` so it never distorts — on ≤16:9 viewports 100vw fills the screen, on
ultrawide `max-height` caps it and cover-crops a little, on mobile it is a natural
full-width 16:9 band. The pointer tilt is **disabled** (a tilt on a 100vw frame
would reveal black edges); the subtle internal `video scale 1.06→1` parallax + a
faint blue light behind + minimal top/bottom letterbox feather remain. A device-
specific cut can replace the source later without code changes.

## Scroll behaviour

Scrub ScrollTrigger (no pin), `trigger: section`, `start: top 80%`,
`end: top 30%` desktop / `top 45%` mobile:

- **Arrival → expansion:** frame `scale` 0.72 → 1 (desktop) with an opening mask
  `clip-path inset(10% 0 10% 0) → inset(0)` and `autoAlpha` 0.72 → 1; inner video
  `scale` 1.06 → 1. Frame width is fixed (94vw / `calc(100vw − 28px)` mobile),
  so the growth is a GPU transform.
- **Active viewing:** at full size the video autoplays muted (see thresholds).
- **Exit:** frame holds at full size and scrolls away; no hard boundary.

Reveal range ≈ 150vh desktop / 120vh mobile. No heavy pin.

## Playback thresholds (IntersectionObserver, spec §16)

- Muted autoplay when **≥ 55%** visible (and tab visible, not user-paused).
- Pause when **< 25%** visible.
- User pause is preserved (`userPausedRef`) — auto-resume is suppressed after a
  manual pause; slight scrolling never restarts the video (currentTime untouched).
- Loops (32 s). `preload="metadata"` — the full video is not fetched on the
  initial hero load. `playsInline`. Pauses on tab hide.
- **Audio off by default**; unmute only via the explicit control.
- **Reduced motion: no autoplay** — poster shown, user starts playback via the
  control.

## Interaction (spec §17)

Restrained pointer depth on fine-pointer desktops only (disabled on touch and
reduced motion): a rAF-smoothed tilt with `rotateX/Y ≤ ±1°` and translate ≤ 8px,
returning to rest on pointer leave. No large 3D tilt, no cursor-following video,
no giant play circle, no neon glow.

## Controls / accessibility

Custom play-pause and mute-unmute buttons, 44×44px, `aria-label`s (state-aware),
`aria-pressed` on mute, visible `#0089FF` focus outlines, keyboard operable. The
mute button border turns `#0089FF` when audio is on. `#0089FF` is used sparingly:
the small SHOWREEL label, the active mute state, and focus outlines.

## Typography

Small editorial `SHOWREEL` label (`#0089FF`, letter-spaced) + microcopy
"A glimpse of how we turn strategy into stories, content and growth." No large
competing heading; no template wording.

## Edge blending (spec §18)

Top/bottom gradient feathers (`--bg-950` → transparent) over the frame edges and
a faint `#0089FF` radial light behind it, so the video never reads as a bright
rectangle pasted on black. The video itself is never blurred or covered; no
clouds over the showreel.

## Mobile / reduced motion

- **Mobile:** width `calc(100vw − 28px)`, no pointer tilt, smaller reveal, no pin,
  44px controls, poster-first, no horizontal overflow.
- **Reduced motion:** static full-size frame (no scrub expansion), no autoplay
  (poster + controls), full controls usable.

## Performance safeguards

Poster-first; `preload="metadata"`; IntersectionObserver-gated play/pause; pause
on tab hide; transform/opacity-only animation; rAF pointer loop cleaned up on
unmount; `gsap.context` reverted on unmount; no autoplay audio.
