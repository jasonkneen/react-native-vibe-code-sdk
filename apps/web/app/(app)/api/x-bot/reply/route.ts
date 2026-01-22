import { NextRequest, NextResponse } from 'next/server'
import { Client, auth } from 'twitter-api-sdk'
import { db } from '@/lib/db'
import { xBotReplies, projects } from '@react-native-vibe-code/database'
import { eq } from 'drizzle-orm'

// Secret key for x-bot internal calls
const X_BOT_SECRET = process.env.X_BOT_SECRET

interface ReplyRequest {
  tweetId: string
  projectId: string
  secret: string
}

/**
 * Get authenticated Twitter client using env var refresh token
 */
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

  oauth2Client.token = {
    refresh_token: refreshToken,
  }

  await oauth2Client.refreshAccessToken()

  // Log if token was rotated
  if (
    oauth2Client.token?.refresh_token &&
    oauth2Client.token.refresh_token !== refreshToken
  ) {
    console.log(
      'WARNING: Refresh token was rotated. Update TWITTER_REFRESH_TOKEN env var with:',
      oauth2Client.token.refresh_token
    )
  }

  return new Client(oauth2Client)
}

export async function POST(request: NextRequest) {
  try {
    const body: ReplyRequest = await request.json()
    const { tweetId, projectId, secret } = body

    // Validate internal secret
    if (secret !== X_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!tweetId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: tweetId, projectId' },
        { status: 400 }
      )
    }

    console.log(`[X-Bot Reply] Sending reply for tweet ${tweetId}, project ${projectId}`)

    // Get project details
    const projectResults = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (projectResults.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = projectResults[0]

    // Build reply text
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://capsulethis.com'
    const projectUrl = `${baseUrl}/p/${projectId}`

    const replyText = `Your app "${project.title}" is ready! 🚀\n\nView and edit: ${projectUrl}`

    // Send reply via Twitter API
    const client = await getAuthClient()
    const response = await client.tweets.createTweet({
      text: replyText,
      reply: { in_reply_to_tweet_id: tweetId },
    })

    console.log(`[X-Bot Reply] Response:`, JSON.stringify(response))

    if (response.data?.id) {
      // Update xBotReplies with reply info
      await db
        .update(xBotReplies)
        .set({
          status: 'replied',
          replyTweetId: response.data.id,
          replyContent: replyText,
          repliedAt: new Date(),
        })
        .where(eq(xBotReplies.tweetId, tweetId))

      console.log(`[X-Bot Reply] Successfully replied to tweet ${tweetId}`)

      return NextResponse.json({
        success: true,
        replyId: response.data.id,
        replyText,
      })
    } else {
      console.error(`[X-Bot Reply] No reply ID returned for tweet ${tweetId}`)

      await db
        .update(xBotReplies)
        .set({
          status: 'failed',
          errorMessage: 'No reply ID returned from Twitter',
        })
        .where(eq(xBotReplies.tweetId, tweetId))

      return NextResponse.json(
        { error: 'Failed to send reply - no ID returned' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[X-Bot Reply] Error:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to send reply' },
      { status: 500 }
    )
  }
}
