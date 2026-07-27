'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getCaseStudy } from '@/content/caseStudies'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import OrientationMedia from '@/components/media/OrientationMedia'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * What Cineheight actually sells, in three pillars.
 *
 * This replaces six full-screen experimental service chapters on the homepage,
 * which were beautiful and almost impossible to read as an offering. The six
 * detailed services still live on /services; here the job is comprehension.
 *
 * Each pillar is a wide editorial band, not a card. The active band (nearest
 * the viewport centre, overridden by hover on desktop) reveals its supporting
 * client film through a mask that grows from the right, its title shifts a few
 * pixels, a local spotlight follows the pointer and the other bands quieten.
 *
 * Expansion is deliberately *not* a height animation: the rows keep a constant
 * height and the media is revealed with clip-path, so nothing below ever jumps.
 *
 * The supporting media is real client work, matched by meaning — a brand film
 * under "build the brand", a campaign that earned attention under "create
 * attention", and work tied to a verified growth result under "drive growth".
 * No footage is reused between pillars or borrowed from Selected Work.
 */

const sapale = getCaseStudy('sapale-yamaha')!
const ses = getCaseStudy('sindhudurg-education')!
const divija = getCaseStudy('divija-old-age-home')!

interface Pillar {
  index: string
  title: string
  description: string
  includes: string[]
  media: { src: string; poster: string; client: string; label: string; accent: string }
}

const PILLARS: Pillar[] = [
  {
    index: '01',
    title: 'Build the brand',
    description:
      'Brand strategy, positioning and identity systems that make your business distinctive, recognisable and ready to grow.',
    includes: ['Brand strategy', 'Positioning', 'Identity design', 'Visual systems', 'Graphic design'],
    media: {
      src: sapale.reels[2].src,
      poster: sapale.reels[2].poster!,
      client: sapale.client,
      label: sapale.reels[2].title,
      accent: sapale.accentColor,
    },
  },
  {
    index: '02',
    title: 'Create attention',
    description:
      'Social content, photography, reels and campaign films designed to earn attention and keep your brand memorable.',
    includes: ['Social media', 'Content creation', 'Photography', 'Reels & campaign films', 'Editing'],
    media: {
      src: divija.reels[0].src,
      poster: divija.reels[0].poster!,
      client: divija.client,
      label: divija.reels[0].title,
      accent: divija.accentColor,
    },
  },
  {
    index: '03',
    title: 'Drive growth',
    description:
      'Performance campaigns and continuous optimisation that turn visibility into enquiries, customers and measurable growth.',
    includes: ['Performance marketing', 'Campaign strategy', 'Lead generation', 'Optimisation & reporting', 'Ongoing social management'],
    media: {
      src: ses.reels[2].src,
      poster: ses.reels[2].poster!,
      client: ses.client,
      label: ses.reels[2].title,
      accent: ses.accentColor,
    },
  },
]

export default function HomeCapabilities() {
  const rootRef = useRef<HTMLElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const mobile = useIsMobileTier()
  const reduced = useReducedMotion()
  const rich = useCanRunRichEffects()

  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const hoverRef = useRef<number | null>(null)
  const [inView, setInView] = useState(false)

  const setActiveIndex = useCallback((i: number) => {
    if (i === activeRef.current) return
    activeRef.current = i
    setActive(i)
  }, [])

  // Scroll decides the active pillar; hover overrides it on desktop.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 })
    io.observe(root)

    let ticking = false
    const pick = () => {
      ticking = false
      if (hoverRef.current !== null) return
      const mid = window.innerHeight * 0.5
      let best = 0
      let bestD = Infinity
      rowRefs.current.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const d = Math.abs(r.top + r.height / 2 - mid)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      setActiveIndex(best)
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(pick)
    }
    pick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [setActiveIndex])

  // Only the active pillar's film plays, and only while the band is on screen.
  useEffect(() => {
    // Captured so the cleanup pauses the elements this effect actually saw.
    const videos = videoRefs.current
    const run = () => {
      videos.forEach((v, i) => {
        if (!v) return
        if (i === active && inView && !reduced && !document.hidden) v.play().catch(() => {})
        else v.pause()
      })
    }
    run()
    const onVis = () => (document.hidden ? videos.forEach((v) => v?.pause()) : run())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      videos.forEach((v) => v?.pause())
    }
  }, [active, inView, reduced])

  // Local spotlight, one loop for the whole band.
  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    if (!root) return
    const t = { x: 0.5, y: 0.5 }
    const c = { x: 0.5, y: 0.5 }
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      const f = damp(0.12, dt)
      c.x += (t.x - c.x) * f
      c.y += (t.y - c.y) * f
      root.style.setProperty('--sx', `${(c.x * 100).toFixed(1)}%`)
      root.style.setProperty('--sy', `${(c.y * 100).toFixed(1)}%`)
      raf = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      t.x = clamp((e.clientX - r.left) / r.width, 0, 1)
      t.y = clamp((e.clientY - r.top) / r.height, 0, 1)
    }
    root.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(loop)
    return () => {
      root.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [rich])

  return (
    <section
      ref={rootRef}
      id="services"
      aria-label="How we help brands grow"
      className="relative z-10"
      style={{
        marginTop: 'calc(clamp(3.5rem, 10vh, 8rem) * var(--scene-gap))',
        ['--sx' as string]: '50%',
        ['--sy' as string]: '50%',
      }}
    >
      <div className="flow-gutter">
        <KineticLabel text="HOW WE HELP BRANDS GROW" />
        <SplitLineReveal
          as="h2"
          lines={['Three ways we turn a', 'business into a brand.']}
          srLabel="Three ways we turn a business into a brand."
          className="type-display-2 font-display mt-6 font-bold uppercase text-text-100"
          style={{ maxWidth: '22ch' }}
        />
      </div>

      <div className="mt-10 sm:mt-14">
        {PILLARS.map((p, i) => {
          const isActive = active === i
          return (
            <div
              key={p.index}
              ref={(el) => { rowRefs.current[i] = el }}
              data-pillar
              onPointerEnter={() => {
                if (mobile) return
                hoverRef.current = i
                setActiveIndex(i)
              }}
              onPointerLeave={() => {
                if (mobile) return
                hoverRef.current = null
              }}
              className="group/pillar relative"
              style={{
                transition: reduced ? 'none' : 'opacity 0.55s ease',
                // Quieter when another band holds attention — never invisible.
                opacity: mobile || isActive ? 1 : 0.62,
              }}
            >
              {/* A short signal segment reaching into the active row — capped
                  well short of full width so it never reads as a table rule. */}
              <span
                aria-hidden="true"
                className="absolute top-0 h-px origin-left"
                style={{
                  left: 'var(--gutter)',
                  width: 'min(34%, 26rem)',
                  background: 'linear-gradient(to right, var(--blue-500), rgba(0,137,255,0))',
                  transform: `scaleX(${isActive ? 1 : 0.1})`,
                  opacity: isActive ? 0.75 : 0.2,
                  transition: reduced ? 'none' : 'transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.6s ease',
                }}
              />

              {/* Desktop: media revealed by a mask growing from the right.
                  No height animation, so nothing below the band ever jumps.

                  The panel is kept close to the row's own height (a near-square
                  window) rather than a wide letterbox: a 1:1 source contained
                  inside a wide, short panel leaves large blurred margins that
                  read as a pasted rectangle. Every edge is feathered so the
                  media dissolves into the band instead of being framed. */}
              {!mobile && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 overflow-hidden"
                  style={{
                    right: 'var(--gutter)',
                    width: 'clamp(15rem, 26vh, 20rem)',
                    clipPath: isActive ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)',
                    opacity: isActive ? 1 : 0,
                    transition: reduced
                      ? 'none'
                      : 'clip-path 0.9s cubic-bezier(0.16,1,0.3,1), opacity 0.7s ease',
                    // Feathered on all four sides. The radii must be 50% so the
                    // gradient actually reaches transparent AT the element's
                    // edge — larger radii put the transparent stop outside the
                    // box and the edges stay hard.
                    maskImage:
                      'radial-gradient(ellipse 50% 50% at 50% 50%, #000 28%, transparent 100%)',
                    WebkitMaskImage:
                      'radial-gradient(ellipse 50% 50% at 50% 50%, #000 28%, transparent 100%)',
                  }}
                >
                  <OrientationMedia
                    ref={(el) => { videoRefs.current[i] = el }}
                    poster={p.media.poster}
                    src={isActive ? p.media.src : undefined}
                    orientation="square"
                    alt=""
                    accent={p.media.accent}
                  />
                  {/* keeps the media secondary to the copy beside it */}
                  <div className="absolute inset-0" style={{ background: 'rgba(2,3,6,0.42)' }} />
                </div>
              )}

              {/* local spotlight on the active band */}
              {rich && isActive && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse 30% 90% at var(--sx) var(--sy), rgba(0,137,255,0.1), transparent 70%)',
                  }}
                />
              )}

              <div
                className="flow-gutter relative flex w-full flex-col gap-y-5 py-[clamp(2rem,4.5vh,3.5rem)] lg:min-h-[clamp(11rem,22vh,15rem)] lg:flex-row lg:items-start lg:gap-x-12"
                style={{
                  transform: !mobile && isActive && !reduced ? 'translateX(6px)' : 'translateX(0)',
                  transition: reduced ? 'none' : 'transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <span
                  className="font-display shrink-0 text-[12px] font-medium"
                  style={{ letterSpacing: '0.28em', color: isActive ? 'var(--blue-400)' : 'var(--text-500)', transition: 'color 0.5s ease' }}
                >
                  {p.index}
                </span>

                <div className="lg:w-[min(30rem,34%)] lg:shrink-0">
                  <h3
                    className="type-display-3 font-display font-bold uppercase text-text-100"
                    style={{
                      letterSpacing: isActive && !reduced ? '-0.012em' : '-0.018em',
                      transition: reduced ? 'none' : 'letter-spacing 0.6s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    {p.title}
                  </h3>
                </div>

                <div className="lg:max-w-[32rem]">
                  <p className="font-body text-[15px] leading-relaxed text-text-200 sm:text-base">
                    {p.description}
                  </p>
                  {/* Always present — never hover-only information. */}
                  <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
                    {p.includes.map((item) => (
                      <li
                        key={item}
                        className="font-body list-none text-[12px] text-text-500"
                        style={{ letterSpacing: '0.04em' }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Mobile: the film sits under the copy, always visible. */}
              {mobile && (
                <div className="relative mt-1 h-[34svh] w-full overflow-hidden">
                  <OrientationMedia
                    ref={(el) => { videoRefs.current[i] = el }}
                    poster={p.media.poster}
                    src={isActive && inView ? p.media.src : undefined}
                    orientation="square"
                    alt=""
                    accent={p.media.accent}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, var(--bg-950) 2%, transparent 46%)' }}
                  />
                </div>
              )}

              {/* Honest attribution — this is real client work, so name it. */}
              <p className="flow-gutter font-body pb-4 text-[11px] uppercase text-text-500" style={{ letterSpacing: '0.16em' }}>
                {p.media.client} — {p.media.label}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flow-gutter mt-9">
        <Link
          href="/services"
          className="group font-display inline-flex min-h-[48px] items-center gap-3 text-[12px] font-medium uppercase text-text-100 transition-colors duration-300 hover:text-[var(--blue-400)]"
          style={{ letterSpacing: '0.24em' }}
        >
          Explore all services
          <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
            <path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </Link>
      </div>

      <div data-flow-anchor="right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '46%' }} aria-hidden="true" />
    </section>
  )
}
