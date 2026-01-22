/**
 * Shared types for the visual-edits package
 */

/**
 * Data captured when a user selects an element in the visual editor
 */
export interface HoverSelectionData {
  /** Generated ID from babel plugin (format: ComponentName:extension:line:column:nestingLevel) */
  elementId: string
  /** Element text content (truncated to 200 chars) */
  content: string
  /** CSS classes on the element */
  className: string
  /** HTML tag name (lowercase) */
  tagName: string
  /** Selection timestamp */
  timestamp: number
  /** CSS selector path to the element */
  path?: string
  /** File reference from data-at attribute (e.g., "File.tsx:37-39") */
  dataAt?: string | null
  /** Custom data-in attribute value */
  dataIn?: string | null
  /** Custom data-is attribute value */
  dataIs?: string | null
}

/**
 * Options for the useHoverSystem hook
 */
export interface HoverSystemOptions {
  /** Whether hover mode is enabled */
  enabled: boolean
  /** Sandbox ID for Pusher channel subscription */
  sandboxId?: string
}

/**
 * Return type for the useHoverSystem hook
 */
export interface HoverSystemResult {
  /** Currently hovered element (web only) */
  hoveredElement: HTMLElement | null
  /** Whether hover mode is currently enabled */
  isEnabled: boolean
}

/**
 * Options for the usePusherHoverSelection hook (web app side)
 */
export interface UsePusherHoverSelectionOptions {
  /** Sandbox ID for Pusher channel subscription */
  sandboxId: string | null
  /** Whether the hook is enabled */
  enabled?: boolean
  /** Callback when hover mode changes */
  onHoverModeChange?: (enabled: boolean) => void
}

/**
 * Return type for the usePusherHoverSelection hook
 */
export interface UsePusherHoverSelectionResult {
  /** Latest selection data received from the sandbox */
  latestSelection: HoverSelectionData | null
  /** Whether connected to Pusher */
  isConnected: boolean
  /** Clear the current selection */
  clearSelection: () => void
}

/**
 * Props for the EditButton component
 */
export interface EditButtonProps {
  /** Whether the parent is in a loading state */
  isLoading: boolean
  /** Current sandbox ID */
  sandboxId?: string | null
  /** Whether hover mode is enabled */
  isHoverModeEnabled: boolean
  /** Callback to toggle hover mode */
  onToggleHoverMode: (enabled: boolean) => void
}

/**
 * Props for the HoverToggle component (sandbox side)
 */
export interface HoverToggleProps {
  /** Whether hover mode is enabled */
  enabled: boolean
  /** Callback when toggle is changed */
  onToggle: (value: boolean) => void
}

/**
 * Props for the SelectionIndicator component
 */
export interface SelectionIndicatorProps {
  /** Selection data to display */
  selection: HoverSelectionData
  /** Callback to dismiss/clear the selection */
  onDismiss: () => void
  /** Optional function to get file edition reference */
  getFileEditionRef?: () => string | null
}

/**
 * Environment variable configuration for sandbox-side
 */
export interface SandboxEnvConfig {
  /** Pusher app key for sandbox */
  EXPO_PUBLIC_PUSHER_APP_KEY?: string
  /** Pusher cluster for sandbox */
  EXPO_PUBLIC_PUSHER_CLUSTER?: string
  /** API base URL for sending selection data */
  EXPO_PUBLIC_API_BASE_URL?: string
  /** Sandbox ID (can also come from URL params) */
  SANDBOX_ID?: string
}

/**
 * Environment variable configuration for web app side
 */
export interface WebEnvConfig {
  /** Pusher app key */
  NEXT_PUBLIC_PUSHER_APP_KEY: string
  /** Pusher cluster */
  NEXT_PUBLIC_PUSHER_CLUSTER: string
  /** Pusher app ID (server only) */
  PUSHER_APP_ID?: string
  /** Pusher app secret (server only) */
  PUSHER_APP_SECRET?: string
}

/**
 * Request body for hover-mode-toggle API
 */
export interface HoverModeToggleRequest {
  /** Sandbox ID */
  sandboxId: string
  /** Whether to enable or disable hover mode */
  enabled: boolean
}

/**
 * Request body for hover-selection API
 */
export interface HoverSelectionRequest {
  /** Sandbox ID */
  sandboxId: string
  /** Selection data from the sandbox */
  data: HoverSelectionData
}

/**
 * Pusher channel events
 */
export const PUSHER_EVENTS = {
  /** Event to toggle hover mode in sandbox */
  HOVER_MODE_TOGGLE: 'hover-mode-toggle',
  /** Event when element is selected in sandbox */
  HOVER_SELECTION: 'hover-selection',
} as const

/**
 * Get the Pusher channel name for a sandbox
 */
export function getSandboxChannelName(sandboxId: string): string {
  return `sandbox-${sandboxId}`
}
