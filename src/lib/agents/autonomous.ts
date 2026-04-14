/**
 * NPGX Autonomous Swarm — 26 AI Character Agents Running Continuously
 *
 * Each girl is an autonomous CEO. She wakes up, checks her wallet,
 * decides what to create based on her personality, creates it,
 * mints a ticket, then sleeps until next cycle.
 *
 * The swarm manages concurrency (max 3 agents at once to avoid
 * rate limits), handles failures gracefully, and tracks all
 * economic activity across the colony.
 *
 * Designed to run:
 *   - CLI: `pnpm swarm` (continuous daemon)
 *   - API: POST /api/agent/autonomous (start/stop/status)
 *   - Phone: OpenClaw downloads manifests, runs locally
 */

import { loadSoul, SOUL_SLUGS, type Soul } from '../souls'
import { buildAgentSystemPrompt } from './soul-to-prompt'
import {
  createWallet,
  spendOnRuntime,
  mintTicket,
  assessStatus,
  walletSummary,
  runwayEstimate,
  type AgentWallet,
  type RuntimeAction,
} from './economy'
import {
  detectEconomicPersonality,
  decideNextAction,
  strategyBriefing,
  type EconomicPersonality,
  type AgentDecision,
} from './strategy'
import { AGENT_TOOLS, executeTool, truncateToolResult } from './agent-tools'
import type { AgentRunResult } from './types'

// ── Swarm Types ──────────────────────────────────────────────────────────────

export type SwarmEventType =
  | 'swarm:start'
  | 'swarm:stop'
  | 'swarm:tick'
  | 'agent:wake'
  | 'agent:decide'
  | 'agent:create'
  | 'agent:mint'
  | 'agent:idle'
  | 'agent:error'
  | 'agent:sleep'
  | 'agent:dead'
  | 'collab:start'
  | 'collab:done'
  | 'colony:status'

export interface SwarmEvent {
  type: SwarmEventType
  timestamp: string
  slug?: string
  data: Record<string, unknown>
}

export type SwarmEventHandler = (event: SwarmEvent) => void

/** Which provider to use for agent execution */
export type SwarmProvider = 'kimi' | 'deepseek' | 'mistral' | 'openrouter' | 'claude'

export interface SwarmConfig {
  /** Max agents running concurrently (default: 3) */
  concurrency: number
  /** Seconds between agent wake cycles (default: 60) */
  cycleIntervalSec: number
  /** Starting $402 balance per agent (default: 500 sats) */
  initialBalance: number
  /** API provider (default: kimi — cheapest with good tool use) */
  provider: SwarmProvider
  /** NPGX platform base URL */
  baseUrl: string
  /** Max turns per agent per cycle (default: 8) */
  maxTurnsPerCycle: number
  /** Enable collaborations between agents (default: true) */
  enableCollabs: boolean
  /** Collab chance per cycle (0-1, default: 0.1 = 10%) */
  collabChance: number
  /** Slugs to include (default: all 26). Use to test with subset */
  slugs?: string[]
  /** Verbose logging */
  verbose: boolean
}

const DEFAULT_CONFIG: SwarmConfig = {
  concurrency: 3,
  cycleIntervalSec: 60,
  initialBalance: 500,
  provider: 'kimi',
  baseUrl: process.env.NPGX_BASE_URL || 'http://localhost:3000',
  maxTurnsPerCycle: 8,
  enableCollabs: true,
  collabChance: 0.1,
  verbose: true,
}

/** Live state of one agent in the swarm */
export interface AgentState {
  slug: string
  name: string
  token: string
  personality: EconomicPersonality
  wallet: AgentWallet
  soul: Soul
  status: 'sleeping' | 'deciding' | 'creating' | 'idle' | 'dead' | 'error'
  totalCycles: number
  totalContent: number
  lastCycle?: string
  lastAction?: string
  lastError?: string
  consecutiveErrors: number
}

/** Colony-wide status */
export interface ColonyStatus {
  running: boolean
  tick: number
  agents: AgentState[]
  totalContentCreated: number
  totalRevenue: number
  totalSpent: number
  startedAt?: string
  uptime?: string
}

// ── Provider configs for OpenAI-compatible APIs ──────────────────────────────

interface ProviderDef {
  name: string
  baseURL: string
  model: string
  apiKeyEnv: string
  maxTokens: number
}

const PROVIDERS: Record<string, ProviderDef> = {
  kimi: {
    name: 'Kimi K2',
    baseURL: 'https://api.moonshot.ai/v1',
    model: 'kimi-k2-0711-chat',
    apiKeyEnv: 'MOONSHOT_API_KEY',
    maxTokens: 4096,
  },
  deepseek: {
    name: 'DeepSeek V3',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    maxTokens: 4096,
  },
  mistral: {
    name: 'Mistral',
    baseURL: 'https://api.mistral.ai/v1',
    model: 'mistral-small-latest',
    apiKeyEnv: 'MISTRAL_API_KEY',
    maxTokens: 4096,
  },
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'moonshotai/kimi-k2',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    maxTokens: 4096,
  },
}

// ── The Swarm ────────────────────────────────────────────────────────────────

export class AutonomousSwarm {
  private config: SwarmConfig
  private agents: Map<string, AgentState> = new Map()
  private running = false
  private tick = 0
  private startedAt?: Date
  private eventHandlers: SwarmEventHandler[] = []
  private abortController?: AbortController

  constructor(config: Partial<SwarmConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ── Event System ─────────────────────────────────────────────────────────

  on(handler: SwarmEventHandler): () => void {
    this.eventHandlers.push(handler)
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler)
    }
  }

  private emit(type: SwarmEventType, slug?: string, data: Record<string, unknown> | object = {}) {
    const event: SwarmEvent = {
      type,
      timestamp: new Date().toISOString(),
      slug,
      data: data as Record<string, unknown>,
    }
    for (const handler of this.eventHandlers) {
      try { handler(event) } catch {}
    }
  }

  // ── Initialization ───────────────────────────────────────────────────────

  /** Load all souls and create initial agent states */
  async initialize(): Promise<void> {
    const slugs = this.config.slugs || [...SOUL_SLUGS]

    for (const slug of slugs) {
      try {
        const soul = await loadSoul(slug)
        const personality = detectEconomicPersonality(soul)
        const wallet = createWallet(slug, soul.tokenomics.token, this.config.initialBalance)

        this.agents.set(slug, {
          slug,
          name: soul.identity.name,
          token: soul.tokenomics.token,
          personality,
          wallet,
          soul,
          status: 'sleeping',
          totalCycles: 0,
          totalContent: 0,
          consecutiveErrors: 0,
        })
      } catch (err) {
        console.error(`Failed to load ${slug}:`, err)
      }
    }
  }

  // ── Main Loop ────────────────────────────────────────────────────────────

  /** Start the autonomous swarm. Runs until stop() is called. */
  async start(): Promise<void> {
    if (this.running) return

    await this.initialize()

    this.running = true
    this.startedAt = new Date()
    this.abortController = new AbortController()

    this.emit('swarm:start', undefined, {
      agents: this.agents.size,
      config: {
        concurrency: this.config.concurrency,
        provider: this.config.provider,
        cycleIntervalSec: this.config.cycleIntervalSec,
        initialBalance: this.config.initialBalance,
      },
    })

    while (this.running) {
      this.tick++
      this.emit('swarm:tick', undefined, { tick: this.tick })

      // Get agents that can act (not dead, not in error cooldown)
      const ready = this.getReadyAgents()

      if (ready.length === 0) {
        this.emit('colony:status', undefined, { message: 'All agents idle or dead' })
        await this.sleep(this.config.cycleIntervalSec * 1000)
        continue
      }

      // Run up to `concurrency` agents in parallel
      const batch = ready.slice(0, this.config.concurrency)
      await Promise.allSettled(batch.map(agent => this.runAgentCycle(agent)))

      // Maybe trigger a collaboration
      if (this.config.enableCollabs && Math.random() < this.config.collabChance) {
        await this.maybeCollaborate()
      }

      // Emit colony status
      this.emit('colony:status', undefined, this.getStatus())

      // Sleep between cycles
      await this.sleep(this.config.cycleIntervalSec * 1000)
    }

    this.emit('swarm:stop')
  }

  /** Stop the swarm gracefully */
  stop(): void {
    this.running = false
    this.abortController?.abort()
  }

  /** Run one cycle only (for testing/API calls) */
  async runOnce(): Promise<ColonyStatus> {
    await this.initialize()
    this.tick = 1

    const ready = this.getReadyAgents()
    const batch = ready.slice(0, this.config.concurrency)
    await Promise.allSettled(batch.map(agent => this.runAgentCycle(agent)))

    return this.getStatus()
  }

  // ── Agent Cycle ──────────────────────────────────────────────────────────

  /** One decision cycle for one agent */
  private async runAgentCycle(agent: AgentState): Promise<void> {
    const { slug } = agent

    try {
      agent.status = 'deciding'
      agent.totalCycles++
      agent.lastCycle = new Date().toISOString()

      this.emit('agent:wake', slug, {
        name: agent.name,
        token: agent.token,
        personality: agent.personality,
        wallet: walletSummary(agent.wallet),
        runway: runwayEstimate(agent.wallet),
      })

      // Ask strategy engine what to do
      const decision = decideNextAction(agent.wallet, agent.soul, agent.personality)

      this.emit('agent:decide', slug, {
        action: decision.action,
        reasoning: decision.reasoning,
        priority: decision.priority,
        estimatedCost: decision.estimatedCost,
        estimatedRevenue: decision.estimatedRevenue,
      })

      // Handle non-creation actions
      if (decision.action === 'idle') {
        agent.status = 'idle'
        agent.lastAction = 'idle'
        this.emit('agent:idle', slug, { reasoning: decision.reasoning })
        return
      }

      if (decision.action === 'convert-bsv') {
        // Simulated DEX swap — in production this hits the real DEX
        if (agent.wallet.balanceBsv > 0) {
          const swapAmount = Math.min(agent.wallet.balanceBsv, 500)
          agent.wallet = {
            ...agent.wallet,
            balanceBsv: agent.wallet.balanceBsv - swapAmount,
            balance402: agent.wallet.balance402 + swapAmount,
          }
          this.emit('agent:create', slug, { action: 'convert-bsv', amount: swapAmount })
        }
        return
      }

      if (decision.action === 'seek-collab' || decision.action === 'market') {
        agent.lastAction = decision.action
        this.emit('agent:idle', slug, { reasoning: decision.reasoning })
        return
      }

      // It's a creation action — execute it
      agent.status = 'creating'
      const runtimeAction = decision.action as RuntimeAction

      // Spend $402 on runtime
      agent.wallet = spendOnRuntime(agent.wallet, runtimeAction)

      // Execute the creation via the NPGX API tools
      const result = await this.executeCreation(agent, runtimeAction)

      if (result.success) {
        // Mint a ticket with the content
        const { wallet: newWallet, ticket } = mintTicket(
          agent.wallet,
          this.actionToContentType(runtimeAction),
          result.contentHash || `hash-${Date.now().toString(36)}`,
          result.contentUrl || `/content/${slug}/latest`,
          result.generationDnaId,
        )
        agent.wallet = newWallet
        agent.totalContent++
        agent.lastAction = runtimeAction
        agent.consecutiveErrors = 0

        this.emit('agent:mint', slug, {
          action: runtimeAction,
          ticketId: ticket.id,
          contentUrl: result.contentUrl,
          cost: decision.estimatedCost,
          totalContent: agent.totalContent,
        })
      } else {
        this.emit('agent:error', slug, {
          action: runtimeAction,
          error: result.error,
        })
        agent.consecutiveErrors++
      }

      agent.status = 'sleeping'
      this.emit('agent:sleep', slug, {
        nextCycleIn: `${this.config.cycleIntervalSec}s`,
        wallet: walletSummary(agent.wallet),
      })

    } catch (err) {
      agent.status = 'error'
      agent.lastError = err instanceof Error ? err.message : String(err)
      agent.consecutiveErrors++

      this.emit('agent:error', slug, {
        error: agent.lastError,
        consecutiveErrors: agent.consecutiveErrors,
      })

      // Kill agent after 5 consecutive errors
      if (agent.consecutiveErrors >= 5) {
        agent.status = 'dead'
        this.emit('agent:dead', slug, {
          reason: `${agent.consecutiveErrors} consecutive errors`,
          lastError: agent.lastError,
        })
      }
    }
  }

  // ── Creation Execution ───────────────────────────────────────────────────

  private async executeCreation(
    agent: AgentState,
    action: RuntimeAction,
  ): Promise<{ success: boolean; contentUrl?: string; contentHash?: string; generationDnaId?: string; error?: string }> {

    const { slug, soul } = agent
    const baseUrl = this.config.baseUrl

    // For Claude provider, use Agent SDK (expensive but full crew)
    if (this.config.provider === 'claude') {
      return this.executeWithClaudeSDK(agent, action)
    }

    // For OpenAI-compatible providers, call the NPGX API directly
    try {
      const toolName = this.actionToToolName(action)
      const toolArgs = this.buildToolArgs(agent, action)

      const result = await executeTool(toolName, toolArgs, baseUrl)
      const parsed = JSON.parse(result)

      return {
        success: !parsed.error,
        contentUrl: parsed.url || parsed.contentUrl || parsed.path,
        contentHash: parsed.hash || parsed.contentHash,
        generationDnaId: parsed.generationDnaId || parsed.dnaId,
        error: parsed.error,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  /** Use Claude Agent SDK for full autonomous run (expensive) */
  private async executeWithClaudeSDK(
    agent: AgentState,
    action: RuntimeAction,
  ): Promise<{ success: boolean; contentUrl?: string; contentHash?: string; error?: string }> {
    try {
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      const { buildCrew } = await import('./crew')

      const directive = `Create one ${action} that showcases your unique aesthetic. Use your soul's visual foundation. Be efficient — one piece of content, high quality.`

      const systemPrompt = buildAgentSystemPrompt(agent.soul, directive)
        + '\n\n' + strategyBriefing(agent.soul, agent.wallet)

      const crew = buildCrew(agent.soul)

      let output = ''
      for await (const message of query({
        prompt: directive,
        options: {
          cwd: process.cwd(),
          model: 'claude-sonnet-4-6', // Use Sonnet for individual actions (cheaper)
          systemPrompt,
          mcpServers: {
            npgx: {
              command: 'npx',
              args: ['tsx', 'mcp/npgx-server.ts'],
              env: { NPGX_BASE_URL: this.config.baseUrl },
            },
          },
          maxTurns: this.config.maxTurnsPerCycle,
          maxBudgetUsd: 0.50,
          allowedTools: ['Read', 'Glob', 'Grep', 'Agent'],
          agents: crew,
          permissionMode: 'acceptEdits' as const,
        },
      })) {
        if ('result' in message) {
          output = message.result
        }
      }

      return {
        success: true,
        contentUrl: `/content/${agent.slug}/latest`,
        contentHash: `sdk-${Date.now().toString(36)}`,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // ── Collaboration ────────────────────────────────────────────────────────

  private async maybeCollaborate(): Promise<void> {
    // Pick two random agents that are alive and have funds
    const alive = [...this.agents.values()].filter(
      a => a.status !== 'dead' && runwayEstimate(a.wallet) >= 5
    )
    if (alive.length < 2) return

    const shuffled = alive.sort(() => Math.random() - 0.5)
    const a = shuffled[0]
    const b = shuffled[1]

    this.emit('collab:start', undefined, {
      agents: [a.slug, b.slug],
      names: [a.name, b.name],
    })

    // Both agents pay for a shared creation
    try {
      if (runwayEstimate(a.wallet) >= 3 && runwayEstimate(b.wallet) >= 3) {
        a.wallet = spendOnRuntime(a.wallet, 'image-gen')
        b.wallet = spendOnRuntime(b.wallet, 'image-gen')

        // Create a collab image combining both aesthetics
        const collabPrompt = `${a.soul.generation.promptPrefix}, ${b.soul.generation.promptPrefix}, collaboration photoshoot, two women together, ${a.soul.style.aesthetic} meets ${b.soul.style.aesthetic}, ${a.soul.generation.promptSuffix}`

        const result = await executeTool('npgx_generate_image', {
          slug: a.slug,
          prompt: collabPrompt,
          negativePrompt: a.soul.generation.negativePrompt,
        }, this.config.baseUrl)

        // Both mint a ticket from the collab
        const { wallet: walletA } = mintTicket(a.wallet, 'image', `collab-${Date.now()}`, `/content/${a.slug}/collab`)
        const { wallet: walletB } = mintTicket(b.wallet, 'image', `collab-${Date.now()}`, `/content/${b.slug}/collab`)
        a.wallet = walletA
        b.wallet = walletB
        a.totalContent++
        b.totalContent++

        this.emit('collab:done', undefined, {
          agents: [a.slug, b.slug],
          result: 'success',
        })
      }
    } catch (err) {
      this.emit('collab:done', undefined, {
        agents: [a.slug, b.slug],
        result: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private getReadyAgents(): AgentState[] {
    return [...this.agents.values()]
      .filter(a => {
        if (a.status === 'dead') return false
        if (a.consecutiveErrors >= 5) return false
        if (assessStatus(a.wallet) === 'dead') {
          a.status = 'dead'
          return false
        }
        return true
      })
      // Randomize order so different agents get priority each cycle
      .sort(() => Math.random() - 0.5)
  }

  private actionToToolName(action: RuntimeAction): string {
    const map: Record<string, string> = {
      'image-gen': 'npgx_generate_image',
      'image-gen-hq': 'npgx_generate_image',
      'video-gen': 'npgx_generate_video',
      'video-extend': 'npgx_generate_video',
      'music-gen': 'npgx_generate_music',
      'magazine-gen': 'npgx_generate_magazine',
      'cards-gen': 'npgx_generate_cards',
      'script-gen': 'npgx_generate_script',
      'full-produce': 'npgx_produce',
      'stem-separate': 'npgx_generate_music',
      'midi-transcribe': 'npgx_generate_music',
      'movie-export': 'npgx_generate_video',
    }
    return map[action] || 'npgx_generate_image'
  }

  private buildToolArgs(agent: AgentState, action: RuntimeAction): Record<string, unknown> {
    const { slug, soul } = agent

    // Build a character-aware prompt using her soul file
    const basePrompt = `${soul.generation.promptPrefix}, ${soul.style.aesthetic}, ${soul.generation.promptSuffix}`

    switch (action) {
      case 'image-gen':
      case 'image-gen-hq':
        return {
          slug,
          prompt: `${basePrompt}, ${this.randomScenario(soul)}`,
          negativePrompt: soul.generation.negativePrompt,
          width: soul.generation.defaultWidth || 768,
          height: soul.generation.defaultHeight || 1024,
        }
      case 'video-gen':
      case 'video-extend':
        return {
          slug,
          prompt: `${basePrompt}, cinematic motion, ${this.randomScenario(soul)}`,
        }
      case 'music-gen':
        return {
          slug,
          prompt: `${soul.music?.genre || 'electronic'} track, ${soul.music?.mood || 'dark'}, ${soul.music?.bpm || 128} BPM, ${soul.music?.instruments?.join(', ') || 'synth, drums'}`,
          title: `${soul.identity.name.split(' ')[0]} - ${this.randomMusicTitle()}`,
        }
      case 'magazine-gen':
        return { slug }
      case 'cards-gen':
        return { slug, count: 5 }
      case 'script-gen':
        return {
          slug,
          prompt: `A short scene featuring ${soul.identity.name} in a ${soul.style.aesthetic} setting`,
        }
      case 'full-produce':
        return {
          slug,
          directive: `Full production for ${soul.identity.name}: photoshoot + music video + magazine spread`,
        }
      default:
        return { slug, prompt: basePrompt }
    }
  }

  private randomScenario(soul: Soul): string {
    const scenarios = [
      'dramatic studio portrait, moody lighting',
      'urban nightscape, neon reflections, rain-slicked streets',
      'performance on stage, crowd energy, spotlights',
      'intimate close-up, shallow depth of field',
      'rooftop at sunset, golden hour, city skyline',
      'backstage getting ready, mirror reflections',
      'abandoned warehouse, graffiti, industrial',
      'neon-lit alley, cyberpunk atmosphere',
      'fashion editorial, high contrast',
      'music video still frame, cinematic composition',
      'concert poster aesthetic, bold typography',
      'behind the scenes, candid moment',
    ]
    return scenarios[Math.floor(Math.random() * scenarios.length)]
  }

  private randomMusicTitle(): string {
    const titles = [
      'Midnight Protocol', 'Digital Heartbreak', 'Neon Requiem', 'Void Signal',
      'Chrome Tears', 'Static Hearts', 'Binary Sunset', 'Ghost Frequency',
      'Wire & Flame', 'Broken Transmission', 'Pulse Code', 'Dark Resonance',
      'Voltage', 'Fracture', 'Wired', 'Override', 'Spectral', 'Flux',
    ]
    return titles[Math.floor(Math.random() * titles.length)]
  }

  private actionToContentType(action: RuntimeAction): 'image' | 'video' | 'music' | 'magazine' | 'card' | 'production' {
    const map: Record<string, 'image' | 'video' | 'music' | 'magazine' | 'card' | 'production'> = {
      'image-gen': 'image',
      'image-gen-hq': 'image',
      'video-gen': 'video',
      'video-extend': 'video',
      'music-gen': 'music',
      'stem-separate': 'music',
      'midi-transcribe': 'music',
      'movie-export': 'video',
      'full-produce': 'production',
      'magazine-gen': 'magazine',
      'cards-gen': 'card',
      'script-gen': 'production',
    }
    return map[action] || 'image'
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms)
      this.abortController?.signal.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }

  // ── Public Getters ───────────────────────────────────────────────────────

  getStatus(): ColonyStatus {
    const agents = [...this.agents.values()]
    return {
      running: this.running,
      tick: this.tick,
      agents,
      totalContentCreated: agents.reduce((sum, a) => sum + a.totalContent, 0),
      totalRevenue: agents.reduce((sum, a) => sum + a.wallet.totalRevenueSats, 0),
      totalSpent: agents.reduce((sum, a) => sum + a.wallet.totalSpent402, 0),
      startedAt: this.startedAt?.toISOString(),
      uptime: this.startedAt
        ? `${Math.round((Date.now() - this.startedAt.getTime()) / 1000)}s`
        : undefined,
    }
  }

  getAgent(slug: string): AgentState | undefined {
    return this.agents.get(slug)
  }

  getAllAgents(): AgentState[] {
    return [...this.agents.values()]
  }

  /** Inject funds into an agent's wallet (simulate investment) */
  fundAgent(slug: string, amount402: number): boolean {
    const agent = this.agents.get(slug)
    if (!agent) return false
    agent.wallet = {
      ...agent.wallet,
      balance402: agent.wallet.balance402 + amount402,
    }
    // Revive dead agents when funded
    if (agent.status === 'dead') {
      agent.status = 'sleeping'
      agent.consecutiveErrors = 0
    }
    return true
  }

  /** Get a formatted dashboard of all agents */
  dashboard(): string {
    const agents = [...this.agents.values()]
    const lines: string[] = [
      '',
      '  ╔══════════════════════════════════════════════════════════════════════════╗',
      '  ║                        NPGX AUTONOMOUS SWARM                           ║',
      `  ║  Tick: ${String(this.tick).padEnd(6)} Running: ${this.running ? 'YES' : 'NO '}     Agents: ${String(agents.length).padEnd(3)}                     ║`,
      '  ╠══════════════════════════════════════════════════════════════════════════╣',
      '  ║  Name                    Token    Status    $402   Content  Personality ║',
      '  ╠══════════════════════════════════════════════════════════════════════════╣',
    ]

    for (const a of agents) {
      const name = a.name.substring(0, 22).padEnd(22)
      const token = a.token.padEnd(8)
      const status = a.status.padEnd(9)
      const bal = String(a.wallet.balance402).padEnd(6)
      const content = String(a.totalContent).padEnd(8)
      const pers = a.personality.padEnd(12)
      lines.push(`  ║  ${name} ${token} ${status} ${bal} ${content} ${pers}║`)
    }

    const totalContent = agents.reduce((s, a) => s + a.totalContent, 0)
    const totalSpent = agents.reduce((s, a) => s + a.wallet.totalSpent402, 0)
    const alive = agents.filter(a => a.status !== 'dead').length

    lines.push('  ╠══════════════════════════════════════════════════════════════════════════╣')
    lines.push(`  ║  Alive: ${String(alive).padEnd(3)} Content: ${String(totalContent).padEnd(6)} Spent: ${String(totalSpent).padEnd(8)} sats                   ║`)
    lines.push('  ╚══════════════════════════════════════════════════════════════════════════╝')

    return lines.join('\n')
  }
}

// ── Singleton for API routes ─────────────────────────────────────────────────

let _swarm: AutonomousSwarm | null = null

export function getSwarm(config?: Partial<SwarmConfig>): AutonomousSwarm {
  if (!_swarm) {
    _swarm = new AutonomousSwarm(config)
  }
  return _swarm
}

export function resetSwarm(): void {
  _swarm?.stop()
  _swarm = null
}
