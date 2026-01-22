import { db, subscriptions, promptMessages, eq, and } from '@react-native-vibe-code/database'
import { PAYMENTS_CONFIG, getCurrentMonth, getNextResetDate, getMessageLimitForPlan } from './config'
import type { SubscriptionStatus, UsageMetrics, PlanName } from '../types'

/**
 * Get user's subscription status with usage information
 */
export async function getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    // Get user's subscription from database
    const subscription = await db
      .select({
        id: subscriptions.id,
        currentPlan: subscriptions.currentPlan,
        status: subscriptions.status,
        messageLimit: subscriptions.messageLimit,
        resetDate: subscriptions.resetDate,
        subscribedAt: subscriptions.subscribedAt,
        expiresAt: subscriptions.expiresAt,
        customerId: subscriptions.customerId,
        subscriptionId: subscriptions.subscriptionId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (subscription.length === 0) {
      // No subscription found, return free tier
      return {
        isSubscribed: false,
        hasSubscription: false,
        currentPlan: 'free',
        status: 'inactive',
        messageLimit: PAYMENTS_CONFIG.FREE_PLAN_MESSAGE_LIMIT,
        messagesUsed: 0,
        resetDate: null,
        subscribedAt: null,
        expiresAt: null,
        customerId: null,
      }
    }

    const sub = subscription[0]

    // Get current month usage from prompt_messages table
    const currentMonth = getCurrentMonth()

    const currentUsage = await db
      .select({
        usageCount: promptMessages.usageCount,
      })
      .from(promptMessages)
      .where(
        and(
          eq(promptMessages.userId, userId),
          eq(promptMessages.month, currentMonth)
        )
      )
      .limit(1)

    const messagesUsed = currentUsage.length > 0 ? parseInt(currentUsage[0].usageCount || '0') : 0
    const isActive = sub.status === 'active'
    // User has a subscription if they have an active status
    const hasPaidSubscription = isActive

    console.log(`[Payments] User ${userId} subscription status:`, {
      status: sub.status,
      isActive,
      hasPaidSubscription,
      plan: sub.currentPlan,
      messageLimit: sub.messageLimit,
      messagesUsed,
      currentMonth
    })

    return {
      isSubscribed: isActive,
      hasSubscription: hasPaidSubscription,
      subscriptionId: sub.subscriptionId || undefined,
      planName: sub.currentPlan || 'free',
      currentPlan: sub.currentPlan || 'free',
      status: sub.status || 'inactive',
      messageLimit: parseInt(sub.messageLimit || PAYMENTS_CONFIG.FREE_PLAN_MESSAGE_LIMIT.toString()),
      messagesUsed,
      resetDate: sub.resetDate ? sub.resetDate.toISOString() : null,
      subscribedAt: sub.subscribedAt ? sub.subscribedAt.toISOString() : null,
      expiresAt: sub.expiresAt ? sub.expiresAt.toISOString() : null,
      customerId: sub.customerId,
    }
  } catch (error) {
    console.error('[Payments] Failed to get subscription status:', error)
    return {
      isSubscribed: false,
      hasSubscription: false,
      currentPlan: 'free',
      status: 'inactive',
      messageLimit: PAYMENTS_CONFIG.FREE_PLAN_MESSAGE_LIMIT,
      messagesUsed: 0,
      resetDate: null,
      subscribedAt: null,
      expiresAt: null,
      customerId: null,
    }
  }
}

/**
 * Ensure a subscription record exists for a user
 * Creates a free tier subscription if none exists
 */
export async function ensureUserSubscription(userId: string): Promise<void> {
  try {
    const existing = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(subscriptions).values({
        userId,
        currentPlan: 'free',
        status: 'inactive',
        messageLimit: PAYMENTS_CONFIG.FREE_PLAN_MESSAGE_LIMIT.toString(),
        resetDate: getNextResetDate(),
      })
      console.log(`[Payments] Created free subscription for user ${userId}`)
    }
  } catch (error) {
    console.error('[Payments] Failed to ensure subscription:', error)
  }
}

/**
 * Update subscription after successful checkout or webhook event
 */
export async function updateSubscription(
  userId: string,
  data: {
    customerId?: string
    subscriptionId?: string
    productId?: string
    planName?: PlanName | string
    status?: string
    checkoutId?: string
  }
): Promise<void> {
  try {
    const messageLimit = data.planName ? getMessageLimitForPlan(data.planName) : undefined

    await db
      .update(subscriptions)
      .set({
        ...(data.customerId && { customerId: data.customerId }),
        ...(data.subscriptionId && { subscriptionId: data.subscriptionId }),
        ...(data.productId && { productId: data.productId }),
        ...(data.planName && { currentPlan: data.planName }),
        ...(data.status && { status: data.status }),
        ...(data.checkoutId && { checkoutId: data.checkoutId }),
        ...(messageLimit && { messageLimit: messageLimit.toString() }),
        ...(data.status === 'active' && { subscribedAt: new Date() }),
        resetDate: getNextResetDate(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))

    console.log(`[Payments] Updated subscription for user ${userId}:`, data)
  } catch (error) {
    console.error('[Payments] Failed to update subscription:', error)
    throw error
  }
}

/**
 * Cancel/revoke a subscription (reset to free tier)
 */
export async function cancelSubscription(userId: string): Promise<void> {
  try {
    await db
      .update(subscriptions)
      .set({
        currentPlan: 'free',
        status: 'cancelled',
        messageLimit: PAYMENTS_CONFIG.FREE_PLAN_MESSAGE_LIMIT.toString(),
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))

    console.log(`[Payments] Cancelled subscription for user ${userId}`)
  } catch (error) {
    console.error('[Payments] Failed to cancel subscription:', error)
    throw error
  }
}

/**
 * Get usage metrics for a user (placeholder - requires Polar aggregation)
 */
export async function getUserUsageMetrics(userId: string): Promise<UsageMetrics> {
  try {
    // Note: This would require setting up usage aggregation in Polar
    // For now, we'll return placeholder values
    return {
      tokensUsed: 0,
      projectsGenerated: 0,
      codeGenerations: 0,
    }
  } catch (error) {
    console.error('[Payments] Failed to get usage metrics:', error)
    return {
      tokensUsed: 0,
      projectsGenerated: 0,
      codeGenerations: 0,
    }
  }
}
