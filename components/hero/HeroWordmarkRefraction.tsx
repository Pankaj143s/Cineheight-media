'use client'

import { useEffect, useRef } from 'react'
import { useMotionCapabilityProfile, useReducedMotion } from '@/lib/useMediaPreferences'
import { LIQUID_MEDIA_PROTO } from '@/lib/liquidMedia/config'

type Props = {
  sourceRef: React.RefObject<HTMLElement | null>
  active: boolean
  progress: number
  amount: number
  overlayOpacity: number
}

/**
 * Option B — canvas refraction overlay. Semantic HTML stays the source of truth.
 * Avoids a second WebGL context (ripple already owns one).
 */
export default function HeroWordmarkRefraction({
  sourceRef,
  active,
  progress,
  amount,
  overlayOpacity,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const dirtyRef = useRef(true)
  const reduced = useReducedMotion()
  const profile = useMotionCapabilityProfile()
  const rafRef = useRef(0)
  const propsRef = useRef({ progress, amount })
  propsRef.current = { progress, amount }

  const enabled = LIQUID_MEDIA_PROTO.enabled && active && !reduced

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    const source = sourceRef.current
    if (!canvas || !source) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let running = true
    const buffer = bufferRef.current ?? document.createElement('canvas')
    bufferRef.current = buffer
    const bctx = buffer.getContext('2d', { alpha: true })
    if (!bctx) return

    const dprCap = profile.level === 'high' ? 2 : 1.25

    const rebuildBuffer = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const parentRect = parent.getBoundingClientRect()
      const rect = source.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      const w = Math.max(1, Math.floor(parentRect.width))
      const h = Math.max(1, Math.floor(parentRect.height))
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      buffer.width = canvas.width
      buffer.height = canvas.height
      bctx.setTransform(1, 0, 0, 1, 0, 0)
      bctx.clearRect(0, 0, buffer.width, buffer.height)

      const style = getComputedStyle(source)
      bctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      bctx.textAlign = 'center'
      bctx.textBaseline = 'middle'
      bctx.fillStyle = '#f4f7fb'
      const text = (source.textContent || 'CINEHEIGHT').replace(/\s+/g, ' ').trim()
      const localX = (rect.left + rect.width / 2 - parentRect.left) * dpr
      const localY = (rect.top + rect.height / 2 - parentRect.top) * dpr
      // Source may be opacity 0 during resolve — still measure layout box.
      bctx.globalAlpha = 1
      bctx.fillText(text, localX, localY)
      dirtyRef.current = false
    }

    dirtyRef.current = true
    rebuildBuffer()

    const draw = (now: number) => {
      if (!running) return
      const { progress: prog, amount: amt } = propsRef.current
      if (dirtyRef.current) rebuildBuffer()

      const w = canvas.width
      const h = canvas.height
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const a = Math.max(0, Math.min(1, amt))
      const p = Math.max(0, Math.min(1, prog))

      if (a < 0.015) {
        ctx.drawImage(buffer, 0, 0)
      } else {
        const slice = Math.max(1, Math.round(dpr))
        const front = p * 1.35 - 0.18
        const t = now * 0.001
        for (let x = 0; x < w; x += slice) {
          const uvx = x / w
          const dist = uvx - front
          const envelope = Math.exp(-dist * dist * 28)
          const wave = Math.sin(uvx * 18 + t * 2.2) * 0.5 + 0.5
          const mag = envelope * a * (0.55 + 0.45 * wave)
          const dy = mag * 16 * dpr
          const dx = mag * 5 * dpr
          const unresolved = dist < 0 ? Math.min(1, Math.max(0, -dist * 2.2)) * a : 0
          ctx.globalAlpha = 1 - unresolved * 0.4
          ctx.drawImage(buffer, x, 0, slice, h, x + dx, dy, slice, h)
          if (mag > 0.1 && profile.level === 'high') {
            ctx.globalAlpha = mag * 0.18
            ctx.drawImage(buffer, x, 0, slice, h, x + dx + 1.1 * dpr, dy * 0.85, slice, h)
          }
        }
        ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    const onResize = () => {
      dirtyRef.current = true
    }
    window.addEventListener('resize', onResize)
    document.fonts?.ready?.then(() => {
      dirtyRef.current = true
    })

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [enabled, sourceRef, profile.level])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{ opacity: Math.max(overlayOpacity, 0) }}
    />
  )
}
