'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { setHeroProgress } from '@/lib/heroProgress'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

const ASSETS = {
  backVideo: '/generated/hero-v2/cloud-back-desktop.mp4',
  desktopPoster: '/generated/hero-v2/hero-cloud-desktop-poster.webp',
  mobilePoster: '/generated/hero-v2/hero-cloud-mobile-poster.webp',
  middle: '/generated/hero-v2/cloud-middle-desktop.webp',
  frontLeft: '/generated/hero-v2/cloud-front-left.webp',
  frontRight: '/generated/hero-v2/cloud-front-right.webp',
  wispAccent: '/generated/hero-v2/cloud-wisp-accent.webp',
}

/**
 * Hero — approved reference: monumental CINEHEIGHT (live Bebas Neue HTML),
 * white cloud banks crossing the lower letters from the left and right,
 * soft haze behind, near-black negative space everywhere else.
 *
 * Initial view (spec §10): title + clouds ONLY. The navbar reveals at
 * ~62% of hero progress (Navbar subscribes to lib/heroProgress).
 *
 * Scroll (spec §12): scrubbed timeline over ~210vh — cloud layers rise at
 * different speeds (front fastest), title drifts up, scales ≤1.10 and
 * fades late. Fully reversible. Mobile: shorter, simpler. Reduced motion:
 * static composition, no pin, no drift.
 */
export default function HeroSection() {
  const rootRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  // Pause the cloud loop whenever the hero is offscreen or the tab hidden.
  useLayoutEffect(() => {
    const video = videoRef.current
    if (!video) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !document.hidden) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.05 }
    )
    io.observe(video)

    const onVisibility = () => {
      if (document.hidden) video.pause()
      else if (video.getBoundingClientRect().bottom > 0) video.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced, mobile])

  useLayoutEffect(() => {
    if (reduced) {
      // Static hero — navbar becomes visible immediately past the fold.
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom top',
        onUpdate: (self) => setHeroProgress(self.progress),
      })
      return () => st.kill()
    }

    const ctx = gsap.context((self) => {
      const q = self.selector!
      const title = q('[data-hero="title"]')
      const back = q('[data-cloud="back"]')
      const middle = q('[data-cloud="middle"]')
      const frontL = q('[data-cloud="front-left"]')
      const frontR = q('[data-cloud="front-right"]')
      const wisp = q('[data-cloud="wisp"]')

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          onUpdate: (st) => setHeroProgress(st.progress),
        },
      })

      const vh = (n: number) => () => (window.innerHeight * n) / 100

      // 0–15%: hold — idle drift only. Timeline starts at 0.15.
      // 15–60%: depth separation — front rises fastest, back least. Front
      // banks fade WHILE crossing the letters so the pass-over stays a veil,
      // never a whiteout.
      tl.to(frontL, { y: vh(mobile ? -26 : -46), duration: 0.55 }, 0.15)
        .to(frontR, { y: vh(mobile ? -30 : -52), duration: 0.55 }, 0.15)
        .to(wisp, { y: vh(mobile ? -34 : -58), duration: 0.5 }, 0.15)
        .to(middle, { y: vh(mobile ? -14 : -24), duration: 0.75 }, 0.15)
        .to(back, { y: vh(mobile ? -8 : -14), duration: 0.85 }, 0.15)
        .to([frontL, frontR], { autoAlpha: 0, duration: 0.24 }, 0.38)
        .to(wisp, { autoAlpha: 0, duration: 0.2 }, 0.35)
        // Title: separates upward above the band; restrained scale (≤1.10).
        .to(title, { y: vh(-8), scale: mobile ? 1.03 : 1.04, duration: 0.3 }, 0.15)
        .to(title, { y: vh(-18), scale: mobile ? 1.05 : 1.08, duration: 0.23 }, 0.45)
        // 60–100%: atmosphere thins; title leaves cleanly by ~92%.
        .to(middle, { autoAlpha: 0.1, duration: 0.28 }, 0.5)
        .to(back, { autoAlpha: 0.22, duration: 0.3 }, 0.62)
        .to(title, { y: vh(-46), autoAlpha: 0, scale: mobile ? 1.06 : 1.1, duration: 0.24 }, 0.68)

      return () => tl.scrollTrigger?.kill()
    }, rootRef)

    return () => ctx.revert()
  }, [reduced, mobile])

  return (
    <section
      ref={rootRef}
      aria-label="Cineheight Media"
      className="relative"
      style={{ height: reduced ? '100vh' : mobile ? '160vh' : '210vh' }}
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-screen overflow-hidden"
        style={{ background: 'var(--bg-950)' }}
      >
        {/* Faint navy depth behind the composition — never a blue wash */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 55% at 50% 52%, rgba(10,14,24,0.85), transparent 75%)',
          }}
        />

        {/* BACK — cloud deck contained to a feathered band around the word's
            lower half (reference comp: black sky above AND below the band). */}
        <div
          data-cloud="back"
          aria-hidden="true"
          className="cloud-feather-band absolute will-change-transform"
          style={{ left: '-2%', width: '104%', top: '26%', height: '62%' }}
        >
          {mobile || reduced ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mobile ? ASSETS.mobilePoster : ASSETS.desktopPoster}
              alt=""
              className="cloud-screen absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <video
              ref={videoRef}
              className="cloud-screen absolute inset-0 h-full w-full object-cover"
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              poster={ASSETS.desktopPoster}
              aria-hidden="true"
              tabIndex={-1}
            >
              <source src={ASSETS.backVideo} type="video/mp4" />
            </video>
          )}
        </div>

        {/* MIDDLE — soft haze strip behind the word (image, slow drift) */}
        <div
          data-cloud="middle"
          aria-hidden="true"
          className="absolute will-change-transform"
          style={{ left: '8%', width: '84%', top: '40%', height: '34%', opacity: 0.38 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.middle}
            alt=""
            draggable={false}
            className="cloud-screen cloud-feather-box cloud-drift h-full w-full object-cover"
            style={
              {
                '--drift-duration': '72s',
                '--drift-from': '-1.6%',
                '--drift-to': '1.6%',
              } as React.CSSProperties
            }
          />
        </div>

        {/* TITLE — live HTML, one semantic h1 for the page */}
        <div
          data-hero="title"
          className="absolute inset-0 flex items-center justify-center will-change-transform"
          style={{ transform: 'translateY(-2vh)' }}
        >
          <h1 className="m-0 text-center">
            <span aria-hidden="true" className="hero-title block" style={{ fontSize: 'clamp(64px, 18.6vw, 21.5rem)' }}>
              CINEHEIGHT
            </span>
            <span className="sr-only">Cineheight Media — Branding and Digital Growth Agency</span>
          </h1>
        </div>

        {/* FRONT — two cloud banks crossing the lower letters (reference comp) */}
        <div
          data-cloud="front-left"
          aria-hidden="true"
          className="absolute will-change-transform"
          style={{ left: '-10%', top: '44%', width: mobile ? '86%' : '56%', height: '38%' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.frontLeft}
            alt=""
            draggable={false}
            className="cloud-screen cloud-feather-box cloud-drift h-full w-full object-cover"
            style={
              {
                '--drift-duration': '38s',
                '--drift-from': '-2.4%',
                '--drift-to': '2.4%',
              } as React.CSSProperties
            }
          />
        </div>
        {/* Fastest front accent — a single small wisp crossing upper letters */}
        <div
          data-cloud="wisp"
          aria-hidden="true"
          className="absolute will-change-transform"
          style={{ left: '16%', top: '32%', width: mobile ? '44%' : '24%', opacity: 0.55 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.wispAccent}
            alt=""
            draggable={false}
            className="cloud-screen cloud-feather-box cloud-drift w-full"
            style={
              {
                '--drift-duration': '30s',
                '--drift-from': '-4%',
                '--drift-to': '4%',
              } as React.CSSProperties
            }
          />
        </div>
        <div
          data-cloud="front-right"
          aria-hidden="true"
          className="absolute will-change-transform"
          style={{ right: '-11%', top: '47%', width: mobile ? '92%' : '62%', height: '40%' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.frontRight}
            alt=""
            draggable={false}
            className="cloud-screen cloud-feather-box cloud-drift h-full w-full object-cover"
            style={
              {
                '--drift-duration': '46s',
                '--drift-from': '2%',
                '--drift-to': '-2%',
              } as React.CSSProperties
            }
          />
        </div>
      </div>
    </section>
  )
}
