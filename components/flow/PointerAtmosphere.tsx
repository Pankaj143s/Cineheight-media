'use client'

import { useEffect, useRef } from 'react'
import { useCanRunRichEffects } from '@/lib/useMediaPreferences'

/**
 * A restrained Canvas 2D ambient field: a soft light around the cursor and a
 * handful of signal motes that drift toward it. Desktop-only, and only on a
 * machine with headroom (`useCanRunRichEffects` gates cores, memory, pointer
 * type, viewport and reduced-motion in one place).
 *
 * Deliberately NOT: a custom cursor, a big blob, or liquid distortion over
 * readable text. The native cursor is never hidden and the canvas is
 * `pointer-events: none`, so nothing here can delay a click or a navigation.
 *
 * The rAF loop stops when the tab is hidden and when the pointer has been idle
 * and the motes have settled, so an untouched page costs nothing.
 */

const MOTE_COUNT = 36
/** Motes only link to each other inside this radius of the pointer. */
const LINK_FIELD = 240
/** …and only to neighbours this close. */
const LINK_DIST = 110

interface Mote {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  /** How strongly this mote responds to the pointer — variety reads organic. */
  pull: number
  alpha: number
}

export default function PointerAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const enabled = useCanRunRichEffects()

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Cap DPR at 1.5 — the field is soft and diffuse, so extra pixels buy
    // nothing but fill-rate.
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0
    let h = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      // clientWidth, not innerWidth: innerWidth includes the scrollbar gutter,
      // which would make the canvas wider than the layout viewport and register
      // as horizontal overflow.
      w = document.documentElement.clientWidth
      h = document.documentElement.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const motes: Mote[] = Array.from({ length: MOTE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.16,
      vy: (Math.random() - 0.5) * 0.16,
      r: 0.7 + Math.random() * 1.5,
      pull: 0.1 + Math.random() * 0.5,
      alpha: 0.12 + Math.random() * 0.3,
    }))

    // Pointer state: `t*` is the raw target, `c*` the eased value the field
    // actually uses, so the light never snaps.
    let tx = w * 0.5
    let ty = h * 0.5
    let cx = tx
    let cy = ty
    let presence = 0 // 0 = pointer away, 1 = pointer over the page
    let targetPresence = 0

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      tx = e.clientX
      ty = e.clientY
      targetPresence = 1
      wake()
    }
    const onLeave = () => {
      targetPresence = 0
      wake()
    }

    let raf = 0
    let running = false
    let idleFrames = 0

    const frame = () => {
      cx += (tx - cx) * 0.07
      cy += (ty - cy) * 0.07
      presence += (targetPresence - presence) * 0.05

      ctx.clearRect(0, 0, w, h)

      // Cursor light — one soft radial wash, no blur filter. Deliberately kept
      // low-alpha: it must never reduce contrast on text it passes over.
      if (presence > 0.01) {
        const R = 300
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
        g.addColorStop(0, `rgba(0,137,255,${0.085 * presence})`)
        g.addColorStop(0.4, `rgba(0,137,255,${0.035 * presence})`)
        g.addColorStop(1, 'rgba(0,137,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      }

      let moving = presence > 0.01
      // Motes near the pointer, collected for the linking pass.
      const near: Mote[] = []

      for (const m of motes) {
        const dx = cx - m.x
        const dy = cy - m.y
        const dist = Math.hypot(dx, dy)
        if (presence > 0.01 && dist < 380 && dist > 1) {
          // Inverse-ish attraction, capped so motes drift rather than snap.
          const f = (m.pull * presence * (1 - dist / 380)) / 620
          m.vx += dx * f
          m.vy += dy * f
          moving = true
        }
        m.vx *= 0.975
        m.vy *= 0.975
        m.x += m.vx
        m.y += m.vy

        // Wrap rather than bounce — no visible walls.
        if (m.x < -10) m.x = w + 10
        else if (m.x > w + 10) m.x = -10
        if (m.y < -10) m.y = h + 10
        else if (m.y > h + 10) m.y = -10

        if (Math.abs(m.vx) > 0.02 || Math.abs(m.vy) > 0.02) moving = true
        if (presence > 0.01 && dist < LINK_FIELD) near.push(m)

        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(150,205,255,${m.alpha * (0.4 + presence * 0.6)})`
        ctx.fill()
      }

      // Short constellation lines — only between motes that are BOTH close to
      // the pointer and close to each other, so the effect stays a local
      // gathering around the cursor rather than a web across the whole page.
      if (near.length > 1) {
        ctx.lineWidth = 1
        for (let i = 0; i < near.length; i++) {
          for (let j = i + 1; j < near.length; j++) {
            const a = near[i]
            const b = near[j]
            const d = Math.hypot(a.x - b.x, a.y - b.y)
            if (d > LINK_DIST) continue
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(120,185,255,${(1 - d / LINK_DIST) * 0.16 * presence})`
            ctx.stroke()
          }
        }
      }

      // Park the loop once everything has settled; any pointer move wakes it.
      idleFrames = moving ? 0 : idleFrames + 1
      if (idleFrames > 90) {
        running = false
        ctx.clearRect(0, 0, w, h)
        return
      }
      raf = requestAnimationFrame(frame)
    }

    function wake() {
      idleFrames = 0
      if (!running && !document.hidden) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }

    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else {
        wake()
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVis)
    wake()

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 1 }}
    />
  )
}
