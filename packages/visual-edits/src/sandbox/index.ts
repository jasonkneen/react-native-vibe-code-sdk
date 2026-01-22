/**
 * Sandbox-side exports for visual-edits package.
 *
 * These exports are used in the sandbox environment (Expo app)
 * to enable visual element selection and editing.
 */

export { HoverToggle } from './HoverToggle'
export type { HoverToggleWithThemeProps, ThemeColorHook } from './HoverToggle'

export { useHoverSystem } from './useHoverSystem'
export { useHoverWithChannel } from './useHoverWithChannel'
export type { UseHoverWithChannelResult } from './useHoverWithChannel'

// Re-export types for convenience
export type {
  HoverSelectionData,
  HoverSystemOptions,
  HoverSystemResult,
  HoverToggleProps,
  SandboxEnvConfig,
} from '../types'
