'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import { workIndexSlots } from '@/content/mediaSlots'
import KineticLabel from '@/components/motion/KineticLabel'
import WordMaskReveal from '@/components/motion/WordMaskReveal'
import MediaSpecPlaceholder from '@/components/media/MediaSpecPlaceholder'
import CountUp from '@/components/ui/CountUp'
import { clamp, damp } from '@/lib/utils'
import { createManagedFrameLoop } from '@/lib/managedFrame'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { observeVisibleLayerPromotion } from '@/lib/visibleLayerPromotion'

/**
 * Three campaign worlds you walk through, not three cards you browse.
 *
 * Each project owns a major vertical scene whose media runs full bleed and
 * leans toward the pointer; the client name, tagline and verified metric react
 * to proximity; consecutive scenes overlap so one world dissolves into the
 * next; and each scene reveals its own accent under the pointer on hover. The
 * page background itself stays static — no route-wide accent follows you.
 *
 * Nothing is hover-only: every name, metric and link is visible and tappable
 * before any pointer arrives, and the whole scene is one link target.
 */
export default function WorkIndex() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()

  /**
   * Poster entrances.
   *
   * Each scene runs one play-once arrival — a mask opening from an inset
   * rectangle while the image settles from 1.08 to 1 — and then hands over to a
   * separate, permanent scrub for depth. Two triggers rather than one because
   * they answer different questions: "has this arrived yet" is a one-way event,
   * "where is it in the scroll" is continuous.
   *
   * `toggleActions: 'play none none none'` means scrolling back up leaves the
   * poster in its finished state instead of re-hiding it, so an image container
   * is never exposed empty on the way back. The scrim and the copy follow the
   * poster rather than arriving with it, which is what makes the entrance read
   * as photography settling rather than a card animating in.
   */
  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const scenes = self.selector!('[data-scene]') as HTMLElement[]
      scenes.forEach((scene) => {
        const media = scene.querySelector('[data-scene-media]')
        const inner = scene.querySelector('[data-scene-media-inner]')
        const scrim = scene.querySelector('[data-scene-scrim]')
        const copyBlock = scene.querySelector('[data-scene-copy]')

        if (media && inner) {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: scene, start: 'top 85%', toggleActions: 'play none none none' },
          })
          tl.fromTo(
            media,
            { clipPath: 'inset(12% 7% 12% 7%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'power3.out' },
            0
          )
          tl.fromTo(inner, { scale: 1.08 }, { scale: 1, duration: 1.35, ease: 'power3.out' }, 0)
          if (scrim) tl.fromTo(scrim, { opacity: 0.35 }, { opacity: 1, duration: 1, ease: 'power2.out' }, 0.25)
        }

        /*
         * The copy sits at the foot of a near-full-height stage, so it is
         * triggered off its own box, not the scene's. Triggering it off the
         * scene meant it had finished animating a full screen before anyone
         * could see it.
         *
         * `:not([data-own-reveal])` leaves the client name alone — that heading
         * runs its own masked word reveal, and having GSAP fade the same
         * element at the same time would double up on opacity.
         */
        if (copyBlock) {
          const copy = copyBlock.querySelectorAll(':scope > *:not([data-own-reveal])')
          if (copy.length) {
            gsap.fromTo(
              copy,
              { autoAlpha: 0, y: 26 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.85,
                stagger: 0.075,
                ease: 'power3.out',
                scrollTrigger: { trigger: copyBlock, start: 'top 94%', toggleActions: 'play none none none' },
              }
            )
          }
        }

        // Gentle continuous depth, on the inner layer only — the mask above
        // owns the outer box, so the two never fight over the same property.
        if (inner) {
          gsap.fromTo(
            inner,
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: 'none',
              scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: 1 },
            }
          )
        }
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  /**
   * Posters are lazily decoded, so a trigger measured before they lay out can
   * be a screen or more off. One refresh once they have all settled (and one
   * more after fonts) puts every start/end back on the real geometry.
   */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let pending = root.querySelectorAll('img').length
    let raf = 0
    const refresh = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => ScrollTrigger.refresh())
    }
    const settle = () => {
      pending -= 1
      if (pending <= 0) refresh()
    }
    const images = Array.from(root.querySelectorAll('img'))
    images.forEach((img) => {
      if (img.complete) settle()
      else img.addEventListener('load', settle, { once: true })
      img.addEventListener('error', settle, { once: true })
    })
    if (images.length === 0) refresh()
    void document.fonts?.ready.then(refresh)
    return () => {
      cancelAnimationFrame(raf)
      images.forEach((img) => img.removeEventListener('load', settle))
    }
  }, [])

  // Pointer lean, shared by every scene through one loop.
  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    if (!root) return
    const target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    const animation = createManagedFrameLoop((_now, dt) => {
      const f = damp(0.07, dt)
      cur.x += (target.x - cur.x) * f
      cur.y += (target.y - cur.y) * f
      root.style.setProperty('--lean-x', `${(cur.x * 18).toFixed(2)}px`)
      root.style.setProperty('--lean-y', `${(cur.y * 12).toFixed(2)}px`)
      root.style.setProperty('--px', `${(50 + cur.x * 46).toFixed(1)}%`)
      root.style.setProperty('--py', `${(50 + cur.y * 46).toFixed(1)}%`)
      return Math.abs(target.x - cur.x) > 0.002 || Math.abs(target.y - cur.y) > 0.002
    })
    const onMove = (e: PointerEvent) => {
      target.x = clamp(e.clientX / window.innerWidth - 0.5, -0.5, 0.5)
      target.y = clamp(e.clientY / window.innerHeight - 0.5, -0.5, 0.5)
      animation.wake()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    const stopPromotion = observeVisibleLayerPromotion(
      root.querySelectorAll<HTMLElement>('[data-work-index-stage]')
    )
    return () => {
      window.removeEventListener('pointermove', onMove)
      stopPromotion()
      animation.destroy()
    }
  }, [rich])

  return (
    <main
      ref={rootRef}
      className="relative z-10"
      style={{ ['--lean-x' as string]: '0px', ['--lean-y' as string]: '0px', ['--px' as string]: '50%', ['--py' as string]: '50%' }}
    >
      <header className="flow-gutter relative pb-[6vh] pt-32 lg:pt-40">
        <KineticLabel text="THE WORK" />
        {/*
          A masked word reveal with a short focus pull.
          The delay is deliberate: this heading is in the viewport from the
          moment the route mounts, which is while the transition overlay is
          still covering it. Holding for ~0.4s means the reveal begins as the
          overlay lifts, so it is actually watched rather than finishing behind
          a black screen. The previous slice effect slid bands of the letters
          sideways, which is exactly the horizontal wobble this pass is removing.
        */}
        <WordMaskReveal
          as="h1"
          text="Proof, not promises."
          delay={0.4}
          duration={1.05}
          stagger={0.075}
          blur={7}
          className="font-display mt-6 font-bold uppercase text-text-100"
          style={{ fontSize: 'clamp(2.6rem, 10vw, 9rem)', lineHeight: 0.88, letterSpacing: '-0.035em' }}
        />
        <p className="font-body measure mt-8 text-base leading-relaxed text-text-300">
          Three brands, three journeys — strategy, content and campaigns that turned attention into measurable growth.
        </p>
      </header>

      {caseStudies.map((cs, i) => (
        <section
          key={cs.id}
          data-scene={i}
          aria-label={`${cs.client} case study`}
          className="relative"
          // Consecutive worlds overlap — one dissolves into the next.
          style={{ marginTop: i === 0 ? '2vh' : mobile ? '-6vh' : '-12vh' }}
        >
          <Link href={`/work/${cs.id}`} className="group block" aria-label={`${cs.client} — ${cs.tagline}`}>
            <div
              data-work-index-stage
              className="relative w-full overflow-hidden"
              style={{
                height: mobile ? '70svh' : 'clamp(32rem, 88svh, 60rem)',
                transform: rich ? 'translate3d(var(--lean-x), var(--lean-y), 0)' : undefined,
              }}
            >
              {/* Two nested boxes so the mask reveal and the depth scrub own
                  different elements: the outer is clipped, the inner is scaled
                  and drifted. The poster sits under a black stage, so the mask
                  opens onto the page's own background — no white or black flash
                  and never an empty container. */}
              <div data-scene-media className="absolute inset-[-10%]">
                <div data-scene-media-inner className="h-full w-full will-change-transform">
                  <MediaSpecPlaceholder
                    spec={workIndexSlots[cs.id]}
                    alt={`${cs.client} campaign work`}
                    priority={i === 0}
                    className="h-full w-full"
                  />
                </div>
              </div>
              <div
                data-scene-scrim
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(2,3,6,0.94) 3%, rgba(2,3,6,0.5) 42%, rgba(2,3,6,0.2))' }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                style={{ background: `radial-gradient(ellipse 44% 56% at var(--px) var(--py), ${cs.accentColor}38, transparent 70%)` }}
              />

              <div data-scene-copy className="flow-gutter absolute inset-x-0 bottom-0 pb-[7vh]">
                <p className="font-body text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.22em' }}>
                  {cs.category} — {cs.year}
                </p>
                {/* The client's name arrives as its scene does — one masked
                    word reveal, the same gesture as the page heading, so the
                    three project names and the h1 read as one system. */}
                <WordMaskReveal
                  as="h2"
                  data-own-reveal
                  text={cs.client}
                  duration={0.95}
                  stagger={0.06}
                  blur={5}
                  amount={0.15}
                  className="font-display mt-4 font-bold uppercase text-text-100 transition-colors duration-500 group-hover:text-[var(--blue-200)]"
                  style={{ fontSize: 'clamp(2rem, 7.4vw, 7rem)', lineHeight: 0.88, letterSpacing: '-0.035em' }}
                />
                <div className="mt-7 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
                  <p className="font-body measure text-[15px] leading-relaxed text-text-300 sm:text-base">{cs.tagline}</p>
                  <div className="flex items-end gap-5">
                    <p
                      className="font-display font-bold leading-none text-text-100 transition-transform duration-500 group-hover:scale-105"
                      style={{ fontSize: 'clamp(2.4rem, 5.4vw, 4.6rem)', transformOrigin: 'left bottom' }}
                    >
                      <CountUp value={cs.headlineStat.value} prefix={cs.headlineStat.prefix} suffix={cs.headlineStat.suffix} />
                    </p>
                    <p className="font-body max-w-[16ch] pb-1 text-xs text-text-300 sm:text-sm">{cs.headlineStat.label}</p>
                  </div>
                </div>
                {/*
                  The whole scene is still the link. This is the visual promise
                  that it is one: a bordered pill with a drawn underline, a very
                  slow ambient glow, and an arrow that moves on its own. The
                  label itself never moves — only the arrow and the rule do.
                */}
                <span
                  data-work-cta
                  className="font-display mt-8 inline-flex min-h-[44px] items-center gap-3 rounded-full border px-5 py-2.5 text-[12px] font-medium uppercase text-text-100 transition-colors duration-300 group-hover:border-[var(--blue-400)] group-hover:text-[var(--blue-200)] group-focus-visible:border-[var(--blue-400)] group-focus-visible:text-[var(--blue-200)]"
                  style={{ letterSpacing: '0.24em', borderColor: 'var(--blue-alpha-40)', background: 'rgba(2,3,6,0.35)' }}
                >
                  <span className="relative">
                    View case study
                    <span
                      aria-hidden="true"
                      data-work-cta-rule
                      className="absolute -bottom-1 left-0 block h-px w-full origin-left bg-[var(--blue-400)]"
                    />
                  </span>
                  <svg
                    width="26"
                    height="10"
                    viewBox="0 0 26 10"
                    fill="none"
                    aria-hidden="true"
                    data-work-cta-arrow
                    className="transition-transform duration-300 group-hover:translate-x-1.5"
                  >
                    <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
          <div
            data-flow-anchor={i % 2 === 0 ? 'edge-left' : 'edge-right'}
            className="pointer-events-none absolute inset-x-0 h-px"
            style={{ top: '46%' }}
            aria-hidden="true"
          />
        </section>
      ))}
    </main>
  )
}
