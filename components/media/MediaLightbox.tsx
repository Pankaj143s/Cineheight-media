'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/useMediaPreferences'
import { useReportVideoAudible } from '@/lib/audio/useReportVideoAudible'

const EASE = [0.22, 1, 0.36, 1] as const

export interface LightboxItem {
  kind: 'image' | 'video'
  src: string
  poster?: string
  alt: string
  title: string
  client: string
}

/**
 * The one accessible lightbox, for both images and video.
 *
 * Everything a modal has to get right lives here once — focus trap, Escape,
 * focus restoration, body-scroll lock, arrow keys, swipe, backdrop click — so
 * the post orbit and the phone reels cannot drift apart in behaviour.
 *
 * Media is always `object-contain` inside ~96vw × 92svh: the whole reel and the
 * whole creative stay visible, and an image is never scaled beyond its own
 * resolution.
 *
 * Body-scroll lock is done by fixing <body> at its current offset rather than
 * with `overflow: hidden`, because iOS Safari ignores the latter and scrolls
 * the page behind the modal anyway.
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
  /** null closes the lightbox. */
  index: number | null
  accent?: string
  onClose: () => void
  onIndex: (i: number) => void
  /**
   * Viewport rect of the element that was clicked to open this.
   *
   * When supplied the panel grows out of that rectangle instead of fading in
   * from nowhere, so a phone or a creative card visibly becomes the full-size
   * view. Omit it (or under reduced motion) and the plain fade is used.
   */
  sourceRect?: DOMRect | null
}) {
  const reduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const touchX = useRef<number | null>(null)

  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  // Duck the ambient soundscape whenever this video is audible.
  useReportVideoAudible(!muted, 'lightbox')

  const open = index !== null

  /**
   * The dialog is portalled to <body>.
   *
   * Route content sits in `.layer-content`, which sets `isolation: isolate` so
   * the decorative flow thread can never surface through a section. That same
   * isolation would trap this dialog's z-index inside the content layer and let
   * the navbar paint over it, so the modal has to live outside the wrapper.
   */
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPortalHost(document.body)
  }, [])

  /**
   * A FLIP-style approximation of "this card became the dialog".
   *
   * The panel's final size is not known until it has laid out, so rather than
   * measuring twice we derive the opening transform from the source rect
   * against the viewport: where its centre was relative to the screen centre,
   * and roughly how much smaller it was. It reads as the card travelling and
   * growing, without a second layout pass or a flash at the wrong size.
   */
  const fromSource = useMemo(() => {
    if (!sourceRect || typeof window === 'undefined') {
      return {
        initial: { opacity: 0, scale: 0.94, x: 0, y: 18 },
        exit: { opacity: 0, scale: 0.95, x: 0, y: 12 },
      }
    }
    const x = sourceRect.left + sourceRect.width / 2 - window.innerWidth / 2
    const y = sourceRect.top + sourceRect.height / 2 - window.innerHeight / 2
    const scale = Math.max(0.2, Math.min(0.9, sourceRect.height / (window.innerHeight * 0.86)))
    return {
      initial: { opacity: 0, scale, x, y },
      // Closing reverses toward the same place, so the work goes back where the
      // visitor took it from.
      exit: { opacity: 0, scale, x, y },
    }
  }, [sourceRect])
  const item = index === null ? null : items[index]

  const move = useCallback(
    (dir: 1 | -1) => {
      if (index === null || items.length < 2) return
      onIndex((index + dir + items.length) % items.length)
    },
    [index, items.length, onIndex]
  )

  // Remember what had focus, and give it back on close.
  useEffect(() => {
    if (open) restoreRef.current = document.activeElement as HTMLElement
    else restoreRef.current?.focus?.()
  }, [open])

  // Body-scroll lock that also works on iOS Safari.
  useEffect(() => {
    if (!open) return
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
  }, [open])

  // Keyboard: Escape, arrows, and a Tab loop confined to the dialog.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
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
  }, [open, onClose, move])

  // Playback: starts muted, always. Audio is strictly opt-in.
  useEffect(() => {
    const v = videoRef.current
    if (!v || !item || item.kind !== 'video') return
    v.muted = muted
    if (playing) v.play().catch(() => {})
    else v.pause()
  }, [item, playing, muted])

  useEffect(() => {
    if (!open) {
      setPlaying(true)
      setMuted(true)
    }
  }, [open])

  if (!portalHost) return null

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(1,2,4,0.97)', zIndex: 'var(--z-modal)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${item.title} — ${item.client}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
          onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current
            touchX.current = null
            if (Math.abs(dx) > 60) move(dx < 0 ? 1 : -1)
          }}
        >
          <motion.div
            ref={panelRef}
            className="relative flex w-full max-w-[96vw] flex-col items-center"
            initial={reduced ? { opacity: 0 } : fromSource.initial}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={reduced ? { opacity: 0 } : fromSource.exit}
            transition={{ duration: reduced ? 0.15 : sourceRect ? 0.44 : 0.36, ease: EASE }}
          >
            {/* header */}
            <div className="mb-3 flex w-full items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.26em', color: accent }}>
                  {item.client}
                </p>
                <p className="font-body mt-1 truncate text-sm text-text-200">{item.title}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                style={{ borderColor: 'var(--border-strong)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* the media — always complete, never cropped, never upscaled past
                its own resolution */}
            <div
              className="relative flex w-full items-center justify-center"
              style={{ height: 'min(92svh - 8rem, 78vh)' }}
            >
              {item.kind === 'video' ? (
                <video
                  ref={videoRef}
                  key={item.src}
                  src={item.src}
                  poster={item.poster}
                  className="max-h-full max-w-full object-contain"
                  loop
                  playsInline
                  muted={muted}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.src}
                  alt={item.alt}
                  className="max-h-full max-w-full object-contain"
                  style={{ imageRendering: 'auto' }}
                />
              )}
            </div>

            {/* controls */}
            <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-3">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="Previous"
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true"><path d="M26 5H2M6 1 2 5l4 4" stroke="currentColor" strokeWidth="1.3" /></svg>
                </button>
              )}

              {item.kind === 'video' && (
                <>
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? 'Pause' : 'Play'}
                    className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                    style={{ borderColor: 'var(--border-strong)' }}
                  >
                    {playing ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" opacity="0.4" /><path d="m3 3 18 18-1.4 1.4L2 4.4z" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
                    )}
                  </button>
                </>
              )}

              {items.length > 1 && (
                <>
                  <span className="font-body px-1 text-xs tabular-nums text-text-500">
                    {index! + 1} / {items.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => move(1)}
                    aria-label="Next"
                    className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                    style={{ borderColor: 'var(--border-strong)' }}
                  >
                    <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true"><path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" /></svg>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalHost,
  )
}
