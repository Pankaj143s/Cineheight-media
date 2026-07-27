'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PhoneReelShell, { type PhoneReelItem } from './PhoneReelShell'
import MediaLightbox, { type LightboxItem } from './MediaLightbox'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { clamp, damp } from '@/lib/utils'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The phone-reel installation — the old project's `ReelsCoverflow` concept
 * rebuilt on Flow V2's motion architecture.
 *
 * Physics live entirely in refs and one rAF loop that writes transforms
 * straight to the DOM; React state changes only when the ACTIVE INDEX changes
 * (for labels, a11y and which phone owns the <video>). Drag carries velocity
 * into a snap, side phones are clickable, arrows and the keyboard work, and
 * exactly one <video> exists at any moment.
 *
 * The heading is composited into the installation rather than sitting in a
 * header block above it — the phones physically overlap it on desktop.
 */

const EASE = 0.15 // fraction of the gap closed per 60 Hz frame

export default function PhoneReelExperience({
  reels,
  handle = 'cineheight.media',
  eyebrow,
  heading,
  headingLines,
  explanation,
  /** Anchor side for the signal thread as it passes this installation. */
  flowAnchor = 'left',
  label = 'Client reels',
}: {
  reels: PhoneReelItem[]
  handle?: string
  eyebrow?: string
  heading?: string
  headingLines?: React.ReactNode[]
  /** Short supporting line shown in the editorial column. */
  explanation?: string
  flowAnchor?: 'left' | 'right' | 'center' | 'edge-left' | 'edge-right'
  label?: string
}) {
  const mobile = useIsMobileTier()
  const reduced = useReducedMotion()

  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // Open on the middle phone so the installation arrives balanced rather than
  // with every side phone stacked off to one side — but never centre a
  // placeholder, so a client with unsupplied reels still opens on real work.
  const initial = useMemo(() => {
    const mid = Math.floor((reels.length - 1) / 2)
    if (!reels[mid]?.isPlaceholder) return mid
    for (let d = 1; d < reels.length; d++) {
      if (!reels[mid - d]?.isPlaceholder && mid - d >= 0) return mid - d
      if (!reels[mid + d]?.isPlaceholder && mid + d < reels.length) return mid + d
    }
    return mid
  }, [reels])

  const [active, setActive] = useState(initial)
  const [muted, setMuted] = useState(true)
  const [userPaused, setUserPaused] = useState(false)
  const [inView, setInView] = useState(false)
  /** Index open in the shared lightbox, or null. */
  const [expanded, setExpanded] = useState<number | null>(null)

  // ---- motion state (never React state) --------------------------------
  const float = useRef(initial)
  const target = useRef(initial)
  const activeRef = useRef(initial)
  const rafRef = useRef<number | null>(null)
  const lastTime = useRef(0)
  const spacing = useRef(220)

  const dragging = useRef(false)
  const dragged = useRef(false)
  const startX = useRef(0)
  const startTarget = useRef(0)
  const lastX = useRef(0)
  const lastT = useRef(0)
  const velocity = useRef(0)

  const max = reels.length - 1

  /**
   * Phone size, derived from the stage but hard-capped.
   *
   * The previous rule took 94% of an 84svh stage, which on a standard desktop
   * produced a 700–900px phone that owned the whole viewport and floated free
   * of its own text. The cap keeps the active phone at roughly 460–700px so it
   * reads as one element in an editorial composition, and the width constraint
   * keeps it inside its column rather than the full page width.
   */
  const measure = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const h = stage.clientHeight
    const w = stage.clientWidth

    const byHeight = mobile ? h * 0.9 : clamp(h * 0.8, 460, 700)
    // Also bounded by the column: the phone must never be widened to fill the
    // stage, and side phones need room to stay visible.
    // A slightly wider shell keeps the mobile stack from reading as squeezed.
    // The actual portrait media remains true 9:16 inside the handset.
    const shellRatio = 0.61
    const byWidth = (mobile ? w * 0.82 : w * 0.44) / shellRatio
    const phoneH = Math.max(320, Math.min(byHeight, byWidth))
    const phoneW = phoneH * shellRatio

    spacing.current = phoneW * (mobile ? 0.68 : 0.66)
    stage.style.setProperty('--phone-w', `${Math.round(phoneW)}px`)
    stage.style.setProperty('--phone-h', `${Math.round(phoneH)}px`)
  }, [mobile])

  // ---- the single animation loop ---------------------------------------
  const applyVisuals = useCallback(() => {
    const f = float.current
    const gap = spacing.current
    const maxAbs = mobile ? 1.75 : 2.75
    for (let i = 0; i < cardRefs.current.length; i++) {
      const el = cardRefs.current[i]
      if (!el) continue
      const off = i - f
      const abs = Math.abs(off)
      if (abs > maxAbs) {
        el.style.visibility = 'hidden'
        continue
      }
      el.style.visibility = 'visible'
      // ±1 lands at ~0.84, ±2 at ~0.68 — visible enough to explain the
      // interaction, never almost as tall as the centre phone.
      const scale = clamp(1 - abs * (mobile ? 0.14 : 0.16), 0.6, 1)
      // Gentler than before: heavy rotation made the side phones read as
      // separate objects rather than the same installation.
      const rotate = clamp(-off * (mobile ? 8 : 11), -26, 26)
      const z = -abs * (mobile ? 60 : 120)
      el.style.transform =
        `translate3d(calc(-50% + ${(off * gap).toFixed(1)}px), -50%, ${z.toFixed(1)}px)` +
        ` rotateY(${rotate.toFixed(2)}deg) scale(${scale.toFixed(4)})`
      el.style.opacity = String(clamp(1 - abs * 0.36, 0, 1))
      el.style.zIndex = String(40 - Math.round(abs * 6))
      el.style.filter = `brightness(${clamp(1 - abs * 0.24, 0.4, 1)})`
    }
  }, [mobile])

  useEffect(() => {
    if (reduced) return
    const stage = stageRef.current
    if (!stage) return

    let visible = false
    const loop = (now: number) => {
      const dt = Math.min(50, now - lastTime.current || 16)
      lastTime.current = now
      const t = target.current
      const f = float.current
      const next = Math.abs(t - f) < 0.0006 ? t : f + (t - f) * damp(EASE, dt)
      float.current = next
      applyVisuals()
      rafRef.current = requestAnimationFrame(loop)
    }
    const setRunning = () => {
      const should = visible && !document.hidden
      if (should && rafRef.current == null) {
        lastTime.current = performance.now()
        rafRef.current = requestAnimationFrame(loop)
      } else if (!should && rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    measure()
    applyVisuals()

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        setInView(e.intersectionRatio > 0.3)
        setRunning()
      },
      { threshold: [0, 0.05, 0.3, 0.6] }
    )
    io.observe(stage)

    const onVis = () => setRunning()
    const onResize = () => {
      measure()
      applyVisuals()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('resize', onResize)

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', onResize)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [applyVisuals, measure, reduced])

  // ---- navigation -------------------------------------------------------
  const goTo = useCallback(
    (i: number) => {
      const next = clamp(Math.round(i), 0, max)
      activeRef.current = next
      target.current = next
      setActive(next)
      setUserPaused(false)
      if (progressRef.current) progressRef.current.style.transform = 'scaleX(0)'
      if (reduced) {
        float.current = next
        applyVisuals()
      }
    },
    [max, reduced, applyVisuals]
  )
  const step = useCallback((dir: 1 | -1) => goTo(activeRef.current + dir), [goTo])

  // ---- pointer drag -----------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    if (reduced || max < 1) return
    dragging.current = true
    dragged.current = false
    startX.current = e.clientX
    startTarget.current = target.current
    lastX.current = e.clientX
    lastT.current = performance.now()
    velocity.current = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 5) dragged.current = true
    // Slight over-range so the ends feel elastic rather than walled off.
    target.current = clamp(startTarget.current - dx / spacing.current, -0.3, max + 0.3)
    const now = performance.now()
    const dt = now - lastT.current
    if (dt > 0) {
      velocity.current = (e.clientX - lastX.current) / dt
      lastX.current = e.clientX
      lastT.current = now
    }
  }
  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    // Carry the fling into the landing slot: velocity is px/ms, so ~150 ms of
    // coast converted into index units, capped at ±1.2 phones.
    const carry = clamp((velocity.current * 150) / spacing.current, -1.2, 1.2)
    goTo(target.current - carry)
  }

  /**
   * The lightbox only ever carries REAL reels, so a placeholder can never be
   * paged into. These maps translate between the installation's index space
   * (which includes placeholders) and the lightbox's.
   */
  const { lightboxItems, realIndexToLightbox, lightboxToRealIndex } = useMemo(() => {
    const out: LightboxItem[] = []
    const toLb: Record<number, number> = {}
    const toReal: Record<number, number> = {}
    reels.forEach((r, i) => {
      if (r.isPlaceholder || !r.src) return
      toLb[i] = out.length
      toReal[out.length] = i
      out.push({
        kind: 'video',
        src: r.src,
        poster: r.poster,
        alt: `${r.client} — ${r.title}`,
        title: r.title,
        client: r.client,
      })
    })
    return { lightboxItems: out, realIndexToLightbox: toLb, lightboxToRealIndex: toReal }
  }, [reels])

  /** Open the active reel in the shared lightbox (never a placeholder). */
  const openActive = useCallback(() => {
    if (reels[activeRef.current]?.isPlaceholder) return
    setExpanded(activeRef.current)
  }, [reels])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      step(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      step(-1)
    } else if (e.key === 'Enter') {
      // Enter opens the reel full-size; Space stays with the play control.
      e.preventDefault()
      openActive()
    } else if (e.key === ' ') {
      e.preventDefault()
      setUserPaused((p) => !p)
    }
  }

  // ---- playback: exactly one video, gated on view + intent --------------
  const item = reels[active]
  // The inline reel stands down while the lightbox owns playback.
  const canPlay = !!item && !item.isPlaceholder && inView && !reduced && expanded === null

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (!canPlay || userPaused || document.hidden) {
      video.pause()
      return
    }
    video.play().catch(() => {})
  }, [canPlay, userPaused, muted, active])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => {
      if (progressRef.current && video.duration > 0) {
        progressRef.current.style.transform = `scaleX(${video.currentTime / video.duration})`
      }
    }
    const onVis = () => {
      if (document.hidden) video.pause()
      else if (canPlay && !userPaused) video.play().catch(() => {})
    }
    video.addEventListener('timeupdate', onTime)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      document.removeEventListener('visibilitychange', onVis)
      video.pause()
    }
  }, [canPlay, userPaused, active])

  if (reels.length === 0) return null

  // The heading is NOT capped to a narrow `ch` measure any more: a 15ch cap at
  // display size forced words like "Short-form" to break at their hyphen and
  // the fragments were then clipped by the reveal band and covered by the
  // phones. It now gets real room and the shared display scale.
  const headingBlock = (eyebrow || heading || headingLines || explanation) && (
    <div className="max-w-[34rem]">
      {eyebrow && <KineticLabel text={eyebrow} />}
      {(headingLines || heading) && (
        <SplitLineReveal
          as="h2"
          lines={headingLines ?? [heading!]}
          srLabel={heading ?? ''}
          className="type-display-3 font-display mt-5 font-bold uppercase text-text-100"
        />
      )}
      {explanation && (
        <p className="font-body mt-5 text-sm leading-relaxed text-text-300" style={{ maxWidth: '42ch' }}>
          {explanation}
        </p>
      )}
    </div>
  )

  /* ---------------------------------------------------------- reduced motion */
  if (reduced) {
    return (
      <section aria-label={label} className="relative">
        <div className="flow-gutter">{headingBlock}</div>
        <ul className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-[clamp(1.25rem,4vw,4.5rem)] pb-6">
          {reels.map((r, i) => (
            <li
              key={r.id}
              className="w-[min(74vw,300px)] shrink-0 snap-center"
              style={{ aspectRatio: '9 / 16' }}
            >
              <PhoneReelShell item={r} seed={i + 1} handle={handle} isActive={false} mountVideo={false} />
              <p className="font-body mt-3 text-xs text-text-300">
                {r.client} — {r.title}
              </p>
            </li>
          ))}
        </ul>
      </section>
    )
  }


  /* ------------------------------------------------------------- full build */

  /**
   * Active-reel information. Kept as its own block so it can sit in the
   * editorial column on desktop and under the stage on mobile without being
   * duplicated in the DOM.
   */
  const activeInfo = (
    <div className="min-w-0">
      <p className="font-display text-[13px] font-medium uppercase text-text-100" style={{ letterSpacing: '0.2em' }}>
        {item.client}
      </p>
      <p className="font-body mt-1.5 text-sm text-text-500">
        {item.title}
        {item.isPlaceholder && ' — awaiting client file'}
        {item.provenance === 'concept-placeholder' && ' — concept placeholder'}
      </p>
    </div>
  )

  const controls = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="hidden h-px w-20 overflow-hidden bg-white/10 sm:block" aria-hidden="true">
        <div ref={progressRef} className="h-full w-full origin-left" style={{ background: 'var(--blue-500)', transform: 'scaleX(0)' }} />
      </div>
      <span className="font-body text-xs tabular-nums text-text-500">
        {String(active + 1).padStart(2, '0')} / {String(reels.length).padStart(2, '0')}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setUserPaused((p) => !p)}
          disabled={item.isPlaceholder}
          aria-label={userPaused ? 'Play reel' : 'Pause reel'}
          className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)] disabled:opacity-30"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          {userPaused ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          disabled={item.isPlaceholder}
          aria-label={muted ? 'Unmute reel' : 'Mute reel'}
          aria-pressed={!muted}
          className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)] disabled:opacity-30"
          style={{ borderColor: muted ? 'var(--border-strong)' : 'var(--blue-500)' }}
        >
          {muted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" opacity="0.4" /><path d="m3 3 18 18-1.4 1.4L2 4.4z" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={active === 0}
          aria-label="Previous reel"
          className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)] disabled:opacity-30"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true"><path d="M26 5H2M6 1 2 5l4 4" stroke="currentColor" strokeWidth="1.3" /></svg>
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={active === max}
          aria-label="Next reel"
          className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)] disabled:opacity-30"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true"><path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" /></svg>
        </button>
      </div>
    </div>
  )

  const stage = (
    <div
      ref={stageRef}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
      style={{
        height: mobile ? 'clamp(540px, 74svh, 760px)' : 'clamp(560px, 72svh, 780px)',
        perspective: mobile ? '1100px' : '1500px',
        // Nudged right so the installation sits off-centre against the
        // editorial column rather than dead-centre in its own box.
        perspectiveOrigin: mobile ? '50% 50%' : '56% 50%',
      }}
    >
      <div ref={trackRef} className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        {reels.map((r, i) => (
          <div
            key={r.id}
            ref={(el) => {
              cardRefs.current[i] = el
            }}
            data-index={i}
            role="button"
            tabIndex={-1}
            aria-label={
              i === active
                ? r.isPlaceholder
                  ? `${r.client} — ${r.title}. Awaiting the client file.`
                  : `${r.client} — ${r.title}. Press to open full size.`
                : `Show ${r.client} — ${r.title}`
            }
            onClick={() => {
              if (dragged.current) {
                dragged.current = false
                return
              }
              // A side phone comes to the centre; the centre phone opens.
              if (i === active) openActive()
              else goTo(i)
            }}
            className="absolute left-1/2 top-1/2 will-change-transform"
            style={{
              width: 'var(--phone-w, 282px)',
              height: 'var(--phone-h, 462px)',
              transformStyle: 'preserve-3d',
              cursor: 'pointer',
            }}
          >
            <PhoneReelShell
              ref={i === active ? videoRef : undefined}
              item={r}
              seed={i + 1}
              handle={handle}
              isActive={i === active}
              mountVideo={i === active && inView && !r.isPlaceholder && expanded === null}
              muted={muted}
              compact={Math.abs(i - active) > 1}
            />
            {/* Restrained expand affordance so the click target is obvious */}
            {i === active && !r.isPlaceholder && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full text-text-100"
                style={{ background: 'rgba(2,3,6,0.55)', border: '1px solid rgba(255,255,255,0.22)' }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M5 1H1v4M9 13h4V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <section aria-label={label} className="relative">
      {/*
        Asymmetric editorial split on desktop: the text column carries the
        heading, explanation, active-reel information and controls, and the
        installation sits beside it. Previously the heading sat BEHIND the
        phones and the installation ran full width, so it read as a standalone
        demo rather than part of the case study.

        DOM order is heading → explanation → active info → controls → media in
        both layouts, so the reading order never depends on which side something
        is drawn on.
      */}
      {mobile ? (
        <>
          <div className="flow-gutter relative z-10">{headingBlock}</div>
          <div className="mt-6">{stage}</div>
          <div className="flow-gutter relative z-10 mt-6 flex flex-col gap-4">
            {activeInfo}
            {controls}
          </div>
        </>
      ) : (
        <div className="flow-gutter grid grid-cols-12 items-center gap-x-10">
          <div className="col-span-12 flex flex-col gap-8 lg:col-span-4">
            {headingBlock}
            <div className="flex flex-col gap-5">
              {activeInfo}
              {controls}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8">{stage}</div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        Reel {active + 1} of {reels.length}: {item.client}, {item.title}
      </p>

      <MediaLightbox
        items={lightboxItems}
        index={expanded === null ? null : realIndexToLightbox[expanded] ?? null}
        accent={item.accent}
        onClose={() => setExpanded(null)}
        onIndex={(i) => {
          const realIdx = lightboxToRealIndex[i]
          if (realIdx != null) {
            setExpanded(realIdx)
            goTo(realIdx)
          }
        }}
      />

      <div data-flow-anchor={flowAnchor} className="pointer-events-none absolute inset-x-0 top-1/2 h-px" aria-hidden="true" />
    </section>
  )
}
