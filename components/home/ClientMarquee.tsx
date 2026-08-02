'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import KineticLabel from '@/components/motion/KineticLabel'
import { trustedClients, logoBox } from '@/content/siteContent'
import { clamp } from '@/lib/utils'
import { EASE_CONTROL } from '@/lib/motionTokens'
import {
  useCanRunRichEffects,
  useIsMobileTier,
  useReducedMotion,
} from '@/lib/useMediaPreferences'

/**
 * Client credibility — one continuous logo carousel.
 *
 * This used to be two rows drifting in opposite directions. Two rows halved the
 * time any single mark spent on screen, doubled the motion competing for
 * attention in a section that is meant to be a quiet proof point, and put the
 * same logos on screen twice. One row, moving slowly, reads as confidence.
 *
 * The loop is a single offset in pixels. Auto-drift, drag and inertia all write
 * that one number, so they can never fight: releasing a drag hands the same
 * value to the inertia decay, which hands it back to the drift. Only the copy
 * at index 0 is exposed to assistive technology; the rest exist purely to make
 * the wrap seamless.
 */

/** Copies of the client list rendered back-to-back for a seamless wrap. */
const LOOP_COPIES = [0, 1, 2, 3] as const

/** Auto-drift speed, px/second. */
const DRIFT_PX_PER_S = { mobile: 20, desktop: 28 }
/** Per-frame velocity retention during inertia, at 60 Hz. */
const INERTIA_FRICTION = 0.93
/** Below this px/ms the coast is over. */
const INERTIA_MIN_V = 0.015
/** Quiet time after interaction before the slow loop resumes. */
const RESUME_DELAY_MS = 900
/** Pointer travel before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 6

function LogoMark({
  client,
  tier,
}: {
  client: (typeof trustedClients)[number]
  tier: number
}) {
  const box = logoBox(client, tier)

  return (
    <li
      className="group flex h-[88px] shrink-0 list-none items-center justify-center px-2"
      title={client.name}
    >
      <span className="flex h-[72px] items-center justify-center transition-transform duration-500 ease-out group-hover:-translate-y-1">
        <Image
          src={client.logo}
          alt={client.name}
          width={box.width}
          height={box.height}
          sizes={`${Math.max(120, box.width)}px`}
          className="object-contain opacity-75 transition-opacity duration-500 ease-out group-hover:opacity-100"
          draggable={false}
          style={{
            width: box.width,
            height: box.height,
            maxWidth: 168,
            maxHeight: 64,
          }}
        />
      </span>
    </li>
  )
}

export default function ClientMarquee() {
  const rootRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLUListElement>(null)

  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()
  const tier = mobile ? 0.88 : 1

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const root = rootRef.current
    if (!root) return
    const rule = root.querySelector<HTMLElement>('[data-marquee-entry-rule]')
    const viewport = root.querySelector<HTMLElement>('[data-client-marquee-viewport]')
    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: root, start: 'top 92%', end: 'top 58%', scrub: 0.7 },
    })
    timeline.fromTo(
      root,
      { autoAlpha: 0.7, y: 16, clipPath: mobile ? 'inset(16% 0% 0% 0%)' : 'inset(0% 0% 0% 0%)' },
      { autoAlpha: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1 },
      0
    )
    if (rule) timeline.fromTo(rule, { scaleX: 0.08 }, { scaleX: 1, duration: 0.8 }, 0.05)
    if (viewport) timeline.fromTo(viewport, { scale: 1.015 }, { scale: 1, duration: 1 }, 0)
    const exit = mobile && viewport
      ? gsap.to(viewport, {
          scale: 0.95,
          y: '-3svh',
          autoAlpha: 0.42,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'bottom 72%', end: 'bottom 24%', scrub: 0.75 },
        })
      : null
    return () => {
      exit?.kill()
      timeline.revert()
    }
  }, [reduced, mobile])

  useEffect(() => {
    const root = rootRef.current
    const viewport = viewportRef.current
    const track = trackRef.current
    const group = groupRef.current
    if (!root || !viewport || !track || !group || reduced) return

    /** Width of one copy — the distance after which the row repeats exactly. */
    let loopWidth = 1
    /** The single source of truth for the row's position. */
    let offset = 0
    /** 0 = held still (hover/focus/drag), 1 = full drift. Eased, never snapped. */
    let driftFactor = 1
    let driftTarget = 1
    let velocity = 0
    let mode: 'auto' | 'drag' | 'inertia' = 'auto'
    let resumeAt = 0
    let held = 0

    let dragId: number | null = null
    let dragStartX = 0
    let dragStartOffset = 0
    let dragMoved = false
    let lastMoveX = 0
    let lastMoveT = 0

    let last = performance.now()
    let raf = 0
    let visible = false
    const speed = mobile ? DRIFT_PX_PER_S.mobile : DRIFT_PX_PER_S.desktop

    const measure = () => {
      loopWidth = Math.max(1, group.getBoundingClientRect().width)
      offset = ((offset % loopWidth) + loopWidth) % loopWidth
    }

    const frame = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now

      if (mode === 'inertia') {
        offset -= velocity * dt
        velocity *= Math.pow(INERTIA_FRICTION, dt / 16.67)
        if (Math.abs(velocity) < INERTIA_MIN_V) {
          velocity = 0
          mode = 'auto'
          resumeAt = now + RESUME_DELAY_MS
        }
      } else if (mode === 'auto') {
        // Ramp back to full speed after interaction rather than jumping.
        driftTarget = held > 0 || now < resumeAt ? 0 : 1
        driftFactor += (driftTarget - driftFactor) * (1 - Math.pow(0.001, dt / 1000))
        offset += (speed * driftFactor * dt) / 1000
      }

      offset = ((offset % loopWidth) + loopWidth) % loopWidth
      track.style.transform = `translate3d(${-offset.toFixed(2)}px, 0, 0)`
      raf = requestAnimationFrame(frame)
    }

    const setRunning = () => {
      const should = visible && !document.hidden
      if (should && !raf) {
        track.style.willChange = 'transform'
        last = performance.now()
        raf = requestAnimationFrame(frame)
      } else if (!should && raf) {
        cancelAnimationFrame(raf)
        raf = 0
        track.style.willChange = ''
      }
    }

    // ---- drag ------------------------------------------------------------
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      dragId = event.pointerId
      dragStartX = event.clientX
      dragStartOffset = offset
      dragMoved = false
      lastMoveX = event.clientX
      lastMoveT = performance.now()
      velocity = 0
      mode = 'drag'
      held += 1
      driftFactor = 0
    }

    const onPointerMove = (event: PointerEvent) => {
      if (dragId !== event.pointerId || mode !== 'drag') return
      const dx = event.clientX - dragStartX
      if (!dragMoved && Math.abs(dx) < DRAG_THRESHOLD) return
      if (!dragMoved) {
        dragMoved = true
        viewport.setPointerCapture(event.pointerId)
      }
      // Desktop drag is deliberately geared down — this is a gentle nudge, not
      // a fling surface.
      const gear = event.pointerType === 'mouse' ? 0.85 : 1
      offset = dragStartOffset - dx * gear

      const now = performance.now()
      const dt = now - lastMoveT
      if (dt > 0) {
        const instant = ((event.clientX - lastMoveX) * gear) / dt
        velocity = velocity * 0.7 + instant * 0.3
      }
      lastMoveX = event.clientX
      lastMoveT = now
    }

    const endDrag = (event: PointerEvent) => {
      if (dragId !== event.pointerId) return
      dragId = null
      held = Math.max(0, held - 1)
      if (viewport.hasPointerCapture?.(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId)
      }
      // Stale velocity from a pause mid-drag should not launch a coast.
      if (performance.now() - lastMoveT > 90) velocity = 0
      velocity = clamp(velocity, -2.4, 2.4)
      if (dragMoved && Math.abs(velocity) > INERTIA_MIN_V) {
        mode = 'inertia'
      } else {
        mode = 'auto'
        resumeAt = performance.now() + RESUME_DELAY_MS
      }
    }

    // ---- pause on hover / keyboard focus ---------------------------------
    const hold = () => {
      held += 1
    }
    const release = () => {
      held = Math.max(0, held - 1)
      resumeAt = performance.now() + 260
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      setRunning()
    })
    observer.observe(root)
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(group)
    const onVisibility = () => setRunning()

    measure()
    document.addEventListener('visibilitychange', onVisibility)
    viewport.addEventListener('pointerdown', onPointerDown)
    viewport.addEventListener('pointermove', onPointerMove)
    viewport.addEventListener('pointerup', endDrag)
    viewport.addEventListener('pointercancel', endDrag)
    root.addEventListener('pointerenter', hold)
    root.addEventListener('pointerleave', release)
    root.addEventListener('focusin', hold)
    root.addEventListener('focusout', release)

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
      viewport.removeEventListener('pointerdown', onPointerDown)
      viewport.removeEventListener('pointermove', onPointerMove)
      viewport.removeEventListener('pointerup', endDrag)
      viewport.removeEventListener('pointercancel', endDrag)
      root.removeEventListener('pointerenter', hold)
      root.removeEventListener('pointerleave', release)
      root.removeEventListener('focusin', hold)
      root.removeEventListener('focusout', release)
    }
  }, [mobile, reduced])

  // Slight pointer-following depth on the whole strip.
  useEffect(() => {
    const root = rootRef.current
    if (!root || !rich) return

    const onMove = (event: PointerEvent) => {
      const bounds = root.getBoundingClientRect()
      root.style.setProperty(
        '--depth-x',
        `${((event.clientX - bounds.left) / bounds.width - 0.5) * 10}px`
      )
      root.style.setProperty(
        '--depth-y',
        `${((event.clientY - bounds.top) / bounds.height - 0.5) * 5}px`
      )
    }
    const reset = () => {
      root.style.setProperty('--depth-x', '0px')
      root.style.setProperty('--depth-y', '0px')
    }

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', reset)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', reset)
    }
  }, [rich])

  return (
    <section
      ref={rootRef}
      data-interaction-quiet
      aria-label="Brands we have worked with"
      className="relative z-10 overflow-hidden"
      style={{
        marginTop: mobile ? '-7svh' : 'calc(clamp(2.5rem, 7vh, 6rem) * var(--scene-gap))',
        paddingTop: mobile ? '9svh' : undefined,
        background: mobile
          ? 'linear-gradient(to bottom, rgba(2,3,6,0) 0%, var(--bg-950) 9svh)'
          : undefined,
        ['--depth-x' as string]: '0px',
        ['--depth-y' as string]: '0px',
      }}
    >
      <div className="flow-gutter" data-parallax-y="0.08">
        <KineticLabel text="BRANDS WE HAVE WORKED WITH" />
        <span
          data-marquee-entry-rule
          aria-hidden="true"
          className="mt-4 block h-px w-24 origin-left bg-[var(--blue-500)] opacity-55"
        />
        <p className="font-body measure mt-4 text-sm leading-relaxed text-text-300">
          Trusted across mobility, education, hospitality and public organisations.
        </p>
      </div>

      <div data-flow-anchor="center" className="pointer-events-none h-px" aria-hidden="true" />

      <div
        className="relative mt-7 overflow-hidden py-4"
        style={{
          transform: 'translate3d(var(--depth-x), var(--depth-y), 0)',
          transition: `transform 0.6s ${EASE_CONTROL}`,
        }}
      >
        {reduced ? (
          // No loop, no clones — every mark readable in one static wrapped row.
          <ul className="flow-gutter flex flex-wrap items-center justify-center gap-x-10 gap-y-3 md:gap-x-12">
            {trustedClients.map((client) => (
              <LogoMark key={client.name} client={client} tier={tier} />
            ))}
          </ul>
        ) : (
          <div
            ref={viewportRef}
            data-client-marquee-viewport
            className="overflow-hidden"
            style={{
              // Horizontal drag is ours; vertical scrolling still belongs to
              // the page, so touch users are never trapped by the strip.
              touchAction: 'pan-y',
              maskImage:
                'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            }}
          >
            <div
              ref={trackRef}
              data-client-marquee-track="forward"
              className="flex w-max cursor-grab active:cursor-grabbing"
            >
              {LOOP_COPIES.map((copy) => (
                <ul
                  key={copy}
                  ref={copy === 0 ? groupRef : undefined}
                  aria-hidden={copy === 0 ? undefined : true}
                  className="flex shrink-0 items-center gap-x-10 md:gap-x-12"
                >
                  {trustedClients.map((client) => (
                    <LogoMark key={`${copy}-${client.name}`} client={client} tier={tier} />
                  ))}
                </ul>
              ))}
            </div>
          </div>
        )}
        {/* The blue centre rule that used to run through the logo row was
            removed — it cut every wordmark in half. The strip's own hairline
            top/bottom borders carry the band. */}
      </div>

      <div data-flow-anchor="right" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
