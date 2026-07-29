'use client'

import { useEffect, useRef } from 'react'
import { subscribeHeroProgress, getHeroProgress } from '@/lib/heroProgress'
import { useReducedMotion } from '@/lib/useMediaPreferences'

const SRC = '/media/hero/hero-bg.mp4'
const POSTER = '/media/hero/hero-bg-poster.webp'

/**
 * The same hero-progress window `HeroRippleBackground` faded out over, so
 * swapping between the two surfaces changes nothing else about the hero: the
 * brand statement still arrives on a clean stage regardless of which
 * background is mounted.
 */
const FADE_IN = 0.46
const FADE_OUT = 0.74
/** Bottom blend band — the same top-down fraction the ripple's shader used. */
const FADE_START = 0.56
const FADE_END = 0.97

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const smoothstep = (t: number) => t * t * (3 - 2 * t)

/**
 * Background-video variant of the hero surface.
 *
 * A/B alternative to `HeroRippleBackground` at the exact same DOM slot in
 * `HeroIntroSequence` — `position: absolute; inset: 0`, `z-index: auto`, so it
 * paints above the two ambient gradients and below the haze/title/cloud
 * layers by DOM order alone, with no z-index changes anywhere else. Swapping
 * the two is a one-line change in the parent.
 *
 * Deliberately simpler than the ripple: a muted looping `<video>` plus one
 * CSS gradient for the bottom blend, no WebGL, no pointer interaction.
 */
export default function HeroVideoBackground() {
  const reduced = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fadeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced) return
    const video = videoRef.current
    const fadeEl = fadeRef.current
    if (!video) return

    // React's `muted` JSX attribute is not reliably applied to the underlying
    // property on hydration in every browser — assert it directly, the same
    // fix already used on the showreel and the ripple canvas.
    video.muted = true

    const play = () => {
      if (!document.hidden) video.play().catch(() => {})
    }
    const pause = () => video.pause()

    // The same 0.02 threshold HeroIntroSequence uses to pause the cloud drift
    // once the hero itself scrolls offscreen — this stops for the same reason
    // the rest of the hero does, rather than inventing a second threshold.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? play() : pause()),
      { threshold: 0.02 }
    )
    io.observe(video)

    const onVisibility = () => (document.hidden ? pause() : play())
    document.addEventListener('visibilitychange', onVisibility)

    // A CSS transition does the smoothing here rather than a per-frame rAF
    // loop: unlike the WebGL canvas, a plain video's opacity has no reason to
    // track scroll position with per-frame precision, and the transition also
    // doubles as the mount fade-in for free.
    let written = -1
    const applyOpacity = (p: number) => {
      const t = clamp((p - FADE_IN) / (FADE_OUT - FADE_IN), 0, 1)
      const o = 1 - smoothstep(t)
      if (Math.abs(o - written) < 0.004) return
      written = o
      const text = o.toFixed(3)
      video.style.opacity = text
      if (fadeEl) fadeEl.style.opacity = text
    }
    applyOpacity(getHeroProgress())
    const unsubscribe = subscribeHeroProgress(applyOpacity)

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      unsubscribe()
      video.pause()
    }
  }, [reduced])

  if (reduced) {
    // No autoplay under reduced motion — a static frame instead, the same
    // rule the ripple follows by never mounting its canvas in this mode.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={POSTER}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  return (
    <>
      <video
        ref={videoRef}
        data-hero-video
        aria-hidden="true"
        muted
        loop
        playsInline
        preload="metadata"
        poster={POSTER}
        tabIndex={-1}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0, transition: 'opacity 260ms linear' }}
      >
        <source src={SRC} type="video/mp4" />
      </video>
      {/* Bottom blend to solid black. A plain CSS gradient is enough here —
          unlike the ripple's shader, this overlays real video pixels rather
          than a computed near-black ramp, so there is no banding to dither
          around. */}
      <div
        ref={fadeRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0,
          transition: 'opacity 260ms linear',
          background: `linear-gradient(to bottom, transparent ${FADE_START * 100}%, #020306 ${FADE_END * 100}%)`,
        }}
      />
    </>
  )
}
