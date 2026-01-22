/**
 * Toolkit Module
 *
 * Utilities for creating toolkit API routes that power integrations.
 * These utilities handle CORS, validation, and response formatting.
 */

// CORS utilities
export {
  getCorsHeaders,
  corsHeaders,
  handleCorsOptions,
} from './cors'

// Handler utilities
export {
  jsonResponse,
  errorResponse,
  validateEnvVar,
  createLLMHandler,
  createSearchHandler,
  createImageHandler,
  createSTTHandler,
  type LLMHandlerConfig,
  type SearchHandlerConfig,
  type ImageHandlerConfig,
  type STTHandlerConfig,
} from './handlers'
