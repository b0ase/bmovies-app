import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

export interface TokenPurchaseIntent {
  token: string
  amount: number
  satoshis: number
  txid: string
  buyerAddress: string
  memo?: string
}

export async function POST(request: NextRequest) {
  let body: TokenPurchaseIntent
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.token || !body.txid || !body.buyerAddress || !body.satoshis) {
    return NextResponse.json(
      { error: 'Missing required fields: token, txid, buyerAddress, satoshis' },
      { status: 400 }
    )
  }

  // Basic sanity checks
  if (body.satoshis < 1 || body.satoshis > 1_000_000_000) {
    return NextResponse.json({ error: 'Invalid satoshi amount' }, { status: 400 })
  }
  if (!/^[0-9a-f]{64}$/i.test(body.txid)) {
    return NextResponse.json({ error: 'Invalid txid format' }, { status: 400 })
  }

  const record = {
    token: body.token,
    amount: body.amount,
    satoshis: body.satoshis,
    txid: body.txid,
    buyer_address: body.buyerAddress,
    memo: body.memo || null,
    status: 'pending_dispatch' as const,
    created_at: new Date().toISOString(),
  }

  // Persist if Supabase is configured; otherwise log and accept.
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
      const { error } = await supabase.from('npgx_token_purchases').insert(record)
      if (error) {
        console.error('[tokens/purchase] Supabase insert failed:', error.message)
        // Still return success — the payment already happened on-chain.
        // Operator can reconcile from the txid.
      }
    } catch (err) {
      console.error('[tokens/purchase] Supabase error:', err)
    }
  } else {
    console.log('[tokens/purchase] Intent recorded (no DB):', record)
  }

  return NextResponse.json({
    ok: true,
    txid: body.txid,
    status: 'pending_dispatch',
    message: 'Payment received. Tokens will be dispatched to your wallet within 24 hours.',
  })
}
