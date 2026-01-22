/**
 * Hover Mode Toggle API Handler
 *
 * Triggers a Pusher event to enable/disable hover mode in the sandbox.
 * This handler is designed to be used with Next.js API routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import type Pusher from 'pusher'
import {
  PUSHER_EVENTS,
  getSandboxChannelName,
  type HoverModeToggleRequest,
} from '../types'

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * Handle CORS preflight requests
 */
export async function handleOptions(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

/**
 * Options for creating the hover mode toggle handler
 */
export interface CreateHoverModeToggleHandlerOptions {
  /** Pusher server instance */
  pusherServer: Pusher
}

/**
 * Create a POST handler for hover mode toggle.
 *
 * @example
 * ```ts
 * // app/api/hover-mode-toggle/route.ts
 * import { createHoverModeToggleHandler, handleOptions } from '@react-native-vibe-code/visual-edits/api'
 * import { pusherServer } from '@/lib/pusher'
 *
 * export const OPTIONS = handleOptions
 * export const POST = createHoverModeToggleHandler({ pusherServer })
 * ```
 */
export function createHoverModeToggleHandler({
  pusherServer,
}: CreateHoverModeToggleHandlerOptions) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    try {
      const body = (await req.json()) as HoverModeToggleRequest
      const { sandboxId, enabled } = body

      console.log('[API] Received hover mode toggle request:', { sandboxId, enabled })

      if (!sandboxId || typeof enabled !== 'boolean') {
        console.error('[API] Invalid request params:', { sandboxId, enabled })
        return NextResponse.json(
          { error: 'Missing sandboxId or enabled boolean' },
          {
            status: 400,
            headers: corsHeaders,
          },
        )
      }

      const channelName = getSandboxChannelName(sandboxId)
      console.log(`[API] Triggering ${PUSHER_EVENTS.HOVER_MODE_TOGGLE} on channel: ${channelName}`)

      // Trigger the hover mode toggle event
      await pusherServer.trigger(channelName, PUSHER_EVENTS.HOVER_MODE_TOGGLE, {
        enabled,
      })

      console.log('[API] Successfully triggered hover mode toggle event')

      return NextResponse.json(
        { success: true },
        {
          headers: corsHeaders,
        },
      )
    } catch (error) {
      console.error('[API] Hover mode toggle trigger error:', error)
      return NextResponse.json(
        { error: 'Failed to trigger hover mode toggle event' },
        {
          status: 500,
          headers: corsHeaders,
        },
      )
    }
  }
}
