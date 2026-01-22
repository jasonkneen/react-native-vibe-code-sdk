'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react'
import type { IntegrationConfig } from '../config/types'
import { INTEGRATIONS } from '../config'
import { createIntegrationSuggestion } from './integration-suggestion'

export interface IntegrationEditorRef {
  focus: () => void
  clearContent: () => void
  getPlainText: () => string
  getSelectedIntegrations: () => IntegrationConfig[]
  setContent: (content: string) => void
}

interface IntegrationEditorProps {
  placeholder?: string
  disabled?: boolean
  onContentChange?: (text: string, integrations: IntegrationConfig[]) => void
  onSubmit?: () => void
  className?: string
  disableEnterSubmit?: boolean
  /** Custom integrations list (defaults to all INTEGRATIONS) */
  integrations?: IntegrationConfig[]
  /** Character that triggers the integration picker (default: '/') */
  triggerChar?: string
}

/**
 * IntegrationEditor - TipTap-based editor with integration mention support
 *
 * This editor allows users to type "/" to trigger an integration picker,
 * which inserts integration mentions into the text. The mentions are
 * serialized as `{{skill:integrationId}}` markers in the plain text.
 *
 * @example
 * ```tsx
 * import { IntegrationEditor, type IntegrationEditorRef } from '@react-native-vibe-code/integrations/components'
 *
 * function ChatInput() {
 *   const editorRef = useRef<IntegrationEditorRef>(null)
 *   const [integrations, setIntegrations] = useState<IntegrationConfig[]>([])
 *
 *   const handleSubmit = () => {
 *     const text = editorRef.current?.getPlainText()
 *     const selectedIntegrations = editorRef.current?.getSelectedIntegrations()
 *
 *     // Send to API
 *     sendMessage(text, selectedIntegrations?.map(i => i.id))
 *
 *     editorRef.current?.clearContent()
 *   }
 *
 *   return (
 *     <IntegrationEditor
 *       ref={editorRef}
 *       placeholder="Describe what you want to build..."
 *       onSubmit={handleSubmit}
 *       onContentChange={(text, integrations) => setIntegrations(integrations)}
 *     />
 *   )
 * }
 * ```
 */
export const IntegrationEditor = forwardRef<IntegrationEditorRef, IntegrationEditorProps>(
  ({
    placeholder,
    disabled,
    onContentChange,
    onSubmit,
    className,
    disableEnterSubmit = false,
    integrations = INTEGRATIONS,
    triggerChar = '/',
  }, ref) => {
    const [isSuggestionActive, setIsSuggestionActive] = useState(false)

    // Create custom integration mention extension
    const IntegrationMention = Mention.extend({
      name: 'integrationMention',

      addOptions() {
        return {
          ...this.parent?.(),
          HTMLAttributes: {
            class: 'integration-mention',
          },
        }
      },

      addAttributes() {
        return {
          id: {
            default: null,
            parseHTML: element => element.getAttribute('data-id'),
            renderHTML: attributes => {
              if (!attributes.id) return {}
              return { 'data-id': attributes.id }
            },
          },
          label: {
            default: null,
            parseHTML: element => element.getAttribute('data-label'),
            renderHTML: attributes => {
              if (!attributes.label) return {}
              return { 'data-label': attributes.label }
            },
          },
          iconName: {
            default: null,
            parseHTML: element => element.getAttribute('data-icon'),
            renderHTML: attributes => {
              if (!attributes.iconName) return {}
              return { 'data-icon': attributes.iconName }
            },
          },
        }
      },

      parseHTML() {
        return [
          {
            tag: `span[data-type="${this.name}"]`,
          },
        ]
      },

      renderHTML({ node, HTMLAttributes }) {
        return [
          'span',
          {
            'data-type': this.name,
            'class': 'integration-mention',
            'data-id': node.attrs.id,
            'data-label': node.attrs.label,
            'data-icon': node.attrs.iconName,
            ...HTMLAttributes,
          },
          `${node.attrs.label}`,
        ]
      },

      addKeyboardShortcuts() {
        return {
          Backspace: () =>
            this.editor.commands.command(({ tr, state }) => {
              let isMention = false
              const { selection } = state
              const { empty, anchor } = selection

              if (!empty) {
                return false
              }

              state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
                if (node.type.name === this.name) {
                  isMention = true
                  tr.insertText('', pos, pos + node.nodeSize)
                  return false
                }
              })

              return isMention
            }),
        }
      },
    }).configure({
      suggestion: {
        ...createIntegrationSuggestion(integrations, triggerChar),
        command: ({ editor, range, props }) => {
          const integrationProps = props as unknown as IntegrationConfig
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'integrationMention',
                attrs: {
                  id: integrationProps.id,
                  label: integrationProps.name,
                  iconName: integrationProps.iconName,
                },
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run()

          // Dispatch event for external listeners
          window.dispatchEvent(new CustomEvent('integration-selected', { detail: props }))
        },
        render: () => {
          const baseRender = createIntegrationSuggestion(integrations, triggerChar).render?.() ?? {}
          return {
            onStart: (props: any) => {
              setIsSuggestionActive(true)
              if ('onStart' in baseRender && typeof baseRender.onStart === 'function') {
                baseRender.onStart(props)
              }
            },
            onUpdate: (props: any) => {
              if ('onUpdate' in baseRender && typeof baseRender.onUpdate === 'function') {
                baseRender.onUpdate(props)
              }
            },
            onKeyDown: (props: any) => {
              if ('onKeyDown' in baseRender && typeof baseRender.onKeyDown === 'function') {
                return baseRender.onKeyDown(props)
              }
              return false
            },
            onExit: (props: any) => {
              setIsSuggestionActive(false)
              if ('onExit' in baseRender && typeof baseRender.onExit === 'function') {
                baseRender.onExit(props)
              }
            },
          }
        },
      },
    })

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Placeholder.configure({
          placeholder: placeholder || '',
          emptyEditorClass: 'is-editor-empty',
        }),
        IntegrationMention,
      ],
      editorProps: {
        attributes: {
          class: 'integration-editor-content focus:outline-none',
        },
        handleKeyDown: (view, event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !isSuggestionActive && !disableEnterSubmit) {
            event.preventDefault()
            onSubmit?.()
            return true
          }
          return false
        },
      },
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const text = getPlainTextFromEditor(editor)
        const selectedIntegrations = getIntegrationsFromEditor(editor)
        onContentChange?.(text, selectedIntegrations)
      },
    })

    // Extract plain text with integration mention markers
    const getPlainTextFromEditor = useCallback((editorInstance: typeof editor) => {
      if (!editorInstance) return ''

      let text = ''
      editorInstance.state.doc.descendants((node) => {
        if (node.isText) {
          text += node.text
        } else if (node.type.name === 'integrationMention' && node.attrs.id) {
          text += `{{skill:${node.attrs.id}}}`
        } else if (node.type.name === 'paragraph') {
          if (text.length > 0) text += '\n'
        }
      })
      return text.trim()
    }, [])

    // Extract selected integrations from editor content
    const getIntegrationsFromEditor = useCallback((editorInstance: typeof editor): IntegrationConfig[] => {
      if (!editorInstance) return []

      const integrationIds: string[] = []
      editorInstance.state.doc.descendants((node) => {
        if (node.type.name === 'integrationMention' && node.attrs.id) {
          integrationIds.push(node.attrs.id)
        }
      })

      return integrationIds
        .map(id => integrations.find(i => i.id === id))
        .filter((i): i is IntegrationConfig => i !== undefined)
    }, [integrations])

    useImperativeHandle(ref, () => ({
      focus: () => {
        editor?.commands.focus()
      },
      clearContent: () => {
        editor?.commands.clearContent()
      },
      getPlainText: () => {
        return getPlainTextFromEditor(editor)
      },
      getSelectedIntegrations: () => {
        return getIntegrationsFromEditor(editor)
      },
      setContent: (content: string) => {
        editor?.commands.setContent(content)
      }
    }), [editor, getPlainTextFromEditor, getIntegrationsFromEditor])

    // Update placeholder when prop changes
    useEffect(() => {
      if (editor && placeholder) {
        editor.extensionManager.extensions.forEach(ext => {
          if (ext.name === 'placeholder') {
            (ext.options as any).placeholder = placeholder
          }
        })
        editor.view.dispatch(editor.state.tr)
      }
    }, [editor, placeholder])

    // Update editable state
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled)
      }
    }, [editor, disabled])

    if (!editor) {
      return null
    }

    return (
      <EditorContent
        editor={editor}
        className={className}
      />
    )
  }
)

IntegrationEditor.displayName = 'IntegrationEditor'
