/**
 * Agent Manifest — The installable package format for ClawMiner phones.
 *
 * Each girl becomes a self-contained JSON manifest that OpenClaw can load.
 * The manifest contains EVERYTHING needed to run her as an autonomous agent:
 *
 *   soul        — who she is (identity, appearance, personality, music, tokenomics)
 *   prompt      — her pre-built system prompt (the CEO instruction set)
 *   crew        — her 6 subagent definitions (director, writer, photographer, etc.)
 *   tools       — what MCP tools she needs and how to connect them
 *   config      — runtime settings (model, turns, budget)
 *   avatar      — her profile image path
 *   content     — her content library reference
 *
 * This is the product. This is what gets sold on a ClawMiner.
 * Majority shareholder controls the directive. The agent does the rest.
 */

import type { Soul } from '../souls'
import { buildAgentSystemPrompt } from './soul-to-prompt'
import { buildCrew } from './crew'

export interface AgentManifest {
  $schema: 'openclaw-agent/1.0'
  version: string
  builtAt: string

  // Identity
  slug: string
  name: string
  token: string
  letter: string
  tagline: string
  bio: string

  // The full soul (source of truth)
  soul: Soul

  // Pre-built system prompt for the CEO agent
  systemPrompt: string

  // Crew subagent definitions
  crew: Record<string, {
    role: string
    description: string
    prompt: string
    tools: string[]
    model: string
  }>

  // MCP tool requirements
  tools: {
    // Creative tools from npgx-server
    create: string[]
    // OpenClaw daemon tools
    daemon: string[]
    // DEX tools
    exchange: string[]
    // Trade tools
    trade: string[]
  }

  // MCP server connection config
  servers: {
    npgx: { command: string; args: string[]; env: Record<string, string> }
    openclaw: { command: string; args: string[]; env: Record<string, string> }
    musicGen: { command: string; args: string[]; env: Record<string, string> }
  }

  // Runtime config
  config: {
    ceoModel: string
    crewModel: string
    maxTurns: number
    crewMaxTurns: number
    maxBudgetUsd: number
    crewMaxBudgetUsd: number
  }

  // Asset paths
  assets: {
    avatar: string
    contentDir: string
    soulFile: string
  }

  // Token economics
  economics: {
    token: string
    parent: string
    maxSupply: number
    issuerSharePct: number
    platformSharePct: number
    pricingModel: string
  }
}

/**
 * Build a complete agent manifest for a character.
 * This is the installable package for ClawMiner phones.
 */
export function buildManifest(slug: string, soul: Soul): AgentManifest {
  const crew = buildCrew(soul)
  const systemPrompt = buildAgentSystemPrompt(soul)

  // Format crew for manifest
  const crewManifest: AgentManifest['crew'] = {}
  for (const [role, def] of Object.entries(crew)) {
    crewManifest[role] = {
      role,
      description: def.description,
      prompt: def.prompt,
      tools: def.tools,
      model: 'claude-sonnet-4-6',
    }
  }

  return {
    $schema: 'openclaw-agent/1.0',
    version: '1.0.0',
    builtAt: new Date().toISOString(),

    slug,
    name: soul.identity.name,
    token: soul.identity.token,
    letter: soul.identity.letter,
    tagline: soul.identity.tagline,
    bio: soul.identity.bio,

    soul,
    systemPrompt,

    crew: crewManifest,

    tools: {
      create: [
        'npgx_list_characters',
        'npgx_get_character',
        'npgx_generate_image',
        'npgx_generate_video',
        'npgx_generate_music',
        'npgx_generate_magazine',
        'npgx_generate_cards',
        'npgx_generate_script',
        'npgx_produce',
        'npgx_list_content',
        'npgx_movie_library',
        'npgx_movie_export',
        'npgx_assemble_video',
        'npgx_extend_video',
        'npgx_create_generation',
        'npgx_get_lineage',
      ],
      daemon: [
        'claw_status',
        'claw_mining',
        'claw_wallet',
        'claw_peers',
        'claw_tokens',
        'claw_portfolio',
        'claw_blocks',
        'claw_content_stats',
        'claw_start_mining',
        'claw_stop_mining',
      ],
      exchange: [
        'dex_market',
        'dex_listings',
        'dex_holdings',
        'dex_purchase',
        'dex_nodes',
        'dex_skills',
        'dex_revenue',
        'dex_dividends',
      ],
      trade: [
        'trade_discover',
        'trade_evaluate',
        'trade_acquire',
        'trade_serve',
        'trade_wallet',
        'trade_economics',
      ],
    },

    servers: {
      npgx: {
        command: 'npx',
        args: ['tsx', 'mcp/npgx-server.ts'],
        env: { NPGX_BASE_URL: 'http://localhost:3000' },
      },
      openclaw: {
        command: 'npx',
        args: ['tsx', 'mcp/openclaw-agent.ts'],
        env: {
          NPGX_BASE_URL: 'http://localhost:3000',
          CLAWMINER_URL: 'http://127.0.0.1:8402',
          CLAWDEX_URL: 'https://claw-dex.com',
        },
      },
      musicGen: {
        command: 'node',
        args: ['mcp-music-server/dist/index.js'],
        env: {
          WAVESPEED_API_KEY: '',
          REPLICATE_API_TOKEN: '',
          AIML_API_KEY: '',
        },
      },
    },

    config: {
      ceoModel: 'claude-opus-4-6',
      crewModel: 'claude-sonnet-4-6',
      maxTurns: 30,
      crewMaxTurns: 15,
      maxBudgetUsd: 2.0,
      crewMaxBudgetUsd: 0.50,
    },

    assets: {
      avatar: `/content/${slug}/images/avatar/avatar.png`,
      contentDir: `/content/${slug}/`,
      soulFile: `/souls/${slug}.json`,
    },

    economics: {
      token: soul.tokenomics.token,
      parent: soul.tokenomics.parent,
      maxSupply: soul.tokenomics.maxSupply,
      issuerSharePct: soul.tokenomics.issuerShareBps / 100,
      platformSharePct: soul.tokenomics.platformShareBps / 100,
      pricingModel: soul.tokenomics.pricingModel,
    },
  }
}
