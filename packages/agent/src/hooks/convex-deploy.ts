import { exec } from 'child_process'
import type { SessionHook } from '../types.js'

/**
 * Runs convex deploy to push any schema/function changes to the server
 * This is a safeguard to ensure changes made during the session are deployed
 */
async function runConvexDeploy(cwd: string): Promise<void> {
  console.log('Running convex deploy...')
  return new Promise((resolve) => {
    exec('npx convex deploy', { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error('Convex deploy failed:', error.message)
        if (stderr) console.error('stderr:', stderr)
      } else {
        console.log('Convex deploy completed')
        if (stdout) console.log('stdout:', stdout)
      }
      // Always resolve - deploy failure shouldn't block session completion
      resolve()
    })
  })
}

/**
 * Creates a session end hook that runs convex deploy
 */
export function createConvexDeployHook(): SessionHook {
  return async (
    input: { hook_event_name: string; cwd: string },
    _toolUseID: string | undefined,
    _options: { signal: AbortSignal }
  ): Promise<{ continue: boolean }> => {
    console.log('SessionEnd hook triggered - running convex deploy')
    await runConvexDeploy(input.cwd)
    return { continue: true }
  }
}
