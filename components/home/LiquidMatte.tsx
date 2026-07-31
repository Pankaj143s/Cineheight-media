'use client'

import { useEffect, useId, useRef } from 'react'
import { useMotionCapabilityProfile } from '@/lib/useMediaPreferences'
import { LIQUID_MEDIA_PROTO } from '@/lib/liquidMedia/config'

export type MatteForm = 'film-gate' | 'diagonal-bar' | 'open'

type Props = {
  /** 0–1 overall wipe progress for the active transition. */
  progress: number
  /** Which keyed matte form is driving the transition. */
  form: MatteForm
  /** Soft optical edge — only rendered when flag + high capability allow. */
  enhancedEdge?: boolean
  className?: string
}

/**
 * Broadcast-style liquid matte. Base path is SVG clip; enhanced edge is an
 * optional soft gradient rim for high-tier desktops (feature-flagged).
 */
export default function LiquidMatte({ progress, form, enhancedEdge = false, className }: Props) {
  const uid = useId().replace(/:/g, '')
  const profile = useMotionCapabilityProfile()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const p = Math.max(0, Math.min(1, progress))
  const useEnhanced =
    enhancedEdge &&
    LIQUID_MEDIA_PROTO.enhancedMatteEdge &&
    profile.level === 'high'

  // Film gate: horizontal letterbox opens to full-bleed.
  const gateInset = form === 'film-gate' ? (1 - p) * 42 : 0
  // Diagonal bar: angled wipe from TL → BR (restrained, not a swipe template).
  const diag = form === 'diagonal-bar' ? p : form === 'open' ? 1 : 0

  const clipPath =
    form === 'open'
      ? 'inset(0% 0% 0% 0%)'
      : form === 'film-gate'
        ? `inset(${gateInset}% 0% ${gateInset}% 0%)`
        : undefined

  useEffect(() => {
    if (!useEnhanced || form !== 'diagonal-bar') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const { width: w, height: h } = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Soft luminous rim along the diagonal front — optical, not warp.
      const x = -0.2 * w + diag * 1.4 * w
      const grad = ctx.createLinearGradient(x - 40, 0, x + 40, h)
      grad.addColorStop(0, 'rgba(0,137,255,0)')
      grad.addColorStop(0.45, 'rgba(0,137,255,0.14)')
      grad.addColorStop(0.5, 'rgba(255,255,255,0.18)')
      grad.addColorStop(0.55, 'rgba(0,137,255,0.12)')
      grad.addColorStop(1, 'rgba(0,137,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }

    draw()
  }, [useEnhanced, form, diag])

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 15,
      }}
    >
      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id={`liquid-matte-${uid}`} clipPathUnits="objectBoundingBox">
            {form === 'diagonal-bar' ? (
              <polygon
                points={
                  // Expanding revealed region behind a diagonal front
                  diag >= 1
                    ? '0,0 1,0 1,1 0,1'
                    : `0,0 ${Math.min(1, diag * 1.15)},0 ${Math.min(1, diag * 1.15 - 0.12)},1 0,1`
                }
              />
            ) : (
              <rect x="0" y="0" width="1" height="1" />
            )}
          </clipPath>
        </defs>
      </svg>
      {/* Base matte indicator (for film-gate the stage uses CSS clip on frames) */}
      <div
        data-matte-base
        className="absolute inset-0"
        style={{
          clipPath: form === 'film-gate' ? clipPath : form === 'diagonal-bar' ? `url(#liquid-matte-${uid})` : undefined,
          boxShadow: form === 'film-gate' && p < 0.98 ? 'inset 0 0 0 1px rgba(0,137,255,0.08)' : undefined,
        }}
      />
      {useEnhanced && form === 'diagonal-bar' && p > 0.02 && p < 0.98 && (
        <canvas ref={canvasRef} className="absolute inset-0" style={{ mixBlendMode: 'screen', opacity: 0.85 }} />
      )}
    </div>
  )
}

/** Apply film-gate inset to a media frame during hold / open. */
export function filmGateClip(progress: number): string {
  const inset = (1 - Math.max(0, Math.min(1, progress))) * 42
  return `inset(${inset}% 0% ${inset}% 0%)`
}
