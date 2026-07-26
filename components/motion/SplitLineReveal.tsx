'use client'

import { useInViewOnce } from './useInViewOnce'

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span'

/**
 * Editorial line-mask reveal — each line rises out of its own clipping band.
 * The reserved use for major headings.
 *
 * Accessibility: `srLabel` is the one clean string a screen reader gets; the
 * animated line spans are `aria-hidden`. Reduced motion paints the finished
 * state on first render (see `useInViewOnce`).
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
  amount = 0.25,
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
  const { ref, shown, reduced } = useInViewOnce<HTMLElement>(amount)

  return (
    <Tag ref={ref as React.Ref<never>} className={className} style={style}>
      <span className="sr-only">{srLabel}</span>
      <span aria-hidden="true">
        {lines.map((line, i) => (
          // The band clips; `pb`/`-mb` give descenders room without adding
          // visible leading, so nothing is sliced off the bottom of a `g` or `y`.
          <span key={i} className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
            <span
              className="block will-change-transform"
              style={{
                transform: shown ? 'translate3d(0,0,0)' : `translate3d(0,${distance},0)`,
                opacity: shown ? 1 : 0,
                transition: reduced
                  ? 'none'
                  : `transform ${duration}s cubic-bezier(0.16,1,0.3,1) ${delay + i * stagger}s,` +
                    ` opacity ${duration * 0.7}s linear ${delay + i * stagger}s`,
              }}
            >
              {line}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  )
}
