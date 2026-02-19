'use client'

/**
 * @deprecated This file is deprecated. Import from '@react-native-vibe-code/payments/client' instead.
 * This file is kept for backwards compatibility during migration.
 */

import { authClient, useSession } from '@/lib/auth/client'
import { createPolarUtils, useSubscriptionStatusBase } from '@react-native-vibe-code/payments/client'

// Create polarUtils with the authClient
export const polarUtils = createPolarUtils({
  authClient: authClient as any,
})

const isPolarConfigured = !!(
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID
)

// Hook to get subscription status - uses the auth client from this app
// When Polar is not configured, passes no session so the hook exits early
// without making any API calls to /api/auth/customer/state
export function useSubscriptionStatus() {
  const { data: session } = useSession()

  return useSubscriptionStatusBase(
    isPolarConfigured
      ? { authClient: authClient as any, session }
      : {}, // no session → hook returns {isSubscribed: false} immediately, no API calls
  )
}
