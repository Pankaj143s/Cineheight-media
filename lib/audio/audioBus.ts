/**
 * A tiny module-level event bus for anything the soundscape needs to know
 * about, mirroring the pattern already used by `lib/scrollSignal.ts`.
 *
 * Two problems it solves:
 *
 *  1. **Ducking.** Five separate components own their own video mute state
 *     (showreel, client stories, phone reels, media lightbox, inline video) and
 *     none of them knows the others exist. Rather than wiring five components
 *     to each other, each simply reports whether its video is currently
 *     audible; the bus keeps the tally and tells the engine when it crosses
 *     zero. Reports are keyed by a stable id and stored in a Map, so a
 *     component that reports twice, or unmounts while unmuted, cannot corrupt
 *     the count.
 *
 *  2. **Frame-synced cues.** The route loader wants its sound to land on the
 *     same frame as its visual, without importing the audio engine (which must
 *     never be pulled into a server render or into a bundle for a visitor who
 *     has sound switched off).
 *
 * Nothing here touches the Web Audio API. The engine subscribes; if the visitor
 * has not enabled sound, every publish is a no-op walk over an empty listener
 * list.
 */

export type AudioBusEvent =
  /** Fired only when the audible-video tally crosses 0 ↔ non-zero. */
  | { type: 'audible-videos'; count: number }
  /** Route loader began closing over the outgoing page. */
  | { type: 'route-out' }
  /** Route loader is revealing the destination. */
  | { type: 'route-in' }
  /** Soft UI click on a primary control (nav, CTA, form submit). */
  | { type: 'ui-click' }

type Listener = (event: AudioBusEvent) => void

const listeners = new Set<Listener>()
const audibleVideos = new Map<string, boolean>()

let lastCount = 0

function countAudible(): number {
  let n = 0
  audibleVideos.forEach((audible) => {
    if (audible) n += 1
  })
  return n
}

/** Publish to every subscriber. Listener errors are contained. */
export function publishAudioEvent(event: AudioBusEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch {
      /* a broken listener must not take down a pointer handler */
    }
  })
}

/**
 * Report whether one video is currently producing sound.
 *
 * `id` must be stable for the lifetime of the component instance. Call
 * {@link clearVideoAudible} on unmount — a lightbox that closes while unmuted
 * would otherwise leave the ambient bed ducked forever.
 */
export function setVideoAudible(id: string, audible: boolean): void {
  if (audible) audibleVideos.set(id, true)
  else audibleVideos.delete(id)

  const count = countAudible()
  // Only the 0 ↔ non-zero transition is interesting; two unmuted videos duck
  // the ambience exactly as much as one.
  if ((count > 0) !== (lastCount > 0)) {
    lastCount = count
    publishAudioEvent({ type: 'audible-videos', count })
  } else {
    lastCount = count
  }
}

/** Drop a video's report entirely (unmount). */
export function clearVideoAudible(id: string): void {
  if (!audibleVideos.has(id)) return
  setVideoAudible(id, false)
}

/** Current number of videos producing sound. */
export function readAudibleVideoCount(): number {
  return countAudible()
}

export function subscribeAudioBus(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
