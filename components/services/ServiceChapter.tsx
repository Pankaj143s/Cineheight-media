'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import SplitLineReveal from '@/components/motion/SplitLineReveal'
import type { Service } from '@/content/siteContent'
import { clamp, damp } from '@/lib/utils'
import { useCanRunRichEffects, useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * One service, one composition. Six of these run together as a continuous
 * journey — related but never the same layout twice, and never separated by a
 * divider or an equal gap.
 *
 * Shared spine across all variants: an oversized outlined numeral sitting
 * *behind* the content as a spatial marker, a very large title that overlaps
 * the artwork, one supporting sentence, and an artwork field that parallaxes
 * internally at a slower rate than the page.
 *
 * Pointer response (fine pointers only): ≤3° of tilt, a local #0089FF
 * spotlight, and a title underline that grows with proximity. No neon glow, no
 * distortion over readable text.
 */

export type ChapterVariant =
  | 'media-right'
  | 'media-left'
  | 'full-bleed'
  | 'wide-crop'
  | 'vertical-type'
  | 'type-led'

export default function ServiceChapter({
  service,
  variant,
  index,
  /** Show the deeper `detail` copy (the /services route does; home does not). */
  showDetail = false,
  flowAnchor,
}: {
  service: Service
  variant: ChapterVariant
  index: number
  showDetail?: boolean
  flowAnchor?: 'left' | 'right' | 'center' | 'edge-left' | 'edge-right'
}) {
  const rootRef = useRef<HTMLElement>(null)
  const artRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const rich = useCanRunRichEffects()

  // ---- scroll parallax inside the artwork -------------------------------
  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const inner = self.selector!('[data-art-inner]')[0]
      if (inner) {
        gsap.fromTo(
          inner,
          { yPercent: -7 },
          {
            yPercent: 7,
            ease: 'none',
            scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
          }
        )
      }
      const numeral = self.selector!('[data-numeral]')[0]
      if (numeral && !mobile) {
        gsap.fromTo(
          numeral,
          { yPercent: 22, autoAlpha: 0 },
          {
            yPercent: -22,
            autoAlpha: 1,
            ease: 'none',
            scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'bottom top', scrub: 1.6 },
          }
        )
      }
      const frame = self.selector!('[data-art]')[0]
      if (frame) {
        gsap.fromTo(
          frame,
          { clipPath: 'inset(14% 10% 14% 10%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'none',
            scrollTrigger: { trigger: frame, start: 'top 92%', end: 'top 44%', scrub: 0.8 },
          }
        )
      }
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, mobile])

  // ---- pointer depth + spotlight ----------------------------------------
  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    const art = artRef.current
    if (!root || !art) return

    const target = { x: 0, y: 0, on: 0 }
    const cur = { x: 0, y: 0, on: 0 }
    let raf = 0
    let last = performance.now()

    const onMove = (e: PointerEvent) => {
      const r = art.getBoundingClientRect()
      target.x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5)
      target.y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5)
      target.on = 1
      root.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      root.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
    }
    const onLeave = () => {
      target.x = 0
      target.y = 0
      target.on = 0
    }
    const loop = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      const f = damp(0.09, dt)
      cur.x += (target.x - cur.x) * f
      cur.y += (target.y - cur.y) * f
      cur.on += (target.on - cur.on) * f
      // ≤3° either way — restrained depth, never a tilting card.
      art.style.transform = `perspective(1400px) rotateX(${(-cur.y * 3).toFixed(2)}deg) rotateY(${(cur.x * 3).toFixed(2)}deg)`
      root.style.setProperty('--glow', cur.on.toFixed(3))
      root.style.setProperty('--near', (cur.on * (1 - Math.abs(cur.x) * 0.8)).toFixed(3))
      raf = requestAnimationFrame(loop)
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

  const wide = variant === 'full-bleed' || variant === 'wide-crop'
  const mediaFirst = variant === 'media-left' || variant === 'wide-crop'

  const artwork = (
    <div
      ref={artRef}
      data-art
      className="relative w-full overflow-hidden will-change-transform"
      style={{
        aspectRatio: variant === 'wide-crop' ? '21 / 8' : variant === 'vertical-type' ? '3 / 4' : '16 / 10',
      }}
    >
      <div data-art-inner className="absolute inset-[-8%]">
        <Image
          src={service.image}
          alt=""
          fill
          sizes={wide ? '100vw' : '(max-width: 900px) 94vw, 52vw'}
          className="object-cover"
        />
      </div>
      {/* readability scrim, weighted to wherever the type sits */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            variant === 'full-bleed'
              ? 'linear-gradient(to right, rgba(2,3,6,0.9) 6%, rgba(2,3,6,0.45) 46%, rgba(2,3,6,0.15))'
              : 'linear-gradient(to top, rgba(2,3,6,0.7), rgba(2,3,6,0.1) 55%, transparent)',
        }}
      />
      {/* local pointer spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 'var(--glow, 0)' as unknown as number,
          background: 'radial-gradient(ellipse 42% 40% at var(--mx, 50%) var(--my, 50%), rgba(0,137,255,0.18), transparent 70%)',
        }}
      />
    </div>
  )

  const numeral = (
    <span
      data-numeral
      aria-hidden="true"
      className="chapter-numeral pointer-events-none absolute select-none"
      style={{
        fontSize: 'clamp(9rem, 26vw, 24rem)',
        [mediaFirst ? 'right' : 'left']: '-0.06em',
        top: '-0.1em',
        opacity: mobile ? 0.5 : undefined,
      }}
    >
      {service.index}
    </span>
  )

  const title = (
    <SplitLineReveal
      as="h3"
      lines={[service.title]}
      srLabel={service.title}
      className="font-display font-bold text-text-100"
      style={{
        fontSize:
          variant === 'type-led'
            ? 'clamp(2.4rem, 7vw, 6rem)'
            : 'clamp(1.9rem, 4.6vw, 4rem)',
        lineHeight: 0.96,
        letterSpacing: '-0.025em',
      }}
    />
  )

  const copy = (
    <>
      <p className="font-body measure mt-6 text-[15px] leading-relaxed text-text-300 sm:text-base">
        {service.description}
      </p>
      {showDetail && (
        <p className="font-body measure mt-4 text-sm leading-relaxed text-text-500">{service.detail}</p>
      )}
      {/* proximity underline — grows as the pointer nears, never hover-only info */}
      <span
        aria-hidden="true"
        className="mt-7 block h-px origin-left"
        style={{
          width: 'calc(3rem + var(--near, 0) * 6rem)',
          background: 'var(--blue-500)',
          opacity: 'calc(0.35 + var(--near, 0) * 0.65)' as unknown as number,
          transition: reduced ? 'none' : 'width 0.4s ease-out',
        }}
      />
    </>
  )

  /* ------------------------------------------------------------- layouts */
  let body: React.ReactNode

  if (variant === 'full-bleed') {
    body = (
      <div className="relative">
        {artwork}
        <div className="absolute inset-0 flex items-center">
          <div className="flow-gutter w-full max-w-[46rem]">
            {title}
            {copy}
          </div>
        </div>
      </div>
    )
  } else if (variant === 'wide-crop') {
    body = (
      <div className="relative">
        {artwork}
        {/* the title crosses the crop's lower edge — type and media interlock */}
        <div className="flow-gutter relative -mt-[6vh] sm:-mt-[9vh]">
          <div className="max-w-[34rem]">
            {title}
            {copy}
          </div>
        </div>
      </div>
    )
  } else if (variant === 'type-led') {
    body = (
      <div className="flow-gutter relative">
        <div className="max-w-[52rem]">{title}</div>
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">{copy}</div>
          {/* artwork reduced to a narrow accompanying band */}
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="ml-auto w-full max-w-[26rem] opacity-90">{artwork}</div>
          </div>
        </div>
      </div>
    )
  } else if (variant === 'vertical-type') {
    body = (
      <div className="flow-gutter relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5 lg:col-start-1">
          <div className="max-w-[24rem]">{artwork}</div>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          {title}
          {copy}
        </div>
      </div>
    )
  } else {
    // media-right / media-left — the title overlaps the artwork's inner edge
    const rightSide = variant === 'media-right'
    body = (
      <div className="flow-gutter relative grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-0">
        <div className={`relative z-10 lg:col-span-6 ${rightSide ? 'lg:col-start-1' : 'lg:col-start-7 lg:row-start-1'}`}>
          <div className={rightSide ? 'lg:pr-6' : 'lg:pl-6'}>
            {title}
            {copy}
          </div>
        </div>
        <div className={`lg:col-span-7 ${rightSide ? 'lg:col-start-6 lg:row-start-1' : 'lg:col-start-1 lg:row-start-1'}`}>
          {artwork}
        </div>
      </div>
    )
  }

  return (
    <section
      ref={rootRef}
      aria-label={service.title}
      className="relative"
      style={{
        // Chapters overlap rather than sit in a stack with equal gaps.
        marginTop: index === 0 ? 0 : mobile ? '-3vh' : '-8vh',
        paddingTop: mobile ? '9vh' : 'clamp(8rem, 16vh, 15rem)',
        ['--glow' as string]: 0,
        ['--near' as string]: 0,
      }}
    >
      <div className="relative">
        {numeral}
        {body}
      </div>
      {flowAnchor && (
        <div data-flow-anchor={flowAnchor} className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '54%' }} aria-hidden="true" />
      )}
    </section>
  )
}
