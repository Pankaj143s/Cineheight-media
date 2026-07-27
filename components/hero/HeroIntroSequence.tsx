'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { setHeroProgress } from '@/lib/heroProgress'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

// hero-v4 — natural rounded clouds with true baked alpha (no screen-blend,
// no radial masks). v3 wisps (smoke-like, one with empty alpha) are retired.
const ASSETS = {
  back: '/generated/hero-v4/cloud-back-soft.webp',
  frontLeft: '/generated/hero-v4/cloud-front-left.webp',
  frontRight: '/generated/hero-v4/cloud-front-right.webp',
  traveller: '/generated/hero-v4/cloud-traveller.webp',
}

/**
 * A seamless two-copy marquee. Track width == `periodVw`, copy-2 sits exactly
 * one period away, so animating the track `xPercent` by ±100 (= one period)
 * lands copy-2 where copy-1 was — continuous drift, NO reversal, NO snap.
 * `reverse` drifts rightward. Scroll parallax animates the OUTER wrapper; this
 * inner track only animates xPercent, so transforms never collide.
 */
function Marquee({
  src,
  periodVw,
  cloudWidthVw,
  dur,
  phase,
  reverse = false,
}: {
  src: string
  periodVw: number
  cloudWidthVw: number
  dur: number
  phase: number
  reverse?: boolean
}) {
  return (
    <div
      data-marquee
      data-dur={dur}
      data-phase={phase}
      data-reverse={reverse ? 1 : 0}
      className="absolute top-0 h-full will-change-transform"
      style={{ left: 0, width: `${periodVw}vw` }}
    >
      {[0, 1].map((i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          draggable={false}
          className="absolute top-0"
          // NATURAL aspect (width-driven, height auto) — never stretched.
          style={{ left: `${(reverse ? -i : i) * periodVw}vw`, width: `${cloudWidthVw}vw`, height: 'auto' }}
        />
      ))}
    </div>
  )
}

/**
 * Unified pinned intro (spec Part A). Cloud system: a faint wide background
 * haze behind the word + two ASYMMETRIC natural front clouds crossing the lower
 * C-I-N / G-H-T + one small travelling cloud — all true-alpha WebPs composited
 * normally over #020306.
 *
 * The CINEHEIGHT → brand-statement handoff is one MASTER GSAP timeline driven by
 * named labels (opening / depthStart / heroExit / statementApproach /
 * statementReveal / navbarReveal / introSettled). Every element is tied to the
 * same labels — no independently-guessed per-element timing. All primary
 * transforms use `ease: 'none'` so scroll position maps predictably to visual
 * state; scrub ~1.15. The navbar subscribes to the same progress and reveals at
 * the `navbarReveal` fraction (0.68).
 */
export default function HeroIntroSequence() {
  const rootRef = useRef<HTMLElement>(null)
  const driftTweens = useRef<gsap.core.Tween[]>([])
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  // Pause drift when the hero is offscreen or the tab is hidden.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const setActive = (active: boolean) =>
      driftTweens.current.forEach((t) => (active ? t.play() : t.pause()))
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting && !document.hidden), { threshold: 0.02 })
    io.observe(root)
    const onVis = () => setActive(!document.hidden && root.getBoundingClientRect().bottom > 0)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced, mobile])

  // Continuous idle drift (marquees + one offscreen traversal).
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const q = self.selector!
      const tweens: gsap.core.Tween[] = []
      ;(q('[data-marquee]') as HTMLElement[]).forEach((el) => {
        const dur = Number(el.dataset.dur) || 90
        const rev = el.dataset.reverse === '1'
        const t = gsap.fromTo(el, { xPercent: 0 }, { xPercent: rev ? 100 : -100, duration: dur, ease: 'none', repeat: -1 })
        t.progress(Number(el.dataset.phase) || 0)
        tweens.push(t)
      })
      ;(q('[data-traverse]') as HTMLElement[]).forEach((el) => {
        const dur = Number(el.dataset.dur) || 72
        const vw = window.innerWidth
        gsap.set(el, { x: -0.32 * vw })
        const t = gsap.to(el, { x: 1.32 * vw, duration: dur, ease: 'none', repeat: -1 })
        t.progress(Number(el.dataset.phase) || 0)
        tweens.push(t)
      })
      driftTweens.current = tweens
    }, rootRef)
    return () => {
      driftTweens.current = []
      ctx.revert()
    }
  }, [reduced, mobile])

  // MASTER intro timeline — named labels, one shared progress.
  useLayoutEffect(() => {
    if (reduced) {
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
      const back = q('[data-layer="back"]')
      const fl = q('[data-layer="front-left"]')
      const fr = q('[data-layer="front-right"]')
      const trav = q('[data-layer="traveller"]')
      const blue = q('[data-layer="transition-light"]')
      const statement = q('[data-layer="statement"]')
      const stLines = q('[data-line-inner]')
      const stCopy = q('[data-layer="statement-copy"]')

      const vh = (n: number) => () => (window.innerHeight * n) / 100

      // ONE smooth, continuous, parallax-differentiated pass. Every position
      // tween runs `ease:'none'` over a LONG, OVERLAPPING window so the whole
      // hero reads as a single scroll-linked camera rise through the cloud
      // layer into the statement — no short "snap" tweens, no staged jumps.
      // Timeline duration is normalised to 1.0 → a position value is the scroll
      // fraction it fires at. Depth (parallax) = per-layer travel distance:
      // traveller (closest) moves most, then front clouds, then title, then the
      // background haze (slowest). Opacity crossfades gently, always AFTER the
      // layer has begun moving.
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.05,
          invalidateOnRefresh: true,
          onUpdate: (st) => setHeroProgress(st.progress),
        },
      })

      // Helper: a tween placed at position `from` that lasts until `to`
      // (positions/durations are scroll fractions of the 0→1 timeline).
      const spanDur = (from: number, to: number) => ({ duration: to - from })

      // ---- Parallax rise (all start together at 0.12, different distances) ----
      const rise = 0.12
      tl.fromTo(trav, { y: 0 }, { y: vh(-48), ...spanDur(rise, 0.85) }, rise) // fastest
        .fromTo(fl, { y: 0 }, { y: vh(-40), ...spanDur(rise, 0.9) }, rise)
        .fromTo(fr, { y: 0 }, { y: vh(-42), ...spanDur(rise, 0.9) }, rise)
        .fromTo(title, { y: 0, scale: 1 }, { y: vh(-30), scale: 1.06, ...spanDur(rise, 0.9) }, rise) // medium
        .fromTo(back, { y: 0 }, { y: vh(-8), ...spanDur(rise, 0.96) }, rise) // slowest

      // ---- Opacity crossfades (gentle, gradual — no abrupt fades) ----
      tl.to(trav, { autoAlpha: 0, ...spanDur(0.34, 0.56) }, 0.34)
        .to(title, { autoAlpha: 0, ...spanDur(0.44, 0.76) }, 0.44) // title fades slowly as it rises
        .to([...fl, ...fr], { autoAlpha: 0.08, ...spanDur(0.6, 0.84) }, 0.6) // become faint upper remnants
        .to(back, { autoAlpha: 0.4, ...spanDur(0.7, 0.92) }, 0.7) // haze lingers, dissolves last

      // ---- #0089FF transition illumination (≤0.10) bridging the two states.
      tl.fromTo(blue, { autoAlpha: 0 }, { autoAlpha: 0.1, ...spanDur(0.5, 0.7) }, 0.5)
        .to(blue, { autoAlpha: 0.05, ...spanDur(0.84, 1.0) }, 0.84)

      // ---- Statement rises from below and crossfades in as the title thins.
      tl.fromTo(statement, { y: vh(42), autoAlpha: 0 }, { y: 0, autoAlpha: 1, ...spanDur(0.44, 0.86) }, 0.44)
        .fromTo(stLines[0], { yPercent: 112 }, { yPercent: 0, ...spanDur(0.58, 0.74) }, 0.58)
        .fromTo(stLines[1], { yPercent: 112 }, { yPercent: 0, ...spanDur(0.62, 0.78) }, 0.62)
        .fromTo(stCopy, { autoAlpha: 0, y: vh(2.4) }, { autoAlpha: 1, y: 0, ...spanDur(0.7, 0.86) }, 0.7)

      // ---- 0.86→1.0: a barely-there continued upward drift so the lower edge
      // is ready for the showreel entrance — no dead pause.
      tl.to(statement, { y: vh(-2), ...spanDur(0.86, 1.0) }, 0.86)

      return () => tl.scrollTrigger?.kill()
    }, rootRef)

    return () => ctx.revert()
  }, [reduced, mobile])

  const sectionHeight = reduced ? 'auto' : mobile ? '185vh' : '230vh'

  return (
    <section ref={rootRef} aria-label="Cineheight Media introduction" style={{ height: sectionHeight }} className="relative">
      {/* Transparent stage (body bg is the same #020306) so the fixed
          background signal route shows through the hero's dark negative space. */}
      <div
        className={reduced ? 'relative h-screen overflow-hidden' : 'sticky top-0 h-screen overflow-hidden'}
      >
        {/* L1 — base atmosphere: faint navy depth + near-invisible blue title-base light */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 85% 50% at 50% 54%, rgba(9,12,20,0.9), transparent 74%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 42% 13% at 50% 57%, rgba(0,137,255,0.5), transparent 72%)', opacity: 0.07 }}
        />

        {/* L2 — soft background haze behind the word (barely noticeable) */}
        <div aria-hidden="true" className="absolute z-0" style={{ left: '18%', width: '64%', top: '52%', height: '12vh', opacity: mobile ? 0.1 : 0.12 }}>
          <div data-layer="back" className="absolute inset-0 h-full w-full will-change-transform">
            <Marquee src={ASSETS.back} periodVw={mobile ? 96 : 64} cloudWidthVw={mobile ? 96 : 64} dur={110} phase={0.3} />
          </div>
        </div>

        {/* L3 — CINEHEIGHT (live HTML, the page's only h1) */}
        <div
          data-layer="title"
          className="absolute inset-0 z-[1] flex items-center justify-center will-change-transform"
          style={{ transform: 'translateY(-1vh)' }}
        >
          <h1 className="m-0 text-center">
            <span aria-hidden="true" className="hero-title block" style={{ fontSize: 'clamp(64px, 18.6vw, 21.5rem)' }}>
              CINEHEIGHT
            </span>
            <span className="sr-only">Cineheight Media — Branding and Digital Growth Agency</span>
          </h1>
        </div>

        {/* L4 — front-left natural cloud IN FRONT of the title (z-3), over C-I-N */}
        <div
          data-layer="front-left"
          aria-hidden="true"
          className="absolute z-[3] will-change-transform"
          style={{ left: mobile ? '-10vw' : '-14vw', width: mobile ? '90vw' : '52vw', top: mobile ? '56%' : '53%', opacity: mobile ? 0.62 : 0.66 }}
        >
          <Marquee src={ASSETS.frontLeft} periodVw={mobile ? 90 : 52} cloudWidthVw={mobile ? 44 : 20} dur={78} phase={0.18} />
        </div>

        {/* L4 — front-right natural cloud (z-3), over G-H-T. Different form/height
            (distinct G4 cloud), drifts the OPPOSITE way. Desktop only. */}
        {!mobile && (
          <div
            data-layer="front-right"
            aria-hidden="true"
            className="absolute z-[3] will-change-transform"
            style={{ left: '62vw', width: '52vw', top: '54.5%', opacity: 0.62 }}
          >
            <Marquee src={ASSETS.frontRight} periodVw={52} cloudWidthVw={22} dur={90} phase={0.5} reverse />
          </div>
        )}

        {/* L5 — small travelling cloud (z-4), crosses selected middle letters */}
        <div
          data-layer="traveller"
          aria-hidden="true"
          className="absolute z-[4] will-change-transform"
          style={{ top: mobile ? '55%' : '54%', left: 0, width: '100%', opacity: mobile ? 0.34 : 0.4 }}
        >
          <div data-traverse data-dur={mobile ? 64 : 72} data-phase={0.42} className="absolute top-0 will-change-transform" style={{ width: mobile ? '24vw' : '12vw' }}>
            {/* natural aspect, no stretch */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.traveller} alt="" draggable={false} className="w-full" style={{ height: 'auto' }} />
          </div>
        </div>

        {/* Transition illumination — #0089FF, ≤0.10, scroll-controlled */}
        <div
          data-layer="transition-light"
          aria-hidden="true"
          className="absolute inset-0 z-[2]"
          style={{
            background: 'radial-gradient(ellipse 55% 34% at 50% 64%, rgba(0,137,255,0.5), transparent 74%)',
            opacity: 0,
            visibility: reduced ? 'hidden' : undefined,
          }}
        />

        {/* Brand statement — same stage, same master timeline. */}
        {!reduced && (
          <div
            data-layer="statement"
            className="absolute inset-0 z-[5] flex items-center will-change-transform"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
              <h2
                className="font-display m-0 font-bold text-text-100"
                style={{ fontSize: 'calc(clamp(2.1rem, 6vw, 6.4rem) * var(--display-scale))', lineHeight: 1.03, letterSpacing: '-0.015em' }}
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
              style={{ fontSize: 'calc(clamp(2.1rem, 6vw, 6.4rem) * var(--display-scale))', lineHeight: 1.03, letterSpacing: '-0.015em' }}
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
