import { NextRequest, NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'

const pusherConfigured =
  !!process.env.PUSHER_APP_ID &&
  !!process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
  !!process.env.PUSHER_APP_SECRET &&
  !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER

export async function POST(req: NextRequest) {
  // Pusher not configured — return 403 so client stops trying to auth
  if (!pusherConfigured) {
    return NextResponse.json({ error: 'Pusher not configured' }, { status: 403 })
  }

  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const socketId = params.get('socket_id')
    const channelName = params.get('channel_name')

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 },
      )
    }

    // For now, allow all sandbox channels
    if (channelName.startsWith('sandbox-')) {
      const auth = pusherServer.authorizeChannel(socketId, channelName)
      return NextResponse.json(auth)
    }

    return NextResponse.json({ error: 'Unauthorized channel' }, { status: 403 })
  } catch (error) {
    console.error('Pusher auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}