'use client'

import { useInViewOnce } from './useInViewOnce'

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span'

/**
 * Letter-spacing settles from open to its resting value while the text fades
 * up. Nothing is split, so the element keeps its own accessible text — no
 * `aria-hidden` mirror needed. Good for short statements where a per-word
 * stagger would feel fussy.
 */
export default function TrackingReveal({
  children,
  as: Tag = 'p',
  className = '',
  style,
  from = '0.42em',
  to = '0.18em',
  delay = 0,
  duration = 1.2,
  amount = 0.3,
}: {
  children: React.ReactNode
  as?: Tag
  className?: string
  style?: React.CSSProperties
  from?: string
  to?: string
  delay?: number
  duration?: number
  amount?: number
}) {
  const { ref, shown, reduced } = useInViewOnce<HTMLElement>(amount)

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={className}
      style={{
        letterSpacing: shown ? to : from,
        opacity: shown ? 1 : 0,
        transform: shown ? 'translate3d(0,0,0)' : 'translate3d(0,8px,0)',
        transition: reduced
          ? 'none'
          : `letter-spacing ${duration}s cubic-bezier(0.16,1,0.3,1) ${delay}s,` +
            ` opacity ${duration * 0.6}s linear ${delay}s,` +
            ` transform ${duration}s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
