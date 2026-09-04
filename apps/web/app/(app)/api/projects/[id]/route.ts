import { db } from '@/lib/db'
import { projects, chat } from '@react-native-vibe-code/database'
import { eq, and } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { connectSandbox } from '@/lib/sandbox-connect'
import { inngest } from '@/lib/inngest'
import { corsHeaders, handleCorsOptions } from '@/lib/cors'
import { addCustomDomain } from '@react-native-vibe-code/publish'

export async function OPTIONS() {
  return handleCorsOptions()
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { searchParams } = new URL(req.url)
  const userID = searchParams.get('userID')

  if (!userID) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  try {
    const projectResults = await db
      .select({
        id: projects.id,
        title: projects.title,
        userId: projects.userId,
        teamId: projects.teamId,
        chatId: projects.chatId,
        sandboxId: projects.sandboxId,
        sandboxUrl: projects.sandboxUrl,
        ngrokUrl: projects.ngrokUrl,
        deployedUrl: projects.deployedUrl,
        customDomainUrl: projects.customDomainUrl,
        cloudflareProjectName: projects.cloudflareProjectName,
        serverReady: projects.serverReady,
        serverStatus: projects.serverStatus,
        template: projects.template,
        status: projects.status,
        conversationId: projects.conversationId,
        githubRepo: projects.githubRepo,
        isPublic: projects.isPublic,
        forkedFrom: projects.forkedFrom,
        forkCount: projects.forkCount,
        screenshotMobile: projects.screenshotMobile,
        screenshotDesktop: projects.screenshotDesktop,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, params.id),
          eq(projects.userId, userID)
        )
      )
      .limit(1)

    if (projectResults.length === 0) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const project = projectResults[0]

    // If project is paused and has a sandboxId, try to connect to it
    if (project.status === 'paused' && project.sandboxId) {
      try {
        const sandbox = await connectSandbox(project.sandboxId)
        
        // Update project status
        await db
          .update(projects)
          .set({
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(projects.id, project.id))

        // Schedule pause job for 25 minutes from now (optional - requires inngest)
        try {
          await inngest.send({
            name: 'container/pause.scheduled',
            data: {
              projectId: project.id,
              userID: userID,
              sandboxId: sandbox.sandboxId,
            },
            ts: Date.now() + 25 * 60 * 1000,
          })
        } catch (inngestError) {
          console.log('[Projects] Inngest not available, skipping pause schedule:', inngestError)
        }

        console.log(`Connected to sandbox ${sandbox.sandboxId} for project ${project.id}`)

        return new Response(JSON.stringify({
          project: { ...project, status: 'active' }
        }), { headers: corsHeaders })
      } catch (error) {
        console.error('Failed to connect to sandbox automatically:', error)
        // Return project as-is if connect fails
      }
    }

    return new Response(JSON.stringify({ project: projectResults[0] }), { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching project:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json()
    const { title, deployedUrl, customDomainUrl, userID } = body

    if (!userID) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Validate inputs - at least one field must be provided
    const hasTitle = title && typeof title === 'string' && title.trim().length > 0
    const hasDeployedUrl = deployedUrl && typeof deployedUrl === 'string'
    const hasCustomDomainUrl = customDomainUrl && typeof customDomainUrl === 'string'

    if (!hasTitle && !hasDeployedUrl && !hasCustomDomainUrl) {
      return new Response(JSON.stringify({ error: 'Valid title, deployedUrl, or customDomainUrl is required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Check if project exists and belongs to user
    const existingProject = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, params.id),
          eq(projects.userId, userID)
        )
      )
      .limit(1)

    if (existingProject.length === 0) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (hasTitle) {
      updateData.title = title.trim()
    }

    if (hasDeployedUrl) {
      updateData.deployedUrl = deployedUrl.trim()
    }

    if (hasCustomDomainUrl) {
      const sanitizedDomain = customDomainUrl
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      updateData.customDomainUrl = sanitizedDomain

      // Also update deployedUrl if the project has been deployed
      // This ensures "Visit Webapp" shows the correct URL
      if (existingProject[0].cloudflareProjectName || existingProject[0].deployedUrl) {
        updateData.deployedUrl = `https://${sanitizedDomain}.pages.dev`
      }
    }

    // Update project
    const updatedProject = await db
      .update(projects)
      .set(updateData)
      .where(
        and(
          eq(projects.id, params.id),
          eq(projects.userId, userID)
        )
      )
      .returning()

    // If customDomainUrl was updated and project has been deployed, update Cloudflare custom domain
    if (hasCustomDomainUrl && existingProject[0].cloudflareProjectName) {
      const sanitizedDomain = customDomainUrl
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      console.log(`[Project PATCH] Updating custom domain: ${sanitizedDomain} -> ${existingProject[0].cloudflareProjectName}.pages.dev`)

      try {
        // This will create/update DNS record and add custom domain to Pages project
        const domainResult = await addCustomDomain(
          existingProject[0].cloudflareProjectName,
          sanitizedDomain
        )

        if (!domainResult.success) {
          console.warn(`[Project PATCH] Custom domain update failed: ${domainResult.error}`)
          // Don't fail the request - the project was still updated
        } else {
          console.log(`[Project PATCH] Custom domain updated successfully: ${domainResult.customDomain}`)
        }
      } catch (error) {
        console.error('[Project PATCH] Error updating custom domain:', error)
        // Don't fail the request - the project was still updated
      }
    }

    return new Response(JSON.stringify({
      success: true,
      project: updatedProject[0]
    }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    console.error('Error updating project:', error)
    return new Response(JSON.stringify({
      error: 'Failed to update project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders,
    })
  }
}
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { searchParams } = new URL(req.url)
  const userID = searchParams.get('userID')

  if (!userID) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  try {
    // Verify ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, userID)))
      .limit(1)

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const errors: string[] = []

    // 1. Kill the E2B sandbox if active
    if (project.sandboxId) {
      try {
        const sbx = await connectSandbox(project.sandboxId)
        await sbx.kill()
        console.log(`[Delete] Killed E2B sandbox ${project.sandboxId}`)
      } catch (e) {
        // Sandbox may already be dead — log but don't block deletion
        console.warn(`[Delete] Could not kill sandbox ${project.sandboxId}:`, e)
      }
    }

    // 2. Delete Cloudflare Pages project if one was deployed
    if (project.cloudflareProjectName) {
      try {
        const accountId = process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID
        const apiToken = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN
        if (accountId && apiToken) {
          const cfRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${project.cloudflareProjectName}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${apiToken}` },
            }
          )
          if (!cfRes.ok) {
            const body = await cfRes.text()
            errors.push(`Cloudflare cleanup failed: ${cfRes.status} ${body}`)
            console.warn(`[Delete] Cloudflare Pages delete failed for ${project.cloudflareProjectName}:`, body)
          } else {
            console.log(`[Delete] Deleted Cloudflare Pages project ${project.cloudflareProjectName}`)
          }
        }
      } catch (e) {
        errors.push(`Cloudflare cleanup error: ${e instanceof Error ? e.message : String(e)}`)
        console.warn('[Delete] Cloudflare Pages delete error:', e)
      }
    }

    // 3. Delete the associated chat record (cascades to messages)
    if (project.chatId) {
      try {
        await db.delete(chat).where(eq(chat.id, project.chatId))
        console.log(`[Delete] Deleted chat ${project.chatId}`)
      } catch (e) {
        errors.push(`Chat cleanup failed: ${e instanceof Error ? e.message : String(e)}`)
        console.warn('[Delete] Chat delete error:', e)
      }
    }

    // 4. Delete the project — cascades: convexProjectCredentials, commits, conversations, conversationMessages
    await db.delete(projects).where(eq(projects.id, params.id))
    console.log(`[Delete] Deleted project ${params.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        projectId: params.id,
        ...(errors.length > 0 ? { warnings: errors } : {}),
      }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('[Delete] Error deleting project:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}
