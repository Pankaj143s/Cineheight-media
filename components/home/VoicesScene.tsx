'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import { about } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * About and client voices as ONE transformation, not two sections.
 *
 * The manifesto states the positioning; the capability words travel behind it
 * at three depths; then a small window opens *through* the typography and
 * expands into the testimonial film. Attribution and controls only appear once
 * the window has become the film.
 *
 * Only REAL recorded films ship: Sapale Yamaha and Divija. Sindhudurg Education
 * Society never recorded a testimonial, so there is no SES entry and no
 * invented quote stands in for one.
 */

const FILMS = caseStudies
  .filter((cs) => cs.topVideo.type === 'testimonial')
  .map((cs) => ({
    client: cs.client,
    category: cs.category,
    title: cs.topVideo.title,
    src: cs.topVideo.src,
    poster: cs.topVideo.poster,
    accent: cs.accentColor,
  }))

export default function VoicesScene() {
  const rootRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const [userPaused, setUserPaused] = useState(false)
  const [inView, setInView] = useState(false)

  const film = FILMS[active]

  // ---- the window opening through the type, then becoming the film -------
  useIsomorphicLayoutEffect(() => {
    if (reduced || mobile) return
    const ctx = gsap.context((self) => {
      const window_ = self.selector!('[data-film-window]')[0] as HTMLElement
      const manifesto = self.selector!('[data-manifesto]')[0] as HTMLElement
      const caps = self.selector!('[data-cap]') as HTMLElement[]
      const meta = self.selector!('[data-film-meta]')[0] as HTMLElement
      if (!window_) return

      // Capability words drift at three depths behind the statement.
      caps.forEach((cap, i) => {
        gsap.fromTo(
          cap,
          { yPercent: 30 + i * 16, xPercent: i % 2 ? 8 : -8 },
          {
            yPercent: -30 - i * 10,
            xPercent: i % 2 ? -6 : 6,
            ease: 'none',
            scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'bottom top', scrub: 1.1 + i * 0.3 },
          }
        )
      })

      // The window starts as a slit inside the typography and grows into the
      // film; the manifesto recedes behind it as it takes over.
      gsap
        .timeline({
          scrollTrigger: { trigger: rootRef.current, start: 'top 62%', end: 'top -12%', scrub: 0.75 },
          defaults: { ease: 'none' },
        })
        .fromTo(
          window_,
          { clipPath: 'inset(44% 40% 44% 40%)', scale: 0.92, autoAlpha: 0.4 },
          { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, autoAlpha: 1, duration: 0.7 },
          0
        )
        .fromTo(manifesto, { autoAlpha: 1, y: 0 }, { autoAlpha: 0.16, y: -60, duration: 0.6 }, 0.16)
        .fromTo(meta, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 0.62)
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  // ---- playback discipline ----------------------------------------------
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio > 0.4), { threshold: [0, 0.4] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (!inView || userPaused || document.hidden || reduced) {
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
      id="voices"
      aria-label="About Cineheight and client voices"
      className="relative z-10"
      style={{ marginTop: mobile ? '8vh' : 'clamp(6rem, 14vh, 13rem)' }}
    >
      {/* capability words travelling at depth, behind everything */}
      {!mobile && !reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {about.capabilities.map((cap, i) => (
            <span
              key={cap}
              data-cap
              className="chapter-numeral absolute whitespace-nowrap font-display font-bold uppercase"
              style={{
                fontSize: `clamp(2.4rem, ${5 + i}vw, ${5 + i}rem)`,
                left: `${[4, 52, 18, 62][i] ?? 20}%`,
                top: `${[14, 30, 62, 78][i] ?? 40}%`,
                opacity: 0.5 - i * 0.06,
              }}
            >
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* the manifesto */}
      <div data-manifesto className="flow-gutter relative z-10 max-w-[22ch]">
        <KineticLabel text="IN THEIR OWN WORDS" />
        <SplitLineReveal
          as="h2"
          lines={['Everything a', 'brand needs.', <span key="ot" style={{ color: 'var(--blue-500)' }}>One team.</span>]}
          srLabel={about.headline}
          className="font-display mt-6 font-bold text-text-100"
          style={{ fontSize: 'clamp(2.2rem, 6vw, 6rem)', lineHeight: 0.94, letterSpacing: '-0.03em' }}
        />
        <p className="font-body measure mt-7 text-base leading-relaxed text-text-300 sm:text-lg">{about.supporting}</p>
      </div>

      {/* the window that becomes the film */}
      <div
        data-film-window
        className="relative mx-auto mt-[6vh] w-[min(92vw,1500px)] overflow-hidden will-change-transform"
        style={{ aspectRatio: '16 / 9', backgroundColor: 'var(--bg-900)' }}
      >
        <video
          key={film.src}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          poster={film.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={`${film.title} — ${film.client}`}
          tabIndex={-1}
        >
          <source src={film.src} type="video/mp4" />
        </video>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(2,3,6,0.8) 2%, transparent 44%)' }}
        />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `${film.accent}cc` }} />
      </div>

      {/* attribution + controls, arriving only after the transformation */}
      <div data-film-meta className="flow-gutter relative z-10 mt-7 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="min-w-0">
          <p className="font-display text-[13px] font-medium uppercase text-text-100" style={{ letterSpacing: '0.2em' }} aria-live="polite">
            {film.client}
          </p>
          <p className="font-body mt-1.5 text-xs uppercase text-text-500" style={{ letterSpacing: '0.16em' }}>
            {film.category}
          </p>
          <p className="font-body measure mt-4 text-sm leading-relaxed text-text-500">
            Recorded on location with the people behind the brand — no scripts, no staged quotes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? `Play ${film.client} film` : `Pause ${film.client} film`}
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
              aria-label={muted ? `Unmute ${film.client} film` : `Mute ${film.client} film`}
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
            <span className="font-body ml-1 text-xs text-text-500">Sound is off until you turn it on.</span>
          </div>

          {FILMS.length > 1 && (
            <div className="flex flex-col" role="group" aria-label="Choose client film">
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
                  className="flex min-h-[44px] items-center gap-4 text-left"
                >
                  <span
                    aria-hidden="true"
                    className="h-px transition-all duration-300"
                    style={{ width: i === active ? 42 : 26, background: i === active ? f.accent : 'var(--border-strong)' }}
                  />
                  <span
                    className="font-display text-[12px] font-medium uppercase transition-colors duration-300"
                    style={{ letterSpacing: '0.14em', color: i === active ? 'var(--text-100)' : 'var(--text-500)' }}
                  >
                    {f.client}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div data-flow-anchor="center" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '30%' }} aria-hidden="true" />
      <div data-flow-anchor="right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '86%' }} aria-hidden="true" />
    </section>
  )
}
