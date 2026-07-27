'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import KineticLabel from '@/components/motion/KineticLabel'
import { trustedClients, logoBox, LOGO_SLOT_MIN_W } from '@/content/siteContent'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * Compact client credibility — replaces the full-viewport scattered logo field,
 * which consumed a whole screen and still rendered several marks too small.
 *
 * Two staggered rows drift in opposite directions, driven by **scroll
 * progress** rather than a CSS marquee: the rows only move while the visitor
 * moves, so every mark stays on screen long enough to be recognised, and it
 * never becomes the twitchy infinite ticker every agency site has.
 *
 * Each row holds a DIFFERENT half of the client list and is never duplicated —
 * duplicating a row that is narrower than the viewport put the same logo on
 * screen twice. Travel is measured from the real slack between the row width
 * and the container, so a row can never drift far enough to expose its edge.
 *
 * Sizing is optical, not nominal (see `logoBox`), and dark-on-transparent marks
 * get a soft radial glow plus a brightness lift rather than a plate, because a
 * plate turns every one of them into a visible card.
 */

const ROW_A = trustedClients.filter((_, i) => i % 2 === 0)
const ROW_B = trustedClients.filter((_, i) => i % 2 === 1)

function LogoMark({ client, tier }: { client: (typeof trustedClients)[number]; tier: number }) {
  const box = logoBox(client, tier)
  const dark = client.needsLightPlate

  return (
    <li
      className="group flex shrink-0 list-none items-center justify-center"
      style={{ minWidth: LOGO_SLOT_MIN_W * tier, paddingInline: `${Math.round(20 * tier)}px` }}
    >
      <span
        className="flex items-center justify-center px-3 py-2 transition-transform duration-500 ease-out group-hover:-translate-y-1"
        style={
          dark
            ? { background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.26), rgba(255,255,255,0.1) 52%, transparent 78%)' }
            : undefined
        }
      >
        <Image
          src={client.logo}
          alt={client.name}
          width={box.width}
          height={box.height}
          sizes={`${box.width}px`}
          style={{
            width: box.width,
            height: box.height,
            // Dark marks need a real lift to read at all against #020306 —
            // ONGC in particular is near-black and vanishes without it.
            filter: dark ? 'grayscale(1) brightness(2.6) contrast(0.85)' : 'grayscale(1)',
          }}
          className="object-contain opacity-70 transition-[opacity,filter] duration-500 ease-out group-hover:opacity-100 group-hover:!filter-none"
        />
      </span>
    </li>
  )
}

export default function ClientMarquee() {
  const rootRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const rowARef = useRef<HTMLUListElement>(null)
  const rowBRef = useRef<HTMLUListElement>(null)
  const hoveredRef = useRef(false)

  const mobile = useIsMobileTier()
  const reduced = useReducedMotion()
  const rich = useCanRunRichEffects()
  const tier = mobile ? 0.8 : 1

  useEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    const a = rowARef.current
    const b = rowBRef.current
    if (!root || !track || !a || !b || reduced) return

    const state = { current: 0.5, target: 0.5 }
    // Travel measured per row: half the slack when the row fits, a fixed
    // generous amount when it already overflows (edges are off-screen anyway).
    let travelA = 0
    let travelB = 0
    let raf = 0
    let last = performance.now()
    let running = false

    const measure = () => {
      const w = track.clientWidth
      const slackA = a.scrollWidth - w
      const slackB = b.scrollWidth - w
      travelA = slackA > 0 ? Math.min(slackA / 2, 90) : Math.max(0, (w - a.scrollWidth) / 2 - 8)
      travelB = slackB > 0 ? Math.min(slackB / 2, 90) : Math.max(0, (w - b.scrollWidth) / 2 - 8)
    }

    const compute = () => {
      const r = root.getBoundingClientRect()
      const span = window.innerHeight + r.height
      state.target = clamp((window.innerHeight - r.top) / span, 0, 1)
    }

    const loop = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      // Hovering slows the drift to a crawl so a mark can be read.
      const f = damp(hoveredRef.current ? 0.015 : 0.07, dt)
      state.current += (state.target - state.current) * f
      const o = state.current - 0.5
      a.style.transform = `translate3d(${(-o * 2 * travelA).toFixed(2)}px, 0, 0)`
      b.style.transform = `translate3d(${(o * 2 * travelB).toFixed(2)}px, 0, 0)`
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting && !document.hidden ? start() : stop()),
      { threshold: 0 }
    )
    io.observe(root)

    const onResize = () => {
      measure()
      compute()
    }
    const onScroll = () => compute()
    const onVis = () => (document.hidden ? stop() : start())
    const onEnter = () => { hoveredRef.current = true }
    const onLeave = () => { hoveredRef.current = false }

    measure()
    compute()
    state.current = state.target
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)
    root.addEventListener('pointerenter', onEnter)
    root.addEventListener('pointerleave', onLeave)
    const ro = new ResizeObserver(onResize)
    ro.observe(track)

    return () => {
      io.disconnect()
      ro.disconnect()
      stop()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
      root.removeEventListener('pointerenter', onEnter)
      root.removeEventListener('pointerleave', onLeave)
    }
  }, [reduced, mobile])

  // Very small pointer depth across the whole band.
  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    if (!root) return
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      root.style.setProperty('--depth-x', `${((e.clientX - r.left) / r.width - 0.5) * 10}px`)
      root.style.setProperty('--depth-y', `${((e.clientY - r.top) / r.height - 0.5) * 5}px`)
    }
    const onLeave = () => {
      root.style.setProperty('--depth-x', '0px')
      root.style.setProperty('--depth-y', '0px')
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
    }
  }, [rich])

  return (
    <section
      ref={rootRef}
      aria-label="Brands we have worked with"
      className="relative z-10 overflow-hidden"
      style={{
        marginTop: 'calc(clamp(2.5rem, 7vh, 6rem) * var(--scene-gap))',
        ['--depth-x' as string]: '0px',
        ['--depth-y' as string]: '0px',
      }}
    >
      <div className="flow-gutter">
        <KineticLabel text="BRANDS WE HAVE WORKED WITH" />
        <p className="font-body measure mt-4 text-sm leading-relaxed text-text-300">
          Trusted by growing businesses, institutions and public organisations.
        </p>
      </div>

      <div
        ref={trackRef}
        className="relative mt-7 flex flex-col justify-center gap-2 sm:gap-4"
        style={{
          // Compact by design: credibility must never cost a whole screen.
          minHeight: mobile ? 'auto' : 'clamp(13rem, 30vh, 19rem)',
          transform: 'translate3d(var(--depth-x), var(--depth-y), 0)',
          transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div data-parallax-y="0.07">
          <ul ref={rowARef} className="flex w-max min-w-full items-center justify-center will-change-transform">
            {ROW_A.map((c) => (
              <LogoMark key={c.name} client={c} tier={tier} />
            ))}
          </ul>
        </div>
        <div data-parallax-y="-0.1">
          <ul ref={rowBRef} className="flex w-max min-w-full items-center justify-center will-change-transform">
            {ROW_B.map((c) => (
              <LogoMark key={c.name} client={c} tier={tier} />
            ))}
          </ul>
        </div>

        {/* edge feathers so overflowing rows dissolve rather than being cut */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-[10vw] max-w-[130px]"
          style={{ background: 'linear-gradient(to right, var(--bg-950), transparent)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-[10vw] max-w-[130px]"
          style={{ background: 'linear-gradient(to left, var(--bg-950), transparent)' }}
        />
      </div>

      <div data-flow-anchor="right" className="pointer-events-none h-px" aria-hidden="true" />
    </section>
  )
}
