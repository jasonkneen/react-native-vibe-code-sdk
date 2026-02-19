/**
 * Sandbox Mode Configuration
 *
 * Controls whether projects run in E2B cloud sandboxes or locally.
 *
 * Set SANDBOX_MODE=local in .env.local to run everything on the local machine:
 *   - No E2B API key needed
 *   - Expo dev server runs locally
 *   - Files stored in LOCAL_PROJECTS_DIR (default: ~/.capsule-projects)
 *   - Claude Code SDK runs directly on your machine
 *
 * Set SANDBOX_MODE=e2b (default) for cloud sandboxes.
 */

export type SandboxMode = 'e2b' | 'local'

export function getSandboxMode(): SandboxMode {
  const mode = process.env.SANDBOX_MODE?.toLowerCase()
  if (mode === 'local') return 'local'
  return 'e2b'
}

export function isLocalMode(): boolean {
  return getSandboxMode() === 'local'
}

/**
 * Base directory for local projects.
 * Each project gets a subdirectory: {LOCAL_PROJECTS_DIR}/{projectId}/
 * Inside that is the Expo app at: {LOCAL_PROJECTS_DIR}/{projectId}/app/
 */
export function getLocalProjectsDir(): string {
  return process.env.LOCAL_PROJECTS_DIR || `${process.env.HOME}/.capsule-projects`
}

/**
 * Get the app directory for a specific project.
 * This is equivalent to /home/user/app in the E2B sandbox.
 */
export function getLocalProjectAppDir(projectId: string): string {
  return `${getLocalProjectsDir()}/${projectId}/app`
}

/**
 * Local Expo dev server port.
 * When running locally, the Expo web server runs on this port.
 */
export function getLocalExpoPort(): number {
  return parseInt(process.env.LOCAL_EXPO_PORT || '8081')
}

/**
 * Get the preview URL for a local project.
 */
export function getLocalPreviewUrl(): string {
  return `http://localhost:${getLocalExpoPort()}`
}
