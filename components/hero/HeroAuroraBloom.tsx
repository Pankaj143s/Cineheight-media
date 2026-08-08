'use client'

import { useEffect, useRef } from 'react'
import { createManagedFrameLoop, type ManagedFrameLoop } from '@/lib/managedFrame'
import { useMotionCapabilityProfile } from '@/lib/useMediaPreferences'
import { subscribeSignalPulse } from '@/lib/heroSignalPulse'
import { subscribeHeroProgress } from '@/lib/heroProgress'
import { DAMP } from '@/lib/motionTokens'
import { clamp } from '@/lib/utils'
import { detectCapabilities, createProgram, createQuad, type Program } from '@/lib/ripple/gl'
import { BLOOM_VERT, BLOOM_FRAG } from '@/lib/hero/bloomShaders'

/** GLSL-equivalent smoothstep, used to derive the page-wide dim from hero progress. */
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * The hero background — a large soft blue plasma on black with slow swirling
 * bands and grain, reacting to the pointer.
 *
 * One fullscreen quad, one fragment shader, no render targets: this is a pure
 * function of (time, pointer, progress, pulse), so unlike the ripple system it
 * needs no ping-pong state and no float-texture support. It still reuses that
 * system's hardened context acquisition via `detectCapabilities`, because the
 * awkward parts — WebGL2/1/experimental fallback, and detecting a software
 * rasteriser so we do not ask SwiftShader to run fbm at full DPR — are exactly
 * the same problem here. Its `floatFormat` result is simply unused.
 *
 * When no context comes back at all (`path === 'off'`) the component renders
 * nothing and the caller's CSS gradient fallback shows through.
 *
 * `scope` picks where this mounts: `'hero'` (default) is the original
 * hero-local placement, absolutely positioned inside the hero's sticky
 * stage. `'page'` mounts it as a page-wide fixed layer (see FlowDirector) —
 * same shader, same pointer response, but sized to the viewport rather than
 * its parent, and dimmed once hero scroll progress passes a threshold via
 * the uDim uniform.
 */
const PULSE_MS = 900

export default function HeroAuroraBloom({ scope = 'hero' }: { scope?: 'hero' | 'page' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const profile = useMotionCapabilityProfile()

  useEffect(() => {
    const canvasMaybe = canvasRef.current
    if (!canvasMaybe) return
    // Bound once so the nested frame loop keeps the non-null narrowing.
    const canvas = canvasMaybe

    const caps = detectCapabilities(canvas, false)
    if (!caps.ctx) {
      canvas.dataset.bloomState = 'unsupported'
      return
    }
    const gl = caps.ctx.gl

    const program: Program | null = createProgram(gl, BLOOM_VERT, BLOOM_FRAG, [
      'uResolution',
      'uTime',
      'uPointer',
      'uPointerStrength',
      'uProgress',
      'uPulse',
      'uDim',
    ])
    const quad = createQuad(gl)
    if (!program || !quad) {
      canvas.dataset.bloomState = 'compile-failed'
      program?.dispose()
      if (quad) gl.deleteBuffer(quad)
      return
    }

    canvas.dataset.bloomState = 'active'
    canvas.dataset.bloomPath = caps.path

    // Software rasterisers get DPR 1 via caps.dprCeiling; everything else is
    // capped by the shared motion profile.
    const dprCap = Math.min(profile.canvasDprCap, caps.dprCeiling)

    let width = 1
    let height = 1
    let pointerX = 0.5
    let pointerY = 0.5
    let targetX = 0.5
    let targetY = 0.5
    let pointerStrength = 0
    let targetStrength = 0
    let progress = 0
    let pulseStart = -1
    let intersecting = true
    let animation: ManagedFrameLoop | null = null
    const start = performance.now()

    const resize = () => {
      // A page-scoped canvas is `position: fixed`, so its offsetParent is the
      // viewport, not a sized ancestor — its actual DOM parent may be <body>,
      // whose clientHeight is the FULL DOCUMENT height. Measuring that would
      // stretch the canvas to the entire scroll length instead of one screen.
      if (scope === 'page') {
        width = window.innerWidth
        height = window.innerHeight
      } else {
        const parent = canvas.parentElement
        width = parent?.clientWidth || window.innerWidth
        height = parent?.clientHeight || window.innerHeight
      }
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      animation?.wake()
    }

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      targetX = (event.clientX - rect.left) / rect.width
      // GL's v axis runs bottom-up; flip once here so the shader never has to.
      targetY = 1 - (event.clientY - rect.top) / rect.height
      targetStrength = 1
      animation?.wake()
    }

    const endPointer = () => {
      targetStrength = 0
      animation?.wake()
    }

    const onPulse = () => {
      pulseStart = performance.now()
      animation?.wake()
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.useProgram(program.program)

    function frame(now: number, dt: number) {
      const closure = 1 - Math.exp(-dt / (DAMP.pointer * 1000))
      pointerX += (targetX - pointerX) * closure
      pointerY += (targetY - pointerY) * closure
      pointerStrength += (targetStrength - pointerStrength) * closure

      let pulse = 0
      if (pulseStart >= 0) {
        const p = (now - pulseStart) / PULSE_MS
        if (p >= 1) pulseStart = -1
        else pulse = 1 - p
      }

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(program!.uniforms.uResolution, canvas.width, canvas.height)
      gl.uniform1f(program!.uniforms.uTime, (now - start) / 1000)
      gl.uniform2f(program!.uniforms.uPointer, pointerX, pointerY)
      gl.uniform1f(program!.uniforms.uPointerStrength, pointerStrength)
      gl.uniform1f(program!.uniforms.uProgress, progress)
      gl.uniform1f(program!.uniforms.uPulse, pulse)
      gl.uniform1f(program!.uniforms.uDim, scope === 'page' ? smoothstep(0.55, 0.95, progress) : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      return true
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = Boolean(entry?.isIntersecting)
        if (intersecting) animation?.wake()
      },
      { rootMargin: '20% 0px', threshold: 0 }
    )
    observer.observe(canvas)

    animation = createManagedFrameLoop(frame, { canRun: () => intersecting })
    resize()
    animation.wake()

    const unsubscribeProgress = subscribeHeroProgress((p) => {
      progress = p
    })
    const unsubscribePulse = subscribeSignalPulse(onPulse)

    // The context can be lost at any time (GPU reset, tab backgrounding on some
    // drivers). Swallow the default so the browser will actually try to restore
    // it, and stop drawing until it does.
    const onLost = (event: Event) => {
      event.preventDefault()
      animation?.sleep()
      canvas.dataset.bloomState = 'context-lost'
    }

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', endPointer, { passive: true })
    window.addEventListener('pointercancel', endPointer, { passive: true })
    canvas.addEventListener('pointerleave', endPointer)
    canvas.addEventListener('webglcontextlost', onLost)

    return () => {
      animation?.destroy()
      observer.disconnect()
      unsubscribeProgress()
      unsubscribePulse()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', endPointer)
      window.removeEventListener('pointercancel', endPointer)
      canvas.removeEventListener('pointerleave', endPointer)
      canvas.removeEventListener('webglcontextlost', onLost)
      program.dispose()
      gl.deleteBuffer(quad)
    }
  }, [profile.canvasDprCap, profile.level, scope])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-hero-aurora-bloom
      data-hero-aurora-scope={scope}
      className={
        scope === 'page'
          ? 'pointer-events-none fixed inset-0'
          : 'pointer-events-none absolute inset-0 z-0'
      }
      style={scope === 'page' ? { zIndex: 'var(--z-atmosphere)' } : undefined}
    />
  )
}
