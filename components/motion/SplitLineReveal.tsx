'use client'

import { useRef } from 'react'
import { useScrollScrub } from './useScrollScrub'
import { TRIGGER } from '@/lib/motionTokens'

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span'

/**
 * Editorial line-mask reveal — each line rises out of its own clipping band.
 * Progress is scrubbed to scroll (forward and reverse).
 */
export default function SplitLineReveal({
  lines,
  srLabel,
  as: Tag = 'h2',
  className = '',
  style,
  delay = 0,
  stagger = 0.09,
  duration = 1,
  amount: _amount = 0.25,
  /** Extra downward travel in px — larger reads heavier/slower. */
  distance = '105%',
}: {
  lines: React.ReactNode[]
  srLabel: string
  as?: Tag
  className?: string
  style?: React.CSSProperties
  delay?: number
  stagger?: number
  duration?: number
  amount?: number
  distance?: string
}) {
  const rootRef = useRef<HTMLElement>(null)

  useScrollScrub(
    rootRef,
    (tl, trigger) => {
      const bands = trigger.querySelectorAll<HTMLElement>('[data-split-line]')
      if (!bands.length) return
      tl.fromTo(
        bands,
        { y: distance, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration, stagger },
        delay
      )
    },
    (trigger) => {
      trigger.querySelectorAll<HTMLElement>('[data-split-line]').forEach((el) => {
        el.style.transform = 'none'
        el.style.opacity = '1'
      })
    },
    { start: TRIGGER.headlineStart, end: 'top 42%', deps: [lines.length, delay, stagger, duration, distance] }
  )

  return (
    <Tag ref={rootRef as React.Ref<never>} className={className} style={style}>
      <span className="sr-only">{srLabel}</span>
      <span aria-hidden="true">
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
            <span
              data-split-line
              className="block will-change-transform"
              style={{ transform: `translate3d(0,${distance},0)`, opacity: 0 }}
            >
              {line}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  )
}
