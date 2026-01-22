'use client'

/**
 * usePusherHoverSelection hook
 *
 * Listens for hover selection events from the sandbox via Pusher.
 * Used in the web application to receive element selection data.
 */

import PusherClient from 'pusher-js'
import { useEffect, useState, useRef, useCallback } from 'react'
import type {
  HoverSelectionData,
  UsePusherHoverSelectionOptions,
  UsePusherHoverSelectionResult,
} from '../types'
import { PUSHER_EVENTS, getSandboxChannelName } from '../types'

/**
 * Hook to receive hover selection events from a sandbox.
 *
 * @example
 * ```tsx
 * import { usePusherHoverSelection } from '@react-native-vibe-code/visual-edits/web'
 *
 * function ChatPanel({ sandboxId }) {
 *   const { latestSelection, isConnected, clearSelection } = usePusherHoverSelection({
 *     sandboxId,
 *     enabled: isHoverModeEnabled,
 *   })
 *
 *   return (
 *     <div>
 *       {latestSelection && (
 *         <SelectionIndicator
 *           selection={latestSelection}
 *           onDismiss={clearSelection}
 *         />
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePusherHoverSelection({
  sandboxId,
  enabled = true,
}: UsePusherHoverSelectionOptions): UsePusherHoverSelectionResult {
  const [latestSelection, setLatestSelection] = useState<HoverSelectionData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const pusherRef = useRef<PusherClient | null>(null)
  const channelRef = useRef<any>(null)

  // Clear selection when disabled
  useEffect(() => {
    if (!enabled) {
      setLatestSelection(null)
    }
  }, [enabled])

  useEffect(() => {
    if (!sandboxId || !enabled) return

    // Initialize Pusher client
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    pusherRef.current = pusher

    // Subscribe to the sandbox-specific channel
    const channelName = getSandboxChannelName(sandboxId)
    const channel = pusher.subscribe(channelName)
    channelRef.current = channel

    // Listen for connection state changes
    pusher.connection.bind('connected', () => {
      setIsConnected(true)
    })

    pusher.connection.bind('disconnected', () => {
      setIsConnected(false)
    })

    // Listen for hover selection events
    channel.bind(PUSHER_EVENTS.HOVER_SELECTION, (data: HoverSelectionData) => {
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
