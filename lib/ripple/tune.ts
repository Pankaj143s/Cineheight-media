/**
 * Live tuning values for the hero ripple.
 *
 * The render loop reads this object every frame, so a slider in the debug panel
 * changes the surface immediately without remounting the WebGL context (which
 * would lose the simulation state and make A/B comparison useless).
 *
 * In production nothing ever writes to it: the component seeds it from its tier
 * config and the panel is never mounted, so these are simply the tier's numbers
 * behind one indirection.
 */

export interface RippleTune {
  /** UV displacement applied to the refracted plate sample. */
  perturbance: number
  /** Height added by one drop, before speed and energy scaling. */
  dropStrength: number
  /** Drop radius, in simulation texels. */
  dropRadius: number
  /** Per-frame height decay. */
  damping: number
  /** Amplitude multiplier for the refractable detail layer. */
  detail: number
  /** Narrow crest highlight. */
  specular: number
  /** Directional rim along the wave face turned toward the key light. */
  rim: number
  /** Signed slope shading — brightens the lit face, darkens the back face. */
  shade: number
  /** Laplacian term — produces the concentric crest/trough banding. */
  caustic: number
  /** How far the surface normal is scaled before shading. */
  slope: number
  /** Idle auto-ripples. Off by default while cursor interaction is evaluated. */
  autoRipples: boolean
  /** 0 = normal render, 1 = visualise |grad| for slope calibration. */
  debugView: number
  /** Master on/off, toggled with "R" in dev for instant comparison. */
  enabled: boolean
}

type Listener = () => void

let current: RippleTune | null = null
const listeners = new Set<Listener>()

const emit = () => listeners.forEach((fn) => fn())

/** The live component publishes its tune object here on mount. */
export function registerTune(tune: RippleTune | null) {
  current = tune
  emit()
}

export function getTune(): RippleTune | null {
  return current
}

export function setTuneValue<K extends keyof RippleTune>(key: K, value: RippleTune[K]) {
  if (!current) return
  current[key] = value
  emit()
}

export function subscribeTune(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/**
 * Is the dev tuning panel wanted?
 *
 * Read from `location.search` rather than `useSearchParams()` on purpose:
 * the latter would opt the whole hero route into dynamic rendering, which is a
 * real production cost for a development affordance.
 */
export function debugRippleRequested(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('debugRipple') === '1'
}

/** Force the analytic fallback so it can actually be looked at in development. */
export function forceAnalyticRequested(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('rippleAnalytic') === '1'
}
