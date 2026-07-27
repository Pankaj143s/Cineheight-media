'use client'

import { useEffect, useRef } from 'react'
import { createManagedFrameLoop, type ManagedFrameLoop } from '@/lib/managedFrame'
import { readScrollSignal, subscribeScrollSignal } from '@/lib/scrollSignal'
import { publishAudioEvent } from '@/lib/audio/audioBus'
import { useMotionCapabilityProfile } from '@/lib/useMediaPreferences'

/**
 * The signal fabric.
 *
 * A tensioned field of thin contour ribbons that behaves like cloth under the
 * pointer rather than a particle cloud: ribbons bend toward you, overshoot
 * elastically when you change direction, carry travelling pulses, and can be
 * plucked. The field is coupled to the route-spanning FlowThread, so a pluck
 * sends a pulse toward the thread and nearby ribbons lean into it — the
 * background and the navigation signal read as one system.
 *
 * Everything lives in preallocated typed arrays and one managed frame loop that
 * sleeps the moment the field settles. No React state is touched per frame.
 */

const BAND_COUNT = 9
const POINTER_RADIUS = 260
const MAX_BEND = 22

/** Pluck ripple duration. */
const RIPPLE_MS = 850
/** Small nodes that align themselves along the ribbons nearest the pointer. */
const NODE_COUNT = 10
/** Blue pulses travelling along bent ribbons. */
const PULSE_COUNT = 2
const PULSE_MS = 2100
/** Restrained sparks thrown off by fast movement. */
const SPARK_COUNT = 3
const SPARK_MS = 340
/** Travel time for the pulse a pluck sends toward the route thread. */
const THREAD_PULSE_MS = 820

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

    // Per-band spring state. This is what gives the fabric its elastic
    // overshoot when the pointer reverses instead of snapping back like rubber.
    const bandOffset = new Float32Array(BAND_COUNT)
    const bandVelocity = new Float32Array(BAND_COUNT)

    const nodeX = new Float32Array(NODE_COUNT)
    const nodeY = new Float32Array(NODE_COUNT)
    const nodeAlpha = new Float32Array(NODE_COUNT)
    const nodeSwell = new Float32Array(NODE_COUNT)
    let nodesSeeded = false

    // -1 in `pulseBand` means the slot is free.
    const pulseBand = new Int8Array(PULSE_COUNT).fill(-1)
    const pulseStart = new Float32Array(PULSE_COUNT)

    const sparkX = new Float32Array(SPARK_COUNT)
    const sparkY = new Float32Array(SPARK_COUNT)
    const sparkVX = new Float32Array(SPARK_COUNT)
    const sparkVY = new Float32Array(SPARK_COUNT)
    const sparkStart = new Float32Array(SPARK_COUNT).fill(-1)

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
    let lastPulseAt = 0
    let lastSparkAt = 0
    let threadPulseStart = -1
    let threadPulseFromX = 0
    let threadPulseFromY = 0

    /** Which ribbon the pointer is currently closest to. */
    const bandAt = (y: number) => {
      const t = (y / Math.max(1, height) - 0.12) / 0.76
      return Math.max(0, Math.min(BAND_COUNT - 1, Math.round(t * (BAND_COUNT - 1))))
    }
    /** Resting Y of a ribbon, before any bend. */
    const bandBaseY = (band: number, phase: number) =>
      height * (0.12 + (band / (BAND_COUNT - 1)) * 0.76) +
      Math.sin(phase * 0.42 + band * 0.78) * 8

    /** Read a ribbon's current height at an arbitrary x from the cached row. */
    const contourAt = (band: number, x: number) => {
      const t = Math.max(0, Math.min(1, x / Math.max(1, width))) * (pointCount - 1)
      const i = Math.floor(t)
      const f = t - i
      const a = contourY[band * pointCount + i]
      const b = contourY[band * pointCount + Math.min(pointCount - 1, i + 1)]
      return a + (b - a) * f
    }

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

      const previousWakeX = wakeX
      const previousWakeY = wakeY
      wakeX += (Math.max(-2.5, Math.min(2.5, dx / dt)) - wakeX) * 0.42
      wakeY += (Math.max(-2.5, Math.min(2.5, dy / dt)) - wakeY) * 0.42

      /*
       * Reversing direction plucks the ribbons the pointer was dragging. The
       * kick goes into the spring's velocity rather than its position, which is
       * what produces a settle-with-overshoot instead of a snap.
       */
      const flipX = previousWakeX * wakeX < 0 && Math.abs(previousWakeX) > 0.4
      const flipY = previousWakeY * wakeY < 0 && Math.abs(previousWakeY) > 0.4
      if (flipX || flipY) {
        const kick = Math.min(2.6, Math.abs(previousWakeX) + Math.abs(previousWakeY)) * 1.6
        for (let band = 0; band < BAND_COUNT; band++) {
          const distance = Math.abs(bandBaseY(band, 0) - event.clientY)
          if (distance > POINTER_RADIUS) continue
          const proximity = 1 - distance / POINTER_RADIUS
          bandVelocity[band] += kick * proximity * (previousWakeY >= 0 ? 1 : -1)
        }
      }

      // Fast travel throws off a spark or two. Strictly rate-limited: this is a
      // flick of the wrist, not a firework.
      if (targetPointerSpeed > 0.72 && now - lastSparkAt > 240) {
        const speed = Math.hypot(dx, dy) || 1
        for (let i = 0; i < SPARK_COUNT; i++) {
          if (sparkStart[i] >= 0) continue
          sparkX[i] = event.clientX
          sparkY[i] = event.clientY
          sparkVX[i] = (dx / speed) * (0.22 + Math.random() * 0.16)
          sparkVY[i] = (dy / speed) * (0.22 + Math.random() * 0.16) - 0.05
          sparkStart[i] = now
          lastSparkAt = now
          break
        }
      }

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
      const now = performance.now()
      rippleStart = now
      clickStart = now

      // Pluck: the nearest ribbons take the biggest kick, the nodes bloom
      // outward, and a pulse sets off toward the route thread.
      const struck = bandAt(event.clientY)
      for (let band = 0; band < BAND_COUNT; band++) {
        const falloff = 1 / (1 + Math.abs(band - struck) * 0.85)
        bandVelocity[band] += (band >= struck ? 2.9 : -2.9) * falloff
      }
      for (let i = 0; i < NODE_COUNT; i++) nodeSwell[i] = 1

      threadPulseStart = now
      threadPulseFromX = event.clientX
      threadPulseFromY = event.clientY

      // Let the soundscape land its tick on the same frame as the visual.
      publishAudioEvent({ type: 'pointer-pluck', x: event.clientX, y: event.clientY })
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
      const rippleProgress = rippleStart < 0 ? 1 : Math.min(1, (now - rippleStart) / RIPPLE_MS)
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
        const baseY = bandBaseY(band, phase)
        const elastic = bandOffset[band]

        for (let point = 0; point < pointCount; point++) {
          // Fast movement stretches the sampling along the travel direction, so
          // the ribbons appear to be dragged out rather than merely displaced.
          const stretch = wakeX * pointerSpeed * 9
          const x = (point / (pointCount - 1)) * width - stretch
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
            wakeX * (dx / distance) * 2.5 * influence +
            // Elastic overshoot, strongest where the pointer actually is.
            elastic * (0.35 + influence * 0.65)

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
        /*
         * The field is nearly invisible at rest and comes up under an active
         * pointer. That contrast is the invitation: the fabric appears to be
         * something you are revealing rather than decoration that was always
         * there. Ribbons nearest the pointer lift most.
         */
        const proximity = Math.max(
          0,
          1 - Math.abs(bandBaseY(band, phase) - pointerY) / (POINTER_RADIUS * 1.6)
        )
        const lift = 1 + presence * interaction * (0.7 + proximity * 1.5)
        ctx.strokeStyle = `rgba(0,137,255,${(0.075 * emphasis * lift).toFixed(3)})`
        ctx.lineWidth = band === 4 ? 1 : 0.72
        ctx.stroke()
      }

      if (rippleProgress >= 1) rippleStart = -1
    }

    /**
     * Everything that rides ON the ribbons: the small nodes that gather near
     * the pointer, the pulses travelling along bent ribbons, the sparks thrown
     * off by fast movement, and the pulse a pluck sends toward the route
     * thread. Drawn after the contours so it reads as sitting on the fabric.
     */
    const drawFieldDetail = (now: number, dt: number) => {
      const near = bandAt(pointerY)
      const settle = 1 - Math.exp(-dt / 120)

      // ---- nodes ---------------------------------------------------------
      for (let i = 0; i < NODE_COUNT; i++) {
        /*
         * Most nodes sit on the ribbon the pointer is nearest, with a few on
         * its neighbours. Weighting them onto one curve is what makes them read
         * as aligned along the fabric rather than as a scatter of dots.
         */
        const lane = i < 6 ? 0 : i < 8 ? -1 : 1
        const band = Math.max(0, Math.min(BAND_COUNT - 1, near + lane))
        const spread = lane === 0 ? (i - 2.5) * 30 : (i % 2 === 0 ? -1 : 1) * (46 + (i % 3) * 26)
        const tx = pointerX + spread
        const ty = contourAt(band, tx)

        if (!nodesSeeded) {
          nodeX[i] = tx
          nodeY[i] = ty
        } else {
          nodeX[i] += (tx - nodeX[i]) * settle
          nodeY[i] += (ty - nodeY[i]) * settle
        }

        const distance = Math.abs(spread)
        const want =
          presence * interaction * Math.max(0, 1 - distance / (POINTER_RADIUS * 0.85))
        nodeAlpha[i] += (want - nodeAlpha[i]) * settle
        nodeSwell[i] *= Math.exp(-dt / 260)

        if (nodeAlpha[i] < 0.02) continue
        const radius = 1.4 + nodeSwell[i] * 3.2
        ctx.beginPath()
        ctx.arc(nodeX[i], nodeY[i], radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220,238,255,${(nodeAlpha[i] * 0.55).toFixed(3)})`
        ctx.fill()
      }
      nodesSeeded = true

      // ---- travelling pulses --------------------------------------------
      if (presence > 0.55 && now - lastPulseAt > 2400) {
        for (let i = 0; i < PULSE_COUNT; i++) {
          if (pulseBand[i] >= 0) continue
          pulseBand[i] = Math.max(0, Math.min(BAND_COUNT - 1, near + (Math.random() < 0.5 ? -1 : 1)))
          pulseStart[i] = now
          lastPulseAt = now
          break
        }
      }
      for (let i = 0; i < PULSE_COUNT; i++) {
        if (pulseBand[i] < 0) continue
        const t = (now - pulseStart[i]) / PULSE_MS
        if (t >= 1) {
          pulseBand[i] = -1
          continue
        }
        const x = t * width
        const y = contourAt(pulseBand[i], x)
        // Fade in and out so it never appears or vanishes abruptly at an edge.
        const alpha = Math.sin(t * Math.PI) * 0.7 * interaction
        ctx.beginPath()
        ctx.arc(x, y, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,137,255,${alpha.toFixed(3)})`
        ctx.fill()
      }

      // ---- sparks --------------------------------------------------------
      for (let i = 0; i < SPARK_COUNT; i++) {
        if (sparkStart[i] < 0) continue
        const t = (now - sparkStart[i]) / SPARK_MS
        if (t >= 1) {
          sparkStart[i] = -1
          continue
        }
        sparkX[i] += sparkVX[i] * dt
        sparkY[i] += sparkVY[i] * dt
        const alpha = (1 - t) * 0.5 * interaction
        ctx.beginPath()
        ctx.moveTo(sparkX[i], sparkY[i])
        ctx.lineTo(sparkX[i] - sparkVX[i] * 34, sparkY[i] - sparkVY[i] * 34)
        ctx.strokeStyle = `rgba(203,231,255,${alpha.toFixed(3)})`
        ctx.lineWidth = 0.7
        ctx.stroke()
      }

      // ---- pluck pulse joining the route thread --------------------------
      if (threadPulseStart >= 0) {
        const t = (now - threadPulseStart) / THREAD_PULSE_MS
        if (t >= 1) {
          threadPulseStart = -1
        } else {
          const tx = Number.parseFloat(
            document.documentElement.style.getPropertyValue('--flow-thread-x')
          )
          const ty = Number.parseFloat(
            document.documentElement.style.getPropertyValue('--flow-thread-y')
          )
          if (Number.isFinite(tx) && Number.isFinite(ty)) {
            // Ease out so it arrives at the thread rather than passing through.
            const e = 1 - Math.pow(1 - t, 3)
            const x = threadPulseFromX + (tx - threadPulseFromX) * e
            const y = threadPulseFromY + (ty - threadPulseFromY) * e
            ctx.beginPath()
            ctx.arc(x, y, 2.4 * (1 - t * 0.4), 0, Math.PI * 2)
            ctx.fillStyle = `rgba(220,238,255,${((1 - t) * 0.85).toFixed(3)})`
            ctx.fill()
          } else {
            threadPulseStart = -1
          }
        }
      }
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

      /*
       * Integrate the ribbon springs. Underdamped on purpose: the field should
       * overshoot slightly and settle, which is what makes it feel like fabric
       * under tension rather than a value being lerped.
       */
      const steps = dt / 16.7
      let springEnergy = 0
      for (let band = 0; band < BAND_COUNT; band++) {
        bandVelocity[band] -= bandOffset[band] * 0.16 * steps
        bandVelocity[band] *= Math.pow(0.86, steps)
        bandOffset[band] += bandVelocity[band] * steps
        springEnergy += Math.abs(bandOffset[band]) + Math.abs(bandVelocity[band])
      }

      const clickProgress = clickStart < 0 ? 1 : Math.min(1, (now - clickStart) / 360)
      cursorEl.style.setProperty('--cursor-click', (1 - clickProgress).toFixed(3))
      cursorEl.style.setProperty('--cursor-click-scale', (0.35 + clickProgress * 0.65).toFixed(3))
      cursorEl.style.transform = `translate3d(${(pointerX - 9).toFixed(2)}px, ${(pointerY - 9).toFixed(2)}px, 0)`
      cursorEl.style.opacity = cursorMode === 'text' ? '0' : presence.toFixed(3)
      if (clickProgress >= 1) clickStart = -1

      ctx.clearRect(0, 0, width, height)
      drawContours(now)
      drawFieldDetail(now, dt)
      drawTrail()

      // Anything still in flight must keep the loop alive, or the field would
      // freeze mid-pluck when the pointer happens to be still.
      let inFlight = rippleStart >= 0 || clickStart >= 0 || threadPulseStart >= 0
      if (!inFlight) {
        for (let i = 0; i < PULSE_COUNT && !inFlight; i++) inFlight = pulseBand[i] >= 0
        for (let i = 0; i < SPARK_COUNT && !inFlight; i++) inFlight = sparkStart[i] >= 0
      }

      const pointerIdle = now - lastMoveAt > 1200
      const scrollIdle = now - lastScrollAt > 240
      const settled =
        Math.abs(targetX - pointerX) < 0.05 &&
        Math.abs(targetY - pointerY) < 0.05 &&
        Math.abs(targetScrollPhase - scrollPhase) < 0.00005 &&
        springEnergy < 0.02
      if (pointerIdle && scrollIdle && settled && !inFlight) {
        return false
      }
      if (targetPresence < 0.01 && presence < 0.01 && scrollIdle && !inFlight && springEnergy < 0.02) {
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
