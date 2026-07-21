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
          className="absolute top-0 h-full"
          style={{ left: `${(reverse ? -i : i) * periodVw}vw`, width: `${cloudWidthVw}vw` }}
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

      // Timeline duration is normalised to 1.0, so a label/position value is
      // literally the scroll fraction it fires at (scrub maps scroll 0→1 to
      // timeline 0→1). All positions below are those fractions.
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.0,
          invalidateOnRefresh: true,
          onUpdate: (st) => setHeroProgress(st.progress),
        },
      })

      tl.addLabel('opening', 0)
        .addLabel('depthStart', 0.16)
        .addLabel('heroExit', 0.42)
        .addLabel('statementApproach', 0.52)
        .addLabel('statementReveal', 0.62)
        .addLabel('navbarReveal', 0.68)
        .addLabel('introSettled', 0.84)

      // ---- Clouds: begin lifting at depthStart; foreground faster than back.
      // Movement first — opacity only reduces AFTER the clouds have moved.
      tl.fromTo(fl, { y: 0 }, { y: vh(-18), duration: 0.68 }, 'depthStart')
        .fromTo(fr, { y: 0 }, { y: vh(-20), duration: 0.68 }, 'depthStart')
        .fromTo(trav, { y: 0 }, { y: vh(-26), duration: 0.6 }, 'depthStart')
        .fromTo(back, { y: 0 }, { y: vh(-7), duration: 0.74 }, 'depthStart')
        // foreground clouds settle to faint upper-edge residuals after they rise
        .to([...fl, ...fr], { autoAlpha: 0.1, duration: 0.14 }, 0.72)
        .to(trav, { autoAlpha: 0, duration: 0.16 }, 0.58)
        // background haze stays visible longest, then dissolves
        .to(back, { autoAlpha: 0.35, duration: 0.24 }, 0.7)

      // ---- Title: slow rise (depthStart→heroExit); at ~0.60 it is at ~0.28
      // opacity, then CLEARS UPWARD hard and fades to 0 by ~0.70 so it has
      // visibly departed before the statement reveals — no competition.
      tl.fromTo(title, { y: 0, scale: 1 }, { y: vh(-4), scale: 1.03, duration: 0.26 }, 'depthStart')
        .to(title, { y: vh(-10), scale: 1.05, duration: 0.18 }, 'heroExit')
        .to(title, { autoAlpha: 0.28, duration: 0.18 }, 'heroExit')
        .to(title, { y: vh(-26), autoAlpha: 0, duration: 0.08 }, 0.6)

      // ---- #0089FF transition illumination (≤0.10) bridging the two states.
      tl.fromTo(blue, { autoAlpha: 0 }, { autoAlpha: 0.1, duration: 0.16 }, 0.5).to(blue, { autoAlpha: 0.05, duration: 0.14 }, 'introSettled')

      // ---- Statement: approaches from below while the title is still up and
      // dominant; reveals only after the title has visibly departed.
      tl.fromTo(statement, { y: vh(34), autoAlpha: 0 }, { y: vh(6), autoAlpha: 0.5, duration: 0.1 }, 'statementApproach')
        .to(statement, { y: 0, autoAlpha: 1, duration: 0.16 }, 'statementReveal')
        .fromTo(stLines[0], { yPercent: 112 }, { yPercent: 0, duration: 0.1 }, 'statementReveal')
        .fromTo(stLines[1], { yPercent: 112 }, { yPercent: 0, duration: 0.1 }, 0.665)
        .fromTo(stCopy, { autoAlpha: 0, y: vh(2.4) }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.72)

      // ---- 0.84→1.0: hold readable + a barely-there upward drift so there is
      // no dead pause and the lower edge is ready for the showreel entrance.
      tl.to(statement, { y: vh(-2), duration: 0.16 }, 'introSettled')
        .to(back, { autoAlpha: 0.18, duration: 0.16 }, 'introSettled')

      return () => tl.scrollTrigger?.kill()
    }, rootRef)

    return () => ctx.revert()
  }, [reduced, mobile])

  const sectionHeight = reduced ? 'auto' : mobile ? '185vh' : '230vh'

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
          style={{ background: 'radial-gradient(ellipse 85% 50% at 50% 54%, rgba(9,12,20,0.9), transparent 74%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 42% 13% at 50% 57%, rgba(0,137,255,0.5), transparent 72%)', opacity: 0.07 }}
        />

        {/* L2 — soft background haze behind the word (barely noticeable) */}
        <div aria-hidden="true" className="absolute z-0" style={{ left: '20%', width: '60%', top: '50%', height: '9vh', opacity: mobile ? 0.1 : 0.12 }}>
          <div data-layer="back" className="absolute inset-0 h-full w-full will-change-transform">
            <Marquee src={ASSETS.back} periodVw={mobile ? 90 : 60} cloudWidthVw={mobile ? 90 : 60} dur={110} phase={0.3} />
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
          style={{ left: mobile ? '-10vw' : '-14vw', width: mobile ? '90vw' : '54vw', top: mobile ? '52%' : '47%', height: mobile ? '11vh' : '11vh', opacity: mobile ? 0.42 : 0.46 }}
        >
          <Marquee src={ASSETS.frontLeft} periodVw={mobile ? 90 : 54} cloudWidthVw={mobile ? 46 : 21} dur={78} phase={0.18} />
        </div>

        {/* L4 — front-right natural cloud (z-3), over G-H-T. Different form/height
            (distinct G4 cloud), drifts the OPPOSITE way. Desktop only. */}
        {!mobile && (
          <div
            data-layer="front-right"
            aria-hidden="true"
            className="absolute z-[3] will-change-transform"
            style={{ left: '60vw', width: '56vw', top: '50%', height: '12.5vh', opacity: 0.42 }}
          >
            <Marquee src={ASSETS.frontRight} periodVw={56} cloudWidthVw={23} dur={90} phase={0.5} reverse />
          </div>
        )}

        {/* L5 — small travelling cloud (z-4), crosses selected middle letters */}
        <div
          data-layer="traveller"
          aria-hidden="true"
          className="absolute z-[4] will-change-transform"
          style={{ top: mobile ? '45%' : '43%', left: 0, width: '100%', height: mobile ? '9vh' : '10vh', opacity: mobile ? 0.2 : 0.24 }}
        >
          <div data-traverse data-dur={mobile ? 64 : 72} data-phase={0.42} className="absolute top-0 h-full will-change-transform" style={{ width: mobile ? '26vw' : '11vw' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.traveller} alt="" draggable={false} className="h-full w-full" />
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
