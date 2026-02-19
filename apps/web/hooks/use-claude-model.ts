import { useCallback, useEffect } from 'react'
import { useLocalStorage } from './use-local-storage'
import {
  DEFAULT_CLAUDE_MODEL,
  CLAUDE_MODEL_STORAGE_KEY,
  getClaudeModelById,
} from '@/lib/claude-models'

/**
 * Hook to manage Claude model selection with localStorage persistence.
 * Automatically resets to the default if the stored model ID is no longer
 * in the available models list (e.g. after a model rename/removal).
 */
export function useClaudeModel() {
  const [selectedModel, setSelectedModel] = useLocalStorage<string>(
    CLAUDE_MODEL_STORAGE_KEY,
    DEFAULT_CLAUDE_MODEL
  )

  // Validate the stored model — reset to default if it no longer exists
  useEffect(() => {
    if (selectedModel && !getClaudeModelById(selectedModel)) {
      setSelectedModel(DEFAULT_CLAUDE_MODEL)
    }
  }, [selectedModel, setSelectedModel])

  // Wrap setter to ensure only valid model IDs are stored
  const setValidatedModel = useCallback(
    (modelId: string) => {
      const model = getClaudeModelById(modelId)
      setSelectedModel(model ? modelId : DEFAULT_CLAUDE_MODEL)
    },
    [setSelectedModel]
  )

  // Always return a valid model ID
  const validModel = getClaudeModelById(selectedModel)
    ? selectedModel
    : DEFAULT_CLAUDE_MODEL

  return {
    selectedModel: validModel,
    setSelectedModel: setValidatedModel,
  }
}
