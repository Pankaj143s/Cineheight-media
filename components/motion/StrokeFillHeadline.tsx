'use client'

import { useInViewOnce } from './useInViewOnce'
import { DURATION_MS, EASE_SIGNAL } from '@/lib/motionTokens'

/**
 * A headline that starts as an outline and is filled by a signal sweep.
 *
 * Two stacked copies of the same words: a restrained stroked base, and a solid
 * overlay revealed left-to-right behind a narrow bright edge. The sweep is the
 * point — it reads as the brand signal writing the statement rather than as
 * text fading in.
 *
 * Reserved for ONE major statement per route. An outline is harder to read than
 * solid type, so the finished state is always solid white and the outline only
 * ever exists mid-animation. Reduced motion and the observer failsafe both land
 * straight on the finished state.
 *
 * Only the base copy carries the real text for assistive technology; the
 * overlay is `aria-hidden`, so a screen reader gets one clean string.
 */
export default function StrokeFillHeadline({
  text,
  as: Tag = 'h2',
  className = '',
  style,
  /** Colour of the sweeping edge. Case studies pass the client accent. */
  accent = 'var(--blue-500)',
  delay = 0,
  amount = 0.3,
}: {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
  style?: React.CSSProperties
  accent?: string
  delay?: number
  amount?: number
}) {
  const { ref, shown, reduced } = useInViewOnce<HTMLDivElement>(amount)
  const duration = reduced ? 0 : DURATION_MS.revealLong

  return (
    <div ref={ref} className="relative">
      <Tag className={className} style={style}>
        {/* Base: the accessible copy. Outlined until the fill arrives. */}
        <span
          style={{
            display: 'block',
            color: shown ? 'var(--text-100)' : 'transparent',
            WebkitTextStroke: shown ? '0px transparent' : '1px rgba(220,238,255,0.5)',
            transition: reduced
              ? 'none'
              : `color ${duration}ms ${EASE_SIGNAL} ${delay}ms, -webkit-text-stroke ${duration}ms ${EASE_SIGNAL} ${delay}ms`,
          }}
        >
          {text}
        </span>
      </Tag>

      {/* Overlay: the travelling bright edge. Purely decorative. */}
      <Tag
        aria-hidden="true"
        className={className}
        style={{ ...style, position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <span
          style={{
            display: 'block',
            backgroundImage: `linear-gradient(90deg, ${accent} 0%, #DCEEFF 45%, ${accent} 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            // A narrow band travels across, then clears — the words are left
            // solid rather than permanently tinted.
            clipPath: shown ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)',
            transition: reduced ? 'none' : `clip-path ${duration}ms ${EASE_SIGNAL} ${delay}ms`,
          }}
        >
          {text}
        </span>
      </Tag>
    </div>
  )
}
