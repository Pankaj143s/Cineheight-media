'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/useMediaPreferences'

type Variant = 'fade-up' | 'fade' | 'mask-up' | 'line-draw'

/**
 * One shared entrance primitive so the page doesn't accumulate five competing
 * reveal systems (spec §12). IO-triggered CSS transition — no per-frame JS.
 * Reduced motion: content renders in its completed state immediately (never a
 * hidden element with a zero-duration animation).
 */
export default function Reveal({
  children,
  variant = 'fade-up',
  delay = 0,
  amount = 0.3,
  as: Tag = 'div',
  className = '',
  style,
}: {
  children: React.ReactNode
  variant?: Variant
  delay?: number
  /** Intersection ratio that triggers the reveal */
  amount?: number
  as?: 'div' | 'li' | 'span' | 'p' | 'figure' | 'header'
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (reduced) {
      setShown(true)
      return
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= amount || entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: Math.min(amount, 0.98) }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [amount, reduced])

  const hidden: Record<Variant, React.CSSProperties> = {
    'fade-up': { opacity: 0, transform: 'translateY(28px)' },
    fade: { opacity: 0 },
    'mask-up': { opacity: 0, transform: 'translateY(100%)' },
    'line-draw': { transform: 'scaleX(0)', transformOrigin: 'left center' },
  }

  const base: React.CSSProperties =
    reduced || shown
      ? { opacity: 1, transform: 'none' }
      : hidden[variant]

  return (
    <Tag
      // polymorphic tag keeps the DOM semantic; ref covariance is safe here
      ref={ref as React.Ref<never>}
      className={className}
      style={{
        ...base,
        transition: reduced
          ? 'none'
          : `opacity 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
