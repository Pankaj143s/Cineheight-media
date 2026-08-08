'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { useReducedMotionState } from '@/lib/useMediaPreferences'

/**
 * Counts to a verified figure in a bounded viewport-triggered interval (or
 * driven by `active`).
 *
 * Screen readers get the final value immediately via the `sr-only` span.
 * Reduced-motion users see the authored figure with no animation.
 *
 * Two modes:
 *  - **Self-triggered** (default). A short count begins once the metric is
 *    readable and never rewinds to a contradictory zero.
 *  - **Externally driven** (`active` supplied). Rising edge counts 0 → value;
 *    deactivating holds the final figure (never rewinds to 0) so Featured Work
 *    handoffs don't flash a zero result on the outgoing scene.
 */
export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  duration = 1500,
  className = '',
  style,
  active,
  once: _once = false,
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
   * External trigger. Leave undefined to scrub with the viewport;
   * supply a boolean to drive count-up on activate / hold on deactivate.
   */
  active?: boolean
  /** Kept for API compatibility. */
  once?: boolean
  playKey?: string | number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const rootRef = useRef<HTMLSpanElement>(null)
  const { reduced, ready: motionReady } = useReducedMotionState()
  const numeric = Number(value)
  const animatable = Number.isFinite(numeric) && value.trim() !== ''
  const willAnimate = motionReady && animatable && !reduced
  const externallyTriggered = active !== undefined
  const wasActiveRef = useRef(false)
  const proxyRef = useRef({ n: 0 })

  const writeFinal = () => {
    if (ref.current) ref.current.textContent = value
    proxyRef.current.n = numeric
  }

  useLayoutEffect(() => {
    if (!motionReady) return
    if (!animatable || reduced) {
      if (ref.current) ref.current.textContent = value
      return
    }
    // External mode starts at 0 until the first activate. Self-triggered
    // metrics use a meaningful baseline so a readable card never says `0+`.
    if (externallyTriggered) {
      if (!wasActiveRef.current && !active && ref.current) {
        const decimals = (value.split('.')[1] ?? '').length
        ref.current.textContent = (0).toFixed(decimals)
        proxyRef.current.n = 0
      }
      return
    }
    if (ref.current && ref.current.textContent === value) {
      const decimals = (value.split('.')[1] ?? '').length
      const minimum = decimals ? 1 / (10 ** decimals) : 1
      const baseline = Math.min(numeric, Math.max(minimum, numeric * 0.18))
      proxyRef.current.n = baseline
      ref.current.textContent = baseline.toFixed(decimals)
    }
  }, [animatable, motionReady, reduced, value, externallyTriggered, active, numeric])

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    const root = rootRef.current
    if (!el || !root || !willAnimate) return

    const decimals = (value.split('.')[1] ?? '').length
    const proxy = proxyRef.current

    const apply = () => {
      el.textContent = proxy.n.toFixed(decimals)
    }

    if (externallyTriggered) {
      const rising = Boolean(active) && !wasActiveRef.current
      const falling = !active && wasActiveRef.current
      wasActiveRef.current = Boolean(active)

      if (rising) {
        gsap.killTweensOf(proxy)
        proxy.n = 0
        apply()
        gsap.to(proxy, {
          n: numeric,
          duration: duration / 1000,
          ease: 'none',
          onUpdate: apply,
          onComplete: writeFinal,
        })
      } else if (falling) {
        // Hold the verified figure — never rewind to 0 on scene handoff.
        gsap.killTweensOf(proxy)
        writeFinal()
      }

      return () => {
        gsap.killTweensOf(proxy)
      }
    }

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        gsap.killTweensOf(proxy)
        gsap.to(proxy, {
          n: numeric,
          duration: Math.min(0.7, Math.max(0.45, duration / 1000)),
          ease: 'power3.out',
          onUpdate: apply,
          onComplete: writeFinal,
        })
      },
    })

    return () => {
      trigger.kill()
      gsap.killTweensOf(proxy)
      writeFinal()
    }
  }, [willAnimate, value, numeric, externallyTriggered, active, playKey, duration])

  return (
    <span ref={rootRef} data-count-up={value} className={className} style={style}>
      <span className="sr-only">
        {prefix}
        {value}
        {suffix}
      </span>
      <span aria-hidden="true">
        {prefix}
        <span ref={ref}>{value}</span>
        {suffix && <span style={{ color: 'var(--blue-500)' }}>{suffix}</span>}
      </span>
    </span>
  )
}
