# rnvibecode

CLI to scaffold React Native Vibe Code projects with Claude Code integration.

**React Native Vibe Code** uses Claude Agent SDK on the cloud to power AI-driven mobile app development. This CLI translates that cloud setup for local development, giving you all the same features working directly on your machine with Claude Code.

## Installation

```bash
npm install -g rnvibecode
```

Or use with npx:

```bash
npx rnvibecode create my-app
```

## Prerequisites: Install Claude Code

This CLI sets up your project for Claude Code development. **Claude Code must be installed separately.**

### Standard Installation

**macOS, Linux, WSL:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows PowerShell:**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**Homebrew:**
```bash
brew install claude-code
```

**NPM (global):**
```bash
npm install -g @anthropic-ai/claude-code
```

For more information, visit [https://code.claude.com/](https://code.claude.com/)

## Usage

### Create a New Project

```bash
rnvibecode create my-app
```

Options:
- `--convex` - Enable Convex backend integration
- `--no-convex` - Disable Convex backend (default)
- `--skip-install` - Skip dependency installation

### Set Up Claude Code in Existing Project

```bash
cd my-existing-project
rnvibecode setup
```

Options:
- `--convex` - Enable Convex backend in CLAUDE.md
- `--no-convex` - Disable Convex backend
- `--detect` - Auto-detect Convex from project files (default)

## What Gets Created

### Expo API Routes (`app/api/`)

The CLI generates Expo Router API routes that provide the toolkit functionality:

| Route | Description | Required Env |
|-------|-------------|--------------|
| `/api/llm` | AI text generation (Claude) | `ANTHROPIC_API_KEY` |
| `/api/images` | Image generation (DALL-E 3) | `OPENAI_API_KEY` |
| `/api/stt` | Speech-to-text (Whisper) | `OPENAI_API_KEY` |
| `/api/search` | Web search (SerpAPI) | `SERP_API_KEY` |
| `/api/exa-search` | People search (Exa) | `EXA_API_KEY` |

### Slash Commands (`.claude/commands/`)

#### Toolkit Commands
These commands help you add AI features to your app:

| Command | Description |
|---------|-------------|
| `/ai-chat` | Add AI text generation with Claude |
| `/image-gen` | Add DALL-E 3 image generation |
| `/speech-to-text` | Add Whisper voice transcription |
| `/search` | Add Google search via SerpAPI |
| `/people-search` | Add Exa people search |

#### Utility Commands

| Command | Description |
|---------|-------------|
| `/build` | Build and preview the app |
| `/component <Name>` | Create a new React Native component |
| `/screen <name>` | Create a new screen/route |
| `/fix` | Fix TypeScript and lint errors |
| `/convex <name>` | Create Convex functions (if enabled) |

### Agent Skills (`.claude/skills/`)

Skills are specialized knowledge that Claude automatically applies:

| Skill | When Used |
|-------|-----------|
| `anthropic-chat` | AI chat, text generation, conversational AI |
| `openai-dalle-3` | Image generation, AI art, avatars |
| `openai-whisper` | Voice input, speech recognition, dictation |
| `google-search` | Web search, search results |
| `exa-people-search` | People search, professional discovery |
| `convex` | Database, real-time, backend (if enabled) |

## Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```bash
# Required for AI Chat (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Required for Image Generation and Speech-to-Text
OPENAI_API_KEY=sk-...

# Required for Google Search
SERP_API_KEY=...

# Required for People Search
EXA_API_KEY=...
```

## Development Workflow

After creating a project:

```bash
# Navigate to project
cd my-app

# Copy environment file and add your keys
cp .env.example .env

# Start the development server
npx expo start

# In another terminal, start Claude Code
claude

# Use slash commands to add features
# /ai-chat    - Add chat feature
# /image-gen  - Add image generation
# /build      - Check for errors
```

## How It Works

React Native Vibe Code cloud uses the Claude Agent SDK to power AI-driven development. This CLI translates that setup for local use:

| Cloud Feature | Local Equivalent |
|--------------|------------------|
| Claude Agent SDK | Claude Code CLI |
| System prompts | CLAUDE.md |
| Agent skills | `.claude/skills/` |
| Toolkit APIs | Expo Router API routes (`app/api/`) |

The API routes are generated in your project and call external APIs directly, so you need to provide your own API keys.

## Project Structure

```
my-app/
├── CLAUDE.md                    # Project instructions for Claude
├── .env.example                 # Required API keys template
├── .claude/
│   ├── settings.json            # Permissions
│   ├── commands/                # Slash commands
│   │   ├── ai-chat.md
│   │   ├── image-gen.md
│   │   ├── speech-to-text.md
│   │   ├── search.md
│   │   ├── people-search.md
│   │   ├── build.md
│   │   ├── component.md
│   │   ├── screen.md
│   │   ├── fix.md
│   │   └── convex.md            # (if Convex enabled)
│   └── skills/                  # Agent skills
│       ├── anthropic-chat/
│       ├── openai-dalle-3/
│       ├── openai-whisper/
│       ├── google-search/
│       ├── exa-people-search/
│       └── convex/              # (if Convex enabled)
├── app/
│   ├── api/                     # Expo Router API routes
│   │   ├── llm+api/route.ts
│   │   ├── images+api/route.ts
│   │   ├── stt+api/route.ts
│   │   ├── search+api/route.ts
│   │   └── exa-search+api/route.ts
│   └── ...                      # App screens
├── components/                  # Shared components
└── package.json
```

## License

MIT
