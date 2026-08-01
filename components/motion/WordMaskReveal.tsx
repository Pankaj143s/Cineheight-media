'use client'

import { useMemo, useRef } from 'react'
import { useScrollScrub } from './useScrollScrub'
import { TRIGGER } from '@/lib/motionTokens'

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span'

/**
 * Word-by-word mask reveal scrubbed to scroll. `accent` optionally tints words;
 * `blur` resolves sharpness as each word arrives.
 */
export default function WordMaskReveal({
  text,
  as: Tag = 'h2',
  className = '',
  style,
  delay = 0,
  stagger = 0.045,
  duration = 0.9,
  amount: _amount = 0.25,
  blur = 0,
  accent,
  accentColor = 'var(--blue-500)',
  ...rest
}: {
  text: string
  as?: Tag
  className?: string
  style?: React.CSSProperties
  delay?: number
  stagger?: number
  duration?: number
  amount?: number
  /** Starting blur radius in px. 0 disables the filter entirely. */
  blur?: number
  accent?: string[]
  accentColor?: string
} & Omit<React.HTMLAttributes<HTMLElement>, 'style' | 'className' | 'color'>) {
  const rootRef = useRef<HTMLElement>(null)

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text])
  const accentSet = useMemo(
    () => new Set((accent ?? []).map((w) => w.toLowerCase().replace(/[.,—–:;!?']/g, ''))),
    [accent]
  )

  useScrollScrub(
    rootRef,
    (tl, trigger) => {
      const bands = trigger.querySelectorAll<HTMLElement>('[data-word-mask]')
      if (!bands.length) return
      tl.fromTo(
        bands,
        {
          y: '105%',
          autoAlpha: 0,
          ...(blur > 0 ? { filter: `blur(${blur}px)` } : null),
        },
        {
          y: 0,
          autoAlpha: 1,
          duration,
          stagger,
          ...(blur > 0 ? { filter: 'blur(0px)' } : null),
        },
        delay
      )
    },
    (trigger) => {
      trigger.querySelectorAll<HTMLElement>('[data-word-mask]').forEach((el) => {
        el.style.transform = 'none'
        el.style.opacity = '1'
        el.style.filter = 'none'
      })
    },
    { start: TRIGGER.headlineStart, end: 'top 42%', deps: [text, delay, stagger, duration, blur] }
  )

  return (
    <Tag ref={rootRef as React.Ref<never>} className={className} style={style} {...rest}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => {
          const isAccent = accentSet.has(word.toLowerCase().replace(/[.,—–:;!?']/g, ''))
          return (
            <span
              key={`${word}-${i}`}
              className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom"
            >
              <span
                data-word-mask
                className="inline-block will-change-transform"
                style={{
                  color: isAccent ? accentColor : undefined,
                  transform: 'translate3d(0,105%,0)',
                  opacity: 0,
                  filter: blur > 0 ? `blur(${blur}px)` : undefined,
                }}
              >
                {word}
              </span>
              {i < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          )
        })}
      </span>
    </Tag>
  )
}
