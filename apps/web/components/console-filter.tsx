'use client'

/**
 * Patches console.error and console.warn to suppress known harmless warnings.
 *
 * Sources:
 * 1. Expo Router sandbox iframe (old E2B template) — shares browser DevTools console
 * 2. Pusher WebSocket cleanup race conditions
 *
 * These are cosmetic console noise, not real errors.
 * New sandboxes use the rebuilt template with postMessage and don't produce these.
 */

const SUPPRESSED_PATTERNS = [
  // Expo Router ContextNavigator passes `id` to React.Fragment — harmless bug
  (msg: string) => msg.includes('Invalid prop') && msg.includes('React.Fragment'),
  // Private Network Access CORS block for old sandbox hover-selection fetch
  (msg: string) => msg.includes('hover-selection') && msg.includes('CORS'),
  // Old sandbox fetch to localhost from e2b.app
  (msg: string) => msg.includes('hover-selection') && msg.includes('ERR_FAILED'),
  // LogBox forwarding of the above
  (msg: string) => msg.includes('Failed to send selection data'),
  // Pusher WebSocket cleanup — unsubscribe fires after disconnect
  (msg: string) => msg.includes('WebSocket is already in CLOSING or CLOSED state'),
]

function shouldSuppress(args: unknown[]): boolean {
  const first = args[0]
  if (typeof first !== 'string') return false
  return SUPPRESSED_PATTERNS.some((test) => test(first))
}

if (typeof window !== 'undefined') {
  const originalError = console.error
  const originalWarn = console.warn

  console.error = (...args: unknown[]) => {
    if (shouldSuppress(args)) return
    originalError.apply(console, args)
  }

  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(args)) return
    originalWarn.apply(console, args)
  }
}

/**
 * Render nothing — the side-effect above runs at import time.
 * Include this component in the layout so the module is loaded.
 */
export function ConsoleFilter() {
  return null
}
