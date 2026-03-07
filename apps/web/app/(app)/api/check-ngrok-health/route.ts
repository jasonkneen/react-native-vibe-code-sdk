import { NextResponse } from 'next/server'
import { connectSandbox } from '@/lib/sandbox-connect'

interface CheckNgrokHealthRequest {
  ngrokUrl: string
  sandboxId: string
  checkPort?: number
}

interface CheckNgrokHealthResponse {
  isAlive: boolean
  reason?: string
  tunnelStatus: 'connected' | 'disconnected' | 'unknown'
  serverStatus?: 'running' | 'stopped'
  expoError?: string | null
}

// Error patterns that indicate ngrok tunnel is down
const NGROK_ERROR_PATTERNS = [
  'ERR_NGROK',
  'Tunnel not found',
  'failed to complete tunnel connection',
  'ngrok error',
  'Closed Port Error',
  'Connection refused on port',
  'no service running on port',
  'tunnel session not found',
  '502 Bad Gateway',
  '503 Service Unavailable',
]

export async function POST(request: Request) {
  try {
    const body: CheckNgrokHealthRequest = await request.json()
    const { ngrokUrl, sandboxId, checkPort = 8081 } = body

    if (!ngrokUrl || !sandboxId) {
      return NextResponse.json<CheckNgrokHealthResponse>(
        {
          isAlive: false,
          reason: 'ngrokUrl and sandboxId are required',
          tunnelStatus: 'unknown',
        },
        { status: 400 }
      )
    }

    console.log('[check-ngrok-health] Checking ngrok tunnel health:', { ngrokUrl, sandboxId, checkPort })

    let tunnelStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown'
    let serverStatus: 'running' | 'stopped' | undefined = undefined
    let expoError: string | null = null

    // Step 1: Check if the ngrok URL is responding
    try {
      console.log('[check-ngrok-health] Fetching ngrok URL...')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(ngrokUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NgrokHealthCheck/1.0)',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const text = await response.text()
      console.log('[check-ngrok-health] Response status:', response.status)
      console.log('[check-ngrok-health] Response preview:', text.substring(0, 300))

      // Check for Expo error page — this means the app has a build error
      // but the tunnel is still working (Expo serves an error page)
      if (text.includes('_expo-static-error')) {
        console.log('[check-ngrok-health] ⚠️ Expo error page detected — tunnel connected but app has errors')
        tunnelStatus = 'connected'
        // Extract error message from the Expo error JSON
        try {
          const errorMatch = text.match(/<script id="_expo-static-error"[^>]*>([\s\S]*?)<\/script>/)
          if (errorMatch) {
            const errorData = JSON.parse(errorMatch[1])
            const firstLog = errorData?.logs?.[0]

            // Strategy 1: Static error with message object (e.g. { message: { message: "...", name: "SyntaxError" } })
            if (firstLog?.type === 'static' && firstLog.message) {
              if (typeof firstLog.message === 'string') {
                expoError = firstLog.message
              } else if (typeof firstLog.message?.message === 'string') {
                // Include error name if available (e.g. "SyntaxError: ...")
                const name = firstLog.message.name
                const msg = firstLog.message.message
                expoError = name && !msg.startsWith(name) ? `${name}: ${msg}` : msg
              }
            }

            // Strategy 2: Symbolicated stack error
            if (!expoError && firstLog?.symbolicated?.stack?.error?.message) {
              expoError = firstLog.symbolicated.stack.error.message
            }

            // Strategy 3: Try any log entry (not just the first)
            if (!expoError && Array.isArray(errorData?.logs)) {
              for (const log of errorData.logs) {
                const msg = log?.message
                if (typeof msg === 'string' && msg.length > 0) {
                  expoError = msg
                  break
                }
                if (typeof msg?.message === 'string' && msg.message.length > 0) {
                  expoError = msg.message
                  break
                }
              }
            }
          }
        } catch (parseErr) {
          console.log('[check-ngrok-health] Failed to parse Expo error JSON:', parseErr)
        }

        // Fallback: if we detected the error page but couldn't extract the message,
        // still report a generic error so the user knows something is wrong
        if (!expoError) {
          console.log('[check-ngrok-health] Could not extract specific error, using fallback')
          expoError = 'Expo build error detected — check the preview for details'
        }

        console.log('[check-ngrok-health] Extracted Expo error:', expoError.substring(0, 150))
      }

      // Also check for Expo/Metro "Server Error" pages that don't use _expo-static-error
      // These show "Server Error" with SyntaxError/TypeError etc. in the HTML
      if (!expoError && text.includes('Server Error')) {
        const serverErrorMatch = text.match(/(SyntaxError|TypeError|ReferenceError|RangeError):\s*([^\n<]+)/)
        if (serverErrorMatch) {
          console.log('[check-ngrok-health] ⚠️ Expo Server Error page detected')
          tunnelStatus = 'connected'
          expoError = serverErrorMatch[0].trim()
          console.log('[check-ngrok-health] Extracted error from Server Error page:', expoError.substring(0, 150))
        }
      }

      // Check for ngrok error patterns in the response
      const hasNgrokError = NGROK_ERROR_PATTERNS.some(pattern =>
        text.toLowerCase().includes(pattern.toLowerCase())
      )

      if (hasNgrokError) {
        console.log('[check-ngrok-health] ❌ Detected ngrok error pattern in response')
        tunnelStatus = 'disconnected'
      } else if (response.ok || response.status === 404) {
        // 200 OK or 404 (Expo might return 404 for some routes) means tunnel is working
        console.log('[check-ngrok-health] ✅ Ngrok tunnel is connected')
        tunnelStatus = 'connected'
      } else if (response.status >= 500 && !expoError) {
        // 5xx errors typically indicate tunnel issues, unless we already detected an Expo error page
        console.log('[check-ngrok-health] ❌ Server error, tunnel may be down')
        tunnelStatus = 'disconnected'
      } else {
        tunnelStatus = 'connected'
      }
    } catch (fetchError: any) {
      console.log('[check-ngrok-health] ❌ Fetch failed:', fetchError.message)

      if (fetchError.name === 'AbortError') {
        console.log('[check-ngrok-health] Request timed out')
      }

      tunnelStatus = 'disconnected'
    }

    // Step 2: If tunnel appears down, check if the server is still running in the sandbox
    if (tunnelStatus === 'disconnected') {
      try {
        console.log('[check-ngrok-health] Checking if server is still running in sandbox...')
        const sandbox = await connectSandbox(sandboxId)

        // Check if the port is listening
        const checkPortCmd = `ss -tuln 2>/dev/null | grep -q :${checkPort} && echo "LISTENING" || echo "NOT_LISTENING"`
        const result = await sandbox.commands.run(checkPortCmd, { timeoutMs: 3000 })

        const isPortListening = result.stdout.includes('LISTENING') && !result.stdout.includes('NOT_LISTENING')
        serverStatus = isPortListening ? 'running' : 'stopped'

        console.log('[check-ngrok-health] Server status:', serverStatus)
      } catch (sandboxError) {
        console.error('[check-ngrok-health] Failed to check sandbox:', sandboxError)
        serverStatus = undefined
      }
    } else {
      // Tunnel is connected, so server must be running
      serverStatus = 'running'
    }

    const isAlive = tunnelStatus === 'connected'

    console.log('[check-ngrok-health] Final result:', { isAlive, tunnelStatus, serverStatus })

    return NextResponse.json<CheckNgrokHealthResponse>({
      isAlive,
      tunnelStatus,
      serverStatus,
      expoError,
      reason: !isAlive ? 'Ngrok tunnel is disconnected' : undefined,
    })
  } catch (error) {
    console.error('[check-ngrok-health] Error:', error)
    return NextResponse.json<CheckNgrokHealthResponse>(
      {
        isAlive: false,
        reason: 'Health check failed',
        tunnelStatus: 'unknown',
      },
      { status: 500 }
    )
  }
}
