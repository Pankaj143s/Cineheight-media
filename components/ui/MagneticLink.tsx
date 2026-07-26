'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects } from '@/lib/useMediaPreferences'

/**
 * A link that leans toward the pointer by at most `strength` px (default 8).
 * Restrained on purpose — enough to feel alive, never enough to make the target
 * hard to hit. Disabled on coarse pointers, reduced motion and low-power
 * devices, where it renders as an ordinary link.
 *
 * The transform lives on an inner span so the hit area never moves: the anchor
 * stays exactly where the browser laid it out.
 */
export default function MagneticLink({
  href,
  children,
  className = '',
  style,
  strength = 8,
  external = false,
  ...rest
}: {
  href: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  strength?: number
  external?: boolean
} & Omit<React.ComponentProps<'a'>, 'href' | 'style' | 'className'>) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const enabled = useCanRunRichEffects()

  useEffect(() => {
    if (!enabled) return
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return

    const target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    let raf = 0
    let last = performance.now()
    let running = false

    const loop = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      const f = damp(0.14, dt)
      cur.x += (target.x - cur.x) * f
      cur.y += (target.y - cur.y) * f
      inner.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0)`
      if (Math.abs(cur.x - target.x) < 0.05 && Math.abs(cur.y - target.y) < 0.05 && target.x === 0 && target.y === 0) {
        running = false
        return
      }
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const reach = Math.max(r.width, r.height) * 0.9
      const d = Math.hypot(dx, dy)
      if (d > reach) {
        target.x = 0
        target.y = 0
      } else {
        const fall = 1 - d / reach
        target.x = clamp(dx * 0.35 * fall, -strength, strength)
        target.y = clamp(dy * 0.35 * fall, -strength, strength)
      }
      start()
    }
    const onLeave = () => {
      target.x = 0
      target.y = 0
      start()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [enabled, strength])

  const body = (
    <span ref={innerRef} className="inline-flex items-center gap-4 will-change-transform">
      {children}
    </span>
  )

  return (
    <span ref={wrapRef} className="inline-block">
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style} {...rest}>
          {body}
        </a>
      ) : (
        <Link href={href} className={className} style={style} {...rest}>
          {body}
        </Link>
      )}
    </span>
  )
}
