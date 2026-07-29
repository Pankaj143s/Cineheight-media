/**
 * WebGL plumbing for the hero water surface.
 *
 * Everything capability-related is decided once, here, and returned as a plain
 * description the component acts on. The guiding rule is that an extension
 * string is a claim, not proof: several Android drivers advertise
 * `EXT_color_buffer_half_float` and then fail to complete a framebuffer with
 * one attached, so the only thing trusted below is an actual FBO probe.
 */

export type RipplePath = 'simulation' | 'analytic' | 'off'

export interface GLContext {
  gl: WebGLRenderingContext | WebGL2RenderingContext
  isWebGL2: boolean
  /** True when the context only came up with the performance caveat allowed. */
  software: boolean
}

export interface FloatTargetFormat {
  /** `internalformat` argument for texture allocation. */
  internalFormat: number
  /** `format` argument. */
  format: number
  /** `type` argument. */
  type: number
  label: 'RGBA32F' | 'RGBA16F' | 'RGBA_HALF_OES'
}

export interface RippleCapabilities {
  path: RipplePath
  ctx: GLContext | null
  /** Non-null only when `path === 'simulation'`. */
  floatFormat: FloatTargetFormat | null
  /** Extra DPR ceiling imposed by the capability probe (software rasterisers). */
  dprCeiling: number
}

const BASE_ATTRS: WebGLContextAttributes = {
  alpha: false, // opaque plate; also lets the compositor skip a blend
  depth: false,
  stencil: false,
  antialias: false, // fullscreen passes only — MSAA buys nothing here
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  // Never spin up a discrete GPU for a decorative background.
  powerPreference: 'default',
}

function tryContext(
  canvas: HTMLCanvasElement,
  kind: string,
  attrs: WebGLContextAttributes
): WebGLRenderingContext | WebGL2RenderingContext | null {
  try {
    // Some browsers throw here rather than returning null.
    return canvas.getContext(kind, attrs) as WebGLRenderingContext | WebGL2RenderingContext | null
  } catch {
    return null
  }
}

/**
 * Acquire a context, preferring WebGL2 and preferring a machine with real
 * hardware acceleration.
 *
 * `failIfMajorPerformanceCaveat` is asked for first. If the strict attempt
 * fails and the relaxed one succeeds, we are on a software rasteriser — the
 * caller drops to the analytic path at DPR 1 rather than asking SwiftShader to
 * run a wave simulation.
 */
function acquireContext(canvas: HTMLCanvasElement): GLContext | null {
  for (const kind of ['webgl2', 'webgl', 'experimental-webgl']) {
    const strict = tryContext(canvas, kind, { ...BASE_ATTRS, failIfMajorPerformanceCaveat: true })
    if (strict) return { gl: strict, isWebGL2: kind === 'webgl2', software: false }
  }
  for (const kind of ['webgl2', 'webgl', 'experimental-webgl']) {
    const relaxed = tryContext(canvas, kind, BASE_ATTRS)
    if (relaxed) return { gl: relaxed, isWebGL2: kind === 'webgl2', software: true }
  }
  return null
}

/** Does the fragment stage actually have highp? A half-float sim in mediump is hopeless. */
function hasHighp(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const p = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
  return !!p && p.precision > 0
}

/**
 * Allocate a 4×4 texture in `fmt`, attach it to a scratch framebuffer and ask
 * the driver whether that is actually renderable. Cleans up after itself.
 */
function probeRenderable(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  fmt: FloatTargetFormat
): boolean {
  const tex = gl.createTexture()
  const fbo = gl.createFramebuffer()
  if (!tex || !fbo) return false
  let ok = false
  try {
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internalFormat, 4, 4, 0, fmt.format, fmt.type, null)
    if (gl.getError() !== gl.NO_ERROR) return false
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
  } catch {
    ok = false
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.deleteFramebuffer(fbo)
    gl.deleteTexture(tex)
  }
  return ok
}

/**
 * Pick the state-texture format, or null if no float target is renderable.
 *
 * 32F is preferred on the top tier because the update step computes `avg - h`,
 * a catastrophic-cancellation subtraction of five nearly-equal values. At
 * half-float's ~11-bit mantissa that is roughly 10% numerical noise per step
 * for the long-wavelength, low-amplitude ripples this design is made of.
 */
function pickFloatFormat(
  ctx: GLContext,
  preferHighest: boolean
): FloatTargetFormat | null {
  const { gl, isWebGL2 } = ctx

  if (isWebGL2) {
    const gl2 = gl as WebGL2RenderingContext
    const cbFloat = gl.getExtension('EXT_color_buffer_float')
    const cbHalf = gl.getExtension('EXT_color_buffer_half_float')
    const floatLinear = gl.getExtension('OES_texture_float_linear')

    if (preferHighest && cbFloat && floatLinear) {
      const f: FloatTargetFormat = {
        internalFormat: gl2.RGBA32F,
        format: gl.RGBA,
        type: gl.FLOAT,
        label: 'RGBA32F',
      }
      if (probeRenderable(gl, f)) return f
    }
    if (cbFloat || cbHalf) {
      // NOTE: gl2.HALF_FLOAT (0x140B) is a DIFFERENT constant from WebGL1's
      // HALF_FLOAT_OES (0x8D61). Half-float LINEAR filtering is core in WebGL2.
      const f: FloatTargetFormat = {
        internalFormat: gl2.RGBA16F,
        format: gl.RGBA,
        type: gl2.HALF_FLOAT,
        label: 'RGBA16F',
      }
      if (probeRenderable(gl, f)) return f
    }
    return null
  }

  const half = gl.getExtension('OES_texture_half_float') as { HALF_FLOAT_OES: number } | null
  const halfLinear = gl.getExtension('OES_texture_half_float_linear')
  if (!half || !halfLinear) return null
  // WebGL1 requires internalFormat === format.
  const f: FloatTargetFormat = {
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: half.HALF_FLOAT_OES,
    label: 'RGBA_HALF_OES',
  }
  return probeRenderable(gl, f) ? f : null
}

/** Run the whole decision tree for a canvas. */
export function detectCapabilities(
  canvas: HTMLCanvasElement,
  preferHighest: boolean
): RippleCapabilities {
  const ctx = acquireContext(canvas)
  if (!ctx) return { path: 'off', ctx: null, floatFormat: null, dprCeiling: 1 }

  if (ctx.software) {
    return { path: 'analytic', ctx, floatFormat: null, dprCeiling: 1 }
  }
  if (!hasHighp(ctx.gl)) {
    return { path: 'analytic', ctx, floatFormat: null, dprCeiling: 1.25 }
  }

  const floatFormat = pickFloatFormat(ctx, preferHighest)
  if (!floatFormat) {
    return { path: 'analytic', ctx, floatFormat: null, dprCeiling: Infinity }
  }
  return { path: 'simulation', ctx, floatFormat, dprCeiling: Infinity }
}

/* ------------------------------------------------------------------ programs */

function compile(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== 'production') {
       
      console.warn('[ripple] shader compile failed:', gl.getShaderInfoLog(shader))
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export interface Program {
  program: WebGLProgram
  uniforms: Record<string, WebGLUniformLocation | null>
  dispose: () => void
}

export function createProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
  uniformNames: string[]
): Program | null {
  const vert = compile(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc)
  if (!vert || !frag) {
    if (vert) gl.deleteShader(vert)
    if (frag) gl.deleteShader(frag)
    return null
  }
  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vert)
    gl.deleteShader(frag)
    return null
  }
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.bindAttribLocation(program, 0, 'aPos')
  gl.linkProgram(program)
  // Shaders can be detached and deleted the moment the program is linked.
  gl.detachShader(program, vert)
  gl.detachShader(program, frag)
  gl.deleteShader(vert)
  gl.deleteShader(frag)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (process.env.NODE_ENV !== 'production') {
       
      console.warn('[ripple] program link failed:', gl.getProgramInfoLog(program))
    }
    gl.deleteProgram(program)
    return null
  }

  const uniforms: Record<string, WebGLUniformLocation | null> = {}
  for (const name of uniformNames) uniforms[name] = gl.getUniformLocation(program, name)

  return { program, uniforms, dispose: () => gl.deleteProgram(program) }
}

/* ------------------------------------------------------------------- targets */

export interface RenderTarget {
  texture: WebGLTexture
  framebuffer: WebGLFramebuffer
  width: number
  height: number
}

export function createTarget(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  width: number,
  height: number,
  fmt: FloatTargetFormat
): RenderTarget | null {
  const texture = gl.createTexture()
  const framebuffer = gl.createFramebuffer()
  if (!texture || !framebuffer) return null

  gl.bindTexture(gl.TEXTURE_2D, texture)
  // LINEAR so the drop and update passes interpolate smoothly; NPOT sizes are
  // legal with CLAMP_TO_EDGE and no mips.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internalFormat, width, height, 0, fmt.format, fmt.type, null)

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE

  // Start from a flat, still surface.
  if (ok) {
    gl.viewport(0, 0, width, height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)

  if (!ok) {
    gl.deleteTexture(texture)
    gl.deleteFramebuffer(framebuffer)
    return null
  }
  return { texture, framebuffer, width, height }
}

export function disposeTarget(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  target: RenderTarget | null
) {
  if (!target) return
  gl.deleteTexture(target.texture)
  gl.deleteFramebuffer(target.framebuffer)
}

/** The one fullscreen quad every pass draws. */
export function createQuad(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const buffer = gl.createBuffer()
  if (!buffer) return null
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  return buffer
}
