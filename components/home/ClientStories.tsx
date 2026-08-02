'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import OrientationMedia from '@/components/media/OrientationMedia'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { useReportVideoAudible } from '@/lib/audio/useReportVideoAudible'

/**
 * Client stories — the recorded films, on a canvas that reaches the full width
 * of the viewport instead of being capped at 92vw / 1500px.
 *
 * Only films that actually exist ship: Sapale Yamaha and Divija. Sindhudurg
 * Education Society never recorded a testimonial, so there is no SES entry and
 * nothing invented stands in for one.
 *
 * The previous copy claimed every film was "recorded on location … no scripts,
 * no staged quotes", which is not verified for both films. It has been replaced
 * with a neutral, factual line.
 */

/**
 * Films shown on the homepage.
 *
 * The Sapale Yamaha testimonial is deliberately excluded *here only*. The asset
 * and its case-study placement are untouched — it still opens
 * /work/sapale-yamaha — this is purely a homepage curation decision.
 */
const HOMEPAGE_EXCLUDED = new Set(['sapale-yamaha'])

const FILMS = caseStudies
  .filter((cs) => cs.topVideo.type === 'testimonial' && !HOMEPAGE_EXCLUDED.has(cs.id))
  .map((cs) => ({
    client: cs.client,
    category: cs.category,
    title: cs.topVideo.title,
    src: cs.topVideo.src,
    poster: cs.topVideo.poster,
    orientation: cs.topVideo.orientation,
    accent: cs.accentColor,
    id: cs.id,
    mobileObjectPosition: cs.id === 'divija-old-age-home' ? '54% center' : 'center',
  }))

export default function ClientStories() {
  const rootRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  // Duck the ambient soundscape whenever this video is audible.
  useReportVideoAudible(!muted, 'client-story')
  const [userPaused, setUserPaused] = useState(false)
  const [inView, setInView] = useState(false)

  const film = FILMS[active]

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const canvas = self.selector!('[data-canvas]')[0]
      const media = self.selector!('[data-story-media]')[0]
      if (!canvas) return
      // The canvas opens from a letterbox slit as it arrives — the film emerges
      // from the page rather than appearing on top of it.
      gsap.fromTo(
        canvas,
        { clipPath: 'inset(22% 0% 22% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          ease: 'none',
          scrollTrigger: { trigger: canvas, start: 'top 94%', end: 'top 34%', scrub: 0.8 },
        }
      )
      if (media) {
        gsap.fromTo(
          media,
          { scale: mobile ? 1.035 : 1.055, yPercent: mobile ? 1.5 : 2.5 },
          {
            scale: 1,
            yPercent: mobile ? -1 : -1.5,
            ease: 'none',
            scrollTrigger: { trigger: canvas, start: 'top 96%', end: 'bottom 28%', scrub: 0.9 },
          }
        )
      }
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const targets = root.querySelectorAll<HTMLElement>('[data-story-attribution], [data-story-controls]')
    if (!targets.length) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { autoAlpha: reduced ? 0.72 : 0, y: reduced ? 0 : mobile ? 8 : 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reduced ? 0.16 : 0.24,
          stagger: reduced ? 0 : 0.06,
          ease: reduced ? 'none' : 'power2.out',
        }
      )
    }, root)
    return () => ctx.revert()
  }, [active, mobile, reduced])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio > 0.3), { threshold: [0, 0.3] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (!inView || userPaused || reduced || document.hidden) {
      video.pause()
      return
    }
    video.play().catch(() => {})
  }, [inView, userPaused, muted, reduced, active])

  useEffect(() => {
    const onVis = () => {
      const video = videoRef.current
      if (!video) return
      if (document.hidden) video.pause()
      else if (inView && !userPaused && !reduced) video.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [inView, userPaused, reduced])

  if (FILMS.length === 0) return null

  return (
    <section
      ref={rootRef}
      id="stories"
      aria-label="Client stories"
      className="relative z-10"
      style={{ marginTop: 'calc(clamp(3.5rem, 10vh, 8rem) * var(--scene-gap))' }}
    >
      <div className="flow-gutter">
        <KineticLabel text="CLIENT STORIES" />
        <SplitLineReveal
          as="h2"
          lines={['Real work. Real outcomes.', 'Told by the people', 'behind the brands.']}
          srLabel="Real work. Real outcomes. Told by the people behind the brands."
          className="type-display-2 font-display mt-6 font-bold uppercase text-text-100"
          style={{ maxWidth: '24ch' }}
        />
      </div>

      {/* Full-width canvas. `100%` rather than `100vw` so the vertical
          scrollbar gutter can never push the page sideways. */}
      <div
        data-canvas
        data-audit="client-stories-canvas"
        data-story-id={film.id}
        className="relative mt-10 w-full overflow-hidden will-change-transform"
        style={{ height: mobile ? 'calc(56.25vw + 10.25rem)' : 'clamp(30rem, 82svh, 62rem)' }}
      >
        <div
          data-story-media
          className={mobile ? 'absolute inset-x-0 bottom-[5.75rem] top-[4.5rem]' : 'absolute inset-[-2%]'}
          data-parallax-y={mobile ? '0.025' : '0.07'}
          data-parallax-scale="0.008"
        >
          <OrientationMedia
            ref={videoRef}
            poster={film.poster}
            src={film.src}
            orientation={film.orientation as 'landscape' | 'square' | 'portrait'}
            alt={`${film.title} — ${film.client}`}
            accent={film.accent}
            muted={muted}
            objectPosition={mobile ? film.mobileObjectPosition : 'center'}
            preserveFrame={mobile}
          >
            {/* safe overlay zone for the attribution and controls */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(2,3,6,0.92) 0%, rgba(2,3,6,0.5) 22%, transparent 52%)',
              }}
            />
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `${film.accent}cc` }} />
          </OrientationMedia>
        </div>

        {mobile ? (
          <>
            <div
              data-story-attribution
              className="flow-gutter pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[4.5rem] flex-col justify-center"
              style={{ background: 'var(--bg-950)' }}
            >
              <p
                className="font-display text-[12px] font-medium uppercase text-text-100"
                style={{ letterSpacing: '0.18em', textShadow: '0 2px 14px rgba(0,0,0,0.9)' }}
                aria-live="polite"
              >
                {film.client}
              </p>
              <p
                className="font-body mt-1 text-[10px] uppercase text-text-200"
                style={{ letterSpacing: '0.14em', textShadow: '0 2px 14px rgba(0,0,0,0.9)' }}
              >
                {film.category}
              </p>
            </div>

            <div
              data-story-controls
              className="flow-gutter absolute inset-x-0 bottom-0 z-20 flex h-[5.75rem] items-center justify-between gap-4"
              style={{ background: 'linear-gradient(to bottom, rgba(2,3,6,0.9), var(--bg-950) 38%)' }}
            >
              <div className="flex items-center gap-2" role="group" aria-label={`${film.client} film controls`}>
                <button
                  type="button"
                  onClick={() => setUserPaused((paused) => !paused)}
                  aria-label={userPaused ? `Play the ${film.client} film` : `Pause the ${film.client} film`}
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-[transform,border-color] duration-200 active:scale-95"
                  style={{ borderColor: 'var(--border-strong)', background: 'rgba(2,3,6,0.72)' }}
                >
                  {userPaused ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMuted((current) => !current)}
                  aria-label={muted ? `Unmute the ${film.client} film` : `Mute the ${film.client} film`}
                  aria-pressed={!muted}
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-[transform,border-color] duration-200 active:scale-95"
                  style={{ borderColor: muted ? 'var(--border-strong)' : 'var(--blue-500)', background: 'rgba(2,3,6,0.72)' }}
                >
                  {muted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" opacity="0.4" /><path d="m3 3 18 18-1.4 1.4L2 4.4z" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
                  )}
                </button>
              </div>
              <p className="font-body text-right text-[11px] leading-tight text-text-300">
                {muted ? 'Sound off' : 'Sound on'}
                <span className="sr-only">. Sound is off until you turn it on.</span>
              </p>
            </div>
          </>
        ) : (
        <div data-story-controls className="flow-gutter absolute inset-x-0 bottom-0 pb-[clamp(1.25rem,4vh,2.75rem)]">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div className="min-w-0" data-parallax-y="0.04" data-story-attribution>
              <p
                className="font-display text-[13px] font-medium uppercase text-text-100"
                style={{ letterSpacing: '0.2em' }}
                aria-live="polite"
              >
                {film.client}
              </p>
              <p className="font-body mt-1.5 text-xs uppercase text-text-300" style={{ letterSpacing: '0.16em' }}>
                {film.category}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUserPaused((p) => !p)}
                  aria-label={userPaused ? `Play the ${film.client} film` : `Pause the ${film.client} film`}
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                  style={{ borderColor: 'var(--border-strong)', background: 'rgba(2,3,6,0.5)' }}
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
                  aria-label={muted ? `Unmute the ${film.client} film` : `Mute the ${film.client} film`}
                  aria-pressed={!muted}
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
                  style={{ borderColor: muted ? 'var(--border-strong)' : 'var(--blue-500)', background: 'rgba(2,3,6,0.5)' }}
                >
                  {muted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" opacity="0.4" /><path d="m3 3 18 18-1.4 1.4L2 4.4z" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
                  )}
                </button>
                <span className="font-body ml-1 text-xs text-text-300">Sound is off until you turn it on.</span>
              </div>

              {FILMS.length > 1 && (
                <div className="flex items-center gap-1" role="group" aria-label="Choose a client film">
                  {FILMS.map((f, i) => (
                    <button
                      key={f.src}
                      type="button"
                      onClick={() => {
                        setActive(i)
                        setMuted(true)
                        setUserPaused(false)
                      }}
                      aria-pressed={i === active}
                      className="flex min-h-[44px] items-center gap-3 px-3 text-left"
                    >
                      <span
                        aria-hidden="true"
                        className="h-px transition-all duration-300"
                        style={{ width: i === active ? 34 : 18, background: i === active ? f.accent : 'var(--border-strong)' }}
                      />
                      <span
                        className="font-display text-[12px] font-medium uppercase transition-colors duration-300"
                        style={{ letterSpacing: '0.14em', color: i === active ? 'var(--text-100)' : 'var(--text-300)' }}
                      >
                        {f.client}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      <p className="flow-gutter font-body mt-5 text-sm leading-relaxed text-text-500">
        Filmed with Cineheight clients about the work we did together.
      </p>

      <div data-flow-anchor="edge-right" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
