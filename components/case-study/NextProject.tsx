'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

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
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      const f = damp(0.08, dt)
      cur.x += (target.x - cur.x) * f
      cur.y += (target.y - cur.y) * f
      media.style.transform = `perspective(1600px) rotateY(${(cur.x * 2.4).toFixed(2)}deg) rotateX(${(-cur.y * 1.6).toFixed(2)}deg)`
      root.style.setProperty('--mx', `${50 + cur.x * 40}%`)
      raf = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      target.x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5)
      target.y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5)
    }
    const onLeave = () => {
      target.x = 0
      target.y = 0
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
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
          className="relative w-full overflow-hidden will-change-transform"
          style={{ height: mobile ? '58vh' : '84vh' }}
        >
          <div data-next-inner className="absolute inset-[-10%]">
            <Image
              src={next.thumbnail}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(2,3,6,0.92) 4%, rgba(2,3,6,0.5) 40%, rgba(2,3,6,0.25))' }}
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
          <h2
            className="font-display mt-4 font-bold uppercase text-text-100 transition-colors duration-500 group-hover:text-[var(--blue-200)]"
            style={{ fontSize: 'clamp(2.2rem, 8vw, 8rem)', lineHeight: 0.88, letterSpacing: '-0.035em' }}
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
