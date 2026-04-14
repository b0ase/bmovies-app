/**
 * POST /api/agent/run
 *
 * Trigger an NPGX character agent to run autonomously.
 * Used by OpenClaw phones and the web UI to activate agents.
 *
 * Body:
 *   slug: string          — Character slug (required)
 *   directive?: string     — What the agent should do
 *   maxTurns?: number     — Max turns (default 20)
 *   maxBudgetUsd?: number — Budget cap in USD (default 1.00)
 *   model?: string        — Model override
 *
 * Returns: streaming NDJSON of agent progress + final result
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadSoul, SOUL_SLUGS, type SoulSlug } from '@/lib/souls'
import { buildAgentSystemPrompt } from '@/lib/agents/soul-to-prompt'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, directive, maxTurns = 20, maxBudgetUsd = 1.0, model } = body

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    if (!SOUL_SLUGS.includes(slug as SoulSlug)) {
      return NextResponse.json({ error: `Unknown character: ${slug}` }, { status: 404 })
    }

    // Load soul and build system prompt
    const soul = await loadSoul(slug)
    const systemPrompt = buildAgentSystemPrompt(soul, directive)

    // Dynamic import — Agent SDK is heavy, only load when needed
    const { query } = await import('@anthropic-ai/claude-agent-sdk')

    const baseUrl = process.env.NPGX_BASE_URL || 'http://localhost:3000'

    // Stream results as NDJSON
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const agentPrompt = directive
            || `You are ${soul.identity.name}. Review your content library and autonomously decide what to create next. Check what you have, identify gaps, and produce new content that builds your brand.`

          controller.enqueue(encoder.encode(
            JSON.stringify({ type: 'start', slug, character: soul.identity.name, directive: directive || 'autonomous' }) + '\n'
          ))

          for await (const message of query({
            prompt: agentPrompt,
            options: {
              cwd: process.cwd(),
              model: model || 'claude-opus-4-6',
              systemPrompt,
              mcpServers: {
                npgx: {
                  command: 'npx',
                  args: ['tsx', 'mcp/npgx-server.ts'],
                  env: { NPGX_BASE_URL: baseUrl },
                },
              },
              maxTurns,
              maxBudgetUsd,
              allowedTools: ['Read', 'Glob', 'Grep'],
              permissionMode: 'acceptEdits' as const,
            },
          })) {
            if ('result' in message) {
              controller.enqueue(encoder.encode(
                JSON.stringify({ type: 'result', slug, output: message.result }) + '\n'
              ))
            } else if (message.type === 'system' && message.subtype === 'init') {
              controller.enqueue(encoder.encode(
                JSON.stringify({ type: 'session', sessionId: message.session_id }) + '\n'
              ))
            }
          }

          controller.enqueue(encoder.encode(
            JSON.stringify({ type: 'done', slug }) + '\n'
          ))
        } catch (err) {
          controller.enqueue(encoder.encode(
            JSON.stringify({ type: 'error', slug, error: err instanceof Error ? err.message : String(err) }) + '\n'
          ))
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent run failed' },
      { status: 500 },
    )
  }
}

// GET: list available agents
export async function GET() {
  const { readFileSync } = await import('fs')
  const { join } = await import('path')

  const agents = SOUL_SLUGS.map(slug => {
    try {
      const soul = JSON.parse(
        readFileSync(join(process.cwd(), 'public', 'souls', `${slug}.json`), 'utf-8')
      )
      return {
        slug,
        name: soul.identity.name,
        token: soul.identity.token,
        letter: soul.identity.letter,
        tagline: soul.identity.tagline,
        aesthetic: soul.style?.aesthetic,
        genre: soul.music?.genre,
        archetype: soul.personality?.archetype,
      }
    } catch {
      return { slug, name: slug, token: '?', letter: '?', tagline: '' }
    }
  })

  return NextResponse.json({ agents, count: agents.length })
}
