import { db, projects, eq, and } from '@/lib/db'
import { startExpoServer } from '@/lib/server-utils'
import { NextRequest } from 'next/server'
import { connectWithRecovery } from '@/lib/sandbox-recovery'
import { tunnelMode as tunnelModeFlag } from '@/flags'

export const maxDuration = 120

interface RestartServerRequest {
  projectId: string
  userID: string
  sandboxId: string
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, userID, sandboxId }: RestartServerRequest = await req.json()

    console.log('[Restart Server] API called with:', {
      projectId,
      userID,
      sandboxId,
    })

    if (!userID) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!projectId) {
      return Response.json({ error: 'Project ID is required' }, { status: 400 })
    }

    if (!sandboxId) {
      return Response.json({ error: 'Sandbox ID is required' }, { status: 400 })
    }

    // Get existing project
    const existingProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.userId, userID),
          eq(projects.status, 'active'),
        ),
      )
      .limit(1)

    if (existingProjects.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = existingProjects[0]
    console.log(
      `[Restart Server] Found project: ${project.id} with sandbox: ${project.sandboxId}`,
    )

    // Note: we allow sandboxId mismatch here since recovery may have already updated it;
    // the client may be sending the old ID. We proceed with recovery either way.

    // ── Connect (with auto-resurrection) ─────────────────────────────────
    const { sandbox, wasRecreated, newSandboxId, newUrl: recoveryUrl, newNgrokUrl: recoveryNgrokUrl } =
      await connectWithRecovery(sandboxId, projectId, userID, { startExpo: false })

    if (wasRecreated) {
      console.log(`[Restart Server] Sandbox was resurrected as ${newSandboxId}`)
    } else {
      console.log(`[Restart Server] Connected to sandbox: ${sandbox.sandboxId}`)
    }

    // ── Kill existing Expo / ngrok / watchman processes ───────────────────
    console.log('[Restart Server] Killing existing Expo and ngrok processes...')
    try {
      await sandbox.commands.run('pkill -f "expo start" || true', { timeoutMs: 5000 })
      await sandbox.commands.run('pkill -f "watchman" || true', { timeoutMs: 5000 })
      await sandbox.commands.run('pkill -f "ngrok" || true', { timeoutMs: 5000 })
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (killError) {
      console.log('[Restart Server] Error killing processes (non-fatal):', killError)
    }

    // ── Check if port 8081 is already listening ───────────────────────────
    let expoRunning = false
    try {
      const portCheck = await sandbox.commands.run(
        'ss -tlnp 2>/dev/null | grep -q ":8081" && echo "LISTENING" || echo "NOT_LISTENING"',
        { timeoutMs: 5000 },
      )
      expoRunning = portCheck.stdout.trim() === 'LISTENING'
      console.log(`[Restart Server] Port 8081 check: ${expoRunning ? 'LISTENING' : 'NOT_LISTENING'}`)
    } catch (portCheckError) {
      console.log('[Restart Server] Port check failed (non-fatal):', portCheckError)
    }

    // ── Start Expo if needed ──────────────────────────────────────────────
    const isExpoTemplate =
      project.template === 'react-native-expo' ||
      project.template === 'expo' ||
      project.template === 'expo-testing' ||
      project.template === 'tamagui'

    if (isExpoTemplate || !expoRunning) {
      try {
        console.log(
          `[Restart Server] Starting Expo server (template=${project.template}, expoRunning=${expoRunning})...`,
        )
        const currentTunnelMode = await tunnelModeFlag()
        const serverResult = await startExpoServer(sandbox, project.id, undefined, currentTunnelMode as any)

        return Response.json({
          success: true,
          projectId: project.id,
          projectTitle: project.title,
          sandboxId: sandbox.sandboxId,
          url: serverResult.url,
          ngrokUrl: serverResult.ngrokUrl,
          serverReady: serverResult.serverReady,
          restarted: true,
          wasRecreated,
          ...(wasRecreated ? { newSandboxId: sandbox.sandboxId } : {}),
          tunnelMode: currentTunnelMode,
        })
      } catch (expoError) {
        console.error('[Restart Server] Error starting Expo server:', expoError)
        return Response.json(
          {
            success: false,
            error: 'Failed to restart server',
            details: expoError instanceof Error ? expoError.message : 'Unknown error',
          },
          { status: 500 },
        )
      }
    }

    // ── Non-Expo project with port already listening ──────────────────────
    const host = sandbox.getHost(8081)
    return Response.json({
      success: true,
      projectId: project.id,
      projectTitle: project.title,
      sandboxId: sandbox.sandboxId,
      url: recoveryUrl ?? `https://${host}`,
      ngrokUrl: recoveryNgrokUrl,
      serverReady: expoRunning,
      restarted: true,
      wasRecreated,
      ...(wasRecreated ? { newSandboxId: sandbox.sandboxId } : {}),
    })
  } catch (error) {
    console.error('[Restart Server] Error in API:', error)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
