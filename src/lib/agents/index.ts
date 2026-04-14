export { runCharacterAgent, runAgentBySlug, runAllAgents, runCollaboration, runCrewMember } from './agent-runner'
export { buildAgentSystemPrompt } from './soul-to-prompt'
export { buildCrew } from './crew'
export { buildManifest } from './manifest'
export type { AgentConfig, AgentRunResult, AgentEntry } from './types'
export type { AgentDecision as AgentDecisionType } from './types'
export type { AgentManifest } from './manifest'

// Economy — ticket-based circular token system
export {
  createWallet,
  canAfford,
  spendOnRuntime,
  mintTicket,
  sellTicket,
  redeemTicket,
  remintTicket,
  convertBsvTo402,
  runwayEstimate,
  assessStatus,
  marginForAction,
  bestMargins,
  walletSummary,
  RUNTIME_COSTS,
  TICKET_PRICES,
  REVENUE_SPLIT,
} from './economy'
export type { AgentWallet, Ticket, TicketState, LedgerEntry, RuntimeAction, AgentStatus } from './economy'

// Strategy — personality-driven economic decisions
export {
  detectEconomicPersonality,
  decideNextAction,
  strategyBriefing,
} from './strategy'
export type { EconomicPersonality } from './strategy'
export type { AgentDecision } from './strategy'

// Autonomous swarm
export { AutonomousSwarm, getSwarm, resetSwarm } from './autonomous'
export type { SwarmConfig, SwarmEvent, SwarmEventType, AgentState, ColonyStatus } from './autonomous'
