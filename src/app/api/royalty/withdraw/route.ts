/**
 * POST /api/royalty/withdraw
 *
 * Records a royalty withdrawal request for the authenticated user.
 * Client must send the Supabase access token in the Authorization
 * header. We verify it with the admin client, then:
 *   1) Compute available balance (accrued royalties minus prior
 *      pending/sent withdrawals)
 *   2) Reject if requested amount > available
 *   3) Insert a pending row in bct_royalty_withdrawals
 *
 * A separate worker picks up pending rows and sends the MNEE
 * stablecoin payout — out of scope for this route.
 *
 * Body:  { amountUsd: number, mneeAddress: string, offerId?: string }
 * Resp:  200 { id, status, available } | 400/401/500 { error }
 */

import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-bmovies-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// MNEE lives on BSV; stablecoin addresses share the P2PKH format (1...).
// Strict checksum validation is the worker's job — here we just filter
// obvious junk so the UI can surface a clear error.
function looksLikeAddress(s: string): boolean {
  if (typeof s !== 'string') return false
  const trimmed = s.trim()
  return /^[13][1-9A-HJ-NP-Za-km-z]{25,39}$/.test(trimmed)
}

export async function POST(req: Request): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
  }

  let body: { amountUsd?: number; mneeAddress?: string; offerId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const amountUsd = Number(body.amountUsd)
  const mneeAddress = (body.mneeAddress || '').trim()
  const offerId = body.offerId?.trim() || null

  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return NextResponse.json({ error: 'amountUsd must be > 0' }, { status: 400 })
  }
  if (amountUsd > 10_000) {
    return NextResponse.json({ error: 'Amount exceeds single-withdrawal cap' }, { status: 400 })
  }
  if (!looksLikeAddress(mneeAddress)) {
    return NextResponse.json({ error: 'mneeAddress is not a valid BSV/MNEE address' }, { status: 400 })
  }

  const admin = getAdminClient()

  // Identify caller by verifying the JWT they sent.
  const { data: userRes, error: userErr } = await admin.auth.getUser(token)
  const authUser = userRes?.user
  if (userErr || !authUser) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  // Check KYC verified — regulated feature.
  const { data: accountRow } = await admin
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!accountRow) {
    return NextResponse.json({ error: 'Account record not found' }, { status: 400 })
  }
  const accountId = accountRow.id as string

  const { data: kyc } = await admin
    .from('bct_user_kyc')
    .select('status')
    .eq('account_id', accountId)
    .maybeSingle()

  if (kyc?.status !== 'verified') {
    return NextResponse.json({ error: 'KYC verification required to withdraw' }, { status: 403 })
  }

  // Compute accrued royalties from commissioned offers.
  // (share_sales buyers earn royalties too — we'll credit them when
  // the revenue-split worker runs; for now the fast path covers the
  // commissioner model.)
  const { data: myOffers } = await admin
    .from('bct_offers')
    .select('id, commissioner_percent')
    .eq('account_id', accountId)

  let accrued = 0
  if (myOffers && myOffers.length > 0) {
    const offerIds = myOffers.map((o) => o.id as string)
    const { data: tix } = await admin
      .from('bct_ticket_sales')
      .select('offer_id, price_usd')
      .in('offer_id', offerIds)
    const revByOffer = new Map<string, number>()
    for (const t of tix ?? []) {
      const prev = revByOffer.get(t.offer_id as string) ?? 0
      revByOffer.set(t.offer_id as string, prev + Number(t.price_usd ?? 0))
    }
    for (const o of myOffers) {
      const rev = revByOffer.get(o.id as string) ?? 0
      const pct = Number(o.commissioner_percent ?? 99) / 100
      accrued += rev * pct
    }
  }

  const { data: prior } = await admin
    .from('bct_royalty_withdrawals')
    .select('amount_usd, status')
    .eq('account_id', accountId)
    .in('status', ['pending', 'sent'])

  const drawn = (prior ?? []).reduce((sum, r) => sum + Number(r.amount_usd ?? 0), 0)
  const available = Math.max(0, Math.round((accrued - drawn) * 100) / 100)

  if (amountUsd > available) {
    return NextResponse.json(
      { error: `Insufficient royalty balance. Available: $${available.toFixed(2)}`, available },
      { status: 400 },
    )
  }

  const { data: inserted, error: insertErr } = await admin
    .from('bct_royalty_withdrawals')
    .insert({
      account_id: accountId,
      offer_id: offerId,
      amount_usd: amountUsd,
      mnee_address: mneeAddress,
      status: 'pending',
    })
    .select('id, status')
    .single()

  if (insertErr || !inserted) {
    console.error('[royalty/withdraw] insert failed:', insertErr)
    return NextResponse.json({ error: 'Failed to record withdrawal' }, { status: 500 })
  }

  return NextResponse.json({
    id: inserted.id,
    status: inserted.status,
    available: Math.max(0, available - amountUsd),
  })
}
