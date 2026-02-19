import { NextRequest, NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'

// CORS + Private Network Access headers for backward compat with old sandbox templates
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Private-Network': 'true',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

const pusherConfigured =
  !!process.env.PUSHER_APP_ID &&
  !!process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
  !!process.env.PUSHER_APP_SECRET &&
  !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER

export async function POST(req: NextRequest) {
  try {
    const { sandboxId, enabled } = await req.json()

    if (!sandboxId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing sandboxId or enabled boolean' },
        { status: 400, headers: corsHeaders },
      )
    }

    // Pusher not configured — no-op but don't error the client
    if (!pusherConfigured) {
      return NextResponse.json(
        { success: true, skipped: true },
        { headers: corsHeaders },
      )
    }

    const channelName = `sandbox-${sandboxId}`
    await pusherServer.trigger(channelName, 'hover-mode-toggle', { enabled })

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('[API] Hover mode toggle trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger hover mode toggle event' },
      { status: 500, headers: corsHeaders },
    )
  }
}