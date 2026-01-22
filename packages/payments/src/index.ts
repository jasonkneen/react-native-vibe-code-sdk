/**
 * @react-native-vibe-code/payments - Polar payment integration for Capsule
 *
 * This package provides all the functionality needed for subscription management,
 * usage tracking, and payment processing with Polar.
 *
 * Usage:
 *
 * Server-side (API routes, server components):
 * ```ts
 * import { getUserSubscriptionStatus, canUserSendMessage } from '@react-native-vibe-code/payments/server'
 * ```
 *
 * Client-side (React components):
 * ```ts
 * import { createPolarUtils } from '@react-native-vibe-code/payments/client'
 * ```
 *
 * Components:
 * ```ts
 * import { SubscriptionModal, RateLimitCard } from '@react-native-vibe-code/payments/components'
 * ```
 *
 * Hooks:
 * ```ts
 * import { useSubscriptionStatusBase } from '@react-native-vibe-code/payments/hooks'
 * ```
 *
 * Config:
 * ```ts
 * import { PAYMENTS_CONFIG, PLANS } from '@react-native-vibe-code/payments/config'
 * ```
 */

// Re-export types
export type {
  UsageEvent,
  Plan,
  PlanName,
  SubscriptionStatus,
  MessageUsage,
  CanSendMessageResult,
  IncrementUsageResult,
  UsageMetrics,
  RateLimitInfo,
  PolarWebhookEventType,
} from './types'

// Re-export config
export { PAYMENTS_CONFIG, PLANS, getMessageLimitForPlan, getNextResetDate, getCurrentMonth } from './lib/config'
