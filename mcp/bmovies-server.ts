#!/usr/bin/env npx tsx
/**
 * bMovies MCP Server
 *
 * Exposes the bMovies platform as Model Context Protocol tools so
 * Claude Code, Cursor, and any other MCP-speaking client can drive
 * the production pipeline conversationally.
 *
 * Tools (v1 — flesh out before production):
 *   bmovies_list_studios       — List founding studios
 *   bmovies_list_agents        — List active agents (optionally by studio)
 *   bmovies_list_skills        — Dump the x402 skill catalog
 *   bmovies_refine_idea        — Refine a one-liner into title/ticker/synopsis
 *   bmovies_writers_room       — One-shot writers-room chat turn
 *   bmovies_get_offer          — Look up an offer by id
 *   bmovies_list_artifacts     — List artifacts attached to an offer
 *   bmovies_open_film          — Print the film page URL for an offer
 *
 * Setup (local dev):
 *   pnpm add -D @modelcontextprotocol/sdk zod
 *   # Register in .mcp.json (see project root)
 *   # Restart your MCP client (Claude Code: Cmd-shift-P → Reload)
 *
 * Environment:
 *   BMOVIES_BASE_URL   default: http://localhost:3100
 *   BMOVIES_SERVICE_JWT  optional Supabase service JWT for privileged tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = process.env.BMOVIES_BASE_URL || 'http://localhost:3100';
const SERVICE_JWT = process.env.BMOVIES_SERVICE_JWT || '';

// ── Shared helpers ───────────────────────────────────────────────

async function http(path: string, init?: RequestInit) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(SERVICE_JWT ? { Authorization: `Bearer ${SERVICE_JWT}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`bMovies API ${res.status} (${path}): ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function ok(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

// ── Server setup ─────────────────────────────────────────────────

const server = new McpServer({
  name: 'bmovies',
  version: '0.1.0',
});

// ── Query tools ──────────────────────────────────────────────────

server.tool(
  'bmovies_list_skills',
  'Return the full agent-callable skill catalog (same content as /.well-known/x402.json).',
  {},
  async () => {
    const manifest = await http('/.well-known/x402.json');
    return ok({
      provider: manifest.provider,
      meta: manifest.meta,
      skills: manifest.skills.map((s: { id: string; name: string; method: string; endpoint: string; price: { amountSats: number; usdEquivalent: string }; live: boolean }) => ({
        id: s.id,
        name: s.name,
        method: s.method,
        endpoint: s.endpoint,
        sats: s.price.amountSats,
        usd: s.price.usdEquivalent,
        live: s.live,
      })),
    });
  },
);

server.tool(
  'bmovies_list_studios',
  'List all founding studios on the platform. Returns id, name, aesthetic.',
  {},
  async () => {
    // TODO: back this with /api/studios when the route exists.
    // Placeholder response so the tool is callable today.
    return ok({
      note: 'Studios endpoint not yet wired — template response.',
      studios: [
        { id: 'bolt-disney',    name: 'Bolt Disney',    aesthetic: 'Family-adventure with a mischievous streak.' },
        { id: 'clanker-bros',   name: 'Clanker Bros',   aesthetic: 'Hard-boiled, grit, silhouette lighting.' },
        { id: 'dreamforge',     name: 'DreamForge',     aesthetic: 'Ghibli-adjacent warmth, hand-drawn worlds.' },
        { id: 'neuralscope',    name: 'NeuralScope',    aesthetic: 'Cerebral sci-fi. Glacial pace, big ideas.' },
        { id: 'paramountal',    name: 'Paramountal',    aesthetic: 'Classical Hollywood sheen, tight three-acts.' },
        { id: '21st-century-bot', name: '21st Century Bot', aesthetic: 'Loud, muscular, blockbuster instincts.' },
      ],
    });
  },
);

server.tool(
  'bmovies_list_agents',
  'List agents on the platform, optionally filtered by studio.',
  {
    studio: z
      .string()
      .optional()
      .describe('Optional studio id to filter by (e.g. "bolt-disney").'),
  },
  async ({ studio }) => {
    // TODO: expose a real /api/agents endpoint. For now, query the
    // Supabase REST API through the anon key. This call is read-only
    // and respects RLS; no service JWT required.
    const url = studio
      ? `/api/agents?studio=${encodeURIComponent(studio)}`
      : '/api/agents';
    try {
      const data = await http(url);
      return ok(data);
    } catch (err) {
      return ok({
        note: 'Agents endpoint not yet wired — browse https://bmovies.online/agents.html in the meantime.',
        error: (err as Error).message,
      });
    }
  },
);

server.tool(
  'bmovies_get_offer',
  'Fetch an offer by id. Returns title, tier, status, token_ticker.',
  {
    id: z.string().describe('Offer id (pitch-… / trailer-… / short-… / feature-…).'),
  },
  async ({ id }) => {
    const data = await http(`/api/offers/${encodeURIComponent(id)}`).catch((err) => ({
      note: 'GET /api/offers/:id not yet wired — see TODO in x402-skills catalog.',
      error: (err as Error).message,
      fallback: `https://bmovies.online/film.html?id=${encodeURIComponent(id)}`,
    }));
    return ok(data);
  },
);

server.tool(
  'bmovies_list_artifacts',
  'List artifacts for an offer. Returns kind, role, step_id, url for every bct_artifacts row.',
  {
    offerId: z.string().describe('Offer id to fetch artifacts for.'),
  },
  async ({ offerId }) => {
    const data = await http(`/api/offers/${encodeURIComponent(offerId)}/artifacts`).catch(
      (err) => ({
        note: 'Artifacts endpoint not yet wired — use Supabase directly for now.',
        error: (err as Error).message,
      }),
    );
    return ok(data);
  },
);

// ── Writing tools ────────────────────────────────────────────────

server.tool(
  'bmovies_refine_idea',
  'Turn a one-sentence pitch into a polished title, ticker, synopsis, and suggested tier via Grok.',
  {
    idea: z.string().min(8).describe('Rough one-liner film idea, 8+ characters.'),
  },
  async ({ idea }) => {
    const data = await http('/api/refine', {
      method: 'POST',
      body: JSON.stringify({ idea }),
    });
    return ok(data);
  },
);

server.tool(
  'bmovies_writers_room',
  'Send a message to the bMovies writers-room chat. Requires a Supabase JWT in BMOVIES_SERVICE_JWT — the endpoint is gated.',
  {
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        }),
      )
      .describe('Full conversation history; the assistant replies to the last user turn.'),
  },
  async ({ messages }) => {
    if (!SERVICE_JWT) {
      return ok({
        note: 'Writers-room chat is gated. Set BMOVIES_SERVICE_JWT with a Supabase access token to proxy a signed-in user.',
      });
    }
    const data = await http('/api/commission-chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
    return ok(data);
  },
);

// ── Navigation tool ──────────────────────────────────────────────

server.tool(
  'bmovies_open_film',
  'Return the public film page URL for an offer id.',
  {
    id: z.string().describe('Offer id.'),
  },
  async ({ id }) => {
    return ok({
      id,
      film: `${BASE_URL.replace(/^http:\/\/localhost:\d+/, 'https://bmovies.online')}/film.html?id=${encodeURIComponent(id)}`,
      production: `${BASE_URL.replace(/^http:\/\/localhost:\d+/, 'https://bmovies.online')}/production.html?id=${encodeURIComponent(id)}`,
      offer: `${BASE_URL.replace(/^http:\/\/localhost:\d+/, 'https://bmovies.online')}/offer.html?id=${encodeURIComponent(id)}`,
    });
  },
);

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[bmovies-mcp] connected · BASE_URL=${BASE_URL}`);
}

main().catch((err) => {
  console.error('[bmovies-mcp] fatal:', err);
  process.exit(1);
});
