/**
 * Music Video NFT — Tokenization & Edition Minting
 *
 * Orchestrates the flow: TimelineProject → content hash → BSV-21 token → editions
 * Uses existing bsv21.ts for inscriptions and x401-client.ts for attestation.
 *
 * Token naming: $MV_{TRACK}_{VERSION}
 *   e.g. $MV_RAZOR_KISSES_001, $MV_TOKYO_GUTTER_QUEEN_003
 *
 * Edition tiers:
 *   Standard (100 supply, $25)  — revenue share + download
 *   Limited  (26 supply, $99)   — + bonus character content
 *   Directors (1 supply, $499)  — + 10% royalty + Premiere source
 */

import type { TimelineProject, MintRecord, MintCondition } from './timeline/types'
import { hashProject } from './timeline/utils'
import {
  generateDeployInscription,
  generateMintInscription,
  type TokenDeployConfig,
  type BSV21DeployInscription,
  type BSV21MintInscription,
} from './bsv21'

// ── Types ──────────────────────────────────────────────────────────

export type EditionTier = 'standard' | 'limited' | 'directors'

export interface EditionConfig {
  tier: EditionTier
  supply: number
  priceSats: number
  priceUsd: number
  description: string
  royaltyBps: number  // basis points for edition-specific royalty
}

export interface MusicVideoToken {
  tick: string                    // e.g. $MV_RAZOR_KISSES_001
  trackSlug: string
  characterSlug: string
  projectHash: string             // SHA-256 of TimelineProject
  deployInscription: BSV21DeployInscription
  editions: EditionConfig[]
  conditions: MintCondition[]
}

export interface MintEditionResult {
  success: boolean
  tier: EditionTier
  mintInscription?: BSV21MintInscription
  editionNumber?: number
  error?: string
}

// ── Constants ──────────────────────────────────────────────────────

export const EDITION_CONFIGS: Record<EditionTier, Omit<EditionConfig, 'tier'>> = {
  standard: {
    supply: 100,
    priceSats: 50000,     // ~$25
    priceUsd: 25,
    description: 'Standard Edition — revenue share via $DIVVY + download access',
    royaltyBps: 0,        // standard share via cascade
  },
  limited: {
    supply: 26,           // one per character letter A-Z
    priceSats: 198000,    // ~$99
    priceUsd: 99,
    description: 'Limited Edition (1-of-26) — revenue share + bonus character content',
    royaltyBps: 0,
  },
  directors: {
    supply: 1,
    priceSats: 998000,    // ~$499
    priceUsd: 499,
    description: "Director's Edition (1-of-1) — 10% royalty + Premiere source files",
    royaltyBps: 1000,     // 10% additional royalty
  },
}

// ── Token Naming ──────────────────────────────────────────────────

/**
 * Generate token ticker from track slug.
 * e.g. "razor-kisses" → "$MV_RAZOR_KISSES"
 */
export function generateTokenTick(trackSlug: string, version: number = 1): string {
  const base = trackSlug.toUpperCase().replace(/-/g, '_')
  return `$MV_${base}_${String(version).padStart(3, '0')}`
}

// ── Token Creation ────────────────────────────────────────────────

/**
 * Create a music video content token from a TimelineProject.
 * Returns the token config + deploy inscription ready for on-chain broadcast.
 */
export async function createMusicVideoToken(
  project: TimelineProject,
  characterSlug: string,
  characterToken: string,  // e.g. "$ARIA"
  version: number = 1,
): Promise<MusicVideoToken> {
  const projectHash = await hashProject(project)
  const tick = generateTokenTick(project.trackSlug, version)

  // Total edition supply across all tiers
  const totalSupply = Object.values(EDITION_CONFIGS).reduce((s, e) => s + e.supply, 0) // 127

  const deployConfig: TokenDeployConfig = {
    symbol: tick,
    name: `${project.title} Music Video`,
    supply: totalSupply,
    decimals: 0,
    description: `Tokenized music video edition. Revenue flows via $DIVVY cascade. Parent: ${characterToken}`,
    website: `https://www.npgx.website/watch/${project.trackSlug}`,
    characterSlug,
    category: 'music-video',
    parentSymbol: characterToken,
    parentShareBps: 2500,  // 25% to character token holders
    accessRate: 1,
  }

  const deployInscription = generateDeployInscription(deployConfig)

  const editions: EditionConfig[] = Object.entries(EDITION_CONFIGS).map(([tier, config]) => ({
    tier: tier as EditionTier,
    ...config,
  }))

  const conditions: MintCondition[] = [
    {
      type: 'royalty',
      token: tick,
      terms: '50% of all revenue from this video flows to edition holders via $DIVVY cascade',
      bps: 5000,
    },
    {
      type: 'license',
      token: tick,
      terms: 'Edition holders may use the video for personal, non-commercial purposes. Sync licensing requires platform approval.',
    },
    {
      type: 'attribution',
      token: tick,
      terms: 'Credit: NPGX / [character name]. Produced by AI agents on the NPGX platform.',
    },
  ]

  return {
    tick,
    trackSlug: project.trackSlug,
    characterSlug,
    projectHash,
    deployInscription,
    editions,
    conditions,
  }
}

/**
 * Generate a mint inscription for a specific edition tier.
 */
export function mintEdition(
  tick: string,
  tier: EditionTier,
  editionNumber: number,
): MintEditionResult {
  const config = EDITION_CONFIGS[tier]
  if (!config) {
    return { success: false, tier, error: `Unknown edition tier: ${tier}` }
  }

  if (editionNumber < 1 || editionNumber > config.supply) {
    return { success: false, tier, error: `Edition ${editionNumber} out of range (1-${config.supply})` }
  }

  const mintInscription = generateMintInscription(tick, 1) // 1 token per edition

  return {
    success: true,
    tier,
    mintInscription,
    editionNumber,
  }
}

/**
 * Create a MintRecord for the project's mintHistory.
 */
export function createMintRecord(
  txid: string,
  projectHash: string,
  prevTxid: string | null,
  version: number,
  creator?: string,
): MintRecord {
  return {
    txid,
    hash: projectHash,
    prevTxid,
    version,
    mintedAt: new Date().toISOString(),
    creator,
  }
}
