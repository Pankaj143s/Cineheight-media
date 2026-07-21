'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { setHeroProgress } from '@/lib/heroProgress'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

const ASSETS = {
  backVideo: '/generated/hero-v2/cloud-back-desktop.mp4',
  desktopPoster: '/generated/hero-v2/hero-cloud-desktop-poster.webp',
  groupLeft: '/generated/hero-v2/cloud-group-left.webp',
  groupRight: '/generated/hero-v2/cloud-group-right.webp',
  wisp1: '/generated/hero-v2/cloud-wisp-accent.webp',
  wisp2: '/generated/hero-v2/wisp-mid-2.webp',
  wisp3: '/generated/hero-v2/wisp-mid-1.webp',
}

/**
 * Unified pinned intro (spec §10–§12 of the correction brief):
 * hero title + restrained cloud accents + brand statement + navbar state in
 * ONE ScrollTrigger timeline. No `.brand-overlap` hacks — the statement is a
 * layer of the same stage and enters while the clouds are still rising.
 *
 * Composition target (reference): ~70–80% dark negative space, clouds cover
 * ≤12–20% of the word — a lower-left group (C-I-N), a lower-right group
 * (G-H-T), 1–2 faint centre wisps, subtle haze video behind. No cloud wall.
 *
 * Physics: one progress value; every movement tween runs linear over the
 * same 0.15→1 window so depth ratios hold at every scroll position.
 * Multipliers (base travel 60vh): haze 0.15 · groups 0.45 · wisps 0.75 ·
 * title 0.32 (scale ≤1.07). Drift is continuous and linear (GSAP wrap
 * traversal) — never `alternate` easing.
 */
export default function HeroIntroSequence() {
  const rootRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const driftTweens = useRef<gsap.core.Tween[]>([])
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  // --- Media + drift lifecycle: pause when offscreen or tab hidden -------
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const setActive = (active: boolean) => {
      const video = videoRef.current
      if (video) {
        if (active) video.play().catch(() => {})
        else video.pause()
      }
      driftTweens.current.forEach((t) => (active ? t.play() : t.pause()))
    }

    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting && !document.hidden),
      { threshold: 0.02 }
    )
    io.observe(root)

    const onVisibility = () =>
      setActive(!document.hidden && root.getBoundingClientRect().bottom > 0)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced, mobile])

  // --- Continuous linear drift (idle + during scroll) ---------------------
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const q = self.selector!
      const tweens: gsap.core.Tween[] = []

      // Traversal movers: enter fully offscreen on one side, exit the other,
      // then repeat — the loop jump happens outside the viewport.
      const mover = (sel: string, opts: { toRight: boolean; duration: number; phase: number }) => {
        const el = q(sel)[0] as HTMLElement | undefined
        if (!el) return
        const vw = window.innerWidth
        const from = opts.toRight ? -0.3 * vw : 1.3 * vw
        const to = opts.toRight ? 1.3 * vw : -0.3 * vw
        gsap.set(el, { x: from })
        const t = gsap.to(el, { x: to, duration: opts.duration, ease: 'none', repeat: -1 })
        t.progress(opts.phase)
        tweens.push(t)
      }

      mover('[data-drift="wisp-1"]', { toRight: true, duration: 55, phase: 0.35 })
      mover('[data-drift="wisp-2"]', { toRight: false, duration: 65, phase: 0.6 })
      if (!mobile) mover('[data-drift="wisp-3"]', { toRight: true, duration: 82, phase: 0.82 })

      // Anchored groups: ±2–4vw sine sway, opposite directions — at this
      // amplitude/speed the turnaround is imperceptible.
      const sway = (sel: string, vwAmp: number, duration: number) => {
        const el = q(sel)[0] as HTMLElement | undefined
        if (!el) return
        const t = gsap.fromTo(
          el,
          { x: () => -window.innerWidth * (vwAmp / 100) / 2 },
          {
            x: () => window.innerWidth * (vwAmp / 100) / 2,
            duration,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          }
        )
        tweens.push(t)
      }
      sway('[data-drift="group-left"]', 3, 84)
      sway('[data-drift="group-right"]', -2.6, 96)

      driftTweens.current = tweens
    }, rootRef)

    return () => {
      driftTweens.current = []
      ctx.revert()
    }
  }, [reduced, mobile])

  // --- One-progress scroll choreography -----------------------------------
  useLayoutEffect(() => {
    if (reduced) {
      // Static tier: no pin. Publish a coarse progress for the navbar only.
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom 60%',
        onUpdate: (s) => setHeroProgress(s.progress),
      })
      return () => st.kill()
    }

    const ctx = gsap.context((self) => {
      const q = self.selector!
      const title = q('[data-layer="title"]')
      const haze = q('[data-layer="haze"]')
      const groupL = q('[data-layer="group-left"]')
      const groupR = q('[data-layer="group-right"]')
      const wisps = q('[data-layer="wisp"]')
      const blueLight = q('[data-layer="transition-light"]')
      const statement = q('[data-layer="statement"]')
      const stLines = q('[data-line-inner]')
      const stCopy = q('[data-layer="statement-copy"]')

      const vh = (n: number) => () => (window.innerHeight * n) / 100
      const vw = (n: number) => () => (window.innerWidth * n) / 100

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.2,
          invalidateOnRefresh: true,
          onUpdate: (st) => setHeroProgress(st.progress),
        },
      })

      // Movement — every layer shares the 0.15→1 window (linear), so the
      // depth ratios (0.15 / 0.45 / 0.75 / title 0.32 of 60vh) hold at any
      // progress. 0–15% is the hold: idle drift only.
      const MOVE = { start: 0.15, dur: 0.85 }
      tl.to(haze, { y: vh(-9), scale: 1.01, duration: MOVE.dur }, MOVE.start)
        .to(groupL, { y: vh(-27), x: vw(mobile ? 0 : -8), scale: 1.025, duration: MOVE.dur }, MOVE.start)
        .to(groupR, { y: vh(-27), x: vw(mobile ? 0 : 8), scale: 1.025, duration: MOVE.dur }, MOVE.start)
        .to(wisps, { y: vh(mobile ? -30 : -45), scale: 1.04, duration: MOVE.dur }, MOVE.start)
        .to(title, { y: vh(mobile ? -14 : -19), scale: mobile ? 1.05 : 1.07, duration: MOVE.dur }, MOVE.start)

      // Opacity — movement first, fading later (§9: clouds must not fade
      // before they have physically moved).
      tl.to(title, { autoAlpha: 0, duration: 0.28 }, 0.58)
        .to(wisps, { autoAlpha: 0, duration: 0.18 }, 0.6)
        .to(haze, { autoAlpha: 0.12, duration: 0.28 }, 0.6)
        .to(groupL, { autoAlpha: 0.12, duration: 0.16 }, 0.72)
        .to(groupR, { autoAlpha: 0.14, duration: 0.16 }, 0.72)

      // Faint #0089FF transition illumination (≤0.10) during the handoff.
      tl.to(blueLight, { autoAlpha: 0.1, duration: 0.17 }, 0.55).to(
        blueLight,
        { autoAlpha: 0.05, duration: 0.12 },
        0.88
      )

      // Brand statement — enters from below while clouds still rise.
      tl.fromTo(
        statement,
        { y: vh(55), autoAlpha: 0, scale: 0.985 },
        { y: 0, autoAlpha: 1, scale: 1, duration: 0.33 },
        0.55
      )
        .fromTo(stLines[0], { yPercent: 110 }, { yPercent: 0, duration: 0.12, ease: 'power2.out' }, 0.62)
        .fromTo(stLines[1], { yPercent: 110 }, { yPercent: 0, duration: 0.12, ease: 'power2.out' }, 0.66)
        .fromTo(stCopy, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.14, ease: 'power1.out' }, 0.74)

      return () => tl.scrollTrigger?.kill()
    }, rootRef)

    return () => ctx.revert()
  }, [reduced, mobile])

  // ------------------------------------------------------------------ JSX
  const sectionHeight = reduced ? 'auto' : mobile ? '175vh' : '220vh'

  return (
    <section ref={rootRef} aria-label="Cineheight Media introduction" style={{ height: sectionHeight }} className="relative">
      <div
        className={reduced ? 'relative h-screen overflow-hidden' : 'sticky top-0 h-screen overflow-hidden'}
        style={{ background: 'var(--bg-950)' }}
      >
        {/* L1 — base atmosphere: faint navy depth + near-invisible blue title-base light */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 85% 50% at 50% 54%, rgba(9,12,20,0.9), transparent 74%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 42% 13% at 50% 57%, rgba(0,137,255,0.55), transparent 72%)',
            opacity: 0.09,
          }}
        />

        {/* L2 — subtle haze: cloud video (desktop) / nothing heavy on mobile */}
        <div
          data-layer="haze"
          aria-hidden="true"
          className="mask-haze absolute will-change-transform"
          style={
            mobile
              ? { left: '-4%', width: '108%', top: '47%', height: '26%', opacity: 0.16 }
              : { left: '15%', width: '70%', top: '47%', height: '24%', opacity: 0.18 }
          }
        >
          {mobile || reduced ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ASSETS.desktopPoster}
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

        {/* L3 — CINEHEIGHT (live HTML, the page's only h1) */}
        <div
          data-layer="title"
          className="absolute inset-0 flex items-center justify-center will-change-transform"
          style={{ transform: 'translateY(-1vh)' }}
        >
          <h1 className="m-0 text-center">
            <span aria-hidden="true" className="hero-title block" style={{ fontSize: 'clamp(64px, 18.6vw, 21.5rem)' }}>
              CINEHEIGHT
            </span>
            <span className="sr-only">Cineheight Media — Branding and Digital Growth Agency</span>
          </h1>
        </div>

        {/* L4 — anchored cloud groups (lower-left over C-I-N, lower-right over G-H-T) */}
        {!mobile && (
          <div
            data-layer="group-left"
            aria-hidden="true"
            className="absolute will-change-transform"
            style={{ left: 'max(-3vw, calc(50% - 1045px))', top: '45%', width: 'min(40vw, 620px)', aspectRatio: '900 / 509' }}
          >
            <div data-drift="group-left" className="h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ASSETS.groupLeft}
                alt=""
                draggable={false}
                className="cloud-screen mask-group-left h-full w-full"
              />
            </div>
          </div>
        )}
        <div
          data-layer="group-right"
          aria-hidden="true"
          className="absolute will-change-transform"
          style={
            mobile
              ? { left: '12%', top: '51%', width: 'min(78vw, 330px)', aspectRatio: '940 / 529', opacity: 0.85 }
              : { right: 'max(-5vw, calc(50% - 1080px))', top: '44%', width: 'min(46vw, 700px)', aspectRatio: '940 / 529' }
          }
        >
          <div data-drift="group-right" className="h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.groupRight}
              alt=""
              draggable={false}
              className={`cloud-screen h-full w-full ${mobile ? 'mask-center-soft' : 'mask-group-right'}`}
            />
          </div>
        </div>

        {/* L5 — moving foreground wisps (continuous linear traversal) */}
        <div data-layer="wisp" aria-hidden="true" className="absolute will-change-transform" style={{ top: '41%', left: 0, width: '100%', height: '12%' }}>
          <div data-drift="wisp-1" className="absolute" style={{ width: mobile ? '34vw' : 'min(14vw, 260px)', opacity: 0.38 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.wisp1} alt="" draggable={false} className="cloud-screen mask-center-soft w-full" />
          </div>
        </div>
        <div data-layer="wisp" aria-hidden="true" className="absolute will-change-transform" style={{ top: '53%', left: 0, width: '100%', height: '10%' }}>
          <div data-drift="wisp-2" className="absolute" style={{ width: mobile ? '26vw' : 'min(10vw, 190px)', opacity: 0.28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.wisp2} alt="" draggable={false} className="cloud-screen mask-center-soft w-full" />
          </div>
        </div>
        {!mobile && (
          <div data-layer="wisp" aria-hidden="true" className="absolute will-change-transform" style={{ top: '34%', left: 0, width: '100%', height: '8%' }}>
            <div data-drift="wisp-3" className="absolute" style={{ width: 'min(8vw, 150px)', opacity: 0.24 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ASSETS.wisp3} alt="" draggable={false} className="cloud-screen mask-center-soft w-full" />
            </div>
          </div>
        )}

        {/* Transition illumination — #0089FF, ≤0.10, scroll-controlled */}
        <div
          data-layer="transition-light"
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 55% 34% at 50% 66%, rgba(0,137,255,0.5), transparent 74%)',
            opacity: 0,
            visibility: reduced ? 'hidden' : undefined,
          }}
        />

        {/* Brand statement — same stage, same timeline (spec §12).
            Reduced motion renders it below the stage instead. */}
        {!reduced && (
          <div
            data-layer="statement"
            className="absolute inset-0 flex items-center will-change-transform"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
              <h2
                className="font-display m-0 font-bold text-text-100"
                style={{ fontSize: 'clamp(2.1rem, 6vw, 6.4rem)', lineHeight: 1.03, letterSpacing: '-0.015em' }}
              >
                <span className="block overflow-hidden">
                  <span data-line-inner className="block">
                    WE TURN BUSINESSES
                  </span>
                </span>
                <span className="block overflow-hidden">
                  <span data-line-inner className="block">
                    INTO <span style={{ color: 'var(--blue-500)' }}>BRANDS.</span>
                  </span>
                </span>
              </h2>
              <p
                data-layer="statement-copy"
                className="font-body mt-8 max-w-xl text-base text-text-300 sm:text-lg"
                style={{ lineHeight: 1.7 }}
              >
                Strategy, design, content and campaigns built to grow visibility, trust and leads.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reduced motion: statement rendered statically below the hero frame */}
      {reduced && (
        <div className="relative flex min-h-[70vh] items-center">
          <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
            <h2
              className="font-display m-0 font-bold text-text-100"
              style={{ fontSize: 'clamp(2.1rem, 6vw, 6.4rem)', lineHeight: 1.03, letterSpacing: '-0.015em' }}
            >
              WE TURN BUSINESSES
              <br />
              INTO <span style={{ color: 'var(--blue-500)' }}>BRANDS.</span>
            </h2>
            <p className="font-body mt-8 max-w-xl text-base text-text-300 sm:text-lg" style={{ lineHeight: 1.7 }}>
              Strategy, design, content and campaigns built to grow visibility, trust and leads.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
