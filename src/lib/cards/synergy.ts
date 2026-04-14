/**
 * NPGX Outfit Clash — Synergy System
 *
 * Three types of synergy reward thoughtful deck building:
 *
 * 1. Category Affinity — character category + card slot alignment = +15% stats
 * 2. Set Bonuses — matching rarity across equipped cards = flat stat bonus
 * 3. Slot Combos — specific slot combinations trigger named bonuses
 */

import type { Card, CardStats, SlotKey, Rarity, StatKey } from './types'

// ── Synergy Result ─────────────────────────────────────────────────────────

export interface SynergyBonus {
  type: 'affinity' | 'set' | 'combo'
  name: string
  description: string
  statBonus: Partial<CardStats>
}

export interface SynergyResult {
  bonuses: SynergyBonus[]
  totalBonus: CardStats
}

// ── 1. Category Affinity ───────────────────────────────────────────────────
// When a character's category matches a card's slot affinity, +15% to that card's stats.

type CharacterCategory = 'cyberpunk' | 'stealth' | 'gothic' | 'elemental' | 'mecha' | 'arcane' | 'street' | 'kawaii'

const SLOT_AFFINITIES: Record<SlotKey, CharacterCategory[]> = {
  // Combat-oriented slots favor combat categories
  prop_right:     ['cyberpunk', 'mecha', 'street'],
  prop_left:      ['cyberpunk', 'mecha', 'street'],
  arm_accessory:  ['cyberpunk', 'mecha', 'street'],
  // Mystique-oriented slots favor stealth/arcane
  face_accessory: ['stealth', 'gothic', 'arcane'],
  neckwear:       ['stealth', 'gothic', 'arcane'],
  headpiece:      ['stealth', 'gothic', 'arcane'],
  // Environmental slots
  setting:        ['elemental', 'arcane', 'stealth'],
  lighting:       ['elemental', 'arcane', 'gothic'],
  pose:           ['street', 'mecha', 'elemental'],
  // Fashion-oriented slots
  hairstyle:      ['street', 'gothic', 'cyberpunk'],
  top:            ['street', 'gothic', 'cyberpunk'],
  bottom:         ['street', 'gothic', 'cyberpunk'],
  footwear:       ['street', 'mecha', 'cyberpunk'],
  jewellery:      ['gothic', 'arcane', 'cyberpunk'],
  back_accessory: ['arcane', 'gothic', 'mecha'],
}

const AFFINITY_MULTIPLIER = 0.15 // +15% to card stats

export function calcAffinityBonuses(
  characterCategory: string,
  equippedCards: Card[],
): SynergyBonus[] {
  const bonuses: SynergyBonus[] = []

  for (const card of equippedCards) {
    const affinities = SLOT_AFFINITIES[card.slot]
    if (affinities && affinities.includes(characterCategory as CharacterCategory)) {
      const bonus: Partial<CardStats> = {}
      for (const [stat, val] of Object.entries(card.stats) as [StatKey, number][]) {
        const extra = Math.round(val * AFFINITY_MULTIPLIER)
        if (extra > 0) bonus[stat] = extra
      }
      if (Object.values(bonus).some(v => v && v > 0)) {
        bonuses.push({
          type: 'affinity',
          name: `${card.name} Affinity`,
          description: `${characterCategory} synergy with ${card.name}`,
          statBonus: bonus,
        })
      }
    }
  }

  return bonuses
}

// ── 2. Set Bonuses (matching rarity) ───────────────────────────────────────
// 3+ cards of same rarity = flat bonus to all stats.

const SET_THRESHOLDS: { count: number; bonus: number }[] = [
  { count: 5, bonus: 12 },
  { count: 4, bonus: 8 },
  { count: 3, bonus: 5 },
]

export function calcSetBonuses(equippedCards: Card[]): SynergyBonus[] {
  const rarityCounts: Partial<Record<Rarity, number>> = {}
  for (const card of equippedCards) {
    rarityCounts[card.rarity] = (rarityCounts[card.rarity] || 0) + 1
  }

  const bonuses: SynergyBonus[] = []

  for (const [rarity, count] of Object.entries(rarityCounts) as [Rarity, number][]) {
    for (const threshold of SET_THRESHOLDS) {
      if (count >= threshold.count) {
        bonuses.push({
          type: 'set',
          name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Set ×${count}`,
          description: `${count} ${rarity} cards equipped — +${threshold.bonus} all stats`,
          statBonus: {
            str: threshold.bonus,
            spe: threshold.bonus,
            ski: threshold.bonus,
            sta: threshold.bonus,
            ste: threshold.bonus,
            sty: threshold.bonus,
          },
        })
        break // Only apply highest threshold per rarity
      }
    }
  }

  return bonuses
}

// ── 3. Slot Combos ─────────────────────────────────────────────────────────
// Named equipment combinations that grant specific stat bonuses.

interface SlotCombo {
  id: string
  name: string
  description: string
  requiredSlots: SlotKey[]
  statBonus: Partial<CardStats>
}

const SLOT_COMBOS: SlotCombo[] = [
  {
    id: 'full-arsenal',
    name: 'Full Arsenal',
    description: 'Both hands armed and ready for war',
    requiredSlots: ['prop_right', 'prop_left', 'arm_accessory'],
    statBonus: { str: 8 },
  },
  {
    id: 'stealth-ops',
    name: 'Stealth Ops',
    description: 'Face hidden, back covered, silent footsteps',
    requiredSlots: ['face_accessory', 'back_accessory', 'footwear'],
    statBonus: { ste: 8 },
  },
  {
    id: 'fashion-kill',
    name: 'Fashion Kill',
    description: 'Hair, jewels, neck, and perfect lighting',
    requiredSlots: ['hairstyle', 'jewellery', 'neckwear', 'lighting'],
    statBonus: { sty: 8 },
  },
  {
    id: 'war-machine',
    name: 'War Machine',
    description: 'Crowned, armored, armed, and ready to pose',
    requiredSlots: ['headpiece', 'top', 'arm_accessory', 'pose'],
    statBonus: { str: 6, sta: 6 },
  },
  {
    id: 'shadow-walker',
    name: 'Shadow Walker',
    description: 'The setting, the light, the mask, the cape — invisible',
    requiredSlots: ['setting', 'lighting', 'face_accessory', 'back_accessory'],
    statBonus: { ste: 6, ski: 6 },
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Light bottoms, fast boots, action pose',
    requiredSlots: ['footwear', 'bottom', 'pose'],
    statBonus: { spe: 10 },
  },
  {
    id: 'full-outfit',
    name: 'Full Outfit',
    description: 'Head to toe — complete look, no gaps',
    requiredSlots: ['hairstyle', 'top', 'bottom', 'footwear', 'neckwear'],
    statBonus: { sta: 5, sty: 5 },
  },
  {
    id: 'dark-ritual',
    name: 'Dark Ritual',
    description: 'Crown, jewels, and the void itself',
    requiredSlots: ['headpiece', 'jewellery', 'setting'],
    statBonus: { ski: 6, ste: 4 },
  },
  {
    id: 'action-hero',
    name: 'Action Hero',
    description: 'Armed, booted, and in motion',
    requiredSlots: ['prop_right', 'footwear', 'pose'],
    statBonus: { str: 4, spe: 4, ski: 4 },
  },
]

export function calcSlotCombos(equippedCards: Card[]): SynergyBonus[] {
  const filledSlots = new Set(equippedCards.map(c => c.slot))
  const bonuses: SynergyBonus[] = []

  for (const combo of SLOT_COMBOS) {
    if (combo.requiredSlots.every(slot => filledSlots.has(slot))) {
      bonuses.push({
        type: 'combo',
        name: combo.name,
        description: combo.description,
        statBonus: combo.statBonus,
      })
    }
  }

  return bonuses
}

// ── Combined Synergy Calculation ───────────────────────────────────────────

function sumBonuses(bonuses: SynergyBonus[]): CardStats {
  const total: CardStats = { str: 0, spe: 0, ski: 0, sta: 0, ste: 0, sty: 0 }
  for (const bonus of bonuses) {
    for (const [stat, val] of Object.entries(bonus.statBonus) as [StatKey, number][]) {
      if (val) total[stat] += val
    }
  }
  return total
}

/**
 * Calculate all synergies for an equipped loadout.
 * Returns individual bonuses and the total stat bonus to add.
 */
export function calcAllSynergies(
  characterCategory: string,
  equippedCards: Card[],
): SynergyResult {
  const affinity = calcAffinityBonuses(characterCategory, equippedCards)
  const sets = calcSetBonuses(equippedCards)
  const combos = calcSlotCombos(equippedCards)

  const allBonuses = [...affinity, ...sets, ...combos]

  return {
    bonuses: allBonuses,
    totalBonus: sumBonuses(allBonuses),
  }
}
