// Inline type definitions — mirrors @react-native-vibe-code/chat/lib
// Using inline types avoids breakage when the chat package dist gets cleared by tsup clean: true

export type LLMModel = {
  id: string
  name: string
  provider: string
  providerId: string
}

export type LLMModelConfig = {
  model?: string
  apiKey?: string
  baseURL?: string
  temperature?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  maxTokens?: number
}

// Re-export runtime values from the package (these only fail if dist is broken at runtime, not at type-check time)
export { getModelClient, getChatHistoryLimit, CHAT_HISTORY_LIMIT } from '@react-native-vibe-code/chat'
