import { NextRequest, NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'

const pusherConfigured =
  !!process.env.PUSHER_APP_ID &&
  !!process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
  !!process.env.PUSHER_APP_SECRET &&
  !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER

export async function POST(req: NextRequest) {
  try {
    const { channel, event, data } = await req.json()

    if (!channel || !event || !data) {
      return NextResponse.json(
        { error: 'Missing channel, event, or data' },
        { status: 400 },
      )
    }

    if (!pusherConfigured) {
      return NextResponse.json({ success: true, skipped: true })
    }

    await pusherServer.trigger(channel, event, data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Pusher trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger event' },
      { status: 500 },
    )
  }
}