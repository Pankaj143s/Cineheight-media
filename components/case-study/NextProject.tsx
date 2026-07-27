'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import { caseCover } from '@/content/presentationMedia'
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
  const cover = caseCover(next.id)

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
    <section aria-label="Next project" className="relative z-10" style={{ marginTop: mobile ? '12vh' : '18vh' }}>
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
          {/* Dedicated 16:9 / 4:5 covers rather than a square reel poster
              stretched across a full-width stage — that discarded roughly 40%
              of the client's frame. */}
          <div data-next-inner className="absolute inset-[-10%]">
            <picture>
              <source media="(max-width: 767px)" srcSet={cover.mobile.src} />
              <source media="(min-width: 768px)" srcSet={cover.desktop.src} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.desktop.src}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </picture>
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

        <div className="flow-gutter absolute inset-x-0 bottom-0 pb-[7vh]">
          <p className="font-display text-[11px] font-medium uppercase text-text-500" style={{ letterSpacing: '0.3em' }}>
            Next project
          </p>
          {/* Bounded so a long client name wraps inside the darkened column
              instead of running across the artwork to the right edge. */}
          <h2
            className="font-display mt-4 font-bold uppercase text-text-100 transition-colors duration-500 group-hover:text-[var(--blue-200)]"
            style={{
              fontSize: 'clamp(2.2rem, 6.4vw, 6.5rem)',
              lineHeight: 0.9,
              letterSpacing: '-0.035em',
              maxWidth: '13ch',
            }}
          >
            {next.client}
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <p className="font-body measure text-sm leading-relaxed text-text-300">{next.hook}</p>
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
