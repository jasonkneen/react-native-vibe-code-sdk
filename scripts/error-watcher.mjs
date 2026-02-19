#!/usr/bin/env node
/**
 * Error Watcher — auto-detects build/TS errors and spawns Claude to fix them.
 *
 * Usage (two modes):
 *   1. Pipe mode:  pnpm dev 2>&1 | tee /tmp/rn-vibe-dev.log | node scripts/error-watcher.mjs
 *   2. File mode:  node scripts/error-watcher.mjs --log /tmp/rn-vibe-dev.log
 *   3. Typecheck:  node scripts/error-watcher.mjs --typecheck (polls pnpm type-check every 60s)
 */

import { spawn, execSync } from 'child_process'
import { createInterface } from 'readline'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = resolve(__dirname, '..')

// ── Error patterns to watch for ─────────────────────────────────────────────
const TS_ERROR_PATTERNS = [
  // TypeScript compiler errors
  /error TS\d+:/i,
  /DTS Build failed/i,
  /RollupError:/i,
  /\[plugin dts\].*Failed to compile/i,
  /Failed to compile\. Check the logs/i,
  /Module .* has no exported member/i,
  /does not exist in type/i,
  /is not assignable to type/i,
  /Cannot find module/i,
  /Object literal may only specify known properties/i,
  // Turbopack / Next.js bundler errors (NOT caught by tsc)
  /Export .* doesn't exist in target module/i,
  /The export .* was not found in module/i,
  /was not found in module/i,
  /does not provide an export named/i,
  /SyntaxError:.*unexpected token/i,
  /Module build failed/i,
  /Failed to resolve import/i,
  /Cannot find export/i,
]

const RUNTIME_ERROR_PATTERNS = [
  /\[PreviewPanel\] Failed to/i,
  /\[Sandbox\] Failed to/i,
  /\[Git Commits\] Error/i,
  /Uncaught.*Error:/i,
]

const IGNORE_PATTERNS = [
  /node_modules/,
  /warning/i,
  /\.d\.ts/,
  /DTS Build start/,
  /Build success/,
]

// ── State ────────────────────────────────────────────────────────────────────
let errorBuffer = []
let contextBuffer = [] // last N lines for context
let debounceTimer = null
let isFixing = false
let fixCount = 0
const DEBOUNCE_MS = 6000   // wait 6s after last error before firing
const CONTEXT_LINES = 20   // lines of context to include
const MAX_BUFFER = 100     // max error lines before forced flush

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) {
  console.error(`[watcher] ${msg}`)
}

function isError(line) {
  if (IGNORE_PATTERNS.some(p => p.test(line))) return false
  return TS_ERROR_PATTERNS.some(p => p.test(line)) ||
         RUNTIME_ERROR_PATTERNS.some(p => p.test(line))
}

function notify(text) {
  try {
    execSync(`openclaw system event --text ${JSON.stringify(text)} --mode now`, {
      stdio: 'ignore',
      timeout: 5000,
    })
  } catch {
    // openclaw not reachable — that's fine
  }
}

async function spawnFix(errors) {
  if (isFixing) {
    log('Fix already in progress, buffering...')
    return
  }
  isFixing = true
  fixCount++

  const errorText = errors.join('\n')
  const prompt = `You are fixing TypeScript and build errors in a monorepo.

Project directory: ${PROJECT_DIR}

## Errors detected in dev server output:
${errorText}

## Instructions:
- Read the error messages carefully, identify the exact file(s) and line numbers
- Make the minimal fix needed (add missing exports, fix type mismatches, remove invalid properties, etc.)
- Do NOT modify node_modules, dist/, or .next/
- Do NOT change unrelated code
- After fixing, run: pnpm type-check --filter=<package> to verify (if applicable)
- When completely done, run: openclaw system event --text "Auto-fix #${fixCount} complete: <1-line summary of what was fixed>" --mode now

Fix the errors now.`

  log(`Spawning Claude fix agent for ${errors.length} error line(s)...`)

  const child = spawn('claude', ['--dangerously-skip-permissions', prompt], {
    cwd: PROJECT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PATH: process.env.PATH },
  })

  child.stdout.on('data', d => process.stdout.write(d))
  child.stderr.on('data', d => process.stderr.write(d))

  child.on('exit', (code) => {
    log(`Fix agent exited (code=${code})`)
    isFixing = false
    errorBuffer = []
  })

  child.on('error', (err) => {
    log(`Failed to spawn Claude: ${err.message}`)
    isFixing = false
  })
}

function schedulefix() {
  clearTimeout(debounceTimer)
  if (errorBuffer.length >= MAX_BUFFER) {
    // Force flush immediately if buffer is full
    spawnFix([...errorBuffer])
    return
  }
  debounceTimer = setTimeout(() => {
    if (errorBuffer.length > 0 && !isFixing) {
      spawnFix([...errorBuffer])
    }
  }, DEBOUNCE_MS)
}

function processLine(line) {
  // Keep rolling context
  contextBuffer.push(line)
  if (contextBuffer.length > CONTEXT_LINES) contextBuffer.shift()

  if (isError(line)) {
    // Include some context lines before the error
    const context = contextBuffer.slice(-5).join('\n')
    if (!errorBuffer.includes(context)) {
      errorBuffer.push(context)
    }
    schedulefix()
  }
}

// ── Mode: stdin pipe ─────────────────────────────────────────────────────────
function runPipeMode() {
  log('Running in pipe mode (reading from stdin)...')
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
  rl.on('line', (line) => {
    // Also forward the line to stdout so terminal still shows dev output
    process.stdout.write(line + '\n')
    processLine(line)
  })
  rl.on('close', () => {
    log('stdin closed')
    process.exit(0)
  })
}

// ── Mode: tail log file ───────────────────────────────────────────────────────
function runFileMode(logFile) {
  log(`Tailing log file: ${logFile}`)

  async function waitForFile() {
    while (!existsSync(logFile)) {
      log(`Waiting for ${logFile}...`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  waitForFile().then(() => {
    const tail = spawn('tail', ['-n', '0', '-f', logFile], { stdio: ['ignore', 'pipe', 'ignore'] })
    const rl = createInterface({ input: tail.stdout })
    rl.on('line', processLine)
    process.on('SIGTERM', () => { tail.kill(); process.exit(0) })
    process.on('SIGINT', () => { tail.kill(); process.exit(0) })
  })
}

// ── Mode: periodic typecheck ─────────────────────────────────────────────────
async function runTypecheckMode(intervalSec = 60) {
  log(`Running periodic type-check every ${intervalSec}s...`)

  async function runCheck() {
    if (isFixing) return

    // Run tsc directly in web app (bypasses Turborepo cache — always fresh)
    // Also catches errors that Turbopack surfaces but tsc misses via cache
    const checks = [
      { label: 'web tsc', cmd: 'npx tsc --noEmit 2>&1', cwd: `${PROJECT_DIR}/apps/web` },
      { label: 'packages tsc', cmd: 'pnpm type-check --force 2>&1', cwd: PROJECT_DIR },
    ]

    for (const check of checks) {
      if (isFixing) break
      try {
        log(`Running ${check.label}...`)
        execSync(check.cmd, { cwd: check.cwd, timeout: 120_000, encoding: 'utf8' })
        log(`${check.label} clean ✓`)
      } catch (err) {
        const output = (err.stdout || '') + (err.stderr || '')
        const errorLines = output
          .split('\n')
          .filter(l => TS_ERROR_PATTERNS.some(p => p.test(l)))

        if (errorLines.length > 0) {
          log(`${check.label} found ${errorLines.length} error(s)`)
          errorBuffer = [output.slice(0, 8000)]
          spawnFix([...errorBuffer])
          break // fix one batch at a time
        }
      }
    }

    // Also tail dev log for Turbopack-specific errors if it exists
    if (existsSync('/tmp/rn-vibe-dev.log')) {
      try {
        const recentLog = execSync('tail -n 50 /tmp/rn-vibe-dev.log 2>/dev/null', { encoding: 'utf8' })
        const turboErrors = recentLog
          .split('\n')
          .filter(l => TS_ERROR_PATTERNS.some(p => p.test(l)) && !IGNORE_PATTERNS.some(p => p.test(l)))
        if (turboErrors.length > 0 && !isFixing) {
          log(`Dev log has ${turboErrors.length} Turbopack error(s)`)
          errorBuffer = [recentLog.slice(0, 8000)]
          spawnFix([...errorBuffer])
        }
      } catch { /* ignore */ }
    }
  }

  await runCheck()
  setInterval(runCheck, intervalSec * 1000)
}

// ── Entry point ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const logFlag = args.indexOf('--log')
const typecheckFlag = args.includes('--typecheck')
const intervalFlag = args.indexOf('--interval')
const intervalSec = intervalFlag >= 0 ? parseInt(args[intervalFlag + 1]) || 60 : 60

if (typecheckFlag) {
  runTypecheckMode(intervalSec)
} else if (logFlag >= 0) {
  runFileMode(args[logFlag + 1])
} else if (!process.stdin.isTTY) {
  runPipeMode()
} else {
  console.error(`Usage:
  pnpm dev 2>&1 | tee /tmp/rn-vibe-dev.log | node scripts/error-watcher.mjs
  node scripts/error-watcher.mjs --log /tmp/rn-vibe-dev.log
  node scripts/error-watcher.mjs --typecheck [--interval 60]
`)
  process.exit(1)
}
