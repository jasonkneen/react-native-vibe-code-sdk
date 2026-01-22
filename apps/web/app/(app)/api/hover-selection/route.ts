import { pusherServer } from '@/lib/pusher'
import { NextRequest, NextResponse } from 'next/server'

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const { sandboxId, data } = await req.json()
    console.log('[API] Received hover selection request:', { sandboxId, data })

    if (!sandboxId || !data) {
      return NextResponse.json(
        { error: 'Missing sandboxId or data' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        },
      )
    }

    // Trigger the hover selection event
    await pusherServer.trigger(`sandbox-${sandboxId}`, 'hover-selection', data)

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  } catch (error) {
    console.error('Hover selection trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger hover selection event' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      },
    )
  }
}
