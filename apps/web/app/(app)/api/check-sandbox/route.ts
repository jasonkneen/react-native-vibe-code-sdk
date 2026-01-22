import { NextResponse } from 'next/server'
import { Sandbox } from '@e2b/code-interpreter'

export async function POST(request: Request) {
  try {
    const { sandboxId } = await request.json()

    if (!sandboxId) {
      return NextResponse.json({ error: 'Sandbox ID is required' }, { status: 400 })
    }

    console.log('[check-sandbox] Checking sandbox container:', sandboxId)

    // Check if the sandbox container is alive using E2B SDK
    try {
      const sandbox = await Sandbox.connect(sandboxId)

      console.log('[check-sandbox] Sandbox container is alive:', sandboxId)

      // Note: E2B Sandbox doesn't need explicit closing for resume operations
      // The sandbox will remain active and timeout according to E2B's policies

      return NextResponse.json({ isAlive: true })
    } catch (error) {
      // Sandbox not found is expected behavior for paused/deleted sandboxes - use debug level
      console.debug('[check-sandbox] Sandbox container not found or dead:', sandboxId)
      return NextResponse.json({
        isAlive: false,
        reason: error instanceof Error ? error.message : 'Sandbox container not found or dead'
      })
    }
  } catch (error) {
    console.error('[check-sandbox] Error checking sandbox:', error)

    return NextResponse.json({
      isAlive: false,
      reason: 'Error verifying sandbox status'
    })
  }
}