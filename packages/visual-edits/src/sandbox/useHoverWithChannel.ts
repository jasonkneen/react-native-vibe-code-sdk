/**
 * useHoverWithChannel hook
 *
 * Connects Pusher events to the hover system state.
 * Listens for hover-mode-toggle events from the web app
 * and enables/disables the hover system accordingly.
 */

import { useHoverSystem } from './useHoverSystem'
import Pusher from 'pusher-js'
import { useState, useEffect } from 'react'
import { PUSHER_EVENTS, getSandboxChannelName } from '../types'

export interface UseHoverWithChannelResult {
  /** Currently hovered element */
  hoveredElement: HTMLElement | null
  /** Whether hover mode is enabled */
  isEnabled: boolean
  /** Whether hover mode is enabled (alias) */
  isHoverEnabled: boolean
  /** Current sandbox ID */
  sandboxId: string | undefined
}

/**
 * Hook that connects Pusher events to the hover system.
 * Call this in your app's root layout to enable visual editing.
 *
 * @example
 * ```tsx
 * // In app/_layout.tsx
 * import { useHoverWithChannel } from '@react-native-vibe-code/visual-edits/sandbox'
 *
 * export default function RootLayout({ children }) {
 *   if (__DEV__) {
 *     useHoverWithChannel()
 *   }
 *   return children
 * }
 * ```
 */
export const useHoverWithChannel = (): UseHoverWithChannelResult => {
  const [isHoverEnabled, setIsHoverEnabled] = useState(false)

  // Get sandboxId from environment or URL params
  const sandboxId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('sandboxId') ||
        process.env.SANDBOX_ID
      : process.env.SANDBOX_ID

  // Listen for hover mode changes via Pusher
  useEffect(() => {
    console.log('[useHoverWithChannel] Setting up Pusher listener, sandboxId:', sandboxId)

    if (typeof window === 'undefined' || !sandboxId) {
      console.log('[useHoverWithChannel] Skipping Pusher setup - no window or sandboxId')
      return
    }

    try {
      console.log('[useHoverWithChannel] Initializing Pusher client...')

      // Initialize Pusher client
      const pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_APP_KEY || '', {
        cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'us2',
      })

      // Log connection state changes
      pusher.connection.bind('state_change', (states: any) => {
        console.log(
          '[useHoverWithChannel] Pusher connection state changed:',
          states.previous,
          '->',
          states.current,
        )
      })

      // Subscribe to sandbox-specific channel
      const channelName = getSandboxChannelName(sandboxId)
      console.log(`[useHoverWithChannel] Subscribing to channel: ${channelName}`)
      const channel = pusher.subscribe(channelName)

      // Listen for hover mode toggle events
      channel.bind(PUSHER_EVENTS.HOVER_MODE_TOGGLE, (data: { enabled: boolean }) => {
        console.log('[useHoverWithChannel] Received hover mode toggle event:', data)
        setIsHoverEnabled(data.enabled)
      })

      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`[useHoverWithChannel] Successfully subscribed to: ${channelName}`)
      })

      channel.bind('pusher:subscription_error', (error: any) => {
        console.error(`[useHoverWithChannel] Failed to subscribe to ${channelName}:`, error)
      })

      // Bind to all events for debugging
      channel.bind_global((eventName: string, data: any) => {
        console.log(`[useHoverWithChannel] Received Pusher event '${eventName}':`, data)
      })

      return () => {
        console.log('[useHoverWithChannel] Cleaning up Pusher connection')
        channel.unbind_all()
        channel.unsubscribe()
        pusher.disconnect()
      }
    } catch (error) {
      console.error('[useHoverWithChannel] Failed to initialize Pusher:', error)
    }
  }, [sandboxId])

  // Initialize hover system
  console.log('[useHoverWithChannel] Initializing hover system with enabled:', isHoverEnabled)

  const hoverSystem = useHoverSystem({
    enabled: isHoverEnabled,
    ...(typeof window !== 'undefined' && { sandboxId }),
  })

  return {
    ...hoverSystem,
    isHoverEnabled,
    sandboxId,
  }
}
