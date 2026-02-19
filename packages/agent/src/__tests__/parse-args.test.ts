import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import { parseArgs } from '../utils/parse-args'

// We mock the fs module so parse-args can read system-prompt files without hitting disk
vi.mock('fs')

const mockedFs = vi.mocked(fs)

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseArgs', () => {
  // ── happy paths ────────────────────────────────────────────────────────────

  it('should parse a simple --prompt argument', () => {
    const result = parseArgs(['node', 'script.js', '--prompt=Hello world'])
    expect(result.prompt).toBe('Hello world')
  })

  it('should handle a prompt containing "=" signs', () => {
    const result = parseArgs(['node', 'script.js', '--prompt=a=b=c'])
    expect(result.prompt).toBe('a=b=c')
  })

  it('should parse --cwd', () => {
    const result = parseArgs(['node', 'script.js', '--prompt=hi', '--cwd=/tmp/project'])
    expect(result.cwd).toBe('/tmp/project')
  })

  it('should parse --model', () => {
    const result = parseArgs(['node', 'script.js', '--prompt=hi', '--model=claude-opus-4-5'])
    expect(result.model).toBe('claude-opus-4-5')
  })

  it('should parse --system-prompt', () => {
    const result = parseArgs(['node', 'script.js', '--prompt=hi', '--system-prompt=Be concise'])
    expect(result.systemPrompt).toBe('Be concise')
  })

  it('should parse --image-urls as a JSON array', () => {
    const urls = ['https://example.com/a.png', 'https://example.com/b.jpg']
    const result = parseArgs([
      'node',
      'script.js',
      '--prompt=hi',
      `--image-urls=${JSON.stringify(urls)}`,
    ])
    expect(result.imageUrls).toEqual(urls)
  })

  it('should default imageUrls to an empty array when not provided', () => {
    const result = parseArgs(['node', 'script.js', '--prompt=hi'])
    expect(result.imageUrls).toEqual([])
  })

  it('should parse all args together', () => {
    const result = parseArgs([
      'node',
      'script.js',
      '--prompt=Build an app',
      '--cwd=/home/user/project',
      '--model=claude-sonnet-4-5',
      '--system-prompt=You are an expert',
      '--image-urls=["https://img.test/1.png"]',
    ])
    expect(result.prompt).toBe('Build an app')
    expect(result.cwd).toBe('/home/user/project')
    expect(result.model).toBe('claude-sonnet-4-5')
    expect(result.systemPrompt).toBe('You are an expert')
    expect(result.imageUrls).toEqual(['https://img.test/1.png'])
  })

  // ── system-prompt-file ─────────────────────────────────────────────────────

  it('should load system prompt from a file when --system-prompt-file is given', () => {
    mockedFs.existsSync = vi.fn().mockReturnValue(true)
    mockedFs.readFileSync = vi.fn().mockReturnValue('You are a helpful assistant')

    const result = parseArgs([
      'node',
      'script.js',
      '--prompt=hi',
      '--system-prompt-file=/path/to/system.txt',
    ])
    expect(result.systemPrompt).toBe('You are a helpful assistant')
    expect(mockedFs.readFileSync).toHaveBeenCalledWith('/path/to/system.txt', 'utf8')
  })

  it('should leave systemPrompt undefined if --system-prompt-file does not exist', () => {
    mockedFs.existsSync = vi.fn().mockReturnValue(false)

    const result = parseArgs([
      'node',
      'script.js',
      '--prompt=hi',
      '--system-prompt-file=/nonexistent.txt',
    ])
    expect(result.systemPrompt).toBeUndefined()
  })

  it('should leave systemPrompt undefined if reading the file throws', () => {
    mockedFs.existsSync = vi.fn().mockReturnValue(true)
    mockedFs.readFileSync = vi.fn().mockImplementation(() => {
      throw new Error('permission denied')
    })

    const result = parseArgs([
      'node',
      'script.js',
      '--prompt=hi',
      '--system-prompt-file=/bad-file.txt',
    ])
    expect(result.systemPrompt).toBeUndefined()
  })

  // ── image-urls edge cases ──────────────────────────────────────────────────

  it('should handle invalid JSON for --image-urls gracefully (empty array fallback)', () => {
    const result = parseArgs([
      'node',
      'script.js',
      '--prompt=hi',
      '--image-urls=not-valid-json',
    ])
    // Should not throw; imageUrls stays as empty array
    expect(result.imageUrls).toEqual([])
  })

  // ── error case ─────────────────────────────────────────────────────────────

  it('should throw when --prompt is missing', () => {
    expect(() => parseArgs(['node', 'script.js', '--cwd=/tmp'])).toThrow(
      '--prompt argument is required'
    )
  })

  it('should throw when argv has only the executable (no args)', () => {
    expect(() => parseArgs(['node', 'script.js'])).toThrow('--prompt argument is required')
  })

  it('should throw when argv is empty', () => {
    expect(() => parseArgs([])).toThrow('--prompt argument is required')
  })

  // ── optional fields are undefined when absent ──────────────────────────────

  it('cwd should be undefined when not provided', () => {
    const result = parseArgs(['node', 'script.js', '--prompt=hi'])
    expect(result.cwd).toBeUndefined()
  })

  it('model should be undefined when not provided', () => {
    const result = parseArgs(['node', 'script.js', '--prompt=hi'])
    expect(result.model).toBeUndefined()
  })

  it('systemPrompt should be undefined when not provided', () => {
    const result = parseArgs(['node', 'script.js', '--prompt=hi'])
    expect(result.systemPrompt).toBeUndefined()
  })
})
