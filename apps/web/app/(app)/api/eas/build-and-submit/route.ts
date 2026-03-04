import { NextRequest } from 'next/server'
import { connectSandbox } from '@/lib/sandbox-connect'
import type { CommandHandle, Sandbox } from '@e2b/code-interpreter'

export const maxDuration = 600 // 10 minutes for build+submit process

// Global map to store running process handles keyed by sandboxId
// so the input endpoint can write to stdin
const runningProcesses = new Map<
  string,
  { pid: number; sandboxId: string }
>()

// Export for use by the input route
export { runningProcesses }

export async function POST(request: NextRequest) {
  try {
    const {
      sandboxId,
      projectId,
      appName,
      bundleId,
      appleId,
      applePassword,
      expoToken,
    } = await request.json()

    if (!sandboxId || !projectId) {
      return new Response(
        JSON.stringify({ error: 'Sandbox ID and Project ID are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!expoToken) {
      return new Response(
        JSON.stringify({ error: 'Expo token is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Connect to the sandbox
    const sbx = await connectSandbox(sandboxId)
    if (!sbx) {
      return new Response(
        JSON.stringify({ error: 'Failed to connect to sandbox' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Set environment variables in the sandbox
    await sbx.commands.run(
      `export EXPO_TOKEN=${shellEscape(expoToken)}` +
        (appleId
          ? ` && export EXPO_APPLE_ID=${shellEscape(appleId)}`
          : '') +
        (applePassword
          ? ` && export EXPO_APPLE_PASSWORD=${shellEscape(applePassword)}`
          : ''),
      { cwd: '/home/user/app' }
    )

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let submissionUrl: string | null = null
        let overallSuccess = false

        function sendEvent(event: Record<string, unknown>) {
          controller.enqueue(
            encoder.encode(JSON.stringify(event) + '\n')
          )
        }

        try {
          // Phase 1: Initialize EAS project
          sendEvent({
            type: 'log',
            data: '[Phase 1] Initializing EAS project...',
          })

          const initCmd = `export EXPO_TOKEN=${shellEscape(expoToken)} && npx eas-cli@latest init --force --non-interactive`

          const initResult = await sbx.commands.run(initCmd, {
            cwd: '/home/user/app',
            timeoutMs: 120_000,
            onStdout: (data: string) => {
              sendEvent({ type: 'log', data })
            },
            onStderr: (data: string) => {
              sendEvent({ type: 'log', data })
            },
          })

          if (initResult.exitCode !== 0) {
            sendEvent({
              type: 'log',
              data: `[Phase 1] EAS init failed with exit code ${initResult.exitCode}`,
            })
            sendEvent({
              type: 'done',
              success: false,
              submissionUrl: null,
            })
            controller.close()
            return
          }

          sendEvent({
            type: 'log',
            data: '[Phase 1] EAS project initialized successfully.',
          })

          // Phase 2: Build and submit (interactive)
          sendEvent({
            type: 'log',
            data: '[Phase 2] Starting EAS build + submit...',
          })

          const buildCmd =
            `export EXPO_TOKEN=${shellEscape(expoToken)}` +
            (appleId
              ? ` && export EXPO_APPLE_ID=${shellEscape(appleId)}`
              : '') +
            (applePassword
              ? ` && export EXPO_APPLE_PASSWORD=${shellEscape(applePassword)}`
              : '') +
            ` && npx eas-cli@latest build -p ios --profile production --auto-submit`

          // Use a mutable ref so callbacks can access the pid after handle is created
          const processRef: { pid: number | undefined } = { pid: undefined }

          const handle: CommandHandle = await sbx.commands.run(buildCmd, {
            cwd: '/home/user/app',
            background: true,
            stdin: true,
            timeoutMs: 540_000, // 9 minutes
            onStdout: (data: string) => {
              handleOutput(data, sendEvent, submissionUrl, (url) => {
                submissionUrl = url
              }, sbx, processRef.pid)
            },
            onStderr: (data: string) => {
              handleOutput(data, sendEvent, submissionUrl, (url) => {
                submissionUrl = url
              }, sbx, processRef.pid)
            },
          })

          processRef.pid = handle.pid

          // Store process handle for stdin access from input route
          runningProcesses.set(sandboxId, {
            pid: handle.pid,
            sandboxId,
          })

          // Wait for process to complete
          try {
            const result = await handle.wait()
            overallSuccess = result.exitCode === 0
          } catch (err: any) {
            // CommandExitError is thrown for non-zero exit codes
            overallSuccess = false
            sendEvent({
              type: 'log',
              data: `Build process error: ${err.message || 'Unknown error'}`,
            })
          }

          // Clean up process handle
          runningProcesses.delete(sandboxId)

          sendEvent({
            type: 'done',
            success: overallSuccess,
            submissionUrl,
          })
        } catch (err: any) {
          runningProcesses.delete(sandboxId)
          sendEvent({
            type: 'log',
            data: `Error: ${err.message || 'Unknown error'}`,
          })
          sendEvent({
            type: 'done',
            success: false,
            submissionUrl: null,
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Build-and-submit error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to start build and submit',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Process output lines from the EAS CLI and detect interactive prompts.
 */
function handleOutput(
  data: string,
  sendEvent: (event: Record<string, unknown>) => void,
  currentSubmissionUrl: string | null,
  setSubmissionUrl: (url: string) => void,
  sbx?: Sandbox | null,
  pid?: number
) {
  // Always send the raw log
  sendEvent({ type: 'log', data })

  // Check for login failure
  if (data.includes('Invalid username and password combination')) {
    sendEvent({ type: 'prompt', prompt: 'credentials_failed' })
    // Automatically answer "no" to the retry prompt
    if (sbx && pid !== undefined) {
      sbx.commands.sendStdin(pid, 'no\n').catch(() => {
        // Ignore errors if process already exited
      })
    }
    return
  }

  // Check for 2FA method selection
  if (
    data.includes('want to validate your account') ||
    data.includes('device / sms')
  ) {
    sendEvent({ type: 'prompt', prompt: '2fa_method' })
    return
  }

  // Check for 2FA code entry
  if (
    data.includes('6 digit code') ||
    (data.includes('Enter the') && data.includes('code'))
  ) {
    sendEvent({ type: 'prompt', prompt: '2fa_code' })
    return
  }

  // Check for submission/build URL
  const urlMatch = data.match(/(https:\/\/expo\.dev\/accounts\/[^\s]+)/)
  if (urlMatch) {
    setSubmissionUrl(urlMatch[1])
  }
}

/**
 * Escape a string for safe use in a shell command.
 */
function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'"
}
