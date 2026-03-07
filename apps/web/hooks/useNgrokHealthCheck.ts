'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

interface NgrokHealthState {
  primaryPort: 8081
  ngrokStatus: {
    [port: number]: 'connected' | 'disconnected' | 'unknown'
  }
  isRecoveryActive: boolean
  isStartingRecovery: boolean
  lastHealthCheck: Date | null
}

interface UseNgrokHealthCheckOptions {
  sandboxId: string | null
  projectId: string | null
  userId: string | null
  ngrokUrl: string | null
  enabled?: boolean
  serverReady?: boolean // Only start health checks after initial server setup is complete
  pollingInterval?: number // Default: 60000ms (60 seconds)
  onBackupServerReady?: (newSandboxUrl: string, newNgrokUrl: string) => void // Callback when backup server starts with new URL
  onExpoError?: (errorMessage: string) => void // Callback when Expo app has a build error
  tunnelMode?: string // 'ngrok-patch' or 'lan'
}

interface UseNgrokHealthCheckReturn {
  healthState: NgrokHealthState
  isNgrokHealthy: boolean
  isBackupActive: boolean
  isStartingBackup: boolean
  checkNgrokHealth: () => Promise<boolean>
  triggerBackupServer: () => Promise<void>
}

const PRIMARY_PORT = 8081
const DEFAULT_POLLING_INTERVAL = 60000 // 60 seconds

export function useNgrokHealthCheck({
  sandboxId,
  projectId,
  userId,
  ngrokUrl,
  enabled = true,
  serverReady = false,
  pollingInterval = DEFAULT_POLLING_INTERVAL,
  onBackupServerReady,
  onExpoError,
  tunnelMode = 'ngrok-patch',
}: UseNgrokHealthCheckOptions): UseNgrokHealthCheckReturn {
  const [healthState, setHealthState] = useState<NgrokHealthState>({
    primaryPort: PRIMARY_PORT,
    ngrokStatus: {
      [PRIMARY_PORT]: 'unknown',
    },
    isRecoveryActive: false,
    isStartingRecovery: false,
    lastHealthCheck: null,
  })

  const isCheckingRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const consecutiveFailuresRef = useRef(0)

  const isDev = process.env.NODE_ENV === 'development'

  const showDevToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (!isDev) return

    switch (type) {
      case 'success':
        toast.success(message)
        break
      case 'warning':
        toast.warning(message)
        break
      case 'error':
        toast.error(message)
        break
      default:
        toast.info(message)
    }
  }, [isDev])

  const checkNgrokHealth = useCallback(async (): Promise<boolean> => {
    if (!sandboxId || !ngrokUrl || isCheckingRef.current) {
      return true // Assume healthy if we can't check
    }

    isCheckingRef.current = true

    try {
      console.log('[useNgrokHealthCheck] Checking ngrok health...')

      const checkPort = PRIMARY_PORT

      const response = await fetch('/api/check-ngrok-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ngrokUrl,
          sandboxId,
          checkPort,
        }),
      })

      const data = await response.json()
      console.log('[useNgrokHealthCheck] Health check result:', data)

      setHealthState(prev => ({
        ...prev,
        lastHealthCheck: new Date(),
        ngrokStatus: {
          ...prev.ngrokStatus,
          [PRIMARY_PORT]: data.tunnelStatus,
        },
      }))

      // If the health check detected an Expo error page, notify the caller
      if (data.expoError && onExpoError) {
        console.log('[useNgrokHealthCheck] Expo error detected:', data.expoError.substring(0, 100))
        onExpoError(data.expoError)
      }

      if (data.isAlive) {
        consecutiveFailuresRef.current = 0
        return true
      } else {
        consecutiveFailuresRef.current++
        return false
      }
    } catch (error) {
      console.error('[useNgrokHealthCheck] Health check failed:', error)
      consecutiveFailuresRef.current++
      return false
    } finally {
      isCheckingRef.current = false
    }
  }, [sandboxId, ngrokUrl, tunnelMode, onExpoError])

  const triggerBackupServer = useCallback(async () => {
    if (!sandboxId || !projectId || !userId) {
      console.error('[useNgrokHealthCheck] Cannot start backup: missing required params')
      return
    }

    setHealthState(prev => ({ ...prev, isStartingRecovery: true }))
    showDevToast('Ngrok tunnel disconnected, restarting server...', 'warning')

    try {
      console.log('[useNgrokHealthCheck] Restarting server...')

      const action = healthState.isRecoveryActive ? 'cleanup_and_restart' : 'start_backup'

      const response = await fetch('/api/ngrok-backup-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sandboxId,
          projectId,
          userId,
          action,
          tunnelMode,
        }),
      })

      const data = await response.json()
      console.log('[useNgrokHealthCheck] Backup server response:', data)

      if (data.success) {
        setHealthState(prev => ({
          ...prev,
          isRecoveryActive: true,
          isStartingRecovery: false,
          ngrokStatus: {
            ...prev.ngrokStatus,
            [PRIMARY_PORT]: 'connected',
          },
        }))
        consecutiveFailuresRef.current = 0
        showDevToast('Server restarted successfully', 'success')

        // Also show in production for important events
        toast.success('Ngrok tunnel reconnected successfully')

        // Call callback with new URLs so parent component can update preview
        if (onBackupServerReady && data.sandboxUrl && data.ngrokUrl) {
          console.log('[useNgrokHealthCheck] Calling onBackupServerReady with new URLs:', data.sandboxUrl, data.ngrokUrl)
          onBackupServerReady(data.sandboxUrl, data.ngrokUrl)
        }
      } else {
        setHealthState(prev => ({ ...prev, isStartingRecovery: false }))
        showDevToast(`Failed to restart server: ${data.error}`, 'error')

        // Show error to user in production too
        toast.error(`Ngrok tunnel recovery failed: ${data.error || 'Unknown error'}. Please refresh the page.`)
      }
    } catch (error) {
      console.error('[useNgrokHealthCheck] Failed to restart server:', error)
      setHealthState(prev => ({ ...prev, isStartingRecovery: false }))
      showDevToast('Failed to restart server', 'error')

      // Show error to user in production too
      toast.error('Failed to recover ngrok tunnel. Please refresh the page.')
    }
  }, [sandboxId, projectId, userId, healthState.isRecoveryActive, showDevToast, onBackupServerReady, tunnelMode])

  // Main polling effect - only starts after serverReady is true
  useEffect(() => {
    // Don't start polling until initial server setup is complete
    // In LAN mode, skip ngrok health checks entirely — there's no ngrok tunnel to monitor
    if (!enabled || !sandboxId || !ngrokUrl || !serverReady || tunnelMode === 'lan') {
      if (tunnelMode === 'lan') {
        console.log('[useNgrokHealthCheck] LAN mode active, skipping ngrok health checks')
      } else if (!serverReady && enabled && sandboxId && ngrokUrl) {
        console.log('[useNgrokHealthCheck] Waiting for initial server setup to complete before starting health checks...')
      }
      return
    }

    const performHealthCheck = async () => {
      const isHealthy = await checkNgrokHealth()

      if (!isHealthy && !healthState.isStartingRecovery) {
        console.log('[useNgrokHealthCheck] Ngrok unhealthy, consecutive failures:', consecutiveFailuresRef.current)

        // Trigger backup after 3 consecutive failures to avoid false positives
        if (consecutiveFailuresRef.current >= 3) {
          await triggerBackupServer()
        }
      }
    }

    // Initial check after server is ready - wait 60 seconds before first check
    // to give the initial ngrok connection time to stabilize
    const initialTimeout = setTimeout(() => {
      console.log('[useNgrokHealthCheck] Initial server setup complete, starting first health check...')
      performHealthCheck()
    }, pollingInterval) // Wait one full polling interval before first check

    // Set up polling interval
    intervalRef.current = setInterval(performHealthCheck, pollingInterval)

    console.log(`[useNgrokHealthCheck] Server ready - started polling every ${pollingInterval}ms (first check in ${pollingInterval}ms)`)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      console.log('[useNgrokHealthCheck] Stopped polling')
    }
  }, [enabled, sandboxId, ngrokUrl, serverReady, pollingInterval, checkNgrokHealth, triggerBackupServer, healthState.isStartingRecovery, tunnelMode])

  const isNgrokHealthy = healthState.ngrokStatus[PRIMARY_PORT] === 'connected'

  return {
    healthState,
    isNgrokHealthy,
    isBackupActive: healthState.isRecoveryActive,
    isStartingBackup: healthState.isStartingRecovery,
    checkNgrokHealth,
    triggerBackupServer,
  }
}
