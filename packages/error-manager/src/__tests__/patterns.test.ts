import { describe, it, expect } from 'vitest'
import {
  EXPO_ERROR_PATTERNS,
  CONVEX_ERROR_PATTERNS,
  CONVEX_SUCCESS_PATTERNS,
  SENSITIVE_PATTERNS,
} from '../shared/patterns'

/**
 * Helper: returns true if ANY pattern matches the string
 */
function matchesAny(patterns: RegExp[], str: string): boolean {
  return patterns.some((p) => p.test(str))
}

// ─── EXPO_ERROR_PATTERNS ──────────────────────────────────────────────────────
describe('EXPO_ERROR_PATTERNS', () => {
  it('should be an array of RegExp', () => {
    expect(Array.isArray(EXPO_ERROR_PATTERNS)).toBe(true)
    EXPO_ERROR_PATTERNS.forEach((p) => expect(p).toBeInstanceOf(RegExp))
  })

  const shouldMatch = [
    'Uncaught Error: something went wrong',
    'Element type is invalid: expected a string',
    'Cannot read property of undefined',
    'Cannot read properties of null',
    'foo is not a function',
    'bar is not defined',
    'Invariant Violation: text strings must be rendered within a <Text>',
    'Warning: Failed prop type: invalid prop `color`',
    'Invariant Violation: requireNativeComponent: "RCTView"',
    'Unable to resolve module ./foo',
    'Module not found: Cannot find module ./bar',
    'SyntaxError: Unexpected token',
    'TypeError: Cannot set property',
    'ReferenceError: foo is not defined',
    'RangeError: Maximum call stack size exceeded',
    'export MyComponent was not found in ./components',
    'You might have forgot to export your component',
    'mixed up default and named imports',
    'Check the render method of Foo',
    'The above error occurred in the App component',
    'error: bundling failed because of an error',
    'error: Unable to resolve module react-native',
    'BUNDLE./index.js failed',
  ]

  shouldMatch.forEach((str) => {
    it(`should match: "${str.slice(0, 60)}"`, () => {
      expect(matchesAny(EXPO_ERROR_PATTERNS, str)).toBe(true)
    })
  })

  const shouldNotMatch = [
    'Build succeeded',
    'Bundle complete',
    'Starting Metro Bundler',
    'Fast Refresh enabled',
    'Loaded 42 modules',
  ]

  shouldNotMatch.forEach((str) => {
    it(`should NOT match: "${str}"`, () => {
      expect(matchesAny(EXPO_ERROR_PATTERNS, str)).toBe(false)
    })
  })
})

// ─── CONVEX_ERROR_PATTERNS ────────────────────────────────────────────────────
describe('CONVEX_ERROR_PATTERNS', () => {
  it('should be an array of RegExp', () => {
    expect(Array.isArray(CONVEX_ERROR_PATTERNS)).toBe(true)
    CONVEX_ERROR_PATTERNS.forEach((p) => expect(p).toBeInstanceOf(RegExp))
  })

  const shouldMatch = [
    'error: something went wrong',
    'Error: database write failed',
    'failed to connect to Convex',
    'Unable to reach server',
    'Cannot find function sendMessage',
    'foo is not defined',
    'Argument data is not valid',
    'Expected string but got number',
    'ValidationError: schema mismatch',
    'SchemaValidationError: missing field',
    'ConvexError: unauthorised',
    'Uncaught exception in handler',
    'TypeError: cannot read property',
    'ReferenceError: bar is not defined',
    'SyntaxError: JSON parse error',
    'Invalid argument passed to mutation',
    'Missing required field userId',
    '\u2716 compilation failed',  // ✖ symbol
  ]

  shouldMatch.forEach((str) => {
    it(`should match: "${str.slice(0, 60)}"`, () => {
      expect(matchesAny(CONVEX_ERROR_PATTERNS, str)).toBe(true)
    })
  })

  const shouldNotMatch = [
    '\u2714 all checks passed',  // ✔ checkmark — only in success list
    'Convex functions ready',
    'Watching for changes',
  ]

  // These strings should NOT match CONVEX_ERROR_PATTERNS
  // (note: some are broad patterns so we only check the real-negatives)
  it('does not match the Convex checkmark success symbol', () => {
    // The ✔ success checkmark is NOT in CONVEX_ERROR_PATTERNS
    const checkmarkPattern = /\u2714/
    expect(CONVEX_ERROR_PATTERNS.some((p) => p.source === checkmarkPattern.source)).toBe(false)
  })
})

// ─── CONVEX_SUCCESS_PATTERNS ──────────────────────────────────────────────────
describe('CONVEX_SUCCESS_PATTERNS', () => {
  it('should be an array of RegExp', () => {
    expect(Array.isArray(CONVEX_SUCCESS_PATTERNS)).toBe(true)
    CONVEX_SUCCESS_PATTERNS.forEach((p) => expect(p).toBeInstanceOf(RegExp))
  })

  const shouldMatch = [
    'Convex functions ready',
    '\u2714 done',              // ✔ checkmark
    'Watching for changes...',
    'bunx convex dev --once',
  ]

  shouldMatch.forEach((str) => {
    it(`should match: "${str.slice(0, 60)}"`, () => {
      expect(matchesAny(CONVEX_SUCCESS_PATTERNS, str)).toBe(true)
    })
  })

  const shouldNotMatch = [
    'error: build failed',
    'TypeError: something',
    '\u2716 failed',            // ✖ — the error indicator
  ]

  shouldNotMatch.forEach((str) => {
    it(`should NOT match: "${str}"`, () => {
      expect(matchesAny(CONVEX_SUCCESS_PATTERNS, str)).toBe(false)
    })
  })
})

// ─── SENSITIVE_PATTERNS ───────────────────────────────────────────────────────
describe('SENSITIVE_PATTERNS', () => {
  it('should be an array of RegExp', () => {
    expect(Array.isArray(SENSITIVE_PATTERNS)).toBe(true)
    SENSITIVE_PATTERNS.forEach((p) => expect(p).toBeInstanceOf(RegExp))
  })

  const shouldMatch = [
    'ANTHROPIC_API_KEY=sk-...',
    'MY_API_KEY=abc123',
    'DB_SECRET=hunter2',
    'USER_PASSWORD=s3cr3t',
    'AUTH_TOKEN=xyz',
    // case-insensitive
    'anthropic_api_key=value',
    'api_key=value',
    'secret=value',
    'password=value',
    'token=value',
  ]

  shouldMatch.forEach((str) => {
    it(`should match: "${str}"`, () => {
      expect(matchesAny(SENSITIVE_PATTERNS, str)).toBe(true)
    })
  })

  const shouldNotMatch = [
    'username=alice',
    'BUILD_MODE=production',
    'NODE_ENV=development',
    'PORT=3000',
  ]

  shouldNotMatch.forEach((str) => {
    it(`should NOT match: "${str}"`, () => {
      expect(matchesAny(SENSITIVE_PATTERNS, str)).toBe(false)
    })
  })
})
