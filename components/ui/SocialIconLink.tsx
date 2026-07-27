'use client'

import { useEffect, useRef, useState } from 'react'
import type { SocialLink, SocialPlatform } from '@/content/siteContent'
import { DURATION_MS, EASE_CONTROL } from '@/lib/motionTokens'

/**
 * A social channel control.
 *
 * Three of the four channels have no profile yet and Instagram's is being held
 * back until launch, so all four are placeholders in this pass. A placeholder
 * is a real `<button>`, not an `href="#"` anchor and not a dimmed
 * `cursor-not-allowed` glyph: the first lies to the browser and to screen
 * readers about being a link, and the second removes the only affordance that
 * would let someone discover what the icon even is. Instead the button carries
 * its own explanation and says so when pressed.
 *
 * Flipping a channel live is a content edit (`status: 'live'`) — the markup and
 * every hover state below are shared by both branches.
 */

function SocialGlyph({ platform }: { platform: SocialPlatform }) {
  if (platform === 'facebook') {
    return <path d="M14.4 8.2h2.4V4.5c-.4-.1-1.8-.2-3.4-.2-3.3 0-5.6 2-5.6 5.8v3.2H4v4.2h3.8V28h4.7V17.5h3.7l.6-4.2h-4.3v-2.8c0-1.2.3-2.3 1.9-2.3Z" />
  }
  if (platform === 'instagram') {
    return (
      <>
        <rect x="4.5" y="4.5" width="23" height="23" rx="6.4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="16" r="5.3" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="23.5" cy="8.7" r="1.25" />
      </>
    )
  }
  if (platform === 'youtube') {
    return (
      <>
        <path d="M28 10.1a4 4 0 0 0-2.8-2.8C22.7 6.6 16 6.6 16 6.6s-6.7 0-9.2.7A4 4 0 0 0 4 10.1 42 42 0 0 0 3.3 16 42 42 0 0 0 4 21.9a4 4 0 0 0 2.8 2.8c2.5.7 9.2.7 9.2.7s6.7 0 9.2-.7a4 4 0 0 0 2.8-2.8 42 42 0 0 0 .7-5.9 42 42 0 0 0-.7-5.9Z" />
        <path d="m13.3 20.2 7-4.2-7-4.2v8.4Z" fill="#020306" />
      </>
    )
  }
  return (
    <>
      <path d="M6.3 11.2h4.3V25H6.3V11.2Zm2.2-6.9A2.5 2.5 0 1 1 8.5 9a2.4 2.4 0 0 1 0-4.8Z" />
      <path d="M13.4 11.2h4.1v1.9h.1c.6-1.1 2-2.4 4.1-2.4 4.4 0 5.2 2.9 5.2 6.7V25h-4.3v-6.7c0-1.6 0-3.7-2.3-3.7s-2.6 1.8-2.6 3.6V25h-4.3V11.2Z" />
    </>
  )
}

/** Shared 44 px target, ring, rising blue fill and glyph. */
const SHELL_CLASS =
  'group relative flex h-11 w-11 items-center justify-center rounded-full text-text-300 ' +
  'transition-[transform,color,filter] duration-300 ease-out ' +
  'hover:-translate-y-[3px] hover:text-[var(--blue-050)] ' +
  'focus-visible:-translate-y-[3px] focus-visible:text-[var(--blue-050)] ' +
  'active:translate-y-0 active:scale-95'

function Decoration({ platform }: { platform: SocialPlatform }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border transition-colors duration-300 group-hover:border-[var(--blue-500)] group-focus-visible:border-[var(--blue-500)]"
        style={{ borderColor: 'var(--border-strong)' }}
      />
      {/* Blue fill rising from the base of the circle on hover and focus. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 origin-bottom scale-0 rounded-full opacity-0 transition-[transform,opacity] duration-[320ms] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
        style={{
          background:
            'radial-gradient(circle at 50% 100%, rgba(0,137,255,0.85), rgba(0,137,255,0.32) 58%, rgba(0,137,255,0.05) 100%)',
          transitionTimingFunction: EASE_CONTROL,
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ boxShadow: '0 6px 18px -6px rgba(0,137,255,0.55)' }}
      />
      <svg
        width="18"
        height="18"
        viewBox="0 0 32 32"
        fill="currentColor"
        aria-hidden="true"
        className="relative"
      >
        <SocialGlyph platform={platform} />
      </svg>
    </>
  )
}

export default function SocialIconLink({ platform, label, href, status }: SocialLink) {
  const [announced, setAnnounced] = useState(false)
  const timer = useRef<number>()
  const isLive = status === 'live' && !!href

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const announce = () => {
    window.clearTimeout(timer.current)
    setAnnounced(true)
    timer.current = window.setTimeout(() => setAnnounced(false), DURATION_MS.toast)
  }

  if (isLive) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} — opens in a new tab`}
        className={SHELL_CLASS}
      >
        <Decoration platform={platform} />
      </a>
    )
  }

  return (
    <span className="relative">
      <button
        type="button"
        aria-label={`${label} link coming soon`}
        className={SHELL_CLASS}
        onClick={announce}
        onBlur={() => setAnnounced(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setAnnounced(false)
        }}
      >
        <Decoration platform={platform} />
      </button>
      {/*
        Non-blocking and self-dismissing. `role="status"` announces it without
        stealing focus, so it works the same whether it was opened by pointer or
        by keyboard.
      */}
      <span
        role="status"
        aria-live="polite"
        className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[15rem] -translate-x-1/2 rounded-md px-2.5 py-1.5 text-[11px] leading-snug text-text-200 transition-opacity duration-200 ${
          announced ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'rgba(2,3,6,0.94)',
          border: '1px solid var(--border-strong)',
        }}
      >
        {announced ? 'Social link will be connected before launch.' : ''}
      </span>
    </span>
  )
}
