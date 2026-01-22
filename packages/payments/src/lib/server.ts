/**
 * Server-side exports for @react-native-vibe-code/payments
 * Import from '@react-native-vibe-code/payments/server'
 */

// Polar client
export {
  getPolarClient,
  createCheckoutSession,
  createPortalSession,
  getCustomerByExternalId,
  ensureCustomer,
  Polar,
} from './polar-client'

// Usage tracking
export { UsageTracker } from './usage-tracker'

// Message usage
export {
  getUserMessageUsage,
  canUserSendMessage,
  incrementMessageUsage,
  getUserUsageHistory,
  getCurrentMonth,
} from './message-usage'

// Subscription management
export {
  getUserSubscriptionStatus,
  ensureUserSubscription,
  updateSubscription,
  cancelSubscription,
  getUserUsageMetrics,
} from './subscription'

// Webhook utilities
export {
  verifyWebhookEvent,
  extractPlanFromProductName,
  getPlanFromProductId,
  getSubscriptionDataFromCheckout,
  getSubscriptionDataFromSubscription,
  getMessageLimitForPlan,
  getNextResetDate,
  WebhookVerificationError,
} from './webhook'

// Config
export { PAYMENTS_CONFIG, PLANS } from './config'

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
} from '../types'
