# SIGNAL-PATH — the continuous background signal route

`components/signal/SignalField.tsx` — the master brief's §31 "continuous signal
path", now also an explicit request: a single restrained **#0089FF** route with a
soft **glowing dot** that **draws as the page scrolls down and retracts as it
scrolls up**, wandering left/right and running off the screen edges before
re-entering. It reinforces the "elevation / signal" story without competing with
content.

## Architecture

- A `position: fixed; inset:0; pointer-events:none` layer at **z-0**, behind all
  content. `app/page.tsx` mounts it once (before `<main>`), and `<main>` is
  `relative z-10` so **all content paints above** the signal. The hero sticky
  stage background is made transparent (same #020306 as the body) so the route
  shows through the hero's dark negative space too; the full-bleed video and the
  trailing spacer give it clear dark room elsewhere.
- **SVG path** in a `0 0 100 100` viewBox, `preserveAspectRatio="none"` (stretched
  to the viewport). One hand-authored cubic-bézier route (`PATH_D`) with points
  beyond 0–100 so it leaves/re-enters the screen; **no loops, no self-crossings**.
  Stroke is a faint blue hairline (`vectorEffect="non-scaling-stroke"` keeps it a
  constant pixel width despite the non-uniform stretch) with a small drop-shadow.
- **The dot is a separate round HTML element** positioned in **pixel space**
  (`translate3d(px,py)` from `getPointAtLength` → viewBox→pixel), so it never
  distorts into an ellipse the way an in-viewBox `<circle>` would. Blue core +
  layered `box-shadow` glow.

## Scroll behaviour

- Progress `p = scrollY / (scrollHeight − innerHeight)`, clamped 0–1 (whole page).
- `strokeDasharray = totalLength` (measured once); `strokeDashoffset =
  totalLength*(1−p)` → the route reveals from its start as you scroll down and
  **retracts as you scroll up**. The path renders initially with a large
  `strokeDasharray/offset` (2000) so there is **no full-path flash before JS**
  measures the real length (~343 units).
- The dot sits at `getPointAtLength(totalLength*p)`; it is hidden at the very
  start/end (`p ≤ 0.004 || p ≥ 0.996`).

## Performance & accessibility

- One `scroll` listener (`passive`), **rAF-throttled**, writing SVG/DOM attributes
  directly — **no per-frame React state**. `resize` re-syncs; work is skipped while
  the tab is hidden; listeners cleaned up on unmount.
- **Reduced motion:** the route is drawn once, faint and static (offset at 50%),
  the dot is hidden, and no scroll work runs.

## Tuning

Route shape → edit `PATH_D`. Presence → the path `opacity` (0.3) / `strokeWidth`
(1.4) and the dot size/`box-shadow`. Colour stays `#0089FF` (core `#CFE8FF`).
