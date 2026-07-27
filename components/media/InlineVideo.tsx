'use client'

import { useCallback, useRef, useState } from 'react'
import { useActiveVideo } from '@/lib/useActiveVideo'
import { useReportVideoAudible } from '@/lib/audio/useReportVideoAudible'

/**
 * Shared inline video (spec §30): poster-first, muted, playsInline, plays only
 * while sufficiently visible, pauses offscreen/hidden, user pause respected,
 * audio strictly behind the labelled unmute control.
 */
export default function InlineVideo({
  src,
  poster,
  label,
  aspect = '16 / 9',
  className = '',
  autoPlayWhenVisible = true,
}: {
  src: string
  poster: string
  label: string
  aspect?: string
  className?: string
  autoPlayWhenVisible?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  // Duck the ambient soundscape whenever this video is audible.
  useReportVideoAudible(!muted, 'inline-video')
  const { setUserPaused } = useActiveVideo(videoRef, {
    enabled: autoPlayWhenVisible,
    playAt: 0.5,
    pauseAt: 0.2,
  })

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      setUserPaused(false)
      video.play().catch(() => {})
    } else {
      setUserPaused(true)
      video.pause()
    }
  }, [setUserPaused])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
    if (!video.muted && video.paused) {
      setUserPaused(false)
      video.play().catch(() => {})
    }
  }, [setUserPaused])

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: aspect, backgroundColor: 'var(--bg-900)' }}>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        tabIndex={-1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 sm:bottom-4 sm:left-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? `Pause — ${label}` : `Play — ${label}`}
          className="flex h-11 w-11 items-center justify-center rounded-full text-text-100 backdrop-blur-sm transition-colors"
          style={{ background: 'rgba(2,3,6,0.55)', border: '1px solid var(--border-strong)' }}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? `Unmute — ${label}` : `Mute — ${label}`}
          aria-pressed={!muted}
          className="flex h-11 w-11 items-center justify-center rounded-full text-text-100 backdrop-blur-sm transition-colors"
          style={{ background: 'rgba(2,3,6,0.55)', border: `1px solid ${muted ? 'var(--border-strong)' : 'var(--blue-500)'}` }}
        >
          {muted ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" opacity="0.4" /><path d="m3 3 18 18-1.4 1.4L2 4.4z" /></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
          )}
        </button>
      </div>
    </div>
  )
}
