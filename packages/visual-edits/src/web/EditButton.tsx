'use client'

/**
 * EditButton component
 *
 * Button to toggle hover inspector mode from the web interface.
 * When clicked, sends a Pusher event to the sandbox to enable/disable
 * visual element selection.
 */

import type React from 'react'
import type { EditButtonProps } from '../types'

/**
 * Extended props for EditButton with customizable styling
 */
export interface EditButtonExtendedProps extends EditButtonProps {
  /** Custom button component to use instead of default */
  ButtonComponent?: React.ComponentType<{
    type: 'button'
    disabled: boolean
    onClick: (e: React.MouseEvent) => void
    title: string
    className?: string
    children: React.ReactNode
  }>
  /** Custom icon component */
  IconComponent?: React.ComponentType<{ className?: string }>
  /** Custom class name for the button */
  className?: string
  /** Label text (default: "edit") */
  label?: string
  /** API endpoint for hover mode toggle (default: "/api/hover-mode-toggle") */
  apiEndpoint?: string
}

/**
 * Button to toggle hover inspector mode.
 *
 * @example
 * ```tsx
 * import { EditButton } from '@react-native-vibe-code/visual-edits/web'
 * import { Button } from '@/components/ui/button'
 * import { MousePointerClick } from 'lucide-react'
 *
 * function ChatInput({ sandboxId, isLoading }) {
 *   const [isHoverModeEnabled, setIsHoverModeEnabled] = useState(false)
 *
 *   return (
 *     <EditButton
 *       isLoading={isLoading}
 *       sandboxId={sandboxId}
 *       isHoverModeEnabled={isHoverModeEnabled}
 *       onToggleHoverMode={setIsHoverModeEnabled}
 *       ButtonComponent={Button}
 *       IconComponent={MousePointerClick}
 *     />
 *   )
 * }
 * ```
 */
export function EditButton({
  isLoading,
  sandboxId,
  isHoverModeEnabled,
  onToggleHoverMode,
  ButtonComponent,
  IconComponent,
  className = '',
  label = 'edit',
  apiEndpoint = '/api/hover-mode-toggle',
}: EditButtonExtendedProps) {
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    const newState = !isHoverModeEnabled
    onToggleHoverMode(newState)

    console.log(
      `[EditButton] Hover mode ${newState ? 'enabled' : 'disabled'} for sandbox:`,
      sandboxId,
    )

    // Trigger hover mode change via API
    if (sandboxId) {
      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sandboxId,
            enabled: newState,
          }),
        })

        if (!response.ok) {
          console.error('[EditButton] API response not OK:', response.status)
        } else {
          console.log('[EditButton] Hover mode toggle sent successfully')
        }
      } catch (error) {
        console.error('[EditButton] Failed to toggle hover mode:', error)
      }
    }
  }

  const title = sandboxId
    ? isHoverModeEnabled
      ? 'Disable hover inspector'
      : 'Enable hover inspector'
    : 'Sandbox not ready'

  // Use custom button if provided, otherwise render a basic button
  if (ButtonComponent) {
    return (
      <ButtonComponent
        type="button"
        disabled={isLoading || !sandboxId}
        onClick={handleClick}
        title={title}
        className={className}
      >
        <div className="flex flex-row justify-center items-center space-x-2">
          {IconComponent && (
            <IconComponent
              className={`h-5 w-5 ${isHoverModeEnabled ? 'text-white' : ''}`}
            />
          )}
          <span className={isHoverModeEnabled ? 'text-white' : ''}>{label}</span>
        </div>
      </ButtonComponent>
    )
  }

  // Default button rendering
  return (
    <button
      type="button"
      disabled={isLoading || !sandboxId}
      onClick={handleClick}
      title={title}
      className={`
        inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl h-10
        text-sm font-medium transition-colors
        ${isLoading || !sandboxId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${
          isHoverModeEnabled
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'border border-gray-300 hover:bg-gray-100'
        }
        ${className}
      `}
    >
      {IconComponent && (
        <IconComponent className={`h-5 w-5 ${isHoverModeEnabled ? 'text-white' : ''}`} />
      )}
      <span>{label}</span>
    </button>
  )
}
