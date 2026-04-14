/**
 * NPGX Agent Runner
 *
 * Each character is a CEO agent with a crew of subagents she can deploy.
 *
 * Architecture:
 *   Character Agent (CEO) ← soul file = personality + creative vision
 *     ├── director      — Creative direction, shoot planning
 *     ├── writer        — Scripts, lyrics, copy
 *     ├── photographer  — Image generation, visual portfolio
 *     ├── editor        — Video/magazine assembly, post-production
 *     ├── producer      — Music composition, sound design
 *     └── marketer      — Brand strategy, token economics
 *
 * MCP tools give every agent access to:
 *   npgx-server    — 16 creative tools (image, video, music, magazine, cards, etc.)
 *   openclaw       — 41 tools (mining, trading, DEX, content)
 *   music-gen      — Music generation via WaveSpeed/Replicate/AIML
 *
 * Designed to run standalone (CLI), as a service, or on OpenClaw phones.
 */

import { query } from '@anthropic-ai/claude-agent-sdk'
import { loadSoul, SOUL_SLUGS } from '../souls'
import { buildAgentSystemPrompt } from './soul-to-prompt'
import { buildCrew } from './crew'
import type { AgentConfig, AgentRunResult } from './types'

// MCP server configs matching .mcp.json
function getMcpServers(baseUrl: string, enableDaemon: boolean) {
  const servers: Record<string, any> = {
    npgx: {
      command: 'npx',
      args: ['tsx', 'mcp/npgx-server.ts'],
      cwd: process.cwd(),
      env: {
        NPGX_BASE_URL: baseUrl,
      },
    },
  }

  if (enableDaemon) {
    servers.openclaw = {
      command: 'npx',
      args: ['tsx', 'mcp/openclaw-agent.ts'],
      cwd: process.cwd(),
      env: {
        NPGX_BASE_URL: baseUrl,
        CLAWMINER_URL: process.env.CLAWMINER_URL || 'http://127.0.0.1:8402',
        CLAWDEX_URL: process.env.CLAWDEX_URL || 'https://claw-dex.com',
      },
    }
  }

  // Music gen server (if available)
  const musicServerPath = process.env.MCP_MUSIC_SERVER_PATH
    || '/Volumes/2026/Projects/mcp-music-server/dist/index.js'
  servers['music-gen'] = {
    command: 'node',
    args: [musicServerPath],
    env: {
      WAVESPEED_API_KEY: process.env.WAVESPEED_API_KEY || '',
      REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN || '',
      AIML_API_KEY: process.env.AIML_API_KEY || '',
    },
  }

  return servers
}

/**
 * Run a character agent with her full crew.
 * She is the CEO — she decides when to deploy her team.
 */
export async function runCharacterAgent(config: AgentConfig): Promise<AgentRunResult> {
  const {
    slug,
    soul,
    model,
    maxTurns = 30,
    maxBudgetUsd = 2.0,
    enableDaemon = false,
    baseUrl = process.env.NPGX_BASE_URL || 'http://localhost:3000',
    directive,
  } = config

  const systemPrompt = buildAgentSystemPrompt(soul, directive)
  const mcpServers = getMcpServers(baseUrl, enableDaemon)
  const crew = buildCrew(soul)

  const agentPrompt = directive
    || `You are ${soul.identity.name}. You run your own creative studio.

Your crew is standing by:
- **director** — your creative director, plans shoots and campaigns
- **writer** — writes your scripts, lyrics, and magazine articles
- **photographer** — generates your images, manages your visual portfolio
- **editor** — assembles your videos and magazines
- **producer** — composes your music
- **marketer** — manages your brand and token strategy

Review your content library first (use npgx_list_content with your slug). Then decide what to create next. Deploy your crew as needed. You are the boss — delegate or do it yourself.

Explain your creative vision and business reasoning for every decision.`

  let output = ''
  let sessionId: string | undefined

  for await (const message of query({
    prompt: agentPrompt,
    options: {
      cwd: process.cwd(),
      model: model || 'claude-opus-4-6',
      systemPrompt,
      mcpServers,
      maxTurns,
      maxBudgetUsd,
      allowedTools: [
        'Read', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch', 'Agent',
      ],
      agents: crew,
      permissionMode: 'acceptEdits',
    },
  })) {
    if ('result' in message) {
      output = message.result
    } else if (message.type === 'system' && message.subtype === 'init') {
      sessionId = message.session_id
    }
  }

  return {
    slug,
    characterName: soul.identity.name,
    sessionId,
    decisions: [],
    output,
  }
}

/**
 * Run a character agent by slug (loads soul automatically).
 */
export async function runAgentBySlug(
  slug: string,
  options?: Partial<Omit<AgentConfig, 'slug' | 'soul'>>,
): Promise<AgentRunResult> {
  const soul = await loadSoul(slug)
  return runCharacterAgent({ slug, soul, ...options })
}

/**
 * Run all 26 character agents sequentially.
 */
export async function runAllAgents(
  options?: Partial<Omit<AgentConfig, 'slug' | 'soul'>>,
): Promise<AgentRunResult[]> {
  const results: AgentRunResult[] = []

  for (const slug of SOUL_SLUGS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Starting agent: ${slug}`)
    console.log('='.repeat(60))

    try {
      const result = await runAgentBySlug(slug, options)
      results.push(result)
      console.log(`\nAgent ${slug} completed.`)
      console.log(`Output: ${result.output.substring(0, 200)}...`)
    } catch (err) {
      console.error(`Agent ${slug} failed:`, err)
      results.push({
        slug,
        characterName: slug,
        decisions: [],
        output: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  return results
}

/**
 * Collaboration: two characters work together on a joint project.
 * A director agent is spawned with both characters' souls.
 */
export async function runCollaboration(
  slugA: string,
  slugB: string,
  project: string,
  options?: Partial<Omit<AgentConfig, 'slug' | 'soul'>>,
): Promise<AgentRunResult> {
  const [soulA, soulB] = await Promise.all([
    loadSoul(slugA),
    loadSoul(slugB),
  ])

  // Build crews for both characters — the collab agent can delegate to either
  const crewA = buildCrew(soulA)
  const crewB = buildCrew(soulB)

  // Prefix crew names so both are accessible
  const combinedCrew: Record<string, any> = {}
  for (const [role, def] of Object.entries(crewA)) {
    const firstName = soulA.identity.name.split(' ')[0].toLowerCase()
    combinedCrew[`${firstName}-${role}`] = {
      ...def,
      description: `${soulA.identity.name.split(' ')[0]}'s ${def.description}`,
    }
  }
  for (const [role, def] of Object.entries(crewB)) {
    const firstName = soulB.identity.name.split(' ')[0].toLowerCase()
    combinedCrew[`${firstName}-${role}`] = {
      ...def,
      description: `${soulB.identity.name.split(' ')[0]}'s ${def.description}`,
    }
  }

  const collabPrompt = `You are directing a collaboration between two NPGX characters.

## The Artists

### ${soulA.identity.name} (${soulA.identity.token})
- Aesthetic: ${soulA.style.aesthetic}
- Genre: ${soulA.music?.genre || 'N/A'}
- Personality: ${soulA.personality.traits.join(', ')}
- Voice: ${soulA.personality.voice}
- Colors: ${soulA.style.colors.join(', ')}

### ${soulB.identity.name} (${soulB.identity.token})
- Aesthetic: ${soulB.style.aesthetic}
- Genre: ${soulB.music?.genre || 'N/A'}
- Personality: ${soulB.personality.traits.join(', ')}
- Voice: ${soulB.personality.voice}
- Colors: ${soulB.style.colors.join(', ')}

## Project Brief
${project}

## Your Crew
You have BOTH characters' crews available:
${Object.keys(combinedCrew).map(k => `- **${k}**`).join('\n')}

Use these subagents to produce content that merges both characters' aesthetics. Create images, videos, music, or full productions that feature both artists.

Think about how their styles CLASH and COMPLEMENT. The best collabs find the tension.`

  const mcpServers = getMcpServers(
    options?.baseUrl || process.env.NPGX_BASE_URL || 'http://localhost:3000',
    options?.enableDaemon || false,
  )

  let output = ''
  let sessionId: string | undefined

  for await (const message of query({
    prompt: collabPrompt,
    options: {
      cwd: process.cwd(),
      model: options?.model || 'claude-opus-4-6',
      mcpServers,
      maxTurns: options?.maxTurns || 40,
      maxBudgetUsd: options?.maxBudgetUsd || 3.0,
      allowedTools: ['Read', 'Glob', 'Grep', 'Bash', 'Agent'],
      agents: combinedCrew,
      permissionMode: 'acceptEdits',
    },
  })) {
    if ('result' in message) {
      output = message.result
    } else if (message.type === 'system' && message.subtype === 'init') {
      sessionId = message.session_id
    }
  }

  return {
    slug: `${slugA}+${slugB}`,
    characterName: `${soulA.identity.name} x ${soulB.identity.name}`,
    sessionId,
    decisions: [],
    output,
  }
}

/**
 * Run a specific crew member directly (for testing/debugging).
 */
export async function runCrewMember(
  slug: string,
  role: 'director' | 'writer' | 'photographer' | 'editor' | 'producer' | 'marketer',
  task: string,
  options?: Partial<Omit<AgentConfig, 'slug' | 'soul'>>,
): Promise<AgentRunResult> {
  const soul = await loadSoul(slug)
  const crew = buildCrew(soul)
  const member = crew[role]

  if (!member) {
    throw new Error(`Unknown crew role: ${role}`)
  }

  const mcpServers = getMcpServers(
    options?.baseUrl || process.env.NPGX_BASE_URL || 'http://localhost:3000',
    options?.enableDaemon || false,
  )

  let output = ''
  let sessionId: string | undefined

  for await (const message of query({
    prompt: task,
    options: {
      cwd: process.cwd(),
      model: options?.model || 'claude-sonnet-4-6',  // Crew uses Sonnet (cheaper)
      systemPrompt: member.prompt,
      mcpServers,
      maxTurns: options?.maxTurns || 15,
      maxBudgetUsd: options?.maxBudgetUsd || 0.50,
      allowedTools: member.tools,
      permissionMode: 'acceptEdits',
    },
  })) {
    if ('result' in message) {
      output = message.result
    } else if (message.type === 'system' && message.subtype === 'init') {
      sessionId = message.session_id
    }
  }

  return {
    slug,
    characterName: `${soul.identity.name} [${role}]`,
    sessionId,
    decisions: [],
    output,
  }
}
