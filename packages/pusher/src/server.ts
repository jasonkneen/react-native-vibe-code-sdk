import Pusher from 'pusher'

let pusherServerInstance: Pusher | null = null

export function getPusherServer(): Pusher {
  if (!pusherServerInstance) {
    if (
      !process.env.PUSHER_APP_ID ||
      !process.env.NEXT_PUBLIC_PUSHER_APP_KEY ||
      !process.env.PUSHER_APP_SECRET ||
      !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    ) {
      throw new Error('Missing Pusher environment variables')
    }

    pusherServerInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
      secret: process.env.PUSHER_APP_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    })
  }

  return pusherServerInstance
}

// Legacy export for backward compatibility
export const pusherServer = {
  get instance() {
    return getPusherServer()
  },
}
