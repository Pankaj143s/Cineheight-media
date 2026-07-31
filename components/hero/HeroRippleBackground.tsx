'use client'

import { useEffect, useRef } from 'react'
import { createManagedFrameLoop } from '@/lib/managedFrame'
import { subscribeHeroProgress, getHeroProgress } from '@/lib/heroProgress'
import type { RippleTier } from '@/lib/useRippleTier'
import {
  createProgram,
  createQuad,
  createTarget,
  detectCapabilities,
  disposeTarget,
  type Program,
  type RenderTarget,
} from '@/lib/ripple/gl'
import { FRAG_ANALYTIC, FRAG_DROP, FRAG_RENDER, FRAG_UPDATE, VERT } from '@/lib/ripple/shaders'
import { drawContourField } from '@/lib/ripple/contours'
import RippleDebugPanel from './RippleDebugPanel'
import {
  forceAnalyticRequested,
  registerTune,
  subscribeTune,
  type RippleTune,
} from '@/lib/ripple/tune'

/* ----------------------------------------------------------------- tuning */

interface TierConfig {
  dprCap: number
  maxPixels: number
  simLong: number
  /** Seconds for a ripple to fall to ~4% of its initial amplitude. */
  lifetime: number
  drag: number
  dropRadiusTexels: number
  dropStrength: number
  /**
   * Normal scale for the SIMULATION path, whose gradient is per texel.
   *
   * Dropped from 110 when the drop became an oscillating packet: the packet's
   * leading edge is roughly an order of magnitude steeper than the raised
   * cosine it replaced, and at 110 the normal saturated across the whole
   * ripple, which is precisely what turned it into a flat white disc.
   */
  slopeBase: number
  /**
   * Normal scale for the ANALYTIC path, whose gradient is per unit of p, not
   * per texel. Sharing one number with the simulation is why that path used to
   * render blown out.
   */
  analyticSlope: number
  /** Expansion rate, in grid long-sides per second. */
  frontSpeed: number
  perturbance: number
  specular: number
  rim: number
  /** Signed slope shading — brightens the lit face, darkens the back face. */
  shade: number
  /** Laplacian term — the concentric crest/trough banding. */
  caustic: number
  tint: number
  detail: number
  /**
   * Pure normalisation constant (CSS px) for the energy/strength accounting
   * below — no longer a drop-injection gate. Historically this was
   * `minDropPx`, a minimum-travel gate that (combined with `throttleMs`)
   * caused single-point drops to land ~72-110ms / ~24-28px apart, which read
   * as discrete "taps" instead of a continuous flowing trail. The gate is
   * gone; the number lives on purely to keep per-pixel strength calibrated
   * to what it was before.
   */
  energyRefPx: number
  /** Pointer speed, in CSS px/s, that earns a full-strength drop. */
  refSpeedPx: number
  /** Sub-drop spacing along the pointer's path, in CSS px — the resolution
   *  of the interpolated trail (see the injection loop for how it's used). */
  dropSpacingPx: number
  /** Hard cap on interpolated sub-drops injected in a single frame, so a
   *  fast flick can't spike the drop queue or GPU cost. */
  maxSubDropsPerFrame: number
  /** Distance (CSS px) beyond which a pointer jump is treated as a
   *  teleport (tab-switch return, cursor warp) rather than a drag — queues
   *  one drop at the destination instead of walking a fake path across it. */
  teleportPx: number
  autoMinMs: number
  autoMaxMs: number
  maxEnergy: number
  maxSteps: number
  maxDropsPerFrame: number
  preferHighest: boolean
  /** Bottom blend band, as a fraction of hero height, top-down. */
  fadeStart: number
  fadeEnd: number
}

/**
 * Idle auto-ripples are off while cursor interaction is being evaluated.
 * The scheduler is intact behind this flag and the debug panel can switch it
 * back on live.
 */
const AUTO_RIPPLES_DEFAULT = false

const TIERS: Record<RippleTier, TierConfig> = {
  high: {
    dprCap: 1.5,
    maxPixels: 3_200_000,
    simLong: 512,
    lifetime: 2.1,
    drag: 0.999,
    dropRadiusTexels: 26,
    dropStrength: 0.075,
    slopeBase: 15,
    analyticSlope: 0.08,
    frontSpeed: 0.066,
    perturbance: 0.028,
    specular: 0.088,
    rim: 0.048,
    shade: 0.34,
    caustic: 24.0,
    tint: 0.5,
    detail: 1.0,
    energyRefPx: 24,
    refSpeedPx: 900,
    dropSpacingPx: 8,
    maxSubDropsPerFrame: 6,
    teleportPx: 220,
    autoMinMs: 3200,
    autoMaxMs: 4800,
    maxEnergy: 3.0,
    maxSteps: 3,
    maxDropsPerFrame: 8,
    preferHighest: true,
    fadeStart: 0.56,
    fadeEnd: 0.97,
  },
  balanced: {
    dprCap: 1.25,
    maxPixels: 2_200_000,
    simLong: 384,
    lifetime: 2.0,
    drag: 0.999,
    dropRadiusTexels: 24,
    dropStrength: 0.078,
    slopeBase: 15,
    analyticSlope: 0.08,
    frontSpeed: 0.066,
    perturbance: 0.026,
    specular: 0.082,
    rim: 0.044,
    shade: 0.32,
    caustic: 22.5,
    tint: 0.5,
    detail: 1.0,
    energyRefPx: 26,
    refSpeedPx: 900,
    dropSpacingPx: 9,
    maxSubDropsPerFrame: 5,
    teleportPx: 200,
    autoMinMs: 3600,
    autoMaxMs: 5200,
    maxEnergy: 2.6,
    maxSteps: 3,
    maxDropsPerFrame: 6,
    preferHighest: false,
    fadeStart: 0.56,
    fadeEnd: 0.97,
  },
  compact: {
    dprCap: 1.0,
    maxPixels: 1_200_000,
    simLong: 256,
    lifetime: 1.9,
    drag: 0.9988,
    dropRadiusTexels: 22,
    dropStrength: 0.082,
    slopeBase: 30,
    analyticSlope: 0.08,
    frontSpeed: 0.070,
    perturbance: 0.030,
    specular: 0.070,
    rim: 0.038,
    shade: 0.26,
    caustic: 30.0,
    tint: 0.45,
    detail: 0.85,
    energyRefPx: 28,
    refSpeedPx: 900,
    dropSpacingPx: 11,
    maxSubDropsPerFrame: 4,
    teleportPx: 180,
    autoMinMs: 4200,
    autoMaxMs: 6400,
    maxEnergy: 2.0,
    maxSteps: 2,
    maxDropsPerFrame: 4,
    preferHighest: false,
    fadeStart: 0.58,
    fadeEnd: 0.98,
  },
}

/** Ripples stop being fed into the bottom blend band so they never fight it. */
const RIPPLE_FADE_END = 0.97
/** Hero scroll progress over which the whole surface dissolves. */
const FADE_IN = 0.46
const FADE_OUT = 0.74
/** How long a pointer must be still before automatic ripples resume. */
const POINTER_IDLE_MS = 900
const MAX_ANALYTIC = 12
const SIM_STEP_MS = 1000 / 60

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface Drop {
  u: number
  v: number
  strength: number
}

export default function HeroRippleBackground({ tier }: { tier: RippleTier }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const cfg = TIERS[tier]
    const caps = detectCapabilities(canvas, cfg.preferHighest)
    if (caps.path === 'off' || !caps.ctx) return

    const { gl } = caps.ctx
    const useSim =
      caps.path === 'simulation' && caps.floatFormat !== null && !forceAnalyticRequested()

    /*
     * Live tuning values. The loop reads these every frame rather than the tier
     * config directly, so a debug-panel slider retunes the surface without
     * rebuilding the GL context — which would throw away the simulation state
     * and make an A/B comparison meaningless.
     */
    const tune: RippleTune = {
      perturbance: cfg.perturbance,
      dropStrength: cfg.dropStrength,
      dropRadius: cfg.dropRadiusTexels,
      damping: 0, // set by resize(), which derives it from the lifetime
      detail: cfg.detail,
      specular: cfg.specular,
      rim: cfg.rim,
      shade: cfg.shade,
      caustic: cfg.caustic,
      slope: 0, // set by resize()
      autoRipples: AUTO_RIPPLES_DEFAULT,
      debugView: 0,
      enabled: true,
    }
    registerTune(tune)

    /* ------------------------------------------------------------ programs */

    const UPDATE_U = ['uState', 'uTexel', 'uSpeed', 'uDamping', 'uDrag']
    const DROP_U = ['uState', 'uDrops', 'uDropCount', 'uSimSize']
    const SHADE_U = [
      'uAspect',
      'uSlope',
      'uPerturbance',
      'uSpecular',
      'uRim',
      'uShade',
      'uCaustic',
      'uTint',
      'uRippleFade',
      'uContours',
      'uFadeStart',
      'uFadeEnd',
      'uPxToP',
      'uDetail',
      'uDebugView',
    ]

    let updateProg: Program | null = null
    let dropProg: Program | null = null
    let renderProg: Program | null = null
    let simulating = useSim

    if (simulating) {
      updateProg = createProgram(gl, VERT, FRAG_UPDATE, UPDATE_U)
      dropProg = createProgram(gl, VERT, FRAG_DROP, DROP_U)
      renderProg = createProgram(gl, VERT, FRAG_RENDER, [...SHADE_U, 'uState', 'uTexel'])
      if (!updateProg || !dropProg || !renderProg) {
        updateProg?.dispose()
        dropProg?.dispose()
        renderProg?.dispose()
        updateProg = dropProg = renderProg = null
        simulating = false
      }
    }
    if (!simulating) {
      renderProg = createProgram(gl, VERT, FRAG_ANALYTIC, [
        ...SHADE_U,
        'uRipples',
        'uRippleCount',
        'uMaxRadius',
        'uRingWidth',
      ])
      if (!renderProg) return
    }

    const quad = createQuad(gl)
    if (!quad) {
      updateProg?.dispose()
      dropProg?.dispose()
      renderProg?.dispose()
      return
    }

    /* -------------------------------------------------------------- state */

    let targetA: RenderTarget | null = null
    let targetB: RenderTarget | null = null
    let contourTex: WebGLTexture | null = gl.createTexture()
    let contourW = 0
    let contourH = 0
    let simW = 0
    let simH = 0
    let viewW = 1
    let viewH = 1
    let cssW = 1
    let cssH = 1
    let aspect = 1
    let speed = 1

    const dropQueue: Drop[] = []
    const analytic: { u: number; v: number; born: number; strength: number }[] = []
    const analyticBuf = new Float32Array(MAX_ANALYTIC * 4)

    let energy = 0
    let lastDropAt = 0
    let lastDropU = 0.5
    let lastDropV = 0.5
    /** Verification-only counter: total drops ever queued, read by `__cineheightRipple.dropCount`. */
    let dropCount = 0
    let lastPointerMoveAt = -1e9
    let nextAutoAt = performance.now() + cfg.autoMinMs
    let simAccum = 0
    let inView = true
    let contextLost = false
    let freeze = false

    // Pointer bookkeeping. Handlers NEVER read layout — see the rect note below.
    let ptrX = 0
    let ptrY = 0
    let ptrDirty = false
    let rect: DOMRect | null = null
    let cursorHandedOver = false

    let pendingResize = true
    let wakeTimer = 0

    const disposeTargets = () => {
      disposeTarget(gl, targetA)
      disposeTarget(gl, targetB)
      targetA = targetB = null
    }

    /**
     * The simulation grid matches the canvas aspect so its texels are square.
     * A square grid stretched over a 16:9 stage makes every ripple an ellipse
     * and makes waves travel faster horizontally than vertically.
     */
    const resize = () => {
      pendingResize = false
      cssW = Math.max(1, canvas.clientWidth)
      cssH = Math.max(1, canvas.clientHeight)
      const fit = Math.sqrt(cfg.maxPixels / (cssW * cssH))
      const dpr = Math.min(window.devicePixelRatio || 1, cfg.dprCap, caps.dprCeiling, fit)
      viewW = Math.max(1, Math.round(cssW * dpr))
      viewH = Math.max(1, Math.round(cssH * dpr))
      if (canvas.width !== viewW) canvas.width = viewW
      if (canvas.height !== viewH) canvas.height = viewH
      aspect = cssW / cssH

      // Re-rasterise the contour hairlines at the new device resolution so the
      // 0.6px non-scaling strokes stay exactly 0.6px.
      if (contourTex && (viewW !== contourW || viewH !== contourH)) {
        const field = drawContourField(viewW, viewH)
        if (field) {
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, contourTex)
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field)
          gl.activeTexture(gl.TEXTURE0)
          contourW = viewW
          contourH = viewH
        }
      }

      if (!simulating) {
        // The analytic path has no grid, but still needs its own normal scale
        // and a decay matched to the tier's lifetime.
        tune.slope = cfg.analyticSlope
        tune.damping = Math.exp(Math.log(0.04) / (cfg.lifetime * 60))
        return
      }

      const long = cfg.simLong
      const nextW = cssW >= cssH ? long : Math.max(64, Math.round(long * (cssW / cssH)))
      const nextH = cssW >= cssH ? Math.max(64, Math.round(long * (cssH / cssW))) : long
      if (nextW === simW && nextH === simH && targetA && targetB) return

      disposeTargets()
      simW = nextW
      simH = nextH
      targetA = createTarget(gl, simW, simH, caps.floatFormat!)
      targetB = createTarget(gl, simW, simH, caps.floatFormat!)
      if (!targetA || !targetB) {
        // Allocation failed at this size — fall back rather than render garbage.
        disposeTargets()
        simulating = false
        return
      }

      /*
       * Derivations kept here so the tuning table stays re-derivable:
       *   uSpeed  = min(1.40, (frontSpeed * simLong / 60)^2 / 0.3)
       *             → wave speed c = sqrt(uSpeed / 4) texels per frame
       *   damping = exp(ln(0.04) / (lifetime * 60))
       *   slope   = slopeBase * simLong / 512
       *
       * frontSpeed dropped from 0.075 to 0.038 grid-widths/second. At the old
       * value the wave crossed ~98px of radius per second and had spread to a
       * 364px diameter within half a second — past the intended 180–300px, and
       * spreading that fast is also what killed the amplitude: measured peak
       * luminance fell from 17.5/255 at 120ms to 6.6 by 300ms, because the same
       * energy was being smeared around an ever-longer circumference. Half the
       * speed keeps the ripple inside the target diameter and legible for its
       * whole lifetime.
       */
      const front = (cfg.frontSpeed * Math.max(simW, simH)) / 60
      speed = Math.min(1.4, (front * front) / 0.3)
      tune.damping = Math.exp(Math.log(0.04) / (cfg.lifetime * 60))
      tune.slope = (cfg.slopeBase * Math.max(simW, simH)) / 512
    }

    /* ------------------------------------------------------------- drawing */

    const bindQuad = (prog: Program) => {
      gl.useProgram(prog.program)
      gl.bindBuffer(gl.ARRAY_BUFFER, quad)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    }

    const drawTo = (target: RenderTarget | null) => {
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
        gl.viewport(0, 0, target.width, target.height)
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, viewW, viewH)
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const setShadeUniforms = (prog: Program, rippleFade: number) => {
      gl.uniform1f(prog.uniforms.uAspect, aspect)
      gl.uniform1f(prog.uniforms.uSlope, tune.slope)
      gl.uniform1f(prog.uniforms.uPerturbance, tune.perturbance)
      gl.uniform1f(prog.uniforms.uSpecular, tune.specular)
      gl.uniform1f(prog.uniforms.uRim, tune.rim)
      gl.uniform1f(prog.uniforms.uShade, tune.shade)
      gl.uniform1f(prog.uniforms.uCaustic, tune.caustic)
      gl.uniform1f(prog.uniforms.uTint, cfg.tint)
      gl.uniform1f(prog.uniforms.uRippleFade, rippleFade)
      gl.uniform1f(prog.uniforms.uFadeStart, cfg.fadeStart)
      gl.uniform1f(prog.uniforms.uFadeEnd, cfg.fadeEnd)
      gl.uniform1f(prog.uniforms.uDetail, tune.detail)
      gl.uniform1i(prog.uniforms.uDebugView, tune.debugView)
      // One CSS pixel in p units, so the detail band is authored in real pixels
      // and lands at the same physical scale on every viewport.
      gl.uniform2f(prog.uniforms.uPxToP, 1 / cssW, 1 / cssH)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, contourTex)
      gl.uniform1i(prog.uniforms.uContours, 1)
      // Leave unit 0 selected — the state texture binds there every frame.
      gl.activeTexture(gl.TEXTURE0)
    }

    const swap = () => {
      const t = targetA
      targetA = targetB
      targetB = t
    }

    const applyDrops = () => {
      if (!simulating || !dropProg || !targetA || !targetB || dropQueue.length === 0) return
      while (dropQueue.length > 0) {
        const batch = dropQueue.splice(0, 4)
        bindQuad(dropProg)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, targetA.texture)
        gl.uniform1i(dropProg.uniforms.uState, 0)
        gl.uniform2f(dropProg.uniforms.uSimSize, simW, simH)
        gl.uniform1i(dropProg.uniforms.uDropCount, batch.length)
        const buf = new Float32Array(16)
        for (let i = 0; i < batch.length; i++) {
          buf[i * 4] = batch[i].u
          buf[i * 4 + 1] = batch[i].v
          buf[i * 4 + 2] = batch[i].strength
          buf[i * 4 + 3] = tune.dropRadius
        }
        gl.uniform4fv(dropProg.uniforms.uDrops, buf)
        drawTo(targetB)
        swap()
      }
    }

    const stepSim = () => {
      if (!simulating || !updateProg || !targetA || !targetB) return
      bindQuad(updateProg)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, targetA.texture)
      gl.uniform1i(updateProg.uniforms.uState, 0)
      gl.uniform2f(updateProg.uniforms.uTexel, 1 / simW, 1 / simH)
      gl.uniform1f(updateProg.uniforms.uSpeed, speed)
      gl.uniform1f(updateProg.uniforms.uDamping, tune.damping)
      gl.uniform1f(updateProg.uniforms.uDrag, cfg.drag)
      drawTo(targetB)
      swap()
    }

    const queueDrop = (u: number, v: number, strength: number) => {
      // Ripples are suppressed inside the bottom blend band — one under the
      // opaque part of the blend is wasted work, and one under the
      // semi-transparent part reads as a smudge rather than as water.
      const y = 1 - v
      if (y > RIPPLE_FADE_END) return
      /*
       * Once the title starts dissolving, stop seeding. Whatever is already on
       * the surface decays naturally, so the brand statement arrives on a clean
       * black stage instead of over a surface still being poked.
       */
      if (scrollFade < 0.85) return
      if (dropQueue.length >= cfg.maxDropsPerFrame) return
      dropQueue.push({ u, v, strength })
      dropCount++
      if (!simulating) {
        if (analytic.length >= MAX_ANALYTIC) analytic.shift()
        analytic.push({ u, v, born: performance.now(), strength: Math.abs(strength) })
      }
    }

    /* ------------------------------------------------------------- opacity */

    let intro = 0
    let scrollFade = 1
    let written = -1
    const applyOpacity = () => {
      const o = tune.enabled ? intro * scrollFade : 0
      if (Math.abs(o - written) < 0.004) return
      written = o
      const text = o.toFixed(3)
      canvas.style.opacity = text
      // The blend band lives in the shader, so it dissolves with the surface
      // automatically — there is no second element to keep in step.
      canvas.style.visibility = o < 0.002 ? 'hidden' : 'visible'
    }

    const readScrollFade = (p: number) => {
      const t = clamp((p - FADE_IN) / (FADE_OUT - FADE_IN), 0, 1)
      scrollFade = 1 - t * t * (3 - 2 * t)
    }
    readScrollFade(getHeroProgress())

    /* ---------------------------------------------------------------- loop */

    const loop = createManagedFrameLoop(
      (now, dt) => {
        if (contextLost) return false
        if (pendingResize) resize()
        if (!simulating && !renderProg) return false

        rect ??= canvas.getBoundingClientRect()

        // Pointer → canvas UV. GL's v is bottom-up.
        let u = 0
        let v = 0
        let inside = false
        if (rect.width > 0 && rect.height > 0) {
          u = (ptrX - rect.left) / rect.width
          v = 1 - (ptrY - rect.top) / rect.height
          inside = u >= 0 && u <= 1 && v >= 0 && v <= 1
        }

        /*
         * Hand the pointer over to the native cursor while it is inside the
         * hero. The site's custom signal cursor is a small glowing blue dot,
         * and directly on top of the point a ripple is originating from it
         * reads as part of the effect rather than as a pointer.
         */
        if (inside !== cursorHandedOver) {
          cursorHandedOver = inside
          const root = document.documentElement
          if (inside) root.dataset.heroSurface = 'true'
          else delete root.dataset.heroSurface
        }

        if (ptrDirty && inside) {
          // Distance in CSS pixels. It used to be measured in height-normalised
          // units, which made the threshold viewport-dependent (~14px at
          // 1440x900) and impossible to reason about against a pointer spec.
          const distPx = Math.hypot((u - lastDropU) * cssW, (v - lastDropV) * cssH)
          const elapsed = now - lastDropAt
          if (distPx > cfg.teleportPx || elapsed > 300) {
            // Re-entry / cursor warp (tab-switch return, a jump across the
            // hero) — one drop at the destination. Walking a path across a
            // jump like this would draw a false trail across empty water.
            const gain = clamp(1 - energy / cfg.maxEnergy, 0.2, 1)
            queueDrop(u, v, -tune.dropStrength * gain)
            energy = Math.min(cfg.maxEnergy, energy + gain)
            lastDropAt = now
            lastDropU = u
            lastDropV = v
          } else if (distPx > 0) {
            // Smooth flowing trail: the simulation used to receive one
            // fully-formed, instantaneous drop per accepted sample (72-110ms
            // and 24-28px apart), which read as discrete "taps" rather than
            // continuous forcing. Instead, walk the segment from the last
            // sample to this one in small sub-steps, each a fraction of the
            // full drop strength — the SUM of those fractions across the
            // WALKED distance always equals what one full-strength drop over
            // that distance would have been (see `perStepStrength` below), so
            // subdivision only changes smoothness, never total injected
            // energy or the already-calibrated amplitude/decay character.
            const speedPxPerS = (distPx / Math.max(1, elapsed)) * 1000
            const speedK = clamp(speedPxPerS / cfg.refSpeedPx, 0.45, 1.15)
            const gain = clamp(1 - energy / cfg.maxEnergy, 0.2, 1)
            /*
             * Cap how much distance a single frame is allowed to "pay for" —
             * the same ceiling `speedK` already puts on per-drop strength,
             * extended to distance. Without this, a single coalesced frame
             * reporting an abnormally large on-screen jump (a fast real flick,
             * or several queued pointermove events collapsing into one rAF
             * tick) would inject energy proportional to that raw distance
             * with no upper bound, blowing straight through `maxEnergy` in
             * one frame. Any distance beyond the cap is caught up over the
             * following frames — self-correcting, not skipped or dumped.
             */
            const maxWalkPx = (cfg.refSpeedPx * 1.15 * Math.max(1, elapsed)) / 1000
            const walkedDistPx = Math.min(distPx, maxWalkPx)
            const frac = walkedDistPx / distPx
            const targetU = lastDropU + (u - lastDropU) * frac
            const targetV = lastDropV + (v - lastDropV) * frac
            const steps = clamp(Math.round(walkedDistPx / cfg.dropSpacingPx), 1, cfg.maxSubDropsPerFrame)
            const perStepStrength = (-tune.dropStrength * speedK * gain * (walkedDistPx / steps)) / cfg.energyRefPx
            for (let i = 1; i <= steps; i++) {
              const t = i / steps
              queueDrop(lastDropU + (targetU - lastDropU) * t, lastDropV + (targetV - lastDropV) * t, perStepStrength)
            }
            energy = Math.min(cfg.maxEnergy, energy + speedK * gain * (walkedDistPx / cfg.energyRefPx))
            lastDropAt = now
            lastDropU = targetU
            lastDropV = targetV
          } else {
            lastDropAt = now
          }
          ptrDirty = false
        }

        if (tune.autoRipples && now >= nextAutoAt) {
          const pointerActive = now - lastPointerMoveAt < POINTER_IDLE_MS
          if (pointerActive || energy > cfg.maxEnergy * 0.4) {
            // Deferred, never cancelled — the cadence resumes as soon as the
            // visitor stops driving it.
            nextAutoAt = now + 800
          } else {
            const g = () => Math.random() + Math.random() - 1
            const au = clamp(0.5 + g() * 0.17, 0.18, 0.82)
            const av = clamp(0.54 + g() * 0.11, 0.3, 0.8)
            queueDrop(au, av, -tune.dropStrength * 0.55)
            energy += 0.55
            nextAutoAt = now + cfg.autoMinMs + Math.random() * (cfg.autoMaxMs - cfg.autoMinMs)
          }
        }

        energy *= Math.exp(-dt / (cfg.lifetime * 400))

        if (simulating) {
          applyDrops()
          if (!freeze) {
            simAccum = Math.min(simAccum + dt, SIM_STEP_MS * cfg.maxSteps)
            let steps = 0
            while (simAccum >= SIM_STEP_MS && steps < cfg.maxSteps) {
              stepSim()
              simAccum -= SIM_STEP_MS
              steps++
            }
          }
          if (!renderProg || !targetA) return false
          bindQuad(renderProg)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, targetA.texture)
          gl.uniform1i(renderProg.uniforms.uState, 0)
          gl.uniform2f(renderProg.uniforms.uTexel, 1 / simW, 1 / simH)
          setShadeUniforms(renderProg, freeze ? 0 : 1)
          drawTo(null)
        } else {
          if (!renderProg) return false
          // Age out finished ripples, then upload what is left.
          const life = cfg.lifetime * 1000
          for (let i = analytic.length - 1; i >= 0; i--) {
            if (now - analytic[i].born >= life) analytic.splice(i, 1)
          }
          const count = Math.min(analytic.length, MAX_ANALYTIC)
          for (let i = 0; i < count; i++) {
            const r = analytic[i]
            analyticBuf[i * 4] = r.u
            analyticBuf[i * 4 + 1] = 1 - r.v // p-space is top-down
            analyticBuf[i * 4 + 2] = clamp((now - r.born) / life, 0, 1)
            // Strength passes straight through: the analytic path carries its
            // own normal scale (`analyticSlope`), so it does not need a second
            // fudge factor here. The old x9 was compensating for sharing the
            // simulation's per-texel slope, which is what blew it out.
            analyticBuf[i * 4 + 3] = r.strength
          }
          dropQueue.length = 0
          bindQuad(renderProg)
          gl.uniform4fv(renderProg.uniforms.uRipples, analyticBuf)
          gl.uniform1i(renderProg.uniforms.uRippleCount, freeze ? 0 : count)
          gl.uniform1f(renderProg.uniforms.uMaxRadius, 0.52)
          gl.uniform1f(renderProg.uniforms.uRingWidth, 0.055)
          setShadeUniforms(renderProg, freeze ? 0 : 1)
          drawTo(null)
        }

        if (intro < 1) {
          intro = Math.min(1, intro + dt / 700)
          applyOpacity()
        }

        // Sleep once the surface has genuinely settled, so an untouched hero
        // costs nothing at all.
        const busy =
          energy > 0.01 ||
          dropQueue.length > 0 ||
          (!simulating && analytic.length > 0) ||
          intro < 1 ||
          pendingResize
        if (!busy) {
          window.clearTimeout(wakeTimer)
          /*
           * Only re-arm when something is actually scheduled to happen. With
           * idle auto-ripples off there is nothing to wake FOR, and re-arming
           * anyway would spin the loop awake every couple of seconds to render
           * an identical frame forever.
           */
          if (tune.autoRipples) {
            wakeTimer = window.setTimeout(
              () => loop.wake(),
              Math.max(200, nextAutoAt - performance.now())
            )
          }
          return false
        }
        return true
      },
      { canRun: () => inView && !contextLost }
    )

    /* ----------------------------------------------------------- listeners */

    /*
     * The stage is `position: sticky; top: 0` inside a 205vh section: it is
     * pinned for the first ~105vh and then walks upward. A rect cached at mount
     * is therefore correct at scroll 0 — exactly where it would be tested — and
     * up to a full viewport wrong later. So handlers only stash coordinates,
     * and the rect is re-measured at most once per frame inside the loop. That
     * also keeps `getBoundingClientRect()` out of the scroll handler, where it
     * would force synchronous layout on the hottest path on the page.
     */
    const invalidateRect = () => {
      rect = null
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return // that is a scroll, not a gesture at the surface
      ptrX = event.clientX
      ptrY = event.clientY
      ptrDirty = true
      lastPointerMoveAt = performance.now()
      loop.wake()
    }

    const onDown = (event: PointerEvent) => {
      ptrX = event.clientX
      ptrY = event.clientY
      lastPointerMoveAt = performance.now()
      rect ??= canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const u = (event.clientX - rect.left) / rect.width
      const v = 1 - (event.clientY - rect.top) / rect.height
      if (u < 0 || u > 1 || v < 0 || v > 1) return
      const gain = clamp(1 - energy / cfg.maxEnergy, 0.2, 1)
      const boost = event.pointerType === 'touch' ? 1.15 : 1.25
      queueDrop(u, v, -cfg.dropStrength * boost * gain)
      energy += gain
      lastDropAt = performance.now()
      lastDropU = u
      lastDropV = v
      loop.wake()
    }

    const onContextLost = (event: Event) => {
      event.preventDefault()
      contextLost = true
      loop.sleep()
    }
    const onContextRestored = () => {
      contextLost = false
      pendingResize = true
      loop.wake()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('scroll', invalidateRect, { passive: true, capture: true })
    window.addEventListener('resize', invalidateRect)
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', onContextRestored)

    const ro = new ResizeObserver(() => {
      invalidateRect()
      pendingResize = true
      loop.wake()
    })
    ro.observe(canvas)

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        if (inView) loop.wake()
        else loop.sleep()
      },
      { threshold: 0 }
    )
    io.observe(canvas)

    const unsubscribe = subscribeHeroProgress((p) => {
      readScrollFade(p)
      applyOpacity()
      if (scrollFade > 0.002) loop.wake()
    })

    // A debug-panel change must be visible on the next frame, and toggling the
    // canvas off/on with "R" has to move the element's opacity, not just a
    // uniform.
    const unsubscribeTune = subscribeTune(() => {
      written = -1
      applyOpacity()
      loop.wake()
    })

    /* ------------------------------------------------- verification handle */

    const handle = {
      path: simulating ? 'simulation' : 'analytic',
      format: caps.floatFormat?.label ?? null,
      tier,
      get sim() {
        return { w: simW, h: simH }
      },
      get energy() {
        return energy
      },
      /** Verification-only: total drops queued since mount. */
      get dropCount() {
        return dropCount
      },
      /** Flatten the surface so the opaque plate can be diffed against the DOM. */
      freeze(on: boolean) {
        freeze = on
        loop.wake()
      },
      /** Live tuning values, so a probe can read what it is actually testing. */
      tune,
      /** Fire a ripple at canvas UV, for deterministic interaction probes. */
      drop(u: number, v: number, strength = tune.dropStrength) {
        queueDrop(u, v, -Math.abs(strength))
        energy += 1
        loop.wake()
      },
    }
    Object.defineProperty(window, '__cineheightRipple', { configurable: true, value: handle })

    resize()
    applyOpacity()
    loop.wake()

    return () => {
      window.clearTimeout(wakeTimer)
      delete document.documentElement.dataset.heroSurface
      registerTune(null)
      loop.destroy()
      unsubscribe()
      unsubscribeTune()
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', invalidateRect, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', invalidateRect)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      disposeTargets()
      if (contourTex) gl.deleteTexture(contourTex)
      contourTex = null
      updateProg?.dispose()
      dropProg?.dispose()
      renderProg?.dispose()
      gl.deleteBuffer(quad)
      delete (window as unknown as Record<string, unknown>).__cineheightRipple
      /*
       * Deliberately NOT calling WEBGL_lose_context.loseContext(). getContext is
       * memoised per canvas per context type, so React Strict Mode's second
       * mount receives this very same context object — killing it here would
       * leave the remount with a dead context and a blank hero.
       */
    }
  }, [tier])

  /*
   * There is no separate DOM fade element.
   *
   * The blend into solid black is applied at the end of the render shader
   * instead. Measured on the real page at 1440x900: the shader's own plate
   * steps 0.56/255 between rows, the plain DOM background steps 2.67/255, and
   * laying a CSS gradient over the canvas took the composite to 1.44/255. The
   * ramp only spans about 5/255 in the blue channel, so an 8-bit CSS gradient
   * has nowhere to hide its quantisation, whereas the shader can dither it.
   *
   * The layer contract is unchanged: the blend is still applied above the
   * ripple (it is the last thing the ripple pass does) and below the title,
   * the clouds and every interface element.
   */
  return (
    <>
      <canvas
        ref={canvasRef}
        data-hero-ripple
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block h-full w-full max-w-full"
        style={{ opacity: 0 }}
      />
      {/* Compiled out of production builds by the NODE_ENV guard inside it. */}
      <RippleDebugPanel />
    </>
  )
}
