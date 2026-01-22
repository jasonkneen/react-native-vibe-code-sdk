/**
 * API route handler exports for visual-edits package.
 *
 * These exports provide factory functions for creating Next.js API routes
 * that handle hover mode toggle and selection events.
 */

export {
  createHoverModeToggleHandler,
  handleOptions as handleHoverModeToggleOptions,
} from './hover-mode-toggle'
export type { CreateHoverModeToggleHandlerOptions } from './hover-mode-toggle'

export {
  createHoverSelectionHandler,
  handleOptions as handleHoverSelectionOptions,
} from './hover-selection'
export type { CreateHoverSelectionHandlerOptions } from './hover-selection'

// Re-export types for convenience
export type {
  HoverModeToggleRequest,
  HoverSelectionRequest,
  HoverSelectionData,
} from '../types'

export { PUSHER_EVENTS, getSandboxChannelName } from '../types'
