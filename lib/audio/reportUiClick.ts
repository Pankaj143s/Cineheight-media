import { publishAudioEvent } from './audioBus'

/**
 * Ask the soundscape for a soft UI click.
 *
 * Safe to call from any click/pointer handler — if sound is off, the bus has
 * no subscribers and this is a no-op. Rate-limiting lives in the engine.
 */
export function reportUiClick(): void {
  publishAudioEvent({ type: 'ui-click' })
}
