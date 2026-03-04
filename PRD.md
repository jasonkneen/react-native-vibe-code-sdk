# PRD: Publish to App Store

## Introduction

Add the ability to publish Expo React Native apps directly to the Apple App Store from the project page. Users go through a 4-step wizard modal (App Info → Apple Credentials → Expo Token → Submit), with all EAS CLI commands running inside the existing E2B sandbox where the app code lives. CLI output is streamed live to the modal during the build+submit process.

## Goals

- Let users publish their apps to the Apple App Store without leaving the IDE
- Collect Apple Developer credentials and Expo token, stored in localStorage (never sent to DB)
- Run `eas build` + auto-submit inside the E2B sandbox via a streaming API
- Show real-time CLI output in the submit step modal
- Manage previous submissions from a submissions list modal

## User Stories

### US-001: Update publish button layout — add "App Stores" section
**Description:** As a user, I want to see separate "Publish to Web" and "App Store" buttons so I can choose where to publish.

**Acceptance Criteria:**
- [ ] Current publish/deploy button label changes to "Publish to Web"
- [ ] Below it, a new sub-headline "App Stores" appears
- [ ] An "App Store" button with Apple logo icon is shown under the sub-headline
- [ ] Clicking "App Store" opens the App Store Submissions modal
- [ ] Existing web publish flow is unaffected
- [ ] Typecheck passes

### US-002: App Store Submissions list modal
**Description:** As a user, I want to see my previous submissions and create new ones from a modal.

**Acceptance Criteria:**
- [ ] Modal titled "App Store Submissions" with subtitle "Manage your App Store submissions and create new ones"
- [ ] Shows empty state: document icon + "No submissions yet" + "Create your first submission to get started." when no submissions exist
- [ ] "New Submission" button in bottom-right opens the publish wizard (US-003)
- [ ] Submissions list shows previous submissions with status (when they exist, stored in localStorage)
- [ ] Close button (X) dismisses modal
- [ ] Uses shadcn Dialog component matching existing modal patterns
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-003: Publish wizard modal — Step 1: App Info
**Description:** As a user, I want to provide my app's name and bundle ID before submitting to the App Store.

**Acceptance Criteria:**
- [ ] Modal titled "Publish to App Store" with 4-step tab bar: "Step 1: App Info" | "Step 2: Apple" | "Step 3: Expo" | "Step 4: Submit"
- [ ] Step 1 is active/highlighted, other steps are dimmed
- [ ] Input field for "App Name" (pre-filled from project name if available)
- [ ] Input field for "Bundle Identifier" (e.g. `com.example.myapp`)
- [ ] "Continue" button navigates to Step 2
- [ ] Values stored in component state (passed through wizard)
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-004: Publish wizard — Step 2: Apple Developer credentials
**Description:** As a user, I want to enter my Apple Developer credentials so EAS can submit to App Store Connect.

**Acceptance Criteria:**
- [ ] Step 2 tab is active/highlighted
- [ ] Info alert: "Apple Developer Membership required — You need an active Apple Developer account to publish to the App Store. Membership costs $99/year (may vary by country)."
- [ ] "Sign up" button links to `https://developer.apple.com/programs/` (opens new tab)
- [ ] "Details" button/link for more info
- [ ] Input: "Apple Developer Email" with placeholder "eg. appleid@gmail.com"
- [ ] Input: "Apple Developer Password" with placeholder "Account Password" (password type with show/hide toggle)
- [ ] Privacy notice: "We don't store your Apple Developer credentials on our servers, they are saved locally."
- [ ] "Continue" button saves both values to localStorage keys `apple_developer_email` and `apple_developer_password`
- [ ] Pre-fills from localStorage if values already exist
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Publish wizard — Step 3: Expo account token
**Description:** As a user, I want to provide my Expo access token so EAS CLI can authenticate.

**Acceptance Criteria:**
- [ ] Step 3 tab is active/highlighted
- [ ] Info notice: "Partners with Expo for app submission. You need a free Expo account to submit to App Store. You might need a paid Expo plan for unlimited submissions in the future."
- [ ] "Sign up" button links to `https://expo.dev/signup` (opens new tab)
- [ ] "Pricing" button/link for Expo pricing info
- [ ] Input: "Expo Account Token" with placeholder showing example token format
- [ ] Help text: "To connect with Expo, create an access token in your **Expo Settings**. For organizations, add a 'Robot' user with 'Developer' role in Organization > Credentials > Access Tokens > Add Robot."
- [ ] "Expo Settings" text links to `https://expo.dev/accounts/[account]/settings/access-tokens` (user fills in account)
- [ ] "Start Submission" button saves token to localStorage key `expo_account_token` and moves to Step 4
- [ ] Pre-fills from localStorage if value already exists
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-006: Streaming API endpoint for EAS build+submit with interactive stdin
**Description:** As a developer, I need a streaming API endpoint that runs EAS commands inside the sandbox, streams CLI output in real-time, and supports writing back to stdin when the CLI prompts for input (e.g. Apple 2FA).

**Acceptance Criteria:**
- [ ] New API route `POST /api/eas/build-and-submit` that accepts: `sandboxId`, `projectId`, `appName`, `bundleId`, `appleId`, `applePassword`, `expoToken`
- [ ] Connects to E2B sandbox using `connectSandbox()`
- [ ] Sets `EXPO_TOKEN` env var in sandbox
- [ ] Runs `eas init --force --non-interactive` to link project
- [ ] Runs `eas build -p ios --profile production --auto-submit` with Apple credentials passed via env vars (`EXPO_APPLE_ID`, `EXPO_APPLE_PASSWORD`) — **NOT** `--non-interactive` so it can prompt for 2FA
- [ ] Uses streaming response (ReadableStream / TransformStream) to send CLI output lines as they happen
- [ ] Each streamed chunk is a JSON line with types:
  - `{"type": "log", "data": "..."}\n` — normal CLI output
  - `{"type": "error", "data": "..."}\n` — error output
  - `{"type": "prompt", "prompt": "2fa_method"}\n` — CLI is asking for 2FA method (device/sms)
  - `{"type": "prompt", "prompt": "2fa_code"}\n` — CLI is asking for the 6-digit 2FA code
  - `{"type": "done", "success": true, "submissionUrl": "https://expo.dev/..."}\n` — process complete, includes Expo submission URL parsed from CLI output
  - `{"type": "prompt", "prompt": "credentials_failed"}\n` — Apple login failed (invalid username/password)
- [ ] Detects login failure by pattern-matching CLI output (e.g. "Invalid username and password combination", "Would you like to try again?")
- [ ] When login fails, sends `credentials_failed` prompt event to client — does NOT retry in CLI (answers "no" to retry prompt)
- [ ] Detects 2FA prompts by pattern-matching CLI output (e.g. "want to validate your account? › device / sms", "Enter the 6 digit code")
- [ ] When a prompt is detected, pauses and waits for client to send input
- [ ] Separate API route `POST /api/eas/build-and-submit/input` to write stdin to the running process: accepts `sandboxId`, `input` (the user's response string)
- [ ] Handles errors gracefully — streams error output, then sends done with `success: false`
- [ ] Max duration 600 seconds (10 minutes, builds take time)
- [ ] Typecheck passes

### US-007: Publish wizard — Step 4: Submit with live streaming output
**Description:** As a user, I want to see real-time progress of my app being built and submitted to the App Store.

**Acceptance Criteria:**
- [ ] Step 4 tab is active/highlighted
- [ ] Header text: "Your app is currently building. It will be submitted to the App Store automatically once the build is complete. This may take a while, please don't close the tab."
- [ ] Dark terminal-style output area below the header text
- [ ] Streams CLI output from the API endpoint in real-time using `fetch` + `ReadableStream` reader
- [ ] Output text is green monospace font on dark background (matching reference screenshot)
- [ ] Auto-scrolls to bottom as new output arrives
- [ ] Shows "Starting submission..." as initial message
- [ ] On successful build kickoff: transitions to success state (replaces terminal output)
- [ ] Success state shows: green checkmark circle icon, title "Your App Is Now Building", subtitle "Once the build completes successfully, it will be automatically submitted to the App Store for review."
- [ ] "Open submission status" button (with external link icon) opens the Expo submission URL in a new tab (e.g. `https://expo.dev/accounts/{account}/projects/{project}/submissions/{id}` — parsed from CLI output)
- [ ] "Dismiss" text button below closes the modal
- [ ] On `credentials_failed` prompt: navigates wizard back to Step 2 (Apple credentials) with an error banner "Invalid Apple ID or password. Please check your credentials and try again." — user corrects and re-submits, which restarts the build process from Step 4
- [ ] On error: shows error message and option to retry
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-008: Two-Factor Authentication — method selection modal
**Description:** As a user, when Apple requires 2FA during the build process, I want to choose my verification method (Device or SMS) from a modal overlay on top of the terminal output.

**Acceptance Criteria:**
- [ ] When the streaming output detects a `{"type": "prompt", "prompt": "2fa_method"}` message, show a modal overlay
- [ ] Modal title: "Two-Factor Authentication"
- [ ] Subtitle: "Choose how you want to validate your Apple Developer account"
- [ ] Two buttons side by side: "Verify with Device" and "Verify with SMS"
- [ ] Clicking a button sends the choice ("device" or "sms") to `POST /api/eas/build-and-submit/input`
- [ ] Modal overlay appears on top of the terminal output (terminal still visible behind)
- [ ] Modal dismisses after selection and streaming continues
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-009: Two-Factor Authentication — 6-digit code input modal
**Description:** As a user, after choosing a 2FA method, I want to enter the 6-digit verification code sent to my device.

**Acceptance Criteria:**
- [ ] When the streaming output detects a `{"type": "prompt", "prompt": "2fa_code"}` message, show a modal overlay
- [ ] Modal title: "Two-Factor Authentication"
- [ ] Subtitle: "Enter the 6-digit code sent to your Apple device"
- [ ] 6 individual digit input boxes (3 digits — dash separator — 3 digits) with auto-focus advance
- [ ] Each box accepts exactly 1 digit, auto-advances to next on input
- [ ] Supports paste of full 6-digit code (distributes across boxes)
- [ ] "Submit" button sends the 6-digit code to `POST /api/eas/build-and-submit/input`
- [ ] Modal overlay appears on top of terminal output
- [ ] Modal dismisses after submission and streaming continues
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-010: Persist submission history in localStorage
**Description:** As a user, I want my submission history saved so I can see past submissions when reopening the modal.

**Acceptance Criteria:**
- [ ] After a submission completes (success or failure), save entry to localStorage key `app_store_submissions_{projectId}`
- [ ] Each entry includes: `id`, `appName`, `bundleId`, `status` (building/submitted/failed), `createdAt`, `buildUrl` (if available)
- [ ] Submissions list modal (US-002) reads from localStorage and displays entries
- [ ] Each entry shows app name, status badge, and date
- [ ] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals

- No Google Play Store support (future work)
- No server-side storage of Apple credentials or Expo tokens
- No build profile selection (always uses `production`)
- No custom eas.json configuration UI
- No OTA update support
- No build cancellation UI
- No Android build support in this iteration

## Technical Considerations

- **Sandbox execution:** All EAS CLI commands run inside the E2B sandbox where the Expo project code lives. Use `sandbox.commands.run()` for non-streaming and `sandbox.commands.stream()` (or equivalent) for streaming output.
- **Credential passing:** Apple credentials passed as environment variables to the sandbox process (`EXPO_APPLE_ID`, `EXPO_APPLE_PASSWORD`, `EXPO_TOKEN`). Never persisted server-side.
- **Streaming:** Use Web Streams API (ReadableStream + TransformStream) in the Next.js API route to stream sandbox command output to the client. Client reads with `response.body.getReader()`.
- **Existing API routes:** There are existing `/api/eas/build`, `/api/eas/submit`, `/api/eas/login` routes. The new streaming endpoint combines the flow into one. Existing routes can remain for other uses.
- **localStorage hook:** Reuse existing `useLocalStorage` hook from `hooks/use-local-storage.ts`.
- **Modal patterns:** Follow existing patterns from `expo-go-modal.tsx` and `project-settings-modal.tsx` using shadcn Dialog.
- **Component location:** New components go in `apps/web/components/` — `app-store-submissions-modal.tsx`, `publish-app-store-modal.tsx`.
- **Interactive CLI with stdin:** The EAS build command runs WITHOUT `--non-interactive` so Apple 2FA prompts can appear. The API detects prompts by pattern-matching CLI output lines (e.g. `"validate your account"`, `"6 digit code"`). When detected, the stream sends a `prompt` event to the client. The client shows a modal and posts the user's input to a separate `/input` endpoint that writes to the process stdin in the sandbox. Use `sandbox.commands.run()` with PTY or `sandbox.process.start()` to get a writable stdin handle.
- **Process management:** The running EAS process needs to be kept alive between the stream request and the input request. Store the process handle in a server-side map keyed by `sandboxId` (or use the sandbox's built-in process management).
- **EAS CLI version:** Use `npx eas-cli@latest` to avoid version pinning issues.
- **`eas init` uses `--non-interactive --force`** to skip prompts. Only the build command is interactive (for 2FA).
