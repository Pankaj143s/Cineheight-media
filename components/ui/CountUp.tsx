'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { useReducedMotionState } from '@/lib/useMediaPreferences'
import { SCRUB, TRIGGER } from '@/lib/motionTokens'

/**
 * Counts to a verified figure scrubbed to scroll (or driven by `active`).
 *
 * Screen readers get the final value immediately via the `sr-only` span.
 * Reduced-motion users see the authored figure with no animation.
 *
 * Two modes:
 *  - **Self-scrubbing** (default). ScrollTrigger maps viewport travel → value.
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
  /** Kept for API compatibility — scrub always rewinds with scroll. */
  once?: boolean
  playKey?: string | number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const rootRef = useRef<HTMLSpanElement>(null)
  const { reduced, ready: motionReady } = useReducedMotionState()
  const numeric = Number(value)
  const animatable = Number.isFinite(numeric) && value.trim() !== ''
  const willAnimate = motionReady && animatable && !reduced
  const externallyTriggered = useRef(active !== undefined).current
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
    // External mode starts at 0 until the first activate; self-scrub zeros
    // only when still showing the authored SSR string.
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
      ref.current.textContent = (0).toFixed(decimals)
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

    proxy.n = 0
    apply()

    const tween = gsap.to(proxy, {
      n: numeric,
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        start: TRIGGER.headlineStart,
        end: 'top 48%',
        scrub: SCRUB.text,
      },
      onUpdate: apply,
      onComplete: writeFinal,
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [willAnimate, value, numeric, externallyTriggered, active, playKey, duration])

  return (
    <span ref={rootRef} className={className} style={style}>
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
