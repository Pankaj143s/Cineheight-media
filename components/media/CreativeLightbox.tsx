'use client'

import { useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/useMediaPreferences'

const EASE = [0.22, 1, 0.36, 1] as const

export interface LightboxItem {
  src: string
  alt: string
  title: string
  client: string
}

/**
 * Full-viewport expanded view for a creative pulled out of the orbit. Keeps the
 * old project's card-flip entry, plus a proper focus trap, Escape, restored
 * focus and arrow navigation.
 */
export default function CreativeLightbox({
  items,
  index,
  accent,
  onClose,
  onIndex,
}: {
  items: LightboxItem[]
  /** null closes the lightbox. */
  index: number | null
  accent: string
  onClose: () => void
  onIndex: (i: number) => void
}) {
  const reduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const open = index !== null

  // Remember what had focus before opening, restore it on close.
  useEffect(() => {
    if (open) restoreRef.current = document.activeElement as HTMLElement
    else restoreRef.current?.focus?.()
  }, [open])

  const move = useCallback(
    (dir: 1 | -1) => {
      if (index === null) return
      onIndex((index + dir + items.length) % items.length)
    },
    [index, items.length, onIndex]
  )

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        move(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        move(-1)
      } else if (e.key === 'Tab') {
        // Focus trap — the dialog owns Tab while it is open.
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
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
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose, move])

  const item = index === null ? null : items[index]

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
          style={{ background: 'rgba(2,3,6,0.95)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${item.title} — ${item.client}, expanded view`}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            ref={panelRef}
            className="relative flex max-h-full w-full flex-col items-center"
            style={{ maxWidth: 560, transformPerspective: 1200 }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotateY: -72 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotateY: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.64, rotateY: 58 }}
            transition={{ duration: reduced ? 0.15 : 0.46, ease: EASE }}
          >
            <div className="mb-4 flex w-full items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.26em', color: accent }}>
                  {item.client}
                </p>
                <p className="font-body mt-1 truncate text-sm text-text-300">{item.title}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close expanded view"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                style={{ borderColor: 'var(--border-strong)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: '3 / 4', maxHeight: '74vh', boxShadow: `0 40px 90px rgba(0,0,0,0.75), 0 0 0 1px ${accent}33` }}
            >
              <Image src={item.src} alt={item.alt} fill sizes="(max-width: 640px) 92vw, 560px" className="object-contain" priority />
            </div>

            {items.length > 1 && (
              <div className="mt-5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="Previous creative"
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true"><path d="M26 5H2M6 1 2 5l4 4" stroke="currentColor" strokeWidth="1.3" /></svg>
                </button>
                <span className="font-body text-xs tabular-nums text-text-500">
                  {index! + 1} / {items.length}
                </span>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="Next creative"
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true"><path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" /></svg>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
