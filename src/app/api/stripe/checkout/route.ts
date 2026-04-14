import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe, PRICES, PRODUCTS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { mode, issueId } = await req.json()
  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    if (mode === 'npgx' || mode === 'subscription') {
      // $30/mo NPGX subscription — content pack + credits
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: session.user.email,
        line_items: [{ price: PRICES.NPGX_MONTHLY, quantity: 1 }],
        success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/subscribe`,
        metadata: {
          userId: session.user.email,
          type: 'npgx_subscription',
        },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    if (mode === 'single' && issueId) {
      // $10 single issue purchase
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: session.user.email,
        line_items: PRICES.MAGAZINE_SINGLE
          ? [{ price: PRICES.MAGAZINE_SINGLE, quantity: 1 }]
          : [{
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `NPGX Magazine — ${issueId}`,
                  description: PRODUCTS.MAGAZINE_SINGLE_ISSUE.description,
                },
                unit_amount: PRODUCTS.MAGAZINE_SINGLE_ISSUE.price,
              },
              quantity: 1,
            }],
        success_url: `${origin}/magazine/${issueId}?purchased=true`,
        cancel_url: `${origin}/magazine/${issueId}`,
        metadata: {
          userId: session.user.email,
          type: 'magazine_single',
          issueId,
        },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
