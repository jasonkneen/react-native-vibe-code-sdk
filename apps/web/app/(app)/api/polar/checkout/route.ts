import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, planName } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Create checkout session with Polar API
    const polarResponse = await fetch(
      'https://api.polar.sh/v1/checkouts/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          customer_email: session.user.email,
          customer_name: session.user.name || undefined,
          metadata: {
            user_id: session.user.id,
            plan_name: planName,
          },
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?checkout=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?checkout=cancelled`,
        }),
      }
    )

    if (!polarResponse.ok) {
      const error = await polarResponse.text()
      console.error('Polar API error:', error)
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    const checkoutSession = await polarResponse.json()

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}