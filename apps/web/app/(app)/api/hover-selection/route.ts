import { pusherServer } from '@/lib/pusher'
import { NextRequest, NextResponse } from 'next/server'

// CORS + Private Network Access headers.
// Old sandbox templates use fetch() to POST here from *.e2b.app (public origin)
// to localhost (private/loopback). Chrome's Private Network Access policy blocks
// this unless the preflight response includes Access-Control-Allow-Private-Network.
// New sandbox templates use postMessage instead, but we keep this for backward compat.
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
    const { sandboxId, data } = await req.json()

    if (!sandboxId || !data) {
      return NextResponse.json(
        { error: 'Missing sandboxId or data' },
        { status: 400, headers: corsHeaders },
      )
    }

    if (!pusherConfigured) {
      return NextResponse.json({ success: true, skipped: true }, { headers: corsHeaders })
    }

    await pusherServer.trigger(`sandbox-${sandboxId}`, 'hover-selection', data)

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Hover selection trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger hover selection event' },
      { status: 500, headers: corsHeaders },
    )
  }
}
