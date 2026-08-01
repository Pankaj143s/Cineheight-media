'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import { workIndexSlots } from '@/content/mediaSlots'
import KineticLabel from '@/components/motion/KineticLabel'
import OpticalResolve from '@/components/motion/OpticalResolve'
import EditorialMatteReveal from '@/components/motion/EditorialMatteReveal'
import Reveal from '@/components/ui/Reveal'
import MediaSpecPlaceholder from '@/components/media/MediaSpecPlaceholder'
import CountUp from '@/components/ui/CountUp'
import { clamp, damp } from '@/lib/utils'
import { createManagedFrameLoop } from '@/lib/managedFrame'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { observeVisibleLayerPromotion } from '@/lib/visibleLayerPromotion'
import { LIQUID_STAGGER } from '@/lib/liquidMedia/tokens'
import { applyMotionFinalState } from '@/lib/liquidMedia/finalState'
import { SCRUB } from '@/lib/motionTokens'

/**
 * Cinematic portfolio index — full-bleed project worlds, not a card grid.
 *
 * Signature: optical resolve on “Proof, not promises.” + vertical-rise editorial
 * mattes between projects (distinct from homepage Selected Work diagonal wipe).
 */
export default function WorkIndex() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const scenes = self.selector!('[data-scene]') as HTMLElement[]
      scenes.forEach((scene) => {
        const copyBlock = scene.querySelector('[data-scene-copy]')
        const inner = scene.querySelector('[data-scene-media-inner]')

        if (copyBlock) {
          const copy = copyBlock.querySelectorAll(':scope > *:not([data-own-reveal])')
          if (copy.length) {
            gsap.fromTo(
              copy,
              { autoAlpha: 0, y: mobile ? 16 : 22 },
              {
                autoAlpha: 1,
                y: 0,
                stagger: LIQUID_STAGGER.word,
                ease: 'none',
                scrollTrigger: {
                  trigger: copyBlock,
                  start: 'top 92%',
                  end: 'top 48%',
                  scrub: SCRUB.text,
                },
              }
            )
          }
        }

        if (inner && !mobile) {
          gsap.fromTo(
            inner,
            { yPercent: -4 },
            {
              yPercent: 4,
              ease: 'none',
              scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: 1 },
            }
          )
        }
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

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
      root.style.setProperty('--lean-x', `${(cur.x * 14).toFixed(2)}px`)
      root.style.setProperty('--lean-y', `${(cur.y * 10).toFixed(2)}px`)
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

  useEffect(() => {
    if (!reduced) return
    const root = rootRef.current
    if (!root) return
    applyMotionFinalState(root.querySelectorAll('[data-scene-copy] > *, [data-opt-word], [data-matte-inner]'))
  }, [reduced])

  return (
    <main
      ref={rootRef}
      className="relative z-10"
      style={{ ['--lean-x' as string]: '0px', ['--lean-y' as string]: '0px', ['--px' as string]: '50%', ['--py' as string]: '50%' }}
    >
      <header className="flow-gutter relative pb-[4vh] pt-32 lg:pt-36">
        <KineticLabel text="THE WORK" />
        <OpticalResolve
          as="h1"
          dataAudit="work-heading"
          text="Proof, not promises."
          delay={0.38}
          accentWords={['promises.']}
          className="font-display mt-6 font-bold uppercase text-text-100"
          style={{ fontSize: 'clamp(2.6rem, 10vw, 9rem)', lineHeight: 0.88, letterSpacing: '-0.035em' }}
        />
        <Reveal variant="fade-up" delay={0.06} className="font-body measure mt-8 text-base leading-relaxed text-text-300">
          Three brands. Real journeys — strategy, content and campaigns that turned attention into growth.
        </Reveal>
      </header>

      {caseStudies.map((cs, i) => {
        const matteForm = i % 2 === 0 ? 'vertical-rise' : 'soft-iris'
        return (
          <section
            key={cs.id}
            data-scene={i}
            aria-label={`${cs.client} case study`}
            className="relative"
            style={{ marginTop: i === 0 ? '1vh' : mobile ? '-4vh' : '-10vh' }}
          >
            <Link href={`/work/${cs.id}`} className="group block" aria-label={`${cs.client} — ${cs.tagline}`}>
              <EditorialMatteReveal form={matteForm} start={i === 0 ? 'top 88%' : 'top 78%'}>
                <div
                  data-work-index-stage
                  className="relative w-full overflow-hidden"
                  style={{
                    height: mobile ? '72svh' : 'min(92svh, 58rem)',
                    transform: rich && !mobile ? 'translate3d(var(--lean-x), var(--lean-y), 0)' : undefined,
                    background: 'var(--bg-950)',
                  }}
                >
                  <div data-scene-media className="absolute inset-[-8%]">
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
                    style={{
                      background:
                        'linear-gradient(to top, rgba(2,3,6,0.96) 4%, rgba(2,3,6,0.48) 40%, rgba(2,3,6,0.18) 70%)',
                    }}
                  />
                  {!mobile && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                      style={{
                        background: `radial-gradient(ellipse 44% 56% at var(--px) var(--py), ${cs.accentColor}30, transparent 70%)`,
                      }}
                    />
                  )}

                  <div data-scene-copy className="flow-gutter absolute inset-x-0 bottom-0 pb-[6vh]">
                    <p className="font-body text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.22em' }}>
                      {cs.category} — {cs.year}
                    </p>
                    <h2
                      className="font-display mt-4 font-bold uppercase text-text-100 transition-colors duration-500 group-hover:text-[var(--blue-200)]"
                      style={{ fontSize: 'clamp(2rem, 7.4vw, 7rem)', lineHeight: 0.88, letterSpacing: '-0.035em' }}
                    >
                      {cs.client}
                    </h2>
                    <div className="mt-6 flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
                      <p className="font-body measure text-[15px] leading-relaxed text-text-300 sm:text-base">{cs.tagline}</p>
                      <div className="flex items-end gap-5">
                        <p
                          className="font-display font-bold leading-none text-text-100"
                          style={{ fontSize: 'clamp(2.2rem, 5vw, 4.2rem)', transformOrigin: 'left bottom' }}
                        >
                          <CountUp value={cs.headlineStat.value} prefix={cs.headlineStat.prefix} suffix={cs.headlineStat.suffix} />
                        </p>
                        <p className="font-body max-w-[16ch] pb-1 text-xs text-text-300 sm:text-sm">{cs.headlineStat.label}</p>
                      </div>
                    </div>
                    <span
                      data-work-cta
                      className="font-display mt-7 inline-flex min-h-[44px] items-center gap-3 rounded-full border px-5 py-2.5 text-[12px] font-medium uppercase text-text-100 transition-colors duration-300 group-hover:border-[var(--blue-400)] group-hover:text-[var(--blue-200)] group-focus-visible:border-[var(--blue-400)]"
                      style={{ letterSpacing: '0.24em', borderColor: 'var(--blue-alpha-40)', background: 'rgba(2,3,6,0.35)' }}
                    >
                      <span>View case study</span>
                      <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
                        <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </EditorialMatteReveal>
            </Link>
            <div
              data-flow-anchor={i % 2 === 0 ? 'edge-left' : 'edge-right'}
              className="pointer-events-none absolute inset-x-0 h-px"
              style={{ top: '46%' }}
              aria-hidden="true"
            />
          </section>
        )
      })}
    </main>
  )
}
