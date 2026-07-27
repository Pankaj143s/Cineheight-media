'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import { featuredWorkSlots } from '@/content/mediaSlots'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import MediaSpecPlaceholder from '@/components/media/MediaSpecPlaceholder'
import CountUp from '@/components/ui/CountUp'
import { clamp, damp } from '@/lib/utils'
import { createManagedFrameLoop } from '@/lib/managedFrame'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Selected work — one full-viewport-width media stage the three projects pass
 * through, rather than three articles stacked with gaps.
 *
 * The client is producing final media specifically for this design, so the
 * stage renders a `MediaSpecPlaceholder` per project (see `content/mediaSlots`)
 * rather than the real client reels — swapping a slot's `status` to `'ready'`
 * later needs no layout change here. Real media stays untouched on the
 * individual `/work/[slug]` case-study pages.
 *
 * Desktop uses CSS `position: sticky` (not `ScrollTrigger.pin`) so there is no
 * pin-spacer fighting Lenis and no scroll rewriting. Mobile drops the sticky
 * entirely — each project is a plain full-width scene in sequence.
 */

const PROJECTS = caseStudies

function ProjectCopy({
  cs,
  index,
  compact = false,
  active = false,
}: {
  cs: (typeof caseStudies)[number]
  index: number
  compact?: boolean
  /**
   * Whether this project is the one currently on stage. Drives the metric
   * count — see the note on `CountUp`'s external trigger for why the built-in
   * observer cannot be used here.
   */
  active?: boolean
}) {
  return (
    <>
      <p
        className="font-body text-[11px] uppercase text-text-500"
        style={{ letterSpacing: '0.22em' }}
      >
        <span style={{ color: 'var(--blue-400)' }}>{String(index + 1).padStart(2, '0')}</span>
        <span className="mx-1.5 opacity-50">/</span>
        {String(PROJECTS.length).padStart(2, '0')}
        <span className="mx-3 opacity-40">—</span>
        {cs.category} · {cs.year}
      </p>

      <h3
        className="type-display-2 font-display mt-4 font-bold uppercase text-text-100"
        style={{ maxWidth: '18ch' }}
      >
        {cs.client}
      </h3>

      <p className="font-body measure mt-5 text-[15px] leading-relaxed text-text-200 sm:text-base">
        {cs.tagline}
      </p>

      <div className={`mt-7 flex flex-wrap items-end gap-x-10 gap-y-5 ${compact ? '' : ''}`}>
        <p className="font-display font-bold leading-none text-text-100" style={{ fontSize: 'calc(clamp(2.4rem, 4.6vw, 4.4rem) * var(--display-scale))' }}>
          <CountUp
            value={cs.headlineStat.value}
            prefix={cs.headlineStat.prefix}
            suffix={cs.headlineStat.suffix}
            duration={1100}
            active={active}
          />
          <span className="font-body ml-3 align-middle text-sm font-normal text-text-300">
            {cs.headlineStat.label}
          </span>
        </p>
      </div>

      <Link
        href={`/work/${cs.id}`}
        className="group/link font-display mt-7 inline-flex min-h-[44px] items-center gap-3 text-[12px] font-medium uppercase text-text-100 transition-colors duration-300 hover:text-[var(--blue-400)]"
        style={{ letterSpacing: '0.24em' }}
      >
        View case study
        <span className="sr-only"> — {cs.client}</span>
        <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover/link:translate-x-1.5">
          <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </Link>
    </>
  )
}

export default function FeaturedWorkJourney() {
  const rootRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const followerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()

  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const [userPaused] = useState(false)

  const setActiveIndex = useCallback((i: number) => {
    if (i === activeRef.current) return
    activeRef.current = i
    setActive(i)
  }, [])

  /* ------------------------------------------------- desktop choreography */
  useIsomorphicLayoutEffect(() => {
    if (reduced || mobile) return
    const ctx = gsap.context((self) => {
      const frames = self.selector!('[data-frame]') as HTMLElement[]
      const copies = self.selector!('[data-copy]') as HTMLElement[]
      const intro = self.selector!('[data-intro]')[0] as HTMLElement
      if (frames.length !== PROJECTS.length) return

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          onUpdate: (st) => {
            const p = st.progress
            setActiveIndex(p < 0.42 ? 0 : p < 0.72 ? 1 : 2)
          },
        },
      })

      // The introduction is the sequence's first beat; it lifts as project 1 lands.
      if (intro) tl.fromTo(intro, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -60, duration: 0.09 }, 0.03)

      // Each project starts arriving well before the previous has finished
      // leaving — without the overlap the scroll passes through a trough where
      // neither project is on screen and a whole viewport reads as empty.
      frames.forEach((frame, i) => {
        const inAt = i === 0 ? 0 : i === 1 ? 0.3 : 0.6
        // The first project's media is already on screen behind the opening
        // statement — starting the sequence on a black slate wasted a whole
        // screen and showed the visitor no work at the exact moment the section
        // claims to be about the work.
        tl.fromTo(
          frame,
          i === 0
            ? { autoAlpha: 0.62, clipPath: 'inset(6% 4% 6% 4%)', scale: 1.04 }
            : { autoAlpha: 0, clipPath: 'inset(14% 10% 14% 10%)', scale: 1.06 },
          { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: i === 0 ? 0.12 : 0.14 },
          inAt
        )
        // Hand over only once the incoming project is already established.
        if (i < PROJECTS.length - 1) {
          const outAt = i === 0 ? 0.32 : 0.62
          tl.to(frame, { autoAlpha: 0, clipPath: 'inset(10% 6% 10% 6%)', duration: 0.12 }, outAt)
        }
      })

      // Copy follows its own project closely, and each block holds until the
      // next one has arrived — so there is never a screen with no label on it.
      copies.forEach((block, i) => {
        const at = i === 0 ? 0.06 : i === 1 ? 0.34 : 0.64
        const outAt = i === 0 ? 0.3 : 0.6
        const parts = block.children
        tl.fromTo(block, { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: 0.08 }, at)
        tl.fromTo(parts, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.07, stagger: 0.02 }, at + 0.012)
        if (i < PROJECTS.length - 1) {
          tl.to(block, { autoAlpha: 0, y: -40, duration: 0.06 }, outAt)
        }
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile, setActiveIndex])

  /* ------------------------------------------------------- mobile sequence */
  useIsomorphicLayoutEffect(() => {
    if (!mobile) return
    const observers: IntersectionObserver[] = []
    const ctx = gsap.context((self) => {
      const scenes = self.selector!('[data-scene]') as HTMLElement[]
      scenes.forEach((scene, i) => {
        if (!reduced) {
          gsap.fromTo(
            scene.querySelectorAll('[data-copy] > *'),
            { autoAlpha: 0, y: 22 },
            { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: scene, start: 'top 76%' } }
          )
        }
        const io = new IntersectionObserver(
          ([e]) => { if (e.intersectionRatio > 0.5) setActiveIndex(i) },
          { threshold: [0, 0.5] }
        )
        io.observe(scene)
        observers.push(io)
      })
    }, rootRef)
    return () => {
      observers.forEach((io) => io.disconnect())
      ctx.revert()
    }
  }, [mobile, reduced, setActiveIndex])

  /* ------------------------------------------------------ video ownership */
  useEffect(() => {
    // Captured so the cleanup pauses the elements this effect actually saw.
    const videos = videoRefs.current
    const play = () => {
      videos.forEach((v, i) => {
        if (!v) return
        if (i === active && !userPaused && !reduced && !document.hidden) v.play().catch(() => {})
        else v.pause()
      })
    }
    play()
    const onVis = () => (document.hidden ? videos.forEach((v) => v?.pause()) : play())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      videos.forEach((v) => v?.pause())
    }
  }, [active, userPaused, reduced])

  // Pause everything when the whole sequence leaves the viewport.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      ([e]) => { if (!e.isIntersecting) videoRefs.current.forEach((v) => v?.pause()) },
      { threshold: 0 }
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  /* ----------------------------------- pointer follower + media parallax */
  useEffect(() => {
    if (!rich || mobile) return
    const stage = stageRef.current
    const follower = followerRef.current
    if (!stage) return

    const t = { x: 0, y: 0, on: 0 }
    const c = { x: 0, y: 0, on: 0 }

    const animation = createManagedFrameLoop((_now, dt) => {
      const f = damp(0.11, dt)
      c.x += (t.x - c.x) * f
      c.y += (t.y - c.y) * f
      c.on += (t.on - c.on) * f
      if (follower) {
        follower.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) translate(-50%, -50%) scale(${(0.8 + c.on * 0.2).toFixed(3)})`
        follower.style.opacity = c.on.toFixed(3)
      }
      // 6–14px of internal media drift — depth, not a wobble.
      stage.style.setProperty('--media-x', `${((c.x / stage.clientWidth - 0.5) * 14).toFixed(2)}px`)
      stage.style.setProperty('--media-y', `${((c.y / stage.clientHeight - 0.5) * 9).toFixed(2)}px`)
      return (
        Math.abs(t.x - c.x) > 0.05 ||
        Math.abs(t.y - c.y) > 0.05 ||
        Math.abs(t.on - c.on) > 0.002
      )
    })

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect()
      t.x = e.clientX - r.left
      t.y = e.clientY - r.top
      t.on = 1
      animation.wake()
    }
    const onLeave = () => {
      t.on = 0
      animation.wake()
    }

    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerleave', onLeave)
    return () => {
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
      animation.destroy()
    }
  }, [rich, mobile])

  const intro = (
    <div className="flow-gutter">
      <KineticLabel text="SELECTED WORK" />
      <SplitLineReveal
        as="h2"
        lines={['Creative that moved people', '— and numbers.']}
        srLabel="Creative that moved people — and numbers."
        className="type-display-1 font-display mt-6 font-bold uppercase text-text-100"
      />
      <p className="font-body measure-wide mt-7 text-base leading-relaxed text-text-300">
        Brand systems, films and campaigns built to produce real-world outcomes.
      </p>
    </div>
  )

  /* --------------------------------------------------------------- mobile */
  if (mobile || reduced) {
    return (
      <section
        ref={rootRef}
        id="work"
        aria-label="Selected work"
        className="relative z-10"
        style={{ marginTop: 'calc(clamp(3rem, 9vh, 7rem) * var(--scene-gap))' }}
      >
        {intro}
        {PROJECTS.map((cs, i) => (
          <article
            key={cs.id}
            data-scene
            aria-label={`${cs.client} case study`}
            className="relative mt-[6vh]"
          >
            <Link href={`/work/${cs.id}`} className="block" aria-label={`${cs.client} — ${cs.tagline}`}>
              <div className="relative w-full" style={{ height: '72svh' }}>
                <MediaSpecPlaceholder
                  ref={(el) => { videoRefs.current[i] = el }}
                  spec={featuredWorkSlots[cs.id]}
                  alt={`${cs.client} campaign preview`}
                  priority={i === 0}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ background: 'linear-gradient(to top, var(--bg-950) 1%, rgba(2,3,6,0.3) 32%, transparent 58%)' }}
                  />
                </MediaSpecPlaceholder>
              </div>
            </Link>
            <div data-copy className="flow-gutter relative -mt-[7vh]">
              <ProjectCopy cs={cs} index={i} compact active={active === i} />
            </div>
          </article>
        ))}
        <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    )
  }

  /* -------------------------------------------------------------- desktop */
  return (
    <section
      ref={rootRef}
      id="work"
      aria-label="Selected work"
      className="relative z-10"
      style={{ height: '300vh' }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* full-viewport-width media stage */}
        <div ref={stageRef} className="absolute inset-0" style={{ ['--media-x' as string]: '0px', ['--media-y' as string]: '0px' }}>
          {PROJECTS.map((cs, i) => (
            <div
              key={cs.id}
              data-frame
              className="absolute inset-0 will-change-transform"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <div
                className="h-full w-full"
                style={{ transform: 'translate3d(var(--media-x), var(--media-y), 0)', transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1)' }}
              >
                <div className="h-full w-full" data-parallax-scale="0.02">
                  <MediaSpecPlaceholder
                    ref={(el) => { videoRefs.current[i] = el }}
                    spec={featuredWorkSlots[cs.id]}
                    alt={`${cs.client} campaign preview`}
                    priority={i === 0}
                  />
                </div>
              </div>
              {/* readability field for the copy column */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(100deg, rgba(2,3,6,0.94) 0%, rgba(2,3,6,0.78) 26%, rgba(2,3,6,0.28) 52%, rgba(2,3,6,0.12) 100%)',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
                style={{ background: 'linear-gradient(to top, var(--bg-950), transparent)' }}
              />
            </div>
          ))}
        </div>

        {/* the whole stage is one link to the active project */}
        {PROJECTS.map((cs, i) => (
          <Link
            key={cs.id}
            href={`/work/${cs.id}`}
            aria-hidden={active !== i}
            tabIndex={active === i ? 0 : -1}
            className="absolute inset-0 z-20"
            style={{ pointerEvents: active === i ? 'auto' : 'none' }}
          >
            <span className="sr-only">View the {cs.client} case study</span>
          </Link>
        ))}

        {/* introduction — the sequence's opening beat */}
        <div data-intro className="pointer-events-none absolute inset-0 z-30 flex items-center">
          {intro}
        </div>

        {/* per-project copy, held in a consistent, readable column */}
        {PROJECTS.map((cs, i) => (
          <div
            key={cs.id}
            data-copy
            aria-hidden={active !== i}
            className="pointer-events-none absolute bottom-[9svh] left-0 z-30 flow-gutter w-full max-w-[46rem]"
            style={{ opacity: 0 }}
          >
            <div className="pointer-events-auto">
              <ProjectCopy cs={cs} index={i} active={active === i} />
            </div>
          </div>
        ))}

        {/* VIEW CASE STUDY pointer follower */}
        {rich && (
          <div
            ref={followerRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-40 whitespace-nowrap rounded-full px-5 py-2.5 font-display text-[10px] font-medium uppercase text-text-100"
            style={{
              letterSpacing: '0.24em',
              opacity: 0,
              background: 'rgba(2,3,6,0.6)',
              border: '1px solid var(--blue-alpha-40)',
              backdropFilter: 'blur(6px)',
            }}
          >
            View case study
          </div>
        )}
      </div>

      <div data-flow-anchor="edge-left" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '22%' }} aria-hidden="true" />
      <div data-flow-anchor="right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '62%' }} aria-hidden="true" />
      <div data-flow-anchor="center" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '92%' }} aria-hidden="true" />
    </section>
  )
}
