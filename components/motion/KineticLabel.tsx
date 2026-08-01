'use client'

import { useMemo, useRef } from 'react'
import { useScrollScrub } from './useScrollScrub'
import { STAGGER_S, TRIGGER } from '@/lib/motionTokens'

/**
 * The small transition line ("SELECTED WORK", "CLIENT STORIES"). Characters
 * and the hairline rule scrub with scroll — down reveals, up rewinds.
 *
 * Accessibility: the label text is exposed once via `sr-only`; the per-character
 * spans are `aria-hidden`.
 */
export default function KineticLabel({
  text,
  className = '',
  style,
  delay = 0,
  amount: _amount = 0.4,
  /** Draw a short rule before the text — the thread arriving at the label. */
  rule = true,
  color = 'var(--blue-400)',
}: {
  text: string
  className?: string
  style?: React.CSSProperties
  delay?: number
  amount?: number
  rule?: boolean
  color?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  const words = useMemo(() => {
    let index = 0
    return text.split(' ').map((word, w) => ({
      key: `${w}-${word}`,
      chars: Array.from(word).map((ch) => ({ ch, i: index++ })),
    }))
  }, [text])

  useScrollScrub(
    rootRef,
    (tl, trigger) => {
      const ruleEl = trigger.querySelector<HTMLElement>('[data-kinetic-rule]')
      const chars = trigger.querySelectorAll<HTMLElement>('[data-kinetic-char]')
      if (ruleEl) {
        tl.fromTo(ruleEl, { scaleX: 0 }, { scaleX: 1, duration: 0.35 }, delay)
      }
      if (chars.length) {
        tl.fromTo(
          chars,
          { autoAlpha: 0, y: '0.5em' },
          { autoAlpha: 1, y: 0, duration: 0.45, stagger: STAGGER_S.char },
          delay + 0.12
        )
      }
    },
    (trigger) => {
      const ruleEl = trigger.querySelector<HTMLElement>('[data-kinetic-rule]')
      const chars = trigger.querySelectorAll<HTMLElement>('[data-kinetic-char]')
      if (ruleEl) ruleEl.style.transform = 'scaleX(1)'
      chars.forEach((el) => {
        el.style.opacity = '1'
        el.style.transform = 'none'
      })
    },
    { start: TRIGGER.headlineStart, end: 'top 48%', deps: [text, delay, rule] }
  )

  return (
    <div ref={rootRef} className={`flex items-center gap-3 ${className}`} style={style}>
      {rule && (
        <span
          data-kinetic-rule
          aria-hidden="true"
          className="h-px shrink-0 origin-left"
          style={{
            width: 34,
            background: color,
            transform: 'scaleX(0)',
          }}
        />
      )}
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        className="font-display text-[11px] font-medium uppercase"
        style={{ letterSpacing: '0.32em', color }}
      >
        {words.map((word, w) => (
          <span key={word.key} style={{ whiteSpace: 'nowrap' }}>
            {word.chars.map(({ ch, i }) => (
              <span
                key={i}
                data-kinetic-char
                className="inline-block"
                style={{ opacity: 0, transform: 'translate3d(0,0.5em,0)' }}
              >
                {ch}
              </span>
            ))}
            {w < words.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </div>
  )
}
