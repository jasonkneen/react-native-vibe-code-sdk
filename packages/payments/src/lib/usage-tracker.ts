import { getPolarClient } from './polar-client'
import type { UsageEvent } from '../types'

/**
 * UsageTracker class for tracking usage events in Polar
 */
export class UsageTracker {
  /**
   * Track token usage for AI operations
   */
  static async trackTokenUsage(
    userId: string,
    tokenCount: number,
    model: string = 'claude-3-5-sonnet',
    projectId?: string
  ) {
    try {
      const polar = getPolarClient()

      const event: UsageEvent = {
        name: 'ai_token_usage',
        externalCustomerId: userId,
        metadata: {
          model,
          total_tokens: tokenCount,
          project_id: projectId || 'unknown',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      }

      await polar.events.ingest({
        events: [{
          name: event.name,
          externalCustomerId: event.externalCustomerId,
          metadata: event.metadata,
          timestamp: event.timestamp,
        }]
      })

      console.log(`[Payments] Usage tracked: ${tokenCount} tokens for user ${userId}`)
    } catch (error) {
      console.error('[Payments] Failed to track usage:', error)
    }
  }

  /**
   * Track project generation events
   */
  static async trackProjectGeneration(
    userId: string,
    projectId: string,
    template: string
  ) {
    try {
      const polar = getPolarClient()

      const event: UsageEvent = {
        name: 'project_generation',
        externalCustomerId: userId,
        metadata: {
          project_id: projectId,
          template,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      }

      await polar.events.ingest({
        events: [{
          name: event.name,
          externalCustomerId: event.externalCustomerId,
          metadata: event.metadata,
          timestamp: event.timestamp,
        }]
      })

      console.log(`[Payments] Project generation tracked: ${projectId} for user ${userId}`)
    } catch (error) {
      console.error('[Payments] Failed to track project generation:', error)
    }
  }

  /**
   * Track code generation events
   */
  static async trackCodeGeneration(
    userId: string,
    projectId: string,
    filesModified: number,
    tokenCount?: number
  ) {
    try {
      const polar = getPolarClient()

      const event: UsageEvent = {
        name: 'code_generation',
        externalCustomerId: userId,
        metadata: {
          project_id: projectId,
          files_modified: filesModified,
          tokens_used: tokenCount || 0,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      }

      await polar.events.ingest({
        events: [{
          name: event.name,
          externalCustomerId: event.externalCustomerId,
          metadata: event.metadata,
          timestamp: event.timestamp,
        }]
      })

      console.log(`[Payments] Code generation tracked: ${filesModified} files for user ${userId}`)
    } catch (error) {
      console.error('[Payments] Failed to track code generation:', error)
    }
  }

  /**
   * Track a custom usage event
   */
  static async trackEvent(event: UsageEvent) {
    try {
      const polar = getPolarClient()

      await polar.events.ingest({
        events: [{
          name: event.name,
          externalCustomerId: event.externalCustomerId,
          metadata: event.metadata,
          timestamp: event.timestamp || new Date(),
        }]
      })

      console.log(`[Payments] Event tracked: ${event.name} for user ${event.externalCustomerId}`)
    } catch (error) {
      console.error('[Payments] Failed to track event:', error)
    }
  }
}
