// NPGX Trading Card system — types, stats, rarity
// Deterministic stat generation per character based on category + specialties

import { NPGX_ROSTER, ROSTER_BY_SLUG, type NPGXCharacter } from './npgx-roster'

// ─── Types ───────────────────────────────────────────────

export interface CardStats {
  strength: number   // 10-99
  speed: number
  skill: number
  stamina: number
  stealth: number
  style: number
  total: number
  tier: 'S' | 'A' | 'B' | 'C' | 'D'
}

export interface TradingCard {
  id: string              // unique card ID (uuid)
  slug: string            // character slug
  character: NPGXCharacter
  imageUrl: string        // AI-generated or fallback image
  stats: CardStats
  rarity: RarityTier
  serial: string          // e.g. "NPGX-A-0042"
  series: string          // e.g. "GENESIS"
  createdAt: string       // ISO date
}

export interface RarityTier {
  name: string
  color: string
  glow: string
  textColor: string
  minScore: number
}

// ─── Rarity Tiers ────────────────────────────────────────

export const RARITY_TIERS: RarityTier[] = [
  { name: 'LEGENDARY', color: '#ffd700', glow: 'rgba(255,215,0,0.6)', textColor: '#ffd700', minScore: 500 },
  { name: 'EPIC',      color: '#a855f7', glow: 'rgba(168,85,247,0.5)', textColor: '#c084fc', minScore: 400 },
  { name: 'RARE',      color: '#06b6d4', glow: 'rgba(6,182,212,0.4)', textColor: '#22d3ee', minScore: 300 },
  { name: 'UNCOMMON',  color: '#22c55e', glow: 'rgba(34,197,94,0.3)', textColor: '#4ade80', minScore: 200 },
  { name: 'COMMON',    color: '#6b7280', glow: 'rgba(107,114,128,0.2)', textColor: '#9ca3af', minScore: 0 },
]

export function getRarityTier(totalScore: number): RarityTier {
  return RARITY_TIERS.find(t => totalScore >= t.minScore) || RARITY_TIERS[RARITY_TIERS.length - 1]
}

// ─── Category stat tendencies ────────────────────────────
// Each category biases 2-3 stats higher. Values are additive bonuses (0-25).

const CATEGORY_BONUSES: Record<string, Partial<Record<keyof Omit<CardStats, 'total' | 'tier'>, number>>> = {
  cyberpunk:  { skill: 20, style: 15, speed: 10 },
  stealth:    { stealth: 25, speed: 15 },
  gothic:     { style: 20, stamina: 15, strength: 5 },
  elemental:  { strength: 20, skill: 15, stamina: 5 },
  mecha:      { strength: 25, stamina: 20 },
  arcane:     { skill: 25, stealth: 15 },
  street:     { speed: 20, style: 15, strength: 5 },
}

// ─── Deterministic seeded random ─────────────────────────

function seedHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function seededRandom(seed: number, index: number): number {
  // Simple LCG
  const x = Math.sin(seed + index * 127.1) * 43758.5453
  return x - Math.floor(x)
}

// ─── Stat Generation ─────────────────────────────────────

export function generateCardStats(slug: string, variance: number = 0): CardStats {
  const character = ROSTER_BY_SLUG[slug]
  if (!character) throw new Error(`Unknown character: ${slug}`)

  const seed = seedHash(slug + (variance ? String(variance) : ''))
  const bonuses = CATEGORY_BONUSES[character.category] || {}

  const statKeys = ['strength', 'speed', 'skill', 'stamina', 'stealth', 'style'] as const
  const stats: Record<string, number> = {}

  for (let i = 0; i < statKeys.length; i++) {
    const key = statKeys[i]
    const base = 30 + Math.floor(seededRandom(seed, i) * 40) // 30-69 base
    const bonus = bonuses[key] || 0
    const rand = Math.floor(seededRandom(seed, i + 100) * 15) - 7 // -7 to +7
    stats[key] = Math.min(99, Math.max(10, base + bonus + rand))
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0)
  const tier = getStatTier(total)

  return { ...stats, total, tier } as CardStats
}

export function getStatTier(total: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (total >= 500) return 'S'
  if (total >= 400) return 'A'
  if (total >= 300) return 'B'
  if (total >= 200) return 'C'
  return 'D'
}

// ─── Serial Number ───────────────────────────────────────

export function generateSerial(letter: string, count: number): string {
  return `NPGX-${letter}-${String(count).padStart(4, '0')}`
}

// ─── Card Factory ────────────────────────────────────────

export function createTradingCard(
  slug: string,
  imageUrl: string,
  options?: { series?: string; serialCount?: number; variance?: number }
): TradingCard {
  const character = ROSTER_BY_SLUG[slug]
  if (!character) throw new Error(`Unknown character: ${slug}`)

  const stats = generateCardStats(slug, options?.variance || 0)
  const rarity = getRarityTier(stats.total)

  return {
    id: crypto.randomUUID(),
    slug,
    character,
    imageUrl,
    stats,
    rarity,
    serial: generateSerial(character.letter, options?.serialCount || 1),
    series: options?.series || 'GENESIS',
    createdAt: new Date().toISOString(),
  }
}

// ─── Prebuilt cards from existing images ─────────────────

export function createStaticCards(): TradingCard[] {
  return NPGX_ROSTER.map((char, i) => createTradingCard(
    char.slug,
    char.image,
    { serialCount: i + 1, variance: 0 }
  ))
}
