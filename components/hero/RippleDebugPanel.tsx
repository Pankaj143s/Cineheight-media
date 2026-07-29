'use client'

import { useEffect, useState } from 'react'
import {
  debugRippleRequested,
  getTune,
  setTuneValue,
  subscribeTune,
  type RippleTune,
} from '@/lib/ripple/tune'

/**
 * Development-only tuning panel for the hero water surface.
 *
 * Never rendered in a production build: the whole component early-returns on
 * `process.env.NODE_ENV`, so the bundler drops it, and it additionally requires
 * `?debugRipple=1`. The flag is read from `location.search` rather than
 * `useSearchParams()` on purpose — the latter would opt the hero route into
 * dynamic rendering, which is a real production cost for a dev affordance.
 *
 * Values are written straight into the live tune object the render loop reads
 * each frame, so the surface retunes without rebuilding the GL context (which
 * would discard the simulation state and make comparison meaningless).
 */

interface Slider {
  key: keyof RippleTune
  label: string
  min: number
  max: number
  step: number
}

const SLIDERS: Slider[] = [
  { key: 'perturbance', label: 'Perturbance', min: 0, max: 0.06, step: 0.001 },
  { key: 'dropStrength', label: 'Drop strength', min: 0, max: 0.2, step: 0.005 },
  { key: 'dropRadius', label: 'Radius (texels)', min: 8, max: 48, step: 1 },
  { key: 'damping', label: 'Damping', min: 0.95, max: 0.9995, step: 0.0005 },
  { key: 'detail', label: 'Refraction texture', min: 0, max: 3, step: 0.05 },
  { key: 'shade', label: 'Slope shading', min: 0, max: 1.2, step: 0.01 },
  { key: 'caustic', label: 'Caustic bands', min: 0, max: 90, step: 1 },
  { key: 'specular', label: 'Specular', min: 0, max: 0.25, step: 0.005 },
  { key: 'rim', label: 'Blue rim', min: 0, max: 0.15, step: 0.002 },
  { key: 'slope', label: 'Normal slope', min: 0, max: 40, step: 0.5 },
]

export default function RippleDebugPanel() {
  const [, force] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(debugRippleRequested())
  }, [])

  useEffect(() => subscribeTune(() => force((n) => n + 1)), [])

  // "R" toggles the whole canvas for an instant A/B against the plain hero.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'r' && event.key !== 'R') return
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const tune = getTune()
      if (!tune) return
      setTuneValue('enabled', !tune.enabled)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (process.env.NODE_ENV === 'production') return null
  if (!visible) return null

  const tune = getTune()
  if (!tune) return null

  return (
    <div
      className="fixed left-4 top-20 w-[248px] rounded-md p-3 font-mono text-[10px] leading-tight text-white"
      style={{
        zIndex: 'var(--z-modal)',
        background: 'rgba(4,6,10,0.92)',
        border: '1px solid rgba(255,255,255,0.16)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <strong className="text-[11px] tracking-wide">RIPPLE</strong>
        <span style={{ color: tune.enabled ? '#5ad07a' : '#d0705a' }}>
          {tune.enabled ? 'ON' : 'OFF'} · R
        </span>
      </div>

      {SLIDERS.map((s) => (
        <label key={s.key} className="mb-1.5 block">
          <span className="flex justify-between opacity-70">
            {s.label}
            <span>{(tune[s.key] as number).toFixed(s.step < 0.01 ? 4 : 2)}</span>
          </span>
          <input
            type="range"
            className="w-full"
            min={s.min}
            max={s.max}
            step={s.step}
            value={tune[s.key] as number}
            onChange={(e) => setTuneValue(s.key, Number(e.target.value) as never)}
          />
        </label>
      ))}

      <div className="mt-2 flex flex-wrap gap-3 border-t border-white/15 pt-2">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={tune.autoRipples}
            onChange={(e) => setTuneValue('autoRipples', e.target.checked)}
          />
          auto
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={tune.debugView === 1}
            onChange={(e) => setTuneValue('debugView', e.target.checked ? 1 : 0)}
          />
          |grad|
        </label>
      </div>
    </div>
  )
}
