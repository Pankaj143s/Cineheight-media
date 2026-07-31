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

// Client-only, matching the FlowDirector dynamic-import pattern used
// elsewhere so a reduced-motion visitor never downloads the chunk at all.
const HeroRippleBackground = dynamic(() => import('./HeroRippleBackground'), { ssr: false })

// hero-v4 — natural rounded clouds with true baked alpha (no screen-blend,
// no radial masks). v3 wisps (smoke-like, one with empty alpha) are retired.
const ASSETS = {
  back: '/generated/hero-v4/cloud-back-soft.webp',
  frontLeft: '/generated/hero-v4/cloud-front-left.webp',
  frontRight: '/generated/hero-v4/cloud-front-right.webp',
  traveller: '/generated/hero-v4/cloud-traveller.webp',
  // Two stock clouds (checker-alpha recovered, see scripts/process-hero-clouds.mjs),
  // added as extra depth layers in the SAME hero-v4 system — desktop only, same
  // rule as front-right (mobile stays limited to one front cloud + traveller).
  hazeBand: '/generated/hero-v4/cloud-haze-band.webp',
  puffAccent: '/generated/hero-v4/cloud-puff-accent.webp',
}

/**
 * A seamless two-copy marquee. Track width == `periodVw`, copy-2 sits exactly
 * one period away, so animating the track `xPercent` by ±100 (= one period)
 * lands copy-2 where copy-1 was — continuous drift, NO reversal, NO snap.
 * `reverse` drifts rightward. Scroll parallax animates the OUTER wrapper; this
 * inner track only animates xPercent, so transforms never collide.
 *
 * Set `cloudWidthVw` GREATER than `periodVw` for a layer whose asset feathers to
 * alpha 0 at its own edges (the two hazes). Tiled at exactly one period the two
 * copies sit edge-to-edge, so the pair of transparent edges reads as a thinning
 * band sweeping through the layer; the excess width makes them cross-fade
 * instead. Two copies still cover the track at every offset — the overlap means
 * a gap can never open (a third copy would only add a wasted decode).
 *
 * A cloud NARROWER than the period is the opposite case, and intentional: the
 * gap is the empty sky a single cloud drifts across.
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
  const wordmarkRef = useRef<HTMLSpanElement>(null)
  const driftTweens = useRef<gsap.core.Tween[]>([])
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rippleTier = useRippleTier()
  const profile = useMotionCapabilityProfile()

  const [waveProgress, setWaveProgress] = useState(0)
  const [waveAmount, setWaveAmount] = useState(0)
  const [overlayOpacity, setOverlayOpacity] = useState(0)
  /** HTML wordmark stays readable by default — canvas is enhancement only. */
  const [htmlWordmarkOpacity, setHtmlWordmarkOpacity] = useState(1)
  const [prefsReady, setPrefsReady] = useState(false)
  const resolveOnceRef = useRef(false)
  const failOpenTimerRef = useRef(0)

  // Wait until after media-preference effects have applied (leave SSR/'static' defaults).
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

  const revealHtmlWordmark = () => {
    setHtmlWordmarkOpacity(1)
    setOverlayOpacity(0)
    setWaveAmount(0)
    setWaveProgress(1)
  }

  // Title-sequence resolve. HTML is source of truth; never leave both layers invisible.
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

    // Strict-mode remount after a finished resolve: stay sharp.
    if (resolveOnceRef.current) {
      revealHtmlWordmark()
      return
    }

    setWaveProgress(0)
    setWaveAmount(1)
    setOverlayOpacity(1)
    // Keep HTML faintly present until handoff (fail-open if canvas stalls).
    // Stay low enough that the refraction overlay owns the read during the sweep.
    setHtmlWordmarkOpacity(0.28)

    const state = { progress: 0, amount: 1, overlay: 1, html: 0.28 }
    let finished = false

    const finishSharp = () => {
      if (finished) return
      finished = true
      resolveOnceRef.current = true
      // Always land on a sharp HTML wordmark — never wave:1 / overlay:0.
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

    // Sweep across the wordmark first; only then resolve amount + HTML together,
    // and keep the overlay alive until amount is nearly gone (avoids empty frame).
    tl.to(state, { progress: 1, duration: 1.28, ease: 'power2.inOut' }, 0)
      .to(state, { amount: 0, html: 1, duration: 0.62, ease: 'power2.out' }, 1.05)
      .to(state, { overlay: 0, duration: 0.32, ease: 'power1.out' }, 1.55)

    return () => {
      tl.kill()
      window.clearTimeout(failOpenTimerRef.current)
      if (!finished) revealHtmlWordmark()
    }
  }, [prefsReady, reduced, mobile, profile.level])

  // Tab restore: if both layers are weak, force sharp HTML.
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
      const hazeBand = q('[data-layer="haze-band"]')
      const puffAccent = q('[data-layer="puff-accent"]')
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
          onUpdate: (st) => {
            setHeroProgress(st.progress)
            // Continuum signal: brief intensify near statement settle, then cool for showreel.
            if (LIQUID_MEDIA_PROTO.enabled) {
              const p = st.progress
              let cue = 0
              if (p > 0.62 && p < 0.92) cue = Math.sin(((p - 0.62) / 0.3) * Math.PI) * 0.55
              setSignalIntensity(cue)
            }
          },
        },
      })

      // Helper: a tween placed at position `from` that lasts until `to`
      // (positions/durations are scroll fractions of the 0→1 timeline).
      const spanDur = (from: number, to: number) => ({ duration: to - from })

      // Desktop-only layers (haze-band, front-right, puff-accent) are absent on
      // mobile — skip empty query results so GSAP never warns "target not found".
      const has = (els: ArrayLike<Element> | null | undefined) => (els?.length ?? 0) > 0

      // ---- Parallax rise (all start together at 0.12, different distances) ----
      const rise = 0.12
      if (has(trav)) tl.fromTo(trav, { y: 0 }, { y: vh(-48), ...spanDur(rise, 0.85) }, rise) // fastest
      if (has(fl)) tl.fromTo(fl, { y: 0 }, { y: vh(-40), ...spanDur(rise, 0.9) }, rise)
      if (has(fr)) tl.fromTo(fr, { y: 0 }, { y: vh(-42), ...spanDur(rise, 0.9) }, rise)
      if (has(puffAccent)) tl.fromTo(puffAccent, { y: 0 }, { y: vh(-41), ...spanDur(rise, 0.9) }, rise)
      if (has(title)) tl.fromTo(title, { y: 0, scale: 1 }, { y: vh(-30), scale: 1.06, ...spanDur(rise, 0.9) }, rise)
      if (has(back)) tl.fromTo(back, { y: 0 }, { y: vh(-8), ...spanDur(rise, 0.96) }, rise)
      if (has(hazeBand)) tl.fromTo(hazeBand, { y: 0 }, { y: vh(-7), ...spanDur(rise, 0.96) }, rise)

      // ---- Opacity crossfades (gentle, gradual — no abrupt fades) ----
      if (has(trav)) tl.to(trav, { autoAlpha: 0, ...spanDur(0.34, 0.56) }, 0.34)
      if (has(title)) tl.to(title, { autoAlpha: 0, ...spanDur(0.44, 0.76) }, 0.44)
      const frontRemnants = [...fl, ...fr, ...puffAccent]
      if (frontRemnants.length) tl.to(frontRemnants, { autoAlpha: 0.08, ...spanDur(0.6, 0.84) }, 0.6)
      const backRemnants = [...back, ...hazeBand]
      if (backRemnants.length) tl.to(backRemnants, { autoAlpha: 0.4, ...spanDur(0.7, 0.92) }, 0.7)

      // ---- #0089FF transition illumination (≤0.10) bridging the two states.
      if (has(blue)) {
        tl.fromTo(blue, { autoAlpha: 0 }, { autoAlpha: 0.1, ...spanDur(0.5, 0.7) }, 0.5)
          .to(blue, { autoAlpha: 0.05, ...spanDur(0.84, 1.0) }, 0.84)
      }

      // ---- Statement rises through liquid-field language (clip + clear), not a plain fade.
      if (has(statement)) {
        tl.fromTo(
          statement,
          { y: vh(28), autoAlpha: 0, filter: 'blur(10px)' },
          { y: 0, autoAlpha: 1, filter: 'blur(0px)', ...spanDur(0.44, 0.86) },
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
        if (has(stCopy)) tl.fromTo(stCopy, { autoAlpha: 0, y: vh(2.4) }, { autoAlpha: 1, y: 0, ...spanDur(0.7, 0.86) }, 0.7)
        // Short composed hold into showreel — keep statement ownership, no dead trail.
        tl.to(statement, { y: vh(-1.2), ...spanDur(0.9, 1.0) }, 0.9)
      }

      return () => {
        tl.scrollTrigger?.kill()
        if (LIQUID_MEDIA_PROTO.enabled) setSignalIntensity(0)
      }
    }, rootRef)

    return () => ctx.revert()
  }, [reduced, mobile])

  /*
   * The scroll distance the sticky stage is held for.
   *
   * Reduced from 230vh/185vh. The timeline's positions are fractions of this
   * height, so every beat rescales with it — the sequence reads identically,
   * it simply asks for less scroll. The trailing slack was the larger half of
   * Trailing inactive range: statement visually settles by ~0.90. Desktop
   * height kept tight so the remaining scrub (~0.10) is a short hold into
   * showreel anticipation — not a dark empty trek.
   */
  const sectionHeight = reduced ? 'auto' : mobile ? '148vh' : '172vh'

  return (
    <section ref={rootRef} aria-label="Cineheight Media introduction" style={{ height: sectionHeight }} className="relative">
      {/* Transparent stage (body bg is the same #020306) so the fixed
          background signal route shows through the hero's dark negative space. */}
      <div className={reduced ? 'relative h-screen overflow-hidden' : 'sticky top-0 h-screen overflow-hidden'}>
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

        {/* L1.5 — the hero background surface: the WebGL water ripple.
            Sitting here in DOM order with z-index:auto is what puts it above
            the two ambient gradients above and below everything that carries a
            z-index — no z-index changes anywhere else, regardless of which
            surface is mounted.

            The local stack, bottom to top (sealed by .layer-content's
            `isolation: isolate`, so none of it escapes the hero):
              z-1  title (the h1)
              z-2  back haze + haze band   ── EVERY cloud paints above the word
              z-3  transition illumination
              z-4  front-left / front-right / puff-accent
              z-5  traveller
              z-6  brand statement
            The two hazes used to sit at z-0, under the title. They are above it
            now so the whole cloud system reads as being in front of the word,
            which costs nothing in legibility: at 0.12 opacity a near-white haze
            over the #f5f7fa→#b8bfc9 letter gradient is imperceptible, while over
            the #020306 stage it still reads as atmosphere. */}
        {rippleTier && <HeroRippleBackground tier={rippleTier} />}

        {/* L2 — soft background haze, now IN FRONT of the word (barely noticeable).
            Cloud wider than the period so the two copies cross-fade — see Marquee.
            `dur` is scaled with the period to hold the previous drift speed. */}
        <div aria-hidden="true" className="absolute z-[2]" style={{ left: '18%', width: '64%', top: '52%', height: '12vh', opacity: mobile ? 0.1 : 0.12 }}>
          <div data-layer="back" className="absolute inset-0 h-full w-full will-change-transform">
            <Marquee src={ASSETS.back} periodVw={mobile ? 84 : 54} cloudWidthVw={mobile ? 96 : 64} dur={93} phase={0.3} />
          </div>
        </div>

        {/* L2 — second back-tier haze band (stock cloud, hero-v4 addendum), a
            different height/drift from `back` so the atmosphere reads with more
            depth. Desktop only, same rule as front-right below.

            THIS is the layer that put a drifting rectangle in the hero: its asset
            was cropped by `trim()` straight through the wisp, leaving alpha ~132
            on the right column and ~81 on the bottom row. The repair feathers
            those edges over 340px / 210px, which is also why the 14vw copy
            overlap below matters — the right edge is now a long fade that needs a
            partner to fade into. See scripts/repair-hero-clouds.mjs. */}
        {!mobile && (
          <div aria-hidden="true" className="absolute z-[2]" style={{ left: '8%', width: '76%', top: '42%', height: '10vh', opacity: 0.12 }}>
            <div data-layer="haze-band" className="absolute inset-0 h-full w-full will-change-transform">
              <Marquee src={ASSETS.hazeBand} periodVw={62} cloudWidthVw={76} dur={106} phase={0.62} reverse />
            </div>
          </div>
        )}

        {/* L3 — CINEHEIGHT (live HTML, the page's only h1) */}
        <div
          data-layer="title"
          className="absolute inset-0 z-[1] flex items-center justify-center will-change-transform"
          style={{ transform: 'translateY(-1vh)' }}
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

        {/* L4 — front-left natural cloud IN FRONT of the title (z-4), over C-I-N.
            Opacity is a flat 1: the asset's own baked alpha decides what shows.
            Anything below 1 leaks the bright letter through the cloud's OPAQUE
            core, which is what previously read as the text "blending with" the
            cloud rather than being hidden by it. The repair pass also narrowed
            each asset's mid-alpha shoulder (solid coverage 12-24% -> 37-42%), so
            the body now occludes and only the wispy rim lets the letter through.
            The drop-shadow stays: over a clean alpha silhouette it reinforces
            the occlusion read. See scripts/repair-hero-clouds.mjs. */}
        <div
          data-layer="front-left"
          aria-hidden="true"
          className="absolute z-[4] will-change-transform"
          style={{
            left: mobile ? '-10vw' : '-14vw',
            width: mobile ? '90vw' : '52vw',
            top: mobile ? '56%' : '53%',
            opacity: 1,
            filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.3))',
          }}
        >
          <Marquee src={ASSETS.frontLeft} periodVw={mobile ? 90 : 52} cloudWidthVw={mobile ? 44 : 20} dur={78} phase={0.18} />
        </div>

        {/* L4 — front-right natural cloud (z-4), over G-H-T. Different form/height
            (distinct G4 cloud), drifts the OPPOSITE way. Desktop only. */}
        {!mobile && (
          <div
            data-layer="front-right"
            aria-hidden="true"
            className="absolute z-[4] will-change-transform"
            style={{ left: '62vw', width: '52vw', top: '54.5%', opacity: 1, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.3))' }}
          >
            <Marquee src={ASSETS.frontRight} periodVw={52} cloudWidthVw={22} dur={90} phase={0.5} reverse />
          </div>
        )}

        {/* L4 — puff-accent cloud (stock cloud, hero-v4 addendum), a third
            distinct front-tier silhouette (z-4). Drifts via its own offscreen
            traversal (like the traveller below) rather than a marquee, for
            variety against the two marquee-driven front clouds — different
            top band and timing so it doesn't read as a duplicate. Desktop only.
            Its asset was flat white (255,255,255) while the G4 clouds paint at
            166,171,185 — harmless at the old 0.55 opacity, a white blob at 1, so
            the repair pass retones it to match the front tier. */}
        {!mobile && (
          <div
            data-layer="puff-accent"
            aria-hidden="true"
            className="absolute z-[4] will-change-transform"
            style={{ top: '49%', left: 0, width: '100%', opacity: 1, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.3))' }}
          >
            <div data-traverse data-dur={85} data-phase={0.7} className="absolute top-0 will-change-transform" style={{ width: '17vw' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ASSETS.puffAccent} alt="" draggable={false} className="w-full" style={{ height: 'auto' }} />
            </div>
          </div>
        )}

        {/* L5 — small travelling cloud (z-5), crosses selected middle letters.
            Raised from 0.34/0.4: at that opacity it was the worst offender for
            letters reading through a cloud. Held just under 1 because this one
            crosses the MIDDLE of the word rather than the baseline, so a fully
            opaque pass would blank whole letters instead of grazing them. */}
        <div
          data-layer="traveller"
          aria-hidden="true"
          className="absolute z-[5] will-change-transform"
          style={{ top: mobile ? '55%' : '54%', left: 0, width: '100%', opacity: mobile ? 0.85 : 0.9 }}
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
          className="absolute inset-0 z-[3]"
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
            className="absolute inset-0 z-[6] flex items-center will-change-transform"
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
