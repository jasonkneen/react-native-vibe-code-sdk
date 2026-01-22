import { Client, auth } from 'twitter-api-sdk'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { xBotReplies, xBotState, twitterLinks } from '@react-native-vibe-code/database'
import { eq } from 'drizzle-orm'
import { classifyTweet, quickAppRequestCheck } from '@/lib/x-bot/classify-tweet'
import {
  extractMediaUrls,
  downloadAndStoreTweetImages,
} from '@/lib/x-bot/extract-images'

// Config
const YOUR_USER_ID = '1832518730582020097' // Bot's numeric user ID
const X_BOT_SECRET = process.env.X_BOT_SECRET

// Reply for unlinked users
const UNLINKED_USER_REPLY =
  'To build apps with Capsule, please create an account and link your X account at capsulethis.com/settings ⚡'

// Get last tweet ID from database
async function getLastTweetId(): Promise<string | undefined> {
  const state = await db
    .select()
    .from(xBotState)
    .where(eq(xBotState.id, 'default'))
    .limit(1)
  return state[0]?.lastTweetId ?? undefined
}

// Update last tweet ID in database
async function setLastTweetId(tweetId: string): Promise<void> {
  await db
    .insert(xBotState)
    .values({ id: 'default', lastTweetId: tweetId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: xBotState.id,
      set: { lastTweetId: tweetId, updatedAt: new Date() },
    })
}

// Check if we've already processed this tweet
async function hasProcessed(tweetId: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(xBotReplies)
    .where(eq(xBotReplies.tweetId, tweetId))
    .limit(1)
  return existing.length > 0
}

// Record a tweet processing in the database
async function recordTweet(data: {
  tweetId: string
  replyTweetId?: string
  authorId?: string
  tweetText?: string
  status: string
  errorMessage?: string
  imageUrls?: string[]
  isAppRequest?: boolean
  appDescription?: string
  generationStatus?: string
  projectId?: string
}): Promise<void> {
  await db.insert(xBotReplies).values({
    tweetId: data.tweetId,
    replyTweetId: data.replyTweetId,
    authorId: data.authorId,
    tweetText: data.tweetText,
    status: data.status,
    errorMessage: data.errorMessage,
    imageUrls: data.imageUrls,
    isAppRequest: data.isAppRequest ?? false,
    appDescription: data.appDescription,
    generationStatus: data.generationStatus,
    projectId: data.projectId,
  })
}

// Update an existing tweet record
async function updateTweet(
  tweetId: string,
  data: Partial<{
    status: string
    generationStatus: string
    projectId: string
    errorMessage: string
  }>
): Promise<void> {
  await db.update(xBotReplies).set(data).where(eq(xBotReplies.tweetId, tweetId))
}

// Get authenticated Twitter client
async function getAuthClient(): Promise<Client> {
  const refreshToken = process.env.TWITTER_REFRESH_TOKEN
  if (!refreshToken) {
    throw new Error('TWITTER_REFRESH_TOKEN environment variable is required')
  }

  const oauth2Client = new auth.OAuth2User({
    client_id: process.env.TWITTER_CLIENT_ID as string,
    client_secret: process.env.TWITTER_CLIENT_SECRET as string,
    callback: 'http://www.capsulethis.com/api/x-bot/auth/callback',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  })

  oauth2Client.token = { refresh_token: refreshToken }
  await oauth2Client.refreshAccessToken()

  if (
    oauth2Client.token?.refresh_token &&
    oauth2Client.token.refresh_token !== refreshToken
  ) {
    console.log(
      'WARNING: Refresh token rotated. Update TWITTER_REFRESH_TOKEN:',
      oauth2Client.token.refresh_token
    )
  }

  return new Client(oauth2Client)
}

// Reply to tweet asking user to link account
async function replyWithLinkPrompt(
  client: Client,
  tweetId: string
): Promise<string | null> {
  try {
    const response = await client.tweets.createTweet({
      text: UNLINKED_USER_REPLY,
      reply: { in_reply_to_tweet_id: tweetId },
    })
    return response.data?.id || null
  } catch (error) {
    console.error(`[X-Bot] Failed to send link prompt reply:`, error)
    return null
  }
}

// Main poll function
async function pollMentions(client: Client, baseUrl: string) {
  try {
    const lastTweetId = await getLastTweetId()

    // Fetch mentions WITH media expansion
    const mentions = await client.tweets.usersIdMentions(YOUR_USER_ID, {
      since_id: lastTweetId,
      expansions: ['attachments.media_keys', 'author_id'],
      'media.fields': ['url', 'preview_image_url', 'type'],
      'tweet.fields': ['created_at', 'attachments'],
      max_results: 10,
    })

    const results: Array<{
      tweetId: string
      action: string
      projectId?: string
      error?: string
    }> = []

    if (mentions.data && mentions.data.length > 0) {
      console.log(`[X-Bot] Found ${mentions.data.length} mentions`)

      for (const tweet of mentions.data) {
        console.log(
          `[X-Bot] Processing tweet ${tweet.id}: "${tweet.text.substring(0, 50)}..."`
        )

        // Skip if already processed
        if (await hasProcessed(tweet.id)) {
          console.log(`[X-Bot] Skipping tweet ${tweet.id} - already processed`)
          results.push({ tweetId: tweet.id, action: 'already_processed' })
          continue
        }

        // Skip our own tweets
        if (tweet.author_id === YOUR_USER_ID) {
          console.log(`[X-Bot] Skipping tweet ${tweet.id} - own tweet`)
          await recordTweet({
            tweetId: tweet.id,
            authorId: tweet.author_id,
            tweetText: tweet.text,
            status: 'skipped',
            errorMessage: 'Own tweet',
          })
          results.push({ tweetId: tweet.id, action: 'skipped_own_tweet' })
          continue
        }

        // Check if user has linked their Twitter account
        const linkedUser = await db
          .select()
          .from(twitterLinks)
          .where(eq(twitterLinks.twitterUserId, tweet.author_id!))
          .limit(1)

        if (linkedUser.length === 0) {
          console.log(`[X-Bot] User ${tweet.author_id} not linked - sending prompt`)

          // Reply asking them to link
          const replyId = await replyWithLinkPrompt(client, tweet.id)

          await recordTweet({
            tweetId: tweet.id,
            replyTweetId: replyId || undefined,
            authorId: tweet.author_id,
            tweetText: tweet.text,
            status: replyId ? 'replied' : 'failed',
            errorMessage: 'User not linked',
            isAppRequest: false,
          })

          results.push({ tweetId: tweet.id, action: 'unlinked_user_prompt' })
          continue
        }

        const capsuleUserId = linkedUser[0].userId
        console.log(`[X-Bot] Found linked user: ${capsuleUserId}`)

        // Extract images from tweet
        const mediaUrls = extractMediaUrls(
          {
            id: tweet.id,
            text: tweet.text,
            attachments: tweet.attachments,
          },
          mentions.includes?.media as any
        )
        console.log(`[X-Bot] Found ${mediaUrls.length} images in tweet`)

        // Quick pre-filter before AI classification
        const mightBeAppRequest = quickAppRequestCheck(tweet.text)

        if (!mightBeAppRequest && mediaUrls.length === 0) {
          console.log(`[X-Bot] Tweet ${tweet.id} doesn't look like app request, skipping`)
          await recordTweet({
            tweetId: tweet.id,
            authorId: tweet.author_id,
            tweetText: tweet.text,
            status: 'skipped',
            errorMessage: 'Not an app request (quick check)',
            isAppRequest: false,
          })
          results.push({ tweetId: tweet.id, action: 'skipped_not_app_request' })
          continue
        }

        // Classify with AI
        console.log(`[X-Bot] Classifying tweet ${tweet.id} with AI...`)
        const classification = await classifyTweet(
          tweet.text,
          mediaUrls.length > 0,
          linkedUser[0].twitterUsername
        )

        console.log(`[X-Bot] Classification result:`, classification)

        if (!classification.isAppRequest) {
          console.log(`[X-Bot] Tweet ${tweet.id} is not an app request`)
          await recordTweet({
            tweetId: tweet.id,
            authorId: tweet.author_id,
            tweetText: tweet.text,
            status: 'skipped',
            errorMessage: classification.reasoning || 'Not an app request',
            isAppRequest: false,
          })
          results.push({ tweetId: tweet.id, action: 'skipped_not_app_request_ai' })
          continue
        }

        // It's an app request! Download images and start generation
        console.log(`[X-Bot] App request detected! Starting generation...`)

        // Download and store images to Vercel Blob
        let imageUrls: string[] = []
        if (mediaUrls.length > 0) {
          console.log(`[X-Bot] Downloading ${mediaUrls.length} images...`)
          imageUrls = await downloadAndStoreTweetImages(tweet.id, mediaUrls)
          console.log(`[X-Bot] Stored ${imageUrls.length} images`)
        }

        // Record the tweet as pending
        await recordTweet({
          tweetId: tweet.id,
          authorId: tweet.author_id,
          tweetText: tweet.text,
          status: 'pending',
          imageUrls,
          isAppRequest: true,
          appDescription: classification.appDescription,
          generationStatus: 'pending',
        })

        // Create project
        console.log(`[X-Bot] Creating project...`)
        const createProjectResponse = await fetch(
          `${baseUrl}/api/x-bot/create-project`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tweetId: tweet.id,
              userId: capsuleUserId,
              appDescription: classification.appDescription,
              imageUrls,
              secret: X_BOT_SECRET,
            }),
          }
        )

        if (!createProjectResponse.ok) {
          const error = await createProjectResponse.text()
          console.error(`[X-Bot] Failed to create project:`, error)
          await updateTweet(tweet.id, {
            status: 'failed',
            generationStatus: 'failed',
            errorMessage: `Project creation failed: ${error}`,
          })
          results.push({ tweetId: tweet.id, action: 'project_creation_failed', error })
          continue
        }

        const projectData = await createProjectResponse.json()
        console.log(`[X-Bot] Project created: ${projectData.projectId}`)

        // Update record with project ID
        await updateTweet(tweet.id, {
          projectId: projectData.projectId,
          generationStatus: 'generating',
        })

        // Trigger generation (fire and forget - it will call reply endpoint on completion)
        console.log(`[X-Bot] Triggering generation...`)
        fetch(`${baseUrl}/api/x-bot/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: projectData.projectId,
            userId: capsuleUserId,
            appDescription: classification.appDescription,
            imageUrls,
            tweetId: tweet.id,
            sandboxId: projectData.sandboxId,
            secret: X_BOT_SECRET,
          }),
        }).catch((err) => {
          console.error(`[X-Bot] Failed to trigger generation:`, err)
        })

        results.push({
          tweetId: tweet.id,
          action: 'generation_started',
          projectId: projectData.projectId,
        })
      }

      // Update last tweet ID
      await setLastTweetId(mentions.data[0].id)
    }

    return {
      success: true,
      processed: mentions.data?.length || 0,
      results,
      lastTweetId: mentions.data?.[0]?.id || lastTweetId,
    }
  } catch (error: any) {
    console.error('[X-Bot] Error in pollMentions:', error)
    if (error.data?.status === 429) {
      return { success: false, error: 'Rate limit hit' }
    } else if (error.data?.title === 'UsageCapExceeded') {
      return { success: false, error: 'Monthly quota exceeded' }
    }
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// API Route Handler
export async function GET(request: Request) {
  try {
    console.log('[X-Bot] Starting poll...')

    // Get base URL for internal API calls
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    const client = await getAuthClient()
    console.log('[X-Bot] Auth successful')

    const result = await pollMentions(client, baseUrl)
    console.log('[X-Bot] Poll complete:', result)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[X-Bot] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        details: error.data || error.response?.data || null,
      },
      { status: 500 }
    )
  }
}
