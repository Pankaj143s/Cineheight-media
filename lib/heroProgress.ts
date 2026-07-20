/**
 * Tiny shared store for hero scroll progress (0–1).
 * HeroSection writes it from its ScrollTrigger; Navbar (and later the
 * ContinuityStage) subscribe without any React re-render per frame.
 */

type Listener = (progress: number) => void

let progress = 0
const listeners = new Set<Listener>()

export function setHeroProgress(value: number) {
  progress = value
  listeners.forEach((fn) => fn(value))
}

export function getHeroProgress() {
  return progress
}

export function subscribeHeroProgress(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
