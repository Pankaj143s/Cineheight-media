'use client'

import { useEffect, useRef } from 'react'

/**
 * Shared playback discipline for every inline video on the site (spec §30):
 * poster-first, muted, playsInline; plays only while sufficiently visible
 * AND the document is visible AND the user hasn't explicitly paused it;
 * pauses (not resets) when it scrolls away. `enabled` gates gallery items so
 * ONLY the active reel/testimonial ever plays.
 *
 * Hysteresis (play ≥ playAt, pause < pauseAt) prevents restart churn during
 * small scroll jitters.
 */
export function useActiveVideo(
  videoRef: React.RefObject<HTMLVideoElement>,
  {
    enabled = true,
    playAt = 0.55,
    pauseAt = 0.25,
    respectReducedMotion = true,
  }: { enabled?: boolean; playAt?: number; pauseAt?: number; respectReducedMotion?: boolean } = {}
) {
  const userPausedRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const reduced = respectReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let visible = false

    const tryPlay = () => {
      if (enabled && visible && !document.hidden && !userPausedRef.current && !reduced) {
        video.play().catch(() => {})
      }
    }

    if (!enabled) video.pause()

    const io = new IntersectionObserver(
      ([entry]) => {
        const r = entry.intersectionRatio
        if (r >= playAt) {
          visible = true
          tryPlay()
        } else if (r < pauseAt) {
          visible = false
          video.pause()
        }
      },
      { threshold: [0, pauseAt, playAt, 0.8] }
    )
    io.observe(video)

    const onVis = () => (document.hidden ? video.pause() : tryPlay())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      video.pause()
    }
  }, [videoRef, enabled, playAt, pauseAt, respectReducedMotion])

  /** Call from a user play/pause control so we respect their intent. */
  const setUserPaused = (paused: boolean) => {
    userPausedRef.current = paused
  }
  return { setUserPaused }
}
