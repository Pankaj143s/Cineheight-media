'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { processSteps } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * How we work — the four verified beats, compactly.
 *
 * This replaces a 260vh pinned sequence in which each word took over the screen
 * in turn. It was striking and it cost nearly three screens to communicate four
 * short steps. Here the same idea — the signal travelling through four states —
 * is expressed in roughly two thirds of one screen, with no pin at all, so the
 * homepage keeps moving.
 *
 * The connecting line draws with scroll and each step lights as the line
 * reaches it; the steps are fully legible before any of that happens.
 */
export default function ProcessCompact() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const line = self.selector!('[data-line]')[0] as HTMLElement
      const steps = self.selector!('[data-step]') as HTMLElement[]
      if (!line || !steps.length) return

      gsap.fromTo(
        line,
        { scaleX: mobile ? 1 : 0, scaleY: mobile ? 0 : 1 },
        {
          scaleX: 1,
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: mobile ? 'top 78%' : 'top 72%',
            end: mobile ? 'bottom 82%' : 'bottom 78%',
            scrub: 0.5,
            onUpdate: (st) => {
              const reached = Math.min(steps.length - 1, Math.floor(st.progress * steps.length))
              steps.forEach((el, i) => {
                // Never below 0.45 — a step must stay readable even before the
                // signal gets to it.
                el.style.opacity = i <= reached ? '1' : '0.45'
              })
            },
          },
        }
      )

      steps.forEach((el, i) => {
        gsap.fromTo(
          el.children,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power2.out',
            delay: i * 0.06,
            scrollTrigger: { trigger: el, start: 'top 86%' },
          }
        )
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  return (
    <section
      ref={rootRef}
      id="process"
      aria-label="How we work"
      className="relative z-10"
      style={{ marginTop: 'calc(clamp(3.5rem, 10vh, 8rem) * var(--scene-gap))' }}
    >
      <div className="flow-gutter">
        <KineticLabel text="HOW WE WORK" />
        <SplitLineReveal
          as="h2"
          lines={['One team. One', 'continuous journey.']}
          srLabel="One team. One continuous journey."
          className="type-display-2 font-display mt-6 font-bold uppercase text-text-100"
          style={{ maxWidth: '20ch' }}
        />
        <p className="font-body measure mt-6 text-[15px] leading-relaxed text-text-300">
          Strategy, design, content and campaigns handled end to end — so nothing is lost between agencies.
        </p>
      </div>

      <ol
        className={
          mobile
            ? 'flow-gutter relative mt-10 flex flex-col gap-9 pl-8'
            : 'flow-gutter relative mt-14 grid grid-cols-4 gap-x-8 pt-10'
        }
      >
        <span
          aria-hidden="true"
          data-line
          className={
            mobile
              ? 'absolute bottom-6 left-[calc(var(--gutter)+3px)] top-2 w-px origin-top'
              : 'absolute left-[var(--gutter)] right-[var(--gutter)] top-0 h-px origin-left'
          }
          style={{
            background: 'linear-gradient(to right, var(--blue-500), rgba(0,137,255,0.18))',
            boxShadow: '0 0 8px rgba(0,137,255,0.32)',
          }}
        />

        {processSteps.map((step) => (
          <li
            key={step.index}
            data-step
            className="relative list-none"
            style={{ opacity: reduced ? 1 : 0.45, transition: 'opacity 0.45s linear' }}
          >
            {!mobile && (
              <span
                aria-hidden="true"
                className="absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--blue-500)', boxShadow: '0 0 10px 2px rgba(0,137,255,0.5)' }}
              />
            )}
            {mobile && (
              <span
                aria-hidden="true"
                className="absolute -left-8 top-2 h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--blue-500)', boxShadow: '0 0 10px 2px rgba(0,137,255,0.5)' }}
              />
            )}
            <p className="font-body pt-5 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.24em' }}>
              {step.index}
            </p>
            <h3 className="type-display-3 font-display mt-2 font-bold uppercase text-text-100">
              {step.title}
            </h3>
            <p className="font-body mt-3 max-w-[30ch] text-sm leading-relaxed text-text-300">
              {step.description}
            </p>
          </li>
        ))}
      </ol>

      <div data-flow-anchor="left" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
