'use client'

import { useEffect, useRef } from 'react'
import { createManagedFrameLoop, type ManagedFrameLoop } from '@/lib/managedFrame'
import { readScrollSignal, subscribeScrollSignal } from '@/lib/scrollSignal'
import { useMotionCapabilityProfile } from '@/lib/useMediaPreferences'

const BAND_COUNT = 9
const POINTER_RADIUS = 260
const MAX_BEND = 22

export default function PointerAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const profile = useMotionCapabilityProfile()
  const enabled = profile.interactive

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    const cursor = cursorRef.current
    if (!canvas || !cursor) return
    const cursorEl = cursor
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return
    const ctx = context
    const pointCount = profile.contourPointCount
    const trailCount = profile.trailPointCount

    const contourY = new Float32Array(BAND_COUNT * pointCount)
    const trailX = new Float32Array(trailCount)
    const trailY = new Float32Array(trailCount)

    let width = 1
    let height = 1
    let dpr = 1
    let targetX = width / 2
    let targetY = height / 2
    let pointerX = targetX
    let pointerY = targetY
    let previousRawX = targetX
    let previousRawY = targetY
    let wakeX = 0
    let wakeY = 0
    let presence = 0
    let targetPresence = 0
    let interaction = 1
    let targetInteraction = 1
    let trailPresence = 0
    let trailLength = 0
    let pointerSpeed = 0
    let targetPointerSpeed = 0
    let scrollPhase = readScrollSignal().progress
    let targetScrollPhase = scrollPhase
    let rippleStart = -1
    let clickStart = -1
    let clickX = 0
    let clickY = 0
    let lastMoveAt = performance.now()
    let lastScrollAt = lastMoveAt
    let cursorMode: 'field' | 'action' | 'text' = 'field'
    let animation: ManagedFrameLoop | null = null

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, profile.canvasDprCap)
      width = document.documentElement.clientWidth
      height = document.documentElement.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!trailLength) {
        targetX = pointerX = width / 2
        targetY = pointerY = height / 2
      }
    }

    const wake = () => {
      animation?.wake()
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const now = performance.now()
      const dt = Math.max(8, now - lastMoveAt)
      const dx = event.clientX - previousRawX
      const dy = event.clientY - previousRawY
      targetPointerSpeed = Math.min(1, Math.hypot(dx, dy) / dt / 1.45)
      wakeX += (Math.max(-2.5, Math.min(2.5, dx / dt)) - wakeX) * 0.42
      wakeY += (Math.max(-2.5, Math.min(2.5, dy / dt)) - wakeY) * 0.42
      targetX = event.clientX
      targetY = event.clientY
      targetPresence = 1

      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
      const action = target?.closest('a, button, [role="button"]')
      const textEntry = target?.closest('input, textarea, select, [contenteditable="true"]')
      const quiet = target?.closest('[data-interaction-quiet], form, nav')
      cursorMode = textEntry ? 'text' : action ? 'action' : 'field'
      cursorEl.dataset.cursorMode = cursorMode
      targetInteraction = quiet || textEntry ? 0.12 : action ? 0.45 : 1

      const moveDistance = Math.hypot(dx, dy)
      if (moveDistance > 110) {
        // Pointer events can be coalesced into one large jump. Seed a compact
        // directional tail instead of drawing a distracting viewport-wide
        // chord between two unrelated samples.
        const span = Math.min(180, moveDistance * 0.42)
        const directionX = dx / moveDistance
        const directionY = dy / moveDistance
        for (let index = 0; index < trailCount; index++) {
          const distanceBehind = (index / Math.max(1, trailCount - 1)) * span
          trailX[index] = event.clientX - directionX * distanceBehind
          trailY[index] = event.clientY - directionY * distanceBehind
        }
        trailLength = trailCount
      } else {
        for (let index = trailCount - 1; index > 0; index--) {
          trailX[index] = trailX[index - 1]
          trailY[index] = trailY[index - 1]
        }
        trailX[0] = event.clientX
        trailY[0] = event.clientY
        trailLength = Math.min(trailCount, trailLength + 1)
      }
      trailPresence = Math.min(1, trailPresence + 0.58)

      previousRawX = event.clientX
      previousRawY = event.clientY
      lastMoveAt = now
      wake()
    }

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      clickX = event.clientX
      clickY = event.clientY
      rippleStart = performance.now()
      clickStart = rippleStart
      wake()
    }

    const onLeave = () => {
      targetPresence = 0
      targetInteraction = 0
      lastMoveAt = performance.now()
      wake()
    }

    const drawContours = (now: number) => {
      const phase = scrollPhase * Math.PI * 4
      const rippleProgress = rippleStart < 0 ? 1 : Math.min(1, (now - rippleStart) / 700)
      const rippleRadius = rippleProgress * Math.max(320, width * 0.28)
      const threadX = Number.parseFloat(
        document.documentElement.style.getPropertyValue('--flow-thread-x')
      )
      const threadY = Number.parseFloat(
        document.documentElement.style.getPropertyValue('--flow-thread-y')
      )
      const threadDistance =
        Number.isFinite(threadX) && Number.isFinite(threadY)
          ? Math.hypot(threadX - pointerX, threadY - pointerY)
          : Infinity
      const threadPull = threadDistance < 160 ? (1 - threadDistance / 160) ** 2 : 0

      for (let band = 0; band < BAND_COUNT; band++) {
        const baseY =
          height * (0.12 + (band / (BAND_COUNT - 1)) * 0.76) +
          Math.sin(phase * 0.42 + band * 0.78) * 8

        for (let point = 0; point < pointCount; point++) {
          const x = (point / (pointCount - 1)) * width
          const organic =
            Math.sin(point * 0.63 + band * 0.94 + phase) * 3.2 +
            Math.sin(point * 0.21 - band * 0.58 - phase * 0.7) * 2
          const dx = x - pointerX
          const dy = baseY - pointerY
          const distance = Math.max(1, Math.hypot(dx, dy))
          const influence =
            distance < POINTER_RADIUS
              ? (1 - distance / POINTER_RADIUS) ** 2 * presence * interaction
              : 0
          let y =
            baseY +
            organic +
            (dy / distance) * MAX_BEND * influence -
            wakeY * 7 * influence +
            wakeX * (dx / distance) * 2.5 * influence

          if (rippleProgress < 1) {
            const clickDistance = Math.hypot(x - clickX, baseY - clickY)
            const edgeDistance = Math.abs(clickDistance - rippleRadius)
            if (edgeDistance < 48) {
              y +=
                Math.sin((1 - edgeDistance / 48) * Math.PI) *
                (1 - rippleProgress) *
                11 *
                (baseY >= clickY ? 1 : -1)
            }
          }

          if (threadPull > 0) {
            const span = Math.max(0, 1 - Math.abs(x - threadX) / 190)
            y += (threadY - y) * span * threadPull * 0.08
          }
          contourY[band * pointCount + point] = y
        }

        ctx.beginPath()
        ctx.moveTo(0, contourY[band * pointCount])
        for (let point = 1; point < pointCount - 1; point++) {
          const x = (point / (pointCount - 1)) * width
          const nextX = ((point + 1) / (pointCount - 1)) * width
          const y = contourY[band * pointCount + point]
          const nextY = contourY[band * pointCount + point + 1]
          ctx.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2)
        }
        ctx.lineTo(width, contourY[(band + 1) * pointCount - 1])
        const emphasis = band === 4 ? 1 : 0.58 + (band % 2) * 0.16
        ctx.strokeStyle = `rgba(0,137,255,${(0.075 * emphasis).toFixed(3)})`
        ctx.lineWidth = band === 4 ? 1 : 0.72
        ctx.stroke()
      }

      if (rippleProgress >= 1) rippleStart = -1
    }

    const drawTrail = () => {
      if (trailLength < 2 || trailPresence < 0.02 || cursorMode === 'text') return
      const opacity = trailPresence * presence * interaction
      const speedLift = 0.78 + pointerSpeed * 0.34
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Two allocation-free passes: a restrained halo, then a crisp tapered
      // core. Each segment uses Catmull-Rom-derived Bézier controls.
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass === 0 ? 'rgb(0, 137, 255)' : 'rgb(203, 231, 255)'
        for (let index = trailLength - 1; index > 0; index--) {
          const age = 1 - index / Math.max(1, trailLength - 1)
          const strength = age * opacity * speedLift
          if (strength < 0.008) continue

          const p0 = Math.min(trailLength - 1, index + 1)
          const p1 = index
          const p2 = index - 1
          const p3 = Math.max(0, index - 2)
          const cp1x = trailX[p1] + (trailX[p2] - trailX[p0]) / 6
          const cp1y = trailY[p1] + (trailY[p2] - trailY[p0]) / 6
          const cp2x = trailX[p2] - (trailX[p3] - trailX[p1]) / 6
          const cp2y = trailY[p2] - (trailY[p3] - trailY[p1]) / 6

          ctx.beginPath()
          ctx.moveTo(trailX[p1], trailY[p1])
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, trailX[p2], trailY[p2])
          ctx.globalAlpha = strength * (pass === 0 ? 0.22 : 0.72)
          ctx.lineWidth = pass === 0 ? 2.4 + strength * 1.4 : 0.48 + strength * 0.5
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }

    function frame(now: number, dt: number) {
      const pointerFactor = 1 - Math.exp(-dt / 58)
      const fieldFactor = 1 - Math.exp(-dt / 130)
      pointerX += (targetX - pointerX) * pointerFactor
      pointerY += (targetY - pointerY) * pointerFactor
      presence += (targetPresence - presence) * fieldFactor
      interaction += (targetInteraction - interaction) * fieldFactor
      scrollPhase += (targetScrollPhase - scrollPhase) * (1 - Math.exp(-dt / 180))
      wakeX *= Math.pow(0.88, dt / 16.7)
      wakeY *= Math.pow(0.88, dt / 16.7)
      pointerSpeed += (targetPointerSpeed - pointerSpeed) * (1 - Math.exp(-dt / 80))
      targetPointerSpeed *= Math.pow(0.82, dt / 16.7)
      trailPresence *= Math.exp(-dt / 84)

      const clickProgress = clickStart < 0 ? 1 : Math.min(1, (now - clickStart) / 360)
      cursorEl.style.setProperty('--cursor-click', (1 - clickProgress).toFixed(3))
      cursorEl.style.setProperty('--cursor-click-scale', (0.35 + clickProgress * 0.65).toFixed(3))
      cursorEl.style.transform = `translate3d(${(pointerX - 9).toFixed(2)}px, ${(pointerY - 9).toFixed(2)}px, 0)`
      cursorEl.style.opacity = cursorMode === 'text' ? '0' : presence.toFixed(3)
      if (clickProgress >= 1) clickStart = -1

      ctx.clearRect(0, 0, width, height)
      drawContours(now)
      drawTrail()

      const pointerIdle = now - lastMoveAt > 1200
      const scrollIdle = now - lastScrollAt > 240
      const settled =
        Math.abs(targetX - pointerX) < 0.05 &&
        Math.abs(targetY - pointerY) < 0.05 &&
        Math.abs(targetScrollPhase - scrollPhase) < 0.00005
      if (pointerIdle && scrollIdle && settled && rippleStart < 0 && clickStart < 0) {
        return false
      }
      if (targetPresence < 0.01 && presence < 0.01 && scrollIdle && rippleStart < 0) {
        return false
      }
      return true
    }

    const onScrollSignal = () => {
      targetScrollPhase = readScrollSignal().progress
      lastScrollAt = performance.now()
      wake()
    }
    const onVisibility = () => {
      if (!document.hidden) wake()
    }

    resize()
    canvas.dataset.motionProfile = profile.level
    canvas.dataset.trailPoints = String(trailCount)
    canvas.dataset.contourPoints = String(pointCount)
    animation = createManagedFrameLoop(frame)
    const unsubscribe = subscribeScrollSignal(onScrollSignal)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    document.documentElement.dataset.signalCursor = 'true'
    document.documentElement.dataset.contourActive = 'true'
    wake()

    return () => {
      animation?.destroy()
      unsubscribe()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      delete document.documentElement.dataset.signalCursor
      delete document.documentElement.dataset.contourActive
    }
  }, [enabled, profile])

  if (!enabled) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        data-signal-playground
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 max-w-full"
        style={{ zIndex: 1 }}
      />
      <div
        ref={cursorRef}
        data-signal-cursor
        data-cursor-mode="field"
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[70] h-[18px] w-[18px] opacity-0 will-change-transform"
        style={{ ['--cursor-click' as string]: 0, ['--cursor-click-scale' as string]: 1 }}
      >
        <span className="signal-cursor-target absolute left-1/2 top-1/2 rounded-full" />
        <span className="signal-cursor-dot absolute left-1/2 top-1/2 rounded-full" />
        <span className="signal-cursor-click absolute left-1/2 top-1/2 rounded-full" />
      </div>
    </>
  )
}
