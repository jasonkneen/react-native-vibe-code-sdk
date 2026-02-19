import { Sandbox } from '@e2b/code-interpreter'
import { db, projects, eq, and } from '@/lib/db'
import { startExpoServer } from '@/lib/server-utils'

// Template ID map - mirrors create-container route
const TEMPLATE_ID_MAP: Record<string, string> = {
  expo: 'a3lmq9qc4tpctk5654yv',
  tamagui: '10aeyh6gcn9lmorirs2z',
  'expo-testing': 'wxe2y93k4kafhbwqg2br',
  // Fallback: the default react-native-expo template maps to 'expo'
  'react-native-expo': 'a3lmq9qc4tpctk5654yv',
}

/** Resolve the E2B template ID from a project template string */
function resolveTemplateId(template: string | null | undefined): string {
  if (!template) return TEMPLATE_ID_MAP.expo
  return TEMPLATE_ID_MAP[template] ?? TEMPLATE_ID_MAP.expo
}

export interface SandboxRecoveryResult {
  sandbox: Sandbox
  wasRecreated: boolean
  newSandboxId?: string
  newUrl?: string
  newNgrokUrl?: string
}

/**
 * Connect to a sandbox, automatically recreating it if dead.
 * If recreated, updates the DB record and (optionally) restarts Expo.
 *
 * @param sandboxId  - Current E2B sandbox ID (may be expired)
 * @param projectId  - Project ID for DB lookup + update
 * @param userId     - User ID for DB update
 * @param options    - { startExpo?: boolean; template?: string }
 */
export async function connectWithRecovery(
  sandboxId: string,
  projectId: string,
  userId: string,
  options?: { startExpo?: boolean; template?: string },
): Promise<SandboxRecoveryResult> {
  // ── 1. Happy path: sandbox is still alive ──────────────────────────────
  try {
    const sandbox = await Sandbox.connect(sandboxId)
    console.log(`[SandboxRecovery] Connected to existing sandbox: ${sandbox.sandboxId}`)
    return { sandbox, wasRecreated: false }
  } catch (connectError) {
    console.warn(
      `[SandboxRecovery] Failed to connect to sandbox ${sandboxId}:`,
      connectError instanceof Error ? connectError.message : connectError,
    )
    // Fall through to resurrection
  }

  // ── 2. Fetch project from DB to get the template ───────────────────────
  let templateValue = options?.template ?? 'react-native-expo'

  try {
    const rows = await db
      .select({ template: projects.template })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    if (rows.length > 0 && rows[0].template) {
      templateValue = rows[0].template
    }
  } catch (dbError) {
    console.error('[SandboxRecovery] Failed to fetch project template from DB:', dbError)
    // Continue with the default / provided template
  }

  const templateId = resolveTemplateId(templateValue)
  console.log(
    `[SandboxRecovery] Resurrecting sandbox for project ${projectId} using template ${templateValue} (${templateId})`,
  )

  // ── 3. Create a fresh sandbox ──────────────────────────────────────────
  const sandbox = await Sandbox.create(templateId, {
    metadata: {
      template: templateId,
      userID: userId,
      projectId,
    },
    timeoutMs: parseInt(process.env.E2B_SANDBOX_TIMEOUT_MS ?? '3600000'),
  })

  console.log(`[SandboxRecovery] Created new sandbox: ${sandbox.sandboxId}`)

  // ── 4. (Optional) Start Expo ───────────────────────────────────────────
  let newUrl: string | undefined
  let newNgrokUrl: string | undefined

  const shouldStartExpo =
    options?.startExpo === true &&
    (templateValue === 'react-native-expo' || templateValue === 'expo' || templateValue === 'tamagui')

  if (shouldStartExpo) {
    try {
      console.log('[SandboxRecovery] Starting Expo server on new sandbox...')
      const serverResult = await startExpoServer(sandbox, projectId)
      newUrl = serverResult.url
      newNgrokUrl = serverResult.ngrokUrl
      console.log(`[SandboxRecovery] Expo started – url: ${newUrl}, ngrok: ${newNgrokUrl}`)
    } catch (expoError) {
      console.error('[SandboxRecovery] Failed to start Expo (non-fatal):', expoError)
    }
  }

  // ── 5. Update DB ───────────────────────────────────────────────────────
  try {
    await db
      .update(projects)
      .set({
        sandboxId: sandbox.sandboxId,
        ...(newUrl !== undefined ? { sandboxUrl: newUrl } : {}),
        ...(newNgrokUrl !== undefined ? { ngrokUrl: newNgrokUrl } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

    console.log(`[SandboxRecovery] DB updated with new sandboxId: ${sandbox.sandboxId}`)
  } catch (dbUpdateError) {
    console.error('[SandboxRecovery] Failed to update DB with new sandbox ID (non-fatal):', dbUpdateError)
  }

  return {
    sandbox,
    wasRecreated: true,
    newSandboxId: sandbox.sandboxId,
    newUrl,
    newNgrokUrl,
  }
}
