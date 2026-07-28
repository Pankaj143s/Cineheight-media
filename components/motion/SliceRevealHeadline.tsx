'use client'

import { useInViewOnce } from './useInViewOnce'
import { DURATION_MS, EASE_SIGNAL, STAGGER_S } from '@/lib/motionTokens'

/**
 * A headline that resolves from horizontal slices.
 *
 * The same words are stacked N times, each clipped to a horizontal band of the
 * glyphs. The bands enter from small alternating offsets and settle into one
 * clean heading — the letters appear to reassemble rather than to glitch.
 *
 * Deliberately restrained: offsets stay in the 8–18px range, nothing rotates,
 * nothing flickers, and every band lands on exactly the same final position, so
 * there is no residual seam. Screen readers get one clean string from the
 * `sr-only` copy; every visual band is `aria-hidden`.
 */
export default function SliceRevealHeadline({
  text,
  as: Tag = 'h2',
  className = '',
  style,
  /** 3–5 reads best. More bands stop being legible as slicing. */
  slices = 4,
  delay = 0,
  amount = 0.3,
}: {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
  style?: React.CSSProperties
  slices?: number
  delay?: number
  amount?: number
}) {
  const { ref, shown, reduced } = useInViewOnce<HTMLDivElement>(amount)
  const count = Math.max(2, Math.min(6, slices))
  const duration = DURATION_MS.reveal

  return (
    <div ref={ref} className="relative">
      <span className="sr-only">{text}</span>

      {/*
        The first band is in normal flow so the element keeps its real height;
        the rest are absolutely positioned on top of it.
      */}
      {Array.from({ length: count }, (_, i) => {
        const top = (i / count) * 100
        const bottom = 100 - ((i + 1) / count) * 100
        const offset = (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 5)

        return (
          <Tag
            key={i}
            aria-hidden="true"
            className={className}
            style={{
              ...style,
              ...(i === 0
                ? {}
                : { position: 'absolute', inset: 0, pointerEvents: 'none' }),
              clipPath: `inset(${top}% 0 ${bottom}% 0)`,
              transform: shown || reduced ? 'translateX(0)' : `translateX(${offset}px)`,
              opacity: shown || reduced ? 1 : 0,
              transition: reduced
                ? 'none'
                : `transform ${duration}ms ${EASE_SIGNAL} ${delay + i * STAGGER_S.line * 500}ms,` +
                  ` opacity ${duration}ms ${EASE_SIGNAL} ${delay + i * STAGGER_S.line * 500}ms`,
            }}
          >
            {text}
          </Tag>
        )
      })}
    </div>
  )
}
