/**
 * The Cineheight soundscape — entirely procedural Web Audio.
 *
 * Voice matches the visual brand: dark field, blue signal, film weight.
 * Nothing is downloaded — dual-sine cinematic drone + soft low signal ticks.
 *
 * Design rules the graph enforces:
 *
 *  - **Nothing sounds until a visitor asks for it.** The AudioContext is not
 *    even constructed until {@link SoundEngine.start} is called from inside a
 *    real user gesture.
 *  - **The bed is felt, not heard.** A deep dual-sine drone with barely-there
 *    sub-180 Hz pressure — no mid/high hiss, no melody.
 *  - **Video always wins.** When any video on the page is unmuted the bed and
 *    SFX duck out of its way.
 *  - **The pointer is silent.** Only primary UI controls publish signal ticks.
 */

/** Ambient drone mix — quieter than the old “room air” bed. */
const AMBIENT_LEVEL = 0.022
/** Primary sub drone (~52 Hz). */
const SUB_LEVEL = 0.014
/** Quieter companion (~78 Hz) for body without a tune. */
const COMPANION_LEVEL = 0.007
/** Ultra-quiet low pressure noise under the drones. */
const PRESSURE_LEVEL = 0.006
/** Multiplier applied to the bed while a video is audible. */
const DUCK_AMBIENT = 0.14
const DUCK_SFX = 0.08
/** Soft signal-tick peak — dark, not a plastic beep. */
const CLICK_LEVEL = 0.04
/** Minimum gap between UI ticks (ms). */
const CLICK_MIN_INTERVAL_MS = 80

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

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambientDuck: GainNode | null = null
  private sfxDuck: GainNode | null = null
  private ambientGain: GainNode | null = null
  private pinkBuffer: AudioBuffer | null = null
  private cleanups: Cleanup[] = []

  private ducked = false
  private running = false
  private lastClickAt = 0

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

    // Fade up rather than punching in — a longer ramp so the drone arrives
    // without a perceptible "on".
    const now = this.ctx.currentTime
    this.master?.gain.cancelScheduledValues(now)
    this.master?.gain.setValueAtTime(this.master.gain.value, now)
    this.master?.gain.linearRampToValueAtTime(1, now + 1.6)
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
    this.master.gain.linearRampToValueAtTime(0, now + 0.5)
    this.running = false
    const ctx = this.ctx
    window.setTimeout(() => {
      if (!this.running && ctx.state === 'running') void ctx.suspend()
    }, 600)
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

  /** Duck the bed out of a video's way. */
  setDucked(ducked: boolean) {
    if (this.ducked === ducked) return
    this.ducked = ducked
    if (!this.ctx || !this.ambientDuck || !this.sfxDuck) return
    const now = this.ctx.currentTime
    // Duck quickly, restore gently — the reverse feels like a mistake.
    const time = ducked ? 0.35 : 0.9
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
   * audio graph is actually doing. Exposes nothing writable and only ever
   * exists after the visitor has switched sound on.
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

    // Shared pink buffer for pressure bed + SFX grains / route whooshes.
    const pink = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 8), ctx.sampleRate)
    fillPinkNoise(pink)
    this.pinkBuffer = pink

    // ---- cinematic drone bed -------------------------------------------
    // Dual sines carry the presence; noise only adds sub-180 Hz pressure so
    // nothing reads as hiss or “room air”.
    this.ambientGain = ctx.createGain()
    this.ambientGain.gain.value = AMBIENT_LEVEL
    this.ambientGain.connect(this.ambientDuck)

    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 52
    const subGain = ctx.createGain()
    subGain.gain.value = SUB_LEVEL
    sub.connect(subGain)
    subGain.connect(this.ambientGain)
    sub.start()
    this.cleanups.push(() => sub.stop())

    // Soft fifth-ish companion — body without becoming a melody.
    const companion = ctx.createOscillator()
    companion.type = 'sine'
    companion.frequency.value = 78
    const companionGain = ctx.createGain()
    companionGain.gain.value = COMPANION_LEVEL
    companion.connect(companionGain)
    companionGain.connect(this.ambientGain)
    companion.start()
    this.cleanups.push(() => companion.stop())

    // Barely-there low pressure — tight lowpass so mids never leak.
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = pink
    noiseSource.loop = true
    const pressureLp = ctx.createBiquadFilter()
    pressureLp.type = 'lowpass'
    pressureLp.frequency.value = 160
    pressureLp.Q.value = 0.7
    const pressureHp = ctx.createBiquadFilter()
    pressureHp.type = 'highpass'
    pressureHp.frequency.value = 40
    const pressureGain = ctx.createGain()
    pressureGain.gain.value = PRESSURE_LEVEL
    noiseSource.connect(pressureHp)
    pressureHp.connect(pressureLp)
    pressureLp.connect(pressureGain)
    pressureGain.connect(this.ambientGain)
    noiseSource.start()
    this.cleanups.push(() => noiseSource.stop())

    // Two very slow amplitude drifts (~23s / ~59s) so the drone breathes.
    for (const [rate, depth] of [
      [0.043, AMBIENT_LEVEL * 0.22],
      [0.017, AMBIENT_LEVEL * 0.12],
    ] as const) {
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = rate
      const lfoDepth = ctx.createGain()
      lfoDepth.gain.value = depth
      lfo.connect(lfoDepth)
      lfoDepth.connect(this.ambientGain.gain)
      lfo.start()
      this.cleanups.push(() => lfo.stop())
    }
  }

  /** Soft rising film whoosh as the route mask closes. */
  routeOut() {
    this.sweep(120, 480, 0.4, 0.018)
  }

  /** Softer falling resolve as the destination reveals. */
  routeIn() {
    this.sweep(420, 140, 0.48, 0.014)
  }

  /**
   * Soft signal tick — low sine gate + dark grain through sfxDuck.
   * Rate-limited so rapid taps cannot stack into a burst.
   */
  playUiClick() {
    const ctx = this.ctx
    if (!this.running || !ctx || !this.sfxDuck || !this.pinkBuffer) return

    const nowMs = performance.now()
    if (nowMs - this.lastClickAt < CLICK_MIN_INTERVAL_MS) return
    this.lastClickAt = nowMs

    const now = ctx.currentTime
    const duration = 0.078

    // Soft low sine — film-gate weight, not a UI beep.
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(240, now)
    osc.frequency.exponentialRampToValueAtTime(155, now + duration)

    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.0001, now)
    oscGain.gain.linearRampToValueAtTime(CLICK_LEVEL, now + 0.01)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(oscGain)
    oscGain.connect(this.sfxDuck)
    osc.start(now)
    osc.stop(now + duration + 0.02)

    // Dark bandpass grain for body.
    const src = ctx.createBufferSource()
    src.buffer = this.pinkBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 220
    bp.Q.value = 1.6
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.0001, now)
    noiseGain.gain.linearRampToValueAtTime(CLICK_LEVEL * 0.28, now + 0.008)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)

    src.connect(bp)
    bp.connect(noiseGain)
    noiseGain.connect(this.sfxDuck)
    src.start(now)
    src.stop(now + 0.05)

    const teardown = () => {
      try {
        osc.disconnect()
        oscGain.disconnect()
        src.disconnect()
        bp.disconnect()
        noiseGain.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    osc.onended = teardown
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
    filter.Q.value = 0.85
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
