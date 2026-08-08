'use client'

/**
 * One shared `ResizeObserver` on `document.body`, fanned out to subscribers.
 *
 * `useParallaxField` and `FlowThread` each used to run their own independent
 * `ResizeObserver(document.body)` — a single body resize (font swap, a
 * video's `loadedmetadata` changing layout) fired two separate full
 * DOM-measurement passes for no reason. This consolidates that into one
 * observer, created lazily on first subscriber and torn down when the last
 * one leaves — same shape as `lib/scrollSignal.ts`'s subscribe API.
 */

type Listener = () => void

let observer: ResizeObserver | null = null
const listeners = new Set<Listener>()

function ensureObserver() {
  if (observer || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(() => {
    listeners.forEach((listener) => listener())
  })
  observer.observe(document.body)
}

export function subscribeBodyResize(listener: Listener): () => void {
  listeners.add(listener)
  ensureObserver()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && observer) {
      observer.disconnect()
      observer = null
    }
  }
}
