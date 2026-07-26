'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import CountUp from '@/components/ui/CountUp'
import KineticLabel from '@/components/motion/KineticLabel'
import ScrollHeadline from '@/components/motion/ScrollHeadline'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Results, given the weight they earned.
 *
 * The headline figure takes over the viewport at display scale and counts up;
 * the supporting stats follow at deliberately unequal sizes; and each growth
 * metric is a full-width before → after comparison whose line draws across the
 * page as it enters. No small dashboard bars.
 *
 * Every number here is verified client data from content/caseStudies.ts and is
 * rendered exactly as recorded — the animation only affects how it arrives.
 */
export default function CaseMetrics({ cs }: { cs: CaseStudy }) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      // The takeover figure grows and lifts as it passes through the viewport.
      const hero = self.selector!('[data-takeover]')[0]
      if (hero && !mobile) {
        gsap.fromTo(
          hero,
          { scale: 0.78, yPercent: 14, autoAlpha: 0.35 },
          {
            scale: 1,
            yPercent: -8,
            autoAlpha: 1,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top 92%', end: 'bottom 30%', scrub: 0.7 },
          }
        )
      }

      // Comparison lines draw from the "before" mark to the "after" mark.
      const rows = self.selector!('[data-growth-row]') as HTMLElement[]
      rows.forEach((row) => {
        const after = row.querySelector('[data-growth-after]')
        const before = row.querySelector('[data-growth-before]')
        if (before) {
          gsap.fromTo(before, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: row, start: 'top 84%' } })
        }
        if (after) {
          gsap.fromTo(
            after,
            { scaleX: 0 },
            { scaleX: 1, duration: 1.25, ease: 'power3.out', delay: 0.16, scrollTrigger: { trigger: row, start: 'top 84%' } }
          )
        }
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  const head = cs.headlineStat
  // The headline stat is repeated inside `stats`; show the rest beside it.
  const supporting = cs.stats.filter((s) => s.label !== head.label)

  return (
    <section ref={rootRef} aria-label="Results" className="relative z-10" style={{ marginTop: mobile ? '14vh' : '22vh' }}>
      <div className="flow-gutter">
        <KineticLabel text="WHAT CHANGED" />
        <ScrollHeadline
          as="p"
          text={cs.resultSummary}
          className="font-display measure-wide mt-7 font-bold text-text-100"
          style={{ fontSize: 'clamp(1.25rem, 2.2vw, 2.1rem)', lineHeight: 1.26, letterSpacing: '-0.015em' }}
          from={0.22}
          end="bottom 62%"
        />
      </div>

      {/* ---- the metric that takes over ---- */}
      <div data-takeover className="flow-gutter relative will-change-transform" style={{ marginTop: mobile ? '10vh' : '16vh' }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -inset-y-[30%]"
          style={{ background: `radial-gradient(ellipse 46% 52% at 32% 50%, ${cs.accentColor}26, transparent 70%)` }}
        />
        <p
          className="font-display relative font-bold leading-[0.8] text-text-100"
          style={{ fontSize: 'clamp(5.5rem, 21vw, 20rem)', letterSpacing: '-0.05em' }}
        >
          <CountUp value={head.value} prefix={head.prefix} suffix={head.suffix} duration={1800} />
        </p>
        <p className="font-body relative mt-4 text-base uppercase text-text-300 sm:text-lg" style={{ letterSpacing: '0.14em' }}>
          {head.label}
        </p>
      </div>

      {/* ---- supporting figures at deliberately unequal weights ---- */}
      <ul
        className="flow-gutter flex flex-wrap items-end gap-x-[clamp(2.5rem,7vw,7rem)] gap-y-12"
        style={{ marginTop: mobile ? '9vh' : '13vh' }}
      >
        {supporting.map((stat, i) => (
          <li key={stat.label} className="list-none" style={{ marginTop: i % 2 ? '2.5rem' : 0 }}>
            <p
              className="font-display font-bold leading-none text-text-100"
              style={{ fontSize: i === 0 ? 'clamp(3rem, 7vw, 6rem)' : 'clamp(2.2rem, 4.6vw, 4rem)' }}
            >
              <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
            </p>
            <p className="font-body mt-2.5 max-w-[22ch] text-sm text-text-300">{stat.label}</p>
          </li>
        ))}
      </ul>

      {/* ---- before → after comparisons at full width ---- */}
      <div className="flow-gutter" style={{ marginTop: mobile ? '10vh' : '15vh' }}>
        {cs.growthMetrics.map((metric) => {
          const max = metric.maxValue ?? Math.max(metric.after, metric.before) * 1.2
          return (
            <div key={metric.label} data-growth-row className="relative py-9">
              <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
                <p className="font-display text-base font-medium text-text-200 sm:text-lg" style={{ letterSpacing: '-0.01em' }}>
                  {metric.label}
                </p>
                <p className="font-display font-bold leading-none text-text-100" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)' }}>
                  <span className="font-body mr-3 align-middle text-sm font-normal text-text-500">
                    {metric.before}
                    {metric.suffix} →
                  </span>
                  {metric.after}
                  <span style={{ color: cs.accentColor }}>{metric.suffix}</span>
                </p>
              </div>

              {/* the comparison itself — two drawn lines, not a bar chart */}
              <div className="relative mt-5 h-[7px]" aria-hidden="true">
                <span className="absolute inset-x-0 top-[3px] h-px bg-white/[0.07]" />
                <span
                  data-growth-before
                  className="absolute left-0 top-[3px] h-px origin-left"
                  style={{ width: `${(metric.before / max) * 100}%`, background: 'var(--border-strong)' }}
                />
                <span
                  data-growth-after
                  className="absolute left-0 top-0 h-[3px] origin-left"
                  style={{
                    width: `${(metric.after / max) * 100}%`,
                    background: `linear-gradient(to right, ${cs.accentColor}, var(--blue-400))`,
                    boxShadow: `0 0 12px ${cs.accentColor}80`,
                  }}
                />
              </div>

              {metric.insight && (
                <p className="font-body measure-wide mt-4 text-sm leading-relaxed text-text-500">{metric.insight}</p>
              )}
            </div>
          )
        })}
      </div>

      <div data-flow-anchor="center" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '24%' }} aria-hidden="true" />
      <div data-flow-anchor="edge-right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '70%' }} aria-hidden="true" />
    </section>
  )
}
