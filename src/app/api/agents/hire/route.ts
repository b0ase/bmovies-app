/**
 * POST /api/agents/hire
 *
 * Create a direct hire contract between the authenticated user and a
 * named AI agent. The hire becomes a row in bct_agent_hires with
 * status='proposed'. The agent's response (accept / counter / decline)
 * happens out-of-band via the agent-chat layer — this endpoint just
 * records the commitment.
 *
 * Body: { agentId, taskType, brief, feeUsd, offerId? }
 * Resp: 200 { id, status } | 400/401/500 { error }
 */

import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-bmovies-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Keep this in sync with the task-type dropdown on agent.html so
// server-side validation matches the UI. Free-form tasks go into
// 'custom' with their real description in `brief`.
const ALLOWED_TASK_TYPES = new Set([
  'pitch',         // help refine or write a film pitch
  'logline',       // one-sentence pitch
  'synopsis',      // one-page treatment
  'screenplay',    // full screenplay
  'storyboard',    // shot-by-shot frames
  'director_notes',// director's vision / shot list
  'shot_list',     // cinematographer's shot breakdown
  'score',         // composer brief / cue list
  'voice',         // voice-actor performance
  'poster',        // key art / one-sheet
  'cast_list',     // casting director's character breakdown
  'lookbook',      // production designer's lookbook
  'edit',          // editor's pacing / rough cut notes
  'sound_design',  // sound designer's plan
  'custom',
])

export async function POST(req: Request): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
  }

  let body: {
    agentId?: string
    taskType?: string
    brief?: string
    feeUsd?: number
    offerId?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const agentId = (body.agentId || '').trim()
  const taskType = (body.taskType || 'custom').trim()
  const brief = (body.brief || '').trim()
  const feeUsd = Number(body.feeUsd)
  const offerId = body.offerId?.trim() || null

  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  if (!ALLOWED_TASK_TYPES.has(taskType)) {
    return NextResponse.json({ error: `taskType must be one of: ${[...ALLOWED_TASK_TYPES].join(', ')}` }, { status: 400 })
  }
  if (brief.length < 12) {
    return NextResponse.json({ error: 'brief must be at least 12 characters' }, { status: 400 })
  }
  if (brief.length > 4000) {
    return NextResponse.json({ error: 'brief must be under 4000 characters' }, { status: 400 })
  }
  if (!Number.isFinite(feeUsd) || feeUsd < 0) {
    return NextResponse.json({ error: 'feeUsd must be >= 0' }, { status: 400 })
  }
  if (feeUsd > 10_000) {
    return NextResponse.json({ error: 'single-hire cap is $10,000' }, { status: 400 })
  }

  const admin = getAdminClient()

  const { data: userRes, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userRes?.user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  const authUser = userRes.user

  const { data: accountRow } = await admin
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!accountRow) {
    return NextResponse.json({ error: 'Account not found — sign in via a bMovies account to hire agents' }, { status: 400 })
  }
  const hirerAccountId = accountRow.id as string

  // Verify the agent exists — cheap check that stops obviously-bad
  // client input without exposing a probe oracle.
  const { data: agentRow } = await admin
    .from('bct_agents')
    .select('id, name, role')
    .eq('id', agentId)
    .maybeSingle()
  if (!agentRow) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 400 })
  }

  // If offerId provided, verify the user owns it — prevents one user
  // from creating hires against another user's films.
  if (offerId) {
    const { data: offerRow } = await admin
      .from('bct_offers')
      .select('account_id')
      .eq('id', offerId)
      .maybeSingle()
    if (!offerRow) {
      return NextResponse.json({ error: 'offerId references unknown film' }, { status: 400 })
    }
    if (offerRow.account_id && offerRow.account_id !== hirerAccountId) {
      return NextResponse.json({ error: 'You can only attach hires to your own films' }, { status: 403 })
    }
  }

  const { data: inserted, error: insertErr } = await admin
    .from('bct_agent_hires')
    .insert({
      hirer_account_id: hirerAccountId,
      agent_id: agentId,
      offer_id: offerId,
      task_type: taskType,
      brief,
      fee_usd: feeUsd,
      status: 'proposed',
    })
    .select('id, status, created_at')
    .single()

  if (insertErr || !inserted) {
    console.error('[agents/hire] insert failed:', insertErr)
    return NextResponse.json({ error: 'Failed to record hire: ' + (insertErr?.message || 'unknown') }, { status: 500 })
  }

  return NextResponse.json({
    id: inserted.id,
    status: inserted.status,
    agentName: agentRow.name,
    agentRole: agentRow.role,
  })
}
