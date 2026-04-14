import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    // Find existing Stripe customer by email
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'No billing history found' }, { status: 404 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/magazine`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err: any) {
    console.error('Stripe portal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
