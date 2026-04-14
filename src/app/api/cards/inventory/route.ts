import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

/**
 * GET /api/cards/inventory — List user's card inventory
 * Query params: ?rarity=rare&slot=top&limit=100&offset=0
 *
 * POST /api/cards/inventory — Add cards to inventory (internal, after pack purchase)
 * Body: { handle, cards: [{ card_id, rarity, acquired_via, pack_tx_id? }] }
 */

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const handle = cookieStore.get('npgx_handle')?.value
  if (!handle) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const rarity = searchParams.get('rarity')
  const limit = parseInt(searchParams.get('limit') || '200')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('npgx_card_inventory')
    .select('*')
    .eq('owner_handle', handle)
    .order('acquired_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (rarity) query = query.eq('rarity', rarity)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ cards: data || [], total: data?.length || 0 })
}

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const body = await req.json()
  const { handle, cards, pack_tx_id } = body

  if (!handle || !cards?.length) {
    return NextResponse.json({ error: 'Missing handle or cards' }, { status: 400 })
  }

  // Ensure player exists
  const { data: player } = await supabase
    .from('npgx_players')
    .select('handle')
    .eq('handle', handle)
    .single()

  if (!player) {
    await supabase.from('npgx_players').insert({ handle })
  }

  // Insert cards
  const rows = cards.map((c: any) => ({
    owner_handle: handle,
    card_id: c.card_id,
    rarity: c.rarity,
    acquired_via: c.acquired_via || 'pack',
    pack_tx_id: pack_tx_id || null,
  }))

  const { data, error } = await supabase
    .from('npgx_card_inventory')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, cards: data })
}
