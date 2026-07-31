import { gsap } from '@/lib/gsap'

/**
 * Force readable final visual state for reduced-motion / fail-open paths.
 * Clears travel properties without wiping intentional layout styles.
 */
export function applyMotionFinalState(
  targets: gsap.TweenTarget,
  extras?: gsap.TweenVars
) {
  gsap.set(targets, {
    autoAlpha: 1,
    opacity: 1,
    x: 0,
    y: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    filter: 'none',
    clipPath: 'inset(0% 0% 0% 0%)',
    clearProps: 'transform',
    ...extras,
  })
}
