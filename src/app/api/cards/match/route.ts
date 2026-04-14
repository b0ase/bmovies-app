import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { XP_REWARDS } from '@/lib/cards'
import type { MatchResult, StakeLevel } from '@/lib/cards'

/**
 * POST /api/cards/match — Record a match result + award XP
 * Body: MatchResult (from resolveMatch)
 *
 * GET /api/cards/match — Get match history
 * Query: ?handle=xxx&limit=20
 */

function calcXP(result: MatchResult, isPlayerA: boolean): number {
  const won = (result.winner === 'a' && isPlayerA) || (result.winner === 'b' && !isPlayerA)
  const draw = result.winner === 'draw'

  if (draw) return XP_REWARDS.loss // participation XP for draws

  if (won) {
    switch (result.stakeLevel) {
      case 'casual': return XP_REWARDS.win_casual
      case 'ante': return XP_REWARDS.win_ante
      case 'high_stakes': return XP_REWARDS.win_high_stakes
    }
  }

  return XP_REWARDS.loss
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
  const result = body as MatchResult & { aiDifficulty?: string }

  const xpA = calcXP(result, true)
  const wonA = result.winner === 'a'

  // Record match
  const { error: matchErr } = await supabase.from('npgx_matches').insert({
    challenge_id: result.challenge.id,
    stake_level: result.stakeLevel,
    player_a_handle: handle,
    player_b_handle: null, // AI opponent
    player_a_character: result.playerA.loadout.characterSlug,
    player_b_character: result.playerB.loadout.characterSlug,
    player_a_score: result.playerA.score.totalScore,
    player_b_score: result.playerB.score.totalScore,
    winner: result.winner,
    player_a_loadout: result.playerA.loadout.cards,
    player_b_loadout: result.playerB.loadout.cards,
    player_a_synergies: result.playerA.score.synergyResult.bonuses.map(b => ({ type: b.type, name: b.name })),
    player_b_synergies: result.playerB.score.synergyResult.bonuses.map(b => ({ type: b.type, name: b.name })),
    ai_difficulty: result.aiDifficulty || null,
    xp_awarded_a: xpA,
    xp_awarded_b: 0,
  })

  if (matchErr) {
    return NextResponse.json({ error: matchErr.message }, { status: 500 })
  }

  // Update player stats
  const { data: player } = await supabase
    .from('npgx_players')
    .select('*')
    .eq('handle', handle)
    .single()

  if (player) {
    const mastery = player.character_mastery || {}
    const charSlug = result.playerA.loadout.characterSlug
    if (wonA) {
      mastery[charSlug] = (mastery[charSlug] || 0) + 1
    }

    const newXP = player.xp + xpA
    await supabase
      .from('npgx_players')
      .update({
        xp: newXP,
        level: Math.floor(newXP / 100) + 1,
        total_wins: player.total_wins + (wonA ? 1 : 0),
        total_losses: player.total_losses + (result.winner === 'b' ? 1 : 0),
        total_draws: player.total_draws + (result.winner === 'draw' ? 1 : 0),
        character_mastery: mastery,
      })
      .eq('handle', handle)
  }

  return NextResponse.json({
    success: true,
    xpAwarded: xpA,
    won: wonA,
    newXP: player ? player.xp + xpA : xpA,
    newLevel: player ? Math.floor((player.xp + xpA) / 100) + 1 : 1,
  })
}

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!handle) {
    return NextResponse.json({ error: 'Missing handle' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('npgx_matches')
    .select('*')
    .or(`player_a_handle.eq.${handle},player_b_handle.eq.${handle}`)
    .order('played_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ matches: data || [] })
}
