import { auth } from '@/lib/auth/config'
import { toNextJsHandler } from 'better-auth/next-js'
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors'

// Handle preflight requests
export async function OPTIONS(request: Request) {
  return handleCorsOptions(request)
}

// Wrap Better Auth handlers with CORS headers
const handlers = toNextJsHandler(auth)

export async function GET(request: Request) {
  const response = await handlers.GET(request)

  // Add CORS headers to response based on request origin
  const corsHeaders = getCorsHeaders(request)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export async function POST(request: Request) {
  try {
    const response = await handlers.POST(request)

    // Add CORS headers to response based on request origin
    const corsHeaders = getCorsHeaders(request)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  } catch (error) {
    console.error('[Auth] POST handler error:', error)
    console.error('[Auth] Request URL:', request.url)
    throw error
  }
}
