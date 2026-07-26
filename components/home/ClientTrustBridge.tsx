'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { trustedClients } from '@/content/siteContent'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The bridge out of the showreel. Not a "Trusted By" section: the showreel's
 * dark edge simply keeps going and client marks surface inside the same field
 * at three depths, drifting at three different rates as the page moves.
 *
 * Monochrome at rest — colour arrives only under the pointer. Nothing here is
 * information a touch user needs, so there is no hover-only content.
 *
 * The scatter is hand-authored rather than gridded; positions were chosen so
 * no two marks collide at any tested width, and narrow screens fall back to a
 * staggered flow that still refuses to line up into a grid.
 */

/** x/y are percentages of the field; depth 1 = nearest (largest, brightest). */
const LAYOUT: Record<string, { x: number; y: number; depth: 1 | 2 | 3 }> = {
  'Sapale Yamaha': { x: 7, y: 16, depth: 1 },
  'Sindhudurg Education Society': { x: 33, y: 6, depth: 2 },
  'Divija Old Age Home': { x: 55, y: 19, depth: 3 },
  ONGC: { x: 73, y: 7, depth: 2 },
  WetNJoy: { x: 87, y: 28, depth: 1 },
  Walkswagon: { x: 15, y: 45, depth: 3 },
  Askara: { x: 38, y: 37, depth: 2 },
  DJI: { x: 62, y: 46, depth: 1 },
  Sapale: { x: 85, y: 57, depth: 2 },
  'Dave and Busters': { x: 8, y: 71, depth: 3 },
  'Election Commission of India': { x: 30, y: 66, depth: 2 },
  Imagica: { x: 52, y: 80, depth: 1 },
  NHAI: { x: 76, y: 74, depth: 3 },
}

const DEPTH_STYLE = {
  1: { scale: 1, opacity: 0.55, blur: 0 },
  2: { scale: 0.82, opacity: 0.36, blur: 0.3 },
  3: { scale: 0.66, opacity: 0.24, blur: 0.7 },
} as const

export default function ClientTrustBridge() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      // Three depths drift at three rates — the field has volume, not layers
      // of a flat image.
      ;([1, 2, 3] as const).forEach((d) => {
        const marks = self.selector!(`[data-depth="${d}"]`) as HTMLElement[]
        if (!marks.length) return
        gsap.fromTo(
          marks,
          { yPercent: 8 * d },
          {
            yPercent: -10 * d,
            ease: 'none',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1 + d * 0.35,
            },
          }
        )
      })

      // Marks surface out of the dark rather than fading up as a block.
      const all = self.selector!('[data-mark]') as HTMLElement[]
      gsap.fromTo(
        all,
        { autoAlpha: 0, scale: 0.92 },
        {
          autoAlpha: 1,
          scale: 1,
          duration: 1.1,
          ease: 'power2.out',
          stagger: { each: 0.055, from: 'random' },
          scrollTrigger: { trigger: rootRef.current, start: 'top 76%' },
        }
      )
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  const marks = trustedClients.map((client) => ({
    ...client,
    pos: LAYOUT[client.name] ?? { x: 50, y: 50, depth: 2 as const },
  }))

  return (
    <section
      ref={rootRef}
      aria-label="Clients we have worked with"
      className="relative z-10"
      // Negative top margin pulls the field up into the showreel's feather —
      // there is no boundary between the two.
      style={{ marginTop: mobile ? '-4vh' : '-10vh' }}
    >
      {/* one quiet line, woven into the field — not a section header */}
      <p
        className="flow-gutter font-body relative z-10 max-w-[26ch] text-sm leading-relaxed text-text-500"
        style={{ paddingTop: mobile ? '6vh' : '10vh' }}
      >
        The work above was made with — and for — these brands, institutions and businesses.
      </p>

      {mobile || reduced ? (
        /* Staggered flow: varied sizes and offsets, deliberately not a grid */
        <ul className="flow-gutter mt-8 flex flex-wrap items-center gap-x-7 gap-y-6">
          {marks.map((client, i) => (
            <li
              key={client.name}
              data-mark
              data-depth={client.pos.depth}
              className="list-none"
              style={{ marginTop: `${(i % 3) * 14}px` }}
            >
              <div className={client.needsLightPlate ? 'rounded-md bg-white/[0.07] px-2.5 py-1.5' : ''}>
                <Image
                  src={client.logo}
                  alt={client.name}
                  width={client.maxW * 2}
                  height={client.maxH * 2}
                  style={{
                    maxWidth: client.maxW * (client.pos.depth === 1 ? 0.8 : 0.62),
                    maxHeight: client.maxH * (client.pos.depth === 1 ? 0.8 : 0.62),
                    width: 'auto',
                    height: 'auto',
                  }}
                  className="object-contain opacity-50 grayscale"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative mx-auto w-full" style={{ height: 'clamp(600px, 96vh, 940px)', maxWidth: 1900 }}>
          {marks.map((client) => {
            const d = DEPTH_STYLE[client.pos.depth]
            return (
              <div
                key={client.name}
                data-mark
                data-depth={client.pos.depth}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${client.pos.x}%`, top: `${client.pos.y}%` }}
              >
                <div
                  className={`transition-transform duration-500 group-hover:scale-105 ${
                    client.needsLightPlate ? 'rounded-md bg-white/[0.07] px-3 py-2' : ''
                  }`}
                >
                  <Image
                    src={client.logo}
                    alt={client.name}
                    width={client.maxW * 2}
                    height={client.maxH * 2}
                    style={{
                      maxWidth: client.maxW * d.scale,
                      maxHeight: client.maxH * d.scale,
                      width: 'auto',
                      height: 'auto',
                      opacity: d.opacity,
                      filter: d.blur ? `grayscale(1) blur(${d.blur}px)` : 'grayscale(1)',
                    }}
                    className="object-contain transition-[opacity,filter] duration-500 group-hover:!opacity-100 group-hover:!blur-0 group-hover:!grayscale-0"
                  />
                </div>
              </div>
            )
          })}

          {/* the thread threads through the field's negative space */}
          <div data-flow-anchor="right" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '26%' }} aria-hidden="true" />
          <div data-flow-anchor="left" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: '82%' }} aria-hidden="true" />
        </div>
      )}
    </section>
  )
}
