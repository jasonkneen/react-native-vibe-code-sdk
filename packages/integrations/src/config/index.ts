/**
 * Integrations Configuration Module
 *
 * Exports all configuration types and utilities for managing integrations.
 */

// Types
export type {
  IntegrationConfig,
  IntegrationCategory,
  IntegrationTemplateFn,
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
  // Legacy aliases
  AISkill,
  SkillConfig,
} from './types'

// Configuration and utilities
export {
  INTEGRATIONS,
  INTEGRATION_ID_MAP,
  isValidIntegrationId,
  getIntegration,
  getIntegrations,
  getIntegrationsByCategory,
  validateIntegrationIds,
  // Legacy aliases
  SKILL_CONFIGS,
  SKILL_ID_MAP,
  isValidSkillId,
  getSkillConfig,
  getSkillConfigs,
  validateSkillIds,
} from './integrations'
