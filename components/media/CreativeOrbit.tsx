'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import MediaLightbox, { type LightboxItem } from './MediaLightbox'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { clamp, damp, normalizeAngle } from '@/lib/utils'
import { useCanRunRichEffects, useIsNarrow, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The static-creative installation — a genuine three-dimensional ring of post
 * creatives you can spin by hand. Restores the old project's `PostsRing`
 * (drag → inertia → snap, idle autoplay, physical wobble, depth scale/blur,
 * front-card expand, side-card rotate-to-front) with its tuning intact, and
 * fixes its two weaknesses:
 *
 *  • the old `FeaturedPostsSection` LOOPED a client's posts to reach ten cards,
 *    so the same image appeared two or three times. Here the geometry adapts
 *    instead — three creatives get a wider, sparser ring that reads as
 *    deliberate rather than padded.
 *  • blur and idle rotation are gated on device capability, and the rAF loop
 *    stops entirely when the installation is offscreen or the tab is hidden.
 *
 * All motion lives in refs and one rAF loop. React state changes only when the
 * front-most card changes.
 */

const AUTO_DEG_PER_MS = 0.008 // idle drift ≈ 8°/s
const IDLE_MS = 3600 // pause-to-resume delay after any interaction
const FRICTION = 0.94 // inertia decay per 60 Hz frame
const V_MIN = 0.006 // deg/ms — below this, inertia hands over to snap
const MAX_V = 1.1 // deg/ms — release velocity cap
const SNAP_EASE = 0.16
const MAX_BLUR = 2.4
const TILT_X = -8 // slight top-down view so the ring reads as a circle
const WOBBLE_FACTOR = 9
const MAX_WOBBLE = 2.6
const DRAG_THRESHOLD = 6
const DEG2RAD = Math.PI / 180

type Mode = 'idle' | 'drag' | 'inertia' | 'snap' | 'autoplay'

/** How the cards are arranged, decided by how many actually exist. */
type OrbitLayout = 'orbit' | 'arc' | 'stack'

export interface OrbitItem {
  src: string
  alt: string
  title: string
  client: string
  accent: string
  /** Drives the placeholder badge. See content/presentationMedia.ts. */
  provenance?: 'real' | 'derived-real' | 'illustrative' | 'concept-placeholder'
}

export default function CreativeOrbit({
  items,
  accent = 'var(--blue-500)',
  eyebrow,
  heading,
  headingLines,
  label = 'Static creatives',
  explanation,
  flowAnchor = 'right',
}: {
  items: OrbitItem[]
  accent?: string
  eyebrow?: string
  heading?: string
  headingLines?: React.ReactNode[]
  label?: string
  /** Short supporting line for the editorial column. */
  explanation?: string
  flowAnchor?: 'left' | 'right' | 'center' | 'edge-left' | 'edge-right'
}) {
  const N = items.length
  const reduced = useReducedMotion()
  const narrow = useIsNarrow(767)
  const rich = useCanRunRichEffects()

  const stageRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const [activeIndex, setActiveIndex] = useState(0)
  const [stageW, setStageW] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)
  /** Rect of the card that opened the lightbox, so it can grow out of it. */
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null)

  /** Open the lightbox, remembering where on screen the work was. */
  const openAt = useCallback((i: number) => {
    setSourceRect(cardRefs.current[i]?.getBoundingClientRect() ?? null)
    setExpanded(i)
  }, [])

  // ---- motion state (refs only) ----------------------------------------
  const rotation = useRef(0)
  const velocity = useRef(0)
  const mode = useRef<Mode>('idle')
  const targetRot = useRef(0)
  const rafRef = useRef<number | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(0)
  const lastTime = useRef(0)

  const dragging = useRef(false)
  const dragged = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startRot = useRef(0)
  const lastX = useRef(0)
  const lastT = useRef(0)
  const hovered = useRef(false)
  const focused = useRef(false)

  const wobble = useRef(0)
  const dragTilt = useRef(0)
  const dragLift = useRef(0)

  /** 0→1 hover emphasis on the front card, eased in the rAF loop. */
  const hoverEase = useRef(0)
  const hoverTarget = useRef(0)
  /** Current client accent as a hex pair source for the card edge. */
  const accentEdge = useRef(accent.startsWith('#') ? accent : '#0089FF')
  accentEdge.current = accent.startsWith('#') ? accent : '#0089FF'

  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  /**
   * Geometry adapts to how many creatives actually exist.
   *
   *   ≥5  full 360° orbit
   *   3–4 shallow ARC — a full ring of three cards is mostly empty space, and
   *       it implied the client had supplied more work than they had. SES has
   *       exactly three real posts, which is what forced this.
   *   1–2 layered stack (handled by the arc with a very small sweep)
   *
   * The arc keeps the same physics: `theta` is simply the angle between
   * neighbours, so drag, inertia and snap are unchanged — only the spacing and
   * the radius differ.
   */
  const { cardW, cardH, radius, theta, stageH, small, layout } = useMemo(() => {
    const w0 = stageW || 1100
    const sm = w0 < 700
    const m: OrbitLayout = N >= 5 ? 'orbit' : N >= 3 ? 'arc' : 'stack'

    /*
     * Card size.
     *
     * These used to reach 380px on a standard desktop, which turned a gallery
     * wall into a technical demo that owned the viewport. The stage now sits in
     * an 8-column slot beside its own editorial column, so the cards come down
     * to roughly 240-290px and are capped hard on very large displays: the
     * installation should read as artwork on a wall, not as a diagram.
     *
     * On a short viewport the height budget wins, so a card is never taller
     * than the stage can actually show.
     */
    const sizeFactor = m === 'orbit' ? (sm ? 0.44 : 0.26) : sm ? 0.56 : 0.3
    const shortViewport = typeof window !== 'undefined' && window.innerHeight < 780
    const w = sm
      ? clamp(Math.round(w0 * sizeFactor), 170, 260)
      : clamp(Math.round(w0 * sizeFactor), 210, shortViewport ? 250 : 290)
    const h = Math.round((w * 4) / 3)

    if (m === 'orbit') {
      const step = 360 / N
      const circumference = w * 1.12 * N
      const minR = Math.max(
        (w / (2 * Math.tan(Math.PI / Math.max(N, 2)))) * 1.02,
        circumference / (2 * Math.PI)
      )
      const maxR = Math.max(minR, (w * 1.4 * N) / (2 * Math.PI))
      const widthR = w0 / 2 - w / 2 - (sm ? 10 : 40)
      const r = Math.round(clamp(widthR, minR, maxR))
      return {
        cardW: w,
        cardH: h,
        radius: r,
        theta: step,
        stageH: Math.round(Math.max(h * 1.4, h + r * 0.28 + 56)),
        small: sm,
        layout: m,
      }
    }

    // Arc / stack: a generous angle between neighbours so the siblings sit
    // clearly behind and to the side of the active card without implying a ring.
    const step = m === 'arc' ? (sm ? 34 : 30) : 22
    // Radius chosen so the neighbour clears the active card's edge. At 1.45×
    // the siblings covered roughly a quarter of the front card; the front card
    // must stay fully readable because it is the one you can open.
    const r = Math.round(clamp(w * 2.0, 340, 720))
    return {
      cardW: w,
      cardH: h,
      radius: r,
      theta: step,
      stageH: Math.round(Math.max(h * 1.34, h + 112)),
      small: sm,
      layout: m,
    }
  }, [stageW, N])

  const geom = useRef({ N, theta, radius, layout })
  geom.current = { N, theta, radius, layout }

  /**
   * An arc opens on its MIDDLE card.
   *
   * A ring is symmetrical wherever it starts, but a linear arc with item 0 in
   * front puts every sibling on the same side — measured, SES's three posts all
   * fanned to the right and the composition read as unbalanced. Starting in the
   * middle gives the active card a neighbour on each side, which is what makes
   * it read as an intentional fan.
   */
  const arcCentred = useRef(false)
  useEffect(() => {
    if (arcCentred.current || layout === 'orbit' || N < 2) return
    arcCentred.current = true
    const mid = Math.floor((N - 1) / 2)
    rotation.current = -mid * theta
    targetRot.current = rotation.current
    activeRef.current = mid
    setActiveIndex(mid)
  }, [layout, N, theta])

  // ---- stage measurement ------------------------------------------------
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (cr) setStageW(cr.width)
    })
    ro.observe(el)
    setStageW(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  // ---- per-frame visuals -------------------------------------------------
  const applyVisuals = useCallback(() => {
    const ring = ringRef.current
    const { N: n, theta: step, radius: r } = geom.current
    const rot = rotation.current
    if (ring) {
      const wob = wobble.current
      ring.style.transform =
        `translateY(${(wob * 1.6 + dragLift.current).toFixed(2)}px) translateZ(${-r}px) ` +
        `rotateX(${(TILT_X + wob + dragTilt.current).toFixed(2)}deg) rotateY(${rot.toFixed(2)}deg)`
    }
    const front = ((Math.round(-rot / step) % n) + n) % n
    // Hover emphasis is eased through this same loop (never a CSS transition
    // fighting the physics), so the lift stays physically connected to the ring.
    const hov = hoverEase.current
    for (let i = 0; i < n; i++) {
      const el = cardRefs.current[i]
      if (!el) continue
      const a = normalizeAngle(rot + i * step)
      const c = (1 + Math.cos(a * DEG2RAD)) / 2 // 1 at the front, 0 at the back
      const isFront = i === front

      // The front card lifts and grows a little under the pointer; its
      // neighbours quieten so the emphasis reads without a glow.
      const lift = isFront ? -14 * hov : 0
      const scale = (0.7 + 0.3 * c) * (isFront ? 1 + 0.08 * hov : 1 - 0.04 * hov)
      const opacity = (0.42 + 0.58 * c) * (isFront ? 1 : 1 - 0.22 * hov)
      const blur = rich ? (1 - c) * MAX_BLUR * (isFront ? 1 - hov : 1 + 0.4 * hov) : 0

      el.style.transform = `translateY(${lift.toFixed(2)}px) scale(${scale.toFixed(4)})`
      el.style.opacity = opacity.toFixed(3)
      el.style.filter = rich
        ? `blur(${blur.toFixed(2)}px)` + (isFront && hov > 0.01 ? ` brightness(${(1 + 0.16 * hov).toFixed(3)})` : '')
        : ''
      el.style.boxShadow = isFront
        ? `0 ${(26 + 18 * hov).toFixed(0)}px ${(60 + 26 * hov).toFixed(0)}px -18px rgba(0,0,0,0.85)` +
          (hov > 0.01 ? `, 0 0 0 1px ${accentEdge.current}${Math.round(hov * 90).toString(16).padStart(2, '0')}` : '')
        : '0 26px 60px -18px rgba(0,0,0,0.85)'
    }
    if (front !== activeRef.current) {
      activeRef.current = front
      setActiveIndex(front)
    }
  }, [rich])

  // ---- idle → autoplay ---------------------------------------------------
  const stopIdleTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
      idleTimer.current = null
    }
  }, [])

  const scheduleAutoplay = useCallback(() => {
    stopIdleTimer()
    // An arc has ends; idling would drift the active card off into empty
    // space. Only a closed ring can rotate indefinitely.
    if (reducedRef.current || geom.current.N <= 1 || geom.current.layout !== 'orbit') return
    idleTimer.current = setTimeout(() => {
      if (!hovered.current && !focused.current && !dragging.current && mode.current === 'idle') {
        mode.current = 'autoplay'
      }
    }, IDLE_MS)
  }, [stopIdleTimer])

  /** Rotation limits. A closed ring is unbounded; an arc stops at its ends. */
  const rotationBounds = () => {
    const { N: n, theta: step, layout: m } = geom.current
    if (m === 'orbit') return null
    return { min: -(n - 1) * step, max: 0 }
  }

  const startSnap = useCallback(() => {
    const step = geom.current.theta
    const b = rotationBounds()
    if (b) rotation.current = clamp(rotation.current, b.min, b.max)
    targetRot.current = Math.round(rotation.current / step) * step
    if (b) targetRot.current = clamp(targetRot.current, b.min, b.max)
    if (reducedRef.current) {
      rotation.current = targetRot.current
      mode.current = 'idle'
    } else {
      mode.current = 'snap'
    }
  }, [])

  const rotateToIndex = useCallback(
    (i: number) => {
      stopIdleTimer()
      const step = geom.current.theta
      const desired = -i * step
      if (geom.current.layout === 'orbit') {
        // Closed ring: always take the short way round.
        const diff = (((desired - rotation.current) % 360) + 540) % 360 - 180
        targetRot.current = rotation.current + diff
      } else {
        // Arc: travel directly; wrapping would sweep through empty space.
        targetRot.current = desired
      }
      if (reducedRef.current) {
        rotation.current = targetRot.current
        mode.current = 'idle'
        applyVisuals()
      } else {
        mode.current = 'snap'
      }
      scheduleAutoplay()
    },
    [stopIdleTimer, scheduleAutoplay, applyVisuals]
  )

  const go = useCallback((dir: number) => {
    if (geom.current.N <= 1) return
    rotateToIndex(activeRef.current + dir)
  }, [rotateToIndex])

  // ---- the loop ----------------------------------------------------------
  const tickRef = useRef<(now: number) => void>(() => {})
  tickRef.current = (now: number) => {
    const dt = Math.min(50, now - lastTime.current || 16)
    lastTime.current = now
    const m = mode.current

    if (m === 'autoplay') {
      rotation.current += AUTO_DEG_PER_MS * dt
    } else if (m === 'inertia') {
      rotation.current += velocity.current * dt
      velocity.current *= Math.pow(FRICTION, dt / 16.67)
      if (Math.abs(velocity.current) < V_MIN) startSnap()
    } else if (m === 'snap') {
      const diff = targetRot.current - rotation.current
      rotation.current += diff * damp(SNAP_EASE, dt)
      if (Math.abs(diff) < 0.08) {
        rotation.current = targetRot.current
        mode.current = 'idle'
        scheduleAutoplay()
      }
    }

    // Wobble — the installation tips slightly with spin velocity, then settles.
    let wobbleTarget = 0
    if (!reducedRef.current && (m === 'drag' || m === 'inertia')) {
      const stale = m === 'drag' && now - lastT.current > 90
      if (!stale) wobbleTarget = clamp(velocity.current * WOBBLE_FACTOR, -MAX_WOBBLE, MAX_WOBBLE)
    }
    wobble.current += (wobbleTarget - wobble.current) * damp(0.12, dt)

    if (m !== 'drag') {
      const f = damp(0.1, dt)
      dragTilt.current += -dragTilt.current * f
      dragLift.current += -dragLift.current * f
    }

    // Hover emphasis eases in and out here rather than via a CSS transition,
    // so it composes with the spin instead of fighting it.
    hoverEase.current += (hoverTarget.current - hoverEase.current) * damp(0.1, dt)

    applyVisuals()
  }

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || N === 0) return
    let inView = false

    const loop = (t: number) => {
      tickRef.current(t)
      rafRef.current = requestAnimationFrame(loop)
    }
    const setRunning = () => {
      const should = inView && !document.hidden && !reducedRef.current
      if (should && rafRef.current == null) {
        lastTime.current = performance.now()
        rafRef.current = requestAnimationFrame(loop)
      } else if (!should && rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting
      setRunning()
    }, { threshold: 0.05 })
    io.observe(stage)

    const onVis = () => setRunning()
    document.addEventListener('visibilitychange', onVis)

    scheduleAutoplay()
    applyVisuals()

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      stopIdleTimer()
    }
  }, [N, applyVisuals, scheduleAutoplay, stopIdleTimer])

  // Repaint when reduced-motion/geometry change without the loop running.
  useEffect(() => {
    applyVisuals()
  }, [applyVisuals, radius, theta, cardW])

  // ---- pointer -----------------------------------------------------------
  /** Rotating by `dx` px on the front arc ≈ dx/radius rad — the card under the
   *  pointer tracks the hand roughly 1:1. */
  const degPerPx = useCallback(() => 180 / Math.PI / geom.current.radius, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (geom.current.N <= 1 || reduced) return
    stopIdleTimer()
    mode.current = 'drag'
    dragging.current = true
    dragged.current = false
    startX.current = e.clientX
    startY.current = e.clientY
    startRot.current = rotation.current
    lastX.current = e.clientX
    lastT.current = performance.now()
    velocity.current = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) dragged.current = true
    const k = degPerPx()
    const nextRot = startRot.current + dx * k
    const b = rotationBounds()
    // Elastic past the ends rather than a hard wall.
    rotation.current = b
      ? clamp(nextRot, b.min - geom.current.theta * 0.35, b.max + geom.current.theta * 0.35)
      : nextRot
    // Vertical drag tips and lifts the whole installation — clamped so it
    // always reads as a physical object being handled.
    dragTilt.current = clamp(dy * 0.055, -9, 11)
    dragLift.current = clamp(dy * 0.28, -40, 40)
    const now = performance.now()
    const dt = now - lastT.current
    if (dt > 0) {
      velocity.current = ((e.clientX - lastX.current) * k) / dt
      lastX.current = e.clientX
      lastT.current = now
    }
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    if (reduced) {
      startSnap()
    } else {
      velocity.current = clamp(velocity.current, -MAX_V, MAX_V)
      if (Math.abs(velocity.current) < V_MIN) startSnap()
      else mode.current = 'inertia'
    }
    scheduleAutoplay()
  }

  const onCardClick = (i: number) => {
    if (dragged.current) {
      dragged.current = false
      return
    }
    if (i === activeRef.current) openAt(i)
    else rotateToIndex(i)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openAt(activeRef.current)
    }
  }

  const pauseIdle = useCallback((which: 'hover' | 'focus') => () => {
    if (which === 'hover') {
      hovered.current = true
      hoverTarget.current = 1
    } else focused.current = true
    stopIdleTimer()
    if (mode.current === 'autoplay') mode.current = 'idle'
  }, [stopIdleTimer])

  const resumeIdle = useCallback((which: 'hover' | 'focus') => () => {
    if (which === 'hover') {
      hovered.current = false
      hoverTarget.current = 0
    } else focused.current = false
    scheduleAutoplay()
  }, [scheduleAutoplay])

  const setCardRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    cardRefs.current[Number(el.dataset.index)] = el
  }, [])

  const lightboxItems: LightboxItem[] = useMemo(
    () => items.map((p) => ({ kind: 'image' as const, src: p.src, alt: p.alt, title: p.title, client: p.client })),
    [items]
  )

  if (N === 0) return null
  const spinnable = N > 1
  const item = items[activeIndex]

  // Real room rather than a narrow `ch` cap — see the note in
  // PhoneReelExperience: the cap was clipping display type into fragments.
  const headingBlock = (eyebrow || heading || headingLines) && (
    <div className="max-w-[34rem]">
      {eyebrow && <KineticLabel text={eyebrow} />}
      {(headingLines || heading) && (
        <SplitLineReveal
          as="h2"
          lines={headingLines ?? [heading!]}
          srLabel={heading ?? ''}
          className="type-display-3 font-display mt-5 font-bold uppercase text-text-100"
        />
      )}
    </div>
  )

  const infoBlock = (
    <div className="min-w-0">
      <p className="font-display text-[13px] font-medium uppercase text-text-100" style={{ letterSpacing: '0.2em' }}>
        {item.client}
      </p>
      <p className="font-body mt-1.5 text-sm text-text-500">{item.title}</p>
    </div>
  )

  const controlsBlock = (
    <div className="flex items-center gap-5">
      {spinnable && (
        <div className="flex items-center gap-2" role="tablist" aria-label="Creative position">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => rotateToIndex(i)}
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Creative ${i + 1} of ${N}`}
              className="flex h-11 items-center"
            >
              <span
                className="block h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === activeIndex ? 22 : 6,
                  background: i === activeIndex ? accent : 'rgba(255,255,255,0.22)',
                }}
              />
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => openAt(activeIndex)}
        className="font-display flex min-h-[44px] items-center gap-3 text-[12px] font-medium uppercase text-text-200 transition-colors hover:text-[var(--blue-400)]"
        style={{ letterSpacing: '0.2em' }}
      >
        Expand
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5 1H1v4M9 13h4V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )

  const stageBlock = (
    <div
      ref={stageRef}
      className="relative mx-auto select-none touch-pan-y"
      style={{
        height: stageH,
        // Capped: full-width made the installation read as a standalone
        // demonstration rather than part of the case-study narrative.
        width: '100%',
        maxWidth: narrow ? 720 : 1100,
        // No top margin on desktop any more: it existed purely to push the ring
        // clear of the heading that used to be overlaid on top of it.
        marginTop: 0,
        perspective: small ? '1100px' : '1700px',
        perspectiveOrigin: narrow ? '50% 34%' : '54% 32%',
        cursor: spinnable && !reduced ? 'grab' : 'default',
      }}
      role="group"
      aria-roledescription="carousel"
      aria-label={`${label} — drag to spin, or use the arrow keys`}
      tabIndex={0}
      onPointerDown={spinnable ? onPointerDown : undefined}
      onPointerMove={spinnable ? onPointerMove : undefined}
      onPointerUp={spinnable ? endDrag : undefined}
      onPointerCancel={spinnable ? endDrag : undefined}
      onKeyDown={onKeyDown}
      onMouseEnter={pauseIdle('hover')}
      onMouseLeave={resumeIdle('hover')}
      onFocus={pauseIdle('focus')}
      onBlur={resumeIdle('focus')}
    >
      {/*
        Grounding, in two layers rather than five.
        The stage previously carried two tilted ellipse rings, a vertical light
        spine, a contact shadow and an accent pool. Together they drew a
        technical globe diagram around the artwork and competed with it. What is
        left is what a gallery wall actually needs: something for the work to
        stand on, and a faint wash of the client's colour under it.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: '7%',
          width: `${Math.round(cardW * 2.4)}px`,
          height: `${Math.round(cardH * 0.26)}px`,
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.7), transparent 70%)',
          filter: 'blur(7px)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: '3%',
          width: `${Math.round(cardW * 3)}px`,
          height: `${Math.round(cardH * 0.34)}px`,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${accent}18, transparent 72%)`,
        }}
      />
      <div
        ref={ringRef}
        className="absolute left-1/2 top-1/2"
        style={{ transformStyle: 'preserve-3d', width: 0, height: 0 }}
      >
        {items.map((post, i) => (
          <div
            key={`${post.src}-${i}`}
            className="absolute"
            style={{
              width: cardW,
              height: cardH,
              left: -cardW / 2,
              top: -cardH / 2,
              transform: `rotateY(${i * theta}deg) translateZ(${radius}px)`,
              transformStyle: 'preserve-3d',
            }}
          >
            <div
              ref={setCardRef}
              data-index={i}
              role="button"
              tabIndex={-1}
              aria-label={
                i === activeIndex
                  ? `${post.client} — ${post.title}. Press to expand.`
                  : `Bring ${post.client} — ${post.title} to the front`
              }
              onClick={() => onCardClick(i)}
              className="relative h-full w-full cursor-pointer overflow-hidden rounded-[18px] will-change-transform"
              style={{ boxShadow: '0 26px 60px -18px rgba(0,0,0,0.85)' }}
            >
              <Image
                src={post.src}
                alt={post.alt}
                fill
                className="pointer-events-none object-cover"
                sizes="(max-width: 700px) 46vw, 420px"
                draggable={false}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}
              />
              {post.provenance === 'concept-placeholder' && (
                <span
                  aria-hidden="true"
                  className="font-display pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-medium uppercase text-text-100"
                  style={{
                    letterSpacing: '0.16em',
                    background: 'rgba(2,3,6,0.78)',
                    border: '1px solid rgba(255,255,255,0.28)',
                  }}
                >
                  Concept placeholder
                </span>
              )}
              {/* A restrained VIEW LARGE affordance on the front card, so the
                  click target is discoverable without a hover-only label. */}
              {i === activeIndex && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-[9px] font-medium uppercase text-text-100 transition-opacity duration-500"
                  style={{
                    letterSpacing: '0.22em',
                    background: 'rgba(2,3,6,0.62)',
                    border: '1px solid var(--blue-alpha-40)',
                    opacity: 0.9,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path d="M5 1H1v4M9 13h4V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  View large
                </span>
              )}
              {/* the client accent, only as a hairline on the front card */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] transition-opacity duration-500"
                style={{ background: post.accent, opacity: i === activeIndex ? 0.9 : 0 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <section aria-label={label} className="relative">
      {narrow ? (
        <>
          <div className="flow-gutter relative z-10 mb-6">{headingBlock}</div>
          {stageBlock}
          <div className="flow-gutter relative z-10 mt-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
            {infoBlock}
            {controlsBlock}
          </div>
        </>
      ) : (
        /*
          Desktop: the same 4/8 editorial split the phone reels use. The heading
          used to be an absolutely-positioned overlay that the ring physically
          covered, which is why the scene read as a floating technical demo with
          no author. It now has a column of its own.
        */
        <div className="flow-gutter grid grid-cols-12 items-center gap-x-8">
          <div className="relative z-10 col-span-4">
            {headingBlock}
            {explanation && (
              <p className="font-body measure mt-6 text-sm leading-relaxed text-text-300">
                {explanation}
              </p>
            )}
            <div className="mt-10">{infoBlock}</div>
            <div className="mt-6">{controlsBlock}</div>
          </div>
          <div className="col-span-8">{stageBlock}</div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        Creative {activeIndex + 1} of {N}: {item.client}, {item.title}
      </p>

      <MediaLightbox
        items={lightboxItems}
        index={expanded}
        accent={accent}
        sourceRect={sourceRect}
        onClose={() => setExpanded(null)}
        onIndex={(i) => {
          setExpanded(i)
          rotateToIndex(i)
        }}
      />

      <div data-flow-anchor={flowAnchor} className="pointer-events-none absolute inset-x-0 top-1/2 h-px" aria-hidden="true" />
    </section>
  )
}
