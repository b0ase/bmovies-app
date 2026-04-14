/**
 * NPGX Treasury Wallet
 *
 * Parses the Yours wallet JSON from NPGX_TREASURY_WALLET env var.
 * Provides PrivateKey instances for PayPK (funding) and OrdPK (ordinals/tokens).
 *
 * SECURITY: Keys are parsed at runtime from env vars only.
 * Never log, return, or expose private key material.
 */

import { PrivateKey, P2PKH } from '@bsv/sdk'

export interface TreasuryWallet {
  payPk: PrivateKey
  ordPk: PrivateKey
  identityPk: PrivateKey
  payAddress: string
  ordAddress: string
  identityAddress: string
}

/**
 * Parse the NPGX_TREASURY_WALLET env var (Yours wallet JSON format).
 * Expected keys: mnemonic, payPk, payDerivationPath, ordPk, ordDerivationPath,
 *                identityPk, identityDerivationPath
 *
 * The Pk fields are WIF-encoded private keys.
 */
export function getTreasuryWallet(): TreasuryWallet {
  const raw = process.env.NPGX_TREASURY_WALLET
  if (!raw) {
    throw new Error('NPGX_TREASURY_WALLET env var not set')
  }

  let wallet: Record<string, string>
  try {
    wallet = JSON.parse(raw)
  } catch {
    throw new Error('NPGX_TREASURY_WALLET is not valid JSON')
  }

  if (!wallet.payPk || !wallet.ordPk || !wallet.identityPk) {
    throw new Error('NPGX_TREASURY_WALLET missing required keys (payPk, ordPk, identityPk)')
  }

  const payPk = PrivateKey.fromWif(wallet.payPk)
  const ordPk = PrivateKey.fromWif(wallet.ordPk)
  const identityPk = PrivateKey.fromWif(wallet.identityPk)

  return {
    payPk,
    ordPk,
    identityPk,
    payAddress: payPk.toAddress(),
    ordAddress: ordPk.toAddress(),
    identityAddress: identityPk.toAddress(),
  }
}

/**
 * Get P2PKH locking script hex for an address.
 * Used to match UTXOs from WhatsOnChain (which return script in hex).
 */
export function addressToLockingScriptHex(address: string): string {
  return new P2PKH().lock(address).toHex()
}

/**
 * Fetch UTXOs for a BSV address via WhatsOnChain.
 * Returns in the format js-1sat-ord expects.
 */
export async function fetchUtxos(address: string): Promise<Array<{
  satoshis: number
  txid: string
  vout: number
  script: string
}>> {
  const res = await fetch(
    `https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`,
    { signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) {
    throw new Error(`WoC UTXO fetch failed: ${res.status}`)
  }
  const utxos: Array<{ tx_hash: string; tx_pos: number; value: number }> = await res.json()
  if (!Array.isArray(utxos) || utxos.length === 0) {
    throw new Error(`No UTXOs found for ${address}. Fund the treasury wallet first.`)
  }

  // WoC doesn't return scripts, so we derive from address
  const scriptHex = addressToLockingScriptHex(address)

  return utxos.map(u => ({
    satoshis: u.value,
    txid: u.tx_hash,
    vout: u.tx_pos,
    script: scriptHex,
  }))
}

/**
 * Broadcast a raw transaction via b0ase.com's tx broadcaster.
 * Falls back to WhatsOnChain if b0ase.com is unreachable.
 */
export async function broadcastTx(rawTxHex: string): Promise<{ txid: string; broadcaster: string }> {
  // Try b0ase.com broadcaster first (Gorilla Pool)
  try {
    const res = await fetch('https://b0ase.com/api/tx-broadcaster/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawTx: rawTxHex, broadcasterType: 'onesat' }),
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.txid) return { txid: data.txid, broadcaster: 'b0ase-onesat' }
    }
  } catch {
    // fall through
  }

  // Fallback: WhatsOnChain
  const res = await fetch('https://api.whatsonchain.com/v1/bsv/main/tx/raw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txhex: rawTxHex }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    throw new Error(`Broadcast failed: ${res.status} ${err}`)
  }
  const txid = await res.text()
  return { txid: txid.replace(/"/g, ''), broadcaster: 'woc' }
}
