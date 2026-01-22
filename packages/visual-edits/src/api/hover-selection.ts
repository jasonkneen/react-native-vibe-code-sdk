/**
 * Hover Selection API Handler
 *
 * Relays selection data from the sandbox to the web app via Pusher.
 * This handler is designed to be used with Next.js API routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import type Pusher from 'pusher'
import {
  PUSHER_EVENTS,
  getSandboxChannelName,
  type HoverSelectionRequest,
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
 * Options for creating the hover selection handler
 */
export interface CreateHoverSelectionHandlerOptions {
  /** Pusher server instance */
  pusherServer: Pusher
}

/**
 * Create a POST handler for hover selection.
 *
 * @example
 * ```ts
 * // app/api/hover-selection/route.ts
 * import { createHoverSelectionHandler, handleOptions } from '@react-native-vibe-code/visual-edits/api'
 * import { pusherServer } from '@/lib/pusher'
 *
 * export const OPTIONS = handleOptions
 * export const POST = createHoverSelectionHandler({ pusherServer })
 * ```
 */
export function createHoverSelectionHandler({
  pusherServer,
}: CreateHoverSelectionHandlerOptions) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    try {
      const body = (await req.json()) as HoverSelectionRequest
      const { sandboxId, data } = body

      console.log('[API] Received hover selection request:', { sandboxId, data })

      if (!sandboxId || !data) {
        return NextResponse.json(
          { error: 'Missing sandboxId or data' },
          {
            status: 400,
            headers: corsHeaders,
          },
        )
      }

      const channelName = getSandboxChannelName(sandboxId)

      // Trigger the hover selection event
      await pusherServer.trigger(channelName, PUSHER_EVENTS.HOVER_SELECTION, data)

      return NextResponse.json(
        { success: true },
        {
          headers: corsHeaders,
        },
      )
    } catch (error) {
      console.error('[API] Hover selection trigger error:', error)
      return NextResponse.json(
        { error: 'Failed to trigger hover selection event' },
        {
          status: 500,
          headers: corsHeaders,
        },
      )
    }
  }
}
