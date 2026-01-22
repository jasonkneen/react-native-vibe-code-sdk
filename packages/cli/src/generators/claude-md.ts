export function generateClaudeMd(convexEnabled: boolean): string {
  const convexSection = convexEnabled ? generateConvexSection() : ''

  return `# CLAUDE.md - React Native Vibe Code

This project was set up with React Native Vibe Code CLI (\`rnvibecode\`).
You have all React Native Vibe Code cloud features enabled locally with Claude Code.

## Project Overview

You are building a React Native app with Expo. This project uses:
- **Expo SDK 54** with Expo Router for navigation
- **TypeScript** with strict type checking
- **React Native** components and APIs
- **lucide-react-native** for icons (DO NOT use emojis in UI)
${convexEnabled ? '- **Convex** for backend, database, and real-time features\n' : ''}

## Core Principles

1. **TypeScript First**: Always use explicit types. \`useState<Type[]>([])\` not \`useState([])\`
2. **Mobile-First Design**: Design for mobile, add desktop layouts with react-responsive
3. **Beautiful UI**: Draw inspiration from iOS, Instagram, Airbnb - make it production-worthy
4. **No Emojis**: Use lucide-react-native icons instead of emojis in all UI elements
5. **Expo Go Compatible**: Only use packages compatible with Expo Go v54

## Development Environment

- Use Expo CLI commands: \`npx expo start\`, \`npx expo build\`
- The dev server runs on port 8081 by default
- Use \`@/\` import alias for absolute imports
${convexEnabled ? '- Convex dev server: `npx convex dev`\n' : ''}

## Key Guidelines

### Routing (Expo Router)
- File-based routing in \`app/\` directory
- Use \`<Stack.Screen options={{ title, headerRight }}/>\` for headers
- Dynamic routes: \`[id].tsx\` with \`useLocalSearchParams()\`
- Tabs: Register in \`(tabs)/_layout.tsx\`, use nested stacks inside tabs
- Only ONE page should route to "/" - avoid duplicate index files

### Styling
- Use \`StyleSheet.create()\` from react-native
- For responsive layouts: use react-responsive with mobile-first approach
- Desktop containers should max out at 1024px width
- Use \`@expo-google-fonts/dev\` for custom fonts

### State Management
- \`useState\` for local state
- \`@tanstack/react-query\` for server state (use object API)
- \`@nkzw/create-context-hook\` for shared state (NOT zustand/redux)
- \`AsyncStorage\` for persistence (wrap in context hook)

### Animations
- Prefer React Native's Animated API
- Only use react-native-reanimated when performance is critical
- Layout animations don't work on web - add Platform checks

### Web Compatibility
- Always handle platform differences with \`Platform.OS\` checks
- ScrollView needs parent View with \`flexGrow: 1, flexBasis: 0\` for web
- Use platform-specific fallbacks for native-only APIs

### Safe Area
- Built-in tabs/headers handle insets automatically
- Use \`<SafeAreaView>\` only when header is removed
- For games: use \`useSafeAreaInsets()\` hook in positioning calculations

## What NOT to Do

- NEVER update core dependencies (expo, react-native)
- NEVER delete components in \`features/\` folder
- NEVER use emojis in UI design
- NEVER add unnecessary comments or explanations
- NEVER create binary assets - use URLs (e.g., unsplash.com)
- NEVER modify git or dev server settings

## Toolkit API Routes

These API routes are generated in \`app/api/\` using Expo Router API routes.
They require API keys in your \`.env\` file (see \`.env.example\`).

### LLM - AI Text Generation (Claude)
\`\`\`typescript
POST /api/llm
Body: { messages: Array<{ role: 'system'|'user'|'assistant', content: string }> }
Response: { completion: string }
Env: ANTHROPIC_API_KEY
\`\`\`

### Images - AI Image Generation (DALL-E 3)
\`\`\`typescript
POST /api/images
Body: { prompt: string, size?: '1024x1024'|'512x512'|'256x256' }
Response: { image: { base64Data: string, mimeType: string }, size: string }
Env: OPENAI_API_KEY
\`\`\`

### STT - Speech to Text (Whisper)
\`\`\`typescript
POST /api/stt
Body: FormData with 'audio' file, optional 'language' string
Response: { text: string, language: string }
Env: OPENAI_API_KEY
\`\`\`

### Search - Web Search (SerpAPI)
\`\`\`typescript
POST /api/search
Body: { query: string, gl?: string, hl?: string, num?: number }
Response: { organicResults: [...], searchInformation: {...} }
Env: SERP_API_KEY
\`\`\`

### Exa Search - People Search (Exa)
\`\`\`typescript
POST /api/exa-search
Body: { query: string, numResults?: number }
Response: { results: Array<{ title, url, score? }> }
Env: EXA_API_KEY
\`\`\`

## Using Toolkit Slash Commands

Use these slash commands to add AI features:
- \`/ai-chat\` - Add AI text generation with Claude
- \`/image-gen\` - Add DALL-E 3 image generation
- \`/speech-to-text\` - Add Whisper voice transcription
- \`/search\` - Add Google search via SerpAPI
- \`/people-search\` - Add Exa people search

Each command creates the hooks and components needed to use the API routes.

${convexSection}

## Code Quality Checklist

Before completing any task:
- [ ] No TypeScript errors (\`npx tsc --noEmit\`)
- [ ] No lint errors (\`npx expo lint\`)
- [ ] App builds without errors
- [ ] UI looks beautiful and polished
- [ ] Works on both iOS and web (check Platform specifics)
${convexEnabled ? '- [ ] Convex functions have proper validators\n- [ ] Indexes are correctly defined (not by_id or by_creation_time)\n' : ''}

---

*This CLAUDE.md was generated by rnvibecode CLI - translating React Native Vibe Code cloud setup for local Claude Code development.*
`
}

function generateConvexSection(): string {
  return `
## Convex Backend Guidelines

Convex is enabled for this project. Use it for database, realtime, file storage, functions, and scheduling.

### Function Syntax
\`\`\`typescript
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("table").collect();
  },
});
\`\`\`

### Validators
- \`v.string()\`, \`v.number()\`, \`v.boolean()\`, \`v.null()\`
- \`v.id(tableName)\` for document IDs
- \`v.array(values)\`, \`v.object({ prop: value })\`
- \`v.optional(validator)\`, \`v.union(v1, v2)\`
- **NOT supported**: \`v.map()\`, \`v.set()\`

### Schema (convex/schema.ts)
\`\`\`typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    content: v.string(),
    authorId: v.id("users"),
  }).index("by_author", ["authorId"]),
});
\`\`\`

**Index Rules:**
- System provides \`by_id\` and \`by_creation_time\` - NEVER define these
- Do NOT include \`_creationTime\` as last column

### Queries
- Use \`.withIndex()\` instead of \`.filter()\`
- \`.collect()\` for all results, \`.take(n)\` to limit
- \`.order("asc")\` or \`.order("desc")\`

### Client Integration
\`\`\`typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const data = useQuery(api.myFile.myQuery, { arg: value });
const doAction = useMutation(api.myFile.myMutation);

// Conditional queries - use "skip" pattern:
const data = useQuery(api.users.get, userId ? { userId } : "skip");
\`\`\`

### Actions (Node.js)
- Add \`"use node";\` at top of file
- Files with \`"use node";\` should NOT contain queries/mutations
- No \`ctx.db\` access - use \`ctx.runQuery\`/\`ctx.runMutation\`

### Limits
- Arguments/returns: max 8 MiB
- Arrays: max 8192 elements
- Documents: max 1 MiB
- Query/mutation timeout: 1 second
- Action timeout: 10 minutes
`
}
