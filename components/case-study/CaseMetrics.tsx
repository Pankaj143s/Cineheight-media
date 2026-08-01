'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import type { CaseStudy } from '@/content/caseStudies'
import type { CaseMetric, CasePresentation } from '@/content/caseStudyPresentation'
import CountUp from '@/components/ui/CountUp'
import KineticLabel from '@/components/motion/KineticLabel'
import Reveal from '@/components/ui/Reveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { SCRUB } from '@/lib/motionTokens'

/**
 * Act 4 — results, once.
 *
 * The old version showed every figure four times: inside the `resultSummary`
 * prose, then as a headline stat, then as supporting stats, then again as four
 * before→after comparison rows. Sapale additionally showed "250+ sales
 * enquiries" beside "4× more enquiries", which read as a contradiction.
 *
 * Now: one dominant metric, three supporting metrics on a regular grid, one
 * short conclusion, and the before→after detail folded INSIDE each metric as a
 * quiet line rather than a fifth restatement. The curated list lives in
 * `caseStudyPresentation.ts`; `resultSummary` and the full `stats` array remain
 * in the source data and are still exposed to assistive technology.
 */

function MetricBlock({
  metric,
  accent,
  size,
}: {
  metric: CaseMetric
  accent: string
  size: 'dominant' | 'supporting'
}) {
  const dominant = size === 'dominant'
  const hasRange = metric.before !== undefined && metric.after !== undefined

  return (
    <div data-metric className="relative">
      <p
        className="font-display font-bold leading-[0.85] text-text-100"
        style={{
          fontSize: dominant
            ? 'calc(clamp(4.5rem, 13vw, 12rem) * var(--display-scale))'
            : 'calc(clamp(2.4rem, 4.4vw, 4rem) * var(--display-scale))',
          letterSpacing: '-0.04em',
        }}
      >
        <CountUp
          value={metric.value}
          prefix={metric.prefix}
          suffix={metric.suffix}
          duration={dominant ? 1800 : 1300}
        />
      </p>
      <p
        className="font-body mt-3 text-text-200"
        style={{
          fontSize: dominant ? 'clamp(0.95rem, 1.3vw, 1.15rem)' : '0.9rem',
          letterSpacing: dominant ? '0.12em' : '0.04em',
          textTransform: dominant ? 'uppercase' : 'none',
          maxWidth: '22ch',
        }}
      >
        {metric.label}
      </p>
      {metric.note && (
        <p className="font-body mt-2 text-[13px] leading-relaxed text-text-500" style={{ maxWidth: '30ch' }}>
          {metric.note}
        </p>
      )}
      {hasRange && (
        // The comparison lives inside the metric — a quiet detail, not its own
        // row repeating the same figure a fourth time.
        <div className="mt-4 flex items-center gap-3" aria-hidden="true">
          <span className="font-body text-[11px] tabular-nums text-text-500">{metric.before}</span>
          <span className="relative h-px flex-1 max-w-[7rem] bg-white/[0.08]">
            <span
              data-metric-bar
              className="absolute inset-y-0 left-0 block origin-left"
              style={{
                width: `${Math.min(100, (metric.after! / (metric.maxValue ?? metric.after! * 1.2)) * 100)}%`,
                background: accent,
                boxShadow: `0 0 8px ${accent}88`,
                height: 2,
                top: -0.5,
              }}
            />
          </span>
          <span className="font-body text-[11px] tabular-nums text-text-300">{metric.after}</span>
        </div>
      )}
    </div>
  )
}

export default function CaseMetrics({
  cs,
  presentation,
}: {
  cs: CaseStudy
  presentation: CasePresentation
}) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const dominant = self.selector!('[data-dominant]')[0]
      if (dominant && !mobile) {
        gsap.fromTo(
          dominant,
          { scale: 0.86, yPercent: 10, autoAlpha: 0.4 },
          {
            scale: 1,
            yPercent: -4,
            autoAlpha: 1,
            ease: 'none',
            scrollTrigger: { trigger: dominant, start: 'top 92%', end: 'bottom 40%', scrub: 0.7 },
          }
        )
      }
      const bars = self.selector!('[data-metric-bar]') as HTMLElement[]
      bars.forEach((bar) => {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: bar, start: 'top 90%', end: 'top 55%', scrub: SCRUB.text },
          }
        )
      })
      const supporting = self.selector!('[data-supporting] > *') as HTMLElement[]
      if (supporting.length) {
        gsap.fromTo(
          supporting,
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.09,
            ease: 'none',
            scrollTrigger: { trigger: supporting[0], start: 'top 86%', end: 'top 48%', scrub: SCRUB.text },
          }
        )
      }
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  return (
    <section
      ref={rootRef}
      aria-label="Results"
      className="relative z-10"
      style={{ marginTop: 'calc(clamp(4.5rem, 16vh, 13rem) * var(--scene-gap))' }}
    >
      <div className="flow-gutter relative">
        <span
          aria-hidden="true"
          className="font-body absolute -top-7 left-[var(--gutter)] text-[11px] text-text-500"
          style={{ letterSpacing: '0.3em' }}
        >
          03
        </span>
        <KineticLabel text="THE RESULT" />
      </div>

      {/* Dominant metric + the single conclusion sentence, side by side on
          desktop so the number leads and the sentence explains it. */}
      <div className="flow-gutter mt-10 grid grid-cols-1 items-end gap-x-16 gap-y-8 lg:grid-cols-12">
        <div data-dominant className="lg:col-span-6 will-change-transform">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -my-[10%] h-[60%]"
            style={{
              background: `radial-gradient(ellipse 40% 60% at 24% 50%, ${cs.accentColor}1f, transparent 70%)`,
            }}
          />
          <div className="relative">
            <MetricBlock metric={presentation.primaryMetric} accent={cs.accentColor} size="dominant" />
          </div>
        </div>
        <Reveal
          variant="fade-up"
          delay={0.06}
          className="font-body text-base leading-relaxed text-text-200 lg:col-span-5 lg:col-start-8 sm:text-lg"
          style={{ maxWidth: '46ch' }}
        >
          {presentation.resultLead}
        </Reveal>
      </div>

      {/* Supporting metrics on a regular grid — a clear relationship, not
          deliberately unequal sizes the reader has to decode. */}
      <div
        data-supporting
        className="flow-gutter mt-[clamp(3rem,9vh,6rem)] grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
      >
        {presentation.metrics.map((m) => (
          <MetricBlock key={m.label} metric={m} accent={cs.accentColor} size="supporting" />
        ))}
      </div>

      {presentation.secondaryProof && (
        <Reveal variant="fade-up" className="flow-gutter font-body mt-10 text-sm text-text-500">
          <span className="font-display font-bold text-text-300">
            {presentation.secondaryProof.prefix}
            {presentation.secondaryProof.value}
            {presentation.secondaryProof.suffix}
          </span>{' '}
          {presentation.secondaryProof.label.toLowerCase()} across the campaign.
        </Reveal>
      )}

      {/* The verified summary and full stat list stay available in full. */}
      <p className="sr-only">
        {cs.resultSummary}{' '}
        {cs.stats.map((s) => `${s.prefix ?? ''}${s.value}${s.suffix ?? ''} ${s.label}.`).join(' ')}
      </p>

      <div data-flow-anchor="edge-right" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
