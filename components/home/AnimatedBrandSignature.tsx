'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * The closing wordmark.
 *
 * The pointer-follow that used to translate the whole lockup by ±6px was
 * removed: displacing readable type under the cursor reads as lag, not depth.
 * The reveal itself carries the moment, and the block still parallaxes with the
 * page via `data-parallax-y`.
 */
export default function AnimatedBrandSignature() {
  const rootRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (reduced) {
      gsap.set(root, { opacity: 1 })
      return
    }
    const outline = root.querySelector('[data-signature-outline]')
    const fill = root.querySelector('[data-signature-fill]')
    const media = root.querySelector('[data-signature-media]')
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top 82%', once: true },
    })
    // The blue rule that used to draw across the wordmark is gone. Its 0.15s
    // slot went with it and the fill now begins at 0.12 instead of 0.3, so the
    // reveal reads as one continuous gesture — outline in, fill wipes across,
    // "Media" lands — with no idle beat where the rule used to be.
    timeline
      .fromTo(outline, { opacity: 0 }, { opacity: 0.72, duration: 0.55 })
      .fromTo(
        fill,
        { clipPath: 'inset(0 100% 0 0)', letterSpacing: '0.075em' },
        { clipPath: 'inset(0 0% 0 0)', letterSpacing: '0.012em', duration: 1.05, ease: 'power3.inOut' },
        0.12
      )
      .fromTo(media, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.42 }, '-=0.28')
    return () => {
      timeline.revert()
    }
  }, [reduced])

  return (
    <div
      ref={rootRef}
      data-interaction-quiet
      data-parallax-y="0.08"
      aria-label="CINEHEIGHT MEDIA"
      className="flow-gutter relative flex max-h-[45svh] min-h-[30svh] items-center overflow-hidden"
      style={{ opacity: reduced ? 1 : undefined }}
    >
      <div aria-hidden="true" className="relative w-full select-none">
        <p
          data-signature-outline
          className="font-hero whitespace-nowrap leading-none text-transparent"
          style={{
            fontSize: 'clamp(2.8rem, 15vw, 17rem)',
            letterSpacing: '0.012em',
            WebkitTextStroke: '1px rgba(220,238,255,0.42)',
          }}
        >
          CINEHEIGHT
        </p>
        <p
          data-signature-fill
          className="font-hero absolute inset-0 whitespace-nowrap leading-none text-text-100"
          style={{
            fontSize: 'clamp(2.8rem, 15vw, 17rem)',
            letterSpacing: '0.012em',
            backgroundImage: 'linear-gradient(to bottom, #f5f7fa 24%, #838b97 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          CINEHEIGHT
        </p>
        <span
          data-signature-media
          className="font-display absolute bottom-[4%] right-[2%] text-[10px] font-medium uppercase text-[var(--blue-400)] sm:text-xs"
          style={{ letterSpacing: '0.5em' }}
        >
          Media
        </span>
      </div>
    </div>
  )
}
