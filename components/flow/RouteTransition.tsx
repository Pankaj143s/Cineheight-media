'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ScrollTrigger } from '@/lib/gsap'
import { useReducedMotion } from '@/lib/useMediaPreferences'
import { publishAudioEvent } from '@/lib/audio/audioBus'
import { EASE_CONTROL, EASE_TRAVEL, REDUCED } from '@/lib/motionTokens'
import { scrollToY, syncLenis } from '@/lib/scrollTo'

/*
 * Budget for a normal internal navigation: 300 + 140 + 230 ≈ 670 ms end to end.
 * Long enough that the loading mark is genuinely read rather than glimpsed,
 * short enough that it never feels like waiting. A slow route simply holds on
 * the WAIT ramp below with the mark steady; it never extends the fast path.
 */
const OUT_MS = 300
const IN_MS = 230
const COMPLETE_MS = 140
const NAVIGATION_TIMEOUT_MS = 10_000

/**
 * Progress is a continuously-eased ref, not React state.
 *
 * The bar used to step 6 → 72 → 84 → 100 with a CSS transition whose duration
 * became 1800 ms once it passed 84 — so the last stretch visibly crawled, and
 * on a fast route change the bar was still creeping when the page had already
 * arrived. Now one rAF loop eases toward a ceiling with an exponential
 * approach: it always moves, never reaches the ceiling, and completes the
 * moment the pathname commits.
 */
/** Ceiling and time constant for the first, quick rise. */
const RISE = { ceiling: 0.7, tau: 130, forMs: 260 }
/** Ceiling and time constant while waiting on the route. */
const WAIT = { ceiling: 0.88, tau: 700 }
/** Time constant for the final run to 100 %; tuned to land inside COMPLETE_MS. */
const COMPLETE_TAU = 38

type Phase = 'idle' | 'out' | 'in'

export default function RouteTransition() {
  const router = useRouter()
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const pendingRef = useRef<string | null>(null)
  const startedAtRef = useRef(0)
  const timers = useRef<number[]>([])
  /**
   * Should the destination open at its top?
   *
   * True for ordinary pushed navigation — clicking "Next project" halfway down
   * a case study must not drop you halfway down the next one, past its opening
   * animations. False for history navigation, where the browser is restoring a
   * real scroll position and overriding it would break Back/Forward, and false
   * for links carrying a hash, which are asking for a specific anchor.
   */
  const forceTopRef = useRef(false)

  // Progress lives in refs and is painted straight to the DOM — no React state,
  // so a 60 Hz bar never re-renders the overlay.
  const overlayRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const capRef = useRef<HTMLSpanElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const reducedSignalRef = useRef<HTMLSpanElement>(null)
  const progressRef = useRef(0)
  const completingRef = useRef(false)
  const rafRef = useRef(0)
  const trackWidthRef = useRef(0)

  const paint = useCallback((p: number) => {
    progressRef.current = p
    if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(4)})`
    // The leading light rides the actual end of the fill, so the two can never
    // drift apart the way a separately-timed element would.
    if (capRef.current) {
      capRef.current.style.transform = `translate3d(${(p * trackWidthRef.current).toFixed(2)}px, -50%, 0)`
      capRef.current.style.opacity = p > 0.02 && p < 0.999 ? '1' : '0'
    }
    overlayRef.current?.setAttribute('data-route-progress', String(Math.round(p * 100)))
  }, [])

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }, [])

  const finish = useCallback(() => {
    clearTimers()
    stopLoop()
    pendingRef.current = null
    completingRef.current = false
    progressRef.current = 0
    setPhase('idle')
  }, [clearTimers, stopLoop])

  /** Start (or restart) the progress loop. */
  const runLoop = useCallback(() => {
    stopLoop()
    let last = performance.now()
    const started = last

    const tick = (now: number) => {
      const dt = Math.min(50, now - last || 16)
      last = now
      const p = progressRef.current

      if (completingRef.current) {
        const next = p + (1 - p) * (1 - Math.exp(-dt / COMPLETE_TAU))
        paint(next > 0.999 ? 1 : next)
        if (progressRef.current >= 1) {
          stopLoop()
          return
        }
      } else {
        const early = now - started < RISE.forMs
        const { ceiling, tau } = early ? RISE : WAIT
        paint(p + (ceiling - p) * (1 - Math.exp(-dt / tau)))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [paint, stopLoop])

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timers.current.push(timer)
    return timer
  }, [])

  const begin = useCallback(
    (target: string, push: boolean, forceTop = push) => {
      if (pendingRef.current) return false
      clearTimers()
      pendingRef.current = target
      forceTopRef.current = forceTop
      startedAtRef.current = performance.now()
      completingRef.current = false
      progressRef.current = 0
      setPhase('out')
      publishAudioEvent({ type: 'route-out' })

      // Hand the route to Next straight away — the loader is feedback, it must
      // never be the thing delaying navigation.
      if (push) router.push(target)
      schedule(finish, NAVIGATION_TIMEOUT_MS)
      return true
    },
    [clearTimers, finish, router, schedule]
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
      // A link carrying a hash is asking for a specific anchor on the
      // destination, so it keeps its own scroll behaviour.
      begin(url.pathname + url.search + url.hash, true, !url.hash)
      // A second click while a transition is in flight is ignored by `begin`,
      // which is the point: the first destination always wins and the bar never
      // restarts or jumps backwards.
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

  /*
   * Start the progress loop as soon as the overlay is on screen, once the bar
   * has a measurable width for the leading light to travel along.
   *
   * This deliberately covers the `in` phase too. Tearing the loop down when the
   * phase flipped left the bar frozen a couple of percent short of full, since
   * the final ramp is still running at that moment.
   */
  useEffect(() => {
    if (phase === 'idle' || reduced) return
    if (phase === 'out') {
      trackWidthRef.current = trackRef.current?.getBoundingClientRect().width ?? 0
      paint(0)
    }
    runLoop()
    return stopLoop
  }, [paint, phase, reduced, runLoop, stopLoop])

  useEffect(() => {
    if (!reduced || phase === 'idle') return
    const overlay = overlayRef.current
    const signal = reducedSignalRef.current
    const entering = phase === 'out'
    const animations = [
      overlay?.animate(
        entering
          ? [{ opacity: 0.38 }, { opacity: 1 }]
          : [{ opacity: 1 }, { opacity: 0 }],
        { duration: entering ? REDUCED.routeOutMs : REDUCED.routeInMs, easing: REDUCED.ease, fill: 'forwards' }
      ),
      signal?.animate(
        entering
          ? [
              { opacity: 0.3, transform: 'scaleX(0.2)', boxShadow: '0 0 0 rgba(0,137,255,0)' },
              { opacity: 0.95, transform: 'scaleX(1)', boxShadow: '0 0 14px rgba(0,137,255,0.65)' },
            ]
          : [{ opacity: 0.95 }, { opacity: 0.2 }],
        { duration: entering ? REDUCED.routeOutMs : REDUCED.routeInMs, easing: REDUCED.ease, fill: 'forwards' }
      ),
    ].filter(Boolean) as Animation[]
    return () => animations.forEach((animation) => animation.cancel())
  }, [phase, reduced])

  useEffect(() => {
    if (!pendingRef.current) return
    const minimumVisible = reduced ? REDUCED.routeOutMs : OUT_MS
    const remaining = Math.max(0, minimumVisible - (performance.now() - startedAtRef.current))

    clearTimers()
    schedule(() => {
      // Run the bar home, then reveal.
      completingRef.current = true
      if (reduced) paint(1)
      schedule(() => {
        pendingRef.current = null

        /*
         * Position the destination while the overlay still covers it.
         *
         * Next's own scroll reset races Lenis, which keeps its own internal
         * target and will animate back to the stale position on the next wheel
         * event. Doing it here — explicitly, through the one scroll helper, and
         * before anything is visible — makes the arrival deterministic instead.
         */
        if (forceTopRef.current) scrollToY(0, { immediate: true })
        else syncLenis() // history restored the position; re-seat Lenis on it.

        /*
         * Re-measure every trigger against the settled position and the
         * destination's real layout, so its entry animations start from their
         * true `from` state rather than from wherever the previous page's
         * measurements left them.
         */
        ScrollTrigger.refresh()

        // Guarantee a full bar at the moment the destination is revealed,
        // whatever the ramp happened to be doing.
        paint(1)
        setPhase('in')
        publishAudioEvent({ type: 'route-in' })
        schedule(finish, reduced ? REDUCED.routeInMs : IN_MS)
      }, reduced ? 32 : COMPLETE_MS)
    }, remaining)
  }, [pathname, reduced, clearTimers, finish, paint, schedule])

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
        ref={overlayRef}
        aria-hidden="true"
        data-route-loader
        data-route-phase={phase}
        data-route-progress={0}
        className="pointer-events-none fixed inset-0"
        style={{ contain: 'paint', zIndex: 'var(--z-route)' }}
      >
        <div
          className="absolute inset-0 origin-top"
          style={{
            background: 'linear-gradient(to bottom, #020306, #04070d)',
            clipPath: reduced ? 'inset(0)' : undefined,
            animation: reduced
              ? 'none'
              : phase === 'out'
                ? `route-close ${outDuration}ms ${EASE_TRAVEL} forwards`
                : `route-open ${inDuration}ms ${EASE_CONTROL} forwards`,
          }}
        />
        {!reduced ? (
          <div
            className="absolute inset-x-0"
            style={{
              height: 2,
              background:
                'linear-gradient(to right, transparent, #0089FF 20%, #DCEEFF 50%, #0089FF 80%, transparent)',
              boxShadow: '0 0 16px 3px rgba(0,137,255,0.45)',
              animation:
                phase === 'out'
                  ? `route-signal-down ${outDuration}ms ${EASE_TRAVEL} forwards`
                  : `route-signal-up ${inDuration}ms ${EASE_CONTROL} forwards`,
            }}
          />
        ) : (
          <span
            ref={reducedSignalRef}
            className="absolute inset-x-[12%] top-1/2 h-px origin-center bg-[var(--blue-500)]"
            style={{ opacity: 0.3, transform: 'scaleX(0.2)' }}
          />
        )}
        {/*
          The mark holds. It used to run a single 0 → 1 → 0 keyframe across one
          phase duration and remount on the phase change, so it was on screen
          for well under a fifth of a second and the transition read as a plain
          black wipe. Now it rises during `out`, *stays* through the wait
          however long the route takes, and only leaves during `in`.
        */}
        <div
          className="route-loader-mark absolute inset-0 flex items-center justify-center"
          data-route-mark-phase={phase}
          style={{
            animationName: reduced ? 'none' : phase === 'out' ? 'route-loader-mark-in' : 'route-loader-mark-out',
            animationDuration: `${phase === 'out' ? outDuration : inDuration}ms`,
          }}
        >
          <div className="w-[min(78vw,24rem)]">
            <div className="flex items-end justify-between gap-5">
              <span className="route-loader-word font-display text-base font-bold uppercase text-text-100 sm:text-lg">
                Cineheight
              </span>
              <span
                className="font-display text-[8px] font-medium uppercase text-[var(--blue-200)]"
                style={{ letterSpacing: '0.28em' }}
              >
                Signal / Loading
              </span>
            </div>
            {/*
              The bar and the light in front of it are written by the same rAF
              from the same number, so the light is always exactly at the end of
              the fill. `overflow` stays visible on the track so the light's
              glow is not clipped.
            */}
            <div ref={trackRef} className="relative mt-5 h-[2px] rounded-full bg-white/12">
              <span
                ref={barRef}
                className="route-loader-progress absolute inset-0 block h-full origin-left rounded-full bg-[var(--blue-500)]"
                style={{
                  transform: reduced ? 'scaleX(0.18)' : 'scaleX(0)',
                  boxShadow: '0 0 12px rgba(0,137,255,0.75)',
                }}
              />
              {!reduced && (
                <span
                  ref={capRef}
                  className="absolute left-0 top-1/2 block h-[5px] w-[5px] rounded-full bg-[#DCEEFF]"
                  style={{
                    transform: 'translate3d(0, -50%, 0)',
                    opacity: 0,
                    boxShadow: '0 0 10px 2px rgba(0,137,255,0.85)',
                    transition: `opacity 160ms ${EASE_CONTROL}`,
                  }}
                />
              )}
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
