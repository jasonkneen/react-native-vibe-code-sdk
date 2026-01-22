/**
 * Claude Code executor for E2B Expo Sandbox
 *
 * This is a standalone version for E2B deployment.
 * The canonical implementation is in @react-native-vibe-code/agent package.
 *
 * @see packages/agent/src/executor.ts for the source of truth
 */
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import { exec } from 'child_process'

// =============================================================================
// Utils (from @react-native-vibe-code/agent/utils)
// =============================================================================

async function downloadImage(url: string, destPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          file.close()
          fs.unlinkSync(destPath)
          downloadImage(redirectUrl, destPath).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(destPath)
        reject(new Error(`Failed to download image: HTTP ${response.statusCode}`))
        return
      }

      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve(destPath)
      })
    }).on('error', (err) => {
      file.close()
      fs.unlinkSync(destPath)
      reject(err)
    })
  })
}

function loadEnvFile(envPath: string): void {
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const envLines = envContent.split('\n')
      for (const line of envLines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=')
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim()
          }
        }
      }
    }
  } catch (err) {
    console.log('Could not load .env file:', (err as Error).message)
  }
}

// =============================================================================
// Hooks (from @react-native-vibe-code/agent/hooks)
// =============================================================================

async function runConvexDeploy(cwd: string): Promise<void> {
  console.log('Running convex deploy...')
  return new Promise((resolve) => {
    exec('npx convex deploy', { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error('Convex deploy failed:', error.message)
        if (stderr) console.error('stderr:', stderr)
      } else {
        console.log('Convex deploy completed')
        if (stdout) console.log('stdout:', stdout)
      }
      resolve()
    })
  })
}

const sessionEndHook = async (
  input: { hook_event_name: string; cwd: string },
  _toolUseID: string | undefined,
  _options: { signal: AbortSignal }
): Promise<{ continue: boolean }> => {
  console.log('SessionEnd hook triggered')
  await runConvexDeploy(input.cwd)
  return { continue: true }
}

// =============================================================================
// Executor (from @react-native-vibe-code/agent/executor)
// =============================================================================

interface ExecutorArgs {
  prompt: string
  systemPrompt?: string
  cwd: string
  model?: string
  imageUrls: string[]
}

function parseArgs(argv: string[]): ExecutorArgs {
  const args = argv.slice(2)

  const promptArg = args.find((arg) => arg.startsWith('--prompt='))
  const systemPromptArg = args.find((arg) => arg.startsWith('--system-prompt='))
  const systemPromptFileArg = args.find((arg) => arg.startsWith('--system-prompt-file='))
  const cwdArg = args.find((arg) => arg.startsWith('--cwd='))
  const modelArg = args.find((arg) => arg.startsWith('--model='))
  const imageUrlsArg = args.find((arg) => arg.startsWith('--image-urls='))

  if (!promptArg) {
    throw new Error('--prompt argument is required')
  }

  const prompt = promptArg.substring('--prompt='.length)
  const cwd = cwdArg?.substring('--cwd='.length) || '/home/user/app'
  const model = modelArg?.substring('--model='.length)

  let systemPrompt: string | undefined
  if (systemPromptFileArg) {
    const filePath = systemPromptFileArg.substring('--system-prompt-file='.length)
    try {
      if (fs.existsSync(filePath)) {
        systemPrompt = fs.readFileSync(filePath, 'utf8')
        console.log('Loaded system prompt from file:', filePath)
      }
    } catch (err) {
      console.error('Failed to read system prompt file:', err)
    }
  } else if (systemPromptArg) {
    systemPrompt = systemPromptArg.substring('--system-prompt='.length)
  }

  let imageUrls: string[] = []
  if (imageUrlsArg) {
    try {
      imageUrls = JSON.parse(imageUrlsArg.substring('--image-urls='.length))
      console.log('Parsed', imageUrls.length, 'image URLs')
    } catch (err) {
      console.error('Failed to parse --image-urls:', err)
    }
  }

  return { prompt, systemPrompt, cwd, model, imageUrls }
}

async function run() {
  console.log('========================================')
  console.log('CAPSULE AGENT - EXPO SANDBOX')
  console.log('========================================')
  console.log('Version: agent-package-v1')

  const args = parseArgs(process.argv)
  const { prompt, systemPrompt, cwd, model, imageUrls } = args

  // Load environment
  loadEnvFile('/claude-sdk/.env')

  console.log('Environment:')
  console.log('- Working directory:', cwd)
  console.log('- ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY)
  console.log('- Model:', model || 'default')

  // Ensure directory exists
  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd, { recursive: true })
  }

  const messages: SDKMessage[] = []
  const heartbeatInterval = setInterval(() => {
    console.log('Streaming: [Heartbeat - Agent is working...]')
  }, 30000)

  try {
    console.log('Streaming: Initializing AI Code Agent...')

    // Process images if provided
    let finalPrompt = prompt
    if (imageUrls.length > 0) {
      console.log('Processing', imageUrls.length, 'images...')
      const imagesDir = '/tmp/attached-images'
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true })
      }

      const downloadedPaths: string[] = []
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i]
        const ext = path.extname(new URL(url).pathname) || '.png'
        const destPath = path.join(imagesDir, `image-${i + 1}${ext}`)

        try {
          await downloadImage(url, destPath)
          downloadedPaths.push(destPath)
          console.log(`Image ${i + 1} saved:`, destPath)
        } catch (err) {
          console.error(`Failed to download image ${i + 1}:`, err)
        }
      }

      if (downloadedPaths.length > 0) {
        const imageRefs = downloadedPaths.map((p, i) => `- Image ${i + 1}: ${p}`).join('\n')
        finalPrompt = `The user has attached ${downloadedPaths.length} image(s):\n${imageRefs}\n\nUser request:\n${prompt}`
      }
    }

    for await (const message of query({
      prompt: finalPrompt,
      abortController: new AbortController(),
      options: {
        cwd,
        permissionMode: 'bypassPermissions',
        systemPrompt: systemPrompt
          ? { type: 'preset' as const, preset: 'claude_code' as const, append: systemPrompt }
          : { type: 'preset' as const, preset: 'claude_code' as const },
        settingSources: ['user', 'project'],
        // Allow all file manipulation tools plus Skill for user-defined skills
        // allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'Skill'],
        ...(model && { model }),
        hooks: {
          SessionEnd: [{ hooks: [sessionEndHook] }],
        },
      },
    })) {
      messages.push(message)

      // Filter out <think> tags before streaming (Claude's internal reasoning)
      const messageStr = JSON.stringify(message)
      if (messageStr.includes('<think>') || messageStr.includes('</think>')) {
        // Skip streaming messages containing think tags
        continue
      }

      console.log(`Streaming: ${messageStr}`)

      if (message.type === 'result') {
        if (message.subtype === 'success') {
          console.log('Streaming: Task completed successfully')
          console.log(`Streaming: Cost: $${message.total_cost_usd.toFixed(4)}, Duration: ${(message.duration_ms / 1000).toFixed(2)}s`)
        } else {
          console.log(`Streaming: Task failed: ${message.subtype}`)
        }
      }
    }

    console.log('CLAUDE_CODE_COMPLETE')
    console.log(JSON.stringify({ success: true, messages }, null, 2))
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ success: false, error: errorMessage }, null, 2))
    process.exit(1)
  } finally {
    clearInterval(heartbeatInterval)
  }
}

run()
