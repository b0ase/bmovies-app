import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { chargeUser, PLATFORM_HANDLE } from '@/lib/handcash'
import { PRICING, calculateSplit } from '@/lib/pricing'
import { openPack, type PackType } from '@/lib/cards'

/**
 * POST /api/cards/pack-buy — Purchase and open a card pack
 * Body: { packType: 'starter' | 'booster' | 'premium' | 'legendary' }
 *
 * Flow:
 * 1. Validate pack type
 * 2. Charge user via HandCash
 * 3. Open pack (random cards)
 * 4. Save cards to inventory
 * 5. Award XP
 * 6. Return cards
 */

const VALID_PACKS: PackType[] = ['starter', 'booster', 'premium', 'legendary']

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const handle = cookieStore.get('npgx_handle')?.value
  const authToken = cookieStore.get('npgx_auth')?.value

  if (!handle) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const packType = body.packType as PackType

  if (!VALID_PACKS.includes(packType)) {
    return NextResponse.json({ error: `Invalid pack type. Must be: ${VALID_PACKS.join(', ')}` }, { status: 400 })
  }

  const priceKey = `pack-${packType}`
  const pricing = PRICING[priceKey]
  if (!pricing) {
    return NextResponse.json({ error: 'Pack pricing not found' }, { status: 500 })
  }

  // ── Payment ──
  let txId: string | null = null

  // Dev mode: skip payment if no auth token
  if (authToken && pricing.costSats > 0) {
    try {
      const amountUsd = pricing.costSats * 0.0005 // approximate sat → USD
      txId = await chargeUser(
        authToken,
        [{ destination: PLATFORM_HANDLE, amount: amountUsd, currencyCode: 'USD' }],
        `NPGX ${packType} card pack`,
      )
    } catch (err: any) {
      return NextResponse.json({ error: `Payment failed: ${err.message}` }, { status: 402 })
    }
  }

  // ── Open Pack ──
  const pack = openPack(packType)

  // ── Save to DB ──
  if (supabase) {
    // Ensure player exists
    const { data: existingPlayer } = await supabase
      .from('npgx_players')
      .select('handle, xp')
      .eq('handle', handle)
      .single()

    if (!existingPlayer) {
      await supabase.from('npgx_players').insert({ handle, xp: 5 }) // +5 XP for first pack
    } else {
      // Award pack opening XP
      await supabase
        .from('npgx_players')
        .update({
          xp: existingPlayer.xp + 5,
          level: Math.floor((existingPlayer.xp + 5) / 100) + 1,
        })
        .eq('handle', handle)
    }

    // Insert cards into inventory
    const rows = pack.cards.map(c => ({
      owner_handle: handle,
      card_id: c.id,
      rarity: c.rarity,
      acquired_via: `pack_${packType}`,
      pack_tx_id: txId,
    }))

    await supabase.from('npgx_card_inventory').insert(rows)
  }

  return NextResponse.json({
    success: true,
    packType,
    txId,
    priceSats: pricing.costSats,
    cards: pack.cards,
    guaranteedRarity: pack.guaranteedRarity,
  })
}
