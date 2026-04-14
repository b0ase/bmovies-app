/**
 * NPGX Agent Economy — Ticket-Based Circular Token System
 *
 * Each character agent operates a ticket economy (Ticket CDN patent):
 *   1. Agent spends $402 on runtime (API costs)
 *   2. Agent creates content (image, video, song, magazine)
 *   3. Agent "prints" content onto $LUNA tickets (1sat ordinal inscription)
 *   4. User buys ticket (agent receives BSV)
 *   5. User redeems ticket → content accessed → ticket returns to agent
 *   6. Agent re-mints (prints new content) → sells again → loop
 *
 * Tokens are NEVER burned. Circular economy per Ticket CDN patent.
 * Three-state lifecycle: held → staked → redeemed (returns to issuer).
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** What the agent can spend $402 on */
export type RuntimeAction =
  | 'image-gen'
  | 'image-gen-hq'
  | 'video-gen'
  | 'video-extend'
  | 'music-gen'
  | 'stem-separate'
  | 'midi-transcribe'
  | 'movie-export'
  | 'full-produce'
  | 'magazine-gen'
  | 'cards-gen'
  | 'script-gen'

/** Ticket states per Ticket CDN patent */
export type TicketState = 'held' | 'staked' | 'redeemed'

/** A single ticket in the agent's economy */
export interface Ticket {
  id: string
  token: string              // e.g. '$LUNA'
  state: TicketState
  contentType: 'image' | 'video' | 'music' | 'magazine' | 'card' | 'production'
  contentHash: string        // SHA-256 of inscribed content
  contentUrl: string         // URL to the content
  mintedAt: string           // ISO timestamp
  redeemedAt?: string        // when user redeemed
  soldForSats: number        // what it sold for
  generationDnaId?: string   // link to Generation DNA chain
}

/** Ledger entry for tracking income/expenses */
export interface LedgerEntry {
  id: string
  timestamp: string
  type: 'expense' | 'income' | 'ticket-return'
  action: string             // what happened
  amountSats: number         // in satoshis
  balance402After: number    // $402 balance after this entry
  balanceBsvAfter: number    // BSV balance after this entry
  ticketId?: string          // if ticket-related
  note?: string
}

/** The agent's complete financial state */
export interface AgentWallet {
  slug: string
  token: string              // e.g. '$LUNA'

  // Balances
  balanceBsv: number         // BSV in satoshis (from ticket sales)
  balance402: number         // $402 tokens (for runtime spending)

  // Ticket inventory
  ticketsMinted: number      // total ever minted
  ticketsInCirculation: number  // currently held by users
  ticketsReturned: number    // redeemed, back in agent's hands (re-mintable)
  ticketsStaked: number      // locked by holders for rewards

  // Revenue tracking
  totalRevenueSats: number   // lifetime BSV earned from sales
  totalSpent402: number      // lifetime $402 spent on runtime
  totalContentCreated: number // pieces of content made

  // Ledger
  ledger: LedgerEntry[]

  // Tickets pool
  returnedTickets: Ticket[]  // tickets that came back, ready for re-minting
}

/** Agent's survival status */
export type AgentStatus = 'thriving' | 'stable' | 'struggling' | 'critical' | 'dead'

// ── Runtime Costs (in $402 tokens, denominated in satoshis) ──────────────────

export const RUNTIME_COSTS: Record<RuntimeAction, { sats: number; usdApprox: string; description: string }> = {
  'image-gen':      { sats: 20,   usdApprox: '$0.01',  description: 'Standard image (Atlas Cloud)' },
  'image-gen-hq':   { sats: 140,  usdApprox: '$0.07',  description: 'High-quality image (Grok)' },
  'video-gen':      { sats: 800,  usdApprox: '$0.40',  description: 'Video clip (Wan 2.2)' },
  'video-extend':   { sats: 800,  usdApprox: '$0.40',  description: 'Extend existing video' },
  'music-gen':      { sats: 40,   usdApprox: '$0.02',  description: 'Song (MiniMax)' },
  'stem-separate':  { sats: 30,   usdApprox: '$0.015', description: 'Stem separation (Demucs)' },
  'midi-transcribe':{ sats: 30,   usdApprox: '$0.015', description: 'MIDI transcription (Basic Pitch)' },
  'movie-export':   { sats: 0,    usdApprox: '$0.00',  description: 'FFmpeg assembly (free)' },
  'full-produce':   { sats: 2820, usdApprox: '$1.41',  description: 'Full production pipeline' },
  'magazine-gen':   { sats: 200,  usdApprox: '$0.10',  description: '32-page magazine' },
  'cards-gen':      { sats: 60,   usdApprox: '$0.03',  description: 'Trading card pack' },
  'script-gen':     { sats: 10,   usdApprox: '$0.005', description: 'Script/screenplay' },
}

/** What agents charge users (markup over cost) */
export const TICKET_PRICES: Record<RuntimeAction, { sats: number; usdApprox: string }> = {
  'image-gen':      { sats: 50,   usdApprox: '$0.025' },
  'image-gen-hq':   { sats: 200,  usdApprox: '$0.10' },
  'video-gen':      { sats: 1500, usdApprox: '$0.75' },
  'video-extend':   { sats: 1500, usdApprox: '$0.75' },
  'music-gen':      { sats: 100,  usdApprox: '$0.05' },
  'stem-separate':  { sats: 80,   usdApprox: '$0.04' },
  'midi-transcribe':{ sats: 80,   usdApprox: '$0.04' },
  'movie-export':   { sats: 200,  usdApprox: '$0.10' },
  'full-produce':   { sats: 6000, usdApprox: '$3.00' },
  'magazine-gen':   { sats: 500,  usdApprox: '$0.25' },
  'cards-gen':      { sats: 100,  usdApprox: '$0.05' },
  'script-gen':     { sats: 50,   usdApprox: '$0.025' },
}

// ── Revenue Split (per ticket sale) ──────────────────────────────────────────

export const REVENUE_SPLIT = {
  agent:     0.50,  // 50% stays with the character agent (operating capital)
  character: 0.25,  // 25% to character token holders ($LUNA holders)
  npgx:      0.125, // 12.5% to $NPGX holders
  npg:       0.0625,// 6.25% to $NPG holders
  boase:     0.0625,// 6.25% to $BOASE treasury
} as const

// ── Wallet Operations ────────────────────────────────────────────────────────

/** Create a fresh wallet for a character agent */
export function createWallet(slug: string, token: string, initialBalance402: number = 0): AgentWallet {
  return {
    slug,
    token,
    balanceBsv: 0,
    balance402: initialBalance402,
    ticketsMinted: 0,
    ticketsInCirculation: 0,
    ticketsReturned: 0,
    ticketsStaked: 0,
    totalRevenueSats: 0,
    totalSpent402: 0,
    totalContentCreated: 0,
    ledger: [],
    returnedTickets: [],
  }
}

/** Check if agent can afford an action */
export function canAfford(wallet: AgentWallet, action: RuntimeAction): boolean {
  return wallet.balance402 >= RUNTIME_COSTS[action].sats
}

/** Spend $402 on runtime (creating content) */
export function spendOnRuntime(wallet: AgentWallet, action: RuntimeAction): AgentWallet {
  const cost = RUNTIME_COSTS[action]
  if (wallet.balance402 < cost.sats) {
    throw new Error(`${wallet.token} cannot afford ${action}: needs ${cost.sats} sats, has ${wallet.balance402}`)
  }

  const entry: LedgerEntry = {
    id: `exp-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    type: 'expense',
    action: `runtime:${action}`,
    amountSats: cost.sats,
    balance402After: wallet.balance402 - cost.sats,
    balanceBsvAfter: wallet.balanceBsv,
    note: cost.description,
  }

  return {
    ...wallet,
    balance402: wallet.balance402 - cost.sats,
    totalSpent402: wallet.totalSpent402 + cost.sats,
    totalContentCreated: wallet.totalContentCreated + 1,
    ledger: [...wallet.ledger, entry],
  }
}

/** Mint a ticket with content printed on it */
export function mintTicket(
  wallet: AgentWallet,
  contentType: Ticket['contentType'],
  contentHash: string,
  contentUrl: string,
  generationDnaId?: string,
): { wallet: AgentWallet; ticket: Ticket } {
  const ticket: Ticket = {
    id: `${wallet.slug}-ticket-${(wallet.ticketsMinted + 1).toString(36)}`,
    token: wallet.token,
    state: 'held',
    contentType,
    contentHash,
    contentUrl,
    mintedAt: new Date().toISOString(),
    soldForSats: 0,
    generationDnaId,
  }

  return {
    wallet: {
      ...wallet,
      ticketsMinted: wallet.ticketsMinted + 1,
    },
    ticket,
  }
}

/** Record a ticket sale (user bought the ticket) */
export function sellTicket(
  wallet: AgentWallet,
  ticket: Ticket,
  priceSats: number,
): AgentWallet {
  // Agent keeps 50%, rest distributed to token hierarchy
  const agentShare = Math.floor(priceSats * REVENUE_SPLIT.agent)

  const entry: LedgerEntry = {
    id: `inc-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    type: 'income',
    action: `ticket-sale:${ticket.contentType}`,
    amountSats: agentShare,
    balance402After: wallet.balance402,
    balanceBsvAfter: wallet.balanceBsv + agentShare,
    ticketId: ticket.id,
    note: `Sold for ${priceSats} sats (agent keeps ${agentShare})`,
  }

  return {
    ...wallet,
    balanceBsv: wallet.balanceBsv + agentShare,
    totalRevenueSats: wallet.totalRevenueSats + priceSats,
    ticketsInCirculation: wallet.ticketsInCirculation + 1,
    ledger: [...wallet.ledger, entry],
  }
}

/** Ticket redeemed — returns to agent for re-minting */
export function redeemTicket(wallet: AgentWallet, ticket: Ticket): { wallet: AgentWallet; returnedTicket: Ticket } {
  const returnedTicket: Ticket = {
    ...ticket,
    state: 'redeemed',
    redeemedAt: new Date().toISOString(),
  }

  const entry: LedgerEntry = {
    id: `ret-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    type: 'ticket-return',
    action: 'ticket-redeemed',
    amountSats: 0,
    balance402After: wallet.balance402,
    balanceBsvAfter: wallet.balanceBsv,
    ticketId: ticket.id,
    note: `Ticket returned — available for re-minting`,
  }

  return {
    wallet: {
      ...wallet,
      ticketsInCirculation: wallet.ticketsInCirculation - 1,
      ticketsReturned: wallet.ticketsReturned + 1,
      returnedTickets: [...wallet.returnedTickets, returnedTicket],
      ledger: [...wallet.ledger, entry],
    },
    returnedTicket,
  }
}

/** Re-mint a returned ticket with new content */
export function remintTicket(
  wallet: AgentWallet,
  returnedTicketId: string,
  newContentHash: string,
  newContentUrl: string,
  newContentType?: Ticket['contentType'],
): { wallet: AgentWallet; ticket: Ticket } {
  const idx = wallet.returnedTickets.findIndex(t => t.id === returnedTicketId)
  if (idx === -1) {
    throw new Error(`Ticket ${returnedTicketId} not found in returned pool`)
  }

  const old = wallet.returnedTickets[idx]
  const ticket: Ticket = {
    ...old,
    state: 'held',
    contentType: newContentType || old.contentType,
    contentHash: newContentHash,
    contentUrl: newContentUrl,
    mintedAt: new Date().toISOString(),
    redeemedAt: undefined,
    soldForSats: 0,
  }

  const remaining = [...wallet.returnedTickets]
  remaining.splice(idx, 1)

  return {
    wallet: {
      ...wallet,
      ticketsReturned: wallet.ticketsReturned - 1,
      returnedTickets: remaining,
    },
    ticket,
  }
}

/** Convert BSV earnings to $402 for runtime (simulates DEX swap) */
export function convertBsvTo402(wallet: AgentWallet, bsvSats: number, rate402Per1Bsv: number = 1): AgentWallet {
  if (wallet.balanceBsv < bsvSats) {
    throw new Error(`${wallet.token} has ${wallet.balanceBsv} BSV sats, needs ${bsvSats}`)
  }

  const got402 = Math.floor(bsvSats * rate402Per1Bsv)

  return {
    ...wallet,
    balanceBsv: wallet.balanceBsv - bsvSats,
    balance402: wallet.balance402 + got402,
    ledger: [...wallet.ledger, {
      id: `swap-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      type: 'expense',
      action: 'bsv-to-402-swap',
      amountSats: bsvSats,
      balance402After: wallet.balance402 + got402,
      balanceBsvAfter: wallet.balanceBsv - bsvSats,
      note: `Swapped ${bsvSats} BSV → ${got402} $402 @ ${rate402Per1Bsv}x`,
    }],
  }
}

// ── Survival Assessment ──────────────────────────────────────────────────────

/** How many standard images can the agent still create? */
export function runwayEstimate(wallet: AgentWallet): number {
  const cheapestAction = RUNTIME_COSTS['image-gen'].sats
  return Math.floor(wallet.balance402 / cheapestAction)
}

/** Assess agent's survival status */
export function assessStatus(wallet: AgentWallet): AgentStatus {
  const runway = runwayEstimate(wallet)
  if (wallet.balance402 === 0 && wallet.balanceBsv === 0) return 'dead'
  if (runway < 3) return 'critical'
  if (runway < 10) return 'struggling'
  if (runway < 50) return 'stable'
  return 'thriving'
}

/** Calculate profit margin for a given action */
export function marginForAction(action: RuntimeAction): { costSats: number; priceSats: number; marginPct: number } {
  const cost = RUNTIME_COSTS[action].sats
  const price = TICKET_PRICES[action].sats
  return {
    costSats: cost,
    priceSats: price,
    marginPct: cost === 0 ? 100 : Math.round(((price - cost) / price) * 100),
  }
}

/** Get the most profitable actions (sorted by margin) */
export function bestMargins(): { action: RuntimeAction; margin: ReturnType<typeof marginForAction> }[] {
  const actions = Object.keys(RUNTIME_COSTS) as RuntimeAction[]
  return actions
    .map(action => ({ action, margin: marginForAction(action) }))
    .sort((a, b) => b.margin.marginPct - a.margin.marginPct)
}

/** Summary of the agent's financial health */
export function walletSummary(wallet: AgentWallet): string {
  const status = assessStatus(wallet)
  const runway = runwayEstimate(wallet)
  return [
    `${wallet.token} Agent Economy`,
    `Status: ${status.toUpperCase()}`,
    `BSV: ${wallet.balanceBsv} sats | $402: ${wallet.balance402} sats`,
    `Tickets: ${wallet.ticketsMinted} minted, ${wallet.ticketsInCirculation} in circulation, ${wallet.ticketsReturned} returned`,
    `Staked: ${wallet.ticketsStaked}`,
    `Content created: ${wallet.totalContentCreated}`,
    `Lifetime revenue: ${wallet.totalRevenueSats} sats | Lifetime spend: ${wallet.totalSpent402} sats`,
    `Runway: ~${runway} standard images`,
    `Net P&L: ${wallet.totalRevenueSats - wallet.totalSpent402} sats`,
  ].join('\n')
}
