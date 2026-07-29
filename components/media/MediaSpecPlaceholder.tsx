'use client'

import { forwardRef, useState } from 'react'
import type { MediaSlotSpec } from '@/content/mediaSlots'

interface MediaSpecPlaceholderProps {
  spec: MediaSlotSpec
  alt: string
  priority?: boolean
  muted?: boolean
  className?: string
  children?: React.ReactNode
}

const MediaSpecPlaceholder = forwardRef<HTMLVideoElement, MediaSpecPlaceholderProps>(
  function MediaSpecPlaceholder(
    { spec, alt, priority = false, muted = true, className = '', children },
    videoRef
  ) {
    const [videoReady, setVideoReady] = useState(false)

    if ((spec.status === 'ready' || spec.status === 'desktop-ready') && spec.mediaKind === 'video') {
      return (
        <div className={`relative h-full w-full overflow-hidden ${className}`}>
          <picture
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: videoReady ? 0 : 1 }}
          >
            {spec.status === 'ready' && (
              <source media="(max-width: 767px)" srcSet={spec.mobile.poster} />
            )}
            {spec.status === 'ready' && spec.ultrawide?.poster && (
              <source media="(min-aspect-ratio: 21/9)" srcSet={spec.ultrawide.poster} />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spec.desktop.poster}
              alt={alt}
              className="h-full w-full object-cover"
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
            />
          </picture>
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            muted={muted}
            loop
            playsInline
            preload="none"
            tabIndex={-1}
            aria-hidden="true"
            onCanPlay={() => setVideoReady(true)}
          >
            {spec.status === 'ready' && (
              <source media="(max-width: 767px)" src={spec.mobile.src} type="video/mp4" />
            )}
            {spec.status === 'ready' && spec.ultrawide && (
              <source media="(min-aspect-ratio: 21/9)" src={spec.ultrawide.src} type="video/mp4" />
            )}
            <source src={spec.desktop.src} type="video/mp4" />
          </video>
          {children}
        </div>
      )
    }

    if (spec.status === 'ready' || spec.status === 'desktop-ready') {
      return (
        <div className={`relative h-full w-full overflow-hidden ${className}`}>
          <picture>
            {spec.status === 'ready' && (
              <source media="(max-width: 767px)" srcSet={spec.mobile.src} />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spec.desktop.src}
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
        style={{ background: 'linear-gradient(160deg, rgba(6,8,14,0.99), rgba(2,3,6,0.94))' }}
        role="img"
        aria-label={`${spec.label}. Final media placeholder: desktop ${spec.desktop.width} by ${spec.desktop.height}; mobile ${spec.mobile.width} by ${spec.mobile.height}.`}
      >
        <div
          aria-hidden="true"
          data-parallax-y="-0.18"
          data-parallax-scale="0.025"
          className="pointer-events-none absolute inset-[-6%]"
          style={{
            background: `radial-gradient(ellipse 72% 62% at 24% 20%, ${spec.accentColor}2b, transparent 68%)`,
          }}
        />
        <div
          aria-hidden="true"
          data-parallax-y="0.11"
          className="pointer-events-none absolute inset-[-4%] opacity-[0.075]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.62) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.62) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
        />
        <div
          aria-hidden="true"
          data-parallax-y="0.2"
          className="pointer-events-none absolute inset-[8%] border border-dashed"
          style={{ borderColor: `${spec.accentColor}45` }}
        />

        <svg
          aria-hidden="true"
          data-parallax-y="-0.12"
          width="42"
          height="42"
          viewBox="0 0 40 40"
          fill="none"
          className="relative opacity-[0.34]"
        >
          <rect x="1" y="6" width="38" height="28" rx="2" stroke={spec.accentColor} strokeWidth="1.4" />
          <circle cx="12" cy="16" r="2.6" stroke={spec.accentColor} strokeWidth="1.2" />
          <path d="M2 29 L14 19 L21 25 L28 15 L39 26" stroke={spec.accentColor} strokeWidth="1.2" />
        </svg>

        <div className="pointer-events-none absolute left-4 right-4 top-5 grid gap-2 sm:left-auto sm:right-[14%] sm:top-[15%] sm:w-[min(36rem,72%)] sm:text-right">
          <div>
            <p className="font-body text-[9px] uppercase text-text-300 sm:text-[10px]" style={{ letterSpacing: '0.18em' }}>
              {spec.label}
            </p>
            <p className="font-body mt-1 max-w-[38ch] text-[10px] leading-snug text-text-500 sm:text-[11px]">
              {spec.brief}
            </p>
            <p className="font-body mt-2 break-all text-[9px] text-text-500">{spec.desktop.src}</p>
            <p className="font-body mt-0.5 break-all text-[9px] text-text-500">{spec.mobile.src}</p>
          </div>
          <div className="font-body text-[9px] leading-relaxed text-text-400 sm:text-[10px]">
            <p>DESKTOP {spec.desktop.width}×{spec.desktop.height} — {spec.desktop.aspect}</p>
            <p>MOBILE {spec.mobile.width}×{spec.mobile.height} — {spec.mobile.aspect}</p>
            <p>{spec.mediaKind === 'video' ? 'MATCHING POSTERS REQUIRED' : spec.desktop.format.toUpperCase()}</p>
          </div>
        </div>

        {children}
      </div>
    )
  }
)

export default MediaSpecPlaceholder
