'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { services } from '@/content/siteContent'
import Reveal from '@/components/ui/Reveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Services (spec §18) — two large cards per row (one on mobile), ~95vw stage.
 * Title always visible; description reveals on hover/focus and is ALWAYS
 * visible on touch/reduced tiers (no hover-only information, spec §33).
 * Interaction budget: rotateX ≤3° / rotateY ≤4°, pointer-following #0089FF
 * highlight, animated edge trace, internal image parallax — all rAF-driven
 * CSS-variable writes, no React state per frame, no layout shift.
 */

function ServiceCard({ service, coarse }: { service: (typeof services)[number]; coarse: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const target = useRef({ x: 0, y: 0, active: 0 })
  const cur = useRef({ x: 0, y: 0, active: 0 })
  const reduced = useReducedMotion()

  useEffect(() => {
    if (coarse || reduced) return
    const card = cardRef.current
    const inner = innerRef.current
    if (!card || !inner) return

    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect()
      target.current.x = (e.clientX - r.left) / r.width - 0.5
      target.current.y = (e.clientY - r.top) / r.height - 0.5
      target.current.active = 1
      card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
    }
    const onLeave = () => {
      target.current = { x: 0, y: 0, active: 0 }
    }
    const loop = () => {
      const c = cur.current
      const t = target.current
      c.x += (t.x - c.x) * 0.09
      c.y += (t.y - c.y) * 0.09
      c.active += (t.active - c.active) * 0.09
      // rotateX ≤ ±3°, rotateY ≤ ±4° (spec §18 limits)
      inner.style.transform = `perspective(1200px) rotateX(${-c.y * 3}deg) rotateY(${c.x * 4}deg)`
      card.style.setProperty('--glow', String(c.active * 0.55))
      raf.current = requestAnimationFrame(loop)
    }
    card.addEventListener('pointermove', onMove)
    card.addEventListener('pointerleave', onLeave)
    raf.current = requestAnimationFrame(loop)
    return () => {
      card.removeEventListener('pointermove', onMove)
      card.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf.current)
    }
  }, [coarse, reduced])

  const alwaysOpen = coarse || reduced

  return (
    <Reveal as="li" variant="fade-up" amount={0.18} className="group list-none" delay={Number(service.index) % 2 === 0 ? 0.12 : 0}>
      <div ref={cardRef} className="relative" style={{ ['--glow' as string]: 0, ['--mx' as string]: '50%', ['--my' as string]: '50%' }}>
        <div
          ref={innerRef}
          className="relative overflow-hidden rounded-sm will-change-transform"
          style={{ border: '1px solid var(--border)' }}
        >
          {/* artwork + internal parallax on hover */}
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
            <Image
              src={service.image}
              alt=""
              fill
              sizes="(max-width: 767px) 94vw, 47vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
            {/* readability scrim */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(2,3,6,0.92) 4%, rgba(2,3,6,0.42) 42%, rgba(2,3,6,0.16) 100%)' }}
            />
            {/* pointer-following #0089FF highlight (desktop only via --glow) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: 'var(--glow)' as unknown as number,
                background: 'radial-gradient(ellipse 46% 38% at var(--mx) var(--my), rgba(0,137,255,0.16), transparent 70%)',
              }}
            />
            {/* animated edge trace */}
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <rect
                x="1"
                y="1"
                width="calc(100% - 2px)"
                height="calc(100% - 2px)"
                fill="none"
                stroke="var(--blue-500)"
                strokeWidth="1.5"
                pathLength={100}
                strokeDasharray="26 74"
                strokeDashoffset={100}
                className="edge-trace"
                style={{ opacity: 'calc(var(--glow) * 1.2)' as unknown as number }}
              />
            </svg>
          </div>

          {/* copy — title always visible; description masked until hover/focus */}
          <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8">
            <p className="font-body text-[11px] text-text-500" style={{ letterSpacing: '0.24em' }}>
              {service.index}
            </p>
            <h3 className="font-display mt-2 text-xl font-bold text-text-100 sm:text-2xl" style={{ letterSpacing: '-0.01em' }}>
              {service.title}
            </h3>
            <div
              className="overflow-hidden transition-[max-height,opacity] duration-500 ease-out"
              style={{
                maxHeight: alwaysOpen ? 'none' : undefined,
              }}
            >
              <p
                className={
                  alwaysOpen
                    ? 'font-body mt-3 max-w-md text-sm leading-relaxed text-text-300'
                    : 'font-body mt-3 max-w-md text-sm leading-relaxed text-text-300 max-h-0 opacity-0 transition-all duration-500 ease-out group-hover:max-h-24 group-hover:opacity-100 group-focus-within:max-h-24 group-focus-within:opacity-100'
                }
              >
                {service.description}
              </p>
            </div>
          </div>

          {/* focusable target so keyboard users get the same reveal */}
          <a
            href="/services"
            className="absolute inset-0"
            aria-label={`${service.title} — see service details`}
            style={{ outlineOffset: '-3px' }}
          />
        </div>
      </div>
    </Reveal>
  )
}

export default function ServicesGrid() {
  const coarse = useIsMobileTier()

  return (
    <section id="services" aria-label="Services" className="relative pb-[16vh]">
      {/* restrained blue depth in the negative space — local, not a wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] opacity-60"
        style={{ background: 'radial-gradient(ellipse 46% 34% at 18% 22%, rgba(0,137,255,0.06), transparent 70%)' }}
      />
      <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="mb-12 max-w-2xl">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Services
          </span>
          <h2 className="font-display mt-5 font-bold text-text-100" style={{ fontSize: 'clamp(1.8rem, 3.4vw, 3.2rem)', lineHeight: 1.07 }}>
            Everything a brand needs,
            <br />
            under one roof.
          </h2>
        </Reveal>
      </div>

      <ul className="mx-auto grid w-[95vw] max-w-[1800px] grid-cols-1 gap-5 sm:gap-7 md:grid-cols-2">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} coarse={coarse} />
        ))}
      </ul>
    </section>
  )
}
