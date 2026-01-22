/**
 * Integration Components Module
 *
 * TipTap-based components for integration selection and display.
 * These components provide a rich text editing experience with
 * integration mention support.
 */

// Editor component for text input with integration mentions
export {
  IntegrationEditor,
  type IntegrationEditorRef,
} from './integration-editor'

// Dropdown list for selecting integrations
export {
  IntegrationMentionList,
  type IntegrationMentionListRef,
} from './integration-mention-list'

// Suggestion configuration for TipTap
export {
  createIntegrationSuggestion,
  integrationSuggestion,
} from './integration-suggestion'

// Import CSS for styling
import './integration-editor.css'
