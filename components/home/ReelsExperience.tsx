'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { caseStudies } from '@/content/caseStudies'
import Reveal from '@/components/ui/Reveal'
import { useIsNarrow, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Reels proof experience (spec §16) — a new dimensional carousel, not the old
 * gallery. One dominant centre reel with side reels at restrained z-depth;
 * client-aware labels; drag (pointer + inertia), buttons, keyboard and touch;
 * ONLY the active reel ever loads/plays; per-reel progress hairline.
 *
 * Motion model: a rAF loop eases `float` toward `target` (critically damped
 * lerp). Transforms are written straight to DOM nodes — zero React state per
 * frame. Drag moves `target` directly; release snaps to the nearest slot with
 * velocity carry. Mobile / reduced motion: native horizontal scroll-snap strip
 * (accessible, no custom physics), active reel chosen by scroll proximity.
 *
 * All 7 REAL reels ship (3 Sapale, 3 SES, 1 Divija). The two Divija slots that
 * were never supplied appear only on the Divija case page as labelled
 * placeholders — a proof gallery must show real proof (see docs/REELS-SYSTEM.md).
 */

interface ReelSlide {
  client: string
  accent: string
  title: string
  src: string
  poster: string
  caseId: string
}

const SLIDES: ReelSlide[] = caseStudies.flatMap((cs) =>
  cs.reels
    .filter((r) => !r.isPlaceholder)
    .map((r) => ({
      client: cs.client,
      accent: cs.accentColor,
      title: r.title,
      src: r.src,
      poster: r.poster ?? '',
      caseId: cs.id,
    }))
)

/** The active slide's video — mounted only for the active index so exactly one
 *  video element exists at a time (spec §30: never load all nine reels). */
function ActiveReelVideo({
  slide,
  muted,
  onProgress,
  paused,
}: {
  slide: ReelSlide
  muted: boolean
  paused: boolean
  onProgress: (p: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (paused || reduced || document.hidden) {
      video.pause()
      return
    }
    // Only plays while its carousel is on screen — the parent unmounts this
    // component entirely when the section scrolls away.
    video.play().catch(() => {})
  }, [muted, paused, reduced, slide.src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => {
      if (video.duration > 0) onProgress(video.currentTime / video.duration)
    }
    const onVis = () => {
      if (document.hidden) video.pause()
      else if (!paused && !reduced) video.play().catch(() => {})
    }
    video.addEventListener('timeupdate', onTime)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [onProgress, paused, reduced])

  return (
    <video
      ref={videoRef}
      key={slide.src}
      className="absolute inset-0 h-full w-full object-cover"
      poster={slide.poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-label={`${slide.title} — ${slide.client}`}
      tabIndex={-1}
    >
      <source src={slide.src} type="video/mp4" />
    </video>
  )
}

/* ---------------------------------------------------------------- desktop */

function DesktopReels() {
  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const progressRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const [userPaused, setUserPaused] = useState(false)
  const [inView, setInView] = useState(false)

  // motion refs (never in React state)
  const float = useRef(0)
  const target = useRef(0)
  const raf = useRef(0)
  const dragging = useRef(false)
  const lastX = useRef(0)
  const velocity = useRef(0)

  const max = SLIDES.length - 1
  const clampTarget = (v: number) => Math.max(-0.35, Math.min(max + 0.35, v))

  // rAF layout loop — eases float → target, writes card transforms.
  useEffect(() => {
    const step = () => {
      const f = float.current
      const t = target.current
      const next = Math.abs(t - f) < 0.0005 ? t : f + (t - f) * 0.14
      if (next !== f || true) {
        float.current = next
        cardRefs.current.forEach((el, i) => {
          if (!el) return
          const off = i - next
          const abs = Math.min(Math.abs(off), 3)
          el.style.transform = `translate3d(calc(-50% + ${off * 66}%), -50%, 0) scale(${1 - abs * 0.16})`
          el.style.opacity = String(Math.max(0, 1 - abs * 0.34))
          el.style.zIndex = String(20 - Math.round(abs * 4))
          el.style.filter = `brightness(${1 - Math.min(abs * 0.28, 0.6)})`
          el.style.visibility = abs >= 2.9 ? 'hidden' : 'visible'
        })
      }
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [])

  // Pause everything when the section is offscreen; unmount active video.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio > 0.35), { threshold: [0, 0.35, 0.6] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // activeRef mirrors `active` so rapid successive clicks never read a stale
  // closure value (React batches same-frame state updates).
  const activeRef = useRef(0)
  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(max, i))
      activeRef.current = clamped
      target.current = clamped
      setActive(clamped)
      if (progressRef.current) progressRef.current.style.transform = 'scaleX(0)'
    },
    [max]
  )
  const step = useCallback((dir: 1 | -1) => goTo(activeRef.current + dir), [goTo])

  // Drag / swipe with pointer capture + velocity snap.
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    lastX.current = e.clientX
    velocity.current = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const stage = stageRef.current
    const w = stage ? stage.clientWidth * 0.34 : 420
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    velocity.current = dx
    target.current = clampTarget(target.current - dx / w)
  }
  const endDrag = () => {
    if (!dragging.current) return
    dragging.current = false
    const flung = target.current - velocity.current * 0.06
    goTo(Math.round(Math.max(0, Math.min(max, flung))))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      step(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      step(-1)
    }
  }

  const slide = SLIDES[active]

  return (
    <div>
      {/* current client / project label — text tied to the active slot */}
      <div className="mx-auto mb-8 flex w-full max-w-[1500px] flex-wrap items-baseline justify-between gap-4 px-6 sm:px-10 lg:px-14">
        <p className="font-display text-sm font-medium uppercase text-text-100" style={{ letterSpacing: '0.2em' }} aria-live="polite">
          {slide.client}
          <span className="ml-4 normal-case text-text-500" style={{ letterSpacing: '0.02em' }}>
            {slide.title}
          </span>
        </p>
        <p className="font-body text-xs text-text-500">
          {String(active + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </p>
      </div>

      {/* the stage */}
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Client reels"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        className="relative mx-auto w-full max-w-[1680px] cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
        style={{ height: 'min(56vh, 560px)' }}
      >
        {SLIDES.map((s, i) => {
          const isActive = i === active
          return (
            <div
              key={s.src}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              className="absolute left-1/2 top-1/2 overflow-hidden rounded-sm will-change-transform"
              style={{ width: 'clamp(300px, 30vw, 460px)', aspectRatio: '1 / 1', boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}
              aria-hidden={!isActive}
            >
              {/* poster always present; the single video mounts on the active card */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.poster} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              {isActive && inView && (
                <ActiveReelVideo
                  slide={s}
                  muted={muted}
                  paused={userPaused}
                  onProgress={(p) => {
                    if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`
                  }}
                />
              )}
              {/* local accent edge — the only place the client colour appears */}
              {isActive && (
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `${s.accent}99` }} />
              )}
            </div>
          )
        })}
      </div>

      {/* progress + controls */}
      <div className="mx-auto mt-7 flex w-full max-w-[1500px] items-center justify-between gap-6 px-6 sm:px-10 lg:px-14">
        <div className="h-px max-w-[300px] flex-1 overflow-hidden bg-white/10" aria-hidden="true">
          <div ref={progressRef} className="h-full w-full origin-left" style={{ background: 'var(--blue-500)', transform: 'scaleX(0)' }} />
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? 'Play reel' : 'Pause reel'}
            className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
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
            aria-label={muted ? 'Unmute reel' : 'Mute reel'}
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
          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
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
    </div>
  )
}

/* ----------------------------------------------------------------- mobile */

function MobileReels() {
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const [inView, setInView] = useState(false)

  // Active = the snap item nearest the viewport centre.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let ticking = false
    const pick = () => {
      ticking = false
      const mid = track.scrollLeft + track.clientWidth / 2
      let best = 0
      let bestDist = Infinity
      Array.from(track.children).forEach((child, i) => {
        const el = child as HTMLElement
        const c = el.offsetLeft + el.offsetWidth / 2
        const d = Math.abs(c - mid)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      setActive(best)
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(pick)
      }
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    pick()
    return () => track.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio > 0.3), { threshold: [0, 0.3] })
    io.observe(track)
    return () => io.disconnect()
  }, [])

  const slide = SLIDES[active]

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between px-6">
        <p className="font-display text-[13px] font-medium uppercase text-text-100" style={{ letterSpacing: '0.18em' }} aria-live="polite">
          {slide.client}
        </p>
        <p className="font-body text-xs text-text-500">
          {active + 1} / {SLIDES.length}
        </p>
      </div>
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-3"
        style={{ scrollbarWidth: 'none' }}
        aria-label="Client reels"
      >
        {SLIDES.map((s, i) => (
          <li
            key={s.src}
            className="relative w-[78vw] max-w-[420px] flex-shrink-0 snap-center overflow-hidden rounded-sm"
            style={{ aspectRatio: '1 / 1' }}
            aria-label={`${s.title} — ${s.client}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            {i === active && inView && (
              <ActiveReelVideo slide={s} muted={muted} paused={false} onProgress={() => {}} />
            )}
            <div className="absolute bottom-0 left-0 w-full px-4 py-3" style={{ background: 'linear-gradient(to top, rgba(2,3,6,0.85), transparent)' }}>
              <p className="font-body text-xs text-text-200">{s.title}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute reel' : 'Mute reel'}
          aria-pressed={!muted}
          className="flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-full border px-5 text-xs uppercase text-text-100"
          style={{ borderColor: muted ? 'var(--border-strong)' : 'var(--blue-500)', letterSpacing: '0.14em' }}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ shell */

export default function ReelsExperience() {
  const narrow = useIsNarrow()
  const reduced = useReducedMotion()
  const simple = narrow || reduced

  // Section intro copy stays server-agnostic; the interactive body swaps.
  const body = useMemo(() => (simple ? <MobileReels /> : <DesktopReels />), [simple])

  return (
    <section id="reels" aria-label="Short-form reels" className="relative pb-[14vh] pt-[6vh]">
      <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="mb-10 max-w-2xl">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Reels
          </span>
          <h2 className="font-display mt-5 font-bold text-text-100" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.8rem)', lineHeight: 1.08 }}>
            Short-form that actually moves numbers.
          </h2>
        </Reveal>
      </div>
      {body}
    </section>
  )
}
