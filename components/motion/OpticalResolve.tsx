'use client'

import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { useReducedMotion } from '@/lib/useMediaPreferences'
import { LIQUID_MEDIA_PROTO } from '@/lib/liquidMedia/config'
import { LIQUID_BEAT, LIQUID_EASE, LIQUID_OPTICAL } from '@/lib/liquidMedia/tokens'
import { applyMotionFinalState } from '@/lib/liquidMedia/finalState'

type Tag = 'h1' | 'h2' | 'h3' | 'p'

/**
 * Optical title resolve — blur + tracking settle into sharp type.
 * Not the hero canvas refraction; safe to reuse on Work / About / case pages.
 */
export default function OpticalResolve({
  text,
  as: Tag = 'h1',
  className = '',
  style,
  delay = 0.35,
  accentWords,
}: {
  text: string
  as?: Tag
  className?: string
  style?: React.CSSProperties
  delay?: number
  /** Case-insensitive words to tint blue. */
  accentWords?: string[]
}) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const enabled = LIQUID_MEDIA_PROTO.enabled && LIQUID_MEDIA_PROTO.opticalTitles

  useIsomorphicLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return

    if (reduced || !enabled) {
      applyMotionFinalState(el)
      return
    }

    const words = el.querySelectorAll<HTMLElement>('[data-opt-word]')
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      applyMotionFinalState(words)
    }
    const failOpen = window.setTimeout(finish, LIQUID_OPTICAL.failOpenMs + delay * 1000)

    const tl = gsap.timeline({ delay, onComplete: finish })
    tl.fromTo(
      words,
      {
        autoAlpha: 0.35,
        yPercent: 18,
        filter: `blur(${LIQUID_OPTICAL.blurPx}px)`,
        letterSpacing: `${LIQUID_OPTICAL.trackingFrom}em`,
      },
      {
        autoAlpha: 1,
        yPercent: 0,
        filter: 'blur(0px)',
        letterSpacing: `${LIQUID_OPTICAL.trackingTo}em`,
        duration: LIQUID_BEAT.revealLong,
        stagger: 0.07,
        ease: LIQUID_EASE.reveal,
      }
    )

    return () => {
      window.clearTimeout(failOpen)
      tl.kill()
      if (!finished) finish()
    }
  }, [reduced, enabled, delay, text])

  const accent = new Set((accentWords ?? []).map((w) => w.toLowerCase().replace(/[.,—–:;!?]/g, '')))
  const parts = text.split(/\s+/).filter(Boolean)

  return (
    <Tag ref={rootRef as React.Ref<never>} className={className} style={style}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline">
        {parts.map((word, i) => {
          const key = word.toLowerCase().replace(/[.,—–:;!?']/g, '')
          const isAccent = accent.has(key)
          return (
            <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
              <span
                data-opt-word
                className="inline-block will-change-transform"
                style={{ color: isAccent ? 'var(--blue-500)' : undefined }}
              >
                {word}
                {i < parts.length - 1 ? '\u00A0' : ''}
              </span>
            </span>
          )
        })}
      </span>
    </Tag>
  )
}
