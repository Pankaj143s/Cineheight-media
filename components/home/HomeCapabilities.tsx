'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getCaseStudy } from '@/content/caseStudies'
import { portraitReel } from '@/content/presentationMedia'
import KineticLabel from '@/components/motion/KineticLabel'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * What Cineheight sells, as one capability switcher.
 *
 * Previously this was three long rows, each with its own small masked media
 * window floating on the right. Three separate media boxes competed with each
 * other and none of them was big enough to be worth looking at.
 *
 * Now: one editorial index on the left and ONE substantial shared media stage
 * on the right that crossfades between the three pillars. Nothing changes
 * height, so the page never lurches; there is no sticky trap; and on mobile it
 * becomes a plain accordion where the active pillar's media sits directly
 * beneath its own heading.
 *
 * The media is real client work, matched by meaning, using the derived 9:16
 * presentation masters. No footage is reused between pillars or borrowed from
 * Selected Work.
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

/** Meaning-matched real client work, one film each, none shared. */
function mediaFor(cs: typeof sapale, reelIndex: number) {
  const reel = cs.reels[reelIndex]
  const asset = portraitReel(cs, reel)!
  return {
    src: asset.src,
    poster: asset.poster!,
    client: cs.client,
    label: reel.title,
    accent: cs.accentColor,
  }
}

const PILLARS: Pillar[] = [
  {
    index: '01',
    title: 'Build the brand',
    description:
      'Brand strategy, positioning and identity systems that make your business distinctive, recognisable and ready to grow.',
    includes: ['Brand strategy', 'Positioning', 'Identity design', 'Visual systems', 'Graphic design'],
    media: mediaFor(sapale, 2), // Fascino brand film
  },
  {
    index: '02',
    title: 'Create attention',
    description:
      'Social content, photography, reels and campaign films designed to earn attention and keep your brand memorable.',
    includes: ['Social media', 'Content creation', 'Photography', 'Reels & campaign films', 'Editing'],
    media: mediaFor(divija, 0), // Diwali campaign
  },
  {
    index: '03',
    title: 'Drive growth',
    description:
      'Performance campaigns and continuous optimisation that turn visibility into enquiries, customers and measurable growth.',
    includes: ['Performance marketing', 'Campaign strategy', 'Lead generation', 'Optimisation & reporting', 'Ongoing social management'],
    media: mediaFor(ses, 2), // Consistency story
  },
]

export default function HomeCapabilities() {
  const rootRef = useRef<HTMLElement>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
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

  // Scroll picks the active pillar; hover/focus overrides it on desktop.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 })
    io.observe(root)

    if (mobile) return () => io.disconnect()

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
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [setActiveIndex, mobile])

  // Only the active pillar's film plays, and only while the band is on screen.
  useEffect(() => {
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

  // Local pointer light across the scene.
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
      root.style.setProperty('--cap-lean-x', `${((c.x - 0.5) * 20).toFixed(2)}px`)
      root.style.setProperty('--cap-lean-y', `${((c.y - 0.5) * 14).toFixed(2)}px`)
      raf = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      t.x = clamp((e.clientX - r.left) / r.width, 0, 1)
      t.y = clamp((e.clientY - r.top) / r.height, 0, 1)
    }
    const onLeave = () => {
      t.x = 0.5
      t.y = 0.5
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [rich])

  /** One 16:10 stage; the pillars crossfade through it. */
  const mediaStage = (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: '16 / 10', background: 'var(--bg-900)' }}
    >
      {PILLARS.map((p, i) => (
        <div
          key={p.index}
          className="absolute inset-0"
          style={{
            opacity: active === i ? 1 : 0,
            transform:
              active === i
                ? 'translate3d(var(--cap-lean-x), var(--cap-lean-y), 0) scale(1.02)'
                : 'translate3d(0, 0, 0) scale(1.05)',
            transition: reduced ? 'none' : 'opacity 0.7s ease, transform 1.1s cubic-bezier(0.16,1,0.3,1)',
          }}
          aria-hidden={active !== i}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.media.poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          {active === i && inView && !reduced && (
            <video
              ref={(el) => { videoRefs.current[i] = el }}
              key={p.media.src}
              className="absolute inset-0 h-full w-full object-cover"
              poster={p.media.poster}
              muted
              loop
              playsInline
              preload="none"
              tabIndex={-1}
              aria-hidden="true"
            >
              <source src={p.media.src} type="video/mp4" />
            </video>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, rgba(2,3,6,0.72), rgba(2,3,6,0.18) 46%, transparent), radial-gradient(ellipse 60% 60% at 60% 45%, ${p.media.accent}1f, transparent 72%)`,
            }}
          />
          <p
            className="font-body absolute bottom-4 left-5 text-[10px] uppercase text-text-300"
            style={{ letterSpacing: '0.18em' }}
          >
            {p.media.client} — {p.media.label}
          </p>
        </div>
      ))}
      {/* feathered left edge so the stage joins the page rather than sitting in a box */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-20"
        style={{ background: 'linear-gradient(to right, var(--bg-950), transparent)' }}
      />
    </div>
  )

  const index = (
    <ul className="flex flex-col">
      {PILLARS.map((p, i) => {
        const isActive = active === i
        return (
          <li key={p.index} className="list-none">
            <button
              ref={(el) => { rowRefs.current[i] = el }}
              type="button"
              aria-expanded={isActive}
              aria-current={isActive || undefined}
              onPointerEnter={() => {
                if (mobile) return
                hoverRef.current = i
                setActiveIndex(i)
              }}
              onPointerLeave={() => {
                if (mobile) return
                hoverRef.current = null
              }}
              onFocus={() => setActiveIndex(i)}
              onClick={() => setActiveIndex(i)}
              className="w-full border-0 bg-transparent py-[clamp(1.25rem,2.6vh,2rem)] text-left"
              style={{
                opacity: mobile || isActive ? 1 : 0.55,
                transition: reduced ? 'none' : 'opacity 0.5s ease',
              }}
            >
              <span
                data-parallax-y="0.12"
                aria-hidden="true"
                className="mb-4 block h-px origin-left"
                style={{
                  width: 'min(24rem, 60%)',
                  background: `linear-gradient(to right, var(--blue-500), rgba(0,137,255,0))`,
                  transform: `scaleX(${isActive ? 1 : 0.12})`,
                  opacity: isActive ? 0.8 : 0.25,
                  transition: reduced ? 'none' : 'transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease',
                }}
              />
              <span className="flex items-baseline gap-5">
                <span
                  className="font-display text-[12px] font-medium"
                  style={{ letterSpacing: '0.28em', color: isActive ? 'var(--blue-400)' : 'var(--text-500)' }}
                >
                  {p.index}
                </span>
                <span
                  className="font-display font-bold uppercase text-text-100"
                  style={{
                    fontSize: 'calc(clamp(1.5rem, 3vw, 2.6rem) * var(--display-scale))',
                    lineHeight: 1.02,
                    letterSpacing: isActive ? '-0.015em' : '-0.022em',
                    transition: reduced ? 'none' : 'letter-spacing 0.6s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  {p.title}
                </span>
              </span>
              <span className="mt-3 block pl-[calc(12px+1.25rem)]">
                <span className="font-body block text-[15px] leading-relaxed text-text-200" style={{ maxWidth: '46ch' }}>
                  {p.description}
                </span>
                <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {p.includes.map((item) => (
                    <span key={item} className="font-body text-[12px] text-text-500">
                      {item}
                    </span>
                  ))}
                </span>
              </span>
            </button>

            {/* Mobile: the active pillar's media sits directly under its item. */}
            {mobile && isActive && (
              <div className="mt-2" style={{ height: '52svh' }}>
                <div className="relative h-full w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.media.poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  {inView && !reduced && (
                    <video
                      ref={(el) => { videoRefs.current[i] = el }}
                      key={p.media.src}
                      className="absolute inset-0 h-full w-full object-cover"
                      poster={p.media.poster}
                      muted
                      loop
                      playsInline
                      preload="none"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <source src={p.media.src} type="video/mp4" />
                    </video>
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, var(--bg-950) 2%, transparent 46%)' }}
                  />
                  <p
                    className="font-body absolute bottom-3 left-4 text-[10px] uppercase text-text-300"
                    style={{ letterSpacing: '0.18em' }}
                  >
                    {p.media.client} — {p.media.label}
                  </p>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )

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
        ['--cap-lean-x' as string]: '0px',
        ['--cap-lean-y' as string]: '0px',
      }}
    >
      {rich && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 34% 44% at var(--sx) var(--sy), rgba(0,137,255,0.07), transparent 70%)' }}
        />
      )}

      <div className="flow-gutter relative">
        <KineticLabel text="HOW WE HELP BRANDS GROW" />
        <SplitLineReveal
          as="h2"
          lines={['One team to build the brand,', 'create attention and drive growth.']}
          srLabel="One team to build the brand, create attention and drive growth."
          className="type-display-2 font-display mt-6 max-w-[24ch] font-bold uppercase text-text-100"
        />
      </div>

      <div className="flow-gutter relative mt-10 grid grid-cols-12 items-center gap-x-12 sm:mt-14">
        <div className="col-span-12 lg:col-span-7">{index}</div>
        {!mobile && (
          <div className="col-span-12 lg:col-span-5" data-parallax-y="0.08" data-parallax-scale="0.012">
            {mediaStage}
          </div>
        )}
      </div>

      <div className="flow-gutter mt-10">
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
