'use client'

import { useEffect, useRef } from 'react'
import { createManagedFrameLoop, type ManagedFrameLoop } from '@/lib/managedFrame'
import { useMotionCapabilityProfile } from '@/lib/useMediaPreferences'

/**
 * The cursor.
 *
 * A precise blue dot at the pointer, a halo over actionable elements, a small
 * click ring, and a short tapered trail behind it. Nothing else — this replaces
 * the retired "signal fabric" (contour ribbons, nodes, pulses, sparks, plucking
 * and thread attraction), which reacted to the pointer and the scroll position
 * across the whole viewport.
 *
 * Two decisions do most of the work here:
 *
 *  1. **The dot is written from the raw event, in the event handler.** No
 *     spring, no lerp, no frame of latency. Tracking accuracy is therefore
 *     structural rather than a tuning exercise.
 *  2. **The trail is sampled once per animation frame, not per event.** Pointer
 *     events arrive anywhere between 60 Hz and 1000 Hz and are coalesced under
 *     load; sampling per event makes the trail's shape depend on the mouse's
 *     report rate. Per frame, it does not.
 */

/** Ring-buffer distance beyond which we assume a jump, not a movement. */
const JUMP_PX = 220
/** Idle time before the trail starts fading out. */
const IDLE_MS = 130
/** Time constants for the trail coming up and going away, in ms. */
const RISE_TAU = 55
const FADE_TAU = 150
/** Click ring envelope. */
const CLICK_MS = 360

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const profile = useMotionCapabilityProfile()
  const trailCount = Math.max(8, profile.trailPointCount || 12)
  const dprCap = profile.canvasDprCap

  useEffect(() => {
    const canvas = canvasRef.current
    const cursor = cursorRef.current
    if (!canvas || !cursor) return
    const cursorEl = cursor
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return
    const ctx = context

    /*
     * Index 0 is the newest sample. The buffer is only ever read once `seeded`
     * is true, and seeding fills EVERY slot with the pointer's actual position
     * — which is what stops a line being drawn from the canvas centre (the old
     * field's initial value) to wherever the pointer first appeared.
     */
    const trailX = new Float32Array(trailCount)
    const trailY = new Float32Array(trailCount)
    let seeded = false

    let width = 1
    let height = 1
    let rawX = 0
    let rawY = 0
    let presence = 0
    let targetPresence = 0
    let lastMoveAt = 0
    let clickStart = -1
    let maxChord = 0
    let cursorMode: 'field' | 'action' | 'text' = 'field'
    let animation: ManagedFrameLoop | null = null

    const seed = (x: number, y: number) => {
      for (let i = 0; i < trailCount; i++) {
        trailX[i] = x
        trailY[i] = y
      }
      seeded = true
      maxChord = 0
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      width = document.documentElement.clientWidth
      height = document.documentElement.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    /** The dot itself — written straight from the event, never eased. */
    const placeDot = () => {
      cursorEl.style.transform = `translate3d(${rawX.toFixed(2)}px, ${rawY.toFixed(2)}px, 0)`
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      rawX = event.clientX
      rawY = event.clientY
      lastMoveAt = performance.now()
      targetPresence = 1
      placeDot()

      const target = document.elementFromPoint(rawX, rawY) as HTMLElement | null
      const textEntry = target?.closest('input, textarea, select, [contenteditable="true"]')
      const action = target?.closest('a, button, [role="button"]')
      cursorMode = textEntry ? 'text' : action ? 'action' : 'field'
      cursorEl.dataset.cursorMode = cursorMode

      // First contact seeds the whole buffer at the pointer, so the very first
      // rendered frame is a dot with no tail rather than a chord.
      if (!seeded) seed(rawX, rawY)
      animation?.wake()
    }

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      clickStart = performance.now()
      animation?.wake()
    }

    const onLeave = () => {
      targetPresence = 0
      // Leaving and re-entering elsewhere must not connect the two positions.
      seeded = false
      animation?.wake()
    }

    /**
     * Midpoint-quadratic smoothing.
     *
     * Each curve's control point is a sample and its endpoints are midpoints
     * between samples, so every control point lies inside the polyline's convex
     * hull. That is the structural reason this cannot overshoot or loop the way
     * the old Catmull-Rom-derived Bézier controls did.
     */
    const drawTrail = () => {
      if (!seeded || cursorMode === 'text') return
      const opacity = presence
      if (opacity < 0.02) return

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass === 0 ? 'rgb(0, 137, 255)' : 'rgb(203, 231, 255)'
        for (let i = 0; i < trailCount - 2; i++) {
          // Newest segment is widest and brightest; the tail tapers to nothing.
          const age = 1 - i / (trailCount - 2)
          const strength = age * age * opacity
          if (strength < 0.01) continue

          const startX = (trailX[i] + trailX[i + 1]) / 2
          const startY = (trailY[i] + trailY[i + 1]) / 2
          const endX = (trailX[i + 1] + trailX[i + 2]) / 2
          const endY = (trailY[i + 1] + trailY[i + 2]) / 2

          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.quadraticCurveTo(trailX[i + 1], trailY[i + 1], endX, endY)
          ctx.globalAlpha = strength * (pass === 0 ? 0.26 : 0.7)
          ctx.lineWidth = pass === 0 ? 2.2 * age + 0.6 : 1.15 * age + 0.25
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }

    function frame(now: number, dt: number) {
      // Sample the trail here, not in the pointer handler, so its shape does
      // not depend on how fast the mouse reports.
      if (seeded) {
        const jumped = Math.hypot(rawX - trailX[0], rawY - trailY[0]) > JUMP_PX
        if (jumped) {
          seed(rawX, rawY)
        } else {
          for (let i = trailCount - 1; i > 0; i--) {
            trailX[i] = trailX[i - 1]
            trailY[i] = trailY[i - 1]
          }
          trailX[0] = rawX
          trailY[0] = rawY
          let chord = 0
          for (let i = 0; i < trailCount - 1; i++) {
            const d = Math.hypot(trailX[i] - trailX[i + 1], trailY[i] - trailY[i + 1])
            if (d > chord) chord = d
          }
          maxChord = chord
        }
      }

      const idle = now - lastMoveAt > IDLE_MS
      if (idle) targetPresence = 0
      presence += (targetPresence - presence) * (1 - Math.exp(-dt / (idle ? FADE_TAU : RISE_TAU)))

      const clickProgress = clickStart < 0 ? 1 : Math.min(1, (now - clickStart) / CLICK_MS)
      cursorEl.style.setProperty('--cursor-click', (1 - clickProgress).toFixed(3))
      cursorEl.style.setProperty('--cursor-click-scale', (0.35 + clickProgress * 0.65).toFixed(3))
      if (clickProgress >= 1) clickStart = -1

      // The dot stays fully opaque while the pointer is in the window — only
      // the trail fades on idle, so the cursor never dims mid-read.
      cursorEl.style.opacity = cursorMode === 'text' || !seeded ? '0' : '1'

      ctx.clearRect(0, 0, width, height)
      drawTrail()

      /*
       * Keep running while the pointer is ACTIVE, not merely while `presence`
       * has already risen. The first frame after a wake has dt ≈ 0 (wake()
       * stamps `previous` immediately before requesting it), so presence is
       * still 0 there — a condition of `presence > 0.01` alone would sleep the
       * loop after one frame, every frame, and the trail could never appear.
       */
      return (!idle && targetPresence > 0) || presence > 0.01 || clickStart >= 0
    }

    const onVisibility = () => {
      if (!document.hidden) animation?.wake()
    }

    resize()
    canvas.dataset.motionProfile = profile.level
    canvas.dataset.trailPoints = String(trailCount)
    animation = createManagedFrameLoop(frame)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    document.documentElement.dataset.signalCursor = 'true'

    // Read-only state for the browser probes, mirroring `soundEngine`'s
    // `exposeForVerification`. Nothing in the app reads this.
    const verification = {
      get x() {
        return rawX
      },
      get y() {
        return rawY
      },
      get seeded() {
        return seeded
      },
      get maxChord() {
        return maxChord
      },
      get presence() {
        return presence
      },
      get mode() {
        return cursorMode
      },
      get points() {
        return Array.from({ length: trailCount }, (_, i) => [trailX[i], trailY[i]])
      },
    }
    Object.defineProperty(window, '__cineheightCursor', {
      value: verification,
      configurable: true,
    })

    return () => {
      animation?.destroy()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      delete document.documentElement.dataset.signalCursor
      delete (window as unknown as Record<string, unknown>).__cineheightCursor
    }
  }, [trailCount, dprCap, profile.level])

  return (
    <>
      <canvas
        ref={canvasRef}
        data-cursor-trail
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 max-w-full"
        style={{ zIndex: 1 }}
      />
      {/*
        The cursor's parts are centred on a zero-size origin box placed exactly
        at the pointer, so each `translate: -50% -50%` lands on the true
        position. That means they legitimately hang past the viewport edge when
        the pointer is at x=0 — hence the clipping wrapper, which both makes the
        cursor behave like a real one at the edges and keeps it out of the
        overflow sweep.
      */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
        <div
          ref={cursorRef}
          data-signal-cursor
          data-cursor-mode="field"
          className="absolute left-0 top-0 h-0 w-0 opacity-0 will-change-transform"
          style={{ ['--cursor-click' as string]: 0, ['--cursor-click-scale' as string]: 1 }}
        >
          <span className="signal-cursor-target absolute left-0 top-0 rounded-full" />
          <span className="signal-cursor-dot absolute left-0 top-0 rounded-full" />
          <span className="signal-cursor-click absolute left-0 top-0 rounded-full" />
        </div>
      </div>
    </>
  )
}
