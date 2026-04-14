/**
 * BSV-21 Token Deployment — On-Chain
 *
 * Uses js-1sat-ord's deployBsv21Token() to create deploy+mint transactions,
 * then broadcasts via b0ase.com / WhatsOnChain.
 *
 * Flow:
 *   1. Parse treasury wallet (PayPK + OrdPK)
 *   2. Fetch payment UTXOs from WhatsOnChain
 *   3. Build deploy+mint tx via js-1sat-ord
 *   4. Broadcast signed tx
 *   5. Record deployment txid
 *
 * Each token is deploy+mint in a single tx — the full 1B supply goes to the
 * treasury ord address. From there, tokens can be distributed/sold.
 */

import { deployBsv21Token } from 'js-1sat-ord'
import type { Utxo } from 'js-1sat-ord'
import { getTreasuryWallet, fetchUtxos, broadcastTx } from './treasury'
import {
  NPGX_TOKEN,
  characterTokenConfig,
  DEFAULT_SUPPLY,
  isTokenDeployed,
} from './bsv21'
import { NPGX_ROSTER } from './npgx-roster'

export interface DeployResult {
  symbol: string
  name: string
  status: 'deployed' | 'already_deployed' | 'error'
  txid?: string
  broadcaster?: string
  error?: string
}

/**
 * Deploy a single BSV-21 token on-chain.
 * Uses deploy+mint to issue the full 1B supply to the treasury ord address.
 */
export async function deployToken(
  symbol: string,
  paymentUtxos: Utxo[]
): Promise<{ result: DeployResult; remainingUtxos: Utxo[] }> {
  // Check if already deployed
  const existing = await isTokenDeployed(symbol)
  if (existing.deployed) {
    return {
      result: {
        symbol,
        name: symbol,
        status: 'already_deployed',
        txid: existing.txid,
      },
      remainingUtxos: paymentUtxos,
    }
  }

  const wallet = getTreasuryWallet()
  const cleanSymbol = symbol.replace('$', '')

  // Get the token config
  let config
  if (symbol === '$NPGX') {
    config = NPGX_TOKEN
  } else {
    const character = NPGX_ROSTER.find(c => c.token === symbol)
    if (!character) throw new Error(`Unknown token: ${symbol}`)
    config = characterTokenConfig(character)
  }

  const supply = config.supply ?? DEFAULT_SUPPLY

  try {
    // Build deploy+mint transaction
    const { tx, payChange } = await deployBsv21Token({
      symbol: cleanSymbol,
      icon: `https://www.npg-x.com/icons/icon-192.png`, // token icon outpoint or URL
      utxos: paymentUtxos,
      initialDistribution: {
        address: wallet.ordAddress,
        tokens: supply,
      },
      paymentPk: wallet.payPk,
      destinationAddress: wallet.ordAddress,
      changeAddress: wallet.payAddress,
      satsPerKb: 1, // 1 sat/kb is standard for BSV
    })

    // Serialize and broadcast
    const rawTxHex = tx.toHex()
    const { txid, broadcaster } = await broadcastTx(rawTxHex)

    // Build remaining UTXOs from change
    const remaining: Utxo[] = []
    if (payChange) {
      remaining.push(payChange)
    }

    return {
      result: {
        symbol,
        name: config.name,
        status: 'deployed',
        txid,
        broadcaster,
      },
      remainingUtxos: remaining,
    }
  } catch (error) {
    return {
      result: {
        symbol,
        name: config.name,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
      remainingUtxos: paymentUtxos, // UTXOs not spent on error
    }
  }
}

/**
 * Deploy all 27 tokens sequentially.
 * Each deploy uses the change UTXO from the previous deploy.
 * $NPGX is deployed first (parent), then all 26 character tokens.
 *
 * Yields results as they complete for streaming progress.
 */
export async function* deployAllTokens(): AsyncGenerator<DeployResult> {
  const wallet = getTreasuryWallet()

  // Fetch initial UTXOs
  let utxos: Utxo[] = await fetchUtxos(wallet.payAddress)

  // Deploy $NPGX first (parent token)
  const allSymbols = ['$NPGX', ...NPGX_ROSTER.map(c => c.token)]

  for (const symbol of allSymbols) {
    if (utxos.length === 0) {
      // Try to refetch UTXOs (previous change may have propagated)
      await new Promise(r => setTimeout(r, 1000))
      utxos = await fetchUtxos(wallet.payAddress)
    }

    const { result, remainingUtxos } = await deployToken(symbol, utxos)
    utxos = remainingUtxos
    yield result

    // Small delay between broadcasts to avoid mempool issues
    if (result.status === 'deployed') {
      await new Promise(r => setTimeout(r, 500))
    }
  }
}

/**
 * Deploy a single token by symbol. Convenience wrapper.
 */
export async function deploySingleToken(symbol: string): Promise<DeployResult> {
  const wallet = getTreasuryWallet()
  const utxos = await fetchUtxos(wallet.payAddress)
  const { result } = await deployToken(symbol, utxos)
  return result
}

/**
 * Check deployment status for all 27 tokens.
 */
export async function checkAllDeployments(): Promise<DeployResult[]> {
  const allSymbols = ['$NPGX', ...NPGX_ROSTER.map(c => c.token)]
  const results: DeployResult[] = []

  for (const symbol of allSymbols) {
    const existing = await isTokenDeployed(symbol)
    results.push({
      symbol,
      name: symbol,
      status: existing.deployed ? 'already_deployed' : 'error',
      txid: existing.txid,
      error: existing.deployed ? undefined : 'not deployed',
    })
  }

  return results
}
