/**
 * Local Sandbox — drop-in replacement for E2B Sandbox when running in local mode.
 *
 * Provides the same interface as the E2B Sandbox for file operations and commands,
 * but executes everything on the host machine's filesystem.
 */

import { exec, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { getLocalProjectAppDir, getLocalExpoPort } from './sandbox-mode'

const execAsync = promisify(exec)

// Track running Expo processes per project
const expoProcesses = new Map<string, ChildProcess>()

export interface LocalCommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface LocalFileInfo {
  name: string
  type: 'file' | 'dir'
  path: string
}

/**
 * A local sandbox that mimics the E2B Sandbox API.
 * Runs commands and file operations on the local filesystem.
 */
export class LocalSandbox {
  public readonly sandboxId: string
  private readonly appDir: string

  constructor(projectId: string) {
    // Use 'local-{projectId}' as a deterministic "sandbox ID"
    this.sandboxId = `local-${projectId}`
    this.appDir = getLocalProjectAppDir(projectId)
  }

  /**
   * Get the host URL for a given port (for preview iframe).
   */
  getHost(port: number): string {
    return `localhost:${port}`
  }

  /**
   * Commands namespace — run shell commands in the project directory.
   */
  commands = {
    run: async (
      command: string,
      options?: { timeoutMs?: number; cwd?: string }
    ): Promise<LocalCommandResult> => {
      const cwd = options?.cwd || this.appDir
      const timeout = options?.timeoutMs || 30000

      try {
        // Ensure directory exists
        await fs.mkdir(cwd, { recursive: true })

        // Replace sandbox paths with local paths
        const localCommand = command
          .replace(/\/home\/user\/app/g, this.appDir)
          .replace(/\/home\/user/g, path.dirname(this.appDir))

        const { stdout, stderr } = await execAsync(localCommand, {
          cwd,
          timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB
          env: {
            ...process.env,
            HOME: path.dirname(this.appDir),
          },
        })

        return { exitCode: 0, stdout: stdout || '', stderr: stderr || '' }
      } catch (error: any) {
        return {
          exitCode: error.code || 1,
          stdout: error.stdout || '',
          stderr: error.stderr || error.message || '',
        }
      }
    },
  }

  /**
   * Files namespace — read/write files in the project directory.
   */
  files = {
    read: async (filePath: string): Promise<string> => {
      const resolvedPath = this.resolvePath(filePath)
      return fs.readFile(resolvedPath, 'utf-8')
    },

    write: async (filePath: string, content: string): Promise<void> => {
      const resolvedPath = this.resolvePath(filePath)
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true })
      await fs.writeFile(resolvedPath, content, 'utf-8')
    },

    list: async (dirPath: string): Promise<LocalFileInfo[]> => {
      const resolvedPath = this.resolvePath(dirPath)
      try {
        const entries = await fs.readdir(resolvedPath, { withFileTypes: true })
        return entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? 'dir' as const : 'file' as const,
          path: path.join(dirPath, entry.name),
        }))
      } catch {
        return []
      }
    },

    makeDir: async (dirPath: string): Promise<void> => {
      const resolvedPath = this.resolvePath(dirPath)
      await fs.mkdir(resolvedPath, { recursive: true })
    },

    exists: async (filePath: string): Promise<boolean> => {
      const resolvedPath = this.resolvePath(filePath)
      try {
        await fs.access(resolvedPath)
        return true
      } catch {
        return false
      }
    },

    remove: async (filePath: string): Promise<void> => {
      const resolvedPath = this.resolvePath(filePath)
      await fs.rm(resolvedPath, { recursive: true, force: true })
    },
  }

  /**
   * Resolve a sandbox path to a local path.
   * /home/user/app/... → {appDir}/...
   * Relative paths → {appDir}/{path}
   */
  private resolvePath(filePath: string): string {
    if (filePath.startsWith('/home/user/app')) {
      return filePath.replace('/home/user/app', this.appDir)
    }
    if (filePath.startsWith('/home/user')) {
      return filePath.replace('/home/user', path.dirname(this.appDir))
    }
    if (filePath.startsWith('/claude-sdk')) {
      // Claude SDK files go in a temp directory alongside the app
      const sdkDir = path.join(path.dirname(this.appDir), '.claude-sdk')
      return filePath.replace('/claude-sdk', sdkDir)
    }
    if (path.isAbsolute(filePath)) {
      return filePath
    }
    return path.join(this.appDir, filePath)
  }

  /**
   * Start the Expo dev server for this project.
   */
  async startExpoServer(): Promise<{ url: string }> {
    const port = getLocalExpoPort()
    const url = `http://localhost:${port}`

    // Check if already running
    if (expoProcesses.has(this.sandboxId)) {
      return { url }
    }

    // Check if Expo is already running on the port
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 200) {
        console.log(`[LocalSandbox] Expo already running on port ${port}`)
        return { url }
      }
    } catch {
      // Not running, start it
    }

    console.log(`[LocalSandbox] Starting Expo dev server on port ${port} from ${this.appDir}`)

    const expoProcess = spawn('npx', ['expo', 'start', '--web', '--port', String(port)], {
      cwd: this.appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        BROWSER: 'none', // Don't open browser
        PORT: String(port),
      },
      detached: false,
    })

    expoProcesses.set(this.sandboxId, expoProcess)

    expoProcess.stdout?.on('data', (data: Buffer) => {
      console.log(`[LocalSandbox:expo] ${data.toString().trim()}`)
    })

    expoProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      if (msg) console.error(`[LocalSandbox:expo:err] ${msg}`)
    })

    expoProcess.on('exit', (code) => {
      console.log(`[LocalSandbox] Expo process exited with code ${code}`)
      expoProcesses.delete(this.sandboxId)
    })

    // Wait for the server to be ready (poll for up to 60s)
    const startTime = Date.now()
    while (Date.now() - startTime < 60000) {
      try {
        const response = await fetch(url)
        if (response.ok || response.status === 200) {
          console.log(`[LocalSandbox] Expo dev server ready on ${url}`)
          return { url }
        }
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, 1000))
    }

    console.warn(`[LocalSandbox] Expo server didn't respond in 60s, returning URL anyway`)
    return { url }
  }

  /**
   * Stop the Expo dev server for this project.
   */
  async stopExpoServer(): Promise<void> {
    const proc = expoProcesses.get(this.sandboxId)
    if (proc) {
      proc.kill('SIGTERM')
      expoProcesses.delete(this.sandboxId)
      console.log(`[LocalSandbox] Stopped Expo server for ${this.sandboxId}`)
    }
  }

  /**
   * Check if a local project directory exists and has content.
   */
  async isInitialized(): Promise<boolean> {
    try {
      const entries = await fs.readdir(this.appDir)
      return entries.length > 0
    } catch {
      return false
    }
  }

  /**
   * Initialize a new project by copying the template.
   */
  async initializeFromTemplate(templateDir?: string): Promise<void> {
    await fs.mkdir(this.appDir, { recursive: true })

    const source = templateDir || path.resolve(
      process.cwd(),
      'packages/sandbox/local-expo-app'
    )

    // Check if template exists
    try {
      await fs.access(source)
    } catch {
      console.warn(`[LocalSandbox] Template not found at ${source}, creating minimal project`)
      await this.createMinimalProject()
      return
    }

    // Copy template to project directory
    await this.copyDir(source, this.appDir)

    // Install dependencies
    console.log(`[LocalSandbox] Installing dependencies in ${this.appDir}...`)
    await this.commands.run('npm install', { timeoutMs: 120000 })

    console.log(`[LocalSandbox] Project initialized at ${this.appDir}`)
  }

  private async createMinimalProject(): Promise<void> {
    // Create a minimal Expo project structure
    const packageJson = {
      name: 'local-expo-app',
      version: '1.0.0',
      main: 'expo-router/entry',
      scripts: {
        start: 'expo start',
        web: 'expo start --web',
      },
      dependencies: {
        expo: '~52.0.0',
        'expo-router': '~4.0.0',
        react: '^18.0.0',
        'react-dom': '^18.0.0',
        'react-native': '0.76.0',
        'react-native-web': '~0.19.0',
      },
    }

    const appIndex = `import { View, Text, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to your app!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontWeight: 'bold' },
});
`

    const layout = `import { Stack } from 'expo-router';

export default function Layout() {
  return <Stack />;
}
`

    await fs.mkdir(path.join(this.appDir, 'app'), { recursive: true })
    await fs.writeFile(path.join(this.appDir, 'package.json'), JSON.stringify(packageJson, null, 2))
    await fs.writeFile(path.join(this.appDir, 'app/index.tsx'), appIndex)
    await fs.writeFile(path.join(this.appDir, 'app/_layout.tsx'), layout)
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      // Skip node_modules and .git
      if (entry.name === 'node_modules' || entry.name === '.git') continue

      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    }
  }
}

/**
 * Get or create a local sandbox for a project.
 */
const sandboxCache = new Map<string, LocalSandbox>()

export function getLocalSandbox(projectId: string): LocalSandbox {
  let sandbox = sandboxCache.get(projectId)
  if (!sandbox) {
    sandbox = new LocalSandbox(projectId)
    sandboxCache.set(projectId, sandbox)
  }
  return sandbox
}

/**
 * Connect to an existing local sandbox by its sandbox ID.
 * (Mimics Sandbox.connect() from E2B)
 */
export function connectLocalSandbox(sandboxId: string): LocalSandbox {
  // Extract projectId from 'local-{projectId}'
  const projectId = sandboxId.replace(/^local-/, '')
  return getLocalSandbox(projectId)
}
