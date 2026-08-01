'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap'
import { setHeroProgress } from '@/lib/heroProgress'
import {
  useIsMobileTier,
  useMotionCapabilityProfile,
  useReducedMotionState,
} from '@/lib/useMediaPreferences'
import type { HeroVantaTier } from './HeroVantaBirds'
import { LIQUID_MEDIA_PROTO } from '@/lib/liquidMedia/config'
import { setSignalIntensity } from '@/lib/liquidMedia/signalIntensity'

const HeroVantaBirds = dynamic(() => import('./HeroVantaBirds'), { ssr: false })

function resolveVantaTier(mobile: boolean): HeroVantaTier {
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  const renderPixels = window.innerWidth * window.innerHeight * Math.min(window.devicePixelRatio, 2)
  if (mobile || saveData || cores <= 4 || memory <= 4 || renderPixels > 5_000_000) return 'compact'
  if (cores >= 8 && memory >= 8 && renderPixels <= 3_500_000) return 'high'
  return 'standard'
}

/** Cleaned true-alpha New-clouds plates (subtle cinematic hero). */
const ASSETS = {
  center: { src: '/generated/hero-v5/cloud-center-clean.webp', width: 1171, height: 622 },
  left: { src: '/generated/hero-v5/cloud-left-clean.webp', width: 1322, height: 530 },
  right: { src: '/generated/hero-v5/cloud-right-clean.webp', width: 1436, height: 436 },
}

function CloudPlate({
  asset,
  name,
  sources,
  priority = false,
}: {
  asset: { src: string; width: number; height: number }
  name: 'center' | 'left' | 'right'
  sources: Array<{ media: string; sizes: string }>
  priority?: boolean
}) {
  const responsiveRoot = '/generated/hero-v5/responsive'
  const srcSet = `${responsiveRoot}/cloud-${name}-640.webp 640w, ${responsiveRoot}/cloud-${name}-960.webp 960w, ${asset.src} ${asset.width}w`
  return (
    <picture>
      {sources.map((source) => (
        <source
          key={source.media}
          media={source.media}
          srcSet={srcSet}
          sizes={source.sizes}
        />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
        width={asset.width}
        height={asset.height}
        alt=""
        draggable={false}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        data-cloud-source={name}
      />
    </picture>
  )
}

/**
 * Experiment: Vanta Birds behind hero-v5 clouds + CINEHEIGHT.
 * Scroll scrub drives title + statement; clouds keep parallax / idle drift.
 */
export default function HeroIntroSequence() {
  const rootRef = useRef<HTMLElement>(null)
  const wordmarkRef = useRef<HTMLSpanElement>(null)
  const fallbackRef = useRef<HTMLDivElement>(null)
  const { reduced, ready: prefsReady } = useReducedMotionState()
  const mobile = useIsMobileTier()
  const profile = useMotionCapabilityProfile()

  // useMotionCapabilityProfile starts as 'static' until its useEffect runs —
  // wait one effect pass so we don't treat that default as a real static tier.
  const [capabilityReady, setCapabilityReady] = useState(false)

  useEffect(() => {
    setCapabilityReady(true)
  }, [])

  const allowTitleScrub = !reduced && profile.level !== 'static'
  const allowCloudDrift = !reduced && profile.level !== 'static'
  // CSS also hides sides ≤767px; JS covers coarse-pointer "mobile tier" on wider screens
  const vantaTier = prefsReady && !reduced ? resolveVantaTier(mobile) : null

  useLayoutEffect(() => {
    if (!prefsReady || !reduced || !fallbackRef.current) return
    fallbackRef.current.animate(
      [{ opacity: 0.72, filter: 'brightness(0.82)' }, { opacity: 1, filter: 'brightness(1)' }],
      { duration: 180, easing: 'ease-out', fill: 'forwards' }
    )
  }, [prefsReady, reduced])

  useLayoutEffect(() => {
    if (!prefsReady || !capabilityReady) return

    const el = wordmarkRef.current
    if (!el) return

    if (reduced || profile.level === 'static') {
      gsap.set(el, { autoAlpha: 1 })
      return
    }

    let cancelled = false
    let split: SplitText | null = null
    let tween: gsap.core.Tween | null = null

    const run = () => {
      if (cancelled || !wordmarkRef.current) return

      split = SplitText.create(wordmarkRef.current, {
        type: 'chars',
        tag: 'span',
        charsClass: 'hero-title-char',
        smartWrap: true,
        aria: 'none',
      })

      gsap.set(wordmarkRef.current, { autoAlpha: 1 })

      tween = gsap.from(split.chars, {
        rotationZ: -90,
        transformOrigin: 'bottom left',
        opacity: 0,
        stagger: mobile ? 0.058 : 0.078,
        duration: 0.65,
        ease: 'power3.out',
        delay: 0.12,
      })
    }

    const fontsReady =
      typeof document !== 'undefined' && document.fonts?.ready
        ? document.fonts.ready
        : Promise.resolve()

    fontsReady.then(run).catch(run)

    return () => {
      cancelled = true
      tween?.kill()
      split?.revert()
      gsap.set(el, { autoAlpha: 1, clearProps: 'transform' })
    }
  }, [prefsReady, capabilityReady, reduced, mobile, profile.level])

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
      const blue = q('[data-layer="transition-light"]')
      const statement = q('[data-layer="statement"]')
      const stLines = q('[data-line-inner]')
      const stCopy = q('[data-layer="statement-copy"]')
      const center = q('[data-cloud-parallax="center"]')
      const left = q('[data-cloud-parallax="left"]')
      const right = q('[data-cloud-parallax="right"]')
      const centerPlate = q('[data-layer="cloud-center"]')
      const leftPlate = q('[data-layer="cloud-left"]')
      const rightPlate = q('[data-layer="cloud-right"]')
      const driftNodes = q('[data-cloud-drift]')

      const vh = (n: number) => () => (window.innerHeight * n) / 100
      const has = (els: ArrayLike<Element> | null | undefined) => (els?.length ?? 0) > 0
      const spanDur = (from: number, to: number) => ({ duration: to - from })

      let cloudDriftCleanup: (() => void) | undefined

      if (allowCloudDrift && has(driftNodes)) {
        // Seamless one-way wind: exit one edge → wrap in from the opposite side
        const specs = [
          { name: 'center', pxPerSec: 14, phase: 0.42 },
          { name: 'left', pxPerSec: 20, phase: 0.12 },
          { name: 'right', pxPerSec: 22, phase: 0.68 },
        ] as const

        const driftTweens: gsap.core.Tween[] = []

        const buildDrifts = () => {
          for (const tw of driftTweens) tw.kill()
          driftTweens.length = 0

          for (const spec of specs) {
            const nodes = q(`[data-cloud-drift="${spec.name}"]`)
            if (!has(nodes)) continue
            const el = nodes[0] as HTMLElement
            const plate = (el.closest('.hero-cloud-plate') as HTMLElement | null) ?? el

            gsap.set(el, { x: 0, y: 0, force3D: true, willChange: 'transform' })

            const cloudW = plate.offsetWidth || 400
            const homeLeft = plate.getBoundingClientRect().left
            const minX = -homeLeft - cloudW
            const span = Math.max(window.innerWidth + cloudW, window.innerWidth - homeLeft - minX)
            const wrapX = gsap.utils.wrap(minX, minX + span)
            const startX = minX + span * spec.phase
            const duration = span / spec.pxPerSec

            gsap.set(el, { x: startX })
            driftTweens.push(
              gsap.to(el, {
                x: `+=${span}`,
                duration,
                ease: 'none',
                repeat: -1,
                force3D: true,
                modifiers: {
                  x: gsap.utils.unitize((x) => wrapX(parseFloat(x))),
                },
              })
            )
          }
        }

        buildDrifts()
        const onRefresh = () => buildDrifts()
        ScrollTrigger.addEventListener('refresh', onRefresh)
        cloudDriftCleanup = () => {
          ScrollTrigger.removeEventListener('refresh', onRefresh)
          for (const tw of driftTweens) tw.kill()
        }
      }

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

      const rise = 0.12
      if (allowTitleScrub) {
        if (has(center)) tl.fromTo(center, { y: 0 }, { y: vh(mobile ? -5 : -7), ...spanDur(rise, 0.94) }, rise)
        if (has(left)) tl.fromTo(left, { y: 0 }, { y: vh(mobile ? -12 : -18), ...spanDur(rise, 0.88) }, rise)
        if (has(right)) tl.fromTo(right, { y: 0 }, { y: vh(mobile ? -12 : -18), ...spanDur(rise, 0.88) }, rise)
        if (has(title)) {
          // Rise + grow toward camera; scrub lag keeps it smooth.
          tl.fromTo(
            title,
            { y: 0, scale: 1, transformOrigin: '50% 50%' },
            {
              y: vh(mobile ? -32 : -48),
              scale: mobile ? 1.28 : 1.42,
              transformOrigin: '50% 50%',
              force3D: true,
              ...spanDur(rise, 0.88),
            },
            rise
          )
          tl.to(title, { autoAlpha: 0, ...spanDur(0.44, 0.76) }, 0.44)
        }
      } else if (has(title)) {
        tl.fromTo(title, { y: 0, autoAlpha: 1 }, { y: vh(-18), autoAlpha: 0, ...spanDur(0.35, 0.72) }, 0.35)
      }

      if (has(leftPlate)) tl.to(leftPlate, { autoAlpha: 0.04, ...spanDur(0.5, 0.8) }, 0.5)
      if (has(rightPlate)) tl.to(rightPlate, { autoAlpha: 0.04, ...spanDur(0.5, 0.8) }, 0.5)
      if (has(centerPlate)) tl.to(centerPlate, { autoAlpha: 0.1, ...spanDur(0.6, 0.9) }, 0.6)

      if (has(blue)) {
        tl.fromTo(blue, { autoAlpha: 0 }, { autoAlpha: 0.1, ...spanDur(0.5, 0.7) }, 0.5).to(
          blue,
          { autoAlpha: 0.05, ...spanDur(0.84, 1.0) },
          0.84
        )
      }

      if (has(statement)) {
        tl.fromTo(
          statement,
          { y: vh(28), autoAlpha: 0, filter: 'blur(8px)' },
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
        if (has(stCopy)) {
          tl.fromTo(stCopy, { autoAlpha: 0, y: vh(2.4) }, { autoAlpha: 1, y: 0, ...spanDur(0.7, 0.86) }, 0.7)
        }
        tl.to(statement, { y: vh(-1.2), ...spanDur(0.9, 1.0) }, 0.9)
      }

      return () => {
        cloudDriftCleanup?.()
        tl.scrollTrigger?.kill()
        if (LIQUID_MEDIA_PROTO.enabled) setSignalIntensity(0)
      }
    }, rootRef)

    return () => ctx.revert()
  }, [reduced, mobile, allowTitleScrub, allowCloudDrift])

  const sectionHeight = reduced ? 'auto' : mobile ? '148vh' : '172vh'

  return (
    <section ref={rootRef} aria-label="Cineheight Media introduction" style={{ height: sectionHeight }} className="relative">
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
            ? 'hero-cloud-stage relative h-[100svh] min-h-[100svh] overflow-hidden'
            : 'hero-cloud-stage sticky top-0 h-[100svh] min-h-[100svh] overflow-hidden'
        }
      >
        {/*
          Stack:
            z-0   Vanta Birds
            z-1   composition (title + clouds), shifted 12%
            z-11  thread (post-reveal only; under statement)
            z-12  transition light
            z-13  statement
        */}
        {vantaTier ? (
          <HeroVantaBirds tier={vantaTier} />
        ) : (
          <div
            ref={fallbackRef}
            data-vanta-fallback={prefsReady ? (reduced ? 'reduced' : 'pending') : 'preference-pending'}
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
            className="absolute inset-0 flex items-center justify-center"
          >
            <h1 className="m-0 text-center">
              <span
                ref={wordmarkRef}
                aria-hidden="true"
                className="hero-title block"
                style={{
                  fontSize: 'clamp(64px, 18.6vw, 21.5rem)',
                }}
              >
                CINEHEIGHT
              </span>
              <span className="sr-only">Cineheight Media — Branding and Digital Growth Agency</span>
            </h1>
          </div>

          <div data-layer="cloud-layer-back" aria-hidden="true" className="absolute inset-0 z-10">
            <div data-layer="cloud-center" className="hero-cloud-plate hero-cloud-center">
              <div data-cloud-parallax="center">
                <div data-cloud-drift="center">
                  <CloudPlate
                    asset={ASSETS.center}
                    name="center"
                    sources={[
                      {
                        media: '(max-width: 767px)',
                        sizes: '(min-width: 715px) 468px, (max-width: 404px) 265px, 65.5vw',
                      },
                      {
                        media: '(min-width: 1280px) and (max-width: 1439px)',
                        sizes: '28.1vw',
                      },
                      {
                        media: '(min-width: 1024px)',
                        sizes: '(min-width: 1901px) 593px, (max-width: 1099px) 343px, 31.2vw',
                      },
                    ]}
                    priority
                  />
                </div>
              </div>
            </div>

            <div data-layer="cloud-left" className="hero-cloud-plate hero-cloud-left">
              <div data-cloud-parallax="left">
                <div data-cloud-drift="left">
                  <CloudPlate
                    asset={ASSETS.left}
                    name="left"
                    sources={[
                      {
                        media: '(min-width: 768px) and (max-width: 1023px)',
                        sizes: '(max-width: 937px) 390px, 41.6vw',
                      },
                      {
                        media: '(min-width: 1024px)',
                        sizes: '(min-width: 1867px) 728px, (max-width: 1199px) 468px, 39vw',
                      },
                    ]}
                    priority
                  />
                </div>
              </div>
            </div>

            <div data-layer="cloud-right" className="hero-cloud-plate hero-cloud-right">
              <div data-cloud-parallax="right">
                <div data-cloud-drift="right">
                  <CloudPlate
                    asset={ASSETS.right}
                    name="right"
                    sources={[
                      {
                        media: '(min-width: 1024px)',
                        sizes: '(min-width: 1879px) 806px, (max-width: 1212px) 520px, 42.9vw',
                      },
                    ]}
                  />
                  </div>
                </div>
              </div>
          </div>
        </div>

        {/* Post-reveal only (FlowThread portals in after ~60%): under statement, over faded title. */}
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
