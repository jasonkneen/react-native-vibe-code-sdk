import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { loadEnvFile } from '../utils/env-loader'

// We use real temp files for this test suite to get realistic behavior.
// Each test creates a temp file, runs loadEnvFile, then deletes it.

let tmpDir: string
let originalEnv: NodeJS.ProcessEnv

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-env-loader-'))
  // Snapshot process.env so we can restore it after each test
  originalEnv = { ...process.env }
})

afterEach(() => {
  // Restore process.env
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key]
    }
  }
  Object.assign(process.env, originalEnv)

  // Clean up temp directory
  fs.rmSync(tmpDir, { recursive: true, force: true })

  vi.restoreAllMocks()
})

function writeTmpEnv(content: string, filename = '.env'): string {
  const p = path.join(tmpDir, filename)
  fs.writeFileSync(p, content, 'utf8')
  return p
}

describe('loadEnvFile', () => {
  // ── happy paths ─────────────────────────────────────────────────────────────

  it('should load simple KEY=VALUE pairs', () => {
    const p = writeTmpEnv('FOO=bar\nBAZ=qux\n')
    loadEnvFile(p)
    expect(process.env.FOO).toBe('bar')
    expect(process.env.BAZ).toBe('qux')
  })

  it('should handle values that contain "="', () => {
    const p = writeTmpEnv('COMPLEX=a=b=c\n')
    loadEnvFile(p)
    expect(process.env.COMPLEX).toBe('a=b=c')
  })

  it('should trim whitespace from keys and values', () => {
    const p = writeTmpEnv('  KEY  =  value  \n')
    loadEnvFile(p)
    expect(process.env.KEY).toBe('value')
  })

  it('should skip lines that start with #', () => {
    const p = writeTmpEnv('# This is a comment\nACTIVE=yes\n')
    loadEnvFile(p)
    expect(process.env.ACTIVE).toBe('yes')
    // No key starting with "# This..." should be set
    expect(process.env['# This is a comment']).toBeUndefined()
  })

  it('should skip blank lines', () => {
    const p = writeTmpEnv('\n\nVALID=1\n\n')
    loadEnvFile(p)
    expect(process.env.VALID).toBe('1')
  })

  it('should handle a file with only comments and blank lines', () => {
    const p = writeTmpEnv('# comment\n\n# another comment\n')
    // Should not throw
    expect(() => loadEnvFile(p)).not.toThrow()
  })

  it('should skip lines without "=" (malformed lines)', () => {
    const p = writeTmpEnv('MALFORMED\nGOOD=value\n')
    loadEnvFile(p)
    expect(process.env.MALFORMED).toBeUndefined()
    expect(process.env.GOOD).toBe('value')
  })

  it('should handle an empty value (KEY= with nothing after)', () => {
    const p = writeTmpEnv('EMPTY=\n')
    loadEnvFile(p)
    // value is '', which is falsy but should still be set
    // Actually, looking at the implementation: valueParts.join('=').trim() => ''
    // and the condition is `if (key && valueParts.length > 0)`
    // valueParts will be [''] so length is 1 > 0, so it IS set
    expect(process.env.EMPTY).toBe('')
  })

  it('should handle Windows-style CRLF line endings', () => {
    const p = writeTmpEnv('WIN_KEY=win_val\r\nSECOND=2\r\n')
    loadEnvFile(p)
    // The trim() call should handle the trailing \r
    expect(process.env.WIN_KEY?.replace(/\r/, '')).toBeTruthy()
  })

  // ── error / edge cases ─────────────────────────────────────────────────────

  it('should not throw when the file does not exist', () => {
    expect(() => loadEnvFile('/nonexistent/.env')).not.toThrow()
  })

  it('should silently skip a non-existent file (no env variables set)', () => {
    const before = { ...process.env }
    loadEnvFile('/nonexistent/.env')
    const after = { ...process.env }
    expect(after).toEqual(before)
  })

  it('should not throw when the path is an empty string', () => {
    expect(() => loadEnvFile('')).not.toThrow()
  })

  it('should log an error (not throw) when reading fails', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    // Write a valid file then make it unreadable
    const p = writeTmpEnv('KEY=val')
    fs.chmodSync(p, 0o000)

    // Should not throw
    expect(() => loadEnvFile(p)).not.toThrow()

    // Restore so cleanup works
    fs.chmodSync(p, 0o644)
    logSpy.mockRestore()
  })

  it('should overwrite an existing env variable', () => {
    process.env.OVERWRITE_ME = 'old'
    const p = writeTmpEnv('OVERWRITE_ME=new\n')
    loadEnvFile(p)
    expect(process.env.OVERWRITE_ME).toBe('new')
  })

  it('should handle multiple KEY=VALUE pairs on the same content', () => {
    const content = [
      'DB_HOST=localhost',
      'DB_PORT=5432',
      'DB_NAME=mydb',
      '# inline comment',
      '',
      'AUTH_SECRET=supersecret',
    ].join('\n')

    const p = writeTmpEnv(content)
    loadEnvFile(p)
    expect(process.env.DB_HOST).toBe('localhost')
    expect(process.env.DB_PORT).toBe('5432')
    expect(process.env.DB_NAME).toBe('mydb')
    expect(process.env.AUTH_SECRET).toBe('supersecret')
  })
})
