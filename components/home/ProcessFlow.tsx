'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { processSteps } from '@/content/siteContent'
import Reveal from '@/components/ui/Reveal'
import { useIsNarrow, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Process (spec §19) — a horizontal editorial progression (vertical on
 * mobile) with one restrained scroll-linked #0089FF progress line. Numbers
 * surface first, titles follow, descriptions last; the step nearest the line's
 * tip carries emphasis. No boxes, no icon set — typography and one line.
 */
export default function ProcessFlow() {
  const rootRef = useRef<HTMLElement>(null)
  const narrow = useIsNarrow(767)
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const line = self.selector!('[data-progress-line]')[0] as HTMLElement
      const steps = self.selector!('[data-step]') as HTMLElement[]
      if (!line) return

      gsap.fromTo(
        line,
        { scaleX: narrow ? 1 : 0, scaleY: narrow ? 0 : 1 },
        {
          scaleX: 1,
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top 62%',
            end: narrow ? 'bottom 78%' : 'bottom 72%',
            scrub: 0.5,
            onUpdate: (st) => {
              // emphasis follows the tip — pure class toggles, no React state
              const idx = Math.min(steps.length - 1, Math.floor(st.progress * steps.length))
              steps.forEach((el, i) => {
                el.style.opacity = i <= idx ? '1' : '0.38'
              })
            },
          },
        }
      )

      // numbers first, then titles, then descriptions (staggered entrance)
      steps.forEach((el, i) => {
        const parts = [el.querySelector('[data-num]'), el.querySelector('[data-title]'), el.querySelector('[data-desc]')]
        gsap.fromTo(
          parts,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.14,
            ease: 'power2.out',
            delay: i * 0.08,
            scrollTrigger: { trigger: el, start: 'top 78%' },
          }
        )
      })
    }, rootRef)
    return () => ctx.revert()
  }, [narrow, reduced])

  return (
    <section ref={rootRef} id="process" aria-label="Our process" className="relative pb-[16vh]">
      <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="mb-14 max-w-2xl">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Process
          </span>
          <h2 className="font-display mt-5 font-bold text-text-100" style={{ fontSize: 'clamp(1.8rem, 3.4vw, 3.2rem)', lineHeight: 1.07 }}>
            Four beats. One connected journey.
          </h2>
        </Reveal>

        <ol className={narrow ? 'relative flex flex-col gap-12 pl-8' : 'relative grid grid-cols-4 gap-8 pt-10'}>
          {/* the progress line — scaleX (desktop) / scaleY (mobile) via scrub */}
          <div
            aria-hidden="true"
            data-progress-line
            className={narrow ? 'absolute left-0 top-0 h-full w-px origin-top' : 'absolute left-0 top-0 h-px w-full origin-left'}
            style={{
              background: 'linear-gradient(to right, var(--blue-500), rgba(0,137,255,0.25))',
              boxShadow: '0 0 8px rgba(0,137,255,0.35)',
              transform: reduced ? 'none' : undefined,
            }}
          />
          {processSteps.map((stepItem) => (
            <li key={stepItem.index} data-step className="list-none" style={{ opacity: reduced ? 1 : undefined, transition: 'opacity 0.4s linear' }}>
              <p data-num className="font-display text-sm font-medium" style={{ color: 'var(--blue-400)', letterSpacing: '0.2em' }}>
                {stepItem.index}
              </p>
              <h3 data-title className="font-display mt-3 text-xl font-bold text-text-100 sm:text-2xl">
                {stepItem.title}
              </h3>
              <p data-desc className="font-body mt-3 max-w-[34ch] text-sm leading-relaxed text-text-300">
                {stepItem.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
