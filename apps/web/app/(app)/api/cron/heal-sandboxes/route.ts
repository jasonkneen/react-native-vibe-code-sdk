import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@react-native-vibe-code/database'
import { eq, and, isNotNull, sql } from 'drizzle-orm'
import { Sandbox } from '@e2b/code-interpreter'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[heal-sandboxes] Starting self-healing cron job...')

  // Only check projects updated in the last 3 hours (recently active)
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)

  const activeProjects = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.status, 'active'),
        isNotNull(projects.sandboxId),
        eq(projects.serverStatus, 'running'),
        sql`${projects.updatedAt} > ${threeHoursAgo}`
      )
    )
    .limit(20)

  console.log(`[heal-sandboxes] Found ${activeProjects.length} projects to check`)

  const results = {
    checked: 0,
    healthy: 0,
    healed: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const project of activeProjects) {
    results.checked++

    try {
      console.log(`[heal-sandboxes] Checking project ${project.id} sandbox ${project.sandboxId}`)

      let isAlive = false

      try {
        const sandbox = await Sandbox.connect(project.sandboxId!)
        await sandbox.commands.run('echo ok', { timeoutMs: 5000 })
        isAlive = true
        results.healthy++
        console.log(`[heal-sandboxes] ✅ Project ${project.id} is healthy`)
      } catch {
        isAlive = false
        console.log(`[heal-sandboxes] ❌ Project ${project.id} sandbox is dead`)
      }

      if (!isAlive) {
        // Use resume-container which properly recreates from GitHub repo
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3210'
          const response = await fetch(`${baseUrl}/api/resume-container`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              userID: project.userId,
            }),
          })

          if (response.ok) {
            results.healed++
            console.log(`[heal-sandboxes] ✅ Project ${project.id} healed via resume-container`)
          } else {
            const err = await response.json()
            throw new Error(err.error || 'resume-container failed')
          }
        } catch (healError) {
          results.failed++
          const msg = `Failed to heal ${project.id}: ${healError instanceof Error ? healError.message : 'unknown'}`
          results.errors.push(msg)
          console.error(`[heal-sandboxes] ❌ ${msg}`)

          // Mark as needing attention
          await db
            .update(projects)
            .set({ serverStatus: 'closed', sandboxStatus: 'destroyed', updatedAt: new Date() })
            .where(eq(projects.id, project.id))
        }
      }
    } catch (err) {
      results.failed++
      results.errors.push(`Error on ${project.id}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  console.log('[heal-sandboxes] Done:', results)
  return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...results })
}
