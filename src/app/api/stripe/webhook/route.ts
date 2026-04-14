import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const email = session.customer_email || session.metadata?.userId
      const type = session.metadata?.type

      console.log(`[Stripe] Checkout completed: ${type} for ${email}`)

      // Handle licence orders (NPGX Agent + $402 Startup Licence)
      if (type === 'npgx_licence' && supabase) {
        const customer = session.customer_details as {
          name?: string;
          email?: string;
          phone?: string;
        } | null;
        const sessionAny = session as any;
        const shipping = sessionAny.shipping_details as { name?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } } | null;
        await supabase
          .from('licence_orders')
          .insert({
            site: 'npgx',
            stripe_session_id: session.id,
            buyer_email: customer?.email || email || 'unknown@unknown.com',
            tier: 2,
            tokens_required: 1000000,
            amount_usd: 402.00,
            status: 'paid',
            shipping_line1: shipping?.address?.line1 || null,
            shipping_line2: shipping?.address?.line2 || null,
            shipping_city: shipping?.address?.city || null,
            shipping_state: shipping?.address?.state || null,
            shipping_postal_code: shipping?.address?.postal_code || null,
            shipping_country: shipping?.address?.country || null,
          });
        console.log(`[Stripe] Licence order created for ${customer?.email || email}`);
      }

      // Handle support ticket payments
      if (session.metadata?.supportTicket === 'true' && session.metadata?.ticketId && supabase) {
        await supabase.from('npgx_support_tickets')
          .update({
            status: 'paid',
            stripe_session_id: session.id,
            paid_at: new Date().toISOString(),
          })
          .eq('id', session.metadata.ticketId)
        console.log(`[Stripe] Support ticket ${session.metadata.ticketId} marked as paid`)
      }

      // NPGX monthly subscription
      if (type === 'npgx_subscription' && supabase) {
        await supabase.from('npgx_subscriptions').upsert({
          email: email || 'unknown',
          stripe_session_id: session.id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          status: 'active',
          subscribed_at: new Date().toISOString(),
        }, { onConflict: 'email' })
        console.log(`[Stripe] NPGX subscription activated for ${email}`)
      }

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      console.log(`[Stripe] Subscription cancelled: ${subscription.id}`)
      if (supabase) {
        await supabase.from('npgx_subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.log(`[Stripe] Payment failed: ${invoice.id}`)
      // TODO: Notify user, handle grace period
      break
    }

    default:
      console.log(`[Stripe] Unhandled event: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
