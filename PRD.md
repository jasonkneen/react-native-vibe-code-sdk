# PRD: expo-mcp — Expo SDK Docs MCP Server

## Introduction

Create an MCP (Model Context Protocol) server called `expo-mcp` that allows AI clients (Cursor, Claude Desktop, etc.) to intelligently retrieve Expo SDK reference documentation on demand. Given a natural language query, the server selects the most relevant SDK module doc(s) from the official Expo GitHub repo and returns the raw markdown content. The server is protected by OAuth using the app's existing Better Auth / Google OAuth setup and deployed as an API route in the existing `apps/web` Next.js app.

## Goals

- Provide a single intelligent MCP tool that maps a query to the right Expo SDK doc section and returns its content
- Fetch docs live from GitHub (no caching), always reflecting the latest SDK version
- Protect the MCP server with OAuth, verifying tokens against the existing Better Auth sessions
- Package the MCP logic in `packages/expo-mcp/` and expose it via an API route in `apps/web`
- Expose the required `.well-known/oauth-protected-resource` endpoint for MCP spec compliance

## User Stories

### US-001: Scaffold `packages/expo-mcp` package
**Description:** As a developer, I need the package skeleton so the MCP logic has a proper home in the monorepo.

**Acceptance Criteria:**
- [ ] Directory `packages/expo-mcp/` exists with `package.json` named `@react-native-vibe-code/expo-mcp`
- [ ] `tsconfig.json` extends `@react-native-vibe-code/tsconfig` base
- [ ] `src/index.ts` exports the handler and token verifier
- [ ] `package.json` includes dependencies: `mcp-handler`, `zod`; devDependencies: `tsup`, `typescript`, `@react-native-vibe-code/tsconfig`
- [ ] `package.json` has `build` script using `tsup` and `type-check` script
- [ ] Package is listed in pnpm workspace (picked up automatically via `packages/*`)
- [ ] Typecheck passes

### US-002: Build SDK module index with fuzzy query matching
**Description:** As the MCP tool, I need to map a natural language query to the most relevant Expo SDK module filename(s) so I know what to fetch.

**Acceptance Criteria:**
- [ ] `src/sdk-modules.ts` exports a hardcoded array of all SDK module slugs from `docs/pages/versions/v55.0.0/sdk/` (e.g. `"camera"`, `"audio"`, `"filesystem"`)
- [ ] `src/matcher.ts` exports a `findModules(query: string): string[]` function
- [ ] Matching is case-insensitive and checks if any module slug appears in the query (substring match)
- [ ] Falls back to returning the top 3 closest matches by Levenshtein-like scoring if no substring match
- [ ] Returns at most 3 module slugs
- [ ] Typecheck passes

### US-003: Implement GitHub raw content fetcher
**Description:** As the MCP tool, I need to fetch the raw MDX content of an Expo SDK doc from GitHub without any caching.

**Acceptance Criteria:**
- [ ] `src/fetcher.ts` exports `fetchExpoDoc(slug: string): Promise<string>`
- [ ] Fetches from `https://raw.githubusercontent.com/expo/expo/main/docs/pages/versions/v55.0.0/sdk/{slug}.mdx`
- [ ] Throws a descriptive error if the module slug is not found (404)
- [ ] Returns the raw MDX string on success
- [ ] Typecheck passes

### US-004: Implement the `get_expo_docs` MCP tool
**Description:** As an AI client, I want a single tool that takes my query, picks the right SDK module(s), fetches their docs, and returns the content — so I don't need to know SDK module names in advance.

**Acceptance Criteria:**
- [ ] `src/handler.ts` exports a `createExpoMcpHandler()` function using `createMcpHandler` from `mcp-handler`
- [ ] Handler registers one tool: `get_expo_docs`
- [ ] Tool input schema: `{ query: z.string().describe("What Expo SDK feature or module you need docs for") }`
- [ ] Tool logic: calls `findModules(query)` → calls `fetchExpoDoc()` for each match → returns combined markdown with a `## [slug]` header per section
- [ ] If no modules match, returns a helpful message listing all available module slugs
- [ ] `basePath` is set to `'/api'` in handler options
- [ ] Typecheck passes

### US-005: Implement OAuth token verification via Better Auth
**Description:** As a security requirement, the MCP server must verify Bearer tokens against the app's existing Better Auth sessions so only authenticated users can use it.

**Acceptance Criteria:**
- [ ] `src/auth.ts` exports `verifyMcpToken(req: Request, bearerToken?: string): Promise<AuthInfo | undefined>`
- [ ] Function accepts the bearer token and validates it as a Better Auth session token
- [ ] Uses Better Auth's `auth.api.getSession` pattern — the package exports a factory `createVerifyMcpToken(auth)` that accepts the auth instance from the web app
- [ ] Returns `undefined` if token is missing or invalid
- [ ] Returns `AuthInfo` with `token`, `scopes: ['read:expo-docs']`, `clientId: user.id` on success
- [ ] Typecheck passes

### US-006: Add MCP API route to `apps/web`
**Description:** As a developer, I need the MCP endpoint wired into the existing Next.js app so it's deployed with no extra infrastructure.

**Acceptance Criteria:**
- [ ] File `apps/web/app/api/mcp/route.ts` exists
- [ ] Imports `createExpoMcpHandler` from `@react-native-vibe-code/expo-mcp`
- [ ] Imports `createVerifyMcpToken` from `@react-native-vibe-code/expo-mcp`
- [ ] Imports the app's `auth` instance from `apps/web/lib/auth/server.ts` (or equivalent)
- [ ] Wraps handler with `withMcpAuth(handler, verifyMcpToken, { required: true, requiredScopes: ['read:expo-docs'] })`
- [ ] Exports `GET`, `POST`, `DELETE` from the auth-wrapped handler
- [ ] Add `@react-native-vibe-code/expo-mcp` to `apps/web/package.json` dependencies as `workspace:*`
- [ ] Typecheck passes

### US-007: Expose OAuth protected resource metadata endpoint
**Description:** As an MCP spec requirement, the server must expose a `.well-known/oauth-protected-resource` endpoint so MCP clients can discover how to authorize.

**Acceptance Criteria:**
- [ ] File `apps/web/app/.well-known/oauth-protected-resource/route.ts` exists (or updated if already present)
- [ ] Uses `protectedResourceHandler` and `metadataCorsOptionsRequestHandler` from `mcp-handler`
- [ ] `authServerUrls` is set to `[process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3210']`
- [ ] Exports `GET` and `OPTIONS` handlers
- [ ] Typecheck passes

### US-008: Add example MCP client config and README
**Description:** As a developer consuming this MCP, I want a ready-to-use config file to connect from Cursor or Claude Desktop.

**Acceptance Criteria:**
- [ ] File `.cursor/mcp.json` exists at repo root with an `expo-mcp` entry pointing to `https://<your-domain>/api/mcp` using Streamable HTTP transport
- [ ] `packages/expo-mcp/README.md` documents: what the tool does, how to connect, example `query` values (e.g. `"camera permissions"`, `"audio playback"`, `"filesystem read"`, `"push notifications"`)

## Non-Goals

- No vector embeddings or semantic search (query matching is keyword/fuzzy only)
- No caching — every tool call hits GitHub raw content live
- No support for non-SDK doc sections (guides, router, EAS, tutorials)
- No versioning UI — hardcoded to Expo SDK v55
- No standalone Vercel project — deploys as part of existing `apps/web`
- No rate limiting beyond what Better Auth sessions already enforce

## Technical Considerations

- **`mcp-handler`** package: the correct package name per Vercel docs (not `@vercel/mcp-adapter`)
- **Better Auth token verification**: Bearer token in MCP requests is the Better Auth session token — use `auth.api.getSession` with `{ headers: { authorization: 'Bearer <token>' } }` from the web app's auth instance
- **GitHub raw URL pattern**: `https://raw.githubusercontent.com/expo/expo/main/docs/pages/versions/v55.0.0/sdk/{slug}.mdx`
- **SDK module list**: hardcoded from v55.0.0 directory — update manually when SDK version bumps
- **Monorepo build**: `packages/expo-mcp` uses `tsup` with `entry: ['src/index.ts']`; `apps/web` imports via `workspace:*`
- **API route path**: `/api/mcp` — matches `basePath: '/api'` in `createMcpHandler` options
- **Auth server config**: The `packages/expo-mcp` package does NOT import Better Auth directly — it exports a factory that accepts the auth instance to avoid circular deps and keep the package framework-agnostic
