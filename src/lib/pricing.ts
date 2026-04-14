/**
 * NPGX Generation Pricing
 *
 * Every generation costs micropayments in satoshis.
 * Prices cover: AI provider cost + platform margin + $DIVVY revenue.
 *
 * Revenue split:
 *   50% → content token holders (the specific piece)
 *   25% → character token holders ($ARIA, $LUNA, etc.)
 *   12.5% → $NPGX holders
 *   6.25% → $NPG holders
 *   6.25% → $BOASE holders (platform treasury)
 */

export interface PriceTier {
  action: string
  description: string
  costSats: number        // price to user in satoshis
  providerCostUsd: number // what we pay the AI provider
  marginPct: number       // our margin %
}

// 1 sat ≈ $0.0005 at $50k/BTC — these are approximate
export const PRICING: Record<string, PriceTier> = {
  // Images
  'image-gen': {
    action: 'Generate Image',
    description: 'AI character image via Atlas Cloud or Grok',
    costSats: 50,           // ~$0.025
    providerCostUsd: 0.01,  // Atlas $0.01
    marginPct: 60,
  },
  'image-gen-hq': {
    action: 'Generate HQ Image',
    description: 'High quality image via Grok grok-imagine-image',
    costSats: 200,          // ~$0.10
    providerCostUsd: 0.07,  // Grok $0.07
    marginPct: 30,
  },

  // Video — Wan 2.2 costs ~$0.40 for 8s at provider level
  'video-gen': {
    action: 'Generate Video',
    description: '5-8s AI video clip via Wan 2.2',
    costSats: 1500,         // ~$0.75 (cost $0.40 + margin)
    providerCostUsd: 0.40,  // Wan 2.2 actual cost
    marginPct: 47,
  },
  'video-extend': {
    action: 'Extend Video',
    description: 'Continue a video from last frame',
    costSats: 1500,         // ~$0.75
    providerCostUsd: 0.40,
    marginPct: 47,
  },

  // Music
  'music-gen': {
    action: 'Generate Music',
    description: 'AI music composition via MiniMax',
    costSats: 100,          // ~$0.05
    providerCostUsd: 0.02,
    marginPct: 60,
  },
  'stem-separate': {
    action: 'Stem Separation',
    description: 'Split track into vocals/drums/bass/other',
    costSats: 80,
    providerCostUsd: 0.015,
    marginPct: 60,
  },
  'midi-transcribe': {
    action: 'MIDI Transcription',
    description: 'Convert audio to MIDI + sheet music',
    costSats: 80,
    providerCostUsd: 0.015,
    marginPct: 60,
  },

  // Production
  'movie-export': {
    action: 'Export Movie',
    description: 'FFmpeg video assembly with transitions + audio',
    costSats: 200,          // ~$0.10
    providerCostUsd: 0.0,   // local compute
    marginPct: 100,
  },
  'full-produce': {
    action: 'Full Production',
    description: 'Script → shots → video → assembly → magazine',
    costSats: 6000,         // ~$3.00 (3 images $0.03, 3 videos $1.20, song $0.05, magazine $0.10, cards $0.03 = ~$1.41 cost)
    providerCostUsd: 1.41,
    marginPct: 53,
  },

  // Magazine
  'magazine-gen': {
    action: 'Generate Magazine',
    description: '32-page AI magazine with editorial + photos',
    costSats: 500,          // ~$0.25
    providerCostUsd: 0.10,
    marginPct: 60,
  },

  // Cards
  'cards-gen': {
    action: 'Generate Trading Cards',
    description: 'Holographic trading card pack',
    costSats: 100,
    providerCostUsd: 0.03,
    marginPct: 70,
  },

  // Card Packs (Outfit Clash)
  'pack-starter': {
    action: 'Starter Pack',
    description: '5 cards, 1 uncommon guaranteed',
    costSats: 100,          // ~$0.05
    providerCostUsd: 0,
    marginPct: 100,
  },
  'pack-booster': {
    action: 'Booster Pack',
    description: '5 cards, 1 rare guaranteed',
    costSats: 500,          // ~$0.25
    providerCostUsd: 0,
    marginPct: 100,
  },
  'pack-premium': {
    action: 'Premium Pack',
    description: '7 cards, 1 epic guaranteed',
    costSats: 2000,         // ~$1.00
    providerCostUsd: 0,
    marginPct: 100,
  },
  'pack-legendary': {
    action: 'Legendary Pack',
    description: '5 cards, 1 legendary guaranteed',
    costSats: 5000,         // ~$2.50
    providerCostUsd: 0,
    marginPct: 100,
  },

  // Battle Entry
  'battle-high-stakes': {
    action: 'High Stakes Battle',
    description: 'Entry fee for high-stakes card battle',
    costSats: 100,          // ~$0.05
    providerCostUsd: 0,
    marginPct: 100,
  },

  // Script
  'script-gen': {
    action: 'Generate Script',
    description: 'AI screenplay/script generation',
    costSats: 50,
    providerCostUsd: 0.005,
    marginPct: 90,
  },

  // Music Video Production
  'mv-quick': {
    action: 'Quick Cut Music Video',
    description: 'Agent-curated rough cut from existing clips, 720p MP4',
    costSats: 98000,          // ~$49
    providerCostUsd: 0,       // existing clips only
    marginPct: 100,
  },
  'mv-standard': {
    action: 'Standard Music Video',
    description: 'Complete AI music video: script, 8-15 new clips, karaoke, titles, 1080p MP4',
    costSats: 198000,         // ~$99
    providerCostUsd: 5.0,     // ~12 clips at $0.40 each
    marginPct: 97,
  },
  'mv-full': {
    action: 'Full Production Music Video',
    description: 'Standard + portraits, Premiere XML, trading cards, BSV-21 content token mint',
    costSats: 398000,         // ~$199
    providerCostUsd: 8.0,
    marginPct: 96,
  },
  'mv-directors': {
    action: "Director's Cut Music Video",
    description: 'Multi-character extended cut, numbered 1-of-26 NFT, 10% royalty, physical package',
    costSats: 998000,         // ~$499
    providerCostUsd: 25.0,
    marginPct: 95,
  },

  // Music Video Editions (tokenized NFTs)
  'mv-edition-standard': {
    action: 'Standard Edition',
    description: 'Music video NFT — revenue share + download access (100 available)',
    costSats: 50000,          // ~$25
    providerCostUsd: 0,
    marginPct: 100,
  },
  'mv-edition-limited': {
    action: 'Limited Edition',
    description: 'Music video NFT — 1-of-26 (A-Z) + bonus character content',
    costSats: 198000,         // ~$99
    providerCostUsd: 0,
    marginPct: 100,
  },
  'mv-edition-directors': {
    action: "Director's Edition",
    description: '1-of-1 NFT — 10% royalty + Premiere source files',
    costSats: 998000,         // ~$499
    providerCostUsd: 0,
    marginPct: 100,
  },

  // Free tier (browsing, reading)
  'browse': {
    action: 'Browse',
    description: 'View content library, character pages',
    costSats: 0,
    providerCostUsd: 0,
    marginPct: 0,
  },
}

/**
 * Revenue split cascade.
 * Each level keeps its cut, passes the rest down.
 */
export const REVENUE_SPLIT = {
  contentToken: 0.50,     // 50% to investors in this specific content piece
  characterToken: 0.25,   // 25% to character token holders ($ARIA etc)
  npgxToken: 0.125,       // 12.5% to $NPGX holders
  npgToken: 0.0625,       // 6.25% to $NPG holders
  boaseToken: 0.0625,     // 6.25% to $BOASE (platform treasury)
} as const

/**
 * Get price for an action in satoshis.
 */
export function getPrice(action: string): number {
  return PRICING[action]?.costSats ?? 0
}

/**
 * Check if an action is free (no payment required).
 */
export function isFree(action: string): boolean {
  return getPrice(action) === 0
}

/**
 * Calculate revenue split for a payment.
 */
export function calculateSplit(totalSats: number) {
  return {
    contentToken: Math.floor(totalSats * REVENUE_SPLIT.contentToken),
    characterToken: Math.floor(totalSats * REVENUE_SPLIT.characterToken),
    npgxToken: Math.floor(totalSats * REVENUE_SPLIT.npgxToken),
    npgToken: Math.floor(totalSats * REVENUE_SPLIT.npgToken),
    boaseToken: Math.floor(totalSats * REVENUE_SPLIT.boaseToken),
  }
}
