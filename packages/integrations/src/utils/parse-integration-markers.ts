/**
 * Integration Marker Utilities
 *
 * Utilities for parsing and rendering integration markers in text.
 * Markers follow the format: {{skill:integrationId}}
 */

import { getIntegration } from '../config'
import type { IntegrationConfig } from '../config/types'

/**
 * Regex pattern to match integration markers
 */
export const INTEGRATION_MARKER_PATTERN = /\{\{skill:([a-z0-9-]+)\}\}/g

/**
 * Parsed integration marker
 */
export interface ParsedIntegrationMarker {
  /** The full marker string (e.g., "{{skill:anthropic-chat}}") */
  marker: string
  /** The integration ID (e.g., "anthropic-chat") */
  integrationId: string
  /** Start index in the original text */
  startIndex: number
  /** End index in the original text */
  endIndex: number
  /** The resolved integration config, if found */
  integration?: IntegrationConfig
}

/**
 * Parse integration markers from text
 *
 * @param text - Text containing integration markers
 * @returns Array of parsed markers with their positions
 *
 * @example
 * ```typescript
 * import { parseIntegrationMarkers } from '@react-native-vibe-code/integrations/utils'
 *
 * const text = "Use {{skill:anthropic-chat}} for AI"
 * const markers = parseIntegrationMarkers(text)
 * // Returns: [{
 * //   marker: "{{skill:anthropic-chat}}",
 * //   integrationId: "anthropic-chat",
 * //   startIndex: 4,
 * //   endIndex: 28,
 * //   integration: { id: "anthropic-chat", name: "AI Chat (Claude)", ... }
 * // }]
 * ```
 */
export function parseIntegrationMarkers(text: string): ParsedIntegrationMarker[] {
  const markers: ParsedIntegrationMarker[] = []
  let match: RegExpExecArray | null

  // Reset regex state
  INTEGRATION_MARKER_PATTERN.lastIndex = 0

  while ((match = INTEGRATION_MARKER_PATTERN.exec(text)) !== null) {
    const [marker, integrationId] = match
    const integration = getIntegration(integrationId)

    markers.push({
      marker,
      integrationId,
      startIndex: match.index,
      endIndex: match.index + marker.length,
      integration,
    })
  }

  return markers
}

/**
 * Extract integration IDs from text
 *
 * @param text - Text containing integration markers
 * @returns Array of unique integration IDs
 *
 * @example
 * ```typescript
 * import { extractIntegrationIds } from '@react-native-vibe-code/integrations/utils'
 *
 * const text = "Use {{skill:anthropic-chat}} and {{skill:google-search}}"
 * const ids = extractIntegrationIds(text)
 * // Returns: ["anthropic-chat", "google-search"]
 * ```
 */
export function extractIntegrationIds(text: string): string[] {
  const markers = parseIntegrationMarkers(text)
  const ids = markers.map(m => m.integrationId)
  return [...new Set(ids)] // Unique IDs
}

/**
 * Check if text contains integration markers
 *
 * @param text - Text to check
 * @returns True if the text contains any integration markers
 */
export function hasIntegrationMarkers(text: string): boolean {
  INTEGRATION_MARKER_PATTERN.lastIndex = 0
  return INTEGRATION_MARKER_PATTERN.test(text)
}

/**
 * Remove integration markers from text
 *
 * @param text - Text containing integration markers
 * @returns Text with markers removed
 *
 * @example
 * ```typescript
 * import { removeIntegrationMarkers } from '@react-native-vibe-code/integrations/utils'
 *
 * const text = "Use {{skill:anthropic-chat}} for AI"
 * const clean = removeIntegrationMarkers(text)
 * // Returns: "Use  for AI"
 * ```
 */
export function removeIntegrationMarkers(text: string): string {
  return text.replace(INTEGRATION_MARKER_PATTERN, '')
}

/**
 * Replace integration markers with custom text
 *
 * @param text - Text containing integration markers
 * @param replacer - Function to generate replacement text
 * @returns Text with markers replaced
 *
 * @example
 * ```typescript
 * import { replaceIntegrationMarkers } from '@react-native-vibe-code/integrations/utils'
 *
 * const text = "Use {{skill:anthropic-chat}} for AI"
 * const replaced = replaceIntegrationMarkers(text, (id, integration) => {
 *   return `[${integration?.name || id}]`
 * })
 * // Returns: "Use [AI Chat (Claude)] for AI"
 * ```
 */
export function replaceIntegrationMarkers(
  text: string,
  replacer: (integrationId: string, integration?: IntegrationConfig) => string
): string {
  return text.replace(INTEGRATION_MARKER_PATTERN, (match, integrationId) => {
    const integration = getIntegration(integrationId)
    return replacer(integrationId, integration)
  })
}

/**
 * Split text into segments with and without integration markers
 *
 * Useful for rendering text with inline integration chips.
 *
 * @param text - Text containing integration markers
 * @returns Array of text segments and integration markers
 *
 * @example
 * ```typescript
 * import { splitByIntegrationMarkers } from '@react-native-vibe-code/integrations/utils'
 *
 * const text = "Use {{skill:anthropic-chat}} for AI"
 * const segments = splitByIntegrationMarkers(text)
 * // Returns: [
 * //   { type: 'text', content: 'Use ' },
 * //   { type: 'integration', integrationId: 'anthropic-chat', integration: {...} },
 * //   { type: 'text', content: ' for AI' }
 * // ]
 * ```
 */
export function splitByIntegrationMarkers(text: string): Array<
  | { type: 'text'; content: string }
  | { type: 'integration'; integrationId: string; integration?: IntegrationConfig }
> {
  const segments: Array<
    | { type: 'text'; content: string }
    | { type: 'integration'; integrationId: string; integration?: IntegrationConfig }
  > = []

  const markers = parseIntegrationMarkers(text)

  if (markers.length === 0) {
    if (text) {
      segments.push({ type: 'text', content: text })
    }
    return segments
  }

  let lastIndex = 0

  for (const marker of markers) {
    // Add text before this marker
    if (marker.startIndex > lastIndex) {
      const textContent = text.slice(lastIndex, marker.startIndex)
      if (textContent) {
        segments.push({ type: 'text', content: textContent })
      }
    }

    // Add the integration marker
    segments.push({
      type: 'integration',
      integrationId: marker.integrationId,
      integration: marker.integration,
    })

    lastIndex = marker.endIndex
  }

  // Add remaining text after last marker
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex)
    if (textContent) {
      segments.push({ type: 'text', content: textContent })
    }
  }

  return segments
}
