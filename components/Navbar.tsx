'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribeHeroProgress } from '@/lib/heroProgress'
import { useReducedMotion } from '@/lib/useMediaPreferences'

const NAV_ITEMS = [
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'Process', href: '#process' },
  { label: 'About', href: '#about' },
  { label: 'Insights', href: '#insights' },
  { label: 'Contact', href: '#contact' },
]

/**
 * Hidden on the initial hero (spec §10/§13). Reveals with a soft fade +
 * small vertical move once hero progress passes ~62%, hides again below
 * ~55% (hysteresis so it never flickers). Reduced motion: simple state
 * change, no transform animation.
 */
export default function Navbar() {
  const [visible, setVisible] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const visibleRef = useRef(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    return subscribeHeroProgress((p) => {
      const next = visibleRef.current ? p > 0.55 : p > 0.62
      if (next !== visibleRef.current) {
        visibleRef.current = next
        setVisible(next)
        if (!next) setMenuOpen(false)
      }
    })
  }, [])

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        opacity: visible ? 1 : 0,
        transform: reduced ? 'none' : visible ? 'translateY(0)' : 'translateY(-14px)',
        transition: reduced
          ? 'opacity 0.2s linear'
          : 'opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1)',
        pointerEvents: visible ? 'auto' : 'none',
        visibility: visible ? 'visible' : 'hidden',
        background:
          'linear-gradient(to bottom, rgba(2,3,6,0.72), rgba(2,3,6,0.28) 70%, transparent)',
      }}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:h-[72px] lg:px-10">
        {/* Wordmark — stacked, as in the approved reference */}
        <a href="#top" className="flex flex-col leading-none" aria-label="Cineheight Media — back to top">
          <span
            className="font-display text-[15px] font-700 text-text-100"
            style={{ letterSpacing: '0.34em', fontWeight: 700 }}
          >
            CINEHEIGHT
          </span>
          <span
            className="mt-1 text-[9px] uppercase text-text-300"
            style={{ letterSpacing: '0.52em', marginLeft: '0.1em' }}
          >
            Media
          </span>
        </a>

        {/* Desktop links */}
        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[11px] font-medium uppercase text-text-200 transition-colors duration-200 hover:text-text-100"
              style={{ letterSpacing: '0.24em' }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="#contact"
            className="hidden items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-medium uppercase text-text-100 transition-colors duration-200 hover:border-[var(--blue-400)] hover:text-[var(--blue-200)] sm:inline-flex"
            style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)' }}
          >
            Start a Project
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M1.5 8.5 8.5 1.5M3 1.5h5.5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </a>

          {/* Mobile menu button — ≥44px touch target */}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="relative block h-3 w-6" aria-hidden="true">
              <span
                className="absolute left-0 top-0 h-px w-full bg-text-100 transition-transform duration-300"
                style={{ transform: menuOpen ? 'translateY(5.5px) rotate(45deg)' : 'none' }}
              />
              <span
                className="absolute bottom-0 left-0 h-px w-full bg-text-100 transition-transform duration-300"
                style={{ transform: menuOpen ? 'translateY(-5.5px) rotate(-45deg)' : 'none' }}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className="lg:hidden"
        style={{
          maxHeight: menuOpen ? '420px' : '0',
          overflow: 'hidden',
          transition: reduced ? 'none' : 'max-height 0.4s cubic-bezier(0.22,1,0.36,1)',
          background: 'rgba(2,3,6,0.94)',
        }}
      >
        <nav aria-label="Primary mobile" className="flex flex-col px-6 pb-6 pt-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="border-b py-3.5 text-sm uppercase text-text-200"
              style={{ letterSpacing: '0.22em', borderColor: 'var(--border)' }}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setMenuOpen(false)}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-xs font-medium uppercase text-text-100"
            style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)' }}
          >
            Start a Project
          </a>
        </nav>
      </div>
    </header>
  )
}
