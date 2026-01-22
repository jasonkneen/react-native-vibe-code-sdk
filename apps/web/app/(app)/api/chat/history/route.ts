import { getProjectMessages } from '@/lib/db'
import { NextResponse } from 'next/server'
import { corsHeaders, handleCorsOptions } from '@/lib/cors'
import { CHAT_HISTORY_LIMIT } from '@/lib/chat-config'

export async function OPTIONS() {
  return handleCorsOptions()
}

export async function POST(req: Request) {
  try {
    // Fetch messages with configurable limit (default from env: CHAT_HISTORY_LIMIT)
    const { projectId, userId, limit: requestedLimit } = await req.json()
    const limit = requestedLimit || CHAT_HISTORY_LIMIT

    console.log('Chat history API called:', { projectId, userId, limit })

    if (!projectId || !userId) {
      console.log('Missing required parameters:', { projectId, userId })
      return NextResponse.json(
        { error: 'Project ID and User ID are required' },
        { status: 400, headers: corsHeaders },
      )
    }

    console.log('Fetching last 30 messages from database...')
    const messages = await getProjectMessages(projectId, userId, limit)
    console.log('Messages fetched:', messages?.length || 0, 'messages')

    return NextResponse.json({ messages }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500, headers: corsHeaders },
    )
  }
}
