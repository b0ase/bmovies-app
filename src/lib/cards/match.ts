/**
 * NPGX Outfit Clash — Match Engine
 *
 * Full match state machine:
 *   CHARACTER_SELECT → CHALLENGE_REVEAL → EQUIP_PHASE → CLASH → RESULT
 *
 * Pure functions — no side effects, no DB, no timers.
 * UI handles timing; this module handles logic.
 */

import type { Card, CardStats, SlotKey, Rarity, StatKey } from './types'
import type { Challenge, BonusCondition } from './challenge'
import type { SynergyResult } from './synergy'
import { pickChallenge } from './challenge'
import { calcAllSynergies } from './synergy'
import { CARD_CATALOGUE, getCardsBySlot, SLOT_ORDER } from './slots'

// ── Match Types ────────────────────────────────────────────────────────────

export type MatchPhase =
  | 'character_select'
  | 'challenge_reveal'
  | 'equip_phase'
  | 'clash'
  | 'result'

export type StakeLevel = 'casual' | 'ante' | 'high_stakes'

export interface PlayerLoadout {
  characterSlug: string
  characterCategory: string
  characterName: string
  cards: Partial<Record<SlotKey, Card>>
}

export interface ClashScore {
  baseStats: CardStats              // Raw stats from cards
  synergyResult: SynergyResult      // All synergy bonuses
  finalStats: CardStats             // Base + synergy totals
  primaryScore: number              // Primary stat × 2
  secondaryScore: number            // Secondary stat × 1.5
  tertiaryScore: number             // Tertiary stat × 1
  bonusMet: boolean                 // Whether bonus condition is satisfied
  bonusPoints: number               // 10 if met, 0 if not
  variance: number                  // ±5% random factor
  totalScore: number                // Final total
}

export interface MatchResult {
  challenge: Challenge
  stakeLevel: StakeLevel
  playerA: { loadout: PlayerLoadout; score: ClashScore }
  playerB: { loadout: PlayerLoadout; score: ClashScore }
  winner: 'a' | 'b' | 'draw'
}

// ── Stat Helpers ───────────────────────────────────────────────────────────

function sumCardStats(cards: Card[]): CardStats {
  return cards.reduce(
    (total, card) => ({
      str: total.str + card.stats.str,
      spe: total.spe + card.stats.spe,
      ski: total.ski + card.stats.ski,
      sta: total.sta + card.stats.sta,
      ste: total.ste + card.stats.ste,
      sty: total.sty + card.stats.sty,
    }),
    { str: 0, spe: 0, ski: 0, sta: 0, ste: 0, sty: 0 },
  )
}

function addStats(a: CardStats, b: CardStats): CardStats {
  return {
    str: a.str + b.str,
    spe: a.spe + b.spe,
    ski: a.ski + b.ski,
    sta: a.sta + b.sta,
    ste: a.ste + b.ste,
    sty: a.sty + b.sty,
  }
}

// ── Bonus Condition Checking ───────────────────────────────────────────────

export function checkBonusCondition(
  condition: BonusCondition,
  loadout: PlayerLoadout,
): boolean {
  const cards = Object.values(loadout.cards).filter(Boolean) as Card[]

  switch (condition.type) {
    case 'category':
      return loadout.characterCategory === condition.value

    case 'max_rarity': {
      const rarityOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
      const maxIdx = rarityOrder.indexOf(condition.value)
      return cards.every(c => rarityOrder.indexOf(c.rarity) <= maxIdx)
    }

    case 'require_slot':
      return condition.value in loadout.cards && loadout.cards[condition.value as SlotKey] != null

    case 'min_cards':
      return cards.length >= condition.value

    case 'matching_rarity': {
      const counts: Partial<Record<Rarity, number>> = {}
      for (const c of cards) counts[c.rarity] = (counts[c.rarity] || 0) + 1
      return Object.values(counts).some(n => n! >= condition.value)
    }

    case 'no_slot':
      return !(condition.value in loadout.cards) || loadout.cards[condition.value as SlotKey] == null
  }
}

// ── Score Calculation ──────────────────────────────────────────────────────

/**
 * Calculate the full clash score for a player's loadout against a challenge.
 * This is the core scoring formula for Outfit Clash.
 */
export function calcClashScore(
  loadout: PlayerLoadout,
  challenge: Challenge,
): ClashScore {
  const cards = Object.values(loadout.cards).filter(Boolean) as Card[]

  // 1. Base stats from equipped cards
  const baseStats = sumCardStats(cards)

  // 2. Synergy bonuses
  const synergyResult = calcAllSynergies(loadout.characterCategory, cards)

  // 3. Final stats = base + synergy
  const finalStats = addStats(baseStats, synergyResult.totalBonus)

  // 4. Weighted stat scores
  const primaryScore = finalStats[challenge.primaryStat] * 2
  const secondaryScore = Math.round(finalStats[challenge.secondaryStat] * 1.5)
  const tertiaryScore = finalStats[challenge.tertiaryStat]

  // 5. Bonus condition
  const bonusMet = checkBonusCondition(challenge.bonusCondition, loadout)
  const bonusPoints = bonusMet ? 10 : 0

  // 6. Pre-variance total
  const rawTotal = primaryScore + secondaryScore + tertiaryScore + bonusPoints

  // 7. Variance: ±5% (skill dominates, upsets still happen)
  const variance = 1 + (Math.random() * 0.1 - 0.05)
  const totalScore = Math.round(rawTotal * variance)

  return {
    baseStats,
    synergyResult,
    finalStats,
    primaryScore,
    secondaryScore,
    tertiaryScore,
    bonusMet,
    bonusPoints,
    variance,
    totalScore,
  }
}

// ── Match Resolution ───────────────────────────────────────────────────────

/**
 * Resolve a complete match between two loadouts.
 * This is called after both players have equipped their cards.
 */
export function resolveMatch(
  loadoutA: PlayerLoadout,
  loadoutB: PlayerLoadout,
  challenge: Challenge,
  stakeLevel: StakeLevel = 'casual',
): MatchResult {
  const scoreA = calcClashScore(loadoutA, challenge)
  const scoreB = calcClashScore(loadoutB, challenge)

  let winner: 'a' | 'b' | 'draw'
  if (scoreA.totalScore > scoreB.totalScore) winner = 'a'
  else if (scoreB.totalScore > scoreA.totalScore) winner = 'b'
  else winner = 'draw'

  return {
    challenge,
    stakeLevel,
    playerA: { loadout: loadoutA, score: scoreA },
    playerB: { loadout: loadoutB, score: scoreB },
    winner,
  }
}

// ── AI Opponent ────────────────────────────────────────────────────────────

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'boss'

/**
 * Build an AI loadout for solo play.
 *
 * Easy: random cards, no optimization
 * Medium: prioritizes challenge primary/secondary stats
 * Hard: full synergy + stat optimization
 * Boss: pre-built legendary loadout
 */
export function buildAILoadout(
  characterSlug: string,
  characterCategory: string,
  characterName: string,
  challenge: Challenge,
  difficulty: AIDifficulty = 'medium',
): PlayerLoadout {
  const cards: Partial<Record<SlotKey, Card>> = {}

  if (difficulty === 'easy') {
    // Random cards, 50% chance to fill optional slots
    for (const slotKey of SLOT_ORDER) {
      const isRequired = ['hairstyle', 'top', 'bottom', 'footwear', 'setting'].includes(slotKey)
      if (!isRequired && Math.random() < 0.5) continue
      const available = getCardsBySlot(slotKey)
      if (available.length > 0) {
        cards[slotKey] = available[Math.floor(Math.random() * available.length)]
      }
    }
  } else if (difficulty === 'medium') {
    // Pick cards that maximize the challenge's primary and secondary stats
    const targetStats: StatKey[] = [challenge.primaryStat, challenge.secondaryStat]
    for (const slotKey of SLOT_ORDER) {
      const available = getCardsBySlot(slotKey)
      if (available.length === 0) continue
      // Sort by sum of target stats, pick best
      const sorted = [...available].sort((a, b) => {
        const aScore = targetStats.reduce((s, stat) => s + a.stats[stat], 0)
        const bScore = targetStats.reduce((s, stat) => s + b.stats[stat], 0)
        return bScore - aScore
      })
      cards[slotKey] = sorted[0]
    }
  } else if (difficulty === 'hard') {
    // Maximize all three challenge stats + try to meet bonus condition
    const targetStats: StatKey[] = [challenge.primaryStat, challenge.secondaryStat, challenge.tertiaryStat]
    const weights = [2, 1.5, 1]
    for (const slotKey of SLOT_ORDER) {
      const available = getCardsBySlot(slotKey)
      if (available.length === 0) continue
      const sorted = [...available].sort((a, b) => {
        const aScore = targetStats.reduce((s, stat, i) => s + a.stats[stat] * weights[i], 0)
        const bScore = targetStats.reduce((s, stat, i) => s + b.stats[stat] * weights[i], 0)
        return bScore - aScore
      })
      cards[slotKey] = sorted[0]
    }
    // If bonus requires a slot, make sure it's filled
    if (challenge.bonusCondition.type === 'require_slot') {
      const slot = challenge.bonusCondition.value as SlotKey
      if (!cards[slot]) {
        const available = getCardsBySlot(slot)
        if (available.length > 0) cards[slot] = available[0]
      }
    }
    // If bonus forbids a slot, remove it
    if (challenge.bonusCondition.type === 'no_slot') {
      delete cards[challenge.bonusCondition.value as SlotKey]
    }
  } else {
    // Boss: pick highest rarity card for every slot
    for (const slotKey of SLOT_ORDER) {
      const available = getCardsBySlot(slotKey)
      if (available.length === 0) continue
      const rarityOrder: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common']
      const sorted = [...available].sort((a, b) => {
        return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
      })
      cards[slotKey] = sorted[0]
    }
  }

  return {
    characterSlug,
    characterCategory,
    characterName,
    cards,
  }
}

// ── Quick Solo Match ───────────────────────────────────────────────────────

/**
 * Run a complete solo match: pick challenge, build AI opponent, resolve.
 * Returns the full match result for the UI to animate.
 */
export function soloMatch(
  playerLoadout: PlayerLoadout,
  aiCharacter: { slug: string; category: string; name: string },
  difficulty: AIDifficulty = 'medium',
  stakeLevel: StakeLevel = 'casual',
): MatchResult {
  const challenge = pickChallenge(stakeLevel)
  const aiLoadout = buildAILoadout(
    aiCharacter.slug,
    aiCharacter.category,
    aiCharacter.name,
    challenge,
    difficulty,
  )
  return resolveMatch(playerLoadout, aiLoadout, challenge, stakeLevel)
}
