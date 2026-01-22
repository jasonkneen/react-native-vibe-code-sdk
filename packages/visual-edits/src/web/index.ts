/**
 * Web application exports for visual-edits package.
 *
 * These exports are used in the Next.js web application
 * to display selection UI and control hover mode.
 */

export { EditButton } from './EditButton'
export type { EditButtonExtendedProps } from './EditButton'

export { SelectionIndicator, getFileEditionRef } from './SelectionIndicator'
export type { SelectionIndicatorExtendedProps } from './SelectionIndicator'

export { usePusherHoverSelection } from './usePusherHoverSelection'

// Re-export types for convenience
export type {
  HoverSelectionData,
  EditButtonProps,
  SelectionIndicatorProps,
  UsePusherHoverSelectionOptions,
  UsePusherHoverSelectionResult,
  WebEnvConfig,
} from '../types'
