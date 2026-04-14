/**
 * NPGX Trading Card System — Types
 *
 * Adapted from the NPG 23-layer composition system.
 * NPG had pre-drawn PNG assets composited together.
 * NPGX has AI generation — each card is a prompt fragment with stats,
 * and a "stack" combines them into a complete generation prompt.
 *
 * Original NPG: 362 cards, 23 layers, 6-stat system, 3,334 minted stacks.
 * NPGX: 26 characters × unlimited AI-generated card combos.
 */

// ── Stats (ported from NPG cardEnhanced.ts) ────────────────────────────────

export interface CardStats {
  str: number  // Strength — combat power, physical dominance
  spe: number  // Speed — agility, reaction time, movement
  ski: number  // Skill — precision, technique, craftsmanship
  sta: number  // Stamina — endurance, resilience, staying power
  ste: number  // Stealth — subtlety, evasion, mystery
  sty: number  // Style — aesthetic impact, charisma, presence
}

export type StatKey = keyof CardStats

export const STAT_LABELS: Record<StatKey, string> = {
  str: 'Strength',
  spe: 'Speed',
  ski: 'Skill',
  sta: 'Stamina',
  ste: 'Stealth',
  sty: 'Style',
}

// ── Rarity ──────────────────────────────────────────────────────────────────

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export const RARITY_MULTIPLIERS: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2,
  epic: 2.5,
  legendary: 3,
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',     // gray
  uncommon: '#22c55e',   // green
  rare: '#3b82f6',       // blue
  epic: '#a855f7',       // purple
  legendary: '#f59e0b',  // gold
}

// ── Slots (the equipment categories, adapted from NPG's 23 layers) ─────────

export type SlotKey =
  | 'hairstyle'
  | 'face_accessory'
  | 'top'
  | 'bottom'
  | 'footwear'
  | 'neckwear'
  | 'jewellery'
  | 'arm_accessory'
  | 'prop_right'
  | 'prop_left'
  | 'headpiece'
  | 'back_accessory'
  | 'setting'
  | 'lighting'
  | 'pose'

export interface SlotDefinition {
  key: SlotKey
  name: string
  description: string
  required: boolean
  baseStats: Partial<CardStats>
  displayOrder: number
}

// ── Cards ───────────────────────────────────────────────────────────────────

export interface Card {
  id: string              // unique card ID (e.g. "top-pvc-corset")
  slot: SlotKey           // which slot this fills
  name: string            // display name (e.g. "PVC Corset")
  promptFragment: string  // the text that gets injected into the AI prompt
  rarity: Rarity
  stats: CardStats
  description?: string    // flavour text
  imageUrl?: string       // AI-generated card image (once created)
  generationId?: string   // DNA lineage ID for the card image
}

// ── Stacks (a complete outfit = one card per slot) ──────────────────────────

export interface Stack {
  id: string
  characterSlug: string   // which girl wears this stack
  name: string            // stack name (e.g. "Cyberblade Neon Assassin")
  cards: Partial<Record<SlotKey, Card>>
  totalStats: CardStats
  totalPower: number      // sum of all stats
  rarity: Rarity          // determined by rarest card in the stack
  imageUrl?: string       // the AI-generated full image
  generationId?: string
  createdAt: string
}

// ── Battle (legacy modes — kept for backwards compat) ────────────────────────

export type BattleMode = 'total_power' | 'stat_duel' | 'best_of_three' | 'outfit_clash'

export interface BattleResult {
  mode: BattleMode
  winner: 'a' | 'b' | 'draw'
  stackA: { slug: string; name: string; power: number; stats: CardStats }
  stackB: { slug: string; name: string; power: number; stats: CardStats }
  rounds?: BattleRound[]
  stakes?: BattleStakes
}

export interface BattleRound {
  stat: StatKey
  valueA: number
  valueB: number
  winner: 'a' | 'b' | 'draw'
}

export interface BattleStakes {
  type: 'whole_stack' | 'single_card' | 'multi_card'
  cardsAtStake: string[] // card IDs
}

// ── Progression ──────────────────────────────────────────────────────────────

export interface PlayerProfile {
  handle: string           // HandCash handle or local ID
  level: number
  xp: number
  totalWins: number
  totalLosses: number
  totalDraws: number
  characterMastery: Record<string, number>  // slug → win count
  dailyChallengeCompleted: string | null     // ISO date of last daily
  weeklyProgress: number                    // 0-5 daily challenges this week
}

export const XP_REWARDS = {
  win_casual: 10,
  win_ante: 25,
  win_high_stakes: 50,
  loss: 5,
  pack_open: 5,
  set_bonus_triggered: 10,
  first_win_of_day: 20,
  daily_challenge: 15,
} as const

export const LEVEL_UNLOCKS = {
  5: 'ante_battles',
  10: 'high_stakes_battles',
  15: 'rival_challenge',
  20: 'marketplace',
  25: 'crew_battle',
} as const

export const MASTERY_TIERS = {
  5: 'bronze',
  15: 'silver',
  30: 'gold',
  50: 'holographic',
} as const

// ── Pack (booster pack of random cards) ─────────────────────────────────────

export type PackType = 'starter' | 'booster' | 'premium' | 'legendary'

export interface PackContents {
  type: PackType
  cards: Card[]
  guaranteedRarity: Rarity
}
