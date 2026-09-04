/**
 * NOTE: getPromptWithCloudStatus uses require() internally (dynamic CJS require).
 * vitest resolves this via vi.mock + importActual so the require() calls are
 * intercepted by vitest's module registry, which understands .ts files.
 */
import { describe, it, expect, vi } from 'vitest'

// These mocks intercept the require('./prompts/system') and require('./prompts/convex')
// calls inside getPromptWithCloudStatus so vitest's ESM resolver handles them.
vi.mock('../prompts/system', async () => {
  return await vi.importActual('../prompts/system')
})
vi.mock('../prompts/convex', async () => {
  return await vi.importActual('../prompts/convex')
})

// Import AFTER the mocks are registered (vi.mock is hoisted, but explicit order helps readability)
import { getPromptWithCloudStatus, prompt, createSystemPrompt } from '../index'
import { convexGuidelines } from '../prompts/convex'

// ─── getPromptWithCloudStatus ─────────────────────────────────────────────────
describe('getPromptWithCloudStatus', () => {
  it('should return a non-empty string', () => {
    expect(typeof getPromptWithCloudStatus(false)).toBe('string')
    expect(getPromptWithCloudStatus(false).length).toBeGreaterThan(0)
  })

  it('should include Convex guidelines when cloudEnabled is true', () => {
    const result = getPromptWithCloudStatus(true)
    expect(result).toContain('convex')
  })

  it('should NOT include Convex guidelines when cloudEnabled is false', () => {
    const result = getPromptWithCloudStatus(false)
    expect(result).not.toContain('convex_guidelines')
  })

  it('should return a longer string when cloud is enabled', () => {
    const withCloud = getPromptWithCloudStatus(true)
    const withoutCloud = getPromptWithCloudStatus(false)
    expect(withCloud.length).toBeGreaterThan(withoutCloud.length)
  })

  it('cloud-enabled result should contain the base prompt', () => {
    const withoutCloud = getPromptWithCloudStatus(false)
    const withCloud = getPromptWithCloudStatus(true)
    expect(withCloud).toContain(withoutCloud.slice(0, 100))
  })

  it('should be deterministic — same output for same input', () => {
    expect(getPromptWithCloudStatus(true)).toBe(getPromptWithCloudStatus(true))
    expect(getPromptWithCloudStatus(false)).toBe(getPromptWithCloudStatus(false))
  })

  it('cloud result = base prompt + separator + convex guidelines', () => {
    const withCloud = getPromptWithCloudStatus(true)
    const withoutCloud = getPromptWithCloudStatus(false)
    expect(withCloud).toBe(prompt + '\n\n' + convexGuidelines)
    expect(withCloud).not.toContain('<cloud_disabled>')
  })
})

// ─── prompt export ────────────────────────────────────────────────────────────
describe('prompt (direct export)', () => {
  it('should be a non-empty string', () => {
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('should describe Capsule as a mobile app builder', () => {
    expect(prompt.toLowerCase()).toContain('capsule')
  })

  it('should mention Expo', () => {
    expect(prompt).toContain('Expo')
  })

  it('should mention React Native', () => {
    expect(prompt).toContain('React Native')
  })

  it('should keep the base prompt and add explicit cloud-disabled guidance', () => {
    expect(getPromptWithCloudStatus(false)).toContain(prompt)
    expect(getPromptWithCloudStatus(false)).toContain('<cloud_disabled>')
  })
})

// ─── createSystemPrompt ────────────────────────────────────────────────────────
describe('createSystemPrompt', () => {
  it('should be a function', () => {
    expect(typeof createSystemPrompt).toBe('function')
  })

  it('should return a non-empty string when called with no arguments', () => {
    const result = createSystemPrompt()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should return a string containing system content', () => {
    const result = createSystemPrompt()
    expect(result).toContain('system')
  })

  it('should accept a custom prodUrl in config', () => {
    const custom = createSystemPrompt({ prodUrl: 'https://my-custom-app.com' })
    expect(custom).toContain('https://my-custom-app.com')
  })

  it('should use the default prod URL when none is provided', () => {
    const result = createSystemPrompt()
    expect(result).toContain('reactnativevibecode.com')
  })

  it('should produce the same output as `prompt` when called with no args', () => {
    expect(createSystemPrompt()).toBe(prompt)
  })

  it('should be deterministic', () => {
    expect(createSystemPrompt()).toBe(createSystemPrompt())
  })
})
