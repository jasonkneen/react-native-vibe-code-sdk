// Types
export type { PromptSection, PromptConfig } from "./types";

// Main prompt exports (backward compatible)
export { prompt, createSystemPrompt } from "./prompts/system";
export { convexGuidelines } from "./prompts/convex";

// Sections for customization
export {
  sections,
  getSectionById,
  getRequiredSections,
  getSectionsByOrder,
  envSection,
  codeOrganizationSection,
  typescriptSection,
  reactOptimizationsSection,
  designSection,
  toneAndStyleSection,
  proactivenessSection,
  stateManagementSection,
  stackInfoSection,
  webCompatibilitySection,
  docsSection,
  aiIntegrationSection,
  createAiIntegrationSection,
  appstoreSection,
  artifactInfoSection,
  firstMessageSection,
} from "./prompts/sections";

/**
 * Get the system prompt with optional Convex guidelines
 * @param cloudEnabled - Whether cloud (Convex) is enabled for this project
 * @returns The system prompt, optionally with Convex guidelines appended
 */
export function getPromptWithCloudStatus(cloudEnabled: boolean): string {
  const { prompt } = require("./prompts/system");
  const { convexGuidelines } = require("./prompts/convex");

  if (cloudEnabled) {
    return prompt + "\n\n" + convexGuidelines;
  }
  return prompt;
}
