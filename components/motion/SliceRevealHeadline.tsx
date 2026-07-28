'use client'

import type { CSSProperties, Ref } from 'react'
import { useInViewOnce } from './useInViewOnce'
import { DURATION_MS, EASE_SIGNAL, STAGGER_S } from '@/lib/motionTokens'

/**
 * A headline that resolves from horizontal slices.
 *
 * ONE heading element. Inside it, an invisible in-flow copy establishes the
 * real height and the real line breaks, and N absolutely positioned copies —
 * each clipped to a horizontal band of the glyphs — enter from small
 * alternating offsets and settle onto it.
 *
 * The earlier version stamped out N copies of the heading TAG itself, so a
 * caller passing `className="mt-6"` got that margin N times over: the in-flow
 * copy sat 6 units lower than the absolute ones, which is why the slices came
 * apart. It also meant `/work` shipped four `<h1>` elements, each of which the
 * automatic parallax field (`main h1, main h2`) then treated as a separate
 * heading and moved independently.
 *
 * Here `className`, `style`, the margin and the observer ref are applied
 * exactly once. The slice spans are `position: absolute; inset: 0` children of
 * the heading, so their inline size IS the heading's content box — the same box
 * the sizing copy wraps against — and they inherit its font, line-height and
 * letter-spacing. Their bounds and wrapping cannot diverge at any viewport.
 *
 * Screen readers get one clean string from the `sr-only` copy; every visual
 * band is `aria-hidden`.
 */
/** How far each band reaches past its own edge, as a % of heading height. */
const SLICE_OVERLAP_PCT = 1.5

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
  style?: CSSProperties
  slices?: number
  delay?: number
  amount?: number
}) {
  const { ref, shown, reduced } = useInViewOnce<HTMLHeadingElement>(amount)
  const count = Math.max(2, Math.min(6, slices))
  const duration = DURATION_MS.reveal
  const settled = shown || reduced

  return (
    <Tag ref={ref as Ref<HTMLHeadingElement>} className={className} style={{ ...style, position: 'relative' }}>
      <span className="sr-only">{text}</span>

      {/* Owns the height and the line breaks; never painted. */}
      <span aria-hidden="true" style={{ visibility: 'hidden' }}>
        {text}
      </span>

      {Array.from({ length: count }, (_, i) => {
        const top = (i / count) * 100
        // Bands must OVERLAP, not merely abut. Two `clip-path` edges meeting on
        // the same row each antialias to about half coverage, so the row
        // composites short of opaque and a grey hairline runs through every
        // glyph in the finished heading. Extending each band a little past its
        // own edge puts opaque pixels under the next band's soft top edge.
        const bottom = Math.max(0, 100 - ((i + 1) / count) * 100 - SLICE_OVERLAP_PCT)
        const offset = (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 5)
        const stagger = delay + i * STAGGER_S.line * 500

        return (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              clipPath: `inset(${top}% 0 ${bottom}% 0)`,
              transform: settled ? 'translateX(0)' : `translateX(${offset}px)`,
              opacity: settled ? 1 : 0,
              transition: reduced
                ? 'none'
                : `transform ${duration}ms ${EASE_SIGNAL} ${stagger}ms,` +
                  ` opacity ${duration}ms ${EASE_SIGNAL} ${stagger}ms`,
            }}
          >
            {text}
          </span>
        )
      })}
    </Tag>
  )
}
