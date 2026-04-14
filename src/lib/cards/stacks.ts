/**
 * NPGX Stack System — composing cards into complete AI generation prompts.
 *
 * A Stack = one card per slot → combined prompt for image generation.
 * NPG had 3,334 minted stacks of pre-drawn PNG layers.
 * NPGX builds stacks from prompt fragments and generates with AI.
 *
 * The stack becomes the generation prompt:
 *   character soul + card prompt fragments → full AI image prompt
 */

import type { Card, CardStats, Rarity, SlotKey, Stack } from './types'
import { RARITY_MULTIPLIERS } from './types'
import { SLOTS, REQUIRED_SLOTS, SLOT_ORDER, CARD_CATALOGUE, getCardsBySlot } from './slots'

// ── Stat Aggregation ────────────────────────────────────────────────────────

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

function totalPower(stats: CardStats): number {
  return stats.str + stats.spe + stats.ski + stats.sta + stats.ste + stats.sty
}

// ── Rarity from cards (highest rarity in the stack) ─────────────────────────

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

function highestRarity(cards: Card[]): Rarity {
  let max = 0
  for (const card of cards) {
    const idx = RARITY_ORDER.indexOf(card.rarity)
    if (idx > max) max = idx
  }
  return RARITY_ORDER[max]
}

// ── Stack Building ──────────────────────────────────────────────────────────

export function buildStack(
  characterSlug: string,
  name: string,
  cards: Partial<Record<SlotKey, Card>>,
): Stack {
  const cardList = Object.values(cards).filter(Boolean) as Card[]
  const stats = sumCardStats(cardList)

  return {
    id: `${characterSlug}-${Date.now().toString(36)}`,
    characterSlug,
    name,
    cards,
    totalStats: stats,
    totalPower: totalPower(stats),
    rarity: highestRarity(cardList),
    createdAt: new Date().toISOString(),
  }
}

// ── Prompt Generation ───────────────────────────────────────────────────────

/**
 * Builds a complete AI generation prompt from a stack.
 * Combines character identity with all card prompt fragments,
 * ordered by slot display order for consistent results.
 */
export function stackToPrompt(
  stack: Stack,
  characterDescription?: string,
): string {
  const fragments: string[] = []

  // Character identity first
  if (characterDescription) {
    fragments.push(characterDescription)
  }

  // Card fragments in slot display order
  for (const slotKey of SLOT_ORDER) {
    const card = stack.cards[slotKey]
    if (card) {
      fragments.push(card.promptFragment)
    }
  }

  return fragments.join(', ')
}

/**
 * Builds a prompt from a stack + soul data.
 * This is the production function — pulls appearance from the soul JSON.
 */
export function stackToSoulPrompt(
  stack: Stack,
  soul: { appearance?: { face?: string; body?: string; hair?: string; signature_look?: string } },
): string {
  const identity: string[] = []

  if (soul.appearance?.face) identity.push(soul.appearance.face)
  if (soul.appearance?.body) identity.push(soul.appearance.body)
  if (soul.appearance?.signature_look) identity.push(soul.appearance.signature_look)

  const characterDesc = identity.length > 0
    ? `adult woman, over 18 years old, ${identity.join(', ')}`
    : 'adult woman, over 18 years old'

  return stackToPrompt(stack, characterDesc)
}

// ── Random Stack Generation ─────────────────────────────────────────────────

/**
 * Generates a random stack by picking one card per slot.
 * Required slots always get a card. Optional slots have a 50% chance.
 */
export function randomStack(characterSlug: string, name?: string): Stack {
  const cards: Partial<Record<SlotKey, Card>> = {}

  for (const slotKey of SLOT_ORDER) {
    const isRequired = REQUIRED_SLOTS.includes(slotKey)
    if (!isRequired && Math.random() < 0.5) continue

    const available = getCardsBySlot(slotKey)
    if (available.length === 0) continue

    cards[slotKey] = available[Math.floor(Math.random() * available.length)]
  }

  const stackName = name || `${characterSlug}-random-${Date.now().toString(36)}`
  return buildStack(characterSlug, stackName, cards)
}

// ── Pack Opening ────────────────────────────────────────────────────────────

import type { PackType, PackContents } from './types'

const PACK_CONFIG: Record<PackType, { count: number; guaranteed: Rarity; weights: Record<Rarity, number> }> = {
  starter: {
    count: 5,
    guaranteed: 'common',
    weights: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 },
  },
  booster: {
    count: 5,
    guaranteed: 'uncommon',
    weights: { common: 40, uncommon: 35, rare: 18, epic: 5, legendary: 2 },
  },
  premium: {
    count: 7,
    guaranteed: 'rare',
    weights: { common: 20, uncommon: 30, rare: 30, epic: 15, legendary: 5 },
  },
  legendary: {
    count: 5,
    guaranteed: 'epic',
    weights: { common: 5, uncommon: 15, rare: 30, epic: 35, legendary: 15 },
  },
}

function weightedRarityPick(weights: Record<Rarity, number>): Rarity {
  const total = Object.values(weights).reduce((s, w) => s + w, 0)
  let roll = Math.random() * total
  for (const [rarity, weight] of Object.entries(weights) as [Rarity, number][]) {
    roll -= weight
    if (roll <= 0) return rarity
  }
  return 'common'
}

function randomCardOfRarity(rarity: Rarity): Card {
  // Try to find a card of the exact rarity
  const matching = CARD_CATALOGUE.filter(c => c.rarity === rarity)
  if (matching.length > 0) {
    return matching[Math.floor(Math.random() * matching.length)]
  }
  // Fallback: any card
  return CARD_CATALOGUE[Math.floor(Math.random() * CARD_CATALOGUE.length)]
}

export function openPack(type: PackType): PackContents {
  const config = PACK_CONFIG[type]
  const cards: Card[] = []

  // Guaranteed rarity card first
  cards.push(randomCardOfRarity(config.guaranteed))

  // Fill remaining slots with weighted random
  for (let i = 1; i < config.count; i++) {
    const rarity = weightedRarityPick(config.weights)
    cards.push(randomCardOfRarity(rarity))
  }

  return { type, cards, guaranteedRarity: config.guaranteed }
}

// ── Stack Validation ────────────────────────────────────────────────────────

export function validateStack(cards: Partial<Record<SlotKey, Card>>): { valid: boolean; missing: SlotKey[] } {
  const missing = REQUIRED_SLOTS.filter(slot => !cards[slot])
  return { valid: missing.length === 0, missing }
}

// ── Stack Comparison ────────────────────────────────────────────────────────

export function compareStacks(a: Stack, b: Stack): {
  powerDiff: number
  statDiffs: CardStats
  strongerIn: string[]
  weakerIn: string[]
} {
  const statDiffs: CardStats = {
    str: a.totalStats.str - b.totalStats.str,
    spe: a.totalStats.spe - b.totalStats.spe,
    ski: a.totalStats.ski - b.totalStats.ski,
    sta: a.totalStats.sta - b.totalStats.sta,
    ste: a.totalStats.ste - b.totalStats.ste,
    sty: a.totalStats.sty - b.totalStats.sty,
  }

  const strongerIn = (Object.entries(statDiffs) as [string, number][])
    .filter(([, v]) => v > 0).map(([k]) => k)
  const weakerIn = (Object.entries(statDiffs) as [string, number][])
    .filter(([, v]) => v < 0).map(([k]) => k)

  return {
    powerDiff: a.totalPower - b.totalPower,
    statDiffs,
    strongerIn,
    weakerIn,
  }
}
