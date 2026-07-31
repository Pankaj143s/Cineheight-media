# Hero cloud masters — VERSIONED ON PURPOSE, DO NOT GITIGNORE

These six WebPs are the **only surviving source** for the hero cloud system. They are the
input to `scripts/repair-hero-clouds.mjs`, which writes the runtime assets in
`public/generated/hero-v4/`.

## Why they live here and not in `cineheight-desktop-assets/`

The original masters — `g4-clouds-master.png` (a one-off Higgsfield generation) and the
two stock JPEGs `cloude-1.jpg` / `cloude-2.jpg` — were only ever kept in a scratchpad
directory, on the assumption that `scripts/process-hero-clouds.mjs` could always
regenerate from them. The scratchpad was cleared and they are gone. Regenerating the four
G4 assets would cost generation credits and would not reproduce the same clouds.

That is why this folder is committed and is **not** listed in `.gitignore`, unlike
`cineheight-desktop-assets/` (raw client media, reproducible). It sits outside `public/`
so nothing extra is served to the browser.

If you ever recover or regenerate a true master, put it back in the scratchpad flow in
`scripts/process-hero-clouds.mjs` and refresh these files from its output.

## What is in them

Pixel-exact copies of the `public/generated/hero-v4/` assets as of the commit that added
this folder — i.e. the output of `process-hero-clouds.mjs`, before the repair pass.

Two of the six carry known defects that `repair-hero-clouds.mjs` corrects, so **expect
these files to look wrong on their own**:

- `cloud-haze-band.webp` — truncated by `trim()` with high alpha still on its right
  column (avg 132/255) and bottom row (avg 81/255). This is what produced the visible
  rectangle in the hero.
- `cloud-haze-band.webp`, `cloud-puff-accent.webp` — flat white RGB (255,255,255), where
  the four G4 clouds paint at 166,171,185 / 116,119,128.

See `docs/HERO-CLOUD-SYSTEM.md` for the full history.
