import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { chargeUser, PLATFORM_HANDLE } from '@/lib/handcash'

/**
 * GET /api/cards/marketplace — Browse listed cards
 * Query: ?rarity=epic&sort=price_asc&limit=50
 *
 * POST /api/cards/marketplace — List a card for sale or buy a listed card
 * Body (list):  { action: 'list', instanceId: UUID, priceSats: 500 }
 * Body (buy):   { action: 'buy', tradeId: UUID }
 * Body (cancel): { action: 'cancel', tradeId: UUID }
 */

const PLATFORM_FEE_PCT = 0.05 // 5% cut

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ listings: [] })
  }

  const { searchParams } = new URL(req.url)
  const rarity = searchParams.get('rarity')
  const sort = searchParams.get('sort') || 'price_asc'
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('npgx_card_trades')
    .select(`
      *,
      npgx_card_inventory!inner (card_id, rarity, owner_handle)
    `)
    .eq('status', 'listed')
    .limit(limit)

  if (rarity) {
    query = query.eq('npgx_card_inventory.rarity', rarity)
  }

  if (sort === 'price_desc') {
    query = query.order('price_sats', { ascending: false })
  } else {
    query = query.order('price_sats', { ascending: true })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ listings: data || [] })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const handle = cookieStore.get('npgx_handle')?.value
  const authToken = cookieStore.get('npgx_auth')?.value

  if (!handle) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const body = await req.json()
  const { action } = body

  // ── LIST A CARD ──
  if (action === 'list') {
    const { instanceId, priceSats } = body
    if (!instanceId || !priceSats || priceSats < 10) {
      return NextResponse.json({ error: 'Missing instanceId or invalid price (min 10 sats)' }, { status: 400 })
    }

    // Verify ownership
    const { data: card } = await supabase
      .from('npgx_card_inventory')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('owner_handle', handle)
      .single()

    if (!card) return NextResponse.json({ error: 'Card not found or not owned' }, { status: 404 })
    if (card.is_locked) return NextResponse.json({ error: 'Card is locked in a battle' }, { status: 409 })

    // Create listing
    const platformFee = Math.ceil(priceSats * PLATFORM_FEE_PCT)
    const { data: trade, error } = await supabase
      .from('npgx_card_trades')
      .insert({
        card_instance_id: instanceId,
        seller_handle: handle,
        price_sats: priceSats,
        platform_fee_sats: platformFee,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mark card as listed
    await supabase
      .from('npgx_card_inventory')
      .update({ listed_price_sats: priceSats, is_locked: true })
      .eq('instance_id', instanceId)

    return NextResponse.json({ success: true, trade })
  }

  // ── BUY A CARD ──
  if (action === 'buy') {
    const { tradeId } = body
    if (!tradeId) return NextResponse.json({ error: 'Missing tradeId' }, { status: 400 })

    // Get listing
    const { data: trade } = await supabase
      .from('npgx_card_trades')
      .select('*')
      .eq('id', tradeId)
      .eq('status', 'listed')
      .single()

    if (!trade) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (trade.seller_handle === handle) return NextResponse.json({ error: 'Cannot buy own card' }, { status: 400 })

    // Charge buyer via HandCash
    let txId: string | null = null
    if (authToken && trade.price_sats > 0) {
      try {
        const amountUsd = trade.price_sats * 0.0005
        const sellerAmount = amountUsd * (1 - PLATFORM_FEE_PCT)
        const platformAmount = amountUsd * PLATFORM_FEE_PCT

        txId = await chargeUser(
          authToken,
          [
            { destination: trade.seller_handle, amount: sellerAmount, currencyCode: 'USD' },
            { destination: PLATFORM_HANDLE, amount: platformAmount, currencyCode: 'USD' },
          ],
          `NPGX card purchase`,
        )
      } catch (err: any) {
        return NextResponse.json({ error: `Payment failed: ${err.message}` }, { status: 402 })
      }
    }

    // Transfer card ownership
    await supabase
      .from('npgx_card_inventory')
      .update({
        owner_handle: handle,
        is_locked: false,
        listed_price_sats: null,
        acquired_via: 'trade',
        acquired_at: new Date().toISOString(),
      })
      .eq('instance_id', trade.card_instance_id)

    // Update trade record
    await supabase
      .from('npgx_card_trades')
      .update({
        buyer_handle: handle,
        tx_id: txId,
        status: 'sold',
        completed_at: new Date().toISOString(),
      })
      .eq('id', tradeId)

    return NextResponse.json({ success: true, txId })
  }

  // ── CANCEL LISTING ──
  if (action === 'cancel') {
    const { tradeId } = body
    if (!tradeId) return NextResponse.json({ error: 'Missing tradeId' }, { status: 400 })

    const { data: trade } = await supabase
      .from('npgx_card_trades')
      .select('*')
      .eq('id', tradeId)
      .eq('seller_handle', handle)
      .eq('status', 'listed')
      .single()

    if (!trade) return NextResponse.json({ error: 'Listing not found or not yours' }, { status: 404 })

    // Unlock card
    await supabase
      .from('npgx_card_inventory')
      .update({ is_locked: false, listed_price_sats: null })
      .eq('instance_id', trade.card_instance_id)

    // Cancel trade
    await supabase
      .from('npgx_card_trades')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', tradeId)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
