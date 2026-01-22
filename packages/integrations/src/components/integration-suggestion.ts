import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { IntegrationMentionList, type IntegrationMentionListRef } from './integration-mention-list'
import { INTEGRATIONS, type IntegrationConfig } from '../config'
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'

/**
 * Create an integration suggestion configuration for TipTap
 *
 * @param integrations - Array of integrations to show in the suggestion dropdown
 * @param triggerChar - Character that triggers the suggestion (default: '/')
 * @returns Suggestion configuration for TipTap Mention extension
 *
 * @example
 * ```typescript
 * import { createIntegrationSuggestion, INTEGRATIONS } from '@react-native-vibe-code/integrations'
 *
 * const suggestion = createIntegrationSuggestion(INTEGRATIONS, '/')
 *
 * // Use with TipTap Mention extension
 * Mention.configure({
 *   suggestion,
 * })
 * ```
 */
export function createIntegrationSuggestion(
  integrations: IntegrationConfig[] = INTEGRATIONS,
  triggerChar: string = '/'
): Omit<SuggestionOptions<IntegrationConfig>, 'editor'> {
  return {
    char: triggerChar,
    allowSpaces: false,
    startOfLine: false,

    items: ({ query }): IntegrationConfig[] => {
      return integrations.filter(integration =>
        integration.name.toLowerCase().includes(query.toLowerCase()) ||
        integration.description.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    },

    render: () => {
      let component: ReactRenderer<IntegrationMentionListRef> | null = null
      let popup: TippyInstance[] | null = null

      return {
        onStart: (props: SuggestionProps<IntegrationConfig>) => {
          component = new ReactRenderer(IntegrationMentionList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) {
            return
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate: (props: SuggestionProps<IntegrationConfig>) => {
          component?.updateProps(props)

          if (!props.clientRect) {
            return
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },

        onKeyDown: (props: { event: KeyboardEvent }): boolean => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }

          return component?.ref?.onKeyDown(props) ?? false
        },

        onExit: () => {
          popup?.[0]?.destroy()
          component?.destroy()
        },
      }
    },
  }
}

/**
 * Default integration suggestion with all available integrations
 * Uses '/' as the trigger character
 */
export const integrationSuggestion = createIntegrationSuggestion(INTEGRATIONS, '/')
