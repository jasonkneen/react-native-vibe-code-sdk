// Title generator for app naming based on user's first message

import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { UIMessage } from 'ai'

/**
 * Generate a short title from the first user message
 * The title will be used as the app name and slug
 */
export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage
}): Promise<string> {
  try {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const { text: title } = await generateText({
      model: anthropic('claude-3-5-haiku-20241022'),
      system: `
- you will generate a short title based on the first message a user begins a conversation with
- ensure it is not more than 40 characters long
- the title should be a summary of the user's message
- maximus of 3 words 
- do not use quotes or colons
- make it lowercase with hyphens instead of spaces (e.g., "weather-app" not "Weather App")
- keep it concise and descriptive`,
      prompt: JSON.stringify(message),
      maxTokens: 50,
      temperature: 0.7,
    })

    // Clean the title: lowercase, replace spaces with hyphens, remove special chars
    const cleanTitle = title
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .substring(0, 50) // Limit length

    return cleanTitle || 'my-app'
  } catch (error) {
    console.error('Error generating title:', error)
    // Fallback title
    return 'my-app'
  }
}
