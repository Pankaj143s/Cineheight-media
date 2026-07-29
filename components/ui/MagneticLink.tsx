'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects } from '@/lib/useMediaPreferences'

/**
 * A call-to-action that responds to pointer proximity with light rather than
 * movement.
 *
 * It used to translate its label toward the cursor by up to 8px. Even at that
 * amplitude, type that slides around under the pointer reads as the interface
 * lagging rather than as depth — and on a CTA it is the one label a visitor is
 * trying to aim at. The lean is gone; what remains is a `--proximity` value
 * (0 → 1) written on the wrapper as the pointer approaches, driving a soft blue
 * halo. The baseline never moves, and the arrow keeps its own hover nudge.
 *
 * Disabled on coarse pointers, reduced motion and low-power devices, where it
 * renders as an ordinary link.
 */
export default function MagneticLink({
  href,
  children,
  className = '',
  style,
  external = false,
  ...rest
}: {
  href: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  external?: boolean
} & Omit<React.ComponentProps<'a'>, 'href' | 'style' | 'className'>) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const enabled = useCanRunRichEffects()

  useEffect(() => {
    if (!enabled) return
    const wrap = wrapRef.current
    if (!wrap) return

    let target = 0
    let cur = 0
    let raf = 0
    let last = performance.now()
    let running = false

    const loop = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      cur += (target - cur) * damp(0.12, dt)
      wrap.style.setProperty('--proximity', cur.toFixed(3))
      if (Math.abs(cur - target) < 0.004) {
        wrap.style.setProperty('--proximity', target.toFixed(3))
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
      // A generous reach so the halo warms before the pointer arrives.
      const reach = Math.max(r.width, r.height) * 1.6
      const d = Math.hypot(dx, dy)
      target = d > reach ? 0 : clamp(1 - d / reach, 0, 1)
      start()
    }
    const onLeave = () => {
      target = 0
      start()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
      wrap.style.removeProperty('--proximity')
    }
  }, [enabled])

  const body = <span className="inline-flex items-center gap-4">{children}</span>

  return (
    <span
      ref={wrapRef}
      className="proximity-link inline-block rounded-full"
      style={{ ['--proximity' as string]: 0 }}
    >
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
