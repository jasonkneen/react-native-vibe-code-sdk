/**
 * Integration Types
 *
 * Core type definitions for the integrations system.
 */

import type { LucideIcon } from 'lucide-react'

/**
 * Configuration for an integration/skill
 */
export interface IntegrationConfig {
  /** Unique identifier used in code and file paths (kebab-case) */
  id: string
  /** Display name shown in UI */
  name: string
  /** Description shown in integration picker */
  description: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Icon name for serialization */
  iconName: string
  /** Category for grouping */
  category?: IntegrationCategory
  /** API endpoint path (relative to base URL) */
  endpoint?: string
  /** Environment variable required for this integration */
  requiredEnvVar?: string
}

/**
 * Category types for organizing integrations
 */
export type IntegrationCategory =
  | 'ai'           // AI/ML integrations (Claude, GPT, etc.)
  | 'media'        // Media processing (images, audio, video)
  | 'search'       // Search integrations (Google, Exa, etc.)
  | 'data'         // Data integrations (databases, APIs)
  | 'communication'// Communication (email, SMS, etc.)

/**
 * Template function signature for generating skill markdown
 */
export type IntegrationTemplateFn = (
  baseUrl: string,
  displayName: string,
  description: string
) => string

/**
 * Request/response types for toolkit endpoints
 */
export interface ToolkitLLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
}

export interface ToolkitLLMResponse {
  completion: string
}

export interface ToolkitSearchRequest {
  query: string
  gl?: string  // Geographic location
  hl?: string  // Language
  num?: number // Number of results
}

export interface ToolkitSearchResponse {
  searchMetadata?: {
    status: string
    created_at: string
    processed_at: string
    total_time_taken: number
  }
  searchInformation?: {
    total_results: string
    time_taken_displayed: number
  }
  organicResults: Array<{
    position: number
    title: string
    link: string
    displayed_link: string
    snippet: string
    snippet_highlighted_words?: string[]
  }>
  knowledgeGraph?: {
    title: string
    type: string
    description: string
    source?: { name: string; link: string }
    image?: string
  }
  relatedSearches?: Array<{ query: string; link: string }>
  localResults?: Array<{
    position: number
    title: string
    address: string
    phone?: string
    rating?: number
  }>
  shoppingResults?: Array<{
    position: number
    title: string
    link: string
    price: string
    source: string
  }>
}

export interface ToolkitImageRequest {
  prompt: string
  size?: '1024x1024' | '1024x1792' | '1792x1024'
}

export interface ToolkitImageResponse {
  image: {
    base64Data: string
    mimeType: string
  }
  size: string
}

export interface ToolkitSTTRequest {
  audio: File | Blob
  language?: string
}

export interface ToolkitSTTResponse {
  text: string
  language: string
}

export interface ToolkitExaSearchRequest {
  query: string
  numResults?: number
}

export interface ToolkitExaSearchResponse {
  results: Array<{
    url: string
    title: string
    author?: string
    publishedDate?: string
  }>
  requestId: string
}

/**
 * Legacy type alias for backwards compatibility
 */
export type AISkill = IntegrationConfig
export type SkillConfig = IntegrationConfig
