'use client'

import { forwardRef } from 'react'

/**
 * Full-bleed media that never crops the client's composition.
 *
 * The problem this solves: every real reel is 1080x1080 and the testimonials
 * are 16:9, but the stages are wide. Forcing square footage into a wide stage
 * with `object-cover` cuts roughly 45% off each side — losing the product, the
 * text overlay, or the person the shot was built around.
 *
 *   landscape  → `object-cover` fills the stage (nothing meaningful is lost on
 *                a 16:9 source in a 16:9-ish frame), with a configurable
 *                `object-position` so the safe area stays in frame.
 *
 *   square /   → two layers:
 *   portrait      1. the same poster, `object-cover`, scaled ~1.08, blurred and
 *                    darkened, filling the full width
 *                 2. the sharp media, `object-contain`, centred and complete
 *                An optional client-accent wash sits between them.
 *
 * Poster and <video> occupy the identical box in both modes, so starting
 * playback never shifts the layout.
 *
 * This is the same two-layer treatment proven in `PhoneReelShell`, extracted so
 * Featured Work, the capability pillars and the testimonial canvas all share
 * one implementation.
 */

export type MediaOrientation = 'landscape' | 'square' | 'portrait'

const OrientationMedia = forwardRef<HTMLVideoElement, {
  poster: string
  /** Omit to render a poster-only frame (no <video> mounted at all). */
  src?: string
  orientation: MediaOrientation
  alt: string
  /** Where to anchor a cover-cropped landscape source. */
  objectPosition?: string
  /** Faint wash in the letterbox area, on this project's own page only. */
  accent?: string
  muted?: boolean
  className?: string
  /** Extra element layered above the media (gradients, labels). */
  children?: React.ReactNode
}>(function OrientationMedia(
  { poster, src, orientation, alt, objectPosition = 'center', accent, muted = true, className = '', children },
  videoRef
) {
  const contain = orientation !== 'landscape'

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {contain && (
        <>
          {/* layer 1 — blurred, darkened fill so the frame is never empty */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transform: 'scale(1.08)', filter: 'blur(38px) brightness(0.34) saturate(1.15)' }}
          />
          {accent && (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${accent}22, transparent 72%)` }}
            />
          )}
        </>
      )}

      {/* layer 2 — the client's work, complete and unstretched */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={contain ? undefined : { display: 'block' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt={alt}
          draggable={false}
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: contain ? 'contain' : 'cover', objectPosition }}
        />
        {src && (
          <video
            ref={videoRef}
            key={src}
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: contain ? 'contain' : 'cover', objectPosition }}
            poster={poster}
            muted={muted}
            loop
            playsInline
            preload="none"
            tabIndex={-1}
            aria-hidden="true"
          >
            <source src={src} type="video/mp4" />
          </video>
        )}
      </div>

      {children}
    </div>
  )
})

export default OrientationMedia
