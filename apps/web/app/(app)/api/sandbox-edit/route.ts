import { db } from '@/lib/db'
import { projects } from '@react-native-vibe-code/database'
import { GitHubService } from '@/lib/github-service'
import { Sandbox } from '@e2b/code-interpreter'
import { eq } from 'drizzle-orm'

const sandboxTimeout = parseInt(process.env.E2B_SANDBOX_TIMEOUT_MS || '3600000') // Use env var, default to 1 hour

export const maxDuration = 120

export async function POST(req: Request) {
  console.log('🔵 [Sandbox Edit] API called')

  let reqData: any = {}
  try {
    const body = await req.text()
    console.log('📝 [Sandbox Edit] Raw request body:', body.substring(0, 200) + '...')

    if (body.trim()) {
      reqData = JSON.parse(body)
      console.log('📦 [Sandbox Edit] Parsed request data:', {
        projectId: reqData.projectId,
        filePath: reqData.filePath,
        hasContent: !!reqData.content,
        contentLength: reqData.content?.length || 0
      })
    }
  } catch (error) {
    console.log('❌ [Sandbox Edit] Failed to parse request body:', error)
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
    })
  }

  const { projectId, filePath, content } = reqData
  console.log('🎯 [Sandbox Edit] Extracted params:', {
    projectId,
    filePath,
    hasContent: !!content,
  })

  if (!projectId) {
    console.log('❌ [Sandbox Edit] Missing project ID')
    return new Response(JSON.stringify({ error: 'Project ID is required' }), {
      status: 400,
    })
  }

  if (!filePath) {
    console.log('❌ [Sandbox Edit] Missing file path')
    return new Response(JSON.stringify({ error: 'File path is required' }), {
      status: 400,
    })
  }

  if (content === undefined || content === null) {
    console.log('❌ [Sandbox Edit] Missing content')
    return new Response(JSON.stringify({ error: 'Content is required' }), {
      status: 400,
    })
  }

  // Query database to get sandbox ID from project
  console.log('🔍 [Sandbox Edit] Looking up project in database:', projectId)
  let sandboxId: string
  try {
    const project = await db
      .select({ sandboxId: projects.sandboxId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project.length || !project[0].sandboxId) {
      console.log('❌ [Sandbox Edit] Project not found or no sandbox ID')
      return new Response(
        JSON.stringify({
          error: 'Project not found or no active sandbox',
          details: 'The project may not exist or may not have an active sandbox',
        }),
        { status: 404 },
      )
    }

    sandboxId = project[0].sandboxId
    console.log('✅ [Sandbox Edit] Found sandbox ID:', sandboxId)
  } catch (dbError) {
    console.error('💥 [Sandbox Edit] Database query error:', dbError)
    return new Response(
      JSON.stringify({
        error: 'Failed to query project database',
        details: dbError instanceof Error ? dbError.message : String(dbError),
      }),
      { status: 500 },
    )
  }

  try {
    console.log('🔌 [Sandbox Edit] Attempting to connect to sandbox:', sandboxId)

    // Connect to existing sandbox
    let sbx
    try {
      sbx = await Sandbox.connect(sandboxId)
      console.log('✅ [Sandbox Edit] Successfully connected to sandbox')
    } catch (sandboxError: any) {
      console.log('❌ [Sandbox Edit] Failed to connect to sandbox:', sandboxError)

      if (
        sandboxError.message?.includes('not found') ||
        sandboxError.status === 404
      ) {
        console.log('📋 [Sandbox Edit] Sandbox not found, returning 404')
        return new Response(
          JSON.stringify({
            error: 'Sandbox not found or expired',
            details: 'The sandbox may have been destroyed or the ID is invalid',
          }),
          { status: 404 },
        )
      }
      throw sandboxError
    }

    console.log('📝 [Sandbox Edit] Editing file:', filePath)

    const fullPath = `/home/user/app/${filePath}`
    console.log('📂 [Sandbox Edit] Full file path:', fullPath)
    console.log('📏 [Sandbox Edit] Content length:', content.length)

    // Use E2B's files.write() API directly - much simpler and more reliable
    try {
      await sbx.files.write(fullPath, content)
      console.log('✅ [Sandbox Edit] File written successfully via E2B API')
    } catch (writeError: any) {
      console.error('❌ [Sandbox Edit] Failed to write file:', writeError)
      throw new Error(`Failed to write file: ${writeError.message || String(writeError)}`)
    }

    // Commit and push to GitHub if configured
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER) {
      try {
        const githubService = new GitHubService({
          owner: process.env.GITHUB_OWNER,
          token: process.env.GITHUB_TOKEN,
        })
        const repositoryName = `project-${projectId}`
        const commitMessage = `Manual edit: ${filePath}`
        await githubService.commitAndPush(sbx, repositoryName, commitMessage)
        console.log('✅ [Sandbox Edit] Changes committed and pushed to GitHub')
      } catch (gitError) {
        console.warn('⚠️ [Sandbox Edit] Failed to push to GitHub:', gitError)
        // Don't fail the request - file was saved successfully
      }
    }

    const result = {
      success: true,
      message: `File ${filePath} updated successfully`,
      path: filePath,
    }

    console.log('📤 [Sandbox Edit] Returning success response')
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('💥 [Sandbox Edit] Unexpected error:', error)
    console.error(
      '💥 [Sandbox Edit] Error stack:',
      error instanceof Error ? error.stack : 'No stack trace',
    )

    return new Response(
      JSON.stringify({
        error: 'Failed to edit file in sandbox',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 },
    )
  }
}