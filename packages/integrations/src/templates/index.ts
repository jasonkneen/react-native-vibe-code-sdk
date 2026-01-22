/**
 * Integration Templates Module
 *
 * This module maps integration IDs to their template functions.
 * Templates generate Claude Code SKILL.md files that instruct the AI
 * on how to use each integration.
 */

import { anthropicChatTemplate } from './anthropic-chat'
import { openaiO3Template } from './openai-o3'
import { openaiDalle3Template } from './openai-dalle-3'
import { googleSearchTemplate } from './google-search'
import { openaiWhisperTemplate } from './openai-whisper'
import { exaPeopleSearchTemplate } from './exa-people-search'
import { INTEGRATIONS, isValidIntegrationId, getIntegration } from '../config'
import type { IntegrationTemplateFn } from '../config/types'

/**
 * Map of integration IDs to template functions
 */
export const integrationTemplates: Record<string, IntegrationTemplateFn> = {
  'anthropic-chat': anthropicChatTemplate,
  'openai-o3': openaiO3Template,
  'openai-dalle-3': openaiDalle3Template,
  'google-search': googleSearchTemplate,
  'openai-whisper': openaiWhisperTemplate,
  'exa-people-search': exaPeopleSearchTemplate,
}

// Validate that all templates have corresponding integration definitions in development
if (process.env.NODE_ENV === 'development') {
  const templateIds = Object.keys(integrationTemplates)
  const integrationIds = INTEGRATIONS.map(i => i.id)

  // Check for templates without integration definitions
  const templatesWithoutIntegrations = templateIds.filter(id => !isValidIntegrationId(id))
  if (templatesWithoutIntegrations.length > 0) {
    console.warn(
      '[Integrations] Warning: The following templates do not have corresponding integration definitions:',
      templatesWithoutIntegrations,
      '\nAdd them to config/integrations.ts'
    )
  }

  // Check for integrations without templates
  const integrationsWithoutTemplates = integrationIds.filter(id => !templateIds.includes(id))
  if (integrationsWithoutTemplates.length > 0) {
    console.warn(
      '[Integrations] Warning: The following integrations do not have corresponding templates:',
      integrationsWithoutTemplates,
      '\nCreate template files in templates/'
    )
  }

  if (templatesWithoutIntegrations.length === 0 && integrationsWithoutTemplates.length === 0) {
    console.log('[Integrations] ✓ All integrations and templates are in sync')
  }
}

/**
 * Get the template markdown for an integration
 *
 * @param integrationId - The integration ID
 * @param baseUrl - The base URL for API endpoints (e.g., production URL)
 * @returns The template markdown string or null if not found
 */
export function getIntegrationTemplate(integrationId: string, baseUrl: string): string | null {
  const templateFn = integrationTemplates[integrationId]
  if (!templateFn) {
    console.warn(`[Integrations] Template not found for integration ID: ${integrationId}`)
    return null
  }

  // Get the display name and description from config to ensure consistency
  const integration = getIntegration(integrationId)
  const displayName = integration?.name || integrationId
  const description = integration?.description || ''

  return templateFn(baseUrl, displayName, description)
}

/**
 * Get the file path where an integration's SKILL.md should be written
 *
 * @param integrationId - The integration ID
 * @returns The file path for the SKILL.md file
 */
export function getIntegrationFilePath(integrationId: string): string {
  return `.claude/skills/${integrationId}/SKILL.md`
}

/**
 * Get the directory path for an integration's skill files
 *
 * @param integrationId - The integration ID
 * @returns The directory path
 */
export function getIntegrationDirPath(integrationId: string): string {
  return `.claude/skills/${integrationId}`
}

// Re-export individual templates for direct imports
export { anthropicChatTemplate } from './anthropic-chat'
export { openaiO3Template } from './openai-o3'
export { openaiDalle3Template } from './openai-dalle-3'
export { googleSearchTemplate } from './google-search'
export { openaiWhisperTemplate } from './openai-whisper'
export { exaPeopleSearchTemplate } from './exa-people-search'

// Legacy exports for backwards compatibility
export const skillTemplates = integrationTemplates
export const getSkillTemplate = getIntegrationTemplate
export const getSkillFilePath = getIntegrationFilePath
