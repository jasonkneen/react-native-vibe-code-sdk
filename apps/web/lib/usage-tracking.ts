/**
 * @deprecated This file is deprecated. Import from '@react-native-vibe-code/payments/server' instead.
 * This file is kept for backwards compatibility during migration.
 */

// Re-export everything from @react-native-vibe-code/payments/server
export {
  UsageTracker,
  getUserSubscriptionStatus,
  getUserUsageMetrics,
} from '@react-native-vibe-code/payments/server'

export interface UsageEvent {
  name: string
  externalCustomerId: string
  metadata: {
    [key: string]: any
  }
  timestamp?: Date
}