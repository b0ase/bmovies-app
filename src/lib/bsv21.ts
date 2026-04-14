/**
 * BSV-21 Token Infrastructure for NPGX
 *
 * Ported from path402/packages/core/src/token/mint.ts
 * No @bsv/sdk dependency — generates inscription JSON + broadcasts via WhatsOnChain API.
 *
 * Token hierarchy:
 *   $NPGX (parent)
 *     └── $ARIA, $BLADE, $CHERRYX ... $ZERODICE (26 character tokens)
 *         └── per-content tokens (future)
 *
 * Each character token is a $402 content ticket:
 *   - Circular economy (redeemed tokens return to issuer, never burned)
 *   - 1sat ordinal inscriptions on BSV
 *   - Revenue cascade: 50% content → 25% character → 12.5% $NPGX → 6.25% $NPG → 6.25% $BOASE
 */

import { createHash } from 'crypto'
import { NPGX_ROSTER, type NPGXCharacter } from './npgx-roster'

// ── Types ──────────────────────────────────────────────────────────

export interface BSV21DeployInscription {
  p: 'bsv-21'
  op: 'deploy'
  tick: string
  max: string
  dec: string
  path402: {
    accessRate: number
    protocol: 'path402'
    version: '1.1.0'
    parent?: string
    parentShareBps?: number
  }
  metadata: {
    name: string
    description?: string
    avatar?: string
    website?: string
    character?: string   // NPGX character slug
    category?: string    // character category
  }
}

export interface BSV21MintInscription {
  p: 'bsv-21'
  op: 'mint'
  tick: string
  amt: string
}

export interface BSV21TransferInscription {
  p: 'bsv-21'
  op: 'transfer'
  tick: string
  amt: string
  to: string
}

export interface TokenDeployConfig {
  symbol: string           // e.g. "$ARIA"
  name: string             // e.g. "Aria Kurosawa Voidstrike"
  supply?: number          // default: 1,000,000,000
  decimals?: number        // default: 0
  description?: string
  avatar?: string
  website?: string
  characterSlug?: string   // links to NPGX roster
  category?: string
  parentSymbol?: string    // e.g. "$NPGX" for character tokens
  parentShareBps?: number  // basis points — default 2500 (25%)
  accessRate?: number      // tokens per content generation — default 1
}

export interface TokenDeployResult {
  success: boolean
  tokenId?: string
  inscription?: string     // JSON to inscribe on-chain
  error?: string
}

export interface TokenStatus {
  symbol: string
  name: string
  deployed: boolean
  txid?: string
  supply: number
  minted: number
  circulating: number
  redeemed: number
  characterSlug?: string
}

// ── Constants ──────────────────────────────────────────────────────

export const DEFAULT_SUPPLY = 1_000_000_000  // 1 billion
export const DEFAULT_DECIMALS = 0
export const NPGX_PARENT_SYMBOL = '$NPGX'
export const NPGX_WEBSITE = 'https://www.npgx.website'
export const ORDINALS_API = 'https://ordinals.gorillapool.io'
export const WOC_API = 'https://api.whatsonchain.com/v1/bsv/main'

// Parent token config
export const NPGX_TOKEN: TokenDeployConfig = {
  symbol: '$NPGX',
  name: 'NPGX',
  supply: DEFAULT_SUPPLY,
  description: 'Parent governance token for the NPGX platform. 26 AI character tokens derive from $NPGX via the $402 content ticket protocol.',
  website: NPGX_WEBSITE,
  accessRate: 1,
}

// ── Inscription Generators ─────────────────────────────────────────

/**
 * Generate BSV-21 deploy inscription JSON.
 * This is the data that gets inscribed on-chain to create a new token.
 */
export function generateDeployInscription(config: TokenDeployConfig): BSV21DeployInscription {
  const path402Ext: BSV21DeployInscription['path402'] = {
    accessRate: config.accessRate ?? 1,
    protocol: 'path402',
    version: '1.1.0',
  }

  if (config.parentSymbol) {
    path402Ext.parent = config.parentSymbol
    path402Ext.parentShareBps = config.parentShareBps ?? 2500 // 25% to parent by default
  }

  return {
    p: 'bsv-21',
    op: 'deploy',
    tick: config.symbol,
    max: (config.supply ?? DEFAULT_SUPPLY).toString(),
    dec: (config.decimals ?? DEFAULT_DECIMALS).toString(),
    path402: path402Ext,
    metadata: {
      name: config.name,
      description: config.description,
      avatar: config.avatar,
      website: config.website ?? NPGX_WEBSITE,
      character: config.characterSlug,
      category: config.category,
    },
  }
}

/**
 * Generate BSV-21 mint inscription JSON.
 * This creates new tokens from an existing deployment.
 */
export function generateMintInscription(symbol: string, amount: number): BSV21MintInscription {
  return {
    p: 'bsv-21',
    op: 'mint',
    tick: symbol,
    amt: amount.toString(),
  }
}

/**
 * Generate BSV-21 transfer inscription JSON.
 */
export function generateTransferInscription(symbol: string, amount: number, to: string): BSV21TransferInscription {
  return {
    p: 'bsv-21',
    op: 'transfer',
    tick: symbol,
    amt: amount.toString(),
    to,
  }
}

// ── Token ID & Validation ──────────────────────────────────────────

/**
 * Deterministic token ID from symbol + issuer address.
 */
export function generateTokenId(symbol: string, issuerAddress: string): string {
  const data = `npgx:${symbol}:${issuerAddress}`
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Validate token symbol format.
 */
export function validateSymbol(symbol: string): { valid: boolean; error?: string } {
  if (!symbol.startsWith('$')) {
    return { valid: false, error: 'Symbol must start with $' }
  }
  const name = symbol.slice(1)
  if (name.length < 1 || name.length > 20) {
    return { valid: false, error: 'Symbol must be 1-20 characters after $' }
  }
  if (!/^[A-Z0-9_]+$/.test(name)) {
    return { valid: false, error: 'Symbol must contain only A-Z, 0-9, _' }
  }
  return { valid: true }
}

// ── Character Token Helpers ────────────────────────────────────────

/**
 * Build deploy config for a character token from the NPGX roster.
 * Each character token is a child of $NPGX with 25% parent revenue share.
 */
export function characterTokenConfig(character: NPGXCharacter): TokenDeployConfig {
  return {
    symbol: character.token,
    name: character.name,
    supply: DEFAULT_SUPPLY,
    description: `$402 content ticket for ${character.name}. Spend to generate images, videos, magazines, and movies. Circular economy — redeemed tokens return to platform.`,
    avatar: character.image,
    website: character.site ?? NPGX_WEBSITE,
    characterSlug: character.slug,
    category: character.category,
    parentSymbol: NPGX_PARENT_SYMBOL,
    parentShareBps: 2500, // 25% to $NPGX holders
    accessRate: 1,
  }
}

/**
 * Get all 26 character token configs.
 */
export function allCharacterTokenConfigs(): TokenDeployConfig[] {
  return NPGX_ROSTER.map(characterTokenConfig)
}

/**
 * Build the full token status for all 27 tokens (1 parent + 26 characters).
 * Deployed status comes from on-chain lookup or database records.
 */
export function getTokenRegistry(): TokenStatus[] {
  const tokens: TokenStatus[] = [
    {
      symbol: '$NPGX',
      name: 'NPGX',
      deployed: false, // Will be checked against on-chain/DB
      supply: DEFAULT_SUPPLY,
      minted: 0,
      circulating: 0,
      redeemed: 0,
    },
    ...NPGX_ROSTER.map(c => ({
      symbol: c.token,
      name: c.name,
      deployed: false,
      supply: DEFAULT_SUPPLY,
      minted: 0,
      circulating: 0,
      redeemed: 0,
      characterSlug: c.slug,
    })),
  ]
  return tokens
}

// ── On-chain Queries ───────────────────────────────────────────────

/**
 * Check BSV-21 token balance for an address via 1Sat Ordinals API.
 * Reuses logic from token-gate.ts but with configurable tick.
 */
export async function queryTokenBalance(address: string, tick: string): Promise<number> {
  try {
    const res = await fetch(
      `${ORDINALS_API}/api/txos/address/${address}/unspent?bsv20=true`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return 0
    const utxos = await res.json()
    if (!Array.isArray(utxos)) return 0

    return utxos
      .filter((u: any) => {
        const utxoTick = u.data?.bsv20?.tick || u.data?.bsv21?.tick
        return utxoTick?.toLowerCase() === tick.replace('$', '').toLowerCase()
      })
      .reduce((sum: number, u: any) => {
        const amt = u.data?.bsv20?.amt || u.data?.bsv21?.amt || '0'
        return sum + parseFloat(amt)
      }, 0)
  } catch {
    return 0
  }
}

/**
 * Check if a BSV-21 token tick has been deployed on-chain.
 */
export async function isTokenDeployed(tick: string): Promise<{ deployed: boolean; txid?: string }> {
  try {
    const cleanTick = tick.replace('$', '')
    const res = await fetch(
      `${ORDINALS_API}/api/bsv20/tick/${cleanTick}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return { deployed: false }
    const data = await res.json()
    return {
      deployed: !!data?.txid,
      txid: data?.txid,
    }
  } catch {
    return { deployed: false }
  }
}

// ── Prepare Deploy ─────────────────────────────────────────────────

/**
 * Prepare a token deployment.
 * Returns the inscription JSON to be broadcast on-chain.
 * Does NOT broadcast — that requires a wallet with BSV.
 */
export function prepareDeploy(config: TokenDeployConfig): TokenDeployResult {
  const validation = validateSymbol(config.symbol)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const inscription = generateDeployInscription(config)
  const issuer = process.env.NPGX_ISSUER_ADDRESS || 'pending'
  const tokenId = generateTokenId(config.symbol, issuer)

  return {
    success: true,
    tokenId,
    inscription: JSON.stringify(inscription, null, 2),
  }
}
