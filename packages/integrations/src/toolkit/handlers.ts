/**
 * Toolkit API Handlers
 *
 * This module provides handler utilities for creating toolkit API routes.
 * These handlers wrap common patterns for AI and external service integrations.
 */

import { getCorsHeaders } from './cors'
import type {
  ToolkitLLMRequest,
  ToolkitLLMResponse,
  ToolkitSearchRequest,
  ToolkitSearchResponse,
  ToolkitImageRequest,
  ToolkitImageResponse,
  ToolkitSTTRequest,
  ToolkitSTTResponse,
  ToolkitExaSearchRequest,
  ToolkitExaSearchResponse,
} from '../config/types'

/**
 * Response helper for JSON responses with CORS headers
 */
export function jsonResponse<T>(
  data: T,
  request?: Request,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request),
    },
  })
}

/**
 * Error response helper
 */
export function errorResponse(
  message: string,
  request?: Request,
  status: number = 500
): Response {
  return jsonResponse({ error: message }, request, status)
}

/**
 * Validate that required environment variables are set
 */
export function validateEnvVar(
  name: string,
  ...alternateNames: string[]
): string | null {
  const value = process.env[name]
  if (value) return value

  for (const alternateName of alternateNames) {
    const alternateValue = process.env[alternateName]
    if (alternateValue) return alternateValue
  }

  return null
}

/**
 * LLM Handler Configuration
 */
export interface LLMHandlerConfig {
  /** Function to create AI response */
  generateResponse: (messages: ToolkitLLMRequest['messages']) => Promise<string>
  /** Environment variable name for API key (for validation) */
  envVarName?: string
}

/**
 * Create an LLM API handler
 *
 * @example
 * ```typescript
 * import { createLLMHandler } from '@react-native-vibe-code/integrations/toolkit'
 * import { generateText } from 'ai'
 * import { createAnthropic } from '@ai-sdk/anthropic'
 *
 * const handler = createLLMHandler({
 *   envVarName: 'ANTHROPIC_API_KEY',
 *   generateResponse: async (messages) => {
 *     const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
 *     const { text } = await generateText({
 *       model: anthropic('claude-3-5-haiku-20241022'),
 *       messages,
 *     })
 *     return text
 *   }
 * })
 *
 * export async function POST(request: Request) {
 *   return handler(request)
 * }
 * ```
 */
export function createLLMHandler(config: LLMHandlerConfig) {
  return async (request: Request): Promise<Response> => {
    try {
      const body = await request.json() as ToolkitLLMRequest

      if (!body.messages || !Array.isArray(body.messages)) {
        return errorResponse('Invalid request: messages array is required', request, 400)
      }

      if (config.envVarName && !validateEnvVar(config.envVarName)) {
        return errorResponse(`${config.envVarName} not configured`, request, 500)
      }

      const completion = await config.generateResponse(body.messages)

      const response: ToolkitLLMResponse = { completion }
      return jsonResponse(response, request)
    } catch (error: any) {
      console.error('[Toolkit LLM] Error:', error)
      return errorResponse(error?.message || 'Internal server error', request, 500)
    }
  }
}

/**
 * Search Handler Configuration
 */
export interface SearchHandlerConfig {
  /** Function to perform search */
  performSearch: (query: string, options: Omit<ToolkitSearchRequest, 'query'>) => Promise<ToolkitSearchResponse>
  /** Environment variable name for API key */
  envVarName?: string
  /** Alternative environment variable names */
  alternateEnvVars?: string[]
}

/**
 * Create a Search API handler
 */
export function createSearchHandler(config: SearchHandlerConfig) {
  return async (request: Request): Promise<Response> => {
    try {
      const body = await request.json() as ToolkitSearchRequest

      if (!body.query || typeof body.query !== 'string') {
        return errorResponse('Invalid request: query string is required', request, 400)
      }

      if (config.envVarName) {
        const apiKey = validateEnvVar(config.envVarName, ...(config.alternateEnvVars || []))
        if (!apiKey) {
          return errorResponse(`API key not configured`, request, 500)
        }
      }

      const results = await config.performSearch(body.query, {
        gl: body.gl,
        hl: body.hl,
        num: body.num,
      })

      return jsonResponse(results, request)
    } catch (error: any) {
      console.error('[Toolkit Search] Error:', error)
      return errorResponse(error?.message || 'Search failed', request, 500)
    }
  }
}

/**
 * Image Generation Handler Configuration
 */
export interface ImageHandlerConfig {
  /** Function to generate image */
  generateImage: (prompt: string, size?: string) => Promise<{ base64Data: string; mimeType: string }>
  /** Environment variable name for API key */
  envVarName?: string
}

/**
 * Create an Image Generation API handler
 */
export function createImageHandler(config: ImageHandlerConfig) {
  return async (request: Request): Promise<Response> => {
    try {
      const body = await request.json() as ToolkitImageRequest

      if (!body.prompt || typeof body.prompt !== 'string') {
        return errorResponse('Invalid request: prompt string is required', request, 400)
      }

      if (config.envVarName && !validateEnvVar(config.envVarName)) {
        return errorResponse(`${config.envVarName} not configured`, request, 500)
      }

      const size = body.size || '1024x1024'
      const image = await config.generateImage(body.prompt, size)

      const response: ToolkitImageResponse = {
        image,
        size,
      }
      return jsonResponse(response, request)
    } catch (error: any) {
      console.error('[Toolkit Images] Error:', error)
      return errorResponse(error?.message || 'Image generation failed', request, 500)
    }
  }
}

/**
 * STT Handler Configuration
 */
export interface STTHandlerConfig {
  /** Function to transcribe audio */
  transcribe: (audioFile: File, language?: string) => Promise<{ text: string; language: string }>
  /** Environment variable name for API key */
  envVarName?: string
  /** Maximum file size in bytes (default: 25MB) */
  maxFileSize?: number
}

/**
 * Create a Speech-to-Text API handler
 */
export function createSTTHandler(config: STTHandlerConfig) {
  return async (request: Request): Promise<Response> => {
    try {
      const formData = await request.formData()
      const audioFile = formData.get('audio')

      if (!audioFile || !(audioFile instanceof File)) {
        return errorResponse('Invalid request: audio file is required', request, 400)
      }

      if (config.envVarName && !validateEnvVar(config.envVarName)) {
        return errorResponse(`${config.envVarName} not configured`, request, 500)
      }

      const maxSize = config.maxFileSize || 25 * 1024 * 1024
      if (audioFile.size > maxSize) {
        return errorResponse(`Audio file too large. Maximum size is ${maxSize / 1024 / 1024}MB.`, request, 400)
      }

      const language = formData.get('language') as string | null

      const result = await config.transcribe(audioFile, language || undefined)

      const response: ToolkitSTTResponse = result
      return jsonResponse(response, request)
    } catch (error: any) {
      console.error('[Toolkit STT] Error:', error)
      return errorResponse(error?.message || 'Transcription failed', request, 500)
    }
  }
}
