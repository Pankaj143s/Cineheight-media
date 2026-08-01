'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import { workIndexSlots } from '@/content/mediaSlots'
import KineticLabel from '@/components/motion/KineticLabel'
import OpticalResolve from '@/components/motion/OpticalResolve'
import Reveal from '@/components/ui/Reveal'
import { createManagedFrameLoop } from '@/lib/managedFrame'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { observeVisibleLayerPromotion } from '@/lib/visibleLayerPromotion'

/**
 * The next chapter beginning, not a footer card. Full-width media, the client
 * name at display scale over it, and a pointer response that leans the whole
 * frame — the page transitions directly into the next project.
 */
export default function NextProject({ next }: { next: CaseStudy }) {
  const rootRef = useRef<HTMLAnchorElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()
  /**
   * The same poster the visitor will see for this project on /work.
   *
   * This block used to pull from `presentationMedia`'s `caseCover()`, a second
   * family of reframed covers under /generated/presentation. Two sources for
   * one project meant "next project" advertised a different image from the one
   * the work index showed. `workIndexSlots` is now the single source; there is
   * deliberately no fallback to the old covers, because silently showing a
   * stale image is worse than showing none.
   */
  const slot = workIndexSlots[next.id]

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const inner = self.selector!('[data-next-inner]')[0]
      if (inner) {
        gsap.fromTo(
          inner,
          { yPercent: -9, scale: 1.1 },
          {
            yPercent: 6,
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'bottom bottom', scrub: 1 },
          }
        )
      }
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    const media = mediaRef.current
    if (!root || !media) return
    const target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }

    const animation = createManagedFrameLoop((_now, dt) => {
      const f = damp(0.08, dt)
      cur.x += (target.x - cur.x) * f
      cur.y += (target.y - cur.y) * f
      media.style.transform = `perspective(1600px) rotateY(${(cur.x * 2.4).toFixed(2)}deg) rotateX(${(-cur.y * 1.6).toFixed(2)}deg)`
      root.style.setProperty('--mx', `${50 + cur.x * 40}%`)
      return Math.abs(target.x - cur.x) > 0.002 || Math.abs(target.y - cur.y) > 0.002
    })
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      target.x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5)
      target.y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5)
      animation.wake()
    }
    const onLeave = () => {
      target.x = 0
      target.y = 0
      animation.wake()
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    const stopPromotion = observeVisibleLayerPromotion([media])
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      stopPromotion()
      animation.destroy()
    }
  }, [rich])

  return (
    <section aria-label="Next project" className="relative z-10" style={{ marginTop: mobile ? '8vh' : '12vh' }}>
      <Link
        ref={rootRef}
        href={`/work/${next.id}`}
        className="group relative block w-full overflow-hidden"
        style={{ ['--mx' as string]: '50%' }}
        aria-label={`Next project — ${next.client}: ${next.tagline}`}
      >
        <div
          ref={mediaRef}
          className="relative w-full overflow-hidden"
          // Capped on short desktops so the scene never exceeds the viewport.
          style={{ height: mobile ? '58svh' : 'clamp(30rem, 78svh, 52rem)' }}
        >
          {/* The work-index cover for this project, so the promise here and the
              poster on /work are literally the same file. */}
          <div data-next-inner data-depth-layer="back" className="absolute inset-[-10%]">
            {slot && (
              <picture>
                {/*
                  The mobile variant is emitted only once the slot is fully
                  `ready`. While it is `desktop-ready` the responsive file does
                  not exist on disk, and pointing a <source> at a missing asset
                  would give phones a broken image rather than a smaller one.
                  This mirrors the gating in MediaSpecPlaceholder so both
                  consumers of the slot behave identically.
                */}
                {slot.status === 'ready' && slot.mobile && (
                  <source media="(max-width: 767px)" srcSet={slot.mobile.src} />
                )}
                <source media="(min-width: 768px)" srcSet={slot.desktop.src} />
                <img
                  src={slot.desktop.src}
                  alt=""
                  width={slot.desktop.width}
                  height={slot.desktop.height}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            )}
          </div>
          {/* Two scrims, not one. The vertical gradient alone left the headline
              at roughly 0.47 coverage where it crossed SES's white poster plane
              — white type on a near-white plane. The horizontal one guarantees
              the text column stays dark whatever the cover happens to put
              there, and the covers are built with that column kept quiet too. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(2,3,6,0.94) 4%, rgba(2,3,6,0.72) 34%, rgba(2,3,6,0.3) 68%, rgba(2,3,6,0.22))' }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(2,3,6,0.93) 0%, rgba(2,3,6,0.86) 30%, rgba(2,3,6,0.55) 52%, rgba(2,3,6,0) 78%)' }}
          />
          {/* the next project's accent, warming toward the pointer */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            style={{ background: `radial-gradient(ellipse 40% 60% at var(--mx) 50%, ${next.accentColor}33, transparent 70%)` }}
          />
        </div>

        <div data-depth-layer="front" className="flow-gutter absolute inset-x-0 bottom-0 pb-[7vh]">
          <KineticLabel text="NEXT PROJECT" color="var(--text-500)" />
          {/* Bounded so a long client name wraps inside the darkened column
              instead of running across the artwork to the right edge. */}
          <OpticalResolve
            as="h2"
            text={next.client}
            delay={0.08}
            className="font-display mt-4 font-bold uppercase text-text-100 transition-colors duration-500 group-hover:text-[var(--blue-200)]"
            style={{
              fontSize: 'clamp(2.2rem, 6.4vw, 6.5rem)',
              lineHeight: 0.9,
              letterSpacing: '-0.035em',
              maxWidth: '13ch',
            }}
          />
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Reveal variant="fade-up" delay={0.06} className="font-body measure text-sm leading-relaxed text-text-300">
              {next.hook}
            </Reveal>
            <span
              aria-hidden="true"
              className="h-px transition-all duration-500 group-hover:w-28"
              style={{ width: 56, background: next.accentColor }}
            />
          </div>
        </div>
      </Link>
      <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
