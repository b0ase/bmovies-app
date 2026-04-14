import { NextRequest, NextResponse } from 'next/server'
import { queryTokenBalance } from '@/lib/bsv21'

/**
 * GET /api/tokens/balance?address=...&token=$ARIA
 *
 * Returns real BSV-21 token balance via 1Sat Ordinals API.
 * Falls back to 0 if address has no tokens or API is unreachable.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const token = searchParams.get('token')

  if (!address || !token) {
    return NextResponse.json({ error: 'Missing address or token' }, { status: 400 })
  }

  try {
    const balance = await queryTokenBalance(address, token)

    return NextResponse.json({
      address,
      token,
      balance,
      source: 'onchain',
      api: 'ordinals.gorillapool.io',
    })
  } catch (error) {
    console.error('[tokens/balance] Error:', error)
    return NextResponse.json({
      address,
      token,
      balance: 0,
      source: 'error',
      error: error instanceof Error ? error.message : 'Balance query failed',
    })
  }
}
