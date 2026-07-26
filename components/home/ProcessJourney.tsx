'use client'

import { useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { processSteps } from '@/content/siteContent'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The process as the signal passing through four states rather than a row of
 * four numbered boxes.
 *
 * Each word grows to editorial scale as the thread reaches it while the
 * previous word recedes into the background; the supporting line unmasks
 * beneath it; a single continuous indicator tracks the whole journey. Nothing
 * to click — the scroll tells the story.
 *
 * This is the SHORT pin (200vh over one sticky viewport), and it is dropped
 * entirely on the mobile tier so scrolling is never trapped.
 */
export default function ProcessJourney() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)

  useIsomorphicLayoutEffect(() => {
    if (reduced || mobile) return
    const ctx = gsap.context((self) => {
      const words = self.selector!('[data-step-word]') as HTMLElement[]
      const bodies = self.selector!('[data-step-body]') as HTMLElement[]
      const fill = self.selector!('[data-progress-fill]')[0] as HTMLElement
      const n = words.length
      if (!n) return

      gsap.to(fill, {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4,
          onUpdate: (st) => {
            const idx = Math.min(n - 1, Math.floor(st.progress * n * 1.02))
            if (idx !== activeRef.current) {
              activeRef.current = idx
              setActive(idx)
            }
          },
        },
      })

      // Each word owns a slice of the scroll: it rises to full scale, holds,
      // then recedes behind the next one.
      words.forEach((word, i) => {
        const slice = 1 / n
        const start = i * slice
        const tl = gsap.timeline({
          scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
          defaults: { ease: 'none' },
        })
        tl.fromTo(
          word,
          { autoAlpha: i === 0 ? 1 : 0, scale: i === 0 ? 1 : 0.72, yPercent: i === 0 ? 0 : 26, filter: 'blur(6px)' },
          { autoAlpha: 1, scale: 1, yPercent: 0, filter: 'blur(0px)', duration: slice * 0.42 },
          start
        )
        if (i < n - 1) {
          tl.to(
            word,
            { autoAlpha: 0.1, scale: 0.66, yPercent: -30, filter: 'blur(5px)', duration: slice * 0.4 },
            start + slice * 0.6
          )
        }

        const body = bodies[i]
        if (body) {
          const lines = body.querySelectorAll('[data-mask-line] > span')
          tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: slice * 0.3, stagger: slice * 0.05 }, start + slice * 0.12)
          if (i < n - 1) {
            tl.to(lines, { yPercent: -110, duration: slice * 0.28 }, start + slice * 0.66)
          }
        }
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  const statement = (
    <div className="max-w-[22ch]">
      <KineticLabel text="HOW IT MOVES" />
      <SplitLineReveal
        as="h2"
        lines={['One team.', 'One continuous', 'journey.']}
        srLabel="One team. One continuous journey."
        className="font-display mt-6 font-bold uppercase text-text-100"
        style={{ fontSize: 'clamp(1.9rem, 4.6vw, 4.2rem)', lineHeight: 0.96, letterSpacing: '-0.025em' }}
      />
    </div>
  )

  /* ---------------------------------------------- mobile / reduced motion */
  if (mobile || reduced) {
    return (
      <section id="process" aria-label="Our process" className="relative z-10 pt-[10vh]">
        <div className="flow-gutter">{statement}</div>
        <ol className="flow-gutter relative mt-12">
          <span
            aria-hidden="true"
            className="absolute bottom-6 left-[calc(clamp(1.25rem,4vw,4.5rem)+3px)] top-4 w-px"
            style={{ background: 'linear-gradient(to bottom, var(--blue-500), rgba(0,137,255,0.12))' }}
          />
          {processSteps.map((s) => (
            <li key={s.index} className="relative list-none py-7 pl-9">
              <span
                aria-hidden="true"
                className="absolute left-0 top-[2.1rem] h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--blue-500)', boxShadow: '0 0 10px 2px rgba(0,137,255,0.5)' }}
              />
              <p className="font-body text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.24em' }}>
                {s.index}
              </p>
              <h3 className="font-display mt-2 font-bold uppercase text-text-100" style={{ fontSize: 'clamp(2rem, 11vw, 3.4rem)', lineHeight: 0.98, letterSpacing: '-0.02em' }}>
                {s.title}
              </h3>
              <p className="font-body measure mt-3 text-sm leading-relaxed text-text-300">{s.description}</p>
            </li>
          ))}
        </ol>
      </section>
    )
  }

  /* ----------------------------------------------------------- desktop pin */
  return (
    <section ref={rootRef} id="process" aria-label="Our process" className="relative z-10" style={{ height: '260vh' }}>
      <div className="sticky top-0 flex h-screen w-full flex-col justify-center overflow-hidden">
        <div className="flow-gutter">{statement}</div>

        {/* the four states, stacked in one place — the signal moves, not the page */}
        {/* aria-hidden throughout: the ordered list below is the accessible
            version, so the choreography never double-announces a step. */}
        <div className="relative mt-[6vh] h-[38vh]" aria-hidden="true">
          {processSteps.map((s, i) => (
            <div key={s.index} className="absolute inset-0 flex flex-col justify-center">
              <div className="flow-gutter">
                <h3
                  data-step-word
                  className="font-display font-bold uppercase text-text-100 will-change-transform"
                  style={{
                    fontSize: 'clamp(3.4rem, 13vw, 13rem)',
                    lineHeight: 0.84,
                    letterSpacing: '-0.045em',
                    opacity: i === 0 ? 1 : 0,
                  }}
                >
                  {s.title}
                </h3>
                <div data-step-body className="mt-6 max-w-[42ch]">
                  <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]" data-mask-line>
                    <span className="block font-body text-base leading-relaxed text-text-300">{s.description}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* one continuous indicator for the whole journey */}
        <div className="flow-gutter mt-[4vh]">
          <div className="flex items-center gap-6">
            <span className="font-body text-xs tabular-nums text-text-500">
              {processSteps[active].index} / {String(processSteps.length).padStart(2, '0')}
            </span>
            <div className="h-px flex-1 overflow-hidden bg-white/10">
              <div
                data-progress-fill
                className="h-full w-full origin-left"
                style={{
                  transform: 'scaleX(0)',
                  background: 'linear-gradient(to right, var(--blue-500), var(--blue-200))',
                  boxShadow: '0 0 8px rgba(0,137,255,0.5)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Screen readers get the whole process as plain, ordered text — the
            visual choreography is decorative on top of it. */}
        <ol className="sr-only">
          {processSteps.map((s) => (
            <li key={s.index}>
              {s.index} {s.title} — {s.description}
            </li>
          ))}
        </ol>
      </div>

      <div data-flow-anchor="left" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '22%' }} aria-hidden="true" />
      <div data-flow-anchor="right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '78%' }} aria-hidden="true" />
    </section>
  )
}
