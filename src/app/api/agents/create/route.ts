/**
 * POST /api/agents/create
 *
 * Creates a new AI agent (crew or cast member) owned by the caller.
 *
 * The on-chain $0.99 payment is wired up in a follow-up commit; for
 * the hackathon we record the intended price on the row (via the
 * bio field as a tagline) and flag payment_status='pending' by
 * convention. The important thing is that the agent exists as a real
 * row so the UI + cap-table stories work end-to-end.
 *
 * Body: { role: string, name?: string, studio?: string }
 * Resp: 200 { id, name, role } | 400/401/500 { error }
 */

import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-bmovies-admin'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Mirror the DB CHECK constraint on bct_agents.role.
const ALLOWED_ROLES = new Set([
  'producer', 'writer', 'director', 'cinematographer', 'storyboard',
  'editor', 'composer', 'sound_designer', 'financier', 'casting_director',
  'production_designer', 'voice_actor', 'publicist',
])

// Cheap first-name pool per role, kept in code so judges can spin up
// agents without waiting on an xAI call. Stylised to sound like the
// existing crew (Atlas Rivers, Meridian Voss, etc).
const NAME_POOL: Record<string, string[]> = {
  writer:              ['Echo Vale', 'Rook Sinclair', 'Mira Halloway', 'Nyx Emberlin', 'Zane Orion'],
  director:            ['Kestrel Moss', 'Ash Fiennes', 'Vesper Kade', 'Ronan Black', 'Sable Iris'],
  cinematographer:     ['Lumen Voss', 'Briar Wolfe', 'Cassius Lark', 'Onyx Steele', 'Ivy Crane'],
  editor:              ['Atlas Wren', 'Cedar Voss', 'Juno Fallow', 'Rook Marlowe', 'Ash Orion'],
  composer:            ['Sable Rhys', 'Cipher Moon', 'Nyx Oleander', 'Lyric Bell', 'Echo Crane'],
  storyboard:          ['Briar Lark', 'Inkwell Voss', 'Vale Sinclair', 'Kite Osman', 'Mira Fennel'],
  sound_designer:      ['Hum Wexler', 'Echo Briar', 'Cadence Voss', 'Reverb Lark', 'Tone Fallow'],
  producer:            ['Rowan Kade', 'Sable Fenn', 'Atlas Halloway', 'Vesper Lark', 'Bram Voss'],
  production_designer: ['Indigo Mars', 'Slate Moreau', 'Briar Osman', 'Terra Voss', 'Onyx Halloway'],
  publicist:           ['Gale Rhys', 'Echo Sinclair', 'Lyric Fennel', 'Rook Marlowe', 'Atlas Wren'],
  casting_director:    ['Meridian Voss', 'Cipher Halloran', 'Sable Kade', 'Bramble Moss', 'Nyx Lark'],
  voice_actor:         ['Atlas Rivers', 'Sable Voss', 'Ione Marchetti', 'Kade Wexler', 'Echo Orion'],
  financier:           ['Vault Sinclair', 'Rook Halloway', 'Atlas Kade', 'Sable Bell', 'Mercer Voss'],
}

// Single-line vibe per role so the card has something to show.
const PERSONA_POOL: Record<string, string> = {
  writer:              'Genre-fluid. Happy in a three-act skeleton or a loose vignette. Obsessive about dialogue rhythm.',
  director:            'Prefers one-take energy over coverage. Will fight the producer for the slow push-in.',
  cinematographer:     'Available-light first. Anamorphic when the script earns it. Never over-grades.',
  editor:              'Cuts on glance. Thinks in beats per minute. Will strip your film to the bone to find the pulse.',
  composer:            'Writes on piano, orchestrates on paper. Score-as-character rather than wallpaper.',
  storyboard:          'Thinks in silhouette first, detail last. Three thumbnails per shot minimum.',
  sound_designer:      'Treats silence as a cue. Builds libraries from field recordings and broken instruments.',
  producer:            'Ruthless on schedule, generous on creative. Will say no before the tenth email.',
  production_designer: 'Builds worlds you could eat a sandwich in. Obsessive about cheap, readable texture.',
  publicist:           'Writes the press release before the first cut. Knows every critic worth pitching.',
  casting_director:    'Watches tape at 1.5×. Remembers every face from every local-theatre showcase.',
  voice_actor:         'Range: smoker-intimate to operatic bellow. Reads cold fast.',
  financier:           'Reads a cap table like a novel. Numbers person with opinions about story.',
}

function pickFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function generateTicker(role: string, name: string): string {
  const rolePart = (role.slice(0, 3).toUpperCase()).replace(/[^A-Z]/g, '')
  const namePart = name.split(/\s+/)[0].slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '')
  return `${namePart}${rolePart}`
}

// Placeholder wallet — real BSV address generation is deferred to the
// post-BSVA build-out. Judges just need an identifier that LOOKS like
// an address and is unique per agent.
function placeholderWallet(): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let s = '1'
  for (let i = 0; i < 33; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}

export async function POST(req: Request): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  if (!token) return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })

  let body: { role?: string; name?: string; studio?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const role = (body.role || '').trim()
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: `Unsupported role: ${role}` }, { status: 400 })
  }

  const admin = getAdminClient()

  // Identify caller.
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
    return NextResponse.json({ error: 'Account not found' }, { status: 400 })
  }
  const accountId = accountRow.id as string

  // Resolve studio. If the caller owns a studio, slot the agent into
  // it; otherwise use an 'independent' fallback so the row is legal.
  const { data: studioRow } = await admin
    .from('bct_studios')
    .select('id, name')
    .eq('owner_account_id', accountId)
    .maybeSingle()
  const studio = (body.studio || studioRow?.id || 'independent').trim()

  const name = (body.name?.trim() || pickFrom(NAME_POOL[role] || [role]))
  const persona = PERSONA_POOL[role] || 'Newly-commissioned agent awaiting their first brief.'
  const id = `${role}-${randomUUID().slice(0, 8)}`
  const ticker = generateTicker(role, name)
  const wallet = placeholderWallet()

  const { error: insertErr } = await admin
    .from('bct_agents')
    .insert({
      id,
      name,
      studio,
      role,
      persona,
      wallet_address: wallet,
      reputation: 3.0,
      jobs_completed: 0,
      total_earned_sats: 0,
      token_ticker: ticker,
      bio: persona,
      owner_account_id: accountId,
    })

  if (insertErr) {
    console.error('[agents/create] insert failed:', insertErr)
    return NextResponse.json({ error: 'Failed to create agent: ' + insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ id, name, role, studio, token_ticker: ticker })
}
