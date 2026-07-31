'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { setHeroProgress } from '@/lib/heroProgress'
import { useIsMobileTier, useMotionCapabilityProfile, useReducedMotion } from '@/lib/useMediaPreferences'
import { useRippleTier } from '@/lib/useRippleTier'
import { LIQUID_MEDIA_PROTO } from '@/lib/liquidMedia/config'
import { setSignalIntensity } from '@/lib/liquidMedia/signalIntensity'
import HeroWordmarkRefraction from './HeroWordmarkRefraction'

const HeroRippleBackground = dynamic(() => import('./HeroRippleBackground'), { ssr: false })

/** hero-v4 true-alpha WebPs — dark-graded, repaired borders. */
const ASSETS = {
  back: '/generated/hero-v4/cloud-back-soft.webp',
  frontLeft: '/generated/hero-v4/cloud-front-left.webp',
  frontRight: '/generated/hero-v4/cloud-front-right.webp',
  traveller: '/generated/hero-v4/cloud-traveller.webp',
  hazeBand: '/generated/hero-v4/cloud-haze-band.webp',
  puffAccent: '/generated/hero-v4/cloud-puff-accent.webp',
}

/** Static cloud plate — natural aspect, never stretched, no autonomous motion. */
function CloudPlate({
  src,
  className = '',
  style,
}: {
  src: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      decoding="async"
      className={`pointer-events-none select-none ${className}`.trim()}
      style={{ height: 'auto', ...style }}
    />
  )
}

/**
 * Layered stationary cloud hero.
 *
 * Stack (bottom → top): atmosphere + ripple → distant clouds → midground →
 * CINEHEIGHT (+ refraction) → foreground bank → statement.
 * Clouds are still at rest; only restrained scroll parallax moves them.
 * Continuous marquees / traversals are intentionally removed.
 */
export default function HeroIntroSequence() {
  const rootRef = useRef<HTMLElement>(null)
  const wordmarkRef = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rippleTier = useRippleTier()
  const profile = useMotionCapabilityProfile()

  const [waveProgress, setWaveProgress] = useState(0)
  const [waveAmount, setWaveAmount] = useState(0)
  const [overlayOpacity, setOverlayOpacity] = useState(0)
  const [htmlWordmarkOpacity, setHtmlWordmarkOpacity] = useState(1)
  const [prefsReady, setPrefsReady] = useState(false)
  const resolveOnceRef = useRef(false)
  const failOpenTimerRef = useRef(0)

  useLayoutEffect(() => {
    let alive = true
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (alive) setPrefsReady(true)
      })
    })
    return () => {
      alive = false
      cancelAnimationFrame(id)
    }
  }, [])

  const signatureDesktop =
    LIQUID_MEDIA_PROTO.enabled && prefsReady && !reduced && !mobile && profile.level !== 'static'

  const allowParallax = !reduced && profile.level !== 'static'

  const revealHtmlWordmark = () => {
    setHtmlWordmarkOpacity(1)
    setOverlayOpacity(0)
    setWaveAmount(0)
    setWaveProgress(1)
  }

  // Title-sequence resolve — HTML is source of truth; never leave both layers invisible.
  useLayoutEffect(() => {
    if (!prefsReady) return

    if (reduced || !LIQUID_MEDIA_PROTO.enabled) {
      revealHtmlWordmark()
      return
    }

    if (mobile || profile.level === 'static') {
      const el = wordmarkRef.current
      revealHtmlWordmark()
      if (!el) return
      const tween = gsap.fromTo(
        el,
        { clipPath: 'inset(0 72% 0 0)', filter: 'blur(4px)' },
        { clipPath: 'inset(0 0% 0 0)', filter: 'blur(0px)', duration: 0.85, ease: 'power2.out', delay: 0.12 }
      )
      return () => {
        tween.kill()
        revealHtmlWordmark()
        gsap.set(el, { clearProps: 'clipPath,filter' })
      }
    }

    if (resolveOnceRef.current) {
      revealHtmlWordmark()
      return
    }

    setWaveProgress(0)
    setWaveAmount(1)
    setOverlayOpacity(1)
    setHtmlWordmarkOpacity(0.28)

    const state = { progress: 0, amount: 1, overlay: 1, html: 0.28 }
    let finished = false

    const finishSharp = () => {
      if (finished) return
      finished = true
      resolveOnceRef.current = true
      revealHtmlWordmark()
      window.clearTimeout(failOpenTimerRef.current)
    }

    failOpenTimerRef.current = window.setTimeout(finishSharp, 2800)

    const tl = gsap.timeline({
      delay: 0.18,
      onUpdate: () => {
        setWaveProgress(state.progress)
        setWaveAmount(state.amount)
        setOverlayOpacity(state.overlay)
        setHtmlWordmarkOpacity(Math.max(0.25, state.html))
      },
      onComplete: finishSharp,
    })

    tl.to(state, { progress: 1, duration: 1.28, ease: 'power2.inOut' }, 0)
      .to(state, { amount: 0, html: 1, duration: 0.62, ease: 'power2.out' }, 1.05)
      .to(state, { overlay: 0, duration: 0.32, ease: 'power1.out' }, 1.55)

    return () => {
      tl.kill()
      window.clearTimeout(failOpenTimerRef.current)
      if (!finished) revealHtmlWordmark()
    }
  }, [prefsReady, reduced, mobile, profile.level])

  useLayoutEffect(() => {
    const onVis = () => {
      if (document.hidden) return
      if (htmlWordmarkOpacity < 0.5 && overlayOpacity < 0.15) revealHtmlWordmark()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pageshow', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pageshow', onVis)
    }
  }, [htmlWordmarkOpacity, overlayOpacity])

  // MASTER scroll timeline — restrained depth parallax + statement handoff.
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
      const distant = q('[data-layer="distant"]')
      const mid = q('[data-layer="mid"]')
      const fore = q('[data-layer="fore"]')
      const blend = q('[data-layer="hero-blend"]')
      const blue = q('[data-layer="transition-light"]')
      const statement = q('[data-layer="statement"]')
      const stLines = q('[data-line-inner]')
      const stCopy = q('[data-layer="statement-copy"]')

      const vh = (n: number) => () => (window.innerHeight * n) / 100
      const has = (els: ArrayLike<Element> | null | undefined) => (els?.length ?? 0) > 0
      const spanDur = (from: number, to: number) => ({ duration: to - from })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.05,
          invalidateOnRefresh: true,
          onUpdate: (st) => {
            setHeroProgress(st.progress)
            if (LIQUID_MEDIA_PROTO.enabled) {
              const p = st.progress
              let cue = 0
              if (p > 0.62 && p < 0.92) cue = Math.sin(((p - 0.62) / 0.3) * Math.PI) * 0.55
              setSignalIntensity(cue)
            }
          },
        },
      })

      // Differentiated parallax — subtle, not travel. Distances: distant ≪ mid ≪ fore.
      // RM / capability-static path skips spatial tweens entirely.
      if (allowParallax) {
        const rise = 0.1
        if (has(distant)) tl.fromTo(distant, { y: 0 }, { y: vh(mobile ? -1.2 : -1.8), ...spanDur(rise, 0.95) }, rise)
        if (has(mid)) tl.fromTo(mid, { y: 0 }, { y: vh(mobile ? -2.8 : -4.2), ...spanDur(rise, 0.92) }, rise)
        if (has(fore)) {
          tl.fromTo(
            fore,
            { y: 0, scale: 1 },
            { y: vh(mobile ? -4.5 : -8), scale: mobile ? 1.01 : 1.025, ...spanDur(rise, 0.9) },
            rise
          )
        }
        if (has(title)) {
          tl.fromTo(
            title,
            { y: 0, scale: 1 },
            { y: vh(mobile ? -12 : -22), scale: 1.04, ...spanDur(rise, 0.88) },
            rise
          )
        }
      } else if (has(title)) {
        // Capability-static but motion allowed: title exits gently without cloud travel.
        tl.fromTo(title, { y: 0, autoAlpha: 1 }, { y: vh(-18), autoAlpha: 0, ...spanDur(0.35, 0.72) }, 0.35)
      }

      // Wordmark clears for statement; clouds soften into the dark canvas (not a hard cut).
      if (has(title) && allowParallax) tl.to(title, { autoAlpha: 0, ...spanDur(0.42, 0.72) }, 0.42)
      // Clear foreground before statement peak so type is never buried in the bank.
      if (has(fore)) tl.to(fore, { autoAlpha: 0.04, ...spanDur(0.46, 0.76) }, 0.46)
      if (has(mid)) tl.to(mid, { autoAlpha: 0.16, ...spanDur(0.5, 0.84) }, 0.5)
      if (has(distant)) tl.to(distant, { autoAlpha: 0.12, ...spanDur(0.55, 0.9) }, 0.55)
      if (has(blend)) tl.fromTo(blend, { autoAlpha: 0.35 }, { autoAlpha: 0.98, ...spanDur(0.5, 0.96) }, 0.5)

      if (has(blue)) {
        tl.fromTo(blue, { autoAlpha: 0 }, { autoAlpha: 0.1, ...spanDur(0.5, 0.7) }, 0.5).to(
          blue,
          { autoAlpha: 0.04, ...spanDur(0.84, 1.0) },
          0.84
        )
      }

      if (has(statement)) {
        tl.fromTo(
          statement,
          { y: vh(28), autoAlpha: 0, filter: 'blur(6px)' },
          { y: 0, autoAlpha: 1, filter: 'blur(0px)', ...spanDur(0.44, 0.82) },
          0.44
        )
        if (stLines[0]) {
          tl.fromTo(
            stLines[0],
            { clipPath: 'inset(0 100% 0 0)', yPercent: 18 },
            { clipPath: 'inset(0 0% 0 0)', yPercent: 0, ...spanDur(0.56, 0.74) },
            0.56
          )
        }
        if (stLines[1]) {
          tl.fromTo(
            stLines[1],
            { clipPath: 'inset(0 100% 0 0)', yPercent: 18 },
            { clipPath: 'inset(0 0% 0 0)', yPercent: 0, ...spanDur(0.6, 0.78) },
            0.6
          )
        }
        if (has(stCopy)) {
          tl.fromTo(stCopy, { autoAlpha: 0, y: vh(2.4) }, { autoAlpha: 1, y: 0, ...spanDur(0.7, 0.86) }, 0.7)
        }
        tl.to(statement, { y: vh(-1.2), ...spanDur(0.9, 1.0) }, 0.9)
      }

      return () => {
        tl.scrollTrigger?.kill()
        if (LIQUID_MEDIA_PROTO.enabled) setSignalIntensity(0)
      }
    }, rootRef)

    return () => ctx.revert()
  }, [reduced, mobile, allowParallax])

  // Sticky budget: statement settles ~0.90; short hold into showreel.
  const sectionHeight = reduced ? 'auto' : mobile ? '142vh' : '165vh'

  return (
    <section ref={rootRef} aria-label="Cineheight Media introduction" style={{ height: sectionHeight }} className="relative">
      <div className={reduced ? 'relative h-screen overflow-hidden' : 'sticky top-0 h-screen overflow-hidden'}>
        {/* Atmosphere */}
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

        {/*
          Stack (isolation: isolate on .layer-content):
            base  atmosphere + ripple
            z-0   distant clouds (behind wordmark)
            z-1   midground clouds
            z-2   CINEHEIGHT + refraction
            z-3   transition light
            z-4   foreground cloud bank (occludes lower letters)
            z-5   hero→showreel dark blend
            z-6   brand statement
        */}
        {rippleTier && <HeroRippleBackground tier={rippleTier} />}

        {/* L1 — Distant atmosphere: large, soft, behind the wordmark */}
        <div
          data-layer="distant"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-0"
          style={{
            bottom: mobile ? '-4%' : '-6%',
            height: mobile ? '48%' : '58%',
            opacity: mobile ? 0.28 : 0.34,
            filter: 'blur(1.5px)',
          }}
        >
          <CloudPlate
            src={ASSETS.back}
            className="absolute"
            style={{ left: mobile ? '-18%' : '-12%', bottom: '8%', width: mobile ? '90%' : '72%' }}
          />
          {!mobile && (
            <CloudPlate
              src={ASSETS.hazeBand}
              className="absolute"
              style={{ right: '-8%', bottom: '18%', width: '78%', opacity: 0.85 }}
            />
          )}
          {!mobile && (
            <CloudPlate
              src={ASSETS.back}
              className="absolute"
              style={{ left: '38%', bottom: '-4%', width: '70%', transform: 'scaleX(-1)', opacity: 0.7 }}
            />
          )}
        </div>

        {/* L2 — Midground: surrounds lower wordmark region, still behind type */}
        <div
          data-layer="mid"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-[1]"
          style={{
            bottom: mobile ? '2%' : '0%',
            height: mobile ? '42%' : '48%',
            opacity: 0.88,
            filter: 'brightness(0.82) contrast(1.05)',
          }}
        >
          <CloudPlate
            src={ASSETS.frontLeft}
            className="absolute"
            style={{
              left: mobile ? '-22%' : '-18%',
              bottom: mobile ? '6%' : '10%',
              width: mobile ? '78%' : '58%',
              filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))',
            }}
          />
          {!mobile && (
            <CloudPlate
              src={ASSETS.frontRight}
              className="absolute"
              style={{
                right: '-14%',
                bottom: '8%',
                width: '56%',
                filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))',
              }}
            />
          )}
          {!mobile && (
            <CloudPlate
              src={ASSETS.puffAccent}
              className="absolute"
              style={{ left: '28%', bottom: '22%', width: '38%', opacity: 0.9 }}
            />
          )}
          {mobile && (
            <CloudPlate
              src={ASSETS.traveller}
              className="absolute"
              style={{ right: '-8%', bottom: '18%', width: '48%', opacity: 0.75 }}
            />
          )}
        </div>

        {/* L3 — CINEHEIGHT (semantic HTML + optional refraction overlay) */}
        <div
          data-layer="title"
          className="absolute inset-0 z-[2] flex items-center justify-center"
          style={{ transform: 'translateY(-2vh)' }}
        >
          <h1 className="m-0 text-center">
            <span
              ref={wordmarkRef}
              aria-hidden="true"
              className="hero-title block"
              style={{
                fontSize: 'clamp(64px, 18.6vw, 21.5rem)',
                opacity: htmlWordmarkOpacity,
              }}
            >
              CINEHEIGHT
            </span>
            <span className="sr-only">Cineheight Media — Branding and Digital Growth Agency</span>
          </h1>
          {signatureDesktop && (
            <HeroWordmarkRefraction
              sourceRef={wordmarkRef}
              active={signatureDesktop}
              progress={waveProgress}
              amount={waveAmount}
              overlayOpacity={overlayOpacity}
            />
          )}
        </div>

        {/* L4 — Foreground bank: fills bottom, occludes lower ~15–22% of letters (desktop) */}
        <div
          data-layer="fore"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[4]"
          style={{
            height: mobile ? '34%' : '42%',
            opacity: 1,
            filter: 'brightness(0.78) contrast(1.06) saturate(0.92)',
          }}
        >
          <CloudPlate
            src={ASSETS.frontLeft}
            className="absolute"
            style={{
              left: mobile ? '-28%' : '-22%',
              bottom: mobile ? '-8%' : '-12%',
              width: mobile ? '95%' : '78%',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.45))',
            }}
          />
          <CloudPlate
            src={ASSETS.frontRight}
            className="absolute"
            style={{
              right: mobile ? '-24%' : '-18%',
              bottom: mobile ? '-10%' : '-14%',
              width: mobile ? '88%' : '72%',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.45))',
            }}
          />
          {!mobile && (
            <CloudPlate
              src={ASSETS.traveller}
              className="absolute"
              style={{
                left: '32%',
                bottom: '4%',
                width: '36%',
                opacity: 0.92,
                filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
              }}
            />
          )}
          {/* Soft blue rim light on the foreground bank — restrained */}
          <div
            className="absolute inset-x-0 bottom-0 h-[40%]"
            style={{
              background: 'linear-gradient(to top, rgba(0,137,255,0.06), transparent 70%)',
              mixBlendMode: 'soft-light',
              opacity: 0.55,
            }}
          />
        </div>

        {/* Transition illumination */}
        <div
          data-layer="transition-light"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3]"
          style={{
            background: 'radial-gradient(ellipse 55% 34% at 50% 64%, rgba(0,137,255,0.5), transparent 74%)',
            opacity: 0,
            visibility: reduced ? 'hidden' : undefined,
          }}
        />

        {/* Hero → next-section dark blend — dissolves clouds into #020306 */}
        <div
          data-layer="hero-blend"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[5]"
          style={{
            height: '42%',
            opacity: 0.35,
            background:
              'linear-gradient(to top, #020306 8%, rgba(2,3,6,0.92) 28%, rgba(2,3,6,0.45) 62%, transparent 100%)',
          }}
        />

        {/* Brand statement */}
        {!reduced && (
          <div
            data-layer="statement"
            className="absolute inset-0 z-[6] flex items-center"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
              <h2
                className="font-display m-0 font-bold text-text-100"
                style={{
                  fontSize: 'calc(clamp(2.1rem, 6vw, 6.4rem) * var(--display-scale))',
                  lineHeight: 1.03,
                  letterSpacing: '-0.015em',
                }}
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

      {reduced && (
        <div className="relative flex min-h-[70vh] items-center">
          <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
            <h2
              className="font-display m-0 font-bold text-text-100"
              style={{
                fontSize: 'calc(clamp(2.1rem, 6vw, 6.4rem) * var(--display-scale))',
                lineHeight: 1.03,
                letterSpacing: '-0.015em',
              }}
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
