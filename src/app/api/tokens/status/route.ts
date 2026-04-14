import { NextRequest, NextResponse } from 'next/server'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { isTokenDeployed, DEFAULT_SUPPLY, queryTokenBalance } from '@/lib/bsv21'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tokens/status?symbol=$ARIA
 * GET /api/tokens/status (returns all 27 tokens)
 *
 * Returns on-chain deployment status for NPGX tokens.
 */
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')

  // Single token query
  if (symbol) {
    const status = await isTokenDeployed(symbol)
    const character = NPGX_ROSTER.find(c => c.token === symbol)
    return NextResponse.json({
      symbol,
      name: symbol === '$NPGX' ? 'NPGX' : character?.name || symbol,
      ...status,
      supply: DEFAULT_SUPPLY,
      characterSlug: character?.slug,
    })
  }

  // All tokens — check $NPGX + all 26 character tokens in parallel
  const allSymbols = ['$NPGX', ...NPGX_ROSTER.map(c => c.token)]
  const results = await Promise.all(
    allSymbols.map(async (sym) => {
      const status = await isTokenDeployed(sym)
      const character = NPGX_ROSTER.find(c => c.token === sym)
      return {
        symbol: sym,
        name: sym === '$NPGX' ? 'NPGX' : character?.name || sym,
        deployed: status.deployed,
        txid: status.txid,
        supply: DEFAULT_SUPPLY,
        characterSlug: character?.slug,
        image: character?.image,
        category: character?.category,
      }
    })
  )

  const deployed = results.filter(r => r.deployed).length
  const pending = results.filter(r => !r.deployed).length

  return NextResponse.json({
    tokens: results,
    summary: {
      total: results.length,
      deployed,
      pending,
      protocol: '$402',
      standard: 'BSV-21',
      parentToken: '$NPGX',
    },
  })
}
