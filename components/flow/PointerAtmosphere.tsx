'use client'

import { useEffect, useRef } from 'react'
import { useCanRunRichEffects } from '@/lib/useMediaPreferences'

const NODE_COUNT = 28
const TRAIL_POINTS = 16
const FILAMENTS = [
  [0, 7],
  [4, 15],
  [10, 23],
] as const

interface SignalNode {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  radius: number
  size: number
  alpha: number
  role: 0 | 1 | 2
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

function cubicPoint(a: number, b: number, c: number, d: number, t: number) {
  const mt = 1 - t
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d
}

export default function PointerAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const enabled = useCanRunRichEffects()

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return
    const ctx = context

    let dpr = 1
    let width = 0
    let height = 0
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = document.documentElement.clientWidth
      height = document.documentElement.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const nodes: SignalNode[] = Array.from({ length: NODE_COUNT }, (_, index) => ({
      x: width / 2,
      y: height / 2,
      vx: 0,
      vy: 0,
      angle: (index / NODE_COUNT) * Math.PI * 2 + Math.random() * 0.45,
      radius: 44 + Math.random() * 205,
      size: 0.8 + Math.random() * 1.35,
      alpha: 0.2 + Math.random() * 0.36,
      role: (index % 3) as 0 | 1 | 2,
    }))
    const sparks: Spark[] = Array.from({ length: 2 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0 }))
    const trailX = new Float32Array(TRAIL_POINTS)
    const trailY = new Float32Array(TRAIL_POINTS)
    let trailCount = 0
    let trailStrength = 0

    let targetX = width / 2
    let targetY = height / 2
    let pointerX = targetX
    let pointerY = targetY
    let lastRawX = targetX
    let lastRawY = targetY
    let lastMoveAt = performance.now()
    let lastSparkAt = 0
    let speed = 0
    let targetPresence = 0
    let presence = 0
    let quietTarget = 1
    let quiet = 1
    let seeded = false
    let waveStart = -1
    let clickPulseStart = -1

    let raf = 0
    let running = false
    let previousFrame = performance.now()

    const seedAroundPointer = () => {
      for (const node of nodes) {
        node.x = targetX + Math.cos(node.angle) * node.radius
        node.y = targetY + Math.sin(node.angle) * node.radius * 0.68
      }
      for (let i = 0; i < TRAIL_POINTS; i++) {
        trailX[i] = targetX
        trailY[i] = targetY
      }
      trailCount = 1
      seeded = true
    }

    const wake = () => {
      if (running || document.hidden) return
      running = true
      previousFrame = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const now = performance.now()
      const dx = event.clientX - lastRawX
      const dy = event.clientY - lastRawY
      const elapsed = Math.max(8, now - lastMoveAt)
      const rawSpeed = Math.min(3.2, Math.hypot(dx, dy) / elapsed)
      speed += (rawSpeed - speed) * 0.48
      targetX = event.clientX
      targetY = event.clientY
      targetPresence = 1
      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
      quietTarget = target?.closest(
        '[data-interaction-quiet], nav, form, button, a, input, textarea, select, p'
      )
        ? 0.32
        : 1

      if (!seeded) seedAroundPointer()
      if (Math.hypot(dx, dy) > 2) {
        const jump = Math.hypot(dx, dy)
        if (jump > 160) {
          const localLength = Math.min(220, jump)
          const ux = dx / jump
          const uy = dy / jump
          for (let i = 0; i < TRAIL_POINTS; i++) {
            const distance = (i / (TRAIL_POINTS - 1)) * localLength
            trailX[i] = event.clientX - ux * distance
            trailY[i] = event.clientY - uy * distance
          }
          trailCount = TRAIL_POINTS
        } else {
          for (let i = TRAIL_POINTS - 1; i > 0; i--) {
            trailX[i] = trailX[i - 1]
            trailY[i] = trailY[i - 1]
          }
          trailX[0] = event.clientX
          trailY[0] = event.clientY
          trailCount = Math.min(TRAIL_POINTS, trailCount + 1)
        }
        trailStrength = Math.min(1, trailStrength + 0.3 + rawSpeed * 0.18)
      }

      if (rawSpeed > 1.25 && now - lastSparkAt > 130) {
        const spark = sparks.find((item) => item.life <= 0) ?? sparks[0]
        spark.x = event.clientX
        spark.y = event.clientY
        spark.vx = -dx * 0.035 + (Math.random() - 0.5) * 0.5
        spark.vy = -dy * 0.035 + (Math.random() - 0.5) * 0.5
        spark.life = 1
        lastSparkAt = now
      }

      lastRawX = event.clientX
      lastRawY = event.clientY
      lastMoveAt = now
      wake()
    }

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      targetX = event.clientX
      targetY = event.clientY
      const now = performance.now()
      waveStart = now
      clickPulseStart = now
      for (const node of nodes) {
        const dx = node.x - targetX
        const dy = node.y - targetY
        const distance = Math.max(28, Math.hypot(dx, dy))
        if (distance > 290) continue
        const impulse = (1 - distance / 290) * 1.15
        node.vx += (dx / distance) * impulse
        node.vy += (dy / distance) * impulse
      }
      lastMoveAt = now
      wake()
    }

    const onLeave = () => {
      targetPresence = 0
      quietTarget = 1
      lastMoveAt = performance.now()
      wake()
    }

    const drawTrail = (alpha: number) => {
      if (trailCount < 3 || trailStrength < 0.02) return
      const count = Math.min(trailCount, 10 + Math.round(speed * 2.2))
      const tail = count - 1
      const gradient = ctx.createLinearGradient(trailX[tail], trailY[tail], trailX[0], trailY[0])
      gradient.addColorStop(0, 'rgba(0,137,255,0)')
      gradient.addColorStop(0.55, `rgba(0,137,255,${0.16 * alpha})`)
      gradient.addColorStop(1, `rgba(130,205,255,${0.58 * alpha})`)
      ctx.beginPath()
      ctx.moveTo(trailX[0], trailY[0])
      for (let i = 0; i < count - 1; i++) {
        const p0x = trailX[Math.max(0, i - 1)]
        const p0y = trailY[Math.max(0, i - 1)]
        const p1x = trailX[i]
        const p1y = trailY[i]
        const p2x = trailX[Math.min(tail, i + 1)]
        const p2y = trailY[Math.min(tail, i + 1)]
        const p3x = trailX[Math.min(tail, i + 2)]
        const p3y = trailY[Math.min(tail, i + 2)]
        ctx.bezierCurveTo(
          p1x + (p2x - p0x) / 6,
          p1y + (p2y - p0y) / 6,
          p2x - (p3x - p1x) / 6,
          p2y - (p3y - p1y) / 6,
          p2x,
          p2y
        )
      }
      ctx.strokeStyle = gradient
      ctx.lineWidth = 0.85 + Math.min(0.55, speed * 0.2)
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    const drawFilament = (
      a: SignalNode,
      b: SignalNode,
      index: number,
      alpha: number,
      now: number,
      threadBoost: number
    ) => {
      const bend = 0.3 + index * 0.06
      const c1x = a.x + (pointerX - a.x) * bend - (pointerY - a.y) * 0.05
      const c1y = a.y + (pointerY - a.y) * bend + (pointerX - a.x) * 0.05
      const c2x = b.x + (pointerX - b.x) * bend + (pointerY - b.y) * 0.04
      const c2y = b.y + (pointerY - b.y) * bend - (pointerX - b.x) * 0.04
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, b.x, b.y)
      ctx.strokeStyle = `rgba(0,137,255,${(0.11 + index * 0.025 + threadBoost * 0.1) * alpha})`
      ctx.lineWidth = index === 0 ? 1.15 : 0.8
      ctx.stroke()

      if (index < 2) {
        const t = ((now * (0.00012 + index * 0.000035) + index * 0.34) % 1 + 1) % 1
        const px = cubicPoint(a.x, c1x, c2x, b.x, t)
        const py = cubicPoint(a.y, c1y, c2y, b.y, t)
        ctx.beginPath()
        ctx.arc(px, py, 1.25, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220,238,255,${(0.62 + threadBoost * 0.28) * alpha})`
        ctx.fill()
      }

      if (index === 0 && clickPulseStart >= 0) {
        const progress = Math.min(1, (now - clickPulseStart) / 850)
        const px = cubicPoint(a.x, c1x, c2x, b.x, progress)
        const py = cubicPoint(a.y, c1y, c2y, b.y, progress)
        ctx.beginPath()
        ctx.arc(px, py, 1.9, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220,238,255,${(1 - progress) * alpha})`
        ctx.fill()
        if (progress >= 1) clickPulseStart = -1
      }
    }

    function frame(now: number) {
      const dt = Math.min(34, now - previousFrame || 16.7)
      previousFrame = now
      pointerX += (targetX - pointerX) * Math.min(1, dt * 0.009)
      pointerY += (targetY - pointerY) * Math.min(1, dt * 0.009)
      presence += (targetPresence - presence) * Math.min(1, dt * 0.006)
      quiet += (quietTarget - quiet) * Math.min(1, dt * 0.01)
      speed *= 0.965
      trailStrength *= now - lastMoveAt > 80 ? 0.945 : 0.992

      ctx.clearRect(0, 0, width, height)
      const alpha = presence * quiet
      if (alpha > 0.005) {
        drawTrail(alpha * trailStrength)

        const flowX = Number.parseFloat(
          document.documentElement.style.getPropertyValue('--flow-thread-x')
        )
        const flowY = Number.parseFloat(
          document.documentElement.style.getPropertyValue('--flow-thread-y')
        )
        const flowDistance =
          Number.isFinite(flowX) && Number.isFinite(flowY)
            ? Math.hypot(flowX - pointerX, flowY - pointerY)
            : Infinity
        const threadBoost = flowDistance < 150 ? 1 - flowDistance / 150 : 0
        const driftTime = now * 0.00008

        for (let index = 0; index < nodes.length; index++) {
          const node = nodes[index]
          let targetNodeX = pointerX + Math.cos(node.angle + driftTime) * node.radius
          let targetNodeY = pointerY + Math.sin(node.angle + driftTime) * node.radius * 0.68

          if (node.role === 0) {
            targetNodeX = pointerX + Math.cos(node.angle) * node.radius * 0.42
            targetNodeY = pointerY + Math.sin(node.angle) * node.radius * 0.3
          } else if (node.role === 1) {
            const orbit = node.angle + driftTime * 8
            targetNodeX = pointerX + Math.cos(orbit) * node.radius * 0.72
            targetNodeY = pointerY + Math.sin(orbit) * node.radius * 0.5
          } else if (trailCount > 2) {
            const trailIndex = Math.min(trailCount - 1, 2 + (index % Math.max(2, trailCount - 2)))
            targetNodeX = trailX[trailIndex] + Math.cos(node.angle) * 18
            targetNodeY = trailY[trailIndex] + Math.sin(node.angle) * 18
          }

          if (threadBoost > 0 && index % 4 === 0) {
            targetNodeX += (flowX - targetNodeX) * threadBoost * 0.28
            targetNodeY += (flowY - targetNodeY) * threadBoost * 0.28
          }

          node.vx += (targetNodeX - node.x) * 0.0018 * dt
          node.vy += (targetNodeY - node.y) * 0.0018 * dt
          node.vx *= Math.pow(0.9, dt / 16.7)
          node.vy *= Math.pow(0.9, dt / 16.7)
          node.x += node.vx * (dt / 16.7)
          node.y += node.vy * (dt / 16.7)
          const localDx = node.x - pointerX
          const localDy = node.y - pointerY
          const localDistance = Math.hypot(localDx, localDy)
          if (localDistance > 310) {
            node.x = pointerX + (localDx / localDistance) * 310
            node.y = pointerY + (localDy / localDistance) * 310
            node.vx *= 0.45
            node.vy *= 0.45
          }

          ctx.beginPath()
          ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(176,218,255,${node.alpha * alpha})`
          ctx.fill()
        }

        for (let index = 0; index < FILAMENTS.length; index++) {
          const pair = FILAMENTS[index]
          drawFilament(nodes[pair[0]], nodes[pair[1]], index, alpha, now, threadBoost)
        }

        for (const spark of sparks) {
          if (spark.life <= 0) continue
          spark.x += spark.vx * dt
          spark.y += spark.vy * dt
          spark.life -= dt / 520
          ctx.beginPath()
          ctx.arc(spark.x, spark.y, 0.8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(220,238,255,${Math.max(0, spark.life) * alpha})`
          ctx.fill()
        }

        if (waveStart >= 0) {
          const progress = Math.min(1, (now - waveStart) / 850)
          ctx.beginPath()
          ctx.arc(targetX, targetY, 18 + progress * 128, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0,137,255,${(1 - progress) * 0.32 * quiet})`
          ctx.lineWidth = 1.1
          ctx.stroke()
          if (progress >= 1) waveStart = -1
        }
      }

      const idle = now - lastMoveAt > 2600 && waveStart < 0 && clickPulseStart < 0
      if (idle && targetPresence > 0.5) {
        running = false
        return
      }
      if (targetPresence < 0.01 && presence < 0.01) {
        ctx.clearRect(0, 0, width, height)
        running = false
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (targetPresence > 0 || presence > 0) {
        wake()
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      data-signal-playground
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 max-w-full"
      style={{ zIndex: 1 }}
    />
  )
}
