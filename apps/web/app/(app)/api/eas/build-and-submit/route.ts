import { NextRequest } from 'next/server'
import { connectSandbox } from '@/lib/sandbox-connect'
import type { CommandHandle } from '@e2b/code-interpreter'

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
          // Phase 0: Patch app.json to avoid interactive prompts
          sendEvent({
            type: 'log',
            data: '[Setup] Configuring app for production build...',
          })

          // Set usesNonExemptEncryption to avoid the encryption prompt
          // and update bundleIdentifier / app name if provided
          const patchScript = `
            const fs = require('fs');
            const configPath = '/home/user/app/app.json';
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (!config.expo) config.expo = {};
            if (!config.expo.ios) config.expo.ios = {};
            if (!config.expo.ios.infoPlist) config.expo.ios.infoPlist = {};
            config.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption = false;
            ${appName ? `config.expo.name = ${JSON.stringify(appName)};` : ''}
            ${bundleId ? `config.expo.ios.bundleIdentifier = ${JSON.stringify(bundleId)};` : ''}
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log('app.json patched successfully');
          `.trim()

          await sbx.commands.run(
            `node -e ${shellEscape(patchScript)}`,
            {
              cwd: '/home/user/app',
              timeoutMs: 10_000,
              onStdout: (data: string) => sendEvent({ type: 'log', data }),
              onStderr: (data: string) => sendEvent({ type: 'log', data }),
            }
          )

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

          // Phase 2: Build and submit
          sendEvent({
            type: 'log',
            data: '[Phase 2] Starting EAS build + submit...',
          })

          const envVars = [
            `export EXPO_TOKEN=${shellEscape(expoToken)}`,
            `export EAS_BUILD_NO_EXPO_GO_WARNING=true`,
            appleId ? `export EXPO_APPLE_ID=${shellEscape(appleId)}` : '',
            applePassword ? `export EXPO_APPLE_PASSWORD=${shellEscape(applePassword)}` : '',
          ].filter(Boolean).join(' && ')

          const buildCmd = `${envVars} && npx eas-cli@latest build -p ios --profile production --auto-submit --non-interactive`

          // Use a mutable ref so callbacks can access the pid after handle is created
          const processRef: { pid: number | undefined } = { pid: undefined }

          const handle: CommandHandle = await sbx.commands.run(buildCmd, {
            cwd: '/home/user/app',
            background: true,
            timeoutMs: 540_000, // 9 minutes
            onStdout: (data: string) => {
              handleOutput(data, sendEvent, submissionUrl, (url) => {
                submissionUrl = url
              })
            },
            onStderr: (data: string) => {
              handleOutput(data, sendEvent, submissionUrl, (url) => {
                submissionUrl = url
              })
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
 * Process output lines from the EAS CLI and detect notable events.
 */
function handleOutput(
  data: string,
  sendEvent: (event: Record<string, unknown>) => void,
  currentSubmissionUrl: string | null,
  setSubmissionUrl: (url: string) => void,
) {
  // Always send the raw log
  sendEvent({ type: 'log', data })

  // Check for login failure
  if (data.includes('Invalid username and password combination')) {
    sendEvent({ type: 'prompt', prompt: 'credentials_failed' })
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
