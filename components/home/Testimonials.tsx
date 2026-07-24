'use client'

import { useEffect, useRef, useState } from 'react'
import { caseStudies } from '@/content/caseStudies'
import Reveal from '@/components/ui/Reveal'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Testimonials (spec §21) — only REAL recorded client films ship: the Sapale
 * Yamaha testimonial and the Divija community story. SES never recorded one,
 * so no SES item exists (no invented quotes — the honest omission).
 * One active testimonial at a time; a single video element mounts for it;
 * muted preview plays only while visible, audio strictly behind the unmute
 * button; a soft mask transition swaps between the two.
 */

interface TestimonialItem {
  client: string
  title: string
  src: string
  poster: string
  category: string
  accent: string
}

const ITEMS: TestimonialItem[] = caseStudies
  .filter((cs) => cs.topVideo.type === 'testimonial')
  .map((cs) => ({
    client: cs.client,
    title: cs.topVideo.title,
    src: cs.topVideo.src,
    poster: cs.topVideo.poster,
    category: cs.category,
    accent: cs.accentColor,
  }))

export default function Testimonials() {
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const [userPaused, setUserPaused] = useState(false)
  const [inView, setInView] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()

  const item = ITEMS[active]

  // visibility gate
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio > 0.4), { threshold: [0, 0.4] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // playback discipline — muted preview autoplays only when visible & allowed
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (!inView || userPaused || document.hidden || (reduced && muted)) {
      video.pause()
      return
    }
    video.play().catch(() => {})
  }, [active, muted, userPaused, inView, reduced])

  useEffect(() => {
    const onVis = () => {
      const video = videoRef.current
      if (!video) return
      if (document.hidden) video.pause()
      else if (inView && !userPaused && !(reduced && muted)) video.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [inView, userPaused, reduced, muted])

  const swapTo = (i: number) => {
    if (i === active || swapping) return
    if (reduced) {
      setActive(i)
      return
    }
    setSwapping(true)
    window.setTimeout(() => {
      setActive(i)
      setMuted(true)
      setUserPaused(false)
      window.setTimeout(() => setSwapping(false), 60)
    }, 260)
  }

  if (ITEMS.length === 0) return null

  return (
    <section id="testimonials" aria-label="Client testimonials" className="relative pb-[16vh]">
      <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="mb-12 max-w-2xl">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Client Voices
          </span>
          <h2 className="font-display mt-5 font-bold text-text-100" style={{ fontSize: 'clamp(1.8rem, 3.4vw, 3.2rem)', lineHeight: 1.07 }}>
            In their own words.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          {/* the film */}
          <div ref={frameRef} className="relative lg:col-span-8">
            <div
              className="relative w-full overflow-hidden rounded-sm"
              style={{
                aspectRatio: '16 / 9',
                opacity: swapping ? 0 : 1,
                clipPath: swapping ? 'inset(6% 3% 6% 3%)' : 'inset(0 0 0 0)',
                transition: reduced ? 'none' : 'opacity 0.26s ease, clip-path 0.26s ease',
                backgroundColor: 'var(--bg-900)',
              }}
            >
              <video
                key={item.src}
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                poster={item.poster}
                muted
                loop
                playsInline
                preload="none"
                aria-label={`${item.title} — ${item.client}`}
                tabIndex={-1}
              >
                <source src={item.src} type="video/mp4" />
              </video>
              {/* local accent hairline */}
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `${item.accent}88` }} />
            </div>

            {/* controls — labelled, keyboard reachable */}
            <div className="mt-4 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? `Play ${item.client} testimonial` : `Pause ${item.client} testimonial`}
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
                aria-label={muted ? `Unmute ${item.client} testimonial` : `Mute ${item.client} testimonial`}
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
              <span className="font-body ml-2 text-xs text-text-500">Sound is off until you turn it on.</span>
            </div>
          </div>

          {/* attribution + switcher */}
          <div className="lg:col-span-4 lg:self-center">
            <p className="font-display text-sm font-medium uppercase text-text-100" style={{ letterSpacing: '0.2em' }} aria-live="polite">
              {item.client}
            </p>
            <p className="font-body mt-2 text-xs uppercase text-text-500" style={{ letterSpacing: '0.16em' }}>
              {item.category}
            </p>
            <p className="font-body mt-6 max-w-sm text-sm leading-relaxed text-text-300">
              Recorded on location with the people behind the brand — no scripts, no staged quotes.
            </p>

            <div className="mt-10 flex flex-col gap-1" role="group" aria-label="Choose testimonial">
              {ITEMS.map((t, i) => (
                <button
                  key={t.src}
                  type="button"
                  onClick={() => swapTo(i)}
                  aria-pressed={i === active}
                  className="flex min-h-[44px] items-center gap-4 border-b py-3 text-left transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span
                    aria-hidden="true"
                    className="h-px w-8 transition-all duration-300"
                    style={{ background: i === active ? 'var(--blue-500)' : 'var(--border-strong)', width: i === active ? 44 : 32 }}
                  />
                  <span
                    className="font-display text-[13px] font-medium uppercase transition-colors duration-300"
                    style={{ letterSpacing: '0.14em', color: i === active ? 'var(--text-100)' : 'var(--text-500)' }}
                  >
                    {t.client}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
