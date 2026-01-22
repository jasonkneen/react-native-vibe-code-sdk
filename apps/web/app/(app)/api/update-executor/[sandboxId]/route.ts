import { Sandbox } from '@e2b/code-interpreter'
import * as fs from 'fs'
import * as path from 'path'

export const maxDuration = 60

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return new Response(
      JSON.stringify({ error: 'This endpoint is only available in development mode' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { sandboxId } = await params

  if (!sandboxId) {
    return new Response(
      JSON.stringify({ error: 'Sandbox ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log('🔧 [Update Executor] Updating executor in sandbox:', sandboxId)

  try {
    // Read the local claude-executor.ts file
    const executorPath = path.join(
      process.cwd(),
      'sandbox-templates/expo-template/claude-executor.ts'
    )

    if (!fs.existsSync(executorPath)) {
      return new Response(
        JSON.stringify({ error: 'Executor file not found locally', path: executorPath }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const executorContent = fs.readFileSync(executorPath, 'utf-8')
    console.log('📄 [Update Executor] Read executor file, length:', executorContent.length)

    // Connect to the sandbox
    let sbx
    try {
      sbx = await Sandbox.connect(sandboxId)
      console.log('✅ [Update Executor] Connected to sandbox')
    } catch (sandboxError: any) {
      console.error('❌ [Update Executor] Failed to connect:', sandboxError)
      return new Response(
        JSON.stringify({
          error: 'Failed to connect to sandbox',
          details: sandboxError.message || String(sandboxError),
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Write the executor to the sandbox at /claude-sdk/index.ts
    const targetPath = '/claude-sdk/index.ts'
    await sbx.files.write(targetPath, executorContent)
    console.log('✅ [Update Executor] Wrote executor to', targetPath)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Executor updated successfully',
        sandboxId,
        targetPath,
        contentLength: executorContent.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('💥 [Update Executor] Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to update executor',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
