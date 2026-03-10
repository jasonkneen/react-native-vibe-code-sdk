import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/index'
import { db, user, emailPreferences, newsletterSends, newsletterRecipients, eq, sql } from '@/lib/db'
import { getResend, NEWSLETTER_FROM } from '@/lib/email'
import { getTemplate } from '@/lib/email/templates/registry'
import { getUnsubscribeUrl } from '@/lib/email/unsubscribe'

const DAILY_LIMIT = 100

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  const adminEmail = process.env.ADMIN_EMAIL

  if (!session?.user?.email || !adminEmail || session.user.email !== adminEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { templateName } = body

  if (!templateName) {
    return NextResponse.json({ error: 'templateName is required' }, { status: 400 })
  }

  const template = getTemplate(templateName)
  if (!template) {
    return NextResponse.json({ error: `Template "${templateName}" not found` }, { status: 404 })
  }

  try {
    // Check how many emails were sent in the last 24 hours (across all newsletters)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentSends = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsletterRecipients)
      .where(sql`${newsletterRecipients.sentAt} > ${twentyFourHoursAgo}`)

    const sentInLast24h = Number(recentSends[0]?.count || 0)
    const remainingQuota = Math.max(0, DAILY_LIMIT - sentInLast24h)

    if (remainingQuota === 0) {
      // Find when the oldest send in the last 24h window was, so we know when quota resets
      const oldestRecent = await db
        .select({ sentAt: newsletterRecipients.sentAt })
        .from(newsletterRecipients)
        .where(sql`${newsletterRecipients.sentAt} > ${twentyFourHoursAgo}`)
        .orderBy(newsletterRecipients.sentAt)
        .limit(1)

      const nextAvailable = oldestRecent[0]
        ? new Date(oldestRecent[0].sentAt!.getTime() + 24 * 60 * 60 * 1000).toISOString()
        : null

      return NextResponse.json({
        error: `Daily limit of ${DAILY_LIMIT} emails reached. Try again after the 24h window resets.`,
        nextAvailable,
        sentInLast24h,
      }, { status: 429 })
    }

    // Get users who already received this specific newsletter
    const alreadySent = await db
      .select({ userId: newsletterRecipients.userId })
      .from(newsletterRecipients)
      .where(eq(newsletterRecipients.templateName, templateName))

    const alreadySentUserIds = alreadySent.map((r) => r.userId)

    // Get subscribed users who haven't received this newsletter yet
    let query = db
      .select({ id: user.id, email: user.email })
      .from(user)
      .leftJoin(emailPreferences, eq(user.id, emailPreferences.userId))
      .where(
        sql`(${emailPreferences.subscribedToNewsletter} IS NULL OR ${emailPreferences.subscribedToNewsletter} = true)`
      )

    const subscribedUsers = await query

    // Filter out already-sent users in JS (simpler than complex SQL with optional NOT IN)
    const pendingUsers = alreadySentUserIds.length > 0
      ? subscribedUsers.filter((u) => !alreadySentUserIds.includes(u.id))
      : subscribedUsers

    if (pendingUsers.length === 0) {
      return NextResponse.json({
        error: 'All subscribed users have already received this newsletter',
        totalSubscribed: subscribedUsers.length,
        alreadySent: alreadySentUserIds.length,
      }, { status: 400 })
    }

    // Only send up to remaining quota
    const batch = pendingUsers.slice(0, remainingQuota)
    const Component = template.component
    const resend = getResend()

    // Send batch via Resend (max 100 per API call)
    const emails = batch.map((u) => ({
      from: NEWSLETTER_FROM,
      to: u.email,
      subject: template.subject,
      react: Component({
        issueNumber: template.issueNumber,
        issueDate: template.issueDate,
        unsubscribeUrl: getUnsubscribeUrl(u.email),
      }),
    }))

    const { data, error } = await resend.batch.send(emails)
    if (error) {
      console.error('[Email Admin] Batch send error:', JSON.stringify(error))
      return NextResponse.json({ error: (error as any).message || 'Resend batch send failed' }, { status: 500 })
    }

    // Record each recipient
    await db.insert(newsletterRecipients).values(
      batch.map((u) => ({
        templateName,
        userId: u.id,
        email: u.email,
      }))
    )

    // Record the batch send in history
    await db.insert(newsletterSends).values({
      templateName: template.name,
      subject: template.subject,
      recipientCount: batch.length,
      sentBy: session.user.id,
    })

    return NextResponse.json({
      success: true,
      sentCount: batch.length,
      remainingUsers: pendingUsers.length - batch.length,
      totalSubscribed: subscribedUsers.length,
      alreadySent: alreadySentUserIds.length,
      quotaRemaining: remainingQuota - batch.length,
    })
  } catch (error: any) {
    console.error('[Email Admin] Send error:', error?.message, error?.stack)
    return NextResponse.json(
      { error: error?.message || 'Failed to send newsletter' },
      { status: 500 }
    )
  }
}
