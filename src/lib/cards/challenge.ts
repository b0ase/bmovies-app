/**
 * NPGX Outfit Clash — Challenge Cards
 *
 * A Challenge defines the battlefield for each match:
 * - Which 3 stats matter (primary 2x, secondary 1.5x, tertiary 1x)
 * - A bonus condition worth +10 flat points
 *
 * Players see the challenge BEFORE equipping cards,
 * creating a strategic decision about how to dress their fighter.
 */

import type { StatKey, SlotKey, Rarity } from './types'

// ── Bonus Condition Types ──────────────────────────────────────────────────

export type BonusCondition =
  | { type: 'category'; value: string; label: string }       // Character must be this category
  | { type: 'max_rarity'; value: Rarity; label: string }     // No cards above this rarity
  | { type: 'require_slot'; value: SlotKey; label: string }  // Must fill this specific slot
  | { type: 'min_cards'; value: number; label: string }      // Must equip at least N cards
  | { type: 'matching_rarity'; value: number; label: string }// N cards must share same rarity
  | { type: 'no_slot'; value: SlotKey; label: string }       // Cannot use this slot

// ── Challenge Card ─────────────────────────────────────────────────────────

export type ChallengeRarity = 'standard' | 'rare' | 'legendary'

export interface Challenge {
  id: string
  name: string
  description: string           // Flavour text
  primaryStat: StatKey          // 2x weight
  secondaryStat: StatKey        // 1.5x weight
  tertiaryStat: StatKey         // 1x weight
  bonusCondition: BonusCondition
  rarity: ChallengeRarity       // Legendary challenges only in high-stakes
}

// ── Challenge Catalogue ────────────────────────────────────────────────────

export const CHALLENGE_CATALOGUE: Challenge[] = [
  // ── STANDARD CHALLENGES ──
  {
    id: 'midnight-runway',
    name: 'Midnight Runway',
    description: 'The underground fashion show demands presence above all.',
    primaryStat: 'sty',
    secondaryStat: 'ste',
    tertiaryStat: 'spe',
    bonusCondition: { type: 'require_slot', value: 'lighting', label: 'Must equip Lighting' },
    rarity: 'standard',
  },
  {
    id: 'street-brawl',
    name: 'Street Brawl',
    description: 'Fists fly in the back alleys of Kabukicho.',
    primaryStat: 'str',
    secondaryStat: 'sta',
    tertiaryStat: 'ski',
    bonusCondition: { type: 'category', value: 'street', label: 'Street character' },
    rarity: 'standard',
  },
  {
    id: 'ghost-protocol',
    name: 'Ghost Protocol',
    description: 'Disappear completely. No flashy gear allowed.',
    primaryStat: 'ste',
    secondaryStat: 'spe',
    tertiaryStat: 'ski',
    bonusCondition: { type: 'max_rarity', value: 'rare', label: 'No cards above Rare' },
    rarity: 'standard',
  },
  {
    id: 'neon-arena',
    name: 'Neon Arena',
    description: 'Under the spotlights, only style and skill survive.',
    primaryStat: 'sty',
    secondaryStat: 'ski',
    tertiaryStat: 'str',
    bonusCondition: { type: 'require_slot', value: 'lighting', label: 'Must equip Lighting' },
    rarity: 'standard',
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'First to move wins. Everything else is noise.',
    primaryStat: 'spe',
    secondaryStat: 'ski',
    tertiaryStat: 'sta',
    bonusCondition: { type: 'require_slot', value: 'footwear', label: 'Must equip Footwear' },
    rarity: 'standard',
  },
  {
    id: 'cyber-siege',
    name: 'Cyber Siege',
    description: 'Hack the mainframe. Brute force or finesse — your call.',
    primaryStat: 'ski',
    secondaryStat: 'spe',
    tertiaryStat: 'ste',
    bonusCondition: { type: 'category', value: 'cyberpunk', label: 'Cyberpunk character' },
    rarity: 'standard',
  },
  {
    id: 'iron-wall',
    name: 'Iron Wall',
    description: 'Survive the onslaught. Last one standing wins.',
    primaryStat: 'sta',
    secondaryStat: 'str',
    tertiaryStat: 'ste',
    bonusCondition: { type: 'min_cards', value: 8, label: 'Equip 8+ cards' },
    rarity: 'standard',
  },
  {
    id: 'shadow-hunt',
    name: 'Shadow Hunt',
    description: 'Stalk your prey through the neon-drenched streets.',
    primaryStat: 'ste',
    secondaryStat: 'str',
    tertiaryStat: 'spe',
    bonusCondition: { type: 'require_slot', value: 'face_accessory', label: 'Must equip Face' },
    rarity: 'standard',
  },
  {
    id: 'punk-riot',
    name: 'Punk Riot',
    description: 'Burn it all down. Raw power and attitude.',
    primaryStat: 'str',
    secondaryStat: 'sty',
    tertiaryStat: 'sta',
    bonusCondition: { type: 'require_slot', value: 'prop_right', label: 'Must equip Right Hand' },
    rarity: 'standard',
  },
  {
    id: 'void-waltz',
    name: 'Void Waltz',
    description: 'Dance at the edge of nothing. Grace under pressure.',
    primaryStat: 'ski',
    secondaryStat: 'sty',
    tertiaryStat: 'spe',
    bonusCondition: { type: 'require_slot', value: 'pose', label: 'Must equip Pose' },
    rarity: 'standard',
  },
  {
    id: 'back-alley-deal',
    name: 'Back Alley Deal',
    description: 'Trust no one. Read everyone.',
    primaryStat: 'ste',
    secondaryStat: 'ski',
    tertiaryStat: 'sty',
    bonusCondition: { type: 'require_slot', value: 'setting', label: 'Must equip Setting' },
    rarity: 'standard',
  },
  {
    id: 'mecha-showdown',
    name: 'Mecha Showdown',
    description: 'Heavy metal thunder. Armor up or get crushed.',
    primaryStat: 'str',
    secondaryStat: 'sta',
    tertiaryStat: 'spe',
    bonusCondition: { type: 'category', value: 'mecha', label: 'Mecha character' },
    rarity: 'standard',
  },
  {
    id: 'occult-ritual',
    name: 'Occult Ritual',
    description: 'Channel the dark arts. Knowledge is power.',
    primaryStat: 'ski',
    secondaryStat: 'ste',
    tertiaryStat: 'sta',
    bonusCondition: { type: 'category', value: 'arcane', label: 'Arcane character' },
    rarity: 'standard',
  },
  {
    id: 'rooftop-chase',
    name: 'Rooftop Chase',
    description: 'Across the Tokyo skyline. Don\'t look down.',
    primaryStat: 'spe',
    secondaryStat: 'sta',
    tertiaryStat: 'str',
    bonusCondition: { type: 'no_slot', value: 'back_accessory', label: 'No Back accessory' },
    rarity: 'standard',
  },
  {
    id: 'gothic-ball',
    name: 'Gothic Ball',
    description: 'The masquerade demands elegance and mystery.',
    primaryStat: 'sty',
    secondaryStat: 'ste',
    tertiaryStat: 'ski',
    bonusCondition: { type: 'category', value: 'gothic', label: 'Gothic character' },
    rarity: 'standard',
  },
  {
    id: 'survival-run',
    name: 'Survival Run',
    description: 'Stamina and speed. Nothing else matters.',
    primaryStat: 'sta',
    secondaryStat: 'spe',
    tertiaryStat: 'ski',
    bonusCondition: { type: 'require_slot', value: 'footwear', label: 'Must equip Footwear' },
    rarity: 'standard',
  },
  {
    id: 'undercover-op',
    name: 'Undercover Op',
    description: 'Blend in. Strike when they least expect it.',
    primaryStat: 'ste',
    secondaryStat: 'ski',
    tertiaryStat: 'str',
    bonusCondition: { type: 'category', value: 'stealth', label: 'Stealth character' },
    rarity: 'standard',
  },
  {
    id: 'thunderdome',
    name: 'Thunderdome',
    description: 'Two enter. One leaves. Pure combat.',
    primaryStat: 'str',
    secondaryStat: 'spe',
    tertiaryStat: 'sta',
    bonusCondition: { type: 'require_slot', value: 'arm_accessory', label: 'Must equip Arms' },
    rarity: 'standard',
  },
  {
    id: 'fashion-kill',
    name: 'Fashion Kill',
    description: 'Weaponize your aesthetic. Slay without touching.',
    primaryStat: 'sty',
    secondaryStat: 'ski',
    tertiaryStat: 'ste',
    bonusCondition: { type: 'require_slot', value: 'jewellery', label: 'Must equip Jewellery' },
    rarity: 'standard',
  },
  {
    id: 'elemental-fury',
    name: 'Elemental Fury',
    description: 'Harness the storm. Nature bends to your will.',
    primaryStat: 'str',
    secondaryStat: 'ski',
    tertiaryStat: 'sty',
    bonusCondition: { type: 'category', value: 'elemental', label: 'Elemental character' },
    rarity: 'standard',
  },

  // ── RARE CHALLENGES ──
  {
    id: 'stripped-down',
    name: 'Stripped Down',
    description: 'Minimal gear. Maximum skill. Prove yourself naked.',
    primaryStat: 'ski',
    secondaryStat: 'str',
    tertiaryStat: 'spe',
    bonusCondition: { type: 'max_rarity', value: 'uncommon', label: 'No cards above Uncommon' },
    rarity: 'rare',
  },
  {
    id: 'full-throttle',
    name: 'Full Throttle',
    description: 'Load everything. Every slot filled. Go nuclear.',
    primaryStat: 'sta',
    secondaryStat: 'str',
    tertiaryStat: 'sty',
    bonusCondition: { type: 'min_cards', value: 12, label: 'Equip 12+ cards' },
    rarity: 'rare',
  },
  {
    id: 'matchy-matchy',
    name: 'Matchy Matchy',
    description: 'Coordination is key. Make your outfit sing.',
    primaryStat: 'sty',
    secondaryStat: 'sta',
    tertiaryStat: 'ski',
    bonusCondition: { type: 'matching_rarity', value: 4, label: '4+ cards same rarity' },
    rarity: 'rare',
  },
  {
    id: 'bare-knuckle',
    name: 'Bare Knuckle',
    description: 'Drop the weapons. Fight with what you\'ve got.',
    primaryStat: 'str',
    secondaryStat: 'sta',
    tertiaryStat: 'spe',
    bonusCondition: { type: 'no_slot', value: 'prop_right', label: 'No Right Hand prop' },
    rarity: 'rare',
  },
  {
    id: 'invisible-war',
    name: 'Invisible War',
    description: 'The battle nobody sees. Phantom vs phantom.',
    primaryStat: 'ste',
    secondaryStat: 'spe',
    tertiaryStat: 'ski',
    bonusCondition: { type: 'no_slot', value: 'headpiece', label: 'No Headpiece' },
    rarity: 'rare',
  },

  // ── LEGENDARY CHALLENGES (high-stakes only) ──
  {
    id: 'tokyo-deathmatch',
    name: 'Tokyo Deathmatch',
    description: 'The ultimate test. Everything counts. No mercy.',
    primaryStat: 'str',
    secondaryStat: 'sty',
    tertiaryStat: 'ski',
    bonusCondition: { type: 'min_cards', value: 10, label: 'Equip 10+ cards' },
    rarity: 'legendary',
  },
  {
    id: 'paupers-crown',
    name: "Pauper's Crown",
    description: 'Only the humble survive. Legendary gear is forbidden.',
    primaryStat: 'ski',
    secondaryStat: 'ste',
    tertiaryStat: 'sta',
    bonusCondition: { type: 'max_rarity', value: 'common', label: 'Commons only' },
    rarity: 'legendary',
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    description: 'Style is survival. Substance is optional.',
    primaryStat: 'sty',
    secondaryStat: 'spe',
    tertiaryStat: 'str',
    bonusCondition: { type: 'matching_rarity', value: 5, label: '5+ cards same rarity' },
    rarity: 'legendary',
  },
  {
    id: 'neon-apocalypse',
    name: 'Neon Apocalypse',
    description: 'The city burns. Only the complete survive.',
    primaryStat: 'sta',
    secondaryStat: 'str',
    tertiaryStat: 'ste',
    bonusCondition: { type: 'min_cards', value: 13, label: 'Equip 13+ cards' },
    rarity: 'legendary',
  },
  {
    id: 'shadow-empress',
    name: 'Shadow Empress',
    description: 'Rule from the darkness. Unseen. Unstoppable.',
    primaryStat: 'ste',
    secondaryStat: 'sty',
    tertiaryStat: 'str',
    bonusCondition: { type: 'require_slot', value: 'back_accessory', label: 'Must equip Back' },
    rarity: 'legendary',
  },
]

// ── Challenge Selection ────────────────────────────────────────────────────

/**
 * Pick a random challenge appropriate for the stake level.
 * Casual/Ante: standard + rare challenges
 * High Stakes: all challenges including legendary
 */
export function pickChallenge(stakeLevel: 'casual' | 'ante' | 'high_stakes' = 'casual'): Challenge {
  const pool = stakeLevel === 'high_stakes'
    ? CHALLENGE_CATALOGUE
    : CHALLENGE_CATALOGUE.filter(c => c.rarity !== 'legendary')

  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Get a specific challenge by ID.
 */
export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGE_CATALOGUE.find(c => c.id === id)
}
