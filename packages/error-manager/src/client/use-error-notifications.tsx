'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import React from 'react'
import { getPusherClient } from '@react-native-vibe-code/pusher/client'
import type { ErrorNotification } from '../shared/types'
import { SENSITIVE_PATTERNS } from '../shared/patterns'
import { ErrorToast } from './error-toast'

interface UseErrorNotificationsOptions {
  /** Callback when user clicks "Send to Fix" */
  onSendToFix?: (message: string) => void
  /** Custom channel name (defaults to `${projectId}-errors`) */
  channelName?: string
  /** Toast position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  /** Toast duration in ms (Infinity for manual dismiss) */
  duration?: number
  /** Whether to deduplicate consecutive identical errors */
  deduplicate?: boolean
}

interface UseErrorNotificationsReturn {
  /** Whether the error modal is open */
  isModalOpen: boolean
  /** Current error data for the modal */
  errorModalData: ErrorNotification | null
  /** Close the error modal */
  handleCloseModal: () => void
  /** Send error message to fix callback */
  handleSendToFix: (message: string) => void
  /** All received errors in this session */
  errors: ErrorNotification[]
  /** Clear all errors */
  clearErrors: () => void
}

/**
 * Hook for receiving and displaying real-time error notifications
 */
export function useErrorNotifications(
  projectId: string | null,
  options: UseErrorNotificationsOptions = {}
): UseErrorNotificationsReturn {
  const {
    onSendToFix,
    channelName: customChannelName,
    position = 'bottom-right',
    duration = Infinity,
    deduplicate = true,
  } = options

  const [errorModalData, setErrorModalData] = useState<ErrorNotification | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [errors, setErrors] = useState<ErrorNotification[]>([])
  const lastErrorMessageRef = useRef<string | null>(null)

  const handleSendToFix = useCallback(
    (message: string) => {
      const errorFixMessage = `Fix this error:\n\`\`\`\n${message}\n\`\`\``
      onSendToFix?.(errorFixMessage)
    },
    [onSendToFix]
  )

  const handleViewDetails = useCallback((data: ErrorNotification) => {
    setErrorModalData(data)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const clearErrors = useCallback(() => {
    setErrors([])
    lastErrorMessageRef.current = null
  }, [])

  useEffect(() => {
    if (!projectId) {
      return
    }

    const channelName = customChannelName || `${projectId}-errors`
    const pusherClient = getPusherClient()
    const channel = pusherClient.subscribe(channelName)

    channel.bind('pusher:subscription_succeeded', () => {
      console.log(
        '[useErrorNotifications] Successfully subscribed to channel:',
        channelName
      )
    })

    channel.bind('pusher:subscription_error', (error: unknown) => {
      console.error('[useErrorNotifications] Subscription error:', error)
    })

    channel.bind('error-notification', (data: ErrorNotification) => {
      // Skip errors with sensitive information
      if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(data.message))) {
        console.log('[useErrorNotifications] Skipping error with sensitive info')
        return
      }

      // Check if this is the same error as the last one shown (deduplication)
      if (deduplicate && lastErrorMessageRef.current === data.message) {
        console.log(
          '[useErrorNotifications] Skipping duplicate error:',
          data.message.substring(0, 50)
        )
        return
      }

      // Update the last error message reference
      lastErrorMessageRef.current = data.message

      // Add to errors array
      setErrors((prev) => [...prev, data])

      // Show custom error toast
      toast.custom(
        (t) => (
          <ErrorToast
            error={data}
            onDismiss={() => toast.dismiss(t)}
            onSendToFix={handleSendToFix}
            onViewDetails={handleViewDetails}
          />
        ),
        {
          duration,
          position,
        }
      )
    })

    return () => {
      console.log(
        '[useErrorNotifications] Cleaning up subscription for:',
        channelName
      )
      channel.unbind('error-notification')
      channel.unbind('pusher:subscription_succeeded')
      channel.unbind('pusher:subscription_error')
      pusherClient.unsubscribe(channelName)
      // Reset last error message when cleaning up
      lastErrorMessageRef.current = null
    }
  }, [
    projectId,
    customChannelName,
    handleSendToFix,
    handleViewDetails,
    position,
    duration,
    deduplicate,
  ])

  return {
    isModalOpen,
    errorModalData,
    handleCloseModal,
    handleSendToFix,
    errors,
    clearErrors,
  }
}

/**
 * Format error message for sending to chat/fix
 */
export function formatErrorForFix(message: string): string {
  return `Fix this error:\n\`\`\`\n${message}\n\`\`\``
}
