'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { subscribeHeroProgress } from '@/lib/heroProgress'
import { useReducedMotion } from '@/lib/useMediaPreferences'
import { navItems } from '@/content/siteContent'

/**
 * Hidden on the homepage's initial hero, revealed once intro progress passes
 * ~68% (hysteresis prevents flicker). On every other route it is visible
 * immediately. Items are the verified real routes (no Insights — no insight
 * content exists; docs/ROUTE-MAP.md).
 */
export default function Navbar() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [visible, setVisible] = useState(!isHome)
  const [menuOpen, setMenuOpen] = useState(false)
  const visibleRef = useRef(!isHome)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isHome) {
      visibleRef.current = true
      setVisible(true)
      return
    }
    return subscribeHeroProgress((p) => {
      const next = visibleRef.current ? p > 0.58 : p > 0.66
      if (next !== visibleRef.current) {
        visibleRef.current = next
        setVisible(next)
        if (!next) setMenuOpen(false)
      }
    })
  }, [isHome])

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        opacity: visible ? 1 : 0,
        transform: reduced ? 'none' : visible ? 'translateY(0)' : 'translateY(-12px)',
        transition: reduced
          ? 'opacity 0.2s linear'
          : 'opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)',
        pointerEvents: visible ? 'auto' : 'none',
        visibility: visible ? 'visible' : 'hidden',
        background:
          'linear-gradient(to bottom, rgba(2,3,6,0.82), rgba(2,3,6,0.6) 80%, rgba(2,3,6,0.2))',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:h-[72px] lg:px-10">
        {/* Wordmark — stacked, as in the approved reference */}
        <Link href="/" className="flex flex-col leading-none" aria-label="Cineheight Media — home">
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
        </Link>

        {/* Desktop links */}
        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className="text-[11px] font-medium uppercase text-text-200 transition-colors duration-200 hover:text-[var(--blue-400)] focus-visible:text-[var(--blue-400)]"
              style={{ letterSpacing: '0.24em', color: pathname === item.href ? 'var(--blue-400)' : undefined }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/contact"
            className="hidden items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-medium uppercase text-text-100 transition-colors duration-200 hover:border-[var(--blue-400)] hover:text-[var(--blue-200)] sm:inline-flex"
            style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)' }}
          >
            Start a Project
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M1.5 8.5 8.5 1.5M3 1.5h5.5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </Link>

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
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              aria-current={pathname === item.href ? 'page' : undefined}
              className="border-b py-3.5 text-sm uppercase text-text-200"
              style={{ letterSpacing: '0.22em', borderColor: 'var(--border)' }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-xs font-medium uppercase text-text-100"
            style={{ letterSpacing: '0.2em', borderColor: 'var(--blue-alpha-40)' }}
          >
            Start a Project
          </Link>
        </nav>
      </div>
    </header>
  )
}
