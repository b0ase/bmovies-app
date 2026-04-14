/**
 * NPGX Agent Runner — OpenAI-Compatible (Kimi K2, DeepSeek, Mistral, etc.)
 *
 * Lightweight agentic loop that works with any OpenAI-compatible API.
 * No Claude Agent SDK dependency — just function calling + tool execution.
 *
 * Architecture:
 *   1. Load soul → build system prompt
 *   2. Send messages + tools to the model
 *   3. If model returns tool_calls → execute each one → feed results back
 *   4. Repeat until model stops calling tools (or max iterations hit)
 *   5. Return final text output
 *
 * Supported providers (all OpenAI-compatible):
 *   - Kimi K2 (api.moonshot.ai)     — best tool use at low cost
 *   - DeepSeek V3.2 (api.deepseek.com) — cheapest capable model
 *   - Mistral (api.mistral.ai)      — strong all-round
 *   - OpenRouter (openrouter.ai)    — access all models with one key
 *   - OpenAI (api.openai.com)       — if you're feeling rich
 */

import OpenAI from 'openai'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import { loadSoul, SOUL_SLUGS } from '../souls'
import { buildAgentSystemPrompt } from './soul-to-prompt'
import { AGENT_TOOLS, executeTool, truncateToolResult } from './agent-tools'
import { strategyBriefing, createWallet, detectEconomicPersonality } from './'
import type { AgentRunResult } from './types'

// ── Provider Presets ────────────────────────────────────────────────────────

export interface ProviderConfig {
  name: string
  baseURL: string
  model: string
  apiKeyEnv: string
  maxTokens: number
}

export const PROVIDERS: Record<string, ProviderConfig> = {
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
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
  },
}

// ── Runner Config ───────────────────────────────────────────────────────────

export interface RunConfig {
  provider?: string          // kimi | deepseek | mistral | openrouter | openai
  model?: string             // override provider default model
  apiKey?: string            // override env var
  baseUrl?: string           // NPGX API base URL
  directive?: string         // what the agent should do
  maxIterations?: number     // max tool-call loops (default: 20)
  maxTokens?: number         // per response (default: provider default)
  temperature?: number       // 0-1 (default: 0.7)
  verbose?: boolean          // print each step
}

// ── Core Agent Loop ─────────────────────────────────────────────────────────

export async function runAgent(
  slug: string,
  config: RunConfig = {},
): Promise<AgentRunResult> {
  const {
    provider: providerName = 'kimi',
    model: modelOverride,
    apiKey: apiKeyOverride,
    baseUrl = process.env.NPGX_BASE_URL || 'http://localhost:3000',
    directive,
    maxIterations = 20,
    temperature = 0.7,
    verbose = true,
  } = config

  // Resolve provider
  const provider = PROVIDERS[providerName]
  if (!provider) {
    throw new Error(`Unknown provider: "${providerName}". Available: ${Object.keys(PROVIDERS).join(', ')}`)
  }

  const apiKey = apiKeyOverride || process.env[provider.apiKeyEnv]
  if (!apiKey) {
    throw new Error(
      `No API key for ${provider.name}. Set ${provider.apiKeyEnv} in .env.local or pass --api-key`,
    )
  }

  const model = modelOverride || provider.model
  const maxTokens = config.maxTokens || provider.maxTokens

  // Load soul
  const soul = await loadSoul(slug)
  const firstName = soul.identity.name.split(' ')[0]

  // Build system prompt with economy briefing
  const wallet = createWallet(slug, soul.tokenomics.token, 1000) // start with 1000 sats
  const systemPrompt = buildAgentSystemPrompt(soul, directive)
    + '\n\n' + strategyBriefing(soul, wallet)

  if (verbose) {
    const personality = detectEconomicPersonality(soul)
    console.log(`\n  ╔══════════════════════════════════════════════════════════════╗`)
    console.log(`  ║  ${soul.identity.name.padEnd(40)} ${soul.identity.token.padStart(10)}  ║`)
    console.log(`  ╠══════════════════════════════════════════════════════════════╣`)
    console.log(`  ║  Provider: ${provider.name.padEnd(20)} Model: ${model.padEnd(18)} ║`)
    console.log(`  ║  Personality: ${personality.padEnd(17)} Wallet: ${wallet.balance402} sats $402     ║`)
    console.log(`  ╚══════════════════════════════════════════════════════════════╝`)
    console.log()
  }

  // Init OpenAI client
  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseURL,
  })

  // Build initial messages
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: directive
        || `You are ${soul.identity.name}. Review your content library first (use npgx_list_content with slug "${slug}"). Then decide what to create next. Create at least 3 pieces of content that showcase your unique aesthetic. Explain your creative reasoning for each piece.`,
    },
  ]

  let totalToolCalls = 0
  let finalOutput = ''

  // ── Agentic Loop ────────────────────────────────────────────────────────
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    if (verbose) {
      console.log(`  [Turn ${iteration + 1}/${maxIterations}]`)
    }

    let response
    try {
      response = await client.chat.completions.create({
        model,
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        max_tokens: maxTokens,
        temperature,
      })
    } catch (err: any) {
      const status = err?.status || err?.response?.status
      if (status === 401) {
        throw new Error(`Authentication failed for ${provider.name}. Check your ${provider.apiKeyEnv}.`)
      }
      if (status === 402) {
        throw new Error(
          `${provider.name} account has insufficient balance. Top up at:\n` +
          `  DeepSeek: https://platform.deepseek.com/top_up\n` +
          `  Kimi:     https://platform.moonshot.ai\n` +
          `  OpenRouter: https://openrouter.ai/credits`,
        )
      }
      if (status === 429) {
        console.error(`  Rate limited by ${provider.name}. Waiting 10s...`)
        await new Promise(r => setTimeout(r, 10000))
        continue // retry this iteration
      }
      console.error(`  API Error (${status}): ${err.message}`)
      throw err
    }

    const choice = response.choices[0]
    if (!choice) {
      console.error('  No response from model')
      break
    }

    const message = choice.message

    // Append assistant response
    messages.push({
      role: 'assistant',
      content: message.content,
      tool_calls: message.tool_calls,
    } as ChatCompletionMessageParam)

    // Print any text output
    if (message.content) {
      if (verbose) {
        const preview = message.content.length > 200
          ? message.content.substring(0, 200) + '...'
          : message.content
        console.log(`  ${firstName}: ${preview}`)
      }
      finalOutput = message.content
    }

    // No tool calls → model is done
    if (!message.tool_calls || message.tool_calls.length === 0) {
      if (verbose) console.log(`  [Done — no more tool calls]`)
      break
    }

    // Execute tool calls
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue // skip custom tool calls
      const fnName = toolCall.function.name
      let fnArgs: Record<string, unknown> = {}
      try {
        fnArgs = JSON.parse(toolCall.function.arguments)
      } catch {
        fnArgs = {}
      }

      totalToolCalls++
      if (verbose) {
        const argsPreview = JSON.stringify(fnArgs).substring(0, 80)
        console.log(`  🔧 ${fnName}(${argsPreview})`)
      }

      const rawResult = await executeTool(fnName, fnArgs, baseUrl)
      const result = truncateToolResult(rawResult)

      if (verbose) {
        const resultPreview = result.length > 120
          ? result.substring(0, 120) + '...'
          : result
        console.log(`  ← ${resultPreview}`)
      }

      // Feed result back
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      } as ChatCompletionMessageParam)
    }
  }

  if (verbose) {
    console.log(`\n  ────────────────────────────────────────`)
    console.log(`  Tool calls: ${totalToolCalls}`)
    console.log(`  ────────────────────────────────────────\n`)
  }

  return {
    slug,
    characterName: soul.identity.name,
    decisions: [],
    output: finalOutput,
  }
}

// ── Run All 26 ──────────────────────────────────────────────────────────────

export async function runAllAgentsOpenAI(
  config: RunConfig = {},
): Promise<AgentRunResult[]> {
  const results: AgentRunResult[] = []

  for (const slug of SOUL_SLUGS) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`  Starting: ${slug}`)
    console.log('═'.repeat(60))

    try {
      const result = await runAgent(slug, config)
      results.push(result)
    } catch (err) {
      console.error(`  ${slug} failed:`, err)
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

// ── Portfolio Mode (cheap: photographer only) ───────────────────────────────

export async function runPortfolioBuild(
  slug: string,
  config: RunConfig = {},
): Promise<AgentRunResult> {
  const soul = await loadSoul(slug)

  // Simpler prompt — just generate images, no strategy needed
  const photographerPrompt = `You are a photographer for ${soul.identity.name} (${soul.identity.token}).

Her visual foundation:
"${soul.generation.promptPrefix}"

Always append: "${soul.generation.promptSuffix}"

Never include: "${soul.generation.negativePrompt}"

Your job: Create 5 portfolio images of ${soul.identity.name.split(' ')[0]} in different scenarios.
Pick scenarios that show RANGE — different locations, lighting, moods, outfits.
Use slug "${slug}" for every npgx_generate_image call.

Ideas that fit her ${soul.style.aesthetic} aesthetic:
1. Studio portrait with dramatic lighting
2. Urban/street scene
3. Performance/stage shot
4. Intimate close-up
5. Environmental/location portrait

Create ALL 5 images. After each, briefly describe what you shot and why.`

  return runAgent(slug, {
    ...config,
    directive: photographerPrompt,
    maxIterations: 12, // enough for 5 images + thinking
  })
}
