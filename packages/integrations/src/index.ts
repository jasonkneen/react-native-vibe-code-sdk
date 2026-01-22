/**
 * @react-native-vibe-code/integrations
 *
 * A comprehensive package for managing AI and external service integrations
 * in React Native Vibe Code. This package provides configuration, templates, UI components,
 * and utilities for integrating skills into sandbox environments.
 *
 * Server-only exports from main entry point.
 * For client components, import from '@react-native-vibe-code/integrations/components'
 * For hooks, import from '@react-native-vibe-code/integrations/hooks'
 *
 * @example
 * ```typescript
 * // Import configuration
 * import { INTEGRATIONS, getIntegration } from '@react-native-vibe-code/integrations/config'
 *
 * // Import templates
 * import { getIntegrationTemplate } from '@react-native-vibe-code/integrations/templates'
 *
 * // Import components (client-side)
 * import { IntegrationEditor } from '@react-native-vibe-code/integrations/components'
 *
 * // Import toolkit utilities
 * import { getCorsHeaders, createLLMHandler } from '@react-native-vibe-code/integrations/toolkit'
 *
 * // Import hooks (client-side)
 * import { writeIntegrationsToSandbox } from '@react-native-vibe-code/integrations/hooks'
 *
 * // Import utilities
 * import { parseIntegrationMarkers } from '@react-native-vibe-code/integrations/utils'
 * ```
 */

// Re-export server-side modules
export * from './config'
export * from './templates'
export * from './toolkit'
export * from './utils'
