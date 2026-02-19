'use client'

import PusherClient from 'pusher-js'
import { useEffect, useState, useRef, useCallback } from 'react'

interface HoverSelectionData {
  elementId: string
  content: string
  className: string
  tagName: string
  timestamp: number
  path?: string
}

interface UsePusherHoverSelectionOptions {
  sandboxId: string | null
  enabled?: boolean
  onHoverModeChange?: (enabled: boolean) => void
}

export function usePusherHoverSelection({
  sandboxId,
  enabled = true,
  onHoverModeChange,
}: UsePusherHoverSelectionOptions) {
  const [latestSelection, setLatestSelection] =
    useState<HoverSelectionData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const pusherRef = useRef<PusherClient | null>(null)
  const channelRef = useRef<any>(null)

  // Clear selection when disabled
  useEffect(() => {
    if (!enabled) {
      setLatestSelection(null)
    }
  }, [enabled])

  // Listen for postMessage from the Expo iframe (avoids CORS/private-network-access)
  useEffect(() => {
    if (!enabled) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'hover-selection') return
      // If we have a sandboxId, only accept messages from that sandbox
      if (sandboxId && event.data.sandboxId && event.data.sandboxId !== sandboxId) return
      if (event.data.data) {
        setLatestSelection(event.data.data)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [sandboxId, enabled])

  useEffect(() => {
    if (!sandboxId || !enabled) return

    // Skip if Pusher is not configured
    if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) return

    // Initialize Pusher client
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    })

    pusherRef.current = pusher

    // Subscribe to the sandbox-specific channel
    const channel = pusher.subscribe(`sandbox-${sandboxId}`)
    channelRef.current = channel

    // Listen for connection state changes
    pusher.connection.bind('connected', () => {
      setIsConnected(true)
    })

    pusher.connection.bind('disconnected', () => {
      setIsConnected(false)
    })

    // Listen for hover selection events (Pusher fallback for non-iframe usage)
    channel.bind('hover-selection', (data: HoverSelectionData) => {
      setLatestSelection(data)
    })

    // Cleanup
    return () => {
      channel.unbind_all()
      channel.unsubscribe()
      pusher.disconnect()
      pusherRef.current = null
    }
  }, [sandboxId, enabled])

  // Manual clear function
  const clearSelection = useCallback(() => {
    setLatestSelection(null)
  }, [])

  return {
    latestSelection,
    isConnected,
    clearSelection,
  }
}
