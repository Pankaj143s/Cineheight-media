'use client'

import { useEffect, useRef } from 'react'
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
 *  - **Externally triggered** (`active` supplied). The observer is never
 *    created and the count starts on the first `false → true` edge. This exists
 *    because of the homepage Selected Work sequence: its three copy blocks are
 *    all mounted at once inside a sticky stage and merely faded between, so an
 *    observer would fire all three metrics the moment the section appeared,
 *    long before the visitor reaches the second and third projects.
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

  /**
   * Which trigger this instance uses, fixed at mount. A component whose parent
   * re-renders with `active` flipping between defined and undefined must not
   * tear down and rebuild its observer mid-count.
   */
  const externallyTriggered = useRef(active !== undefined).current
  const hasRun = useRef(false)
  const rafRef = useRef(0)

  // Re-arm when the caller changes the play key.
  useEffect(() => {
    if (once) return
    hasRun.current = false
  }, [once, playKey])

  useEffect(() => {
    const el = ref.current
    if (!el || !animatable || reduced) return

    // Preserve any decimal places the verified value carries.
    const decimals = (value.split('.')[1] ?? '').length

    const start = () => {
      if (hasRun.current) return
      hasRun.current = true
      const began = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - began) / duration)
        // easeOutExpo — fast authority, soft landing
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -9 * t)
        el.textContent = (numeric * eased).toFixed(decimals)
        if (t < 1) rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }

    if (externallyTriggered) {
      if (active) start()
      return () => cancelAnimationFrame(rafRef.current)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect()
          start()
        }
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [active, animatable, duration, externallyTriggered, numeric, reduced, value])

  return (
    <span className={className} style={style}>
      <span className="sr-only">
        {prefix}
        {value}
        {suffix}
      </span>
      <span aria-hidden="true">
        {prefix}
        <span ref={ref}>{animatable && !reduced ? '0' : value}</span>
        {suffix && <span style={{ color: 'var(--blue-500)' }}>{suffix}</span>}
      </span>
    </span>
  )
}
