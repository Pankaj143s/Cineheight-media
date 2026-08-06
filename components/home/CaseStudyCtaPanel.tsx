'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { reportUiClick } from '@/lib/audio/reportUiClick'

/**
 * "View case study" entry point for the home Selected Work stage.
 *
 * No side panel — the media stays full-bleed and this renders inline as the
 * last line of each project's copy column, exactly where the original bare
 * link used to live. All the emphasis goes into the button itself: bigger,
 * bordered, an ambient pulse (reusing the existing `[data-work-cta]` system
 * built for /work), and a radial hover fill that grows from wherever the
 * pointer actually entered — tracked by writing `--mx`/`--my` straight to the
 * DOM on `pointermove`, the same "mutate via ref, no per-frame setState"
 * convention already used for the media parallax elsewhere in this section.
 */

type Props = {
  href: string
  clientName: string
  className?: string
}

export default function CaseStudyCtaButton({ href, clientName, className = '' }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
    }
    el.addEventListener('pointermove', onMove)
    return () => el.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <Link
      ref={ref}
      href={href}
      onClick={reportUiClick}
      data-work-cta
      className={`font-display relative mt-7 inline-flex min-h-[52px] items-center gap-3 overflow-hidden rounded-full border-2 px-7 py-3.5 text-sm font-medium uppercase text-text-100 ${className}`}
      style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)', background: 'rgba(2,3,6,0.4)' }}
    >
      <span data-cta-fill aria-hidden="true" className="absolute inset-0 rounded-full" />
      <span data-cta-shimmer aria-hidden="true" className="absolute inset-0 rounded-full" />
      <span data-cta-label className="relative z-10">
        View case study
      </span>
      <span className="sr-only"> — {clientName}</span>
      <svg
        width="28"
        height="11"
        viewBox="0 0 28 11"
        fill="none"
        aria-hidden="true"
        data-work-cta-arrow
        data-cta-label
        className="relative z-10 shrink-0"
      >
        <path d="M0 5.5h26M22 1.5l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </Link>
  )
}
