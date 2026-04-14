import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRODUCTS } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

const PRODUCT_MAP = {
  bug: PRODUCTS.SUPPORT_BUG,
  feature: PRODUCTS.SUPPORT_FEATURE,
  priority: PRODUCTS.SUPPORT_PRIORITY,
} as const

export async function POST(req: NextRequest) {
  try {
    const { type, description, pageUrl, email } = await req.json()

    if (!type || !description || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['bug', 'feature', 'priority'].includes(type)) {
      return NextResponse.json({ error: 'Invalid ticket type' }, { status: 400 })
    }

    const product = PRODUCT_MAP[type as keyof typeof PRODUCT_MAP]
    const ticketId = crypto.randomUUID()
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://npgx.website'

    // Save ticket to Supabase (status: pending_payment)
    if (supabase) {
      await supabase.from('npgx_support_tickets').insert({
        id: ticketId,
        type,
        description,
        page_url: pageUrl || null,
        email,
        price_cents: product.price,
        status: 'pending_payment',
        created_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error('Supabase insert error:', error)
      })
    }

    // Create Stripe checkout session
    if (stripe) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        }],
        success_url: `${origin}?support=paid&ticket=${ticketId}`,
        cancel_url: `${origin}?support=cancelled&ticket=${ticketId}`,
        metadata: {
          ticketId,
          type,
          pageUrl: pageUrl || '',
          supportTicket: 'true',
        },
      })

      return NextResponse.json({
        ticketId,
        checkoutUrl: session.url,
      })
    }

    // No Stripe configured — still save the ticket, mark as submitted
    if (supabase) {
      await supabase.from('npgx_support_tickets')
        .update({ status: 'submitted' })
        .eq('id', ticketId)
    }

    return NextResponse.json({ ticketId, message: 'Ticket submitted (payment offline)' })
  } catch (err: any) {
    console.error('Support ticket error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

// List tickets (for admin use)
export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ tickets: [] })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const email = searchParams.get('email')

  let query = supabase
    .from('npgx_support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)
  if (email) query = query.eq('email', email)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tickets: data || [] })
}
