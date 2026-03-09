'use client'

import PusherClient from 'pusher-js'
import { useEffect, useState, useRef, useCallback } from 'react'
import { PUSHER_EVENTS, getSandboxChannelName } from '../types'

export interface UseRemoteControlStatusOptions {
  sandboxId: string | null
  onComplete?: () => void
}

export interface UseRemoteControlStatusResult {
  isRemoteControlActive: boolean
}

export function useRemoteControlStatus({
  sandboxId,
  onComplete,
}: UseRemoteControlStatusOptions): UseRemoteControlStatusResult {
  const [isRemoteControlActive, setIsRemoteControlActive] = useState(false)
  const pusherRef = useRef<PusherClient | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!sandboxId) return

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    pusherRef.current = pusher

    const channel = pusher.subscribe(getSandboxChannelName(sandboxId))

    channel.bind(PUSHER_EVENTS.REMOTE_CONTROL_START, () => {
      setIsRemoteControlActive(true)
    })

    channel.bind(PUSHER_EVENTS.REMOTE_CONTROL_COMPLETE, () => {
      setIsRemoteControlActive(false)
      onCompleteRef.current?.()
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
      pusher.disconnect()
      pusherRef.current = null
    }
  }, [sandboxId])

  return { isRemoteControlActive }
}
