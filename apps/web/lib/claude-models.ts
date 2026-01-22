// Type definitions for Claude models supported by Claude Agent SDK

export interface ClaudeModel {
  id: string
  name: string
  description: string
  isDefault?: boolean
}

export const CLAUDE_MODELS: ClaudeModel[] = [
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    description: 'Balanced performance and speed',
    isDefault: true,
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    description: 'Most capable model for complex tasks',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    description: 'Fastest responses',
  },
]

export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5-20250929'

export const CLAUDE_MODEL_STORAGE_KEY = 'capsule-claude-model'

export function getClaudeModelById(id: string): ClaudeModel | undefined {
  return CLAUDE_MODELS.find((m) => m.id === id)
}

export function getDefaultClaudeModel(): ClaudeModel {
  return CLAUDE_MODELS.find((m) => m.isDefault) || CLAUDE_MODELS[0]
}
