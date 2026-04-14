/**
 * NPGX Trading Card System — Outfit Clash
 *
 * Ported from NPG's 23-layer composition system.
 * 362 cards → 91 cards, 23 layers → 15 slots, PNG compositing → AI prompt generation.
 *
 * Core flow:
 *   Cards (prompt fragments) → Stack (combined outfit) → AI prompt → Generated image
 *   Outfit Clash: pick fighter → see challenge → equip cards → clash stats → win cards
 */

// Types
export type {
  CardStats,
  StatKey,
  Rarity,
  SlotKey,
  SlotDefinition,
  Card,
  Stack,
  BattleMode,
  BattleResult,
  BattleRound,
  BattleStakes,
  PackType,
  PackContents,
  PlayerProfile,
} from './types'

export {
  STAT_LABELS,
  RARITY_MULTIPLIERS,
  RARITY_COLORS,
  XP_REWARDS,
  LEVEL_UNLOCKS,
  MASTERY_TIERS,
} from './types'

// Slots & Catalogue
export {
  SLOTS,
  SLOT_ORDER,
  REQUIRED_SLOTS,
  CARD_CATALOGUE,
  CATALOGUE_STATS,
  getCardsBySlot,
  getCardById,
  getCardsByRarity,
  getCardImageUrl,
} from './slots'

// Stacks & Packs
export {
  buildStack,
  stackToPrompt,
  stackToSoulPrompt,
  randomStack,
  openPack,
  validateStack,
  compareStacks,
} from './stacks'

// Legacy Battle (kept for backwards compat)
export { battle, quickBattle } from './battle'

// ── Outfit Clash (new game engine) ───────────────────────────────────────

// Challenges
export type { Challenge, BonusCondition, ChallengeRarity } from './challenge'
export { CHALLENGE_CATALOGUE, pickChallenge, getChallengeById } from './challenge'

// Synergies
export type { SynergyBonus, SynergyResult } from './synergy'
export {
  calcAffinityBonuses,
  calcSetBonuses,
  calcSlotCombos,
  calcAllSynergies,
} from './synergy'

// Match Engine
export type {
  MatchPhase,
  StakeLevel,
  PlayerLoadout,
  ClashScore,
  MatchResult,
  AIDifficulty,
} from './match'
export {
  checkBonusCondition,
  calcClashScore,
  resolveMatch,
  buildAILoadout,
  soloMatch,
} from './match'
