'use client'

import { useEffect, useMemo, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { useReducedMotion } from '@/lib/useMediaPreferences'

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'div'

/**
 * A headline whose words gain emphasis *as the scroll passes through them* —
 * the signal lighting each word in turn rather than one fade-up for the whole
 * block. Scroll owns the motion (`ease: 'none'` + `scrub`), so scrolling back
 * up un-lights the words in reverse.
 *
 * Only for the two or three largest statements on a route; everything else
 * stays calm. Reduced motion renders the finished, fully-lit text and never
 * registers a ScrollTrigger.
 *
 * The words start dimmed rather than hidden, and a failsafe lights them fully
 * if ScrollTrigger never initialises — a headline must never be left unreadable
 * because an animation did not start.
 */
export default function ScrollHeadline({
  text,
  as: Tag = 'h2',
  className = '',
  style,
  accent,
  accentColor = 'var(--blue-500)',
  /** Dim level the words start from. Kept legible in case motion never runs. */
  from = 0.34,
  start = 'top 88%',
  end = 'top 42%',
}: {
  text: string
  as?: Tag
  className?: string
  style?: React.CSSProperties
  accent?: string[]
  accentColor?: string
  from?: number
  start?: string
  end?: string
}) {
  const rootRef = useRef<HTMLElement>(null)
  const ranRef = useRef(false)
  const reduced = useReducedMotion()

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text])
  const accentSet = useMemo(
    () => new Set((accent ?? []).map((w) => w.toLowerCase().replace(/[.,—–:;!?]/g, ''))),
    [accent]
  )

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context((self) => {
      const spans = self.selector!('[data-word]') as HTMLElement[]
      if (!spans.length) return
      gsap.fromTo(
        spans,
        { opacity: from, filter: 'blur(3px)', yPercent: 12 },
        {
          opacity: 1,
          filter: 'blur(0px)',
          yPercent: 0,
          ease: 'none',
          stagger: { each: 0.5 / spans.length, from: 'start' },
          scrollTrigger: {
            trigger: rootRef.current,
            start,
            end,
            scrub: 0.6,
            onEnter: () => { ranRef.current = true },
            onRefresh: () => { ranRef.current = true },
          },
        }
      )
    }, rootRef)
    return () => ctx.revert()
  }, [reduced, from, start, end])

  /**
   * Reduced motion: force the finished state onto the DOM directly.
   *
   * `useReducedMotion()` is false on the first render (it cannot know the
   * preference before mount), so the layout effect has already run GSAP once
   * and written the dimmed `from` opacity inline by the time the hook flips.
   * Re-rendering with `opacity: 1` does not reliably win against GSAP's
   * revert, so the completed state is written explicitly here. Measured: this
   * is what leaves the closing headline stuck at 0.18 without it.
   */
  useEffect(() => {
    if (!reduced) return
    const el = rootRef.current
    if (!el) return
    el.querySelectorAll<HTMLElement>('[data-word]').forEach((w) => {
      w.style.opacity = '1'
      w.style.filter = 'none'
      w.style.transform = 'none'
    })
  }, [reduced])

  // Failsafe: if the trigger never ran (init failure, element revealed by a
  // later layout change, very fast scroll past), light the words anyway.
  useEffect(() => {
    if (reduced) return
    const t = window.setTimeout(() => {
      const el = rootRef.current
      if (!el || ranRef.current) return
      const r = el.getBoundingClientRect()
      if (r.top > window.innerHeight * 1.4) return
      el.querySelectorAll<HTMLElement>('[data-word]').forEach((w) => {
        w.style.opacity = '1'
        w.style.filter = 'none'
        w.style.transform = 'none'
      })
    }, 2600)
    return () => window.clearTimeout(t)
  }, [reduced])

  return (
    <Tag ref={rootRef as React.Ref<never>} className={className} style={style}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => {
          const isAccent = accentSet.has(word.toLowerCase().replace(/[.,—–:;!?]/g, ''))
          return (
            <span key={`${word}-${i}`}>
              <span
                data-word
                className="inline-block will-change-[opacity,transform]"
                style={{
                  color: isAccent ? accentColor : undefined,
                  opacity: reduced ? 1 : from,
                }}
              >
                {word}
              </span>
              {i < words.length - 1 ? ' ' : null}
            </span>
          )
        })}
      </span>
    </Tag>
  )
}
