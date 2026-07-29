/**
 * The one place programmatic scrolling is allowed to happen.
 *
 * Lenis lives privately inside SmoothScrollProvider; anything that scrolls the
 * page without going through it (a bare `window.scrollTo`) leaves Lenis's
 * internal target stale, and the next wheel event visibly snaps back. So the
 * provider registers its instance here, and every feature (showreel centring,
 * phone-reel centring, route scroll-to-top) calls these helpers instead.
 *
 * Under `prefers-reduced-motion` no Lenis exists at all — the helpers fall back
 * to native scrolling, instant for `immediate` and smooth otherwise.
 */
import type Lenis from 'lenis'

let lenis: Lenis | null = null

export function registerLenis(instance: Lenis | null) {
  lenis = instance
}

export interface ScrollToOptions {
  /** Jump without animation (used under route-transition cover / reduced motion). */
  immediate?: boolean
  /** Animation duration in seconds when not immediate. */
  duration?: number
  onComplete?: () => void
}

export function scrollToY(y: number, opts: ScrollToOptions = {}) {
  const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const target = Math.max(0, Math.min(y, limit))

  /**
   * `onComplete` is a promise, not a hope.
   *
   * Callers use it to sequence something the visitor asked for — the phone-reel
   * lightbox opens once its section has centred. If the tween is interrupted
   * (a route change, a resize, a backgrounded tab that stops driving frames),
   * a callback that never fires means the click silently did nothing. So the
   * callback is wrapped to run exactly once, with a timer backstop.
   */
  const duration = opts.duration ?? 0.9
  let fired = false
  const complete = () => {
    if (fired) return
    fired = true
    opts.onComplete?.()
  }
  if (opts.onComplete && !opts.immediate) {
    window.setTimeout(complete, duration * 1000 + 400)
  }

  if (lenis) {
    lenis.scrollTo(target, {
      immediate: opts.immediate,
      duration,
      // `lock` stops user input from cancelling the travel mid-way;
      // `force` overrides Lenis's "already there" early-out so the internal
      // target is always re-seated.
      lock: !opts.immediate,
      force: true,
      onComplete: complete,
    })
    if (opts.immediate) complete()
    return
  }

  // Native fallback (reduced motion, or before the provider mounts).
  window.scrollTo({ top: target, behavior: opts.immediate ? 'auto' : 'smooth' })
  if (!opts.onComplete) return
  if (opts.immediate) {
    complete()
    return
  }
  // Smooth native scrolling has no completion callback; poll for settle. The
  // timer backstop above still guarantees the callback if this loop is starved.
  let lastY = window.scrollY
  let still = 0
  const check = () => {
    if (fired) return
    const yNow = window.scrollY
    if (Math.abs(yNow - lastY) < 1) still += 1
    else still = 0
    lastY = yNow
    if (still >= 3) {
      complete()
      return
    }
    requestAnimationFrame(check)
  }
  requestAnimationFrame(check)
}

/** Centre an element vertically in the viewport. */
export function scrollToElementCenter(el: HTMLElement, opts: ScrollToOptions = {}) {
  const rect = el.getBoundingClientRect()
  const target = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2
  scrollToY(target, opts)
}

/**
 * Re-seat Lenis's internal target onto the browser's current scroll position.
 * Needed after browser-driven scrolls (back/forward restoration) so the next
 * wheel event doesn't animate from a stale position.
 */
export function syncLenis() {
  lenis?.scrollTo(window.scrollY, { immediate: true, force: true })
}
