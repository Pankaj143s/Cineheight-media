'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import { workIndexSlots } from '@/content/mediaSlots'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import MediaSpecPlaceholder from '@/components/media/MediaSpecPlaceholder'
import CountUp from '@/components/ui/CountUp'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Three campaign worlds you walk through, not three cards you browse.
 *
 * Each project owns a major vertical scene whose media runs full bleed and
 * leans toward the pointer; the client name, tagline and verified metric react
 * to proximity; consecutive scenes overlap so one world dissolves into the
 * next; and the page's accent shifts to whichever project currently holds the
 * viewport.
 *
 * Nothing is hover-only: every name, metric and link is visible and tappable
 * before any pointer arrives, and the whole scene is one link target.
 */
export default function WorkIndex() {
  const rootRef = useRef<HTMLElement>(null)
  const accentRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()
  const [current, setCurrent] = useState(0)

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const scenes = self.selector!('[data-scene]') as HTMLElement[]
      scenes.forEach((scene) => {
        const inner = scene.querySelector('[data-scene-media]')
        if (inner) {
          gsap.fromTo(
            inner,
            { yPercent: -8, scale: 1.12 },
            {
              yPercent: 8,
              scale: 1,
              ease: 'none',
              scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: 1 },
            }
          )
        }
        gsap.fromTo(
          scene.querySelectorAll('[data-scene-copy] > *'),
          { autoAlpha: 0, y: 34 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: { trigger: scene, start: 'top 68%' },
          }
        )
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  // Which world currently holds the viewport — drives the background accent.
  useEffect(() => {
    const scenes = rootRef.current?.querySelectorAll('[data-scene]')
    if (!scenes) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.intersectionRatio > 0.45) {
            const i = Number((e.target as HTMLElement).dataset.scene)
            setCurrent(i)
          }
        })
      },
      { threshold: [0, 0.45, 0.8] }
    )
    scenes.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  // Pointer lean, shared by every scene through one loop.
  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    if (!root) return
    const target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      const f = damp(0.07, dt)
      cur.x += (target.x - cur.x) * f
      cur.y += (target.y - cur.y) * f
      root.style.setProperty('--lean-x', `${(cur.x * 18).toFixed(2)}px`)
      root.style.setProperty('--lean-y', `${(cur.y * 12).toFixed(2)}px`)
      root.style.setProperty('--px', `${(50 + cur.x * 46).toFixed(1)}%`)
      root.style.setProperty('--py', `${(50 + cur.y * 46).toFixed(1)}%`)
      raf = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      target.x = clamp(e.clientX / window.innerWidth - 0.5, -0.5, 0.5)
      target.y = clamp(e.clientY / window.innerHeight - 0.5, -0.5, 0.5)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [rich])

  return (
    <main
      ref={rootRef}
      className="relative z-10"
      style={{ ['--lean-x' as string]: '0px', ['--lean-y' as string]: '0px', ['--px' as string]: '50%', ['--py' as string]: '50%' }}
    >
      {/* the accent of whichever world you are standing in */}
      <div
        ref={accentRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 transition-[background] duration-[1200ms]"
        style={{
          background: `radial-gradient(ellipse 60% 46% at var(--px) var(--py), ${caseStudies[current].accentColor}1f, transparent 72%)`,
        }}
      />

      <header className="flow-gutter relative pb-[6vh] pt-32 lg:pt-40">
        <KineticLabel text="THE WORK" />
        <SplitLineReveal
          as="h1"
          lines={['Proof,', 'not promises.']}
          srLabel="Proof, not promises."
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
              className="relative w-full overflow-hidden"
              style={{
                height: mobile ? '70svh' : 'clamp(32rem, 88svh, 60rem)',
                transform: rich ? 'translate3d(var(--lean-x), var(--lean-y), 0)' : undefined,
                willChange: rich ? 'transform' : undefined,
              }}
            >
              {/* Client is producing final index covers for this design — a
                  designed placeholder ships until they land (see
                  content/mediaSlots.ts + docs/FINAL-WORK-MEDIA-SPECS.md). */}
              <div data-scene-media className="absolute inset-[-10%]">
                <MediaSpecPlaceholder
                  spec={workIndexSlots[cs.id]}
                  alt={`${cs.client} campaign work`}
                  priority={i === 0}
                  className="h-full w-full"
                />
              </div>
              <div
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
                <h2
                  className="font-display mt-4 font-bold uppercase text-text-100 transition-colors duration-500 group-hover:text-[var(--blue-200)]"
                  style={{ fontSize: 'clamp(2rem, 7.4vw, 7rem)', lineHeight: 0.88, letterSpacing: '-0.035em' }}
                >
                  {cs.client}
                </h2>
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
                <span
                  className="font-display mt-8 inline-flex min-h-[44px] items-center gap-3 text-[12px] font-medium uppercase text-text-200 transition-colors duration-300 group-hover:text-[var(--blue-400)]"
                  style={{ letterSpacing: '0.24em' }}
                >
                  View case study
                  <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
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
