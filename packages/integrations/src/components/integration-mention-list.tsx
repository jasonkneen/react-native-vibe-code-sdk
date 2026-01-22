'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { IntegrationConfig } from '../config/types'

export interface IntegrationMentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

interface IntegrationMentionListProps {
  items: IntegrationConfig[]
  command: (item: IntegrationConfig) => void
  /** Optional custom class name for the container */
  className?: string
  /** Optional header text (default: "Integrations") */
  header?: string
}

/**
 * IntegrationMentionList - Dropdown list for selecting integrations
 *
 * Used with TipTap's suggestion system to display available integrations
 * when users type "/" in the editor.
 *
 * Features:
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Mouse hover selection
 * - Icon + name + description display
 */
export const IntegrationMentionList = forwardRef<IntegrationMentionListRef, IntegrationMentionListProps>(
  ({ items, command, className, header = 'Integrations' }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) {
        command(item)
      }
    }

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length)
    }

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length)
    }

    const enterHandler = () => {
      selectItem(selectedIndex)
    }

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          upHandler()
          return true
        }

        if (event.key === 'ArrowDown') {
          downHandler()
          return true
        }

        if (event.key === 'Enter') {
          enterHandler()
          return true
        }

        return false
      },
    }))

    if (items.length === 0) {
      return null
    }

    return (
      <div className={className || "w-80 max-h-80 overflow-y-auto bg-background border border-border rounded-lg shadow-lg z-50"}>
        <div className="p-2">
          <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
            {header}
          </div>
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => selectItem(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-950/30'
                    : 'hover:bg-muted'
                ].join(' ')}
              >
                <div className={[
                  'flex items-center justify-center w-8 h-8 rounded-md',
                  index === selectedIndex
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-muted'
                ].join(' ')}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }
)

IntegrationMentionList.displayName = 'IntegrationMentionList'
