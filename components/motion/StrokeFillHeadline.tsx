'use client'

import { useRef } from 'react'
import { useScrollScrub } from './useScrollScrub'
import { TRIGGER } from '@/lib/motionTokens'

/**
 * A headline that starts as an outline and is filled by a signal sweep.
 * Outline → solid and the bright edge scrub with scroll.
 */
export default function StrokeFillHeadline({
  text,
  as: Tag = 'h2',
  className = '',
  style,
  /** Colour of the sweeping edge. Case studies pass the client accent. */
  accent = 'var(--blue-500)',
  delay = 0,
  amount: _amount = 0.3,
}: {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
  style?: React.CSSProperties
  accent?: string
  delay?: number
  amount?: number
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useScrollScrub(
    rootRef,
    (tl, trigger) => {
      const base = trigger.querySelector<HTMLElement>('[data-stroke-base]')
      const overlay = trigger.querySelector<HTMLElement>('[data-stroke-overlay]')
      if (base) {
        tl.fromTo(
          base,
          { color: 'transparent', webkitTextStroke: '1px rgba(220,238,255,0.5)' },
          { color: 'var(--text-100)', webkitTextStroke: '0px transparent', duration: 1 },
          delay
        )
      }
      if (overlay) {
        tl.fromTo(
          overlay,
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0 0 100%)', duration: 1 },
          delay
        )
      }
    },
    (trigger) => {
      const base = trigger.querySelector<HTMLElement>('[data-stroke-base]')
      const overlay = trigger.querySelector<HTMLElement>('[data-stroke-overlay]')
      if (base) {
        base.style.color = 'var(--text-100)'
        base.style.webkitTextStroke = '0px transparent'
      }
      if (overlay) overlay.style.clipPath = 'inset(0 0 0 100%)'
    },
    { start: TRIGGER.headlineStart, end: 'top 42%', deps: [text, delay, accent] }
  )

  return (
    <div ref={rootRef} className="relative">
      <Tag className={className} style={style}>
        <span
          data-stroke-base
          style={{
            display: 'block',
            color: 'transparent',
            WebkitTextStroke: '1px rgba(220,238,255,0.5)',
          }}
        >
          {text}
        </span>
      </Tag>

      <Tag
        aria-hidden="true"
        className={className}
        style={{ ...style, position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <span
          data-stroke-overlay
          style={{
            display: 'block',
            backgroundImage: `linear-gradient(90deg, ${accent} 0%, #DCEEFF 45%, ${accent} 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            clipPath: 'inset(0 100% 0 0)',
          }}
        >
          {text}
        </span>
      </Tag>
    </div>
  )
}
