'use client'

import { forwardRef } from 'react'
import type { MediaSlotSpec } from '@/content/mediaSlots'

/**
 * Renders a media slot exactly the same way whether real media exists yet or
 * not — the `status:'placeholder' | 'ready'` field is the only thing that
 * changes. Nothing upstream (aspect box, DOM nesting, className hooks like
 * `data-scene-media`) needs to change when a real asset finally lands; only
 * `content/mediaSlots.ts` does.
 *
 * `kind:'video'` renders a single video/poster pair (the caller already picks
 * the right desktop/mobile `spec` per breakpoint, mirroring how
 * `OrientationMedia` is used in `FeaturedWorkJourney`). `kind:'image'` renders
 * a `<picture>` with an optional `mobileSpec` breakpoint source, mirroring the
 * `caseCover()` desktop/mobile pair `WorkIndex` used.
 */

interface MediaSpecPlaceholderProps {
  spec: MediaSlotSpec
  /** Only used for kind:'image' — supplies the (max-width:767px) source. */
  mobileSpec?: MediaSlotSpec
  kind: 'video' | 'image'
  alt: string
  priority?: boolean
  muted?: boolean
  className?: string
  children?: React.ReactNode
}

const MediaSpecPlaceholder = forwardRef<HTMLVideoElement, MediaSpecPlaceholderProps>(
  function MediaSpecPlaceholder(
    { spec, mobileSpec, kind, alt, priority, muted = true, className = '', children },
    videoRef
  ) {
    if (spec.status === 'ready') {
      if (kind === 'video') {
        return (
          <div className={`relative h-full w-full overflow-hidden ${className}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spec.targetPoster}
              alt={alt}
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              poster={spec.targetPoster}
              muted={muted}
              loop
              playsInline
              preload="none"
              tabIndex={-1}
              aria-hidden="true"
            >
              <source src={spec.targetSrc} type="video/mp4" />
            </video>
            {children}
          </div>
        )
      }
      return (
        <div className={`relative h-full w-full overflow-hidden ${className}`}>
          <picture>
            {mobileSpec && <source media="(max-width: 767px)" srcSet={mobileSpec.targetSrc} />}
            <source media="(min-width: 768px)" srcSet={spec.targetSrc} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spec.targetSrc}
              alt={alt}
              className="h-full w-full object-cover"
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
            />
          </picture>
          {children}
        </div>
      )
    }

    return (
      <div
        className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(160deg, rgba(6,8,14,0.98), rgba(2,3,6,0.92))' }}
        role="img"
        aria-label={`${spec.label} — placeholder, final ${kind === 'video' ? 'film' : 'image'} not yet supplied`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 72% 60% at 26% 18%, ${spec.accentColor}24, transparent 68%)` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[8%] border border-dashed"
          style={{ borderColor: `${spec.accentColor}35` }}
        />

        <svg aria-hidden="true" width="38" height="38" viewBox="0 0 40 40" fill="none" className="relative opacity-[0.28]">
          <rect x="1" y="6" width="38" height="28" rx="2" stroke={spec.accentColor} strokeWidth="1.4" />
          <circle cx="12" cy="16" r="2.6" stroke={spec.accentColor} strokeWidth="1.2" />
          <path d="M2 29 L14 19 L21 25 L28 15 L39 26" stroke={spec.accentColor} strokeWidth="1.2" />
        </svg>

        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 sm:inset-x-5 sm:bottom-5">
          <div>
            <p className="font-body text-[10px] uppercase text-text-300" style={{ letterSpacing: '0.18em' }}>
              {spec.label}
            </p>
            <p className="font-body mt-1 max-w-[30ch] text-[11px] leading-snug text-text-500">{spec.brief}</p>
          </div>
          <p className="font-body shrink-0 whitespace-nowrap text-[10px] text-text-500" style={{ letterSpacing: '0.05em' }}>
            {spec.width}×{spec.height} · {spec.aspect}
          </p>
        </div>

        {children}
      </div>
    )
  }
)

export default MediaSpecPlaceholder
