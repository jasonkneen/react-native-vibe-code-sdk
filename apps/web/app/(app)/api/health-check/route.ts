import { startExpoServer } from '@/lib/server-utils'
import { connectWithRecovery } from '@/lib/sandbox-recovery'
import { NextRequest } from 'next/server'

export const maxDuration = 120

interface HealthCheckRequest {
  projectId: string
  userId: string
  sandboxId: string
}

interface HealthCheckResponse {
  sandboxAlive: boolean
  expoRunning: boolean
  wasResurrected: boolean
  newSandboxId?: string
  newUrl?: string
  newNgrokUrl?: string
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, userId, sandboxId }: HealthCheckRequest = await req.json()

    if (!projectId || !userId || !sandboxId) {
      return Response.json(
        { error: 'projectId, userId, and sandboxId are required' },
        { status: 400 },
      )
    }

    console.log('[Health Check] Checking sandbox:', { projectId, sandboxId })

    // ── 1. Connect (with automatic resurrection) ──────────────────────────
    let recovery: Awaited<ReturnType<typeof connectWithRecovery>>
    try {
      recovery = await connectWithRecovery(sandboxId, projectId, userId, {
        startExpo: false, // We'll check & start Expo ourselves below
      })
    } catch (err) {
      console.error('[Health Check] Failed to connect/resurrect sandbox:', err)
      return Response.json(
        {
          sandboxAlive: false,
          expoRunning: false,
          wasResurrected: false,
          error: err instanceof Error ? err.message : 'Failed to connect to sandbox',
        } satisfies Partial<HealthCheckResponse> & { error: string },
        { status: 500 },
      )
    }

    const { sandbox, wasRecreated, newSandboxId, newUrl, newNgrokUrl } = recovery
    const sandboxAlive = true // We connected successfully

    // ── 2. Check if Expo is running on port 8081 ──────────────────────────
    let expoRunning = false
    try {
      const portCheck = await sandbox.commands.run(
        'ss -tlnp 2>/dev/null | grep -q ":8081" && echo "LISTENING" || echo "NOT_LISTENING"',
        { timeoutMs: 5000 },
      )
      expoRunning = portCheck.stdout.trim() === 'LISTENING'
      console.log(`[Health Check] Port 8081: ${expoRunning ? 'LISTENING' : 'NOT_LISTENING'}`)
    } catch (portErr) {
      console.warn('[Health Check] Port check failed (non-fatal):', portErr)
    }

    // ── 3. Restart Expo if down ───────────────────────────────────────────
    let finalUrl = newUrl
    let finalNgrokUrl = newNgrokUrl

    if (!expoRunning) {
      console.log('[Health Check] Expo not running, starting...')
      try {
        const serverResult = await startExpoServer(sandbox, projectId)
        finalUrl = serverResult.url
        finalNgrokUrl = serverResult.ngrokUrl
        expoRunning = true
        console.log(`[Health Check] Expo started – url: ${finalUrl}, ngrok: ${finalNgrokUrl}`)
      } catch (expoErr) {
        console.error('[Health Check] Failed to start Expo (non-fatal):', expoErr)
      }
    }

    const response: HealthCheckResponse = {
      sandboxAlive,
      expoRunning,
      wasResurrected: wasRecreated,
      ...(wasRecreated || !expoRunning
        ? {
            newSandboxId: newSandboxId ?? sandbox.sandboxId,
            newUrl: finalUrl,
            newNgrokUrl: finalNgrokUrl,
          }
        : {}),
    }

    console.log('[Health Check] Result:', response)
    return Response.json(response)
  } catch (error) {
    console.error('[Health Check] Unexpected error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
