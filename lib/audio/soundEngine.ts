/**
 * The Cineheight soundscape — entirely procedural Web Audio.
 *
 * Nothing here is downloaded. Every texture is synthesised from noise buffers
 * and oscillators, which keeps the payload at zero bytes, sidesteps licensing
 * entirely, and means the ambience has no loop seam to hear.
 *
 * Design rules the graph enforces:
 *
 *  - **Nothing sounds until a visitor asks for it.** The AudioContext is not
 *    even constructed until {@link SoundEngine.start} is called from inside a
 *    real user gesture. Browsers would block audible autoplay anyway; more to
 *    the point, surprise sound is hostile.
 *  - **The bed is felt, not heard.** Level sits low enough that most people
 *    only notice it when it stops.
 *  - **Video always wins.** When any video on the page is unmuted the bed and
 *    the pointer sounds duck out of its way, because two audio experiences
 *    competing is worse than either alone.
 *  - **Pointer sound is rate-limited.** A sound per `pointermove` would be
 *    hundreds of events a second. A token bucket caps it at a handful.
 */

import { clamp } from '@/lib/utils'

/** Peak level of the ambient bed. Deliberately very low. */
const AMBIENT_LEVEL = 0.035
const SUB_LEVEL = 0.014
/** Multiplier applied to the bed while a video is audible. */
const DUCK_AMBIENT = 0.15
const DUCK_SFX = 0.08
/** Micro-sound budget: tokens per second, and the ceiling on stored tokens. */
const SFX_TOKENS_PER_S = 6
const SFX_TOKEN_MAX = 4
/** Pointer travel, in px, that must accumulate before a chalk grain fires. */
const GRAIN_DISTANCE = 340

type Cleanup = () => void

/** Fill an AudioBuffer with pink-ish noise (Voss-McCartney approximation). */
function fillPinkNoise(buffer: AudioBuffer) {
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  }
}

/** White noise, used for the short brush and tick voices. */
function fillWhiteNoise(buffer: AudioBuffer) {
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
}

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambientDuck: GainNode | null = null
  private sfxDuck: GainNode | null = null
  private ambientGain: GainNode | null = null
  private brushGain: GainNode | null = null
  private brushFilter: BiquadFilterNode | null = null
  private brushPan: StereoPannerNode | null = null
  private pinkBuffer: AudioBuffer | null = null
  private whiteBuffer: AudioBuffer | null = null
  private cleanups: Cleanup[] = []

  private tokens = SFX_TOKEN_MAX
  private lastTokenRefill = 0
  private travelSinceGrain = 0
  private ducked = false
  private running = false

  isRunning() {
    return this.running
  }

  /**
   * Build the graph and begin. MUST be called synchronously from a user
   * gesture handler — that is the only moment a browser will allow an
   * AudioContext to enter the `running` state.
   */
  async start(): Promise<void> {
    if (this.running) return
    if (typeof window === 'undefined') return

    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return

    if (!this.ctx) {
      this.ctx = new Ctor()
      this.build()
      this.exposeForVerification()
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    this.running = true

    // Fade up rather than punching in.
    const now = this.ctx.currentTime
    this.master?.gain.cancelScheduledValues(now)
    this.master?.gain.setValueAtTime(this.master.gain.value, now)
    this.master?.gain.linearRampToValueAtTime(1, now + 0.9)
  }

  /** Fade out and suspend. The graph is kept so restarting is instant. */
  async stop(): Promise<void> {
    if (!this.ctx || !this.master) {
      this.running = false
      return
    }
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(0, now + 0.35)
    this.running = false
    const ctx = this.ctx
    window.setTimeout(() => {
      if (!this.running && ctx.state === 'running') void ctx.suspend()
    }, 420)
  }

  /** Release everything. Called when the provider unmounts. */
  destroy() {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.running = false
    void this.ctx?.close()
    this.ctx = null
  }

  /** Tab visibility — never keep an audio graph alive behind a hidden tab. */
  setSuspended(suspend: boolean) {
    if (!this.ctx) return
    if (suspend && this.ctx.state === 'running') void this.ctx.suspend()
    else if (!suspend && this.running && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  /** Duck the bed and micro-sounds out of a video's way. */
  setDucked(ducked: boolean) {
    if (this.ducked === ducked) return
    this.ducked = ducked
    if (!this.ctx || !this.ambientDuck || !this.sfxDuck) return
    const now = this.ctx.currentTime
    // Duck quickly, restore gently — the reverse feels like a mistake.
    const time = ducked ? 0.3 : 0.7
    for (const [node, level] of [
      [this.ambientDuck, DUCK_AMBIENT],
      [this.sfxDuck, DUCK_SFX],
    ] as const) {
      node.gain.cancelScheduledValues(now)
      node.gain.setValueAtTime(node.gain.value, now)
      node.gain.linearRampToValueAtTime(ducked ? level : 1, now + time)
    }
  }

  isDucked() {
    return this.ducked
  }

  /**
   * A read-only window handle so the screenshot harness can assert what the
   * audio graph is actually doing. Audio state is invisible in a screenshot,
   * and "it probably ducked" is not verification. Exposes nothing writable and
   * only ever exists after the visitor has switched sound on.
   */
  private exposeForVerification() {
    Object.defineProperty(window, '__cineheightAudio', {
      configurable: true,
      get: () => ({
        state: this.ctx?.state ?? 'none',
        ducked: this.ducked,
        running: this.running,
      }),
    })
  }

  private build() {
    const ctx = this.ctx
    if (!ctx) return

    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)

    this.ambientDuck = ctx.createGain()
    this.ambientDuck.connect(this.master)
    this.sfxDuck = ctx.createGain()
    this.sfxDuck.connect(this.master)

    // ---- noise sources -------------------------------------------------
    const pink = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 6), ctx.sampleRate)
    fillPinkNoise(pink)
    this.pinkBuffer = pink
    const white = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1), ctx.sampleRate)
    fillWhiteNoise(white)
    this.whiteBuffer = white

    // ---- ambient bed ---------------------------------------------------
    // Pink noise through a low-pass reads as air rather than hiss. Looping a
    // 6 s buffer of noise has no audible seam because noise has no phase to
    // mismatch.
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = pink
    noiseSource.loop = true

    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 420
    lowpass.Q.value = 0.6

    // Roll off the very bottom: bass-heavy rumble is fatiguing and inaudible
    // on the laptop speakers most visitors will use.
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 90

    this.ambientGain = ctx.createGain()
    this.ambientGain.gain.value = AMBIENT_LEVEL

    noiseSource.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(this.ambientGain)
    this.ambientGain.connect(this.ambientDuck)
    noiseSource.start()
    this.cleanups.push(() => noiseSource.stop())

    // A soft low sine underneath gives the bed a floor without becoming a note.
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 56
    const subGain = ctx.createGain()
    subGain.gain.value = SUB_LEVEL
    sub.connect(subGain)
    subGain.connect(this.ambientDuck)
    sub.start()
    this.cleanups.push(() => sub.stop())

    // Very slow amplitude drift so the bed breathes instead of sitting static.
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.055
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = AMBIENT_LEVEL * 0.42
    lfo.connect(lfoDepth)
    lfoDepth.connect(this.ambientGain.gain)
    lfo.start()
    this.cleanups.push(() => lfo.stop())

    // ---- pointer brush -------------------------------------------------
    // One continuously running noise voice whose gain and filter follow the
    // pointer. Continuous means no per-move node churn; the gain envelope is
    // what makes it a brush rather than a drone.
    const brushSource = ctx.createBufferSource()
    brushSource.buffer = pink
    brushSource.loop = true

    this.brushFilter = ctx.createBiquadFilter()
    this.brushFilter.type = 'bandpass'
    this.brushFilter.frequency.value = 1100
    this.brushFilter.Q.value = 0.9

    this.brushGain = ctx.createGain()
    this.brushGain.gain.value = 0

    this.brushPan = ctx.createStereoPanner()

    brushSource.connect(this.brushFilter)
    this.brushFilter.connect(this.brushGain)
    this.brushGain.connect(this.brushPan)
    this.brushPan.connect(this.sfxDuck)
    brushSource.start()
    this.cleanups.push(() => brushSource.stop())
  }

  /** Refill the micro-sound token bucket. */
  private takeToken(now: number): boolean {
    if (!this.lastTokenRefill) this.lastTokenRefill = now
    const elapsed = (now - this.lastTokenRefill) / 1000
    this.tokens = Math.min(SFX_TOKEN_MAX, this.tokens + elapsed * SFX_TOKENS_PER_S)
    this.lastTokenRefill = now
    if (this.tokens < 1) return false
    this.tokens -= 1
    return true
  }

  /**
   * Pointer moved. `speed` is px/ms, `panX` is 0–1 across the viewport.
   * `quiet` suppresses everything over text, forms and navigation.
   */
  pointerMove(speed: number, panX: number, distance: number, quiet: boolean) {
    if (!this.running || !this.ctx || !this.brushGain || !this.brushFilter || !this.brushPan) return
    const now = this.ctx.currentTime

    const intensity = quiet ? 0 : clamp(speed / 2.2, 0, 1)
    // Short attack, longer release: the sound arrives with the movement and
    // trails off after it, like a brush lifting.
    const target = intensity * 0.05
    this.brushGain.gain.cancelScheduledValues(now)
    this.brushGain.gain.setTargetAtTime(target, now, target > this.brushGain.gain.value ? 0.05 : 0.2)
    this.brushFilter.frequency.setTargetAtTime(700 + intensity * 1900, now, 0.12)
    this.brushPan.pan.setTargetAtTime(clamp(panX * 2 - 1, -1, 1), now, 0.15)

    if (quiet) {
      this.travelSinceGrain = 0
      return
    }
    // Chalk grains fire on accumulated travel, not on every event, so they
    // read as texture in the movement rather than a rattle.
    this.travelSinceGrain += distance
    if (this.travelSinceGrain >= GRAIN_DISTANCE) {
      this.travelSinceGrain = 0
      this.grain(panX)
    }
  }

  /** A single tiny filtered noise grain. */
  private grain(panX: number) {
    const ctx = this.ctx
    if (!ctx || !this.whiteBuffer || !this.sfxDuck) return
    if (!this.takeToken(performance.now())) return

    const src = ctx.createBufferSource()
    src.buffer = this.whiteBuffer
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 3200
    const gain = ctx.createGain()
    const pan = ctx.createStereoPanner()
    pan.pan.value = clamp(panX * 2 - 1, -1, 1)

    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.02, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(pan)
    pan.connect(this.sfxDuck)
    src.start(now)
    src.stop(now + 0.06)
    src.onended = () => {
      src.disconnect()
      filter.disconnect()
      gain.disconnect()
      pan.disconnect()
    }
  }

  /**
   * The pluck, fired on pointer-down in sympathy with the canvas ripple: a
   * quiet low transient with a short bright tick on top of it.
   */
  pluck(panX: number) {
    const ctx = this.ctx
    if (!this.running || !ctx || !this.sfxDuck || !this.whiteBuffer) return
    if (!this.takeToken(performance.now())) return

    const now = ctx.currentTime
    const pan = ctx.createStereoPanner()
    pan.pan.value = clamp(panX * 2 - 1, -1, 1)
    pan.connect(this.sfxDuck)

    // body
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(88, now + 0.22)
    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.001, now)
    oscGain.gain.linearRampToValueAtTime(0.06, now + 0.012)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
    osc.connect(oscGain)
    oscGain.connect(pan)
    osc.start(now)
    osc.stop(now + 0.32)

    // tick
    const tick = ctx.createBufferSource()
    tick.buffer = this.whiteBuffer
    const tickFilter = ctx.createBiquadFilter()
    tickFilter.type = 'bandpass'
    tickFilter.frequency.value = 4200
    tickFilter.Q.value = 1.4
    const tickGain = ctx.createGain()
    tickGain.gain.setValueAtTime(0.028, now)
    tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)
    tick.connect(tickFilter)
    tickFilter.connect(tickGain)
    tickGain.connect(pan)
    tick.start(now)
    tick.stop(now + 0.06)

    osc.onended = () => {
      osc.disconnect()
      oscGain.disconnect()
      tick.disconnect()
      tickFilter.disconnect()
      tickGain.disconnect()
      pan.disconnect()
    }
  }

  /** Soft rising sweep as the route mask closes. */
  routeOut() {
    this.sweep(320, 2300, 0.36, 0.03)
  }

  /** Softer falling resolve as the destination reveals. */
  routeIn() {
    this.sweep(1900, 520, 0.44, 0.022)
  }

  private sweep(from: number, to: number, seconds: number, level: number) {
    const ctx = this.ctx
    if (!this.running || !ctx || !this.sfxDuck || !this.pinkBuffer) return

    const now = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.pinkBuffer
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.1
    filter.frequency.setValueAtTime(from, now)
    filter.frequency.exponentialRampToValueAtTime(to, now + seconds)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(level, now + seconds * 0.35)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxDuck)
    src.start(now)
    src.stop(now + seconds + 0.05)
    src.onended = () => {
      src.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
  }
}

let engine: SoundEngine | null = null

/** The single engine instance. Created lazily, never during server render. */
export function getSoundEngine(): SoundEngine | null {
  if (typeof window === 'undefined') return null
  if (!engine) engine = new SoundEngine()
  return engine
}
