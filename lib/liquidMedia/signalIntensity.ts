/**
 * Lightweight intensity bus for the continuum-signal connector.
 * Hero / work timelines write 0–1; FlowThread reads it as a stroke multiplier.
 */

type Listener = (value: number) => void

let intensity = 0
const listeners = new Set<Listener>()

export function setSignalIntensity(value: number) {
  const next = Math.max(0, Math.min(1, value))
  if (Math.abs(next - intensity) < 0.001) return
  intensity = next
  listeners.forEach((fn) => fn(intensity))
}

export function getSignalIntensity() {
  return intensity
}

export function subscribeSignalIntensity(fn: Listener) {
  listeners.add(fn)
  fn(intensity)
  return () => {
    listeners.delete(fn)
  }
}
