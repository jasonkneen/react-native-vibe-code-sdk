import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ErrorTracker, extractErrorDetails } from '../server/error-tracker'
import type { SandboxErrorContext } from '../shared/types'

// Silence console.error output during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  ErrorTracker.clearErrors()
})

// ─── ErrorTracker ─────────────────────────────────────────────────────────────
describe('ErrorTracker', () => {
  // Helper: build a minimal SandboxErrorContext
  function makeContext(overrides: Partial<SandboxErrorContext> = {}): SandboxErrorContext {
    return {
      operation: 'test_op',
      timestamp: new Date().toISOString(),
      ...overrides,
    }
  }

  describe('initial state', () => {
    it('should start with zero errors', () => {
      expect(ErrorTracker.getAllErrors()).toHaveLength(0)
    })

    it('getErrorStats should reflect empty state', () => {
      const stats = ErrorTracker.getErrorStats()
      expect(stats.totalErrors).toBe(0)
      expect(stats.errorsByType).toEqual({})
      expect(stats.errorsByOperation).toEqual({})
      expect(stats.recentErrors).toHaveLength(0)
    })
  })

  describe('trackError', () => {
    it('should add a single error', () => {
      ErrorTracker.trackError(makeContext({ errorType: 'TypeError' }))
      expect(ErrorTracker.getAllErrors()).toHaveLength(1)
    })

    it('should add multiple errors', () => {
      ErrorTracker.trackError(makeContext())
      ErrorTracker.trackError(makeContext())
      ErrorTracker.trackError(makeContext())
      expect(ErrorTracker.getAllErrors()).toHaveLength(3)
    })

    it('should store all context fields', () => {
      const ctx = makeContext({
        projectId: 'proj-1',
        sandboxId: 'sb-1',
        errorType: 'ReferenceError',
        errorMessage: 'foo is not defined',
        operation: 'execution',
      })
      ErrorTracker.trackError(ctx)
      const stored = ErrorTracker.getAllErrors()[0]!
      expect(stored.projectId).toBe('proj-1')
      expect(stored.sandboxId).toBe('sb-1')
      expect(stored.errorType).toBe('ReferenceError')
      expect(stored.errorMessage).toBe('foo is not defined')
    })

    it('should cap at MAX_ERRORS (100) and keep the most recent', () => {
      for (let i = 0; i < 110; i++) {
        ErrorTracker.trackError(makeContext({ errorMessage: `error-${i}` }))
      }
      const all = ErrorTracker.getAllErrors()
      expect(all).toHaveLength(100)
      // The last tracked error should be present
      expect(all[all.length - 1]!.errorMessage).toBe('error-109')
      // The first tracked error should have been dropped
      expect(all[0]!.errorMessage).toBe('error-10')
    })

    it('getAllErrors returns a copy, not the internal array', () => {
      ErrorTracker.trackError(makeContext())
      const copy = ErrorTracker.getAllErrors()
      copy.push(makeContext())
      expect(ErrorTracker.getAllErrors()).toHaveLength(1)
    })
  })

  describe('trackSandboxTermination', () => {
    it('should track an Error instance with correct fields', () => {
      const err = new Error('sandbox terminated')
      ErrorTracker.trackSandboxTermination(err, { projectId: 'proj-1' })
      const all = ErrorTracker.getAllErrors()
      expect(all).toHaveLength(1)
      expect(all[0]!.errorMessage).toBe('sandbox terminated')
      expect(all[0]!.errorType).toBe('Error')
      expect(all[0]!.projectId).toBe('proj-1')
      expect(all[0]!.operation).toBe('sandbox_execution')
    })

    it('should add likelyCauses when error message contains "terminated"', () => {
      const err = new Error('sandbox terminated unexpectedly')
      ErrorTracker.trackSandboxTermination(err, {})
      const stored = ErrorTracker.getAllErrors()[0]!
      const causes = stored.additionalContext?.likelyCauses as string[] | undefined
      expect(causes).toBeDefined()
      expect(causes!.length).toBeGreaterThan(0)
    })

    it('should NOT add likelyCauses when message does not contain "terminated"', () => {
      const err = new Error('connection refused')
      ErrorTracker.trackSandboxTermination(err, {})
      const stored = ErrorTracker.getAllErrors()[0]!
      expect(stored.additionalContext?.likelyCauses).toBeUndefined()
    })

    it('should handle a non-Error object', () => {
      ErrorTracker.trackSandboxTermination({ message: 'oops', code: 42 }, {})
      const stored = ErrorTracker.getAllErrors()[0]!
      expect(stored.errorMessage).toBe('[object Object]')
    })

    it('should handle a string error', () => {
      ErrorTracker.trackSandboxTermination('plain string error', {})
      const stored = ErrorTracker.getAllErrors()[0]!
      expect(stored.errorMessage).toBe('plain string error')
    })

    it('should extract errorCode from error object', () => {
      const err = Object.assign(new Error('err'), { code: 'ECONNREFUSED' })
      ErrorTracker.trackSandboxTermination(err, {})
      const stored = ErrorTracker.getAllErrors()[0]!
      expect(stored.errorCode).toBe('ECONNREFUSED')
    })
  })

  describe('getProjectErrors', () => {
    it('should return only errors for the given projectId', () => {
      ErrorTracker.trackError(makeContext({ projectId: 'proj-A' }))
      ErrorTracker.trackError(makeContext({ projectId: 'proj-B' }))
      ErrorTracker.trackError(makeContext({ projectId: 'proj-A' }))
      expect(ErrorTracker.getProjectErrors('proj-A')).toHaveLength(2)
      expect(ErrorTracker.getProjectErrors('proj-B')).toHaveLength(1)
      expect(ErrorTracker.getProjectErrors('proj-X')).toHaveLength(0)
    })
  })

  describe('getSandboxErrors', () => {
    it('should return only errors for the given sandboxId', () => {
      ErrorTracker.trackError(makeContext({ sandboxId: 'sb-1' }))
      ErrorTracker.trackError(makeContext({ sandboxId: 'sb-2' }))
      expect(ErrorTracker.getSandboxErrors('sb-1')).toHaveLength(1)
      expect(ErrorTracker.getSandboxErrors('sb-2')).toHaveLength(1)
      expect(ErrorTracker.getSandboxErrors('sb-99')).toHaveLength(0)
    })
  })

  describe('getErrorStats', () => {
    it('should correctly count errors by type and operation', () => {
      ErrorTracker.trackError(makeContext({ errorType: 'TypeError', operation: 'read' }))
      ErrorTracker.trackError(makeContext({ errorType: 'TypeError', operation: 'write' }))
      ErrorTracker.trackError(makeContext({ errorType: 'SyntaxError', operation: 'read' }))

      const stats = ErrorTracker.getErrorStats()
      expect(stats.totalErrors).toBe(3)
      expect(stats.errorsByType['TypeError']).toBe(2)
      expect(stats.errorsByType['SyntaxError']).toBe(1)
      expect(stats.errorsByOperation['read']).toBe(2)
      expect(stats.errorsByOperation['write']).toBe(1)
    })

    it('should include up to 10 recent errors', () => {
      for (let i = 0; i < 15; i++) {
        ErrorTracker.trackError(makeContext({ errorMessage: `msg-${i}` }))
      }
      const stats = ErrorTracker.getErrorStats()
      expect(stats.recentErrors).toHaveLength(10)
      expect(stats.recentErrors[9]!.errorMessage).toBe('msg-14')
    })

    it('should use "Unknown" for missing errorType / operation fields', () => {
      // operation is required, but errorType can be undefined
      ErrorTracker.trackError({
        operation: 'test',
        timestamp: new Date().toISOString(),
        // no errorType
      })
      const stats = ErrorTracker.getErrorStats()
      expect(stats.errorsByType['Unknown']).toBe(1)
    })
  })

  describe('clearErrors', () => {
    it('should remove all errors', () => {
      ErrorTracker.trackError(makeContext())
      ErrorTracker.trackError(makeContext())
      ErrorTracker.clearErrors()
      expect(ErrorTracker.getAllErrors()).toHaveLength(0)
    })
  })

  describe('clearProjectErrors', () => {
    it('should remove only errors with the given projectId', () => {
      ErrorTracker.trackError(makeContext({ projectId: 'proj-A' }))
      ErrorTracker.trackError(makeContext({ projectId: 'proj-B' }))
      ErrorTracker.clearProjectErrors('proj-A')
      const all = ErrorTracker.getAllErrors()
      expect(all).toHaveLength(1)
      expect(all[0]!.projectId).toBe('proj-B')
    })
  })

  describe('clearSandboxErrors', () => {
    it('should remove only errors with the given sandboxId', () => {
      ErrorTracker.trackError(makeContext({ sandboxId: 'sb-1' }))
      ErrorTracker.trackError(makeContext({ sandboxId: 'sb-2' }))
      ErrorTracker.clearSandboxErrors('sb-1')
      const all = ErrorTracker.getAllErrors()
      expect(all).toHaveLength(1)
      expect(all[0]!.sandboxId).toBe('sb-2')
    })
  })
})

// ─── extractErrorDetails ──────────────────────────────────────────────────────
describe('extractErrorDetails', () => {
  it('should handle a standard Error', () => {
    const err = new Error('something broke')
    const details = extractErrorDetails(err)
    expect(details.type).toBe('Error')
    expect(details.message).toBe('something broke')
    expect(details.stack).toContain('Error: something broke')
  })

  it('should handle a TypeError subclass', () => {
    const err = new TypeError('bad type')
    const details = extractErrorDetails(err)
    expect(details.type).toBe('TypeError')
    expect(details.message).toBe('bad type')
  })

  it('should extract code from an Error with a code property', () => {
    const err = Object.assign(new Error('fs error'), { code: 'ENOENT' })
    const details = extractErrorDetails(err)
    expect(details.code).toBe('ENOENT')
  })

  it('should extract details from an Error with a details property', () => {
    const err = Object.assign(new Error('validation'), { details: { field: 'name' } })
    const details = extractErrorDetails(err)
    expect(details.details).toEqual({ field: 'name' })
  })

  it('should extract response from an Error with a response property', () => {
    const err = Object.assign(new Error('http error'), { response: { status: 500 } })
    const details = extractErrorDetails(err)
    expect(details.details).toEqual({ status: 500 })
  })

  it('should extract data from an Error with a data property', () => {
    const err = Object.assign(new Error('data error'), { data: { payload: 'x' } })
    const details = extractErrorDetails(err)
    expect(details.details).toEqual({ payload: 'x' })
  })

  it('should handle a plain object error', () => {
    const err = { message: 'obj error', code: 404 }
    const details = extractErrorDetails(err)
    expect(details.message).toBe('obj error')
    expect(details.code).toBe(404)
  })

  it('should handle a string error', () => {
    const details = extractErrorDetails('oops')
    expect(details.type).toBe('UnknownError')
    expect(details.message).toBe('oops')
  })

  it('should handle a number error', () => {
    const details = extractErrorDetails(42)
    expect(details.type).toBe('UnknownError')
    expect(details.message).toBe('42')
  })

  it('should handle null', () => {
    const details = extractErrorDetails(null)
    expect(details.type).toBe('UnknownError')
    expect(details.message).toBe('null')
  })

  it('should handle undefined', () => {
    const details = extractErrorDetails(undefined)
    expect(details.type).toBe('UnknownError')
    expect(details.message).toBe('undefined')
  })
})
