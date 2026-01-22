import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'
import { generateClaudeMd } from '../generators/claude-md.js'
import { generateSkills } from '../generators/skills.js'
import { generateCommands } from '../generators/commands.js'
import { generateApiRoutes } from '../generators/api-routes.js'

interface SetupOptions {
  convex?: boolean
  detect?: boolean
}

function detectConvex(projectPath: string): boolean {
  const convexJsonPath = path.join(projectPath, 'convex.json')
  const convexFolderPath = path.join(projectPath, 'convex')
  const packageJsonPath = path.join(projectPath, 'package.json')

  if (fs.existsSync(convexJsonPath)) {
    return true
  }

  if (fs.existsSync(convexFolderPath) && fs.statSync(convexFolderPath).isDirectory()) {
    const files = fs.readdirSync(convexFolderPath)
    if (files.some(f => f.endsWith('.ts') || f.endsWith('.js'))) {
      return true
    }
  }

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = fs.readJsonSync(packageJsonPath)
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      if (deps['convex']) {
        return true
      }
    } catch {
    }
  }

  return false
}

export async function setupClaudeCode(options: SetupOptions = {}) {
  const projectPath = process.cwd()
  const spinner = ora('Setting up Claude Code...').start()

  try {
    let convexEnabled = options.convex

    if (convexEnabled === undefined && options.detect !== false) {
      spinner.text = 'Detecting Convex configuration...'
      convexEnabled = detectConvex(projectPath)
      if (convexEnabled) {
        spinner.info('Convex detected - enabling backend guidelines')
      }
    }

    convexEnabled = convexEnabled ?? false

    const claudeDir = path.join(projectPath, '.claude')
    const commandsDir = path.join(claudeDir, 'commands')
    const skillsDir = path.join(claudeDir, 'skills')

    await fs.ensureDir(claudeDir)
    await fs.ensureDir(commandsDir)
    await fs.ensureDir(skillsDir)

    spinner.text = 'Generating CLAUDE.md...'
    const claudeMdContent = generateClaudeMd(convexEnabled)
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md')
    await fs.writeFile(claudeMdPath, claudeMdContent, 'utf-8')

    spinner.text = 'Generating skills...'
    await generateSkills(skillsDir, convexEnabled)

    spinner.text = 'Generating slash commands...'
    await generateCommands(commandsDir, convexEnabled)

    // Generate API routes for toolkit features
    spinner.text = 'Generating API routes...'
    await generateApiRoutes(projectPath)

    // Generate .env.example for required API keys
    const envExamplePath = path.join(projectPath, '.env.example')
    if (!fs.existsSync(envExamplePath)) {
      const envExample = `# API Keys for React Native Vibe Code Toolkit
# Copy this file to .env and fill in your keys

# Required for AI Chat (Claude)
ANTHROPIC_API_KEY=

# Required for Image Generation (DALL-E 3) and Speech-to-Text (Whisper)
OPENAI_API_KEY=

# Required for Google Search
SERP_API_KEY=

# Required for People Search (Exa)
EXA_API_KEY=
`
      await fs.writeFile(envExamplePath, envExample, 'utf-8')
    }

    const settingsPath = path.join(claudeDir, 'settings.json')
    if (!fs.existsSync(settingsPath)) {
      const settings = {
        permissions: {
          allow: [
            'Read(**)',
            'Bash(npm:*)',
            'Bash(npx:*)',
            'Bash(pnpm:*)',
            'Bash(expo:*)',
          ],
          deny: [],
          ask: [],
        },
      }
      await fs.writeJson(settingsPath, settings, { spaces: 2 })
    }

    spinner.succeed('Claude Code setup complete')

    console.log()
    console.log(chalk.bold('  Created files:'))
    console.log(chalk.dim('    CLAUDE.md                          - Project instructions'))
    console.log(chalk.dim('    .claude/settings.json              - Permission settings'))
    console.log(chalk.dim('    .claude/commands/*.md              - Slash commands'))
    console.log(chalk.dim('    .claude/skills/*/SKILL.md          - Agent skills'))
    console.log(chalk.dim('    app/api/*+api/route.ts             - Toolkit API routes'))
    console.log(chalk.dim('    .env.example                       - Required API keys'))
    console.log()

    if (convexEnabled) {
      console.log(chalk.green('  Convex backend support enabled'))
      console.log()
    }

    console.log(chalk.bold('  Toolkit slash commands:'))
    console.log(chalk.cyan('    /ai-chat        ') + chalk.dim('- Add AI text generation with Claude'))
    console.log(chalk.cyan('    /image-gen      ') + chalk.dim('- Add DALL-E 3 image generation'))
    console.log(chalk.cyan('    /speech-to-text ') + chalk.dim('- Add Whisper voice transcription'))
    console.log(chalk.cyan('    /search         ') + chalk.dim('- Add Google search via SerpAPI'))
    console.log(chalk.cyan('    /people-search  ') + chalk.dim('- Add Exa people search'))
    console.log()
    console.log(chalk.bold('  Utility slash commands:'))
    console.log(chalk.cyan('    /build          ') + chalk.dim('- Build and preview the app'))
    console.log(chalk.cyan('    /component      ') + chalk.dim('- Create a new React Native component'))
    console.log(chalk.cyan('    /screen         ') + chalk.dim('- Create a new screen/route'))
    console.log(chalk.cyan('    /fix            ') + chalk.dim('- Fix TypeScript and lint errors'))
    if (convexEnabled) {
      console.log(chalk.cyan('    /convex         ') + chalk.dim('- Create Convex functions'))
    }
    console.log()
    console.log(chalk.bold('  API Routes (Expo Router):'))
    console.log(chalk.dim('    /api/llm        - AI text generation (Claude)'))
    console.log(chalk.dim('    /api/images     - Image generation (DALL-E 3)'))
    console.log(chalk.dim('    /api/stt        - Speech-to-text (Whisper)'))
    console.log(chalk.dim('    /api/search     - Web search (SerpAPI)'))
    console.log(chalk.dim('    /api/exa-search - People search (Exa)'))
    console.log()
    console.log(chalk.bold('  Skills (auto-invoked by Claude):'))
    console.log(chalk.dim('    anthropic-chat    - AI Chat with Claude'))
    console.log(chalk.dim('    openai-dalle-3    - Image Generation'))
    console.log(chalk.dim('    openai-whisper    - Speech to Text'))
    console.log(chalk.dim('    google-search     - Web Search'))
    console.log(chalk.dim('    exa-people-search - People Search'))
    if (convexEnabled) {
      console.log(chalk.dim('    convex            - Convex backend'))
    }
    console.log()

  } catch (error) {
    spinner.fail('Setup failed')
    throw error
  }
}
