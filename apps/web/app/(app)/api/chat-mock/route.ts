/**
 * Mock Chat API Endpoint for Dev Testing
 *
 * This endpoint uses AI SDK's createMockProvider to simulate streaming
 * responses without requiring authentication or actual AI provider connection.
 * Only available in development mode.
 */

import { corsHeaders } from '@/lib/cors'
import { streamText, type LanguageModelV1 } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 60

// Create a simple mock language model
function createMockLanguageModel(): LanguageModelV1 {
  return {
    specificationVersion: 'v1',
    provider: 'mock-provider',
    modelId: 'mock-model',
    defaultObjectGenerationMode: 'json',

    async doStream({ prompt }) {
      // Extract the last user message
      const messages = Array.isArray(prompt) ? prompt : []
      const lastMessage = messages[messages.length - 1]
      const userMessage = typeof lastMessage?.content === 'string'
        ? lastMessage.content
        : 'Hello'

      // Generate mock response
      const responseText = `Mock AI Response:\n\nYou said: "${userMessage}"\n\nThis is a mock streaming response to test the streaming functionality in your Expo app. The streaming should work smoothly without any authentication or backend connection.\n\n✅ Streaming is working!\n\nKey points:\n• This is rendered in real-time\n• Each chunk arrives progressively\n• No authentication needed\n• Perfect for testing\n\nTry sending another message to see it stream again!`

      // Split into words for streaming simulation
      const words = responseText.split(' ')

      const stream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < words.length; i++) {
            const word = words[i]

            // Send text delta
            controller.enqueue({
              type: 'text-delta' as const,
              textDelta: (i > 0 ? ' ' : '') + word,
            })

            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 30))
          }

          // Send finish event
          controller.enqueue({
            type: 'finish' as const,
            finishReason: 'stop' as const,
            usage: {
              promptTokens: 10,
              completionTokens: words.length,
            },
          })

          controller.close()
        },
      })

      return {
        stream,
        rawCall: { rawPrompt: prompt, rawSettings: {} },
        warnings: [],
      }
    },

    async doGenerate() {
      throw new Error('doGenerate not implemented for mock provider')
    },
  }
}

export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not available in production', { status: 404 })
  }

  try {
    const { messages } = await request.json()

    console.log('[Mock Chat API] Received request with', messages?.length, 'messages')

    // Use the mock language model with streamText
    const result = streamText({
      model: createMockLanguageModel(),
      messages
    })

    // Return streaming response
    return result.toDataStreamResponse({
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'none',
          ...corsHeaders,
        },
      })
  } catch (error) {
    console.error('[Mock Chat API] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
