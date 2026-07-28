export interface ManagedFrameLoop {
  wake: () => void
  sleep: () => void
  destroy: () => void
  isRunning: () => boolean
}

export interface ManagedFrameOptions {
  /** Stop automatically when the callback returns false. */
  stopOnFalse?: boolean
  /** Keep the loop asleep while this predicate is false. */
  canRun?: () => boolean
}

export type ManagedFrameCallback = (now: number, deltaMs: number) => boolean | void

/**
 * A small event-driven rAF controller for local decorative motion. Callers
 * wake it from pointer/scroll/intersection events and return false once their
 * values have converged. It also sleeps while the document is hidden.
 */
export function createManagedFrameLoop(
  callback: ManagedFrameCallback,
  options: ManagedFrameOptions = {}
): ManagedFrameLoop {
  let frameId = 0
  let running = false
  let destroyed = false
  let previous = 0
  let resumeOnVisible = false

  const sleep = () => {
    resumeOnVisible = false
    running = false
    if (frameId) cancelAnimationFrame(frameId)
    frameId = 0
  }

  const frame = (now: number) => {
    if (destroyed || document.hidden || options.canRun?.() === false) {
      if (document.hidden && running) resumeOnVisible = true
      running = false
      if (frameId) cancelAnimationFrame(frameId)
      frameId = 0
      return
    }
    /*
     * `previous` is stamped with performance.now() inside wake(), but `now` is
     * the rAF timestamp — the START of the frame being serviced. When wake() is
     * called from an event handler that runs after that frame began, the
     * timestamp is EARLIER than the stamp, and `now - previous` comes out
     * negative. A negative delta inverts every `1 - Math.exp(-dt / tau)`
     * smoothing factor in every consumer, so eased values run away from their
     * target instead of toward it. Clamp to a sane frame budget at both ends.
     */
    const deltaMs = previous ? Math.min(50, Math.max(0, now - previous)) : 16.7
    previous = now
    const keepRunning = callback(now, deltaMs)
    if (options.stopOnFalse !== false && keepRunning === false) {
      sleep()
      return
    }
    frameId = requestAnimationFrame(frame)
  }

  const wake = () => {
    if (destroyed || running || document.hidden || options.canRun?.() === false) return
    running = true
    previous = performance.now()
    frameId = requestAnimationFrame(frame)
  }

  const onVisibility = () => {
    if (document.hidden) {
      resumeOnVisible = running
      running = false
      if (frameId) cancelAnimationFrame(frameId)
      frameId = 0
    } else if (resumeOnVisible) {
      resumeOnVisible = false
      wake()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  return {
    wake,
    sleep,
    isRunning: () => running,
    destroy: () => {
      destroyed = true
      sleep()
      document.removeEventListener('visibilitychange', onVisibility)
    },
  }
}
