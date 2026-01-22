'use client'

/**
 * SelectionIndicator component
 *
 * Displays information about the currently selected element.
 * Shows tag name, classes, and file reference with a dismiss button.
 */

import type React from 'react'
import type { SelectionIndicatorProps, HoverSelectionData } from '../types'

/**
 * Extended props for SelectionIndicator with customizable styling
 */
export interface SelectionIndicatorExtendedProps extends SelectionIndicatorProps {
  /** Custom icon component for file */
  FileIconComponent?: React.ComponentType<{ className?: string }>
  /** Custom icon component for close button */
  CloseIconComponent?: React.ComponentType<{ className?: string }>
  /** Custom button component */
  ButtonComponent?: React.ComponentType<{
    onClick: () => void
    className?: string
    children: React.ReactNode
  }>
  /** Custom class name for the container */
  className?: string
}

/**
 * Get file edition reference from selection data
 */
export function getFileEditionRef(selection: HoverSelectionData): string | null {
  // Use dataAt if available (e.g., "CurrentToast.tsx:37-39")
  if (selection.dataAt) {
    return selection.dataAt
  }

  // Fallback to path-based reference if dataAt is not available
  const filename = selection.path || `${selection.tagName}.tsx`
  return `${filename}:${selection.elementId}`
}

/**
 * Display indicator for selected element.
 *
 * @example
 * ```tsx
 * import { SelectionIndicator } from '@react-native-vibe-code/visual-edits/web'
 * import { FileText, X } from 'lucide-react'
 * import { Button } from '@/components/ui/button'
 *
 * function ChatInput({ latestSelection, onDismiss }) {
 *   if (!latestSelection) return null
 *
 *   return (
 *     <SelectionIndicator
 *       selection={latestSelection}
 *       onDismiss={onDismiss}
 *       FileIconComponent={FileText}
 *       CloseIconComponent={X}
 *       ButtonComponent={Button}
 *     />
 *   )
 * }
 * ```
 */
export function SelectionIndicator({
  selection,
  onDismiss,
  getFileEditionRef: customGetFileEditionRef,
  FileIconComponent,
  CloseIconComponent,
  ButtonComponent,
  className = '',
}: SelectionIndicatorExtendedProps) {
  const fileRef = customGetFileEditionRef?.() ?? getFileEditionRef(selection)

  return (
    <div
      className={`
        mb-3 p-3 bg-blue-50 dark:bg-blue-950/30
        border border-blue-200 dark:border-blue-800 rounded-lg
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {FileIconComponent && (
            <FileIconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
          <div className="text-sm">
            <div className="font-medium text-blue-800 dark:text-blue-200">
              Selected: {selection.tagName}
            </div>
          </div>
        </div>

        {ButtonComponent ? (
          <ButtonComponent
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            {CloseIconComponent && <CloseIconComponent className="h-3 w-3" />}
          </ButtonComponent>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            className="h-6 w-6 p-0 flex items-center justify-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded"
          >
            {CloseIconComponent ? (
              <CloseIconComponent className="h-3 w-3" />
            ) : (
              <span className="text-lg leading-none">&times;</span>
            )}
          </button>
        )}
      </div>

      {selection.className && (
        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
          Classes: {selection.className}
        </div>
      )}
    </div>
  )
}
