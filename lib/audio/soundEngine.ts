/**
 * The Cineheight soundscape — entirely procedural Web Audio.
 *
 * Nothing here is downloaded. Every texture is synthesised from a noise buffer
 * and two oscillators, which keeps the payload at zero bytes, sidesteps
 * licensing entirely, and means the ambience has no loop seam to hear. (There
 * is no approved ambient asset in `public/`; if one is ever supplied, it can be
 * routed into `ambientDuck` in place of the noise bed without touching any
 * caller — the ducking and gesture rules below already apply to it.)
 *
 * Design rules the graph enforces:
 *
 *  - **Nothing sounds until a visitor asks for it.** The AudioContext is not
 *    even constructed until {@link SoundEngine.start} is called from inside a
 *    real user gesture. Browsers would block audible autoplay anyway; more to
 *    the point, surprise sound is hostile.
 *  - **The bed is felt, not heard.** Level sits low enough that most people
 *    only notice it when it stops. Low-passed pink noise reads as room air, not
 *    hiss — there is no beat, no melody and nothing above ~320Hz to fatigue.
 *  - **Video always wins.** When any video on the page is unmuted the bed ducks
 *    out of its way, because two audio experiences competing is worse than
 *    either alone.
 *  - **The pointer is silent.** Moving the mouse makes no sound at all. The
 *    brush voice and chalk grains that used to track pointer velocity were
 *    removed along with their nodes, their token bucket and their listener.
 */

/** Peak level of the ambient bed. Deliberately very low. */
const AMBIENT_LEVEL = 0.03
const SUB_LEVEL = 0.012
/** Multiplier applied to the bed while a video is audible. */
const DUCK_AMBIENT = 0.14
const DUCK_SFX = 0.08

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

    // Fade up rather than punching in — a longer ramp than before, so the bed
    // arrives without a perceptible "on".
    const now = this.ctx.currentTime
    this.master?.gain.cancelScheduledValues(now)
    this.master?.gain.setValueAtTime(this.master.gain.value, now)
    this.master?.gain.linearRampToValueAtTime(1, now + 1.4)
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

    // ---- noise source --------------------------------------------------
    const pink = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 8), ctx.sampleRate)
    fillPinkNoise(pink)
    this.pinkBuffer = pink

    // ---- ambient bed ---------------------------------------------------
    // Pink noise through a low-pass reads as air rather than hiss. Looping an
    // 8 s buffer of noise has no audible seam because noise has no phase to
    // mismatch.
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = pink
    noiseSource.loop = true

    // 320Hz with a soft Q: everything that could read as hiss or sibilance is
    // simply not there. Two poles rather than one so the roll-off is gentle
    // instead of a resonant edge.
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 320
    lowpass.Q.value = 0.5

    const lowpass2 = ctx.createBiquadFilter()
    lowpass2.type = 'lowpass'
    lowpass2.frequency.value = 620
    lowpass2.Q.value = 0.4

    // Roll off the very bottom: bass-heavy rumble is fatiguing and inaudible
    // on the laptop speakers most visitors will use.
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 70

    this.ambientGain = ctx.createGain()
    this.ambientGain.gain.value = AMBIENT_LEVEL

    noiseSource.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(lowpass2)
    lowpass2.connect(this.ambientGain)
    this.ambientGain.connect(this.ambientDuck)
    noiseSource.start()
    this.cleanups.push(() => noiseSource.stop())

    // A soft low sine underneath gives the bed a floor without becoming a note.
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 52
    const subGain = ctx.createGain()
    subGain.gain.value = SUB_LEVEL
    sub.connect(subGain)
    subGain.connect(this.ambientDuck)
    sub.start()
    this.cleanups.push(() => sub.stop())

    // Two very slow amplitude drifts at deliberately incommensurate rates
    // (~23s and ~59s). Their sum never repeats within a visit, so the bed
    // breathes without ever settling into an audible cycle.
    for (const [rate, depth] of [
      [0.043, AMBIENT_LEVEL * 0.26],
      [0.017, AMBIENT_LEVEL * 0.14],
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

  /** Soft rising sweep as the route mask closes. */
  routeOut() {
    this.sweep(320, 1900, 0.36, 0.022)
  }

  /** Softer falling resolve as the destination reveals. */
  routeIn() {
    this.sweep(1600, 520, 0.44, 0.016)
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
