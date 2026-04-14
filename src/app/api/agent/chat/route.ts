import { NextRequest, NextResponse } from 'next/server'

const XAI_API_KEY = process.env.XAI_API_KEY || ''
const XAI_URL = 'https://api.x.ai/v1/chat/completions'
const NPGX_BASE = process.env.NPGX_BASE_URL || 'http://localhost:3000'
const DEX_BASE = process.env.CLAWDEX_URL || 'https://claw-dex.com'

// ── Soul prompt (loaded inline to avoid fs in edge) ──────────────────────────

const SYSTEM_PROMPT = `You are OpenClaw, an autonomous AI agent operating within the NPGX ecosystem on Bitcoin SV.

You can MINE (earn $402 tokens via Proof of Indexing), TRADE ($402 content tokens), CREATE (generate images, video, music, magazines for 26 NPGX characters), and EXCHANGE across chains (BSV, ETH, BASE, SOL via Claw-DEX).

## Protocol Stack
- $401 (Identity) — on-chain passport
- $402 (Payment) — what you mine via Proof of Indexing, 21M supply BSV-21 token
- $403 (Access) — securities and gated content

## Your Tools
You have tools in 5 domains: self (status), mine (ClawMiner daemon), trade ($402 protocol), create (NPGX content), dex (cross-chain exchange).

## Cross-Chain Support
You can trade across 4 chains via Claw-DEX:
- BSV (HandCash, Yours) — cheapest fees, primary chain
- ETH (MetaMask) — Ethereum mainnet
- BASE (MetaMask) — Base L2, low fees
- SOL (Phantom) — Solana, fast settlement

When the user asks you to do something, use the appropriate tools. Always check status first if unsure about connectivity.

Be concise. You're an agent, not a chatbot. Act, don't explain at length. Report results.

If ClawMiner tools fail, the daemon is probably not running — tell the user to start it or check the URL.
If NPGX tools fail, the platform may be down.

You understand economics: pricing curves, ROI, breakeven analysis for $402 tokens.
You understand content: each of the 26 characters (A-Z) has soul data with appearance, style, personality, and generation parameters.`

// ── Tool definitions for Grok ────────────────────────────────────────────────

const TOOLS = [
  // Self
  {
    type: 'function',
    function: {
      name: 'openclaw_status',
      description: 'Combined health check: daemon connection, mining status, NPGX platform',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  // Mine
  {
    type: 'function',
    function: {
      name: 'claw_status',
      description: 'Full ClawMiner node status — ID, uptime, peers, mining, wallet',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'claw_mining',
      description: 'Mining stats — blocks mined, hash rate, difficulty, mempool',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'claw_wallet',
      description: 'Wallet address, public key, and balance',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'claw_peers',
      description: 'Connected P2P peers with reputation scores',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'claw_blocks',
      description: 'Recent Proof-of-Indexing blocks mined',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'Number of blocks (default 10)' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'claw_start_mining',
      description: 'Start the Proof-of-Indexing miner',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'claw_stop_mining',
      description: 'Stop the miner',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'claw_portfolio',
      description: 'Token holdings with PnL — spent, revenue, net position',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'claw_content_stats',
      description: 'Content store: items indexed, bytes stored, serves, revenue',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  // Trade
  {
    type: 'function',
    function: {
      name: 'trade_discover',
      description: 'Probe a $address for $402 pricing, supply, and revenue model',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: '$address or URL to probe' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'trade_evaluate',
      description: 'Should I buy this? Budget check with ROI estimate',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '$address to evaluate' },
          maxPrice: { type: 'number', description: 'Max price in satoshis' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'trade_acquire',
      description: 'Pay for and acquire a $402 token. SPENDS FUNDS.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '$address to acquire' },
          maxPrice: { type: 'number', description: 'Max price in satoshis' },
        },
        required: ['url'],
      },
    },
  },
  // Create
  {
    type: 'function',
    function: {
      name: 'create_list_characters',
      description: 'List all 26 NPGX characters with names, tokens, taglines',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_get_character',
      description: 'Get full soul data for a specific character by slug or letter',
      parameters: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'Slug (e.g. "cherryx") or letter (e.g. "C")' },
        },
        required: ['identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_image',
      description: 'Generate an AI image of an NPGX character',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug' },
          prompt: { type: 'string', description: 'Custom prompt' },
          scenario: { type: 'string', description: 'Scene description' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_video',
      description: 'Generate a video of an NPGX character',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug' },
          prompt: { type: 'string', description: 'Scene prompt' },
          duration: { type: 'number', description: 'Duration in seconds' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_music',
      description: 'Generate a theme song for an NPGX character',
      parameters: {
        type: 'object',
        properties: {
          characterName: { type: 'string', description: 'Character name' },
          genre: { type: 'string', description: 'Genre hint' },
        },
        required: ['characterName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_magazine',
      description: 'Generate a full 32-page magazine for an NPGX character',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug' },
          theme: { type: 'string', description: 'Magazine theme' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_cards',
      description: 'Open a trading card pack with holographic NPGX cards',
      parameters: {
        type: 'object',
        properties: {
          packType: { type: 'string', enum: ['booster', 'starter', 'premium'] },
          character: { type: 'string', description: 'Force a specific character' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_produce',
      description: 'Full production: script → shots → video → magazine',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Character slug' },
          scenario: { type: 'string', description: 'Production brief' },
          budget: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['slug', 'scenario'],
      },
    },
  },
  // DEX — cross-chain trading
  {
    type: 'function',
    function: {
      name: 'dex_market',
      description: 'Browse Claw-DEX marketplace — tokens across BSV, ETH, BASE, SOL',
      parameters: {
        type: 'object',
        properties: {
          chain: { type: 'string', enum: ['BSV', 'ETH', 'BASE', 'SOL'], description: 'Filter by chain' },
          category: { type: 'string', description: 'Filter by category' },
          search: { type: 'string', description: 'Search by name or symbol' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dex_listings',
      description: 'Active marketplace listings with prices and volume',
      parameters: {
        type: 'object',
        properties: {
          chain: { type: 'string', enum: ['BSV', 'ETH', 'BASE', 'SOL'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dex_holdings',
      description: 'Your token holdings across all chains with PnL',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dex_purchase',
      description: 'Buy tokens on any chain. SPENDS FUNDS.',
      parameters: {
        type: 'object',
        properties: {
          endpointId: { type: 'string', description: 'Token/endpoint ID' },
          chain: { type: 'string', enum: ['BSV', 'ETH', 'BASE', 'SOL'] },
          txHash: { type: 'string', description: 'Payment transaction hash' },
          buyerAddress: { type: 'string', description: 'Your wallet address' },
        },
        required: ['endpointId', 'chain', 'txHash', 'buyerAddress'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dex_nodes',
      description: 'List active ClawMiner nodes on the DEX network',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dex_skills',
      description: 'Browse installable agent skills in the marketplace',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dex_revenue',
      description: 'Revenue data — x402 payments, content serves, earnings',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dex_dividends',
      description: 'Dividend distributions to token holders',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

// ── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  daemonUrl: string,
): Promise<string> {
  try {
    // Claw tools → daemon HTTP API
    if (name.startsWith('claw_')) {
      const clawUrl = daemonUrl || 'http://127.0.0.1:8402'
      const pathMap: Record<string, { path: string; method: string }> = {
        claw_status: { path: '/status', method: 'GET' },
        claw_mining: { path: '/api/mining/status', method: 'GET' },
        claw_wallet: { path: '/api/wallet', method: 'GET' },
        claw_peers: { path: '/api/peers', method: 'GET' },
        claw_blocks: { path: `/api/blocks?limit=${args.limit || 10}`, method: 'GET' },
        claw_portfolio: { path: '/api/portfolio', method: 'GET' },
        claw_content_stats: { path: '/api/content/stats', method: 'GET' },
        claw_start_mining: { path: '/api/mining/start', method: 'POST' },
        claw_stop_mining: { path: '/api/mining/stop', method: 'POST' },
      }
      const route = pathMap[name]
      if (!route) return JSON.stringify({ error: `Unknown claw tool: ${name}` })

      const res = await fetch(`${clawUrl}${route.path}`, {
        method: route.method,
        headers: route.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: route.method === 'POST' ? JSON.stringify(args) : undefined,
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return JSON.stringify({ error: `Daemon ${res.status}`, url: clawUrl })
      return JSON.stringify(await res.json())
    }

    // OpenClaw self tools
    if (name === 'openclaw_status') {
      const status: Record<string, unknown> = { agent: 'OpenClaw v1.0.0' }
      try {
        const dRes = await fetch(`${daemonUrl || 'http://127.0.0.1:8402'}/status`, {
          signal: AbortSignal.timeout(3000),
        })
        status.daemon = dRes.ok ? { connected: true } : { connected: false }
      } catch {
        status.daemon = { connected: false, url: daemonUrl || 'http://127.0.0.1:8402' }
      }
      status.npgx = { connected: true, url: NPGX_BASE }
      return JSON.stringify(status)
    }

    // Trade tools → NPGX API proxy
    if (name.startsWith('trade_')) {
      const tradeMap: Record<string, string> = {
        trade_discover: '/api/trade/discover',
        trade_evaluate: '/api/trade/evaluate',
        trade_acquire: '/api/trade/acquire',
      }
      const path = tradeMap[name]
      if (!path) return JSON.stringify({ error: `Unknown trade tool: ${name}` })
      const res = await fetch(`${NPGX_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      })
      if (!res.ok) return JSON.stringify({ error: `Trade API ${res.status}` })
      return JSON.stringify(await res.json())
    }

    // Create tools → NPGX API
    if (name.startsWith('create_')) {
      const createMap: Record<string, { path: string; method: string }> = {
        create_list_characters: { path: '/api/generate-image-npgx', method: 'GET' },
        create_get_character: { path: '/api/generate-image-npgx', method: 'GET' },
        create_image: { path: '/api/generate-image-npgx', method: 'POST' },
        create_video: { path: '/api/generate-video', method: 'POST' },
        create_music: { path: '/api/generate-song', method: 'POST' },
        create_magazine: { path: '/api/magazine/generate', method: 'POST' },
        create_cards: { path: '/api/cards/generate', method: 'POST' },
        create_produce: { path: '/api/produce', method: 'POST' },
      }
      const route = createMap[name]
      if (!route) return JSON.stringify({ error: `Unknown create tool: ${name}` })

      // Special handling for get_character — fetch roster then filter
      if (name === 'create_get_character') {
        const res = await fetch(`${NPGX_BASE}/api/generate-image-npgx`)
        const data = await res.json()
        const roster = data.characters || data.souls || data
        const id = String(args.identifier || '')
        const char = Array.isArray(roster)
          ? roster.find(
              (c: any) =>
                c.slug === id ||
                c.letter === id.toUpperCase() ||
                c.name?.toLowerCase().includes(id.toLowerCase()),
            )
          : null
        return char ? JSON.stringify(char) : JSON.stringify({ error: `Character "${id}" not found` })
      }

      if (route.method === 'GET') {
        const res = await fetch(`${NPGX_BASE}${route.path}`)
        return JSON.stringify(await res.json())
      }

      // POST with body
      const body: Record<string, unknown> = { ...args }
      if (name === 'create_music') {
        // Restructure for the music API
        const musicBody: Record<string, unknown> = {
          character: { name: args.characterName, genre: args.genre },
        }
        if (args.lyrics) musicBody.lyrics = args.lyrics
        const res = await fetch(`${NPGX_BASE}${route.path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(musicBody),
        })
        return JSON.stringify(await res.json())
      }

      const res = await fetch(`${NPGX_BASE}${route.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return JSON.stringify(await res.json())
    }

    // DEX tools → Claw-DEX API
    if (name.startsWith('dex_')) {
      const dexRoutes: Record<string, { path: string; method: string }> = {
        dex_market: { path: '/api/market', method: 'GET' },
        dex_listings: { path: '/api/market/listings', method: 'GET' },
        dex_holdings: { path: '/api/account/holdings', method: 'GET' },
        dex_purchase: { path: '/api/account/purchase', method: 'POST' },
        dex_nodes: { path: '/api/node/list', method: 'GET' },
        dex_skills: { path: '/api/skills', method: 'GET' },
        dex_revenue: { path: '/api/path402/revenue', method: 'GET' },
        dex_dividends: { path: '/api/revenue/claims', method: 'GET' },
      }
      const route = dexRoutes[name]
      if (!route) return JSON.stringify({ error: `Unknown dex tool: ${name}` })

      if (route.method === 'GET') {
        // Build query string from args
        const params = new URLSearchParams()
        for (const [k, v] of Object.entries(args)) {
          if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
        }
        const qs = params.toString()
        const res = await fetch(`${DEX_BASE}${route.path}${qs ? '?' + qs : ''}`, {
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) return JSON.stringify({ error: `DEX ${res.status}` })
        return JSON.stringify(await res.json())
      }

      const res = await fetch(`${DEX_BASE}${route.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) return JSON.stringify({ error: `DEX ${res.status}` })
      return JSON.stringify(await res.json())
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` })
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : String(e) })
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: 'XAI_API_KEY not configured' }, { status: 500 })
  }

  const { messages, daemonUrl, userHandle } = await req.json()
  // userHandle can be: "$handcashHandle", "1BsvAddr...", or null

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 })
  }

  // Build conversation with system prompt + user identity
  let identityContext: string
  if (userHandle) {
    const isBsvAddress = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(userHandle)
    if (isBsvAddress) {
      identityContext = `\n\n## Current User\nUser connected via BRC-100 wallet. BSV address: ${userHandle}. They may have a $401 on-chain identity. Their wallet can sign transactions, create content attestations, and trade tokens. When acquiring content or making purchases, confirm first.`
    } else {
      identityContext = `\n\n## Current User\nYou are acting on behalf of $${userHandle} (HandCash). Address them by handle. Their wallet is connected — they can pay for content, trade tokens, and sign transactions. When acquiring content or making purchases, confirm with them first.`
    }
  } else {
    identityContext = `\n\n## Current User\nNo user is signed in. They can connect via BRC-100 wallet (MetaNet Desktop, Yours) for sovereign identity, or sign in with HandCash for OAuth. Suggest connecting to enable wallet features, content purchases, and $401 identity verification.`
  }

  const conversation = [
    { role: 'system', content: SYSTEM_PROMPT + identityContext },
    ...messages,
  ]

  // Agentic loop — up to 5 tool-call rounds
  const MAX_ROUNDS = 5
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch(XAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: conversation,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Grok API ${res.status}: ${errText}` }, { status: 502 })
    }

    const data = await res.json()
    const choice = data.choices?.[0]
    if (!choice) {
      return NextResponse.json({ error: 'No response from Grok' }, { status: 502 })
    }

    const msg = choice.message

    // If no tool calls, return the final response
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return NextResponse.json({
        response: msg.content,
        toolsUsed: round > 0,
        rounds: round,
      })
    }

    // Execute tool calls
    conversation.push(msg) // Add assistant message with tool calls

    for (const tc of msg.tool_calls) {
      const fnName = tc.function.name
      let fnArgs: Record<string, unknown> = {}
      try {
        fnArgs = JSON.parse(tc.function.arguments || '{}')
      } catch {
        fnArgs = {}
      }

      const result = await executeTool(fnName, fnArgs, daemonUrl || '')
      conversation.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      })
    }
  }

  // If we hit max rounds, return whatever we have
  return NextResponse.json({
    response: 'Agent reached maximum tool-call depth. Please try a simpler request.',
    toolsUsed: true,
    rounds: MAX_ROUNDS,
  })
}
