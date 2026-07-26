'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

const SRC = '/media/showreel/showreel.mp4'
const POSTER = '/media/showreel/showreel-poster.webp'

/**
 * Showreel — the real 32 s CINEHEIGHT film (copied from the old project's
 * about-us-video-2; only the media asset is reused, the layout/animation are
 * new). It follows the brand statement in one continuous flow on the shared
 * #020306 stage: no section container, no hard boundary. As the section scrolls
 * in, the frame expands (66vw → 94vw) through an opening mask (scrub, no pin —
 * the hero's sticky has already released, so there are no competing pins).
 * Poster-first; muted autoplay only when sufficiently visible; audio only on an
 * explicit tap. Restrained pointer depth on fine-pointer desktops.
 */
export default function ShowreelSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const userPausedRef = useRef(false)
  const rafRef = useRef(0)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)

  // ---- Scroll expansion (scrub, no pin) --------------------------------
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const frame = frameRef.current
      const video = videoRef.current
      if (!frame) return
      gsap.fromTo(
        frame,
        { scale: mobile ? 0.96 : 0.78, autoAlpha: 0.72, clipPath: 'inset(9% 0% 9% 0%)' },
        {
          scale: 1,
          autoAlpha: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          ease: 'none',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 82%', end: mobile ? 'top 48%' : 'top 34%', scrub: 1 },
        }
      )
      if (video && !mobile) {
        gsap.fromTo(
          video,
          { scale: 1.06 },
          { scale: 1, ease: 'none', scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', end: 'top 30%', scrub: 1 } }
        )
      }
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  // ---- Playback: muted autoplay when ≥55% visible, pause when <25% -----
  useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section) return

    const io = new IntersectionObserver(
      ([entry]) => {
        const r = entry.intersectionRatio
        // Under reduced motion do NOT autoplay — show the poster and let the
        // user start playback via the control (no unsolicited motion).
        if (r >= 0.55 && !userPausedRef.current && !document.hidden && !reduced) {
          video.play().catch(() => {})
        } else if (r < 0.25) {
          video.pause()
        }
      },
      { threshold: [0, 0.25, 0.55, 0.8] }
    )
    io.observe(section)

    const onVis = () => { if (document.hidden) video.pause() }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    document.addEventListener('visibilitychange', onVis)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('loadeddata', () => setReady(true))
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [reduced])

  // ---- Restrained pointer depth — DISABLED for the full-bleed (100vw) frame
  // (a tilt/translate would reveal black edges). Kept behind a flag so the
  // subtle internal video-scale parallax is the only depth cue.
  const tiltEnabled = false
  useEffect(() => {
    if (reduced || mobile || !tiltEnabled) return
    const tilt = tiltRef.current
    const frame = frameRef.current
    if (!tilt || !frame) return
    let tx = 0, ty = 0, cur = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      const rect = frame.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      tx = Math.max(-1, Math.min(1, px)) // -0.5..0.5 → clamp
      ty = Math.max(-1, Math.min(1, py))
    }
    const onLeave = () => { tx = 0; ty = 0 }
    const loop = () => {
      cur.x += (tx - cur.x) * 0.08
      cur.y += (ty - cur.y) * 0.08
      // rotate ≤ ±1°, translate ≤ 8px (spec §17)
      tilt.style.transform = `perspective(1400px) rotateY(${cur.x * 1}deg) rotateX(${-cur.y * 1}deg) translate3d(${cur.x * 8}px, ${cur.y * 6}px, 0)`
      rafRef.current = requestAnimationFrame(loop)
    }
    frame.addEventListener('pointermove', onMove)
    frame.addEventListener('pointerleave', onLeave)
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      frame.removeEventListener('pointermove', onMove)
      frame.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [reduced, mobile, tiltEnabled])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      userPausedRef.current = false
      video.play().catch(() => {})
    } else {
      userPausedRef.current = true
      video.pause()
    }
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
    if (!video.muted && video.paused) { userPausedRef.current = false; video.play().catch(() => {}) }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="showreel"
      aria-label="Showreel"
      className="relative flex flex-col items-center justify-center"
      style={{ minHeight: reduced ? 'auto' : mobile ? '120vh' : '150vh', paddingTop: '8vh', paddingBottom: '10vh' }}
    >
      {/* Soft atmospheric light behind the frame — no section container */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 42% at 50% 46%, rgba(0,137,255,0.05), transparent 72%)' }}
      />

      {/* Editorial label + microcopy — aligned to the full-bleed frame edge */}
      <div className="relative z-10 mb-5 flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 px-5 sm:mb-6 sm:px-8 lg:px-10">
        <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
          Showreel
        </span>
        <span className="font-body text-xs text-text-500 sm:text-sm" style={{ letterSpacing: '0.01em' }}>
          A glimpse of how we turn strategy into stories, content and growth.
        </span>
      </div>

      {/* Frame — full-bleed width, 16:9, capped to the viewport height. Video
          stays object-cover so it never distorts; ≤16:9 screens fill, ultrawide
          cover-crops a little, mobile is a natural full-width band.
          `width: 100%` (not 100vw) — this section is a direct, unconstrained
          child of <main>, so 100% is visually identical but never overshoots
          the viewport by the vertical-scrollbar gutter (spec §35/39: no
          horizontal overflow). */}
      <div
        ref={frameRef}
        className="relative z-10 w-full will-change-transform"
        style={{ aspectRatio: '16 / 9', maxHeight: '100dvh' }}
      >
        <div ref={tiltRef} className="relative h-full w-full will-change-transform">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
            style={{ backgroundColor: 'var(--bg-900)' }}
            poster={POSTER}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="CINEHEIGHT showreel film"
            tabIndex={-1}
          >
            <source src={SRC} type="video/mp4" />
          </video>

          {/* Subtle top/bottom feather so any letterbox space blends into black */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-12" style={{ background: 'linear-gradient(to bottom, var(--bg-950), transparent)' }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-14" style={{ background: 'linear-gradient(to top, var(--bg-950), transparent)' }} />

          {/* Controls */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 sm:bottom-4 sm:left-4">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause showreel' : 'Play showreel'}
              className="flex h-11 w-11 items-center justify-center rounded-full text-text-100 backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: 'rgba(2,3,6,0.55)', border: '1px solid var(--border-strong)', outlineColor: 'var(--blue-500)' }}
            >
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute showreel' : 'Mute showreel'}
              aria-pressed={!muted}
              className="flex h-11 w-11 items-center justify-center rounded-full text-text-100 backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: 'rgba(2,3,6,0.55)', border: `1px solid ${muted ? 'var(--border-strong)' : 'var(--blue-500)'}`, outlineColor: 'var(--blue-500)' }}
            >
              {muted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" opacity="0.4" /><path d="m3 3 18 18-1.4 1.4L2 4.4z" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
              )}
            </button>
            {!ready && <span className="sr-only">Loading showreel</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
