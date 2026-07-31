'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { useReportVideoAudible } from '@/lib/audio/useReportVideoAudible'
import { scrollToElementCenter } from '@/lib/scrollTo'

const SRC = '/media/showreel/showreel.mp4'
const POSTER = '/media/showreel/showreel-poster.webp'

/**
 * Showreel — the real 32 s CINEHEIGHT film. It follows the brand statement in
 * one continuous flow on the shared #020306 stage: no section container, no
 * hard boundary. As the section scrolls in, the frame expands through an
 * opening mask (scrub, no pin — the hero's sticky has already released).
 *
 * ── One interaction, two modes ───────────────────────────────────────────────
 *
 * The old controls were two small buttons in a corner that each owned a slice
 * of the behaviour, so "playing" and "has sound" could disagree with the video
 * element. This is a single state machine instead:
 *
 *   ambient   the default. Muted, looping, playing whenever the section is
 *             sufficiently on screen. Never makes a sound, ever.
 *   featured  the visitor asked to watch it. Centred in the viewport, restarted
 *             from 0, unmuted, ambient soundscape ducked.
 *
 * `playing` and `muted` are **derived from the video element's own events**
 * (`play`, `pause`, `ended`, `volumechange`), never set optimistically — so the
 * button can never claim something the element is not doing. Leaving the
 * viewport in `featured` mode drops back to `ambient` and re-mutes; returning
 * never restores sound, because only an explicit action may turn it on.
 */
export default function ShowreelSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  /** The visitor paused deliberately — do not let the observer resume it. */
  const userPausedRef = useRef(false)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  const [mode, setMode] = useState<'ambient' | 'featured'>('ambient')
  const modeRef = useRef<'ambient' | 'featured'>('ambient')
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)

  // Duck the ambient soundscape whenever this video is audible.
  useReportVideoAudible(!muted, 'showreel')

  const enterMode = useCallback((next: 'ambient' | 'featured') => {
    modeRef.current = next
    setMode(next)
  }, [])

  // ---- Scroll expansion (scrub, no pin) --------------------------------
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const frame = frameRef.current
      const video = videoRef.current
      if (!frame) return
      // Begins while hero statement still owns the frame — removes empty travel.
      gsap.fromTo(
        frame,
        { scale: mobile ? 0.94 : 0.82, autoAlpha: 0.4, clipPath: 'inset(10% 0% 10% 0%)' },
        {
          scale: 1,
          autoAlpha: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          ease: 'none',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 99%', end: mobile ? 'top 52%' : 'top 42%', scrub: 1.05 },
        }
      )
      if (video && !mobile) {
        gsap.fromTo(
          video,
          { scale: 1.05 },
          { scale: 1, ease: 'none', scrollTrigger: { trigger: sectionRef.current, start: 'top 90%', end: 'top 38%', scrub: 1 } }
        )
      }
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  // ---- State derived from the element, never assumed --------------------
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // React's `muted` JSX attribute is not reliably applied to the property on
    // hydration; assert it so the element and the state agree from frame one.
    video.muted = true
    setMuted(true)

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolume = () => setMuted(video.muted)
    const onLoaded = () => setReady(true)
    const onEnded = () => {
      // `loop` is switched off while featured so this fires exactly once, at
      // the real end of the film. Hand back to the ambient loop cleanly.
      video.muted = true
      video.loop = true
      video.currentTime = 0
      userPausedRef.current = false
      enterMode('ambient')
      if (!document.hidden && !reduced) video.play().catch(() => {})
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('volumechange', onVolume)
    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('loadeddata', onLoaded)
    video.addEventListener('ended', onEnded)
    if (video.readyState >= 1) setReady(true)
    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('volumechange', onVolume)
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('loadeddata', onLoaded)
      video.removeEventListener('ended', onEnded)
    }
  }, [enterMode, reduced])

  // ---- Visibility: ambient autoplay, and re-mute on the way out ---------
  useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section) return

    const io = new IntersectionObserver(
      ([entry]) => {
        const r = entry.intersectionRatio
        if (r >= 0.55) {
          // Under reduced motion do NOT autoplay — show the poster and let the
          // visitor start playback deliberately (no unsolicited motion).
          if (!userPausedRef.current && !document.hidden && !reduced) {
            video.play().catch(() => {})
          }
          return
        }
        if (r < 0.25) {
          // Mostly gone. Sound must never continue from off screen, and the
          // section must not be left in a state that resumes audio on return.
          if (modeRef.current === 'featured') {
            video.muted = true
            video.loop = true
            userPausedRef.current = false
            enterMode('ambient')
          }
          video.pause()
        }
      },
      { threshold: [0, 0.25, 0.55, 0.8] }
    )
    io.observe(section)

    const onVis = () => {
      if (document.hidden) video.pause()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced, enterMode])

  /**
   * The one committed action: watch this, with sound.
   *
   * Unmute and play happen synchronously inside the click handler — that is the
   * gesture the autoplay policy is looking at, and deferring them until after
   * the scroll animation would risk the play() being rejected.
   */
  const engage = useCallback(() => {
    const video = videoRef.current
    const frame = frameRef.current
    if (!video) return
    userPausedRef.current = false
    enterMode('featured')
    video.loop = false
    video.currentTime = 0
    video.muted = false
    void video.play().catch(() => {})
    if (frame) scrollToElementCenter(frame, { immediate: reduced, duration: 0.85 })
  }, [enterMode, reduced])

  /** Pause / resume without changing which mode we are in. */
  const togglePlayback = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      userPausedRef.current = false
      void video.play().catch(() => {})
    } else {
      userPausedRef.current = true
      video.pause()
    }
  }, [])

  /** Clicking the film itself: engage if ambient, otherwise pause/resume. */
  const onVideoClick = useCallback(() => {
    if (modeRef.current === 'featured') togglePlayback()
    else engage()
  }, [engage, togglePlayback])

  const featured = mode === 'featured'
  const showPauseLabel = featured && playing
  const centreLabel = featured ? (playing ? 'Pause' : 'Resume') : 'Play Showreel'
  const centreAria = featured
    ? playing
      ? 'Pause showreel'
      : 'Resume showreel'
    : 'Play showreel with sound'

  return (
    <section
      ref={sectionRef}
      id="showreel"
      aria-label="Showreel"
      className="relative flex flex-col items-center justify-center"
      /*
       * Height is derived from the frame, not a fixed vh.
       *
       * The frame is full-bleed 16:9 capped at the viewport height, so it is
       * `min(56.25vw, 100dvh)` tall — which is a full screen on a 16:9 desktop
       * but only about 40% of one on a 4:3 tablet. A single fixed min-height
       * therefore cannot be right everywhere: the old 150vh reserved most of an
       * extra blank screen on desktop, and any value tuned for desktop leaves
       * an even larger hole on tablet. Expressing it as "the frame plus 20vh of
       * breath" keeps the gap between the hero statement and the film at
       * roughly a fifth of a viewport on every size tested.
       */
      style={{
        minHeight: reduced ? 'auto' : 'calc(min(56.25vw, 100dvh) + 20vh)',
        paddingTop: mobile ? '3vh' : '2vh',
        paddingBottom: '8vh',
      }}
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
          the viewport by the vertical-scrollbar gutter. */}
      <div
        ref={frameRef}
        className="relative z-10 w-full will-change-transform"
        style={{ aspectRatio: '16 / 9', maxHeight: '100dvh' }}
      >
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full cursor-pointer object-cover will-change-transform"
            style={{ backgroundColor: 'var(--bg-900)' }}
            poster={POSTER}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="CINEHEIGHT showreel film"
            tabIndex={-1}
            onClick={onVideoClick}
          >
            <source src={SRC} type="video/mp4" />
          </video>

          {/* Subtle top/bottom feather so any letterbox space blends into black */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-12" style={{ background: 'linear-gradient(to bottom, var(--bg-950), transparent)' }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-14" style={{ background: 'linear-gradient(to top, var(--bg-950), transparent)' }} />

          {/* ---- The one centre control ---- */}
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <button
              type="button"
              onClick={(event) => {
                // The video behind this button also handles clicks; without
                // this the same gesture would be acted on twice.
                event.stopPropagation()
                if (featured) togglePlayback()
                else engage()
              }}
              aria-label={centreAria}
              /* While the film is genuinely playing with sound the control
                 recedes to a hint and returns in full on hover or keyboard
                 focus (see `[data-showreel-control]` in globals.css), so it
                 never sits on top of the work it is showing. */
              data-showreel-control
              data-recede={showPauseLabel ? 'true' : 'false'}
              className="group pointer-events-auto inline-flex min-h-[52px] items-center gap-3 rounded-full px-6 py-3 backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-4 sm:gap-4 sm:px-7"
              style={{
                background: 'rgba(2,3,6,0.58)',
                border: `1px solid ${featured ? 'var(--blue-500)' : 'var(--blue-alpha-40)'}`,
                outlineColor: 'var(--blue-500)',
              }}
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: 'var(--blue-500)' }}
              >
                {showPauseLabel ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#02060c" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#02060c" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                )}
              </span>
              <span
                className="font-display text-[11px] font-medium uppercase text-text-100 sm:text-[12px]"
                style={{ letterSpacing: '0.22em' }}
              >
                {centreLabel}
              </span>
            </button>
          </div>

          {/* Mute escape hatch — always available, never the primary action. */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 sm:bottom-4 sm:left-4">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                const video = videoRef.current
                if (!video) return
                if (video.muted) {
                  // Turning sound on by hand is just as explicit as the centre
                  // action, so it enters the same mode.
                  engage()
                } else {
                  video.muted = true
                  video.loop = true
                  enterMode('ambient')
                }
              }}
              aria-label={muted ? 'Unmute showreel' : 'Mute showreel'}
              aria-pressed={!muted}
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-text-100 backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 before:absolute before:-inset-2 before:content-['']"
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
