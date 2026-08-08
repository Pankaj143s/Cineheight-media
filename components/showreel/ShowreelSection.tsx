'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { gsap } from '@/lib/gsap'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { useReportVideoAudible } from '@/lib/audio/useReportVideoAudible'
import { scrollToElementCenter } from '@/lib/scrollTo'
import { observeVisibleLayerPromotion } from '@/lib/visibleLayerPromotion'

const SOURCES = {
  compact: '/media/showreel/showreel-540.mp4',
  standard: '/media/showreel/showreel-720.mp4',
  large: '/media/showreel/showreel-1080.mp4',
}
const POSTER = '/media/showreel/showreel-poster.webp'

/**
 * Showreel — the real 32 s CINEHEIGHT film. It follows the brand statement in
 * one continuous flow on the shared #020306 stage: label sits on the film,
 * FlowThread hugs the left edge through this zone (no horizontal section cut).
 * As the section scrolls in, the frame scales up (scrub, no pin).
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
export default function ShowreelSection({ context }: { context?: 'home' | 'about' }) {
  const pathname = usePathname()
  const presentation = context ?? (pathname === '/about' ? 'about' : 'home')
  const aboutPresentation = presentation === 'about'
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
      const gate = sectionRef.current?.querySelector<HTMLElement>('[data-showreel-gate]')
      const label = sectionRef.current?.querySelector<HTMLElement>('[data-showreel-label]')
      const control = sectionRef.current?.querySelector<HTMLElement>('[data-showreel-control-wrap]')
      if (!frame) return
      // Scale + fade only — no clip inset (that cropped top/bottom and
      // revealed a second “panel” behind the film and label).
      gsap.fromTo(
        frame,
        {
          scale: mobile ? 0.92 : aboutPresentation ? 0.9 : 0.82,
          xPercent: aboutPresentation && !mobile ? -3 : 0,
          autoAlpha: aboutPresentation ? 0.48 : 0.4,
        },
        {
          scale: 1,
          xPercent: 0,
          autoAlpha: 1,
          ease: 'none',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 99%', end: mobile ? 'top 52%' : 'top 42%', scrub: 0.75 },
        }
      )
      if (gate && mobile) {
        gsap.fromTo(
          gate,
          { clipPath: 'inset(12% 0% 12% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'none',
            scrollTrigger: { trigger: sectionRef.current, start: 'top 96%', end: 'top 55%', scrub: 0.75 },
          }
        )
      }
      if (video) {
        gsap.fromTo(
          video,
          { scale: mobile ? 1.055 : 1.05, yPercent: mobile ? -2 : 0 },
          {
            scale: 1,
            yPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: sectionRef.current, start: 'top 92%', end: mobile ? 'top 48%' : 'top 38%', scrub: 0.75 },
          }
        )
      }
      if (mobile && label && control) {
        gsap.fromTo(
          label,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, ease: 'none', scrollTrigger: { trigger: sectionRef.current, start: 'top 76%', end: 'top 55%', scrub: 0.7 } }
        )
        gsap.fromTo(
          control,
          { autoAlpha: 0, scale: 0.92 },
          { autoAlpha: 1, scale: 1, ease: 'none', scrollTrigger: { trigger: sectionRef.current, start: 'top 66%', end: 'top 45%', scrub: 0.7 } }
        )
      }
      if (mobile) {
        gsap.to(frame, {
          scale: 0.94,
          y: '-4svh',
          autoAlpha: 0.64,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'bottom 64%',
            end: 'bottom 18%',
            scrub: 0.8,
          },
        })
      }
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced, mobile, aboutPresentation])

  useEffect(() => {
    if (reduced) return
    const targets = [frameRef.current, videoRef.current].filter(
      (target): target is HTMLDivElement | HTMLVideoElement => target !== null
    )
    return observeVisibleLayerPromotion(targets, '30% 0px', 'media')
  }, [reduced])

  useLayoutEffect(() => {
    if (!reduced || !aboutPresentation) return
    const frame = frameRef.current
    const caption = sectionRef.current?.querySelector<HTMLElement>('[data-showreel-caption]')
    frame?.animate([{ opacity: 0.72 }, { opacity: 1 }], { duration: 170, easing: 'ease-out' })
    caption?.animate([{ opacity: 0.68 }, { opacity: 1 }], { duration: 150, delay: 30, easing: 'ease-out' })
  }, [reduced, aboutPresentation])

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
      aria-label={aboutPresentation ? 'Cineheight point of view film' : 'Showreel'}
      data-showreel-context={presentation}
      className="relative flex flex-col items-center justify-center"
      /*
       * Height tracks the full-bleed 16:9 frame plus a little breath below.
       * Label sits ON the film — no dark header strip above the picture.
       */
      style={{
        minHeight: reduced ? 'auto' : mobile ? '72svh' : 'calc(min(56.25vw, 100dvh) + 8vh)',
        paddingTop: mobile ? '4svh' : '0',
        paddingBottom: mobile ? '8svh' : '6vh',
      }}
    >
      {/* Steer FlowThread along the left edge so it doesn’t cut a horizontal
          divider across the film / label band. */}
      <div
        data-flow-anchor="edge-left"
        data-flow-lead="0.12"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        aria-hidden="true"
      />
      <div
        data-flow-anchor="edge-left"
        data-flow-lead="0.88"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        aria-hidden="true"
      />

      {/* Soft ambient glow behind the frame — full-bleed edges leave no room
          for a box-shadow, so this reads as background bloom instead. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-16 inset-x-0 z-0 sm:-inset-y-24"
        style={{
          background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(0,137,255,0.12), transparent 72%)',
          filter: 'blur(48px)',
        }}
      />

      {/* Frame — full-bleed width, 16:9, capped to the viewport height.
          On very wide viewports, width:100% + aspect-ratio:16/9 would ask for
          more height than maxHeight allows — max-height wins that conflict on
          its own, silently widening the effective ratio past 16:9 and making
          object-cover crop harder than intended. Capping max-width to the
          height-driven 16:9 size (mirrors the section's own `min(56.25vw,
          100dvh)` sizing below) keeps the frame genuinely 16:9 at any width. */}
      <div
        ref={frameRef}
        data-showreel-frame
        className={mobile ? 'relative z-10 w-[94vw]' : 'relative z-10 w-full'}
        style={{
          aspectRatio: mobile ? '4 / 5' : '16 / 9',
          maxHeight: mobile ? '60svh' : '100dvh',
          maxWidth: mobile ? undefined : 'calc(100dvh * 16 / 9)',
        }}
      >
        <div className="relative h-full w-full">
          {/* Media shell — short edge dissolve into the stage (no heavy black wash). */}
          <div
            data-showreel-gate
            className="absolute inset-0 overflow-hidden"
            style={{
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, #000 1.5%, #000 98.5%, transparent 100%)',
              maskImage:
                'linear-gradient(to bottom, transparent 0%, #000 1.5%, #000 98.5%, transparent 100%)',
            }}
          >
            <video
              ref={videoRef}
              data-showreel-video
              className="absolute inset-0 h-full w-full cursor-pointer object-cover"
              style={{ backgroundColor: 'var(--bg-950)', objectPosition: aboutPresentation ? '52% center' : 'center' }}
              poster={POSTER}
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="CINEHEIGHT showreel film"
              tabIndex={-1}
              onClick={onVideoClick}
            >
              <source
                src={SOURCES.compact}
                type="video/mp4"
                media="(max-width: 639px)"
                data-showreel-variant="compact"
              />
              <source
                src={SOURCES.standard}
                type="video/mp4"
                media="(min-width: 640px) and (max-width: 1279px)"
                data-showreel-variant="standard"
              />
              <source
                src={SOURCES.large}
                type="video/mp4"
                data-showreel-variant="large"
              />
            </video>
          </div>

          {/* Editorial label — on the film, below the sticky nav; shadow for contrast */}
          <div data-showreel-label className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-baseline gap-x-4 gap-y-1 flow-gutter pt-20 sm:pt-24">
            <span
              className="font-display text-[11px] font-medium uppercase"
              style={{
                letterSpacing: '0.32em',
                color: 'var(--blue-400)',
                textShadow: '0 1px 12px rgba(0,0,0,0.75)',
              }}
            >
              {aboutPresentation ? 'How we see it' : 'Showreel'}
            </span>
            <span
              data-showreel-caption
              className="font-body text-xs text-text-200 sm:text-sm"
              style={{
                letterSpacing: '0.01em',
                textShadow: '0 1px 12px rgba(0,0,0,0.75)',
              }}
            >
              {aboutPresentation
                ? 'The shared point of view behind every strategy, frame and campaign.'
                : 'A glimpse of how we turn strategy into stories, content and growth.'}
            </span>
          </div>

          {/* ---- The one centre control ---- */}
          <div data-showreel-control-wrap className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                if (featured) togglePlayback()
                else engage()
              }}
              aria-label={centreAria}
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
