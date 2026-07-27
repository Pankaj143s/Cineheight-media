'use client'

import { useSoundscape } from './SoundscapeProvider'

/**
 * The one control that turns the soundscape on and off.
 *
 * Present on every route and at every breakpoint — a sound control that only
 * appears on hover, or only on desktop, is not a control. The glyph states are
 * distinct in shape (waves versus a struck-through speaker) rather than only in
 * colour, and `aria-pressed` carries the state for anyone not looking at it.
 */
export default function SoundToggle({ className = '' }: { className?: string }) {
  const { enabled, available, toggle } = useSoundscape()

  // Reduced motion, or a browser with no Web Audio: nothing to control.
  if (!available) return null

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Turn ambient sound off' : 'Turn ambient sound on'}
      data-sound-toggle
      data-sound-enabled={enabled}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-full text-text-300 transition-colors duration-300 hover:text-[var(--blue-200)] focus-visible:text-[var(--blue-200)] ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-1 rounded-full border transition-colors duration-300 group-hover:border-[var(--blue-500)] group-focus-visible:border-[var(--blue-500)]"
        style={{ borderColor: enabled ? 'var(--blue-500)' : 'var(--border-strong)' }}
      />
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="relative"
      >
        <path d="M4 9.5h3.2L11.5 6v12L7.2 14.5H4z" />
        {enabled ? (
          <>
            <path d="M15 9.2a4 4 0 0 1 0 5.6" />
            <path d="M17.8 6.6a8 8 0 0 1 0 10.8" />
          </>
        ) : (
          <>
            <path d="M15.5 9.8 20 14.3" />
            <path d="M20 9.8 15.5 14.3" />
          </>
        )}
      </svg>
      <span className="sr-only">{enabled ? 'Sound on' : 'Sound off'}</span>
    </button>
  )
}
