'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { caseStudies } from '@/content/caseStudies'
import Reveal from '@/components/ui/Reveal'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Static-post proof gallery (spec §17) — the 10 REAL post creatives
 * (7 Sapale + 3 SES) as a draggable depth strip: native scroll-snap is the
 * motion engine (momentum, touch, keyboard, screen-reader friendly), pointer
 * drag-to-scroll layers on top for desktop, and a scroll-linked depth pass
 * tilts/recedes items by distance from the viewport centre. Click/Enter opens
 * an accessible expanded view (Escape closes, focus restored). No fake social
 * chrome, no fake metrics — clear client attribution only.
 * Divija has no real posts; its detail page carries the honest gap.
 */

interface PostItem {
  client: string
  accent: string
  title: string
  src: string
  alt: string
  caseId: string
}

const POSTS: PostItem[] = caseStudies.flatMap((cs) =>
  cs.posts
    .filter((p) => !p.isPlaceholder)
    .map((p) => ({
      client: cs.client,
      accent: cs.accentColor,
      title: p.title,
      src: p.src,
      alt: p.alt ?? `${cs.client} — ${p.title}`,
      caseId: cs.id,
    }))
)

export default function PostsGallery() {
  const trackRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const reduced = useReducedMotion()
  const [expanded, setExpanded] = useState<number | null>(null)
  const lastFocused = useRef<HTMLElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const [activeClient, setActiveClient] = useState(POSTS[0].client)

  // Depth pass — items recede/tilt by distance from centre. rAF-throttled.
  useEffect(() => {
    const track = trackRef.current
    if (!track || reduced) return
    let ticking = false
    const apply = () => {
      ticking = false
      const mid = track.scrollLeft + track.clientWidth / 2
      let bestIdx = 0
      let bestDist = Infinity
      itemRefs.current.forEach((el, i) => {
        if (!el) return
        const c = el.offsetLeft + el.offsetWidth / 2
        const d = (c - mid) / track.clientWidth // -0.5..0.5 in view
        const abs = Math.abs(d)
        if (abs < bestDist) {
          bestDist = abs
          bestIdx = i
        }
        const inner = el.firstElementChild as HTMLElement | null
        if (inner) {
          inner.style.transform = `perspective(1100px) rotateY(${d * -7}deg) scale(${1 - Math.min(abs * 0.14, 0.12)}) translateZ(0)`
          inner.style.opacity = String(1 - Math.min(abs * 0.5, 0.42))
        }
      })
      setActiveClient((prev) => (POSTS[bestIdx] && prev !== POSTS[bestIdx].client ? POSTS[bestIdx].client : prev))
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(apply)
      }
    }
    apply()
    track.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      track.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [reduced])

  // Desktop drag-to-scroll (native momentum keeps the inertia feel).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let down = false
    let startX = 0
    let startScroll = 0
    let moved = false
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      down = true
      moved = false
      startX = e.clientX
      startScroll = track.scrollLeft
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 4) moved = true
      track.scrollLeft = startScroll - dx
    }
    const onUp = () => {
      down = false
      // swallow the click that follows a real drag so it doesn't open the lightbox
      if (moved) {
        const stop = (ev: Event) => {
          ev.stopPropagation()
          ev.preventDefault()
        }
        track.addEventListener('click', stop, { capture: true, once: true })
      }
    }
    track.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      track.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  // Expanded view focus + Escape handling.
  const open = useCallback((i: number) => {
    lastFocused.current = document.activeElement as HTMLElement
    setExpanded(i)
  }, [])
  const close = useCallback(() => {
    setExpanded(null)
    lastFocused.current?.focus()
  }, [])

  useEffect(() => {
    if (expanded === null) return
    closeBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') setExpanded((v) => (v === null ? v : Math.min(POSTS.length - 1, v + 1)))
      else if (e.key === 'ArrowLeft') setExpanded((v) => (v === null ? v : Math.max(0, v - 1)))
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [expanded, close])

  return (
    <section id="posts" aria-label="Social post creatives" className="relative pb-[16vh]">
      <div className="mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <Reveal variant="fade-up" className="mb-3 max-w-2xl">
          <span className="font-display text-[11px] font-medium uppercase" style={{ letterSpacing: '0.32em', color: 'var(--blue-400)' }}>
            Static Creatives
          </span>
          <h2 className="font-display mt-5 font-bold text-text-100" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.8rem)', lineHeight: 1.08 }}>
            Design that holds the feed together.
          </h2>
        </Reveal>
        <p className="font-body mb-8 text-xs uppercase text-text-500" style={{ letterSpacing: '0.18em' }} aria-live="polite">
          {activeClient}
        </p>
      </div>

      <ul
        ref={trackRef}
        className="flex cursor-grab snap-x gap-5 overflow-x-auto px-6 pb-6 pt-2 active:cursor-grabbing sm:gap-7 sm:px-10 lg:px-14"
        style={{ scrollbarWidth: 'none' }}
        aria-label="Post creatives — drag or scroll horizontally"
      >
        {POSTS.map((post, i) => (
          <li
            key={post.src}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            className="w-[62vw] max-w-[330px] flex-shrink-0 snap-center list-none sm:w-[36vw] lg:w-[300px]"
          >
            <div className="will-change-transform" style={{ transition: reduced ? 'none' : 'opacity 0.2s linear' }}>
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={`Expand — ${post.title}, ${post.client}`}
                className="group block w-full overflow-hidden rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ outlineColor: 'var(--blue-500)' }}
              >
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '3 / 4', boxShadow: '0 18px 50px rgba(0,0,0,0.5)' }}>
                  <Image
                    src={post.src}
                    alt={post.alt}
                    fill
                    sizes="(max-width: 640px) 62vw, 300px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                  />
                </div>
                <span className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="font-body text-xs text-text-300">{post.title}</span>
                  <span className="font-body text-[10px] uppercase text-text-500" style={{ letterSpacing: '0.14em' }}>
                    {post.client}
                  </span>
                </span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Expanded accessible view */}
      {expanded !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${POSTS[expanded].title} — ${POSTS[expanded].client}`}
          className="fixed inset-0 z-[80] flex items-center justify-center p-5 sm:p-10"
          style={{ background: 'rgba(2,3,6,0.94)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <figure className="relative flex max-h-full flex-col items-center">
            <div className="relative overflow-hidden" style={{ height: 'min(78vh, 900px)', aspectRatio: '3 / 4' }}>
              <Image
                src={POSTS[expanded].src}
                alt={POSTS[expanded].alt}
                fill
                sizes="(max-width: 640px) 92vw, 60vh"
                className="object-contain"
                priority
              />
            </div>
            <figcaption className="mt-4 flex w-full items-baseline justify-between gap-6">
              <span className="font-body text-sm text-text-200">{POSTS[expanded].title}</span>
              <span className="font-body text-xs uppercase text-text-500" style={{ letterSpacing: '0.14em' }}>
                {POSTS[expanded].client}
              </span>
            </figcaption>
          </figure>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            aria-label="Close expanded post"
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border text-text-100 transition-colors hover:border-[var(--blue-400)]"
            style={{ borderColor: 'var(--border-strong)', background: 'rgba(2,3,6,0.6)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          {expanded > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(expanded - 1)}
              aria-label="Previous post"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border text-text-100 hover:border-[var(--blue-400)]"
              style={{ borderColor: 'var(--border-strong)', background: 'rgba(2,3,6,0.6)' }}
            >
              <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true"><path d="M26 5H2M6 1 2 5l4 4" stroke="currentColor" strokeWidth="1.3" /></svg>
            </button>
          )}
          {expanded < POSTS.length - 1 && (
            <button
              type="button"
              onClick={() => setExpanded(expanded + 1)}
              aria-label="Next post"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border text-text-100 hover:border-[var(--blue-400)]"
              style={{ borderColor: 'var(--border-strong)', background: 'rgba(2,3,6,0.6)' }}
            >
              <svg width="16" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true"><path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" /></svg>
            </button>
          )}
        </div>
      )}
    </section>
  )
}
