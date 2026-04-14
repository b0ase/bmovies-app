import { NextRequest, NextResponse } from 'next/server'
import {
  prepareDeploy,
  characterTokenConfig,
  NPGX_TOKEN,
  isTokenDeployed,
} from '@/lib/bsv21'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { supabase } from '@/lib/supabase'
import { deploySingleToken, deployAllTokens, checkAllDeployments } from '@/lib/deploy-tokens'

/**
 * POST /api/tokens/deploy
 *
 * Deploy BSV-21 tokens on-chain.
 *
 * Body options:
 *   { symbol: "$NPGX" }           — deploy single token
 *   { symbol: "$ARIA" }           — deploy single character token
 *   { deployAll: true }           — deploy all 27 tokens sequentially
 *   { checkStatus: true }         — check deployment status for all tokens
 *   { symbol: "$NPGX", dry: true } — prepare inscription without broadcasting
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, deployAll, checkStatus, dry } = body

    // ── Check status ──
    if (checkStatus) {
      const results = await checkAllDeployments()
      const deployed = results.filter(r => r.status === 'already_deployed')
      return NextResponse.json({
        total: results.length,
        deployed: deployed.length,
        pending: results.length - deployed.length,
        tokens: results,
      })
    }

    // ── Deploy all 27 tokens ──
    if (deployAll) {
      const results = []
      for await (const result of deployAllTokens()) {
        results.push(result)

        // Record to Supabase
        if (supabase && result.txid) {
          const config = symbol === '$NPGX' ? NPGX_TOKEN
            : characterTokenConfig(NPGX_ROSTER.find(c => c.token === result.symbol)!)
          await supabase.from('npgx_token_deployments').upsert({
            symbol: result.symbol,
            name: result.name,
            txid: result.txid,
            status: 'confirmed',
            supply: 1_000_000_000,
            parent_symbol: result.symbol === '$NPGX' ? null : '$NPGX',
            character_slug: config?.characterSlug || null,
            deployed_at: new Date().toISOString(),
          }, { onConflict: 'symbol' }).then(() => {})
        }
      }

      const deployed = results.filter(r => r.status === 'deployed')
      const existing = results.filter(r => r.status === 'already_deployed')
      const errors = results.filter(r => r.status === 'error')

      return NextResponse.json({
        success: true,
        summary: {
          deployed: deployed.length,
          alreadyDeployed: existing.length,
          errors: errors.length,
          total: results.length,
        },
        results,
      })
    }

    // ── Single token ──
    if (!symbol) {
      return NextResponse.json({ error: 'symbol required (or use deployAll: true)' }, { status: 400 })
    }

    // Dry run — just prepare the inscription JSON
    if (dry) {
      let config
      if (symbol === '$NPGX') {
        config = NPGX_TOKEN
      } else {
        const character = NPGX_ROSTER.find(c => c.token === symbol)
        if (!character) {
          return NextResponse.json({ error: `Unknown token: ${symbol}` }, { status: 400 })
        }
        config = characterTokenConfig(character)
      }

      const result = prepareDeploy(config)
      return NextResponse.json({
        success: result.success,
        status: 'dry_run',
        symbol,
        inscription: result.inscription ? JSON.parse(result.inscription) : null,
        error: result.error,
      })
    }

    // Check if already deployed
    const onChain = await isTokenDeployed(symbol)
    if (onChain.deployed) {
      return NextResponse.json({
        success: true,
        status: 'already_deployed',
        txid: onChain.txid,
        symbol,
      })
    }

    // Deploy on-chain
    const result = await deploySingleToken(symbol)

    // Record to Supabase
    if (supabase && result.txid) {
      let config
      if (symbol === '$NPGX') config = NPGX_TOKEN
      else {
        const char = NPGX_ROSTER.find(c => c.token === symbol)
        if (char) config = characterTokenConfig(char)
      }

      await supabase.from('npgx_token_deployments').upsert({
        symbol,
        name: result.name,
        txid: result.txid,
        status: 'confirmed',
        supply: 1_000_000_000,
        parent_symbol: symbol === '$NPGX' ? null : '$NPGX',
        character_slug: config?.characterSlug || null,
        deployed_at: new Date().toISOString(),
      }, { onConflict: 'symbol' }).then(() => {})
    }

    return NextResponse.json({
      success: result.status !== 'error',
      ...result,
    })
  } catch (error) {
    console.error('[tokens/deploy] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Deploy failed',
    }, { status: 500 })
  }
}
