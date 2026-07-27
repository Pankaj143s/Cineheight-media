'use client'

import { useEffect, useId } from 'react'
import { clearVideoAudible, setVideoAudible } from '@/lib/audio/audioBus'

/**
 * Tell the soundscape that this component's video is (or is no longer)
 * producing sound, so the ambient bed can duck out of its way.
 *
 * Five components own an independent mute state and none of them knows the
 * others exist. Rather than introducing cross-talk between them, each just
 * reports its own status here and the bus keeps the tally.
 *
 * The unmount cleanup matters more than it looks: the media lightbox is
 * routinely closed while unmuted, and without clearing its report the ambience
 * would stay ducked for the rest of the session.
 */
export function useReportVideoAudible(audible: boolean, scope = 'video') {
  const reactId = useId()
  const key = `${scope}:${reactId}`

  useEffect(() => {
    setVideoAudible(key, audible)
  }, [audible, key])

  useEffect(() => () => clearVideoAudible(key), [key])
}
