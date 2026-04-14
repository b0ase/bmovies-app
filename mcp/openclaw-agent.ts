#!/usr/bin/env npx tsx
/**
 * NPGX OpenClaw Agent — Unified MCP Server
 *
 * Composes three MCP tool domains into a single agent brain:
 *
 *   1. CLAW   — ClawMiner daemon (mining, wallet, peers, headers, tokens)
 *   2. TRADE  — $402 protocol (discover, evaluate, acquire, serve, economics)
 *   3. CREATE — NPGX platform (generate images, video, music, magazines, cards)
 *
 * Plus self-knowledge: the agent can describe what it is and what it can do.
 *
 * Usage:
 *   NPGX_BASE_URL=http://localhost:3000 \
 *   CLAWMINER_URL=http://127.0.0.1:8402 \
 *   npx tsx mcp/openclaw-agent.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const NPGX_URL = process.env.NPGX_BASE_URL || 'http://localhost:3000'
const CLAW_URL = process.env.CLAWMINER_URL || 'http://127.0.0.1:8402'
const DEX_URL = process.env.CLAWDEX_URL || 'https://claw-dex.com'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function npgxApi(path: string, options?: RequestInit) {
  const res = await fetch(`${NPGX_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) throw new Error(`NPGX ${res.status}: ${await res.text()}`)
  return res.json()
}

async function npgxPost(path: string, body: Record<string, unknown>) {
  return npgxApi(path, { method: 'POST', body: JSON.stringify(body) })
}

async function clawApi(path: string) {
  const res = await fetch(`${CLAW_URL}${path}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`ClawMiner ${res.status}: ${await res.text()}`)
  return res.json()
}

async function dexApi(path: string) {
  const res = await fetch(`${DEX_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Claw-DEX ${res.status}: ${await res.text()}`)
  return res.json()
}

async function dexPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${DEX_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Claw-DEX ${res.status}: ${await res.text()}`)
  return res.json()
}

async function clawPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${CLAW_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`ClawMiner ${res.status}: ${await res.text()}`)
  return res.json()
}

function text(s: string) {
  return { content: [{ type: 'text' as const, text: s }] }
}

function json(data: unknown) {
  return text(JSON.stringify(data, null, 2))
}

function err(msg: string) {
  return { content: [{ type: 'text' as const, text: msg }], isError: true }
}

// ── Load self-knowledge ──────────────────────────────────────────────────────

let selfKnowledge = ''
try {
  selfKnowledge = readFileSync(join(__dirname, 'openclaw-soul.md'), 'utf-8')
} catch {
  selfKnowledge = 'OpenClaw agent — self-knowledge document not found.'
}

// ── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'openclaw',
  version: '1.0.0',
})

// ── Resource: Self-knowledge ─────────────────────────────────────────────────

server.resource('self', 'openclaw://self', async (uri) => ({
  contents: [{
    uri: uri.href,
    mimeType: 'text/markdown',
    text: selfKnowledge,
  }],
}))

server.resource('roster', 'openclaw://roster', async (uri) => {
  const data = await npgxApi('/api/generate-image-npgx')
  return {
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2),
    }],
  }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMAIN 0: SELF-KNOWLEDGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  'openclaw_whoami',
  'Describe what this agent is, what it can do, and how its tools work. Read this first.',
  {},
  async () => text(selfKnowledge),
)

server.tool(
  'openclaw_capabilities',
  'List all available tools grouped by domain (mine, trade, create)',
  {},
  async () => {
    const capabilities = {
      agent: 'OpenClaw — NPGX Autonomous Agent',
      version: '1.0.0',
      domains: {
        self: {
          description: 'Self-awareness and introspection',
          tools: ['openclaw_whoami', 'openclaw_capabilities', 'openclaw_status'],
        },
        mine: {
          description: 'ClawMiner $402 Proof-of-Indexing node',
          tools: [
            'claw_status', 'claw_mining', 'claw_wallet', 'claw_peers',
            'claw_tokens', 'claw_portfolio', 'claw_blocks', 'claw_content_stats',
            'claw_start_mining', 'claw_stop_mining',
          ],
        },
        trade: {
          description: '$402 protocol — discover, evaluate, acquire, serve content',
          tools: [
            'trade_discover', 'trade_evaluate', 'trade_acquire',
            'trade_serve', 'trade_wallet', 'trade_economics',
          ],
        },
        dex: {
          description: 'Claw-DEX cross-chain trading — BSV, ETH, BASE, SOL',
          tools: [
            'dex_market', 'dex_listings', 'dex_holdings',
            'dex_purchase', 'dex_nodes', 'dex_skills',
            'dex_revenue', 'dex_dividends',
          ],
        },
        create: {
          description: 'NPGX content generation — images, video, music, magazines',
          tools: [
            'create_image', 'create_video', 'create_music',
            'create_magazine', 'create_cards', 'create_script',
            'create_produce', 'create_list_characters', 'create_get_character',
          ],
        },
      },
      protocols: {
        '$401': 'Identity — who you are (on-chain passport)',
        '$402': 'Payment — what you mine and trade (Proof of Indexing)',
        '$403': 'Access — what you control (securities, gated content)',
      },
    }
    return json(capabilities)
  },
)

server.tool(
  'openclaw_status',
  'Combined status: daemon connection, mining, wallet, and NPGX platform health',
  {},
  async () => {
    const status: Record<string, unknown> = {
      agent: 'OpenClaw v1.0.0',
      timestamp: new Date().toISOString(),
    }

    // Check ClawMiner daemon
    try {
      const daemonStatus = await clawApi('/status')
      status.daemon = { connected: true, ...daemonStatus }
    } catch {
      status.daemon = { connected: false, url: CLAW_URL, error: 'Daemon not reachable' }
    }

    // Check mining
    try {
      const mining = await clawApi('/api/mining/status')
      status.mining = mining
    } catch {
      status.mining = { available: false }
    }

    // Check NPGX platform
    try {
      await npgxApi('/api/generate-image-npgx')
      status.npgx = { connected: true, url: NPGX_URL }
    } catch {
      status.npgx = { connected: false, url: NPGX_URL }
    }

    // Check Claw-DEX
    try {
      await dexApi('/api/market')
      status.dex = { connected: true, url: DEX_URL, chains: ['BSV', 'ETH', 'BASE', 'SOL'] }
    } catch {
      status.dex = { connected: false, url: DEX_URL }
    }

    return json(status)
  },
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMAIN 1: MINE (ClawMiner daemon)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  'claw_status',
  'Full ClawMiner node status — ID, uptime, peers, mining, wallet, headers',
  {},
  async () => {
    try {
      return json(await clawApi('/status'))
    } catch (e) {
      return err(`Daemon unreachable at ${CLAW_URL}: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'claw_mining',
  'Mining stats — blocks mined, hash rate, difficulty, mempool size',
  {},
  async () => {
    try {
      return json(await clawApi('/api/mining/status'))
    } catch (e) {
      return err(`Mining status unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'claw_wallet',
  'Wallet address, public key, and balance',
  {},
  async () => {
    try {
      return json(await clawApi('/api/wallet'))
    } catch (e) {
      return err(`Wallet unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'claw_peers',
  'Connected P2P peers with reputation scores',
  {},
  async () => {
    try {
      return json(await clawApi('/api/peers'))
    } catch (e) {
      return err(`Peers unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'claw_tokens',
  'Known $402 tokens discovered via gossip network',
  { limit: z.number().optional().describe('Max tokens to return (default: all)') },
  async ({ limit }) => {
    try {
      const path = limit ? `/api/tokens?limit=${limit}` : '/api/tokens'
      return json(await clawApi(path))
    } catch (e) {
      return err(`Tokens unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'claw_portfolio',
  'Token holdings with PnL summary — spent, revenue, net position',
  {},
  async () => {
    try {
      return json(await clawApi('/api/portfolio'))
    } catch (e) {
      return err(`Portfolio unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'claw_blocks',
  'Recent Proof-of-Indexing blocks mined by this node',
  { limit: z.number().optional().describe('Number of blocks (default: 10)') },
  async ({ limit }) => {
    try {
      return json(await clawApi(`/api/blocks?limit=${limit || 10}`))
    } catch (e) {
      return err(`Blocks unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'claw_content_stats',
  'Content store stats — items indexed, bytes stored, serves, revenue',
  {},
  async () => {
    try {
      return json(await clawApi('/api/content/stats'))
    } catch (e) {
      return err(`Content stats unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'claw_start_mining',
  'Start the Proof-of-Indexing miner',
  {},
  async () => {
    try {
      return json(await clawPost('/api/mining/start', {}))
    } catch (e) {
      return err(`Start mining failed: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'claw_stop_mining',
  'Stop the Proof-of-Indexing miner',
  {},
  async () => {
    try {
      return json(await clawPost('/api/mining/stop', {}))
    } catch (e) {
      return err(`Stop mining failed: ${e instanceof Error ? e.message : e}`)
    }
  },
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMAIN 2: TRADE ($402 protocol)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  'trade_discover',
  'Probe a $address to discover $402 pricing, supply, revenue model, and nested content',
  {
    url: z.string().describe('$address or URL (e.g. "$b0ase.com/$blog", "https://example.com/$api")'),
  },
  async ({ url }) => {
    try {
      const result = await npgxPost('/api/trade/discover', { url })
      return json(result)
    } catch (e) {
      return err(`Discovery failed: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'trade_evaluate',
  'Budget check — should the agent buy this $402 content? Returns recommendation and ROI estimate',
  {
    url: z.string().describe('$address to evaluate'),
    maxPrice: z.number().optional().describe('Max acceptable price in satoshis (default: 10000)'),
  },
  async ({ url, maxPrice }) => {
    try {
      const result = await npgxPost('/api/trade/evaluate', { url, maxPrice: maxPrice || 10000 })
      return json(result)
    } catch (e) {
      return err(`Evaluation failed: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'trade_acquire',
  'Pay for and acquire a $402 token. Debits wallet, stores token, returns gated content. SPENDS FUNDS.',
  {
    url: z.string().describe('$address to acquire'),
    maxPrice: z.number().optional().describe('Max price in satoshis — rejects if current price exceeds this'),
  },
  async ({ url, maxPrice }) => {
    try {
      const result = await npgxPost('/api/trade/acquire', { url, maxPrice: maxPrice || 10000 })
      return json(result)
    } catch (e) {
      return err(`Acquisition failed: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'trade_serve',
  'Serve content you hold to earn revenue. Each serve earns the issuer share back.',
  {
    tokenId: z.string().describe('Token ID to serve'),
  },
  async ({ tokenId }) => {
    try {
      const result = await npgxPost('/api/trade/serve', { tokenId })
      return json(result)
    } catch (e) {
      return err(`Serve failed: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'trade_wallet',
  '$402 wallet status — balance, tokens held, total spent/earned, net position',
  {},
  async () => {
    try {
      return json(await npgxApi('/api/trade/wallet'))
    } catch (e) {
      return err(`Wallet unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'trade_economics',
  'Deep economic analysis — ROI, breakeven point, revenue projections for a $402 endpoint',
  {
    url: z.string().describe('$address to analyse'),
  },
  async ({ url }) => {
    try {
      const result = await npgxPost('/api/trade/economics', { url })
      return json(result)
    } catch (e) {
      return err(`Economics analysis failed: ${e instanceof Error ? e.message : e}`)
    }
  },
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMAIN 3: CREATE (NPGX content generation)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  'create_list_characters',
  'List all 26 NPGX characters — names, tokens, categories, taglines',
  {},
  async () => json(await npgxApi('/api/generate-image-npgx')),
)

server.tool(
  'create_get_character',
  'Get full soul data for a specific NPGX character by slug or letter (A-Z)',
  {
    identifier: z.string().describe('Character slug (e.g. "cherryx") or letter (e.g. "C")'),
  },
  async ({ identifier }) => {
    const data = await npgxApi('/api/generate-image-npgx')
    const roster = data.characters || data.souls || data
    const char = Array.isArray(roster)
      ? roster.find(
          (c: any) =>
            c.slug === identifier ||
            c.letter === identifier.toUpperCase() ||
            c.name?.toLowerCase().includes(identifier.toLowerCase()),
        )
      : null
    if (!char) return err(`Character "${identifier}" not found`)
    return json(char)
  },
)

server.tool(
  'create_image',
  'Generate an AI image of an NPGX character using Grok. Returns image URL.',
  {
    slug: z.string().describe('Character slug (e.g. "cherryx", "aria-voidstrike")'),
    prompt: z.string().optional().describe('Custom prompt to add to generation'),
    scenario: z.string().optional().describe('Scene (e.g. "rooftop at night", "underground fight club")'),
  },
  async ({ slug, prompt, scenario }) => {
    const body: Record<string, unknown> = { slug }
    if (prompt) body.prompt = prompt
    if (scenario) body.scenario = scenario
    return json(await npgxPost('/api/generate-image-npgx', body))
  },
)

server.tool(
  'create_video',
  'Generate a video of an NPGX character. Returns job ID for polling.',
  {
    slug: z.string().optional().describe('Character slug'),
    prompt: z.string().optional().describe('Video scene prompt'),
    imageUrl: z.string().optional().describe('Reference image URL for image-to-video'),
    duration: z.number().optional().describe('Duration in seconds (default 5)'),
  },
  async ({ slug, prompt, imageUrl, duration }) => {
    const body: Record<string, unknown> = {}
    if (slug) body.slug = slug
    if (prompt) body.prompt = prompt
    if (imageUrl) body.imageUrl = imageUrl
    if (duration) body.duration = duration
    return json(await npgxPost('/api/generate-video', body))
  },
)

server.tool(
  'create_music',
  'Generate a theme song for an NPGX character using MiniMax Music AI',
  {
    characterName: z.string().describe('Character name (e.g. "CherryX")'),
    lyrics: z.string().optional().describe('Custom lyrics — auto-generated if omitted'),
    genre: z.string().optional().describe('Genre hint (e.g. "punk rock", "cyberpunk EDM")'),
  },
  async ({ characterName, lyrics, genre }) => {
    const body: Record<string, unknown> = { character: { name: characterName, genre } }
    if (lyrics) body.lyrics = lyrics
    return json(await npgxPost('/api/generate-song', body))
  },
)

server.tool(
  'create_magazine',
  'Generate a full 32-page AI magazine featuring an NPGX character',
  {
    slug: z.string().describe('Character slug'),
    theme: z.string().optional().describe('Magazine theme (e.g. "Tokyo Nights")'),
    issueNumber: z.number().optional().describe('Issue number'),
  },
  async ({ slug, theme, issueNumber }) => {
    const body: Record<string, unknown> = { slug }
    if (theme) body.theme = theme
    if (issueNumber) body.issueNumber = issueNumber
    return json(await npgxPost('/api/magazine/generate', body))
  },
)

server.tool(
  'create_cards',
  'Open a trading card pack — generates holographic NPGX character cards',
  {
    packType: z.enum(['booster', 'starter', 'premium']).optional().describe('Pack type'),
    character: z.string().optional().describe('Force a specific character slug'),
  },
  async ({ packType, character }) => {
    const body: Record<string, unknown> = {}
    if (packType) body.packType = packType
    if (character) body.character = character
    return json(await npgxPost('/api/cards/generate', body))
  },
)

server.tool(
  'create_script',
  'Generate a screenplay/script for an NPGX production',
  {
    slug: z.string().describe('Character slug'),
    genre: z.string().optional().describe('Genre (e.g. "action", "thriller")'),
    premise: z.string().optional().describe('Story premise'),
  },
  async ({ slug, genre, premise }) => {
    const body: Record<string, unknown> = { slug }
    if (genre) body.genre = genre
    if (premise) body.premise = premise
    return json(await npgxPost('/api/generate-script', body))
  },
)

server.tool(
  'create_produce',
  'Full one-shot production: script → shots → video → magazine. Streams NDJSON progress.',
  {
    slug: z.string().describe('Character slug'),
    scenario: z.string().describe('Production scenario/brief'),
    budget: z.enum(['low', 'medium', 'high']).optional().describe('Budget tier'),
  },
  async ({ slug, scenario, budget }) => {
    const body: Record<string, unknown> = { slug, scenario }
    if (budget) body.budget = budget
    return json(await npgxPost('/api/produce', body))
  },
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMAIN 4: DEX (Claw-DEX cross-chain trading)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  'dex_market',
  'Browse the Claw-DEX marketplace — all listed bots/tokens across BSV, ETH, BASE, SOL. Filter by chain or category.',
  {
    chain: z.enum(['BSV', 'ETH', 'BASE', 'SOL']).optional().describe('Filter by chain'),
    category: z.string().optional().describe('Filter by category (e.g. "DeFi", "Content", "Infrastructure")'),
    search: z.string().optional().describe('Search by name or token symbol'),
  },
  async ({ chain, category, search }) => {
    try {
      const params = new URLSearchParams()
      if (chain) params.set('chain', chain)
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      const qs = params.toString()
      return json(await dexApi(`/api/market${qs ? '?' + qs : ''}`))
    } catch (e) {
      return err(`DEX market unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'dex_listings',
  'Get active marketplace listings with prices and volume',
  {
    chain: z.enum(['BSV', 'ETH', 'BASE', 'SOL']).optional().describe('Filter by chain'),
  },
  async ({ chain }) => {
    try {
      const qs = chain ? `?chain=${chain}` : ''
      return json(await dexApi(`/api/market/listings${qs}`))
    } catch (e) {
      return err(`DEX listings unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'dex_holdings',
  'View your token holdings across all chains with PnL',
  {},
  async () => {
    try {
      return json(await dexApi('/api/account/holdings'))
    } catch (e) {
      return err(`Holdings unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'dex_purchase',
  'Purchase tokens on the DEX. Supports BSV, ETH, BASE, SOL chains. SPENDS FUNDS.',
  {
    endpointId: z.string().describe('Token/endpoint ID to purchase'),
    chain: z.enum(['BSV', 'ETH', 'BASE', 'SOL']).describe('Chain to pay on'),
    txHash: z.string().describe('Transaction hash proving payment'),
    buyerAddress: z.string().describe('Your wallet address on the payment chain'),
  },
  async ({ endpointId, chain, txHash, buyerAddress }) => {
    try {
      return json(await dexPost('/api/account/purchase', { endpointId, chain, txHash, buyerAddress }))
    } catch (e) {
      return err(`Purchase failed: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'dex_nodes',
  'List active ClawMiner nodes registered on the DEX network',
  {},
  async () => {
    try {
      return json(await dexApi('/api/node/list'))
    } catch (e) {
      return err(`Node list unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'dex_skills',
  'Browse the ClawMiner skills marketplace — installable agent capabilities',
  {},
  async () => {
    try {
      return json(await dexApi('/api/skills'))
    } catch (e) {
      return err(`Skills marketplace unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'dex_revenue',
  'View revenue data for tokens — x402 payments, content serves, earnings',
  {},
  async () => {
    try {
      return json(await dexApi('/api/path402/revenue'))
    } catch (e) {
      return err(`Revenue data unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

server.tool(
  'dex_dividends',
  'Check dividend distributions — payouts to token holders across chains',
  {},
  async () => {
    try {
      return json(await dexApi('/api/revenue/claims'))
    } catch (e) {
      return err(`Dividend data unavailable: ${e instanceof Error ? e.message : e}`)
    }
  },
)

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('OpenClaw agent MCP server running on stdio')
  console.error(`  NPGX:      ${NPGX_URL}`)
  console.error(`  ClawMiner: ${CLAW_URL}`)
  console.error(`  Claw-DEX:  ${DEX_URL}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
