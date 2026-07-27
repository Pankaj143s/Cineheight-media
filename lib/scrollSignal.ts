export interface ScrollSignalSnapshot {
  y: number
  progress: number
  velocity: number
  direction: -1 | 0 | 1
}

type ScrollSignalListener = (snapshot: Readonly<ScrollSignalSnapshot>) => void

const snapshot: ScrollSignalSnapshot = {
  y: 0,
  progress: 0,
  velocity: 0,
  direction: 0,
}

const listeners = new Set<ScrollSignalListener>()

export function readScrollSignal(): Readonly<ScrollSignalSnapshot> {
  return snapshot
}

export function subscribeScrollSignal(listener: ScrollSignalListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Written only by SmoothScrollProvider; consumers use the read/subscribe API. */
export function publishScrollSignal(next: ScrollSignalSnapshot): void {
  snapshot.y = next.y
  snapshot.progress = next.progress
  snapshot.velocity = next.velocity
  snapshot.direction = next.direction
  listeners.forEach((listener) => listener(snapshot))
}
