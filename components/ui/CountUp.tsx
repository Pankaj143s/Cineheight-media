'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Counts to a verified figure once.
 *
 * The number is written straight into a text node from a rAF loop — no React
 * state per frame. Screen readers get the final value immediately via the
 * `sr-only` span, and reduced-motion users see it rendered outright with no
 * animation at all, so the figure is never withheld from anyone.
 *
 * Two trigger modes:
 *
 *  - **Self-triggering** (default). An IntersectionObserver starts the count
 *    when the element is half on screen. Right for a figure that scrolls past
 *    in normal document flow.
 *  - **Externally triggered** (`active` supplied). The observer is never used
 *    as a trigger and the count starts on the first `false → true` edge. This
 *    exists because of the homepage Selected Work sequence: its three copy
 *    blocks are all mounted at once inside a sticky stage and merely faded
 *    between, so an observer would fire all three metrics the moment the
 *    section appeared, long before the visitor reaches the second and third.
 *
 * ── Why the lifecycle is shaped the way it is ────────────────────────────────
 *
 * The verified figure is the point of this component, so the design rule is:
 * *every* failure path ends with the real number on screen, never a zero.
 *
 *  1. The rendered markup contains the real value. It is zeroed in a layout
 *     effect, before paint — so if JavaScript never runs, or the module fails
 *     to load, the figure is simply there rather than stuck at 0.
 *  2. "Already ran" is latched only when a run *completes*. Latching it when a
 *     run *starts* was the original bug: React Strict Mode invokes the effect,
 *     cancels it, and re-invokes it, so the cancelled first run consumed the
 *     one permitted run and the element kept its literal "0" forever.
 *  3. Cancelling never leaves a partial figure behind permanently — being
 *     deactivated mid-count writes the final value immediately.
 *  4. A failsafe timer armed alongside each run writes the final value if that
 *     run has not completed in time (a stalled rAF, a backgrounded tab that
 *     never returns focus, an observer that never fires).
 *  5. If the observer cannot be constructed at all, the final value is written
 *     on the spot.
 */
export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  duration = 1500,
  className = '',
  style,
  active,
  once = true,
  playKey,
}: {
  /** The verified figure. Non-numeric strings render as-is. */
  value: string
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
  style?: React.CSSProperties
  /**
   * External trigger. Leave undefined to use the built-in viewport observer;
   * supply a boolean to take over entirely.
   */
  active?: boolean
  /** Run at most once for the life of the component. Default true. */
  once?: boolean
  /** With `once: false`, changing this re-arms the count. */
  playKey?: string | number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const numeric = Number(value)
  const animatable = Number.isFinite(numeric) && value.trim() !== ''
  const willAnimate = animatable && !reduced

  /**
   * Which trigger this instance uses, fixed at mount. A component whose parent
   * re-renders with `active` flipping between defined and undefined must not
   * tear down and rebuild its observer mid-count.
   */
  const externallyTriggered = useRef(active !== undefined).current

  /** A run finished and wrote the final value. Set on completion only. */
  const doneRef = useRef(false)
  /** A run is in flight right now. */
  const runningRef = useRef(false)
  const rafRef = useRef(0)
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const writeFinal = useCallback(() => {
    if (ref.current) ref.current.textContent = value
    doneRef.current = true
    runningRef.current = false
  }, [value])

  /**
   * Zero the figure before the browser paints, so the count always begins from
   * 0 without the real value flashing first. Deliberately a layout effect and
   * deliberately not part of the render output: the markup React produces (and
   * the server sends) carries the true figure, which is what a visitor sees if
   * this effect never runs.
   */
  useLayoutEffect(() => {
    if (!willAnimate || doneRef.current) return
    const decimals = (value.split('.')[1] ?? '').length
    if (ref.current) ref.current.textContent = (0).toFixed(decimals)
  }, [willAnimate, value])

  // Re-arm when the caller changes the play key.
  useEffect(() => {
    if (once) return
    doneRef.current = false
  }, [once, playKey])

  useEffect(() => {
    const el = ref.current
    if (!el || !willAnimate) return

    // Preserve any decimal places the verified value carries.
    const decimals = (value.split('.')[1] ?? '').length

    const clearFailsafe = () => {
      if (failsafeRef.current !== undefined) {
        clearTimeout(failsafeRef.current)
        failsafeRef.current = undefined
      }
    }

    const start = () => {
      if (runningRef.current) return
      if (once && doneRef.current) return
      runningRef.current = true

      const began = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - began) / duration)
        // easeOutExpo — fast authority, soft landing
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -9 * t)
        if (t < 1) {
          el.textContent = (numeric * eased).toFixed(decimals)
          rafRef.current = requestAnimationFrame(step)
          return
        }
        // Land on the authored string, not a re-formatted float.
        clearFailsafe()
        writeFinal()
      }
      rafRef.current = requestAnimationFrame(step)

      // If that run does not land — a stalled frame loop, a tab backgrounded
      // through the whole animation — the figure still resolves.
      clearFailsafe()
      failsafeRef.current = setTimeout(() => {
        if (doneRef.current) return
        cancelAnimationFrame(rafRef.current)
        writeFinal()
      }, duration + 1200)
    }

    if (externallyTriggered) {
      if (active) {
        start()
      } else if (runningRef.current) {
        // Deactivated mid-count (a fast scrub past this scene). Resolve to the
        // real figure rather than freezing on a partial one.
        cancelAnimationFrame(rafRef.current)
        clearFailsafe()
        writeFinal()
      }
      return () => {
        cancelAnimationFrame(rafRef.current)
        clearFailsafe()
        // NOT `doneRef` — an interrupted run must be allowed to run again.
        runningRef.current = false
      }
    }

    let io: IntersectionObserver
    try {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            io.disconnect()
            start()
          }
        },
        { threshold: 0.5 }
      )
    } catch {
      // No observer available — show the verified figure rather than a zero.
      writeFinal()
      return
    }
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(rafRef.current)
      clearFailsafe()
      runningRef.current = false
    }
  }, [active, duration, externallyTriggered, numeric, once, value, willAnimate, writeFinal])

  return (
    <span className={className} style={style}>
      <span className="sr-only">
        {prefix}
        {value}
        {suffix}
      </span>
      <span aria-hidden="true">
        {prefix}
        {/* Renders the true figure; the layout effect above zeroes it when a
            count is actually going to happen. */}
        <span ref={ref}>{value}</span>
        {suffix && <span style={{ color: 'var(--blue-500)' }}>{suffix}</span>}
      </span>
    </span>
  )
}
