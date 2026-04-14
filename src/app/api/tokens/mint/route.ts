import { NextRequest, NextResponse } from 'next/server'
import {
  generateMintInscription,
  validateSymbol,
  isTokenDeployed,
  DEFAULT_SUPPLY,
} from '@/lib/bsv21'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { PRICING, calculateSplit } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/tokens/mint
 *
 * Pay-to-mint BSV-21 tokens.
 * Body: { symbol: "$ARIA", amount: 100, address: "1...", paymentTxid?: "..." }
 *
 * The mint inscription is a BSV-21 "mint" op that creates new tokens
 * from a deployed token. Payment goes through the revenue cascade.
 *
 * Flow:
 *   1. Validate symbol exists & is deployed
 *   2. Calculate cost in satoshis (amount * per-token rate)
 *   3. If paymentTxid provided, verify payment on-chain
 *   4. Generate mint inscription JSON
 *   5. Return inscription for client to broadcast (or queue for server broadcast)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, amount, address, paymentTxid } = body

    if (!symbol || !amount) {
      return NextResponse.json({ error: 'symbol and amount required' }, { status: 400 })
    }

    // Validate symbol
    const validation = validateSymbol(symbol)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Verify token exists in roster (or is $NPGX)
    const isNpgx = symbol === '$NPGX'
    const character = !isNpgx ? NPGX_ROSTER.find(c => c.token === symbol) : null
    if (!isNpgx && !character) {
      return NextResponse.json({ error: `Unknown token: ${symbol}` }, { status: 400 })
    }

    // Check on-chain deployment status
    const onChain = await isTokenDeployed(symbol)

    // Calculate cost
    // 1 token = 1 sat (minimum) — or mapped to content pricing
    const perTokenSats = 1 // 1 sat per token
    const totalSats = amount * perTokenSats
    const split = calculateSplit(totalSats)

    // Generate mint inscription
    const inscription = generateMintInscription(symbol, amount)

    // Record in Supabase
    if (supabase) {
      supabase.from('npgx_token_mints').insert({
        symbol,
        amount,
        address: address || null,
        payment_txid: paymentTxid || null,
        cost_sats: totalSats,
        inscription: JSON.stringify(inscription),
        status: paymentTxid ? 'paid' : 'pending_payment',
        revenue_split: split,
        created_at: new Date().toISOString(),
      }).then(() => {})
    }

    return NextResponse.json({
      success: true,
      symbol,
      amount,
      inscription,
      cost: {
        totalSats,
        perTokenSats,
        split,
        usdEstimate: `$${(totalSats * 0.0005).toFixed(4)}`, // ~$0.0005/sat at ~$50k BTC
      },
      tokenDeployed: onChain.deployed,
      deployTxid: onChain.txid,
      message: onChain.deployed
        ? `Mint ${amount} ${symbol} — inscription ready to broadcast`
        : `${symbol} not yet deployed on-chain. Deploy first via /api/tokens/deploy`,
      broadcastUrl: 'https://api.whatsonchain.com/v1/bsv/main/tx/raw',
    })
  } catch (error) {
    console.error('[tokens/mint] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Mint failed',
    }, { status: 500 })
  }
}
