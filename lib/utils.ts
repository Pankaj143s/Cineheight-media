/** Small shared numeric/DOM helpers used by the flow + media systems. */

export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v)

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Frame-rate-independent easing factor. `f` is the fraction closed per 16.67 ms
 * frame; this converts it for an arbitrary `dt` so physics feels identical at
 * 60 Hz and 120 Hz.
 */
export const damp = (f: number, dt: number) => 1 - Math.pow(1 - f, dt / 16.67)

/** Normalise degrees into (-180, 180]. */
export function normalizeAngle(a: number): number {
  let r = a % 360
  if (r > 180) r -= 360
  if (r < -180) r += 360
  return r
}

/**
 * Deterministic pseudo-random social counts for the Instagram phone chrome.
 * Ported verbatim from the old project so the numbers are stable across every
 * render and SSR/CSR pass. These are presentational UI furniture — they are
 * never presented as verified client metrics (those live in `content/`).
 */
export function socialMetrics(seed: number) {
  const rand = (n: number) => {
    const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453
    return x - Math.floor(x)
  }
  const views = Math.round(45_000 + rand(1) * 720_000)
  const likes = Math.round(views * (0.05 + rand(2) * 0.04))
  const comments = Math.round(likes * (0.015 + rand(3) * 0.025))
  return { views, likes, comments }
}

/** 1_234_567 → "1.2M"; 120_400 → "120K"; 4_300 → "4.3K". */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 100_000) return Math.round(n / 1000) + 'K'
  if (n >= 1_000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}
