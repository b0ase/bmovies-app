/**
 * NPGX Swarm API — Control the autonomous agent colony
 *
 * GET  /api/agent/swarm          → Colony status (JSON)
 * GET  /api/agent/swarm?stream   → SSE event stream
 * POST /api/agent/swarm          → Start/stop/fund/run-once
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSwarm, resetSwarm, type SwarmConfig, type SwarmEvent } from '@/lib/agents/autonomous'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for long-running swarm operations

// ── GET: Status or SSE Stream ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const stream = req.nextUrl.searchParams.has('stream')
  const slug = req.nextUrl.searchParams.get('slug')

  if (stream) {
    return streamEvents()
  }

  const swarm = getSwarm()

  // Single agent status
  if (slug) {
    const agent = swarm.getAgent(slug)
    if (!agent) {
      return NextResponse.json({ error: `Agent ${slug} not found` }, { status: 404 })
    }
    return NextResponse.json(agent)
  }

  // Full colony status
  return NextResponse.json(swarm.getStatus())
}

// ── POST: Commands ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, ...params } = body as {
    action: 'start' | 'stop' | 'reset' | 'run-once' | 'fund' | 'status' | 'dashboard'
    slug?: string
    amount?: number
    config?: Partial<SwarmConfig>
  }

  switch (action) {
    case 'start': {
      const swarm = getSwarm(params.config)
      // Start in background — don't await
      swarm.start().catch(err => console.error('Swarm error:', err))
      return NextResponse.json({
        status: 'started',
        message: 'Autonomous swarm is running',
      })
    }

    case 'stop': {
      const swarm = getSwarm()
      swarm.stop()
      return NextResponse.json({
        status: 'stopped',
        colony: swarm.getStatus(),
      })
    }

    case 'reset': {
      resetSwarm()
      return NextResponse.json({ status: 'reset', message: 'Swarm destroyed and reset' })
    }

    case 'run-once': {
      const swarm = getSwarm(params.config)
      const result = await swarm.runOnce()
      return NextResponse.json({ status: 'completed', colony: result })
    }

    case 'fund': {
      const { slug, amount } = params
      if (!slug || !amount) {
        return NextResponse.json(
          { error: 'Missing slug or amount' },
          { status: 400 },
        )
      }
      const swarm = getSwarm()
      const success = swarm.fundAgent(slug, amount)
      if (!success) {
        return NextResponse.json({ error: `Agent ${slug} not found` }, { status: 404 })
      }
      return NextResponse.json({
        status: 'funded',
        slug,
        amount,
        agent: swarm.getAgent(slug),
      })
    }

    case 'dashboard': {
      const swarm = getSwarm()
      return NextResponse.json({
        dashboard: swarm.dashboard(),
        colony: swarm.getStatus(),
      })
    }

    default:
      return NextResponse.json(
        {
          error: `Unknown action: ${action}`,
          available: ['start', 'stop', 'reset', 'run-once', 'fund', 'dashboard'],
        },
        { status: 400 },
      )
  }
}

// ── SSE Stream ──────────────────────────────────────────────────────────────

function streamEvents() {
  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const swarm = getSwarm()

      // Send initial status
      const status = swarm.getStatus()
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'colony:status', data: status })}\n\n`),
      )

      // Subscribe to events
      unsubscribe = swarm.on((event: SwarmEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          )
        } catch {
          // Stream closed
          unsubscribe?.()
        }
      })
    },
    cancel() {
      unsubscribe?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
