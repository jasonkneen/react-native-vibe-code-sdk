import { NextRequest, NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'
import { auth } from '@/lib/auth/config'
import { headers } from 'next/headers'

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_SERVER! as 'production' | 'sandbox',
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Portal] Looking up customer for user:', session.user.id, session.user.email)

    try {
      // First, try to get the customer by external ID
      const customer = await polarClient.customers.getExternal({ 
        externalId: session.user.id 
      })
      
      console.log('[Portal] Found customer:', customer.id)
      
      // Create customer session for portal
      const customerSession = await polarClient.customerSessions.create({
        customerId: customer.id,
      })

      if (customerSession.customerPortalUrl) {
        return NextResponse.json({
          portalUrl: customerSession.customerPortalUrl,
        })
      }
    } catch (customerError: any) {
      console.log('[Portal] Customer not found, trying to create:', customerError.message)
      
      // If customer doesn't exist, try creating one
      try {
        const newCustomer = await polarClient.customers.create({
          email: session.user.email!,
          externalId: session.user.id,
          name: session.user.name || undefined,
        })
        
        console.log('[Portal] Created new customer:', newCustomer.id)
        
        const customerSession = await polarClient.customerSessions.create({
          customerId: newCustomer.id,
        })

        if (customerSession.customerPortalUrl) {
          return NextResponse.json({
            portalUrl: customerSession.customerPortalUrl,
          })
        }
      } catch (createError: any) {
        console.error('[Portal] Error creating customer:', createError)
        return NextResponse.json(
          { error: 'Failed to create customer account' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create portal session. Please try again or contact support.' },
      { status: 500 }
    )
  } catch (error) {
    console.error('[Portal] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}