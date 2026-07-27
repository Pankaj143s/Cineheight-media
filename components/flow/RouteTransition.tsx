'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useReducedMotion } from '@/lib/useMediaPreferences'

/**
 * A route transition that begins on the CLICK, not after the route has already
 * changed.
 *
 * The previous version watched `usePathname()`, so the sweep only started once
 * the destination was already rendering — the visitor saw the old page sit
 * still, then the new page arrive, then an animation play over the top of it.
 *
 * This version intercepts internal navigation in the capture phase of a single
 * document-level click listener. One file covers every `<Link>` and `<a>` on
 * the site, including ones added later, with no transition-aware link component
 * to remember to use.
 *
 * Sequence (≈600 ms total):
 *   0 ms    signal sweeps down, dark mask closes        (≈210 ms)
 *   210 ms  router.push()
 *   →       mask clips away revealing the destination   (≈320 ms)
 *
 * Left alone deliberately: external links, `mailto:` / `tel:` / `wa.me` and
 * other non-http schemes, same-page `#anchors`, downloads, `target=_blank`,
 * and any click carrying a modifier key or a non-primary button — those must
 * behave exactly as the browser intends. Back/forward is untouched, so scroll
 * restoration keeps working.
 */

const OUT_MS = 210
const IN_MS = 320

type Phase = 'idle' | 'out' | 'in'

export default function RouteTransition() {
  const router = useRouter()
  const pathname = usePathname()
  const reduced = useReducedMotion()

  const [phase, setPhase] = useState<Phase>('idle')
  const pendingRef = useRef<string | null>(null)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  useEffect(() => {
    if (reduced) return

    const onClick = (e: MouseEvent) => {
      // Only a plain primary click — never steal a modified or middle click.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = (e.target as HTMLElement | null)?.closest?.('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href) return
      // mailto:, tel:, https://wa.me/…, instagram — all leave the site.
      if (/^[a-z]+:/i.test(href) && !href.startsWith('/') && !href.startsWith(location.origin)) {
        if (!href.startsWith('http')) return
      }

      let url: URL
      try {
        url = new URL(anchor.href, location.href)
      } catch {
        return
      }
      if (url.origin !== location.origin) return
      // Same-page anchor / identical route — let the browser handle it.
      if (url.pathname === location.pathname && url.search === location.search) return
      if (pendingRef.current) {
        // A transition is already running; swallow the second click rather
        // than queueing a double navigation.
        e.preventDefault()
        return
      }

      e.preventDefault()
      pendingRef.current = url.pathname + url.search
      setPhase('out')

      clearTimers()
      timers.current.push(
        window.setTimeout(() => {
          const target = pendingRef.current
          if (target) router.push(target)
        }, OUT_MS)
      )
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [router, reduced, clearTimers])

  // The destination has rendered — clip the mask away.
  useEffect(() => {
    if (!pendingRef.current) return
    pendingRef.current = null
    setPhase('in')
    clearTimers()
    timers.current.push(window.setTimeout(() => setPhase('idle'), IN_MS))
  }, [pathname, clearTimers])

  if (reduced || phase === 'idle') return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80]"
      // The overlay is never interactive, so it cannot delay a click or trap
      // focus even mid-transition.
    >
      <div
        className="absolute inset-0 origin-top"
        style={{
          background: 'linear-gradient(to bottom, #020306, #04070d)',
          animation:
            phase === 'out'
              ? `route-close ${OUT_MS}ms cubic-bezier(0.65,0,0.35,1) forwards`
              : `route-open ${IN_MS}ms cubic-bezier(0.22,1,0.36,1) forwards`,
        }}
      />
      <div
        className="absolute inset-x-0"
        style={{
          height: 2,
          background:
            'linear-gradient(to right, transparent, #0089FF 20%, #DCEEFF 50%, #0089FF 80%, transparent)',
          boxShadow: '0 0 16px 3px rgba(0,137,255,0.6)',
          animation:
            phase === 'out'
              ? `route-signal-down ${OUT_MS}ms cubic-bezier(0.65,0,0.35,1) forwards`
              : `route-signal-up ${IN_MS}ms cubic-bezier(0.22,1,0.36,1) forwards`,
        }}
      />
    </div>
  )
}
