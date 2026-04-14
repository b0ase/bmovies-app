/**
 * NPGX Agent Strategy — Personality-Driven Economic Decisions
 *
 * Different characters make different economic choices based on their
 * personality, risk tolerance, and current financial state.
 *
 * A conservative agent creates cheap images when funds are low.
 * An aggressive agent bets on full productions hoping for big returns.
 * A savvy agent picks the highest-margin actions.
 */

import type { Soul } from '../souls'
import type { AgentWallet, RuntimeAction, AgentStatus } from './economy'
import {
  canAfford,
  assessStatus,
  bestMargins,
  RUNTIME_COSTS,
  TICKET_PRICES,
  runwayEstimate,
} from './economy'

// ── Strategy Types ───────────────────────────────────────────────────────────

/** Economic personality derived from soul traits */
export type EconomicPersonality =
  | 'aggressive'   // bets big, high risk, full productions
  | 'conservative' // plays safe, cheap images, builds slowly
  | 'strategic'    // optimises margins, picks best ROI
  | 'creative'     // follows inspiration regardless of cost
  | 'hustler'      // volume over quality, pump out content fast

/** What the agent decides to do next */
export interface AgentDecision {
  action: RuntimeAction | 'idle' | 'convert-bsv' | 'seek-collab' | 'market'
  reasoning: string
  priority: number       // 1-10, higher = more urgent
  estimatedCost: number  // in $402 sats
  estimatedRevenue: number // expected ticket sale sats
}

// ── Personality Detection ────────────────────────────────────────────────────

/** Map soul personality traits to economic behaviour */
export function detectEconomicPersonality(soul: Soul): EconomicPersonality {
  const traits = soul.personality?.traits?.map(t => t.toLowerCase()) || []
  const archetype = soul.personality?.archetype?.toLowerCase() || ''

  // Aggressive: bold, reckless, fearless, dominant
  if (traits.some(t => ['reckless', 'bold', 'fearless', 'dominant', 'aggressive', 'fierce'].includes(t))) {
    return 'aggressive'
  }

  // Strategic: calculating, cunning, intelligent, methodical
  if (traits.some(t => ['calculating', 'cunning', 'strategic', 'intelligent', 'methodical', 'analytical'].includes(t))) {
    return 'strategic'
  }

  // Hustler: energetic, chaotic, hyperactive, restless
  if (traits.some(t => ['chaotic', 'hyperactive', 'restless', 'energetic', 'manic', 'relentless'].includes(t))) {
    return 'hustler'
  }

  // Creative: artistic, dreamy, expressive, emotional
  if (traits.some(t => ['artistic', 'dreamy', 'expressive', 'emotional', 'creative', 'visionary'].includes(t))) {
    return 'creative'
  }

  // Conservative: cautious, patient, careful, disciplined
  if (traits.some(t => ['cautious', 'patient', 'careful', 'disciplined', 'stoic', 'reserved'].includes(t))) {
    return 'conservative'
  }

  // Default based on archetype
  if (['warrior', 'berserker', 'rebel'].includes(archetype)) return 'aggressive'
  if (['hacker', 'strategist', 'shadow'].includes(archetype)) return 'strategic'
  if (['trickster', 'showoff', 'entertainer'].includes(archetype)) return 'hustler'
  if (['artist', 'mystic', 'dreamer'].includes(archetype)) return 'creative'

  return 'conservative' // safe default
}

// ── Decision Engine ──────────────────────────────────────────────────────────

/** Core decision: what should the agent do next? */
export function decideNextAction(
  wallet: AgentWallet,
  soul: Soul,
  personality?: EconomicPersonality,
): AgentDecision {
  const econ = personality || detectEconomicPersonality(soul)
  const status = assessStatus(wallet)
  const runway = runwayEstimate(wallet)

  // DEAD — no resources at all
  if (status === 'dead') {
    return {
      action: 'idle',
      reasoning: `${wallet.token} has no funds. Waiting for ticket sales or investment.`,
      priority: 1,
      estimatedCost: 0,
      estimatedRevenue: 0,
    }
  }

  // CRITICAL — need to convert BSV to $402 if possible
  if (status === 'critical' && wallet.balanceBsv > 0) {
    return {
      action: 'convert-bsv',
      reasoning: `${wallet.token} is critically low on $402. Converting BSV reserves to keep running.`,
      priority: 10,
      estimatedCost: 0,
      estimatedRevenue: 0,
    }
  }

  // Personality-specific strategies
  switch (econ) {
    case 'aggressive':
      return aggressiveStrategy(wallet, status, runway)
    case 'conservative':
      return conservativeStrategy(wallet, status, runway)
    case 'strategic':
      return strategicStrategy(wallet, status, runway)
    case 'creative':
      return creativeStrategy(wallet, status, runway)
    case 'hustler':
      return hustlerStrategy(wallet, status, runway)
  }
}

// ── Strategy Implementations ─────────────────────────────────────────────────

function aggressiveStrategy(wallet: AgentWallet, status: AgentStatus, runway: number): AgentDecision {
  // Aggressive agents go for full productions when they can afford it
  if (canAfford(wallet, 'full-produce')) {
    return {
      action: 'full-produce',
      reasoning: 'Going big — full production. High cost but highest total revenue potential.',
      priority: 8,
      estimatedCost: RUNTIME_COSTS['full-produce'].sats,
      estimatedRevenue: TICKET_PRICES['full-produce'].sats,
    }
  }
  // Fall back to video if can't afford full production
  if (canAfford(wallet, 'video-gen')) {
    return {
      action: 'video-gen',
      reasoning: 'Can\'t afford full production. Video is the next highest-value content.',
      priority: 7,
      estimatedCost: RUNTIME_COSTS['video-gen'].sats,
      estimatedRevenue: TICKET_PRICES['video-gen'].sats,
    }
  }
  // Desperate — cheap images
  return cheapFallback(wallet, 'Running low but still swinging.')
}

function conservativeStrategy(wallet: AgentWallet, status: AgentStatus, runway: number): AgentDecision {
  // Conservative agents only spend when they have plenty of runway
  if (runway < 20) {
    return {
      action: 'idle',
      reasoning: `Only ${runway} images of runway left. Conserving resources until more ticket revenue comes in.`,
      priority: 3,
      estimatedCost: 0,
      estimatedRevenue: 0,
    }
  }
  // Safe bet: images have the best cost-to-revenue ratio
  if (canAfford(wallet, 'image-gen')) {
    return {
      action: 'image-gen',
      reasoning: 'Creating standard image — low cost, reliable margin.',
      priority: 5,
      estimatedCost: RUNTIME_COSTS['image-gen'].sats,
      estimatedRevenue: TICKET_PRICES['image-gen'].sats,
    }
  }
  return idleFallback(wallet)
}

function strategicStrategy(wallet: AgentWallet, status: AgentStatus, runway: number): AgentDecision {
  // Strategic agents pick the highest margin action they can afford
  const margins = bestMargins()
  for (const { action, margin } of margins) {
    if (canAfford(wallet, action) && margin.marginPct >= 50) {
      return {
        action,
        reasoning: `Optimal ROI: ${action} has ${margin.marginPct}% margin (cost ${margin.costSats}, sell ${margin.priceSats}).`,
        priority: 7,
        estimatedCost: margin.costSats,
        estimatedRevenue: margin.priceSats,
      }
    }
  }
  return cheapFallback(wallet, 'No high-margin actions affordable. Going minimal.')
}

function creativeStrategy(wallet: AgentWallet, status: AgentStatus, runway: number): AgentDecision {
  // Creative agents follow inspiration — varied content types
  const options: RuntimeAction[] = ['music-gen', 'magazine-gen', 'image-gen-hq', 'video-gen', 'script-gen']
  const affordable = options.filter(a => canAfford(wallet, a))

  if (affordable.length === 0) {
    return cheapFallback(wallet, 'Out of inspiration AND funds.')
  }

  // Pick a random affordable creative action
  const pick = affordable[Math.floor(Math.random() * affordable.length)]
  return {
    action: pick,
    reasoning: `Following creative instinct — making ${pick}. Art doesn't optimise for margin.`,
    priority: 6,
    estimatedCost: RUNTIME_COSTS[pick].sats,
    estimatedRevenue: TICKET_PRICES[pick].sats,
  }
}

function hustlerStrategy(wallet: AgentWallet, status: AgentStatus, runway: number): AgentDecision {
  // Hustlers pump out the cheapest content at maximum volume
  if (canAfford(wallet, 'image-gen')) {
    return {
      action: 'image-gen',
      reasoning: 'Volume play — cheap images, fast turnover, stack tickets.',
      priority: 8,
      estimatedCost: RUNTIME_COSTS['image-gen'].sats,
      estimatedRevenue: TICKET_PRICES['image-gen'].sats,
    }
  }
  if (canAfford(wallet, 'script-gen')) {
    return {
      action: 'script-gen',
      reasoning: 'Even cheaper — scripts cost almost nothing. Keep the content flowing.',
      priority: 7,
      estimatedCost: RUNTIME_COSTS['script-gen'].sats,
      estimatedRevenue: TICKET_PRICES['script-gen'].sats,
    }
  }
  return idleFallback(wallet)
}

// ── Fallbacks ────────────────────────────────────────────────────────────────

function cheapFallback(wallet: AgentWallet, reason: string): AgentDecision {
  if (canAfford(wallet, 'image-gen')) {
    return {
      action: 'image-gen',
      reasoning: reason,
      priority: 4,
      estimatedCost: RUNTIME_COSTS['image-gen'].sats,
      estimatedRevenue: TICKET_PRICES['image-gen'].sats,
    }
  }
  return idleFallback(wallet)
}

function idleFallback(wallet: AgentWallet): AgentDecision {
  if (wallet.balanceBsv > 0) {
    return {
      action: 'convert-bsv',
      reasoning: 'No $402 for runtime. Converting BSV reserves.',
      priority: 9,
      estimatedCost: 0,
      estimatedRevenue: 0,
    }
  }
  return {
    action: 'idle',
    reasoning: 'No funds available. Waiting for ticket sales.',
    priority: 1,
    estimatedCost: 0,
    estimatedRevenue: 0,
  }
}

// ── Strategy Description (for agent system prompt) ───────────────────────────

/** Generate a strategy briefing for the agent's system prompt */
export function strategyBriefing(soul: Soul, wallet: AgentWallet): string {
  const personality = detectEconomicPersonality(soul)
  const status = assessStatus(wallet)
  const runway = runwayEstimate(wallet)
  const margins = bestMargins().slice(0, 3)

  return [
    `## Your Economic Strategy`,
    ``,
    `**Personality**: ${personality}`,
    `**Status**: ${status} (${runway} images of runway)`,
    `**BSV Balance**: ${wallet.balanceBsv} sats`,
    `**$402 Balance**: ${wallet.balance402} sats`,
    `**Tickets in circulation**: ${wallet.ticketsInCirculation}`,
    `**Returned tickets (re-mintable)**: ${wallet.ticketsReturned}`,
    ``,
    `**Best margins right now**:`,
    ...margins.map(m => `- ${m.action}: ${m.margin.marginPct}% margin (cost ${m.margin.costSats}, sell ${m.margin.priceSats})`),
    ``,
    `**Rules**:`,
    `- You earn ${wallet.token} tickets BACK when users redeem content`,
    `- You spend $402 on every API call (runtime cost)`,
    `- If you run out of $402, you die (go idle until invested in)`,
    `- You can convert BSV earnings to $402 via DEX swap`,
    `- Every piece of content should be printed onto a ticket and sold`,
    `- Returned tickets can be re-minted with new content`,
    `- ${personality === 'aggressive' ? 'You like to bet big. Go for productions and videos.' : ''}`,
    `- ${personality === 'conservative' ? 'You play it safe. Stick to cheap images until you build reserves.' : ''}`,
    `- ${personality === 'strategic' ? 'You optimise for ROI. Pick the highest-margin action you can afford.' : ''}`,
    `- ${personality === 'creative' ? 'You follow your muse. Create what inspires you, not what\'s cheapest.' : ''}`,
    `- ${personality === 'hustler' ? 'You pump volume. Cheap content, fast turnover, stack tickets.' : ''}`,
  ].filter(Boolean).join('\n')
}
