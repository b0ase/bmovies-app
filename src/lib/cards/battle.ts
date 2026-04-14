/**
 * NPGX Battle System — ported from NPG
 *
 * Three battle modes:
 * - total_power: sum all stats, ±10% variance, higher wins
 * - stat_duel: each player picks 3 stats, union set compared, variance applied
 * - best_of_three: 3 random stats, each compared individually, best of 3 wins
 *
 * Original NPG: api/matches/[slug]/resolve/route.ts
 * NPGX: pure functions, no DB dependency — works on phone agents too.
 */

import type {
  CardStats,
  StatKey,
  Stack,
  BattleMode,
  BattleResult,
  BattleRound,
  BattleStakes,
} from './types'

const ALL_STATS: StatKey[] = ['str', 'spe', 'ski', 'sta', 'ste', 'sty']

// ── Variance (±10% randomness, ported from NPG) ────────────────────────────

function applyVariance(score: number): number {
  const variance = Math.random() * 0.2 - 0.1 // -10% to +10%
  return Math.round(score * (1 + variance))
}

// ── Stat helpers ────────────────────────────────────────────────────────────

function sumStats(stats: CardStats, keys?: StatKey[]): number {
  const k = keys || ALL_STATS
  return k.reduce((sum, key) => sum + stats[key], 0)
}

function pickRandomStats(count: number): StatKey[] {
  const shuffled = [...ALL_STATS]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

function determineWinner(a: number, b: number): 'a' | 'b' | 'draw' {
  if (a > b) return 'a'
  if (b > a) return 'b'
  return 'draw'
}

// ── Battle Modes ────────────────────────────────────────────────────────────

/**
 * Total Power — sum all 6 stats, apply ±10% variance, higher wins.
 * Simple and dramatic. The NPG default.
 */
function resolveTotalPower(a: CardStats, b: CardStats): { winner: 'a' | 'b' | 'draw'; scoreA: number; scoreB: number } {
  const rawA = sumStats(a)
  const rawB = sumStats(b)
  const scoreA = applyVariance(rawA)
  const scoreB = applyVariance(rawB)
  return { winner: determineWinner(scoreA, scoreB), scoreA, scoreB }
}

/**
 * Stat Duel — each side picks 3 stats, union set is compared.
 * NPG style: the selected stats are unioned so both players' picks matter.
 * If no picks provided, 3 random stats are chosen for each side.
 */
function resolveStatDuel(
  a: CardStats,
  b: CardStats,
  picksA?: StatKey[],
  picksB?: StatKey[],
): { winner: 'a' | 'b' | 'draw'; scoreA: number; scoreB: number; rounds: BattleRound[] } {
  const pA = picksA || pickRandomStats(3)
  const pB = picksB || pickRandomStats(3)
  const battleStats = [...new Set([...pA, ...pB])]

  const rounds: BattleRound[] = battleStats.map(stat => ({
    stat,
    valueA: a[stat],
    valueB: b[stat],
    winner: determineWinner(a[stat], b[stat]),
  }))

  const scoreA = applyVariance(sumStats(a, battleStats))
  const scoreB = applyVariance(sumStats(b, battleStats))

  return { winner: determineWinner(scoreA, scoreB), scoreA, scoreB, rounds }
}

/**
 * Best of Three — 3 random stats compared head-to-head.
 * Each stat is its own round. Win 2+ rounds to win the battle.
 * No variance on individual rounds — pure stat comparison.
 */
function resolveBestOfThree(a: CardStats, b: CardStats): { winner: 'a' | 'b' | 'draw'; rounds: BattleRound[] } {
  const stats = pickRandomStats(3)

  const rounds: BattleRound[] = stats.map(stat => ({
    stat,
    valueA: a[stat],
    valueB: b[stat],
    winner: determineWinner(a[stat], b[stat]),
  }))

  const winsA = rounds.filter(r => r.winner === 'a').length
  const winsB = rounds.filter(r => r.winner === 'b').length

  return {
    winner: winsA > winsB ? 'a' : winsB > winsA ? 'b' : 'draw',
    rounds,
  }
}

// ── Main Battle Function ────────────────────────────────────────────────────

export function battle(
  stackA: Stack,
  stackB: Stack,
  mode: BattleMode = 'total_power',
  options?: {
    picksA?: StatKey[]
    picksB?: StatKey[]
    stakes?: BattleStakes
  },
): BattleResult {
  const base = {
    mode,
    stackA: { slug: stackA.characterSlug, name: stackA.name, power: stackA.totalPower, stats: stackA.totalStats },
    stackB: { slug: stackB.characterSlug, name: stackB.name, power: stackB.totalPower, stats: stackB.totalStats },
    stakes: options?.stakes,
  }

  switch (mode) {
    case 'total_power':
    case 'outfit_clash': {
      const r = resolveTotalPower(stackA.totalStats, stackB.totalStats)
      return { ...base, winner: r.winner }
    }
    case 'stat_duel': {
      const r = resolveStatDuel(stackA.totalStats, stackB.totalStats, options?.picksA, options?.picksB)
      return { ...base, winner: r.winner, rounds: r.rounds }
    }
    case 'best_of_three': {
      const r = resolveBestOfThree(stackA.totalStats, stackB.totalStats)
      return { ...base, winner: r.winner, rounds: r.rounds }
    }
  }
}

// ── Quick Battle (slug-free, stats only) ────────────────────────────────────

export function quickBattle(
  statsA: CardStats,
  statsB: CardStats,
  mode: BattleMode = 'total_power',
): { winner: 'a' | 'b' | 'draw'; rounds?: BattleRound[] } {
  switch (mode) {
    case 'total_power':
    case 'outfit_clash': {
      const r = resolveTotalPower(statsA, statsB)
      return { winner: r.winner }
    }
    case 'stat_duel': {
      const r = resolveStatDuel(statsA, statsB)
      return { winner: r.winner, rounds: r.rounds }
    }
    case 'best_of_three': {
      const r = resolveBestOfThree(statsA, statsB)
      return { winner: r.winner, rounds: r.rounds }
    }
  }
}
