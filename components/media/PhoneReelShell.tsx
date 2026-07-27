'use client'

import { forwardRef, useMemo } from 'react'
import { formatCount, socialMetrics } from '@/lib/utils'

/**
 * One reel inside a realistic Instagram-style phone. Restores the old
 * project's `PhoneReel` presentation (components/CaseStudyVideoGallery.tsx)
 * on Flow V2's architecture.
 *
 * ── Square footage, portrait phone ────────────────────────────────────────
 * Every real reel is 1080×1080 while the phone screen is 9:16, so the client
 * footage is NEVER cropped:
 *
 *   layer 1  the reel's own poster, object-cover, scaled 1.08, blurred and
 *            darkened — fills the bands above and below
 *   layer 2  the sharp 1:1 media, exactly the screen's width, vertically
 *            centred; poster and <video> occupy the identical box, so
 *            starting playback causes zero layout shift
 *   layer 3  the Instagram chrome, overlaying the FULL 9:16 screen
 *
 * The backdrop is the poster still rather than a second <video>: at 26 px of
 * blur the two are indistinguishable, and the performance rules forbid
 * duplicated video elements.
 *
 * ── Honest placeholders ───────────────────────────────────────────────────
 * A reel the client never supplied renders a clearly labelled empty phone with
 * no <video> element and no poster — it can never attempt playback.
 */

export interface PhoneReelItem {
  id: string
  title: string
  src: string
  poster: string
  isPlaceholder?: boolean
  client: string
  accent: string
  /**
   * True when `src` is already a 9:16 presentation master (built by
   * scripts/build-presentation-reels.mjs). Those have the blurred backdrop
   * baked in, so the shell must NOT composite a second one — it renders the
   * file with `object-cover` instead.
   */
  portrait?: boolean
  /** Drives the placeholder badge. See content/presentationMedia.ts. */
  provenance?: 'real' | 'derived-real' | 'illustrative' | 'concept-placeholder'
}

function HeartIcon() {
  return (
    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}
function CommentIcon() {
  return (
    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
function ShareIcon() {
  return (
    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}

const PhoneReelShell = forwardRef<HTMLVideoElement, {
  item: PhoneReelItem
  /** Stable index — drives the deterministic engagement figures. */
  seed: number
  handle: string
  isActive: boolean
  /** Mount the real <video>. Only ever true for the active phone. */
  mountVideo: boolean
  muted?: boolean
  /** Compact chrome for the small side phones and narrow screens. */
  compact?: boolean
}>(function PhoneReelShell(
  { item, seed, handle, isActive, mountVideo, muted = true, compact = false },
  videoRef
) {
  const m = useMemo(() => socialMetrics(seed), [seed])

  return (
    <div
      className="relative h-full w-full rounded-[2.4rem] p-[3px]"
      style={{
        background: 'linear-gradient(158deg, #2b3242 0%, #10131c 54%, #262d3d 100%)',
        boxShadow: isActive
          ? '0 34px 90px -18px rgba(0,0,0,0.85), 0 0 46px rgba(0,137,255,0.16)'
          : '0 18px 50px -16px rgba(0,0,0,0.75)',
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[2.25rem] bg-black">
        {item.isPlaceholder ? (
          /* ---- honest gap: no media element of any kind ---- */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span
              className="font-display text-[9px] uppercase text-text-500"
              style={{ letterSpacing: '0.26em' }}
            >
              Awaiting client file
            </span>
            <p className="font-body text-[13px] leading-snug text-text-300">{item.title}</p>
            <span
              aria-hidden="true"
              className="mt-1 h-px w-10"
              style={{ background: 'var(--border-strong)' }}
            />
          </div>
        ) : item.portrait ? (
          /* Already 9:16 — the blurred composition is baked into the file, so
             compositing another one here would double-blur the bands. */
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.poster}
              alt={`${item.client} — ${item.title}`}
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            {mountVideo && (
              <video
                ref={videoRef}
                key={item.src}
                className="absolute inset-0 h-full w-full object-cover"
                poster={item.poster}
                muted={muted}
                loop
                playsInline
                preload="none"
                tabIndex={-1}
                aria-hidden="true"
              >
                <source src={item.src} type="video/mp4" />
              </video>
            )}
          </>
        ) : (
          <>
            {/* Square-source fallback: blurred fill so nothing is cropped and
                no band is empty. Used when no portrait master exists. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.poster}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: 'scale(1.08)', filter: 'blur(26px) brightness(0.45) saturate(1.1)' }}
              loading="lazy"
            />

            {/* the sharp 1:1 client footage, uncropped and centred. Poster and
                video share this exact box → no layout shift. */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ aspectRatio: '1 / 1' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.poster}
                alt={`${item.client} — ${item.title}`}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              {mountVideo && (
                <video
                  ref={videoRef}
                  key={item.src}
                  className="absolute inset-0 h-full w-full object-cover"
                  poster={item.poster}
                  muted={muted}
                  loop
                  playsInline
                  preload="none"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <source src={item.src} type="video/mp4" />
                </video>
              )}
            </div>
          </>
        )}

        {/* Provenance badge — only ever for a temporary layout prototype, so a
            concept can never be mistaken for delivered client work. */}
        {item.provenance === 'concept-placeholder' && (
          <div
            className="pointer-events-none absolute inset-x-0 top-[13%] z-20 flex justify-center px-3"
            aria-hidden="true"
          >
            <span
              className="font-display rounded-full px-3 py-1.5 text-center text-[8px] font-medium uppercase leading-tight text-text-100"
              style={{
                letterSpacing: '0.16em',
                background: 'rgba(2,3,6,0.78)',
                border: '1px solid rgba(255,255,255,0.28)',
              }}
            >
              Concept placeholder
            </span>
          </div>
        )}

        {/* layer 3 — Instagram chrome across the FULL 9:16 screen */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* notch */}
          <div className="absolute left-1/2 top-2.5 h-[17px] w-[74px] -translate-x-1/2 rounded-full border border-white/5 bg-black" />

          {/* reels header */}
          <div className="absolute inset-x-0 top-8 flex items-center justify-between px-4">
            <span className="text-[13px] font-semibold tracking-wide text-white drop-shadow">Reels</span>
            <svg className="h-[18px] w-[18px] text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>

          {/* Concept prototypes carry their own baked-in mark, so the caption
              rail is suppressed — otherwise the two overlap and both become
              unreadable. */}
          {!item.isPlaceholder && !compact && item.provenance !== 'concept-placeholder' && (
            <>
              {/* right action rail */}
              <div className="absolute bottom-[22%] right-2.5 flex flex-col items-center gap-3.5 text-white">
                <div className="flex flex-col items-center gap-0.5 drop-shadow">
                  <HeartIcon />
                  <span className="text-[9px] font-semibold">{formatCount(m.likes)}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 drop-shadow">
                  <CommentIcon />
                  <span className="text-[9px] font-semibold">{formatCount(m.comments)}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 drop-shadow">
                  <ShareIcon />
                  <span className="text-[9px] font-semibold">Share</span>
                </div>
              </div>

              {/* caption block */}
              <div
                className="absolute inset-x-0 bottom-0 px-4 pb-6 pt-14"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.35) 46%, transparent)' }}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${item.accent}, var(--blue-400))` }}
                  >
                    {handle.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-white">@{handle}</span>
                </div>
                <p className="line-clamp-2 text-[11px] leading-snug text-white/85">{item.title}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-white/60">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  <span className="text-[9px] font-medium">{formatCount(m.views)} views</span>
                </div>
              </div>
            </>
          )}

          {/* home indicator */}
          <div className="absolute bottom-1.5 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-white/25" />
        </div>
      </div>
    </div>
  )
})

export default PhoneReelShell
