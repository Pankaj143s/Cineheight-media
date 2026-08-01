'use client'

import { useRef } from 'react'
import { useScrollScrub } from './useScrollScrub'
import { TRIGGER } from '@/lib/motionTokens'

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span'

/**
 * Letter-spacing settles from open to its resting value while the text fades
 * up — scrubbed to scroll.
 */
export default function TrackingReveal({
  children,
  as: Tag = 'p',
  className = '',
  style,
  from = '0.42em',
  to = '0.18em',
  delay = 0,
  duration = 1.2,
  amount: _amount = 0.3,
}: {
  children: React.ReactNode
  as?: Tag
  className?: string
  style?: React.CSSProperties
  from?: string
  to?: string
  delay?: number
  duration?: number
  amount?: number
}) {
  const rootRef = useRef<HTMLElement>(null)

  useScrollScrub(
    rootRef,
    (tl, trigger) => {
      tl.fromTo(
        trigger,
        { letterSpacing: from, autoAlpha: 0, y: 8 },
        { letterSpacing: to, autoAlpha: 1, y: 0, duration },
        delay
      )
    },
    (trigger) => {
      trigger.style.letterSpacing = to
      trigger.style.opacity = '1'
      trigger.style.transform = 'none'
    },
    { start: TRIGGER.headlineStart, end: 'top 48%', deps: [from, to, delay, duration] }
  )

  return (
    <Tag
      ref={rootRef as React.Ref<never>}
      className={className}
      style={{
        letterSpacing: from,
        opacity: 0,
        transform: 'translate3d(0,8px,0)',
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
