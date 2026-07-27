'use client'

import { useMemo } from 'react'
import { useInViewOnce } from './useInViewOnce'

/**
 * The small transition line ("SELECTED WORK", "CLIENT STORIES"). Characters
 * arrive on a tight stagger and a hairline draws out beside them, so the label
 * reads as part of the signal rather than as a section eyebrow sitting above a
 * block.
 *
 * Accessibility: the label text is exposed once via `sr-only`; the per-character
 * spans are `aria-hidden` (a screen reader must never spell out "S E L E C T E D").
 */
export default function KineticLabel({
  text,
  className = '',
  style,
  delay = 0,
  amount = 0.4,
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
  const { ref, shown, reduced } = useInViewOnce<HTMLDivElement>(amount)

  /**
   * Split into WORDS first, then characters inside each word.
   *
   * Every character is an inline-block and the browser may break a line between
   * any two inline-blocks — which is exactly what produced fragments like
   * "CAMP / AIGN SYSTE / MS" and "SHOR / T-FORM". Wrapping each word in a
   * `nowrap` span makes words atomic again, so a label can only break at a real
   * space. A running index keeps the stagger continuous across word boundaries.
   */
  const words = useMemo(() => {
    let index = 0
    return text.split(' ').map((word, w) => ({
      key: `${w}-${word}`,
      chars: Array.from(word).map((ch) => ({ ch, i: index++ })),
    }))
  }, [text])

  return (
    <div ref={ref} className={`flex items-center gap-3 ${className}`} style={style}>
      {rule && (
        <span
          aria-hidden="true"
          className="h-px shrink-0 origin-left"
          style={{
            width: 34,
            background: color,
            transform: shown ? 'scaleX(1)' : 'scaleX(0)',
            transition: reduced ? 'none' : `transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
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
                className="inline-block"
                style={{
                  opacity: shown ? 1 : 0,
                  transform: shown ? 'translate3d(0,0,0)' : 'translate3d(0,0.5em,0)',
                  transition: reduced
                    ? 'none'
                    : `opacity 0.5s linear ${delay + 0.18 + i * 0.022}s,` +
                      ` transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay + 0.18 + i * 0.022}s`,
                }}
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
