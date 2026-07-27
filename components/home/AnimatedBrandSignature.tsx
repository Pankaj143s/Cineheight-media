'use client'

import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { useCanRunRichEffects, useReducedMotion } from '@/lib/useMediaPreferences'

export default function AnimatedBrandSignature() {
  const rootRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const rich = useCanRunRichEffects()

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (reduced) {
      gsap.set(root, { opacity: 1 })
      return
    }
    const outline = root.querySelector('[data-signature-outline]')
    const fill = root.querySelector('[data-signature-fill]')
    const signal = root.querySelector('[data-signature-signal]')
    const media = root.querySelector('[data-signature-media]')
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top 82%', once: true },
    })
    timeline
      .fromTo(outline, { opacity: 0 }, { opacity: 0.72, duration: 0.55 })
      .fromTo(signal, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 0.15)
      .fromTo(
        fill,
        { clipPath: 'inset(0 100% 0 0)', letterSpacing: '0.075em' },
        { clipPath: 'inset(0 0% 0 0)', letterSpacing: '0.012em', duration: 1, ease: 'power3.inOut' },
        0.3
      )
      .to(signal, { opacity: 0.28, duration: 0.35 })
      .fromTo(media, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.42 }, '-=0.2')
    return () => {
      timeline.revert()
    }
  }, [reduced])

  useEffect(() => {
    if (!rich) return
    const root = rootRef.current
    if (!root) return
    const move = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 12
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 8
      root.style.setProperty('--signature-x', `${x.toFixed(2)}px`)
      root.style.setProperty('--signature-y', `${y.toFixed(2)}px`)
    }
    const leave = () => {
      root.style.setProperty('--signature-x', '0px')
      root.style.setProperty('--signature-y', '0px')
    }
    root.addEventListener('pointermove', move)
    root.addEventListener('pointerleave', leave)
    return () => {
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerleave', leave)
    }
  }, [rich])

  return (
    <div
      ref={rootRef}
      data-interaction-quiet
      data-parallax-y="0.08"
      aria-label="CINEHEIGHT MEDIA"
      className="flow-gutter relative flex max-h-[45svh] min-h-[30svh] items-center overflow-hidden"
      style={{
        ['--signature-x' as string]: '0px',
        ['--signature-y' as string]: '0px',
        opacity: reduced ? 1 : undefined,
      }}
    >
      <div
        aria-hidden="true"
        className="relative w-full select-none transition-transform duration-500 ease-out"
        style={{ transform: 'translate3d(var(--signature-x), var(--signature-y), 0)' }}
      >
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
          data-signature-signal
          className="absolute left-0 right-0 top-[58%] h-[2px] origin-left bg-[var(--blue-500)]"
          style={{ boxShadow: '0 0 10px rgba(0,137,255,0.7)' }}
        />
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
