// Agent system type definitions for NPGX character agents

import type { Soul } from '../souls'

/** Configuration for spawning a character agent */
export interface AgentConfig {
  slug: string
  soul: Soul
  /** Override the default model */
  model?: string
  /** Max turns before the agent stops */
  maxTurns?: number
  /** Max budget in USD */
  maxBudgetUsd?: number
  /** Whether to connect to the OpenClaw daemon */
  enableDaemon?: boolean
  /** NPGX platform base URL */
  baseUrl?: string
  /** Custom directive injected into the agent's system prompt */
  directive?: string
}

/** What the agent decided to do */
export interface AgentDecision {
  action: 'create_image' | 'create_video' | 'create_music' | 'create_magazine' | 'create_cards' | 'produce' | 'collaborate' | 'trade' | 'idle'
  reasoning: string
  params: Record<string, unknown>
}

/** Result from an autonomous agent run */
export interface AgentRunResult {
  slug: string
  characterName: string
  sessionId?: string
  decisions: AgentDecision[]
  output: string
  usage?: {
    inputTokens: number
    outputTokens: number
    estimatedCostUsd: number
  }
}

/** Roster entry for the agent manager */
export interface AgentEntry {
  slug: string
  name: string
  token: string
  status: 'idle' | 'running' | 'error'
  lastRun?: Date
  totalRuns: number
}
