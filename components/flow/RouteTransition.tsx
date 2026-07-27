'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useReducedMotion } from '@/lib/useMediaPreferences'

const OUT_MS = 430
const IN_MS = 390
const COMPLETE_MS = 140
const NAVIGATION_TIMEOUT_MS = 10_000

type Phase = 'idle' | 'out' | 'in'

export default function RouteTransition() {
  const router = useRouter()
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const pendingRef = useRef<string | null>(null)
  const startedAtRef = useRef(0)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }, [])

  const finish = useCallback(() => {
    clearTimers()
    pendingRef.current = null
    setProgress(0)
    setPhase('idle')
  }, [clearTimers])

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timers.current.push(timer)
    return timer
  }, [])

  const begin = useCallback(
    (target: string, push: boolean) => {
      if (pendingRef.current) return false
      clearTimers()
      pendingRef.current = target
      startedAtRef.current = performance.now()
      setPhase('out')
      setProgress(6)

      schedule(() => setProgress(72), reduced ? 32 : 20)
      schedule(
        () => {
          setProgress(84)
          if (push) router.push(target)
        },
        reduced ? 80 : OUT_MS
      )
      schedule(finish, NAVIGATION_TIMEOUT_MS)
      return true
    },
    [clearTimers, finish, reduced, router, schedule]
  )

  useEffect(() => () => clearTimers(), [clearTimers])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const anchor = (event.target as HTMLElement | null)?.closest?.('a')
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href) return
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
      if (url.pathname === location.pathname) return

      event.preventDefault()
      if (!begin(url.pathname + url.search, true)) {
        // Never queue a second destination behind an in-flight transition.
        return
      }
    }

    const onPopState = () => {
      // The browser owns history navigation, so the overlay begins immediately
      // and completes when Next publishes the new pathname.
      begin(`history:${location.pathname}${location.search}`, false)
    }

    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
    }
  }, [begin])

  useEffect(() => {
    if (!pendingRef.current) return
    const minimumVisible = reduced ? 80 : OUT_MS
    const remaining = Math.max(0, minimumVisible - (performance.now() - startedAtRef.current))

    clearTimers()
    schedule(() => {
      setProgress(100)
      schedule(() => {
        pendingRef.current = null
        setPhase('in')
        schedule(finish, reduced ? 120 : IN_MS)
      }, reduced ? 32 : COMPLETE_MS)
    }, remaining)
  }, [pathname, reduced, clearTimers, finish, schedule])

  useEffect(() => {
    if (phase === 'idle') {
      document.body.removeAttribute('aria-busy')
      return
    }
    document.body.setAttribute('aria-busy', 'true')
    return () => document.body.removeAttribute('aria-busy')
  }, [phase])

  if (phase === 'idle') return null

  const outDuration = reduced ? 0 : OUT_MS
  const inDuration = reduced ? 0 : IN_MS

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        Loading page
      </span>
      <div
        aria-hidden="true"
        data-route-loader
        data-route-phase={phase}
        data-route-progress={Math.round(progress)}
        className="pointer-events-none fixed inset-0 z-[80]"
        style={{ contain: 'paint' }}
      >
        <div
          className="absolute inset-0 origin-top"
          style={{
            background: 'linear-gradient(to bottom, #020306, #04070d)',
            clipPath: reduced ? 'inset(0)' : undefined,
            animation: reduced
              ? 'none'
              : phase === 'out'
                ? `route-close ${outDuration}ms cubic-bezier(0.65,0,0.35,1) forwards`
                : `route-open ${inDuration}ms cubic-bezier(0.22,1,0.36,1) forwards`,
          }}
        />
        {!reduced && (
          <div
            className="absolute inset-x-0"
            style={{
              height: 2,
              background:
                'linear-gradient(to right, transparent, #0089FF 20%, #DCEEFF 50%, #0089FF 80%, transparent)',
              boxShadow: '0 0 16px 3px rgba(0,137,255,0.6)',
              animation:
                phase === 'out'
                  ? `route-signal-down ${outDuration}ms cubic-bezier(0.65,0,0.35,1) forwards`
                  : `route-signal-up ${inDuration}ms cubic-bezier(0.22,1,0.36,1) forwards`,
            }}
          />
        )}
        <div
          key={phase}
          className="route-loader-mark absolute inset-0 flex items-center justify-center"
          style={{ animationDuration: `${phase === 'out' ? outDuration : inDuration}ms` }}
        >
          <div className="w-[min(74vw,22rem)]">
            <div className="flex items-end justify-between gap-5">
              <span className="route-loader-word font-display text-sm font-bold uppercase text-text-100 sm:text-base">
                Cineheight
              </span>
              <span
                className="font-display text-[8px] font-medium uppercase text-[var(--blue-200)]"
                style={{ letterSpacing: '0.28em' }}
              >
                Signal / Loading
              </span>
            </div>
            <div className="mt-4 h-px overflow-hidden bg-white/10">
              <span
                className="route-loader-progress block h-full origin-left bg-[var(--blue-500)]"
                style={{
                  transform: `scaleX(${progress / 100})`,
                  transition: reduced
                    ? 'none'
                    : `transform ${progress === 100 ? COMPLETE_MS : progress >= 84 ? 1800 : OUT_MS}ms cubic-bezier(0.22,1,0.36,1)`,
                }}
              />
            </div>
            <div className="mt-2 flex justify-between">
              <span className="h-1 w-1 rounded-full bg-[var(--blue-400)] shadow-[0_0_10px_rgba(0,137,255,0.9)]" />
              <span className="h-1 w-1 rounded-full bg-white/35" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
