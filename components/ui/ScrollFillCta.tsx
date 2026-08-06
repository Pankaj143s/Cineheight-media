'use client'

import Link from 'next/link'
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react'
import { clamp } from '@/lib/utils'
import { reportUiClick } from '@/lib/audio/reportUiClick'
import { useReducedMotion } from '@/lib/useMediaPreferences'
import './scroll-fill-cta.css'

export type ScrollFillMode = 'inherit' | 'scroll' | 'hover'

type BaseProps = {
  children: ReactNode
  className?: string
  /** inherit = parent --cta-expand; scroll = viewport progress; hover = full at rest */
  fillMode?: ScrollFillMode
  arrow?: boolean
  tabIndex?: number
}

type AsLink = BaseProps & {
  as?: 'link'
  href: string
  onClick?: () => void
  'aria-label'?: string
}

type AsButton = BaseProps & {
  as: 'button'
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  disabled?: boolean
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
}

const baseClass =
  'font-display relative inline-flex min-h-[52px] items-center gap-3 overflow-hidden px-7 py-3.5 text-sm font-medium uppercase'

function FillLayers({ children, arrow }: { children: ReactNode; arrow?: boolean }) {
  return (
    <>
      <span data-scroll-fill-bg aria-hidden="true" className="absolute inset-0" />
      <span className="relative z-10">{children}</span>
      {arrow ? (
        <svg
          width="28"
          height="11"
          viewBox="0 0 28 11"
          fill="none"
          aria-hidden="true"
          data-scroll-fill-arrow
          className="relative z-10 shrink-0"
        >
          <path d="M0 5.5h26M22 1.5l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      ) : null}
    </>
  )
}

function useLocalScrollFill(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  reduced: boolean
) {
  useEffect(() => {
    if (!enabled || reduced) return
    const el = ref.current
    if (!el) return

    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const start = vh * 0.9
      const end = vh * 0.42
      const t = clamp((start - r.top) / Math.max(start - end, 1), 0, 1)
      const eased = 1 - (1 - t) * (1 - t)
      el.style.setProperty('--local-fill', String(eased))
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [enabled, reduced, ref])
}

/**
 * Square CTA: blue fill tracks scroll; soft glow on hover. White type.
 */
export default function ScrollFillCta(props: AsLink | AsButton) {
  const fillMode = props.fillMode ?? 'scroll'
  const arrow = props.arrow !== false
  const className = props.className ?? ''
  const tabIndex = props.tabIndex
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement | null>(null)
  useLocalScrollFill(ref, fillMode === 'scroll', reduced)

  const classes = `${baseClass} ${className}`.trim()
  const style = { letterSpacing: '0.18em' as const }

  if (props.as === 'button') {
    return (
      <button
        ref={ref as RefObject<HTMLButtonElement>}
        type={props.type ?? 'button'}
        disabled={props.disabled}
        tabIndex={tabIndex}
        data-scroll-fill
        data-fill-mode={fillMode}
        className={classes}
        style={style}
        onClick={(e) => {
          reportUiClick()
          props.onClick?.(e)
        }}
      >
        <FillLayers arrow={arrow}>{props.children}</FillLayers>
      </button>
    )
  }

  return (
    <Link
      ref={ref as RefObject<HTMLAnchorElement>}
      href={props.href}
      tabIndex={tabIndex}
      data-scroll-fill
      data-fill-mode={fillMode}
      className={classes}
      style={style}
      aria-label={props['aria-label']}
      onClick={() => {
        reportUiClick()
        props.onClick?.()
      }}
    >
      <FillLayers arrow={arrow}>{props.children}</FillLayers>
    </Link>
  )
}
