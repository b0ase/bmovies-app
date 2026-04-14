import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { LEVEL_UNLOCKS, MASTERY_TIERS } from '@/lib/cards'

/**
 * GET /api/cards/profile — Get player profile with stats, mastery, unlocks
 * POST /api/cards/profile — Create/update player profile
 */

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const handle = cookieStore.get('npgx_handle')?.value
  const queryHandle = new URL(req.url).searchParams.get('handle')
  const targetHandle = queryHandle || handle

  if (!targetHandle) {
    return NextResponse.json({ error: 'No handle provided' }, { status: 400 })
  }

  if (!supabase) {
    // Return default profile when DB not configured
    return NextResponse.json({
      profile: {
        handle: targetHandle,
        level: 1,
        xp: 0,
        total_wins: 0,
        total_losses: 0,
        total_draws: 0,
        character_mastery: {},
        unlocks: [],
        mastery_tiers: {},
      },
    })
  }

  const { data: player } = await supabase
    .from('npgx_players')
    .select('*')
    .eq('handle', targetHandle)
    .single()

  if (!player) {
    return NextResponse.json({
      profile: {
        handle: targetHandle,
        level: 1,
        xp: 0,
        total_wins: 0,
        total_losses: 0,
        total_draws: 0,
        character_mastery: {},
        unlocks: [],
        mastery_tiers: {},
      },
    })
  }

  // Calculate unlocks
  const unlocks = Object.entries(LEVEL_UNLOCKS)
    .filter(([lvl]) => player.level >= parseInt(lvl))
    .map(([, feature]) => feature)

  // Calculate mastery tiers per character
  const mastery = player.character_mastery || {}
  const masteryTiers: Record<string, string> = {}
  for (const [slug, wins] of Object.entries(mastery) as [string, number][]) {
    const entries = Object.entries(MASTERY_TIERS) as [string, string][]
    for (const [threshold, tier] of entries.reverse()) {
      if (wins >= parseInt(threshold)) {
        masteryTiers[slug] = tier
        break
      }
    }
  }

  // Get inventory count
  const { count } = await supabase
    .from('npgx_card_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('owner_handle', targetHandle)

  return NextResponse.json({
    profile: {
      ...player,
      unlocks,
      mastery_tiers: masteryTiers,
      card_count: count || 0,
    },
  })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const handle = cookieStore.get('npgx_handle')?.value
  if (!handle) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const body = await req.json()

  // Upsert player
  const { data, error } = await supabase
    .from('npgx_players')
    .upsert({
      handle,
      display_name: body.displayName || handle,
      avatar_url: body.avatarUrl || null,
    }, { onConflict: 'handle' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, profile: data })
}
