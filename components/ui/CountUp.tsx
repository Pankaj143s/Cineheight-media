'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Counts to a verified figure once, when it comes into view.
 *
 * The number is written straight into a text node from a rAF loop — no React
 * state per frame. Screen readers get the final value immediately via the
 * `sr-only` span, and reduced-motion users see it rendered outright with no
 * animation at all, so the figure is never withheld from anyone.
 */
export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  duration = 1500,
  className = '',
  style,
}: {
  /** The verified figure. Non-numeric strings render as-is. */
  value: string
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const numeric = Number(value)
  const animatable = Number.isFinite(numeric) && value.trim() !== ''

  useEffect(() => {
    const el = ref.current
    if (!el || !animatable || reduced) return

    let raf = 0
    let started = false
    // Preserve any decimal places the verified value carries.
    const decimals = (value.split('.')[1] ?? '').length

    const run = (start: number) => (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutExpo — fast authority, soft landing
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -9 * t)
      el.textContent = (numeric * eased).toFixed(decimals)
      if (t < 1) raf = requestAnimationFrame(run(start))
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true
          io.disconnect()
          raf = requestAnimationFrame((now) => run(now)(now))
        }
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [animatable, numeric, value, duration, reduced])

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
