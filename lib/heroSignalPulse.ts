/**
 * Tiny shared pub/sub for the hero handshake's contact moment.
 * HeroIntroSequence fires one pulse when the hands clasp; HeroSignalGrid
 * answers with an expanding brightness ring. Mirrors `lib/heroProgress.ts`.
 */

type Listener = () => void

const listeners = new Set<Listener>()

export function emitSignalPulse() {
  listeners.forEach((fn) => fn())
}

export function subscribeSignalPulse(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
