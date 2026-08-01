'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { useIsMobileTier, useReducedMotion } from '@/lib/useMediaPreferences'
import { LIQUID_MEDIA_PROTO } from '@/lib/liquidMedia/config'
import { applyMotionFinalState } from '@/lib/liquidMedia/finalState'
import { SCRUB, TRIGGER } from '@/lib/motionTokens'

export type EditorialMatteForm = 'film-gate' | 'vertical-rise' | 'soft-iris' | 'diagonal-soft'

/**
 * Editorial matte reveal for page media — clip-path opens scrubbed to scroll.
 */
export default function EditorialMatteReveal({
  children,
  form = 'vertical-rise',
  className = '',
  /** @deprecated Ignored — mattes are always scrubbed. */
  once: _once = false,
  start = TRIGGER.sectionStart,
  end = 'top 36%',
}: {
  children: ReactNode
  form?: EditorialMatteForm
  className?: string
  once?: boolean
  start?: string
  end?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobileTier()
  const enabled = LIQUID_MEDIA_PROTO.enabled && LIQUID_MEDIA_PROTO.editorialMattes

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const inner = root.querySelector<HTMLElement>('[data-matte-inner]')
    if (!inner) return

    if (reduced || !enabled) {
      applyMotionFinalState(inner)
      return
    }

    const fromClip =
      form === 'film-gate'
        ? 'inset(38% 0% 38% 0%)'
        : form === 'soft-iris'
          ? 'inset(18% 22% 18% 22%)'
          : form === 'diagonal-soft'
            ? 'polygon(0% 0%, 0% 0%, -12% 100%, 0% 100%)'
            : mobile
              ? 'inset(14% 0% 14% 0%)'
              : 'inset(22% 0% 8% 0%)'

    const toClip =
      form === 'diagonal-soft'
        ? 'polygon(0% 0%, 112% 0%, 100% 100%, 0% 100%)'
        : 'inset(0% 0% 0% 0%)'

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: root,
        start,
        end,
        scrub: SCRUB.signal,
      },
    })

    tl.fromTo(
      inner,
      { clipPath: fromClip, scale: form === 'soft-iris' ? 1.04 : 1.02 },
      { clipPath: toClip, scale: 1, duration: 1 }
    )

    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [reduced, enabled, form, mobile, start, end])

  return (
    <div ref={rootRef} className={`overflow-hidden ${className}`.trim()}>
      <div data-matte-inner className="h-full w-full will-change-transform" style={{ transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  )
}
