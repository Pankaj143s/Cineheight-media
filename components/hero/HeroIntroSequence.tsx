'use client'

import { useLayoutEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap'
import { setHeroProgress } from '@/lib/heroProgress'
import { emitSignalPulse } from '@/lib/heroSignalPulse'
import { useIsMobileTier, useReducedMotionState } from '@/lib/useMediaPreferences'
import HeroAuroraBloom from './HeroAuroraBloom'
import HeroHandshake, { VIEW_W, VIEW_H, NODE_R } from './HeroHandshake'
import { LIQUID_MEDIA_PROTO } from '@/lib/liquidMedia/config'
import { setSignalIntensity } from '@/lib/liquidMedia/signalIntensity'

const HeroRippleMode = dynamic(() => import('./HeroRippleMode'), { ssr: false })

const HERO_VISUAL_MODE = process.env.NEXT_PUBLIC_HERO_VISUAL_MODE === 'ripple' ? 'ripple' : 'bloom'

/**
 * The hero.
 *
 * "Cineheight" holds, then its eight other letters dissolve outward from the
 * edges while the two lowercase `i`s glide toward each other. Each `i` is a
 * tittle over a stem — a head over a body — so the pair reads as two figures;
 * line-art arms then draw out from their stems, clasp, shake, and fade with
 * them. The statement ("WE TURN BUSINESSES INTO BRANDS.") enters over the tail
 * of that fade. Everything is driven by one scrubbed ScrollTrigger timeline;
 * the background is HeroAuroraBloom.
 */
export default function HeroIntroSequence() {
  const rootRef = useRef<HTMLElement>(null)
  const wordmarkRef = useRef<HTMLSpanElement>(null)
  const fallbackRef = useRef<HTMLDivElement>(null)
  const { reduced, ready: prefsReady } = useReducedMotionState()
  const mobile = useIsMobileTier()

  useLayoutEffect(() => {
    if (!prefsReady || !reduced || !fallbackRef.current) return
    fallbackRef.current.animate(
      [{ opacity: 0.72, filter: 'brightness(0.82)' }, { opacity: 1, filter: 'brightness(1)' }],
      { duration: 180, easing: 'ease-out', fill: 'forwards' }
    )
  }, [prefsReady, reduced])

  useLayoutEffect(() => {
    if (!prefsReady) return

    const wordmarkEl = wordmarkRef.current
    if (!wordmarkEl) return

    if (reduced) {
      gsap.set(wordmarkEl, { autoAlpha: 1 })
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom 60%',
        onUpdate: (s) => setHeroProgress(s.progress),
      })
      return () => st.kill()
    }

    let cancelled = false
    let split: SplitText | null = null
    let entranceTween: gsap.core.Tween | null = null
    let ctx: gsap.Context | null = null

    const run = () => {
      if (cancelled || !wordmarkRef.current || !rootRef.current) return

      split = SplitText.create(wordmarkRef.current, {
        type: 'chars',
        tag: 'span',
        charsClass: 'hero-title-char',
        smartWrap: true,
        aria: 'none',
      })

      gsap.set(wordmarkRef.current, { autoAlpha: 1 })

      const chars = split.chars as HTMLElement[]

      entranceTween = gsap.from(chars, {
        rotationZ: -90,
        transformOrigin: 'bottom left',
        opacity: 0,
        stagger: mobile ? 0.058 : 0.078,
        duration: 0.65,
        ease: 'power3.out',
        delay: 0.12,
      })

      // Content-based, not index-based, so `smartWrap` reordering can't break
      // it. "Cineheight" has exactly two lowercase `i`s.
      const iChars = chars.filter((c) => c.textContent === 'i')
      const otherChars = chars.filter((c) => c.textContent !== 'i')

      ctx = gsap.context(() => {
        const q = gsap.utils.selector(rootRef)
        const title = q('[data-layer="title"]')
        const titleEl = title[0] as HTMLElement | undefined
        const blue = q('[data-layer="transition-light"]')
        const statement = q('[data-layer="statement"]')
        const stLines = q('[data-line-inner]')
        const stCopy = q('[data-layer="statement-copy"]')
        const handshakeRoot = q('[data-layer="handshake"]')
        const handshakeSvg = q('.hero-hand-svg')
        const clipLeft = q('[data-arm-clip="left"]')
        const clipRight = q('[data-arm-clip="right"]')
        const node = q('[data-node]')
        const shakeGroup = q('[data-shake]')

        const has = (els: ArrayLike<Element> | null | undefined) => (els?.length ?? 0) > 0
        const vh = (n: number) => () => (window.innerHeight * n) / 100
        const spanDur = (from: number, to: number) => ({ duration: to - from })
        /*
         * Same, for a yoyo-repeating tween. A repeating tween's TOTAL time is
         * duration x (repeat + 1), so passing the whole span as `duration`
         * overruns the beat by that factor — which pushed the timeline's total
         * duration past 1.0 and silently shifted every later beat earlier in
         * the scroll, with the shake still running under the statement.
         */
        const spanRepeat = (from: number, to: number, repeat: number) => ({
          duration: (to - from) / (repeat + 1),
          repeat,
        })

        const wordCenterX = () => {
          const lefts = chars.map((c) => c.offsetLeft)
          const rights = chars.map((c) => c.offsetLeft + c.offsetWidth)
          return (Math.min(...lefts) + Math.max(...rights)) / 2
        }

        /**
         * How much the two `i`s grow once the other letters have gone. Fixing
         * the arm proportions alone leaves a small mark; scaling the figures
         * keeps the composition substantial while the ratios stay correct.
         */
        const FIGURE_SCALE = mobile ? 1.5 : 1.8
        /** How far down the stem the arms leave the body — just under the head. */
        const SHOULDER_ON_STEM = 0.2

        /*
         * Every handshake dimension derives from the measured FIGURE HEIGHT —
         * the visible letter, dot top to baseline — never from font size.
         *
         * That distinction is the whole of this round's bug: the visible `i` is
         * only 0.74em tall, so a gap tied to font size came out at 1.76 figure
         * heights and the arms were ~60% too long for the bodies. Two people
         * shaking hands stand about 1.05 body-heights apart, hence the ratio.
         */
        const GAP_OVER_FIGURE = 1.05

        /*
         * Where the `i`'s STEM actually is, vertically.
         *
         * This is the calculation that has been wrong twice, so it is derived
         * end to end from real metrics with no assumed constants:
         *
         *   halfLeading = (lineHeight - (ascent + descent)) / 2
         *   baseline    = charBoxTop + halfLeading + ascent
         *   stemTop     = baseline - xHeight        // `i`'s stem starts at x-height
         *
         * The previous version measured the ink's midpoint FROM THE BASELINE
         * and then applied it as an offset from the line-box CENTRE. Those are
         * different origins, separated by half-leading plus the descent, which
         * is exactly why the arms floated up at tittle height.
         *
         * `xHeight` comes from 'x' rather than 'i' deliberately: `i`'s ink
         * ascent includes the tittle, which would put the shoulders on the head.
         */
        let baselineFromCharTop = 0
        let xHeight = 0
        /** Dot top to baseline — the whole visible letter, i.e. the figure. */
        let figureHeight = 0
        const measureStem = () => {
          const cvs = document.createElement('canvas')
          const c2d = cvs.getContext('2d')
          if (!c2d) return
          const cs = getComputedStyle(wordmarkEl)
          c2d.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
          const m = c2d.measureText('x')
          const ascent = m.fontBoundingBoxAscent
          const descent = m.fontBoundingBoxDescent
          const xh = m.actualBoundingBoxAscent
          // `i` includes the tittle, so it gives the figure's full height —
          // which is exactly why 'x' is used for the stem and 'i' for the figure.
          const fig = c2d.measureText('i').actualBoundingBoxAscent
          if (![ascent, descent, xh, fig].every((n) => isFinite(n) && n > 0)) return
          const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize)
          const halfLeading = (lineHeight - (ascent + descent)) / 2
          xHeight = xh
          figureHeight = fig
          baselineFromCharTop = halfLeading + ascent
        }

        /**
         * `i`-centre to `i`-centre after convergence, on the SCALED figures.
         * Must agree with the scale applied to the chars themselves, because
         * the SVG's width is static and sized for the final state.
         */
        const gapPx = () => figureHeight * GAP_OVER_FIGURE * FIGURE_SCALE

        /*
         * Static handshake layout, applied outside the timeline.
         *
         * Both placement rules come straight from HeroHandshake's viewBox
         * contract, so there is no arithmetic here to get wrong:
         *   - width = the `i`-to-`i` gap, because shoulders sit on the x edges
         *   - centre on (word centre, shoulder Y), because SHOULDER_Y is the
         *     viewBox's exact vertical centre
         *
         * The root is `left-0 top-0`, so x/y are plain layout coordinates in
         * the same space as `iChar.offsetLeft/offsetTop` — not offsets from
         * some other element's centre.
         *
         * Not a `tl.set()` at position 0: that only lands once the scrubbed
         * timeline first renders, which is not guaranteed at mount — in round
         * 1 it never applied at all. Re-run on refresh so resize and late font
         * swaps re-measure.
         */
        const applyHandshakeLayout = () => {
          if (!iChars.length || !xHeight) return
          const w = gapPx()
          const h = w * (VIEW_H / VIEW_W)
          if (has(handshakeSvg)) gsap.set(handshakeSvg, { width: w, height: h })
          if (has(handshakeRoot)) {
            /*
             * The chars scale about their own baseline, so the baseline is
             * invariant and the stem grows UPWARD from it. The shoulder is
             * therefore measured up from the baseline on the SCALED stem —
             * using the unscaled stem here would drop it below the shoulder
             * of the grown figure.
             */
            const baselineY = iChars[0].offsetTop + baselineFromCharTop
            const shoulderY = baselineY - xHeight * (1 - SHOULDER_ON_STEM) * FIGURE_SCALE
            gsap.set(handshakeRoot, {
              xPercent: -50,
              yPercent: -50,
              x: wordCenterX(),
              y: shoulderY,
            })
          }
        }
        measureStem()
        applyHandshakeLayout()
        const onRefresh = () => {
          measureStem()
          applyHandshakeLayout()
        }
        ScrollTrigger.addEventListener('refresh', onRefresh)

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: mobile ? 1.6 : 2,
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

        /*
         * The composition (title + handshake share this parent) used to rise
         * continuously from 0.08 all the way to 0.8 as a "camera push", with
         * no regard for where the handshake beats (0.26-0.74) fell inside
         * that span. By the time the clasp closed (0.58-0.64) it had already
         * drifted 16-19vh above centre, and kept climbing through the whole
         * shake — so the "final handshake" never actually held still in the
         * middle of the frame, which is what it should be reading as.
         *
         * Fix: freeze y/scale at their rest values for the ENTIRE handshake
         * sequence, and only rise/scale during the exit — starting exactly
         * where the i's + handshake fade-out already begins (0.74), so the
         * composition recedes and grows as it fades rather than drifting the
         * whole time it's the thing on screen. Magnitude is reduced from the
         * old -40vh/1.34x to -24vh/1.2x (desktop): the same distance
         * compressed from a 0.72-wide window into a 0.16-wide one would read
         * as a jump-cut otherwise.
         */
        const EXIT_RISE_START = 0.74
        if (has(title)) {
          tl.fromTo(
            title,
            { y: 0, scale: 1, transformOrigin: '50% 50%' },
            {
              y: vh(mobile ? -12 : -24),
              scale: mobile ? 1.1 : 1.2,
              transformOrigin: '50% 50%',
              force3D: true,
              ...spanDur(EXIT_RISE_START, 0.9),
            },
            EXIT_RISE_START
          )
        }

        // The eight non-`i` letters dissolve outward, edges first, leaving the
        // two `i`s last standing.
        if (has(otherChars)) {
          tl.to(
            otherChars,
            {
              autoAlpha: 0,
              y: mobile ? -14 : -22,
              filter: 'blur(6px)',
              stagger: { each: 0.016, from: 'edges' },
              ...spanDur(0.08, 0.3),
            },
            0.08
          )
        }

        // The two `i`s converge on the word's own centre, in layout space —
        // immune to the parent's scale/translate tweens above, and
        // recomputed on invalidateOnRefresh so resize/font-load stay exact.
        if (iChars.length >= 2) {
          tl.fromTo(
            iChars,
            { x: 0, scale: 1 },
            {
              x: (_i, target) => {
                const el = target as HTMLElement
                const targetAbs = el === iChars[0] ? wordCenterX() - gapPx() / 2 : wordCenterX() + gapPx() / 2
                // Centre, not left edge: `gapPx` is a centre-to-centre
                // distance and the arms' shoulders are placed on the `i`
                // CENTRES, so aligning left edges here left every shoulder
                // half an advance-width off its own stem.
                return targetAbs - (el.offsetLeft + el.offsetWidth / 2)
              },
              /*
               * The figures grow as they come together, and are fully settled
               * before the arms draw at 0.48.
               *
               * The origin is load-bearing in both axes:
               *   50%  horizontally — keeps the char's CENTRE fixed, so the x
               *        target above still lands correctly under scale.
               *   baseline vertically — keeps the feet planted so the figure
               *        grows upward, which is what lets applyHandshakeLayout
               *        measure the shoulder up from an invariant baseline.
               */
              scale: FIGURE_SCALE,
              transformOrigin: () => `50% ${baselineFromCharTop}px`,
              ...spanDur(0.26, 0.46),
            },
            0.26
          )
        }

        /*
         * The arms are filled polygons, not strokes, so the draw-on is a clip
         * sweep rather than a dashoffset. Each arm's `<clipPath>` rect grows
         * outward from its own shoulder — see the sweep geometry documented
         * next to CLIP_Y/CLIP_H/CLIP_W in HeroHandshake.tsx.
         *
         * Starts at 0.48 — strictly AFTER convergence ends at 0.46. The gap is
         * deliberate: the SVG is sized to the FINAL `i` gap, so any overlap
         * with the convergence would draw shoulders at positions the letters
         * have not reached yet. That overlap is what put the arms off the
         * stems in an earlier cut.
         */
        if (has(clipLeft)) {
          tl.fromTo(clipLeft, { attr: { width: 0 } }, { attr: { width: 160 }, ...spanDur(0.48, 0.6) }, 0.48)
        }
        if (has(clipRight)) {
          tl.fromTo(clipRight, { attr: { x: 270 } }, { attr: { x: 110 }, ...spanDur(0.48, 0.6) }, 0.48)
        }

        /*
         * Contact. The node closes the clasp — radius, not scale, because a
         * transform would drift it off the point where the two arms actually
         * meet (proven the hard way in an earlier round) — alongside the rim
         * bloom and the pulse into the background.
         */
        if (has(node)) {
          tl.fromTo(
            node,
            { attr: { r: 0 } },
            { attr: { r: NODE_R }, ease: 'back.out(2)', ...spanDur(0.58, 0.64) },
            0.58
          )
        }
        if (has(handshakeRoot)) {
          tl.call(() => emitSignalPulse(), undefined, 0.6)
          tl.fromTo(
            handshakeRoot,
            { ['--hand-rim' as string]: 0 },
            { ['--hand-rim' as string]: 1, ...spanDur(0.58, 0.62) },
            0.58
          ).to(handshakeRoot, { ['--hand-rim' as string]: 0, ...spanDur(0.66, 0.76) }, 0.66)
        }

        /*
         * The shake. Earlier rounds rotated each arm about its own shoulder;
         * that breaks with a shared, fixed node — rotating either arm alone
         * would swing its end away from the join. Instead the whole assembly
         * (both arms + the node, all inside [data-shake]) bobs together as one
         * rigid body, which is what keeps the clasp intact while it pumps.
         */
        const PUMP = mobile ? 3 : 4
        if (has(shakeGroup)) {
          tl.fromTo(
            shakeGroup,
            { y: 0 },
            { y: PUMP, yoyo: true, ease: 'sine.inOut', ...spanRepeat(0.62, 0.74, 4) },
            0.62
          )
        }

        // The `i`s and the arms exit together.
        const fadeOutTargets = [...iChars, ...(has(handshakeRoot) ? handshakeRoot : [])]
        if (fadeOutTargets.length) {
          tl.to(fadeOutTargets, { autoAlpha: 0, ...spanDur(0.74, 0.82) }, 0.74)
        }

        if (has(blue)) {
          tl.fromTo(blue, { autoAlpha: 0 }, { autoAlpha: 0.1, ...spanDur(0.6, 0.74) }, 0.6).to(
            blue,
            { autoAlpha: 0.05, ...spanDur(0.9, 1.0) },
            0.9
          )
        }

        /*
         * The statement starts at 0.76 while the arms are still fading out
         * (0.74–0.82). The overlap is deliberate: one beat hands off to the
         * next instead of leaving the dead scroll that made the first cut feel
         * disconnected.
         */
        if (has(statement)) {
          tl.fromTo(
            statement,
            { y: vh(mobile ? 14 : 24), autoAlpha: 0, filter: `blur(${mobile ? 3 : 8}px)` },
            { y: 0, autoAlpha: 1, filter: 'blur(0px)', ...spanDur(0.76, 0.9) },
            0.76
          )
          if (stLines[0]) {
            tl.fromTo(
              stLines[0],
              { clipPath: 'inset(0 100% 0 0)', yPercent: 18 },
              { clipPath: 'inset(0 0% 0 0)', yPercent: 0, ...spanDur(0.8, 0.88) },
              0.8
            )
          }
          if (stLines[1]) {
            tl.fromTo(
              stLines[1],
              { clipPath: 'inset(0 100% 0 0)', yPercent: 18 },
              { clipPath: 'inset(0 0% 0 0)', yPercent: 0, ...spanDur(0.83, 0.91) },
              0.83
            )
          }
          if (has(stCopy)) {
            tl.fromTo(stCopy, { autoAlpha: 0, y: vh(2.4) }, { autoAlpha: 1, y: 0, ...spanDur(0.88, 0.95) }, 0.88)
          }
          tl.to(statement, { y: vh(-1.2), ...spanDur(0.95, 1.0) }, 0.95)
        }

        /*
         * Read-only handle for the browser probes, mirroring CursorTrail's
         * `window.__cineheightCursor`. Nothing in the app reads it.
         *
         * It exists because this environment's browser pane does not composite
         * frames, so the GSAP ticker never advances and the sequence cannot be
         * observed. Calling `.progress(x)` renders the timeline SYNCHRONOUSLY,
         * which makes every beat measurable regardless. Both previous rounds
         * shipped mispositioned arms precisely because there was no way to
         * inspect a mid-sequence frame.
         */
        if (process.env.NODE_ENV !== 'production') {
          Object.defineProperty(window, '__heroSequence', {
            value: {
              timeline: tl,
              /*
               * The one-shot entrance tween is exposed too. It is not part of
               * the scrub, but with the ticker frozen it never completes and
               * leaves every char at its `from` state — rotationZ: -90 — which
               * silently corrupts any geometry read taken against the letters.
               * Probes should call `entrance.progress(1)` before measuring.
               */
              entrance: entranceTween,
            },
            configurable: true,
          })
        }

        return () => {
          ScrollTrigger.removeEventListener('refresh', onRefresh)
          tl.scrollTrigger?.kill()
          if (process.env.NODE_ENV !== 'production') {
            delete (window as unknown as Record<string, unknown>).__heroSequence
          }
          if (LIQUID_MEDIA_PROTO.enabled) setSignalIntensity(0)
        }
      }, rootRef)
    }

    const fontsReady =
      typeof document !== 'undefined' && document.fonts?.ready ? document.fonts.ready : Promise.resolve()

    fontsReady.then(run).catch(run)

    return () => {
      cancelled = true
      entranceTween?.kill()
      ctx?.revert()
      split?.revert()
      gsap.set(wordmarkEl, { autoAlpha: 1, clearProps: 'transform' })
    }
  }, [prefsReady, reduced, mobile])

  const sectionHeight = reduced ? 'auto' : mobile ? '185vh' : '210vh'

  return (
    <section
      ref={rootRef}
      aria-label="Cineheight Media introduction"
      data-hero-visual-mode={HERO_VISUAL_MODE}
      style={{ height: sectionHeight }}
      className="relative"
    >
      {/* FlowThread origin — visible top-left of hero (not off-screen edge-left) */}
      <div
        data-flow-anchor="left"
        data-flow-lead="0"
        data-hero-flow-start=""
        className="pointer-events-none absolute left-0 top-0 h-px w-px"
        aria-hidden="true"
      />
      <div
        className={
          reduced
            ? 'hero-stage relative h-[100svh] min-h-[100svh] overflow-hidden'
            : 'hero-stage sticky top-0 h-[100svh] min-h-[100svh] overflow-hidden'
        }
      >
        {/*
          Stack:
            z-0   Aurora bloom
            z-1   composition (title + handshake), shifted 12%
            z-11  thread (post-reveal only; under statement)
            z-12  transition light
            z-13  statement
        */}
        {HERO_VISUAL_MODE === 'ripple' ? (
          <HeroRippleMode />
        ) : prefsReady && !reduced ? (
          <HeroAuroraBloom />
        ) : (
          <div
            ref={fallbackRef}
            data-bloom-fallback={prefsReady ? 'reduced' : 'preference-pending'}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% 58%, rgba(0,94,170,0.18), transparent 72%), #000',
            }}
          />
        )}

        <div
          data-layer="hero-composition"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ transform: 'translate3d(0, 12%, 0)' }}
        >
          <div
            data-layer="title"
            data-parallax-exclude=""
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Behind the letters (z-0 vs the h1's z-10), so each forearm
                reads as emerging from behind its own `I`. */}
            {!reduced && <HeroHandshake />}

            {/* z-10 without `relative` on purpose: a flex item honours
                z-index while staying `position: static`, which keeps
                [data-layer="title"] as the offsetParent for the split chars.
                Making the h1 positioned would reparent those measurements and
                desync the handshake's centring math from the wordmark. */}
            <h1 className="z-10 m-0 text-center">
              <span
                ref={wordmarkRef}
                aria-hidden="true"
                className="hero-title block"
                style={{
                  // Smaller than the old Bebas value: Satoshi is a much wider
                  // face, so the condensed clamp would overflow the viewport.
                  fontSize: 'clamp(44px, 11.5vw, 12rem)',
                }}
              >
                Cineheight
              </span>
              <span className="sr-only">Cineheight Media — Branding and Digital Growth Agency</span>
            </h1>
          </div>
        </div>

        {/* Post-reveal only (FlowThread portals in after ~76%): under statement, over faded title. */}
        <div
          data-hero-thread-slot=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[11] overflow-x-clip"
        />

        <div
          data-layer="transition-light"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[12]"
          style={{
            background: 'radial-gradient(ellipse 55% 34% at 50% 64%, rgba(0,137,255,0.5), transparent 74%)',
            opacity: 0,
            visibility: reduced ? 'hidden' : undefined,
          }}
        />

        {!reduced && (
          <div
            data-layer="statement"
            className="absolute inset-0 z-[13] flex items-center"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <div className="flow-gutter">
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
          <div className="flow-gutter">
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
