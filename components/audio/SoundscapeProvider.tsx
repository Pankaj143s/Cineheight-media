'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { getSoundEngine } from '@/lib/audio/soundEngine'
import { subscribeAudioBus } from '@/lib/audio/audioBus'

/**
 * Owns whether the site is making sound, and wires the pointer to the engine.
 *
 * Consent model, in order of stubbornness:
 *
 *  1. Sound is **off** on first visit. Always.
 *  2. The choice is remembered in localStorage.
 *  3. Returning with sound previously on does NOT start audio on load. The
 *     preference is restored, but the AudioContext is only created on the
 *     visitor's next genuine interaction — a real pointerdown, keydown or
 *     touch. Browsers block audible autoplay anyway, and an AudioContext
 *     created outside a gesture lands in `suspended` and silently stays there,
 *     which is worse than not trying.
 *
 * Initial React state is `false` on both server and client, so there is no
 * hydration mismatch; the stored preference is applied in an effect.
 */

const STORAGE_KEY = 'cineheight-sound-enabled'

interface SoundscapeValue {
  /** The visitor's preference. */
  enabled: boolean
  /** True once audio is genuinely running (preference on AND gesture given). */
  active: boolean
  toggle: () => void
  /**
   * False only when the browser has no Web Audio, or the visitor has asked to
   * save data. Note this is deliberately NOT tied to reduced motion: that
   * preference is about movement, and someone who suppresses animation may
   * still want the ambience.
   */
  available: boolean
}

const SoundscapeContext = createContext<SoundscapeValue>({
  enabled: false,
  active: false,
  toggle: () => {},
  available: false,
})

export function useSoundscape() {
  return useContext(SoundscapeContext)
}

export default function SoundscapeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [active, setActive] = useState(false)
  // Assumed present so the control is in the server HTML and does not pop in
  // after hydration; withdrawn in an effect on the rare browser that lacks Web
  // Audio or where the visitor has asked to save data.
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    const hasWebAudio = !!(
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext
    )
    const saveData =
      (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true
    if (!hasWebAudio || saveData) setAvailable(false)
  }, [])

  /** Restore the stored preference — but never start audio from it directly. */
  useEffect(() => {
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      /* private mode or blocked storage — treat as no preference */
    }
    if (stored !== 'on') return
    setEnabled(true)

    // Arm a one-shot listener for the next real interaction.
    const engine = getSoundEngine()
    if (!engine) return
    const resume = () => {
      void engine.start().then(() => setActive(engine.isRunning()))
      detach()
    }
    const detach = () => {
      window.removeEventListener('pointerdown', resume, true)
      window.removeEventListener('keydown', resume, true)
      window.removeEventListener('touchstart', resume, true)
    }
    window.addEventListener('pointerdown', resume, true)
    window.addEventListener('keydown', resume, true)
    window.addEventListener('touchstart', resume, true)
    return detach
  }, [])

  const toggle = useCallback(() => {
    const engine = getSoundEngine()
    if (!engine) return
    setEnabled((previous) => {
      const next = !previous
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
      } catch {
        /* preference simply will not persist */
      }
      if (next) {
        // The click IS the gesture, so this is the legitimate moment to start.
        // Soft confirm tick after the graph is up (bus not subscribed until active).
        void engine.start().then(() => {
          setActive(engine.isRunning())
          if (engine.isRunning()) engine.playUiClick()
        })
      } else {
        void engine.stop()
        setActive(false)
      }
      return next
    })
  }, [])

  /** Ducking and route cues. */
  useEffect(() => {
    if (!active) return
    const engine = getSoundEngine()
    if (!engine) return
    return subscribeAudioBus((event) => {
      switch (event.type) {
        case 'audible-videos':
          engine.setDucked(event.count > 0)
          break
        case 'route-out':
          engine.routeOut()
          break
        case 'route-in':
          engine.routeIn()
          break
        case 'ui-click':
          engine.playUiClick()
          break
      }
    })
  }, [active])

  /*
   * There is deliberately no pointer-move listener here.
   *
   * A brush voice and chalk grains used to track pointer velocity across the
   * page. Moving the mouse makes no sound at all. The only sounds the site
   * makes are the ambient bed, route cues, and soft UI clicks on primary
   * controls (published via the audio bus).
   */

  /** Never leave an audio graph running behind a hidden tab. */
  useEffect(() => {
    const engine = getSoundEngine()
    if (!engine) return
    const onVisibility = () => engine.setSuspended(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => () => getSoundEngine()?.destroy(), [])

  return (
    <SoundscapeContext.Provider
      value={{ enabled, active, toggle, available }}
    >
      {children}
    </SoundscapeContext.Provider>
  )
}
