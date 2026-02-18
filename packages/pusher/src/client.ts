'use client'

import PusherClient from 'pusher-js'

let pusherClientInstance: PusherClient | null = null

export function isPusherConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  )
}

export function getPusherClient(): PusherClient | null {
  if (!isPusherConfigured()) {
    return null
  }

  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      }
    )
  }

  return pusherClientInstance
}

// No-op stub used when Pusher is not configured
const noopPusher = new Proxy({} as PusherClient, {
  get(_target, prop) {
    if (prop === 'subscribe') return () => ({ bind: () => {}, unbind: () => {} })
    if (prop === 'unsubscribe') return () => {}
    if (prop === 'disconnect') return () => {}
    if (prop === 'bind') return () => {}
    return () => {}
  },
})

// Legacy export for backward compatibility - uses Proxy to forward all method calls
export const pusherClient = new Proxy({} as PusherClient, {
  get(_target, prop) {
    const client = getPusherClient()
    if (!client) {
      return (noopPusher as unknown as Record<string | symbol, unknown>)[prop]
    }
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

export { PusherClient }
