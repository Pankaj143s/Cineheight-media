'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from '@/lib/gsap'
import { GSAP_EASE } from '@/lib/motionTokens'
import { useReducedMotion } from '@/lib/useMediaPreferences'
import { useReportVideoAudible } from '@/lib/audio/useReportVideoAudible'

export interface LightboxItem {
  kind: 'image' | 'video'
  src: string
  poster?: string
  alt: string
  title: string
  client: string
}

type MorphOrigin = {
  x: number
  y: number
  scaleX: number
  scaleY: number
  borderRadius: number
}

const CARD_RADIUS = 18
const SHADOW_CARD = '0 22px 48px -12px rgba(0,0,0,0.55)'
const SHADOW_STUDIO = '0 40px 90px -20px rgba(0,0,0,0.78), 0 0 80px -30px rgba(0,137,255,0.18)'

/** FLIP origin from the clicked card to the expected full-size media box. */
function originFromRect(rect: DOMRect): MorphOrigin {
  const maxH = Math.min(window.innerHeight * 0.78, window.innerHeight * 0.92 - 128)
  const maxW = window.innerWidth * 0.96
  const aspect = rect.width / Math.max(1, rect.height)
  let finalH = maxH
  let finalW = finalH * aspect
  if (finalW > maxW) {
    finalW = maxW
    finalH = finalW / aspect
  }
  const finalCx = window.innerWidth / 2
  const finalCy = window.innerHeight / 2 + 28
  return {
    x: rect.left + rect.width / 2 - finalCx,
    y: rect.top + rect.height / 2 - finalCy,
    scaleX: Math.max(0.08, rect.width / finalW),
    scaleY: Math.max(0.08, rect.height / finalH),
    borderRadius: CARD_RADIUS,
  }
}

/**
 * The one accessible lightbox, for both images and video.
 *
 * When `sourceRect` is supplied the media blooms out of that rectangle —
 * shared-element FLIP plus a focus-pull blur, shadow lift, overshoot settle,
 * and staged chrome. Close reverses the bloom back into the card.
 */
export default function MediaLightbox({
  items,
  index,
  accent = 'var(--blue-500)',
  onClose,
  onIndex,
  sourceRect,
}: {
  items: LightboxItem[]
  index: number | null
  accent?: string
  onClose: () => void
  onIndex: (i: number) => void
  sourceRect?: DOMRect | null
}) {
  const reduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const mediaShellRef = useRef<HTMLDivElement>(null)
  const chromeHeaderRef = useRef<HTMLDivElement>(null)
  const chromeControlsRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const touchX = useRef<number | null>(null)
  const morphOriginRef = useRef<MorphOrigin | null>(null)
  const bloomTlRef = useRef<gsap.core.Timeline | null>(null)
  /** Prevents re-blooming when the user flips to the next slide. */
  const bloomedOpenRef = useRef(false)
  /** True while the exit morph is playing — keeps the dialog mounted. */
  const [exiting, setExiting] = useState(false)

  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  useReportVideoAudible(!muted, 'lightbox')

  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)

  const open = index !== null || exiting
  const lastItemRef = useRef<LightboxItem | null>(null)
  if (index !== null && items[index]) lastItemRef.current = items[index]
  const displayItem = index !== null ? items[index] : lastItemRef.current

  if (index !== null && sourceRect && !reduced && !exiting) {
    morphOriginRef.current = originFromRect(sourceRect)
  }

  useEffect(() => {
    setPortalHost(document.body)
  }, [])

  // Hand the pointer back to the native cursor while the dialog covers the
  // signal-cursor layer (see `data-modal-surface` in globals.css).
  useEffect(() => {
    if (!open) return
    document.documentElement.dataset.modalSurface = 'true'
    return () => {
      delete document.documentElement.dataset.modalSurface
    }
  }, [open])

  // Cinematic bloom open: lift → focus pull → overshoot settle → chrome.
  // Runs once per open; slide changes keep the settled shell.
  useLayoutEffect(() => {
    if (index === null) {
      bloomedOpenRef.current = false
      return
    }
    if (exiting || bloomedOpenRef.current) return

    let cancelled = false
    bloomedOpenRef.current = true

    const run = () => {
      if (cancelled) return
      const shell = mediaShellRef.current
      const backdrop = backdropRef.current
      const header = chromeHeaderRef.current
      const controls = chromeControlsRef.current
      if (!shell || !backdrop) {
        requestAnimationFrame(run)
        return
      }

      bloomTlRef.current?.kill()

      if (reduced || !morphOriginRef.current) {
        gsap.set(shell, { clearProps: 'transform,borderRadius,filter,boxShadow', opacity: 1 })
        gsap.set(backdrop, { opacity: 1 })
        if (header) gsap.set(header, { opacity: 1, y: 0 })
        if (controls) gsap.set(controls, { opacity: 1, y: 0 })
        return
      }

      const from = morphOriginRef.current
      const tl = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          gsap.set(shell, { clearProps: 'filter' })
        },
      })
      bloomTlRef.current = tl

      gsap.set(shell, {
        x: from.x,
        y: from.y,
        scaleX: from.scaleX,
        scaleY: from.scaleY,
        borderRadius: from.borderRadius,
        opacity: 1,
        filter: 'blur(14px)',
        boxShadow: SHADOW_CARD,
        transformOrigin: '50% 50%',
      })
      gsap.set(backdrop, { opacity: 0 })
      if (header) gsap.set(header, { opacity: 0, y: -10 })
      if (controls) gsap.set(controls, { opacity: 0, y: 12 })

      // Card leads — morph with slight overshoot.
      tl.to(
        shell,
        {
          x: 0,
          y: 0,
          scaleX: 1.035,
          scaleY: 1.035,
          borderRadius: 4,
          duration: 0.72,
          ease: GSAP_EASE.signal,
        },
        0
      )
      // Focus pull.
      tl.to(shell, { filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' }, 0)
      // Shadow blooms into a studio pool.
      tl.to(shell, { boxShadow: SHADOW_STUDIO, duration: 0.55, ease: 'power2.out' }, 0.04)
      // Backdrop follows slightly behind the card.
      tl.to(backdrop, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.06)
      // Settle the overshoot.
      tl.to(shell, { scaleX: 1, scaleY: 1, duration: 0.28, ease: 'power2.out' }, 0.62)
      // Chrome arrives late.
      if (header) tl.to(header, { opacity: 1, y: 0, duration: 0.36, ease: GSAP_EASE.signal }, 0.45)
      if (controls) tl.to(controls, { opacity: 1, y: 0, duration: 0.36, ease: GSAP_EASE.signal }, 0.5)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [index, reduced, exiting, sourceRect])

  useEffect(() => {
    return () => {
      bloomTlRef.current?.kill()
    }
  }, [])

  const requestClose = useCallback(() => {
    const shell = mediaShellRef.current
    const backdrop = backdropRef.current
    const header = chromeHeaderRef.current
    const controls = chromeControlsRef.current
    const from = morphOriginRef.current

    if (reduced || !shell || !from || !backdrop) {
      bloomTlRef.current?.kill()
      morphOriginRef.current = null
      setExiting(false)
      onClose()
      return
    }

    setExiting(true)
    bloomTlRef.current?.kill()

    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => {
        morphOriginRef.current = null
        setExiting(false)
        onClose()
      },
    })
    bloomTlRef.current = tl

    if (header) tl.to(header, { opacity: 0, y: -6, duration: 0.16, ease: 'power2.in' }, 0)
    if (controls) tl.to(controls, { opacity: 0, y: 8, duration: 0.16, ease: 'power2.in' }, 0)
    tl.to(shell, { filter: 'blur(8px)', duration: 0.32, ease: 'power2.in' }, 0.04)
    tl.to(
      shell,
      {
        x: from.x,
        y: from.y,
        scaleX: from.scaleX,
        scaleY: from.scaleY,
        borderRadius: from.borderRadius,
        boxShadow: SHADOW_CARD,
        duration: 0.52,
        ease: GSAP_EASE.travel,
      },
      0.08
    )
    tl.to(backdrop, { opacity: 0, duration: 0.38, ease: 'power2.in' }, 0.22)
  }, [onClose, reduced])

  const move = useCallback(
    (dir: 1 | -1) => {
      if (index === null || items.length < 2 || exiting) return
      onIndex((index + dir + items.length) % items.length)
    },
    [index, items.length, onIndex, exiting]
  )

  useEffect(() => {
    if (index !== null) restoreRef.current = document.activeElement as HTMLElement
    else if (!exiting) restoreRef.current?.focus?.()
  }, [index, exiting])

  useEffect(() => {
    if (index === null && !exiting) return
    const y = window.scrollY
    const body = document.body
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, y)
    }
  }, [index, exiting])

  useEffect(() => {
    if (index === null && !exiting) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        move(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        move(-1)
      } else if (e.key === 'Tab') {
        const f = panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!f || f.length === 0) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, exiting, requestClose, move])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !displayItem || displayItem.kind !== 'video') return
    v.muted = muted
    if (playing) v.play().catch(() => {})
    else v.pause()
  }, [displayItem, playing, muted])

  useEffect(() => {
    if (index === null && !exiting) {
      setPlaying(true)
      setMuted(true)
    }
  }, [index, exiting])

  if (!portalHost) return null

  const show = Boolean(displayItem) && open

  return createPortal(
    show && displayItem ? (
      <div
        ref={backdropRef}
        className="fixed inset-0 flex flex-col items-center justify-center p-4 sm:p-6"
        style={{
          background: 'rgba(1,2,4,0.97)',
          zIndex: 'var(--z-modal)',
          cursor: 'auto',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${displayItem.title} — ${displayItem.client}`}
        onClick={(e) => {
          if (e.target === e.currentTarget && !exiting) requestClose()
        }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null || exiting) return
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 60) move(dx < 0 ? 1 : -1)
        }}
      >
        <div ref={panelRef} className="relative flex w-full max-w-[96vw] flex-col items-center">
          <div
            ref={chromeHeaderRef}
            className="mb-3 flex w-full items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p
                className="font-display text-[11px] font-medium uppercase"
                style={{ letterSpacing: '0.26em', color: accent }}
              >
                {displayItem.client}
              </p>
              <p className="font-body mt-1 truncate text-sm text-text-200">{displayItem.title}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => !exiting && requestClose()}
              aria-label="Close"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div
            className="relative flex w-full items-center justify-center"
            style={{ height: 'min(92svh - 8rem, 78vh)' }}
          >
            <div
              ref={mediaShellRef}
              className="relative inline-flex max-h-full max-w-full origin-center overflow-hidden will-change-transform"
              style={{ borderRadius: 4 }}
            >
              {displayItem.kind === 'video' ? (
                <video
                  ref={videoRef}
                  key={displayItem.src}
                  src={displayItem.src}
                  poster={displayItem.poster}
                  className="max-h-[min(92svh-8rem,78vh)] max-w-[96vw] object-contain"
                  loop
                  playsInline
                  muted={muted}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayItem.src}
                  alt={displayItem.alt}
                  className="max-h-[min(92svh-8rem,78vh)] max-w-[96vw] object-contain"
                  style={{ imageRendering: 'auto' }}
                />
              )}
            </div>
          </div>

          <div
            ref={chromeControlsRef}
            className="mt-4 flex w-full flex-wrap items-center justify-center gap-3"
          >
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Previous"
                className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                style={{ borderColor: 'var(--border-strong)' }}
              >
                <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true">
                  <path d="M26 5H2M6 1 2 5l4 4" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>
            )}

            {displayItem.kind === 'video' && (
              <>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  {playing ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  aria-pressed={!muted}
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                  style={{ borderColor: muted ? 'var(--border-strong)' : 'var(--blue-500)' }}
                >
                  {muted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path
                        d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"
                        opacity="0.4"
                      />
                      <path d="m3 3 18 18-1.4 1.4L2 4.4z" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
                    </svg>
                  )}
                </button>
              </>
            )}

            {items.length > 1 && (
              <>
                <span className="font-body px-1 text-xs tabular-nums text-text-500">
                  {(index ?? 0) + 1} / {items.length}
                </span>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="Next"
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true">
                    <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    ) : null,
    portalHost
  )
}
