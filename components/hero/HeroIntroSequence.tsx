'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { setHeroProgress } from '@/lib/heroProgress'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

// hero-v3 — alpha-clean transparent wisps (no screen-blend, no radial masks).
const ASSETS = {
  ribbon: '/generated/hero-v3/cloud-ribbon-back.webp',
  wispLeft: '/generated/hero-v3/cloud-wisp-left.webp',
  wispRight: '/generated/hero-v3/cloud-wisp-right.webp',
  wispMoving: '/generated/hero-v3/cloud-wisp-moving.webp',
}

/**
 * A seamless two-copy marquee. The track width == `periodVw`, and copy-2 sits
 * exactly one period away, so animating the track `xPercent` by ±100 (= one
 * period) lands copy-2 where copy-1 was — continuous drift, NO reversal, NO
 * snap. `reverse` drifts rightward instead of leftward.
 * The scroll parallax animates the OUTER wrapper (x/y/scale); this inner track
 * only ever animates xPercent, so the two transforms never collide.
 */
function Marquee({
  src,
  periodVw,
  wispWidthVw,
  dur,
  phase,
  reverse = false,
}: {
  src: string
  periodVw: number
  wispWidthVw: number
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
          style={{ left: `${(reverse ? -i : i) * periodVw}vw`, width: `${wispWidthVw}vw` }}
        />
      ))}
    </div>
  )
}

/**
 * Unified pinned intro. Cloud system (spec: restrained transparent wisps):
 * a faint wide background ribbon behind the word, two ASYMMETRIC front wisps
 * crossing the lower C-I-N and G-H-T, and one small travelling centre wisp —
 * all TRUE-ALPHA WebPs composited normally over #020306 (no mix-blend screen,
 * no radial ellipse masks → no plates, pedestals or rectangles). Parallax is
 * one shared scrubbed timeline with reduced distances (ribbon −6vh, wisps
 * −17vh, moving −25vh, title −12vh, scale ≤1.05).
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

  // Continuous drift (idle + during scroll).
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
        const dur = Number(el.dataset.dur) || 66
        const vw = window.innerWidth
        gsap.set(el, { x: -0.3 * vw })
        const t = gsap.to(el, { x: 1.3 * vw, duration: dur, ease: 'none', repeat: -1 })
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

  // One-progress scroll choreography.
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
      const ribbon = q('[data-layer="ribbon"]')
      const wispL = q('[data-layer="wisp-left"]')
      const wispR = q('[data-layer="wisp-right"]')
      const wispM = q('[data-layer="wisp-moving"]')
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
          scrub: 1.25,
          invalidateOnRefresh: true,
          onUpdate: (st) => setHeroProgress(st.progress),
        },
      })

      // Reduced parallax for the smaller wisp system (spec §11). Movement
      // shares the 0.15→1 window (linear) so depth ratios hold at any progress.
      const S = { start: 0.15, dur: 0.85 }
      tl.to(ribbon, { y: vh(-6), scale: 1.01, duration: S.dur }, S.start)
        .to(wispL, { y: vh(mobile ? -12 : -17), x: vw(mobile ? 0 : -3), scale: 1.03, duration: S.dur }, S.start)
        .to(wispR, { y: vh(mobile ? -12 : -17), x: vw(mobile ? 0 : 3), scale: 1.03, duration: S.dur }, S.start)
        .to(wispM, { y: vh(mobile ? -18 : -25), scale: 1.04, duration: S.dur }, S.start)
        .to(title, { y: vh(mobile ? -9 : -12), scale: mobile ? 1.04 : 1.05, duration: S.dur }, S.start)

      // Opacity after movement (clouds must move before they fade).
      tl.to(title, { autoAlpha: 0, duration: 0.28 }, 0.58)
        .to(wispM, { autoAlpha: 0, duration: 0.18 }, 0.6)
        .to([...wispL, ...wispR], { autoAlpha: 0.1, duration: 0.18 }, 0.72)
        .to(ribbon, { autoAlpha: 0.4, duration: 0.3 }, 0.66)

      tl.to(blueLight, { autoAlpha: 0.1, duration: 0.17 }, 0.55).to(blueLight, { autoAlpha: 0.05, duration: 0.12 }, 0.88)

      tl.fromTo(statement, { y: vh(55), autoAlpha: 0, scale: 0.985 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.33 }, 0.55)
        .fromTo(stLines[0], { yPercent: 110 }, { yPercent: 0, duration: 0.12, ease: 'power2.out' }, 0.62)
        .fromTo(stLines[1], { yPercent: 110 }, { yPercent: 0, duration: 0.12, ease: 'power2.out' }, 0.66)
        .fromTo(stCopy, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.14, ease: 'power1.out' }, 0.74)

      return () => tl.scrollTrigger?.kill()
    }, rootRef)

    return () => ctx.revert()
  }, [reduced, mobile])

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
          style={{ background: 'radial-gradient(ellipse 85% 50% at 50% 54%, rgba(9,12,20,0.9), transparent 74%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 42% 13% at 50% 57%, rgba(0,137,255,0.5), transparent 72%)', opacity: 0.08 }}
        />

        {/* L2 — faint wide background ribbon (behind the word), drifting R→L.
            Outer div carries the static base opacity; the [data-layer] child is
            the scroll target; the Marquee inside it is the drift track. */}
        <div aria-hidden="true" className="absolute z-0" style={{ left: 0, width: '100%', top: '50%', height: '13vh', opacity: mobile ? 0.13 : 0.15 }}>
          <div data-layer="ribbon" className="absolute inset-0 h-full w-full will-change-transform">
            <Marquee src={ASSETS.ribbon} periodVw={62} wispWidthVw={62} dur={98} phase={0.2} />
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

        {/* L4 — front-left wisp IN FRONT of the title (z-3), over lower C-I-N.
            The [data-layer] wrapper is the positioned box AND the scroll target;
            the Marquee inside drifts. Stays in the left region. */}
        <div
          data-layer="wisp-left"
          aria-hidden="true"
          className="absolute z-[3] will-change-transform"
          style={{ left: mobile ? '-8vw' : '-16vw', width: mobile ? '86vw' : '58vw', top: mobile ? '52%' : '46%', height: '13vh' }}
        >
          <Marquee src={ASSETS.wispLeft} periodVw={mobile ? 86 : 58} wispWidthVw={mobile ? 42 : 22} dur={86} phase={0.15} />
        </div>

        {/* L4 — front-right wisp (z-3), over lower G-H-T. Asymmetric: flopped
            asset, different height/width/phase, drifts the OPPOSITE way. Desktop only. */}
        {!mobile && (
          <div
            data-layer="wisp-right"
            aria-hidden="true"
            className="absolute z-[3] will-change-transform"
            style={{ left: '58vw', width: '58vw', top: '50%', height: '14vh' }}
          >
            <Marquee src={ASSETS.wispRight} periodVw={58} wispWidthVw={24} dur={78} phase={0.55} reverse />
          </div>
        )}

        {/* L5 — small travelling centre wisp (z-4), crosses letters occasionally */}
        <div
          data-layer="wisp-moving"
          aria-hidden="true"
          className="absolute z-[4] will-change-transform"
          style={{ top: mobile ? '44%' : '41%', left: 0, width: '100%', height: '11vh', opacity: mobile ? 0.24 : 0.28 }}
        >
          <div data-traverse data-dur={mobile ? 60 : 66} data-phase={0.4} className="absolute top-0 h-full will-change-transform" style={{ width: mobile ? '30vw' : '12vw' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.wispMoving} alt="" draggable={false} className="h-full w-full" />
          </div>
        </div>

        {/* Transition illumination — #0089FF, ≤0.10, scroll-controlled */}
        <div
          data-layer="transition-light"
          aria-hidden="true"
          className="absolute inset-0 z-[2]"
          style={{
            background: 'radial-gradient(ellipse 55% 34% at 50% 66%, rgba(0,137,255,0.5), transparent 74%)',
            opacity: 0,
            visibility: reduced ? 'hidden' : undefined,
          }}
        />

        {/* Brand statement — same stage, same timeline. */}
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
