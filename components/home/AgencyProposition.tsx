'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier } from '@/lib/useMediaPreferences'

/**
 * The plain-English answer to "what is this company?", placed immediately after
 * the showreel where a first-time visitor asks it.
 *
 * It reads as an editorial continuation of the film — no box, no card, no rule
 * above it — but it is deliberately unambiguous: one H2, one paragraph naming
 * the actual disciplines, and exactly two ways onward.
 *
 * Motion is restrained on purpose. The headline arrives on line masks and the
 * whole block takes a few pixels of pointer depth; the paragraph never moves
 * once it has settled, because body copy that drifts is body copy nobody reads.
 */
export default function AgencyProposition() {
  const rootRef = useRef<HTMLElement>(null)
  const depthRef = useRef<HTMLDivElement>(null)
  const rich = useCanRunRichEffects()
  const mobile = useIsMobileTier()

  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    const depth = depthRef.current
    if (!root || !depth) return

    const t = { x: 0, y: 0 }
    const c = { x: 0, y: 0 }
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      const f = damp(0.06, dt)
      c.x += (t.x - c.x) * f
      c.y += (t.y - c.y) * f
      // A few pixels only — enough to feel alive, never enough to distract.
      depth.style.transform = `translate3d(${(c.x * 10).toFixed(2)}px, ${(c.y * 6).toFixed(2)}px, 0)`
      root.style.setProperty('--px', `${(50 + c.x * 40).toFixed(1)}%`)
      root.style.setProperty('--py', `${(50 + c.y * 40).toFixed(1)}%`)
      raf = requestAnimationFrame(loop)
    }

    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      t.x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5)
      t.y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5)
    }
    const onLeave = () => { t.x = 0; t.y = 0 }

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
    <section
      ref={rootRef}
      id="what-we-do"
      aria-label="What Cineheight does"
      className="relative z-10"
      style={{
        // Rides up into the showreel's lower feather — the film keeps going
        // straight into the statement, with no boundary between them.
        marginTop: mobile ? '-2vh' : '-6vh',
        paddingTop: 'calc(clamp(4rem, 12vh, 10rem) * var(--scene-gap))',
        ['--px' as string]: '50%',
        ['--py' as string]: '50%',
      }}
    >
      {rich && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 46% 60% at var(--px) var(--py), rgba(0,137,255,0.07), transparent 70%)',
          }}
        />
      )}

      {/* slow background crop/mask shift — independent of the pointer light above */}
      <div
        aria-hidden="true"
        data-parallax-scale="0.02"
        data-parallax-y="0.03"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 78% 30%, rgba(0,137,255,0.045), transparent 68%)',
        }}
      />

      <div ref={depthRef} className="flow-gutter relative will-change-transform">
        <div data-parallax-y="0.09">
          <KineticLabel text="WHAT WE DO" />
        </div>

        <div data-parallax-y="0.16">
          <SplitLineReveal
            as="h2"
            lines={['We build brands people', 'notice, trust and choose.']}
            srLabel="We build brands people notice, trust and choose."
            className="type-display-1 font-display mt-7 font-bold uppercase text-text-100"
            style={{ maxWidth: '20ch' }}
          />
        </div>

        <div
          aria-hidden="true"
          data-parallax-y="0.24"
          data-parallax-x="0.05"
          className="mt-8 h-px w-24 origin-left"
          style={{ background: 'linear-gradient(to right, var(--blue-500), rgba(0,137,255,0))' }}
        />

        <div data-parallax-y="0.06">
          <p className="font-body measure-wide mt-6 text-base leading-relaxed text-text-200 sm:text-lg">
            Cineheight is a full-service creative and growth agency. We combine brand strategy and identity design
            with social media management, content creation, video and reel production, campaign execution and
            performance marketing — turning growing businesses into brands people remember, and attention into
            measurable growth.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4">
          <Link
            href="/work"
            className="group font-display inline-flex min-h-[48px] items-center gap-3 text-[12px] font-medium uppercase text-text-100 transition-colors duration-300 hover:text-[var(--blue-400)]"
            style={{ letterSpacing: '0.24em' }}
          >
            Explore our work
            <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
              <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </Link>
          <Link
            href="/services"
            className="group font-display inline-flex min-h-[48px] items-center gap-3 text-[12px] font-medium uppercase text-text-300 transition-colors duration-300 hover:text-[var(--blue-400)]"
            style={{ letterSpacing: '0.24em' }}
          >
            View our services
            <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
              <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </Link>
        </div>
      </div>

      <div data-flow-anchor="left" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
