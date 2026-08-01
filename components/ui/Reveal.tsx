'use client'

import { useRef } from 'react'
import { useScrollScrub } from '@/components/motion/useScrollScrub'
import { TRIGGER } from '@/lib/motionTokens'

type Variant = 'fade-up' | 'fade' | 'mask-up' | 'line-draw'

/**
 * Shared entrance primitive — opacity/transform scrubbed to scroll.
 * Reduced motion: content renders in its completed state immediately.
 */
export default function Reveal({
  children,
  variant = 'fade-up',
  delay = 0,
  amount: _amount = 0.3,
  as: Tag = 'div',
  className = '',
  style,
}: {
  children: React.ReactNode
  variant?: Variant
  delay?: number
  /** Kept for API compatibility; scrub window uses TRIGGER tokens. */
  amount?: number
  as?: 'div' | 'li' | 'span' | 'p' | 'figure' | 'header'
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLElement>(null)

  const from =
    variant === 'fade'
      ? { autoAlpha: 0 }
      : variant === 'mask-up'
        ? { autoAlpha: 0, y: '100%' }
        : variant === 'line-draw'
          ? { scaleX: 0, transformOrigin: 'left center' }
          : { autoAlpha: 0, y: 28 }

  const to =
    variant === 'line-draw'
      ? { scaleX: 1, duration: 1 }
      : { autoAlpha: 1, y: 0, duration: 1 }

  useScrollScrub(
    ref,
    (tl, trigger) => {
      tl.fromTo(trigger, from, to, delay)
    },
    (trigger) => {
      trigger.style.opacity = '1'
      trigger.style.transform = 'none'
    },
    { start: TRIGGER.headlineStart, end: 'top 48%', deps: [variant, delay] }
  )

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={className}
      style={{
        opacity: variant === 'line-draw' ? 1 : 0,
        transform: variant === 'fade-up' ? 'translateY(28px)' : variant === 'mask-up' ? 'translateY(100%)' : variant === 'line-draw' ? 'scaleX(0)' : undefined,
        transformOrigin: variant === 'line-draw' ? 'left center' : undefined,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
