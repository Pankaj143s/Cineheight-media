'use client'

import { useMemo } from 'react'
import { useInViewOnce } from './useInViewOnce'

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span'

/**
 * Word-by-word mask reveal. Calmer than a per-character stagger and it never
 * breaks a word across the animation, so long headings stay readable while
 * they arrive.
 *
 * `accent` optionally tints the given words (matched case-insensitively,
 * ignoring trailing punctuation) — used for the single blue word in a
 * statement, not for decoration.
 */
export default function WordMaskReveal({
  text,
  as: Tag = 'h2',
  className = '',
  style,
  delay = 0,
  stagger = 0.045,
  duration = 0.9,
  amount = 0.25,
  accent,
  accentColor = 'var(--blue-500)',
}: {
  text: string
  as?: Tag
  className?: string
  style?: React.CSSProperties
  delay?: number
  stagger?: number
  duration?: number
  amount?: number
  accent?: string[]
  accentColor?: string
}) {
  const { ref, shown, reduced } = useInViewOnce<HTMLElement>(amount)

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text])
  const accentSet = useMemo(
    () => new Set((accent ?? []).map((w) => w.toLowerCase().replace(/[.,—–:;!?]/g, ''))),
    [accent]
  )

  return (
    <Tag ref={ref as React.Ref<never>} className={className} style={style}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => {
          const isAccent = accentSet.has(word.toLowerCase().replace(/[.,—–:;!?]/g, ''))
          return (
            <span
              key={`${word}-${i}`}
              className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom"
            >
              <span
                className="inline-block will-change-transform"
                style={{
                  color: isAccent ? accentColor : undefined,
                  transform: shown ? 'translate3d(0,0,0)' : 'translate3d(0,105%,0)',
                  opacity: shown ? 1 : 0,
                  transition: reduced
                    ? 'none'
                    : `transform ${duration}s cubic-bezier(0.16,1,0.3,1) ${delay + i * stagger}s,` +
                      ` opacity ${duration * 0.6}s linear ${delay + i * stagger}s`,
                }}
              >
                {word}
              </span>
              {/* A real space between the clipping bands, so words never collide. */}
              {i < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          )
        })}
      </span>
    </Tag>
  )
}
