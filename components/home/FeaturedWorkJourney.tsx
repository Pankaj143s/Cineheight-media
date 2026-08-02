'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { caseStudies } from '@/content/caseStudies'
import { featuredWorkSlots } from '@/content/mediaSlots'
import KineticLabel from '@/components/motion/KineticLabel'
import StrokeFillHeadline from '@/components/motion/StrokeFillHeadline'
import MediaSpecPlaceholder from '@/components/media/MediaSpecPlaceholder'
import CountUp from '@/components/ui/CountUp'
import LiquidMatte, { type MatteForm } from '@/components/home/LiquidMatte'
import { clamp, damp } from '@/lib/utils'
import { createManagedFrameLoop } from '@/lib/managedFrame'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { LIQUID_MEDIA_PROTO } from '@/lib/liquidMedia/config'
import { setSignalIntensity } from '@/lib/liquidMedia/signalIntensity'
import { SCRUB } from '@/lib/motionTokens'
import { reportUiClick } from '@/lib/audio/reportUiClick'
import { observeVisibleLayerPromotion } from '@/lib/visibleLayerPromotion'

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
 * Desktop and normal mobile both use CSS `position: sticky` (never
 * `ScrollTrigger.pin`). Reduced motion receives a compact static sequence.
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
      {/* Meta kept in DOM for restore; visually quiet in media-led prototype */}
      <p
        className="font-body text-[11px] uppercase text-text-500"
        style={{ letterSpacing: '0.22em', opacity: LIQUID_MEDIA_PROTO.hideSelectedWorkIntroBody ? 0.72 : 1 }}
      >
        <span style={{ color: 'var(--blue-400)' }}>{String(index + 1).padStart(2, '0')}</span>
        <span className="mx-1.5 opacity-50">/</span>
        {String(PROJECTS.length).padStart(2, '0')}
      </p>

      <h3 className="type-display-2 font-display mt-4 max-w-[18ch] font-bold uppercase text-text-100 min-[1920px]:max-w-[20ch]">
        {cs.client}
      </h3>

      <p className="font-body measure mt-5 text-[15px] leading-relaxed text-text-200 sm:text-base min-[1920px]:text-[17px] min-[2560px]:text-lg">
        {cs.tagline}
      </p>

      <div className={`mt-7 flex flex-wrap items-end gap-x-10 gap-y-5 ${compact ? '' : ''}`}>
        <p
          className="font-display font-bold leading-none text-text-100"
          style={{ fontSize: 'calc(clamp(2.8rem, 5.4vw, 5.2rem) * var(--display-scale))' }}
        >
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
        onClick={reportUiClick}
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
  const [mediaNear, setMediaNear] = useState(false)

  /**
   * Has the sequence actually started presenting?
   *
   * `active` is 0 from mount, so without this gate the first project's metric
   * would count up the instant the component mounts — while its copy block is
   * still `autoAlpha: 0` and the visitor is somewhere up in the hero. The
   * number would then be "already counted" by the time anyone could see it.
   * The counters are handed `active && stageEntered` so the count begins on the
   * frame the copy is genuinely being revealed.
   */
  const [stageEntered, setStageEntered] = useState(false)
  const stageEnteredRef = useRef(false)
  const [matteForm, setMatteForm] = useState<MatteForm>('film-gate')
  const [matteProgress, setMatteProgress] = useState(0)
  const markStageEntered = useCallback(() => {
    if (stageEnteredRef.current) return
    stageEnteredRef.current = true
    setStageEntered(true)
  }, [])

  const setActiveIndex = useCallback((i: number) => {
    if (i === activeRef.current) return
    activeRef.current = i
    setActive(i)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      ([entry]) => setMediaNear(entry.isIntersecting),
      { rootMargin: '55% 0px', threshold: 0 }
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (reduced) return
    const root = rootRef.current
    if (!root) return
    return observeVisibleLayerPromotion(
      root.querySelectorAll<HTMLElement>('[data-frame]'),
      '30% 0px',
      'media'
    )
  }, [reduced, mobile])

  /* ------------------------------------------------- desktop choreography */
  useIsomorphicLayoutEffect(() => {
    if (reduced || mobile) return
    const ctx = gsap.context((self) => {
      const frames = self.selector!('[data-frame]') as HTMLElement[]
      const copies = self.selector!('[data-copy]') as HTMLElement[]
      const intro = self.selector!('[data-intro]')[0] as HTMLElement
      if (frames.length !== PROJECTS.length) return

      // Keep SES/Divija fully hidden during P1. Entrance tweens still use the
      // original “already present under matte” from-states (autoAlpha: 1 + clip);
      // immediateRender: false so those from-values never leak before the handoff.
      gsap.set(frames[0], { zIndex: 3 })
      gsap.set([frames[1], frames[2]], { autoAlpha: 0, zIndex: 1 })

      const matte = { p: 0 }

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          onUpdate: (st) => {
            const p = st.progress
            if (p > 0.04) markStageEntered()
            setActiveIndex(p < 0.42 ? 0 : p < 0.72 ? 1 : 2)

            // Prototype matte language: film-gate on P1, diagonal bar for P1→P2 only.
            if (p < 0.28) {
              setMatteForm('film-gate')
              setMatteProgress(Math.min(1, p / 0.14))
            } else if (p < 0.48) {
              setMatteForm('diagonal-bar')
              setMatteProgress((p - 0.28) / 0.2)
              setSignalIntensity(0.35 + Math.sin(((p - 0.28) / 0.2) * Math.PI) * 0.25)
            } else {
              setMatteForm('open')
              setMatteProgress(1)
              // Cool signal after wipe; soft entrance cue already spent.
              if (p < 0.55) setSignalIntensity(0.12)
              else setSignalIntensity(0)
            }

            // Section entrance cue
            if (p > 0.01 && p < 0.08) setSignalIntensity(0.4)
          },
        },
      })

      if (intro) tl.fromTo(intro, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -60, duration: 0.09 }, 0.03)

      // P1 — cinematic film-gate open to full-bleed, then quiet hold
      tl.fromTo(
        frames[0],
        { autoAlpha: 0.85, clipPath: 'inset(34% 0% 34% 0%)', scale: 1.02 },
        { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.14 },
        0
      )

      // P1→P2 — incoming already present under diagonal matte (original feel)
      tl.fromTo(
        frames[1],
        {
          autoAlpha: 1,
          clipPath: 'polygon(0% 0%, 0% 0%, -8% 100%, 0% 100%)',
          scale: 1.015,
          zIndex: 4,
        },
        {
          autoAlpha: 1,
          clipPath: 'polygon(0% 0%, 112% 0%, 100% 100%, 0% 100%)',
          scale: 1,
          zIndex: 4,
          duration: 0.2,
          immediateRender: false,
        },
        0.28
      )
      tl.to(frames[0], { autoAlpha: 0, zIndex: 1, duration: 0.1 }, 0.4)

      // P2→P3 — letterbox open (original feel); overlap so stage never empties
      tl.fromTo(
        frames[2],
        {
          autoAlpha: 1,
          clipPath: 'inset(48% 0% 48% 0%)',
          scale: 1.04,
          zIndex: 4,
        },
        {
          autoAlpha: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          scale: 1,
          zIndex: 4,
          duration: 0.16,
          immediateRender: false,
        },
        0.6
      )
      tl.to(frames[1], { autoAlpha: 0, zIndex: 1, duration: 0.1 }, 0.7)

      copies.forEach((block, i) => {
        const at = i === 0 ? 0.06 : i === 1 ? 0.36 : 0.66
        const outAt = i === 0 ? 0.3 : 0.62
        const parts = block.children
        tl.fromTo(block, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.08 }, at)
        tl.fromTo(parts, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.07, stagger: 0.02 }, at + 0.012)
        if (i < PROJECTS.length - 1) {
          tl.to(block, { autoAlpha: 0, y: -28, duration: 0.06 }, outAt)
        }
      })

      void matte
    }, rootRef)
    return () => {
      ctx.revert()
      setSignalIntensity(0)
    }
  }, [reduced, mobile, setActiveIndex, markStageEntered])

  /* ------------------------------------------------------- mobile sequence */
  useIsomorphicLayoutEffect(() => {
    if (!mobile || reduced) return
    const ctx = gsap.context((self) => {
      const scenes = self.selector!('[data-scene]') as HTMLElement[]
      const stages = self.selector!('[data-mobile-stage]') as HTMLElement[]
      scenes.forEach((scene, i) => {
        const stage = stages[i]
        const copy = scene.querySelector<HTMLElement>('[data-copy]')
        if (!stage || !copy) return

        gsap.fromTo(
          stage,
          { clipPath: 'inset(13% 0% 8% 0%)', scale: 1.035, y: '4svh' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            scale: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: { trigger: scene, start: 'top 94%', end: 'top 14%', scrub: 0.72 },
          },
        )
        gsap.fromTo(
          copy,
          { autoAlpha: 0.42, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: { trigger: scene, start: 'top 76%', end: 'top 34%', scrub: SCRUB.text },
          }
        )

        gsap.timeline({
          scrollTrigger: {
            trigger: scene,
            start: 'top 58%',
            end: 'bottom 42%',
            onEnter: () => {
              markStageEntered()
              setActiveIndex(i)
            },
            onEnterBack: () => {
              markStageEntered()
              setActiveIndex(i)
            },
          },
        })

        const next = scenes[i + 1]
        if (next) {
          gsap.to(stage, {
            scale: 0.96,
            y: '-5svh',
            autoAlpha: 0.72,
            clipPath: 'inset(1.5% 2.5% 3% 2.5%)',
            ease: 'none',
            scrollTrigger: { trigger: next, start: 'top 88%', end: 'top 18%', scrub: 0.72 },
          })
        }
      })

      const finalStage = stages[stages.length - 1]
      if (finalStage) {
        gsap.to(finalStage, {
          scale: 0.93,
          y: '-5svh',
          autoAlpha: 0.5,
          clipPath: 'inset(2.5% 4% 5% 4%)',
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'bottom 94%',
            end: 'bottom 24%',
            scrub: 0.8,
          },
        })
      }
    }, rootRef)
    return () => ctx.revert()
  }, [mobile, reduced, setActiveIndex, markStageEntered])

  /* ------------------------------------------------------ video ownership */
  useEffect(() => {
    // Captured so the cleanup pauses the elements this effect actually saw.
    const videos = videoRefs.current
    const play = () => {
      videos.forEach((v, i) => {
        if (!v) return
        if (mediaNear && i === active && !userPaused && !reduced && !document.hidden) v.play().catch(() => {})
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
  }, [active, userPaused, reduced, mediaNear])

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
      {/* The one signal-sweep statement on the homepage. */}
      <StrokeFillHeadline
        as="h2"
        text="Creative that moved people — and numbers."
        className="type-display-1 font-display mt-6 font-bold uppercase text-text-100"
      />
      {/* PROTO: intro body hidden visually — preserved for reversible restore */}
      <p
        className={
          LIQUID_MEDIA_PROTO.hideSelectedWorkIntroBody
            ? 'sr-only'
            : 'font-body measure-wide mt-7 text-base leading-relaxed text-text-300'
        }
      >
        Brand systems, films and campaigns built to produce real-world outcomes.
      </p>
    </div>
  )

  /* --------------------------------------------------------------- mobile */
  if (reduced) {
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
            <Link href={`/work/${cs.id}`} onClick={reportUiClick} className="block" aria-label={`${cs.client} — ${cs.tagline}`}>
              <div className="relative w-full" style={{ height: mobile ? '64svh' : '72svh' }}>
                <MediaSpecPlaceholder
                  ref={(el) => { videoRefs.current[i] = el }}
                  spec={featuredWorkSlots[cs.id]}
                  alt={`${cs.client} campaign preview`}
                  enabled={mediaNear && !reduced && active === i}
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
              <ProjectCopy cs={cs} index={i} compact active={stageEntered && active === i} />
            </div>
          </article>
        ))}
        <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />
      </section>
    )
  }

  if (mobile) {
    return (
      <section
        ref={rootRef}
        id="work"
        aria-label="Selected work"
        className="relative z-10 overflow-x-clip"
        style={{ marginTop: '-7svh', paddingTop: '10svh' }}
      >
        {intro}
        <div className="relative mt-[5svh] pb-[8svh]">
          {PROJECTS.map((cs, i) => (
            <article
              key={cs.id}
              data-scene
              aria-label={`${cs.client} case study`}
              className="relative"
              style={{
                minHeight: i === PROJECTS.length - 1 ? '96svh' : '112svh',
                marginTop: i === 0 ? 0 : '-14svh',
                zIndex: i + 1,
              }}
            >
              <div
                data-mobile-stage
                className="sticky top-[11svh] h-[78svh] overflow-hidden bg-[var(--bg-950)] will-change-transform"
              >
                <Link
                  href={`/work/${cs.id}`}
                  onClick={reportUiClick}
                  className="absolute inset-0 block"
                  aria-label={`${cs.client} — ${cs.tagline}`}
                >
                  <MediaSpecPlaceholder
                    ref={(el) => { videoRefs.current[i] = el }}
                    spec={featuredWorkSlots[cs.id]}
                    alt={`${cs.client} campaign preview`}
                    enabled={mediaNear && active === i}
                    priority={i === 0}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to top, var(--bg-950) 2%, rgba(2,3,6,0.86) 27%, rgba(2,3,6,0.16) 66%, transparent 82%)',
                      }}
                    />
                  </MediaSpecPlaceholder>
                </Link>
                <div data-copy className="flow-gutter pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-[4svh]">
                  <div className="pointer-events-auto max-w-[33rem]">
                    <ProjectCopy cs={cs} index={i} compact active={stageEntered && active === i} />
                  </div>
                </div>
              </div>
              <div
                data-flow-anchor={i % 2 === 0 ? 'edge-left' : 'edge-right'}
                className="pointer-events-none absolute inset-x-0 top-1/2 h-px"
                aria-hidden="true"
              />
            </article>
          ))}
        </div>
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
      style={{ height: '270vh' }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden" style={{ background: 'var(--bg-950)' }}>
        {/* full-viewport-width media stage */}
        <div ref={stageRef} className="absolute inset-0" style={{ ['--media-x' as string]: '0px', ['--media-y' as string]: '0px', background: 'var(--bg-950)' }}>
          {PROJECTS.map((cs, i) => (
            <div
              key={cs.id}
              data-frame
              className="absolute inset-0"
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
                    enabled={mediaNear && !reduced && active === i}
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
          {/* Liquid matte overlay — film-gate hold + diagonal P1→P2; enhanced edge gated */}
          {!reduced && LIQUID_MEDIA_PROTO.enabled && (
            <LiquidMatte
              form={matteForm}
              progress={matteProgress}
              enhancedEdge={LIQUID_MEDIA_PROTO.enhancedMatteEdge}
            />
          )}
        </div>

        {/* the whole stage is one link to the active project */}
        {PROJECTS.map((cs, i) => (
          <Link
            key={cs.id}
            href={`/work/${cs.id}`}
            onClick={reportUiClick}
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
            className="pointer-events-none absolute bottom-[9svh] left-0 z-30 flow-gutter w-full max-w-[46rem] min-[1920px]:max-w-[52rem] min-[2560px]:max-w-[56rem]"
            style={{ opacity: 0 }}
          >
            <div className="pointer-events-auto">
              <ProjectCopy cs={cs} index={i} active={stageEntered && active === i} />
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
