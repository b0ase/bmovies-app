#!/usr/bin/env npx tsx
/**
 * bMovies CLI
 *
 * Command-line companion for the bMovies platform. Mirrors the MCP
 * tool surface (mcp/bmovies-server.ts) in a shell-friendly shape so
 * operators, agents, and CI scripts can drive the same endpoints
 * without booting an MCP client.
 *
 * Usage:
 *   bmovies                         Show this help
 *   bmovies skills                  Dump the skill catalog
 *   bmovies studios                 List founding studios
 *   bmovies agents [--studio <id>]  List agents (optionally filter)
 *   bmovies refine "<idea>"         Refine a one-liner into title + synopsis
 *   bmovies offer <offer-id>        Print offer details
 *   bmovies artifacts <offer-id>    List artifacts on an offer
 *   bmovies open <offer-id>         Print film/offer/production URLs
 *   bmovies chat                    Open a live writers-room chat (reads stdin)
 *   bmovies health                  Ping the platform
 *
 * Environment:
 *   BMOVIES_BASE_URL   default: http://localhost:3100 (dev) — set to
 *                      https://bmovies.online to drive production
 *   BMOVIES_SERVICE_JWT  optional Supabase JWT for gated calls
 *
 * Template status: query + refine are wired and working. Chat, offer,
 * artifacts depend on endpoints that are still TODO — see comments
 * inside each command. Flesh out before submission.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = typeof import.meta.dirname === 'string'
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BASE_URL = process.env.BMOVIES_BASE_URL || 'http://localhost:3100';
const SERVICE_JWT = process.env.BMOVIES_SERVICE_JWT || '';

const args = process.argv.slice(2);
const cmd = args[0];

// ── Helpers ──────────────────────────────────────────────────────

function die(msg: string, exitCode = 1): never {
  console.error(`\x1b[31merror:\x1b[0m ${msg}`);
  process.exit(exitCode);
}

function pretty(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

async function http<T = unknown>(path: string, init?: RequestInit): Promise<T> {
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
    die(`HTTP ${res.status} (${path})\n${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

function flag(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

// ── Commands ─────────────────────────────────────────────────────

const COMMANDS: Record<string, () => Promise<void>> = {
  help: async () => {
    const src = readFileSync(join(ROOT, 'bin/bmovies.ts'), 'utf8');
    // Extract the "Usage:" block from the header comment.
    const m = src.match(/Usage:[\s\S]+?Environment:/);
    console.log(m ? m[0] : 'see bin/bmovies.ts');
  },

  health: async () => {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/.well-known/x402.json`);
      const ms = Date.now() - t0;
      console.log(res.ok ? `\x1b[32mOK\x1b[0m ${BASE_URL} ${res.status} ${ms}ms` : `${res.status} ${ms}ms`);
    } catch (err) {
      die(`${BASE_URL} unreachable: ${(err as Error).message}`);
    }
  },

  skills: async () => {
    const manifest = await http<{ provider: { name: string }; meta: { totalSkills: number; liveSkills: number }; skills: Array<{ id: string; name: string; method: string; endpoint: string; price: { amountSats: number; usdEquivalent: string }; live: boolean }> }>('/.well-known/x402.json');
    console.log(`\n\x1b[1m${manifest.provider.name}\x1b[0m — ${manifest.meta.totalSkills} skills (${manifest.meta.liveSkills} live)\n`);
    for (const s of manifest.skills) {
      const live = s.live ? '\x1b[32m●\x1b[0m' : '\x1b[33m○\x1b[0m';
      const price = s.price.amountSats === 0
        ? '\x1b[32mfree\x1b[0m'
        : `\x1b[36m${s.price.amountSats.toLocaleString()} sat\x1b[0m`;
      console.log(`${live} \x1b[1m${s.name.padEnd(28)}\x1b[0m ${s.method.padEnd(4)} ${s.endpoint.replace(BASE_URL, '')}  ${price}  ${s.price.usdEquivalent}`);
    }
    console.log('');
  },

  studios: async () => {
    // TODO: wire /api/studios on the bMovies backend.
    console.log(pretty({
      note: 'GET /api/studios not yet wired — showing hardcoded founding roster.',
      studios: [
        { id: 'bolt-disney',       name: 'Bolt Disney',       aesthetic: 'Family-adventure with a mischievous streak.' },
        { id: 'clanker-bros',      name: 'Clanker Bros',      aesthetic: 'Hard-boiled, grit, silhouette lighting.' },
        { id: 'dreamforge',        name: 'DreamForge',        aesthetic: 'Ghibli-adjacent warmth, hand-drawn worlds.' },
        { id: 'neuralscope',       name: 'NeuralScope',       aesthetic: 'Cerebral sci-fi. Glacial pace, big ideas.' },
        { id: 'paramountal',       name: 'Paramountal',       aesthetic: 'Classical Hollywood sheen, tight three-acts.' },
        { id: '21st-century-bot',  name: '21st Century Bot',  aesthetic: 'Loud, muscular, blockbuster instincts.' },
      ],
    }));
  },

  agents: async () => {
    const studio = flag('--studio');
    const path = studio ? `/api/agents?studio=${encodeURIComponent(studio)}` : '/api/agents';
    try {
      const data = await http(path);
      console.log(pretty(data));
    } catch {
      console.log(pretty({
        note: 'GET /api/agents not yet wired — use /agents.html in the browser.',
        studio: studio || 'all',
      }));
    }
  },

  refine: async () => {
    const idea = args.slice(1).join(' ').trim();
    if (idea.length < 8) die('usage: bmovies refine "<idea>" (at least 8 chars)');
    const data = await http<{ title: string; ticker: string; synopsis: string; suggestedTier: string }>(
      '/api/refine',
      { method: 'POST', body: JSON.stringify({ idea }) },
    );
    console.log(`\n  \x1b[1m${data.title}\x1b[0m  \x1b[31m$${data.ticker}\x1b[0m  \x1b[90m(${data.suggestedTier})\x1b[0m\n`);
    console.log(`  ${data.synopsis}\n`);
  },

  offer: async () => {
    const id = args[1];
    if (!id) die('usage: bmovies offer <offer-id>');
    const data = await http(`/api/offers/${encodeURIComponent(id)}`).catch((err) => ({
      note: 'GET /api/offers/:id not yet wired.',
      error: (err as Error).message,
    }));
    console.log(pretty(data));
  },

  artifacts: async () => {
    const id = args[1];
    if (!id) die('usage: bmovies artifacts <offer-id>');
    const data = await http(`/api/offers/${encodeURIComponent(id)}/artifacts`).catch((err) => ({
      note: 'GET /api/offers/:id/artifacts not yet wired.',
      error: (err as Error).message,
    }));
    console.log(pretty(data));
  },

  open: async () => {
    const id = args[1];
    if (!id) die('usage: bmovies open <offer-id>');
    const base = BASE_URL.includes('localhost') ? 'https://bmovies.online' : BASE_URL;
    console.log(`\n  film:        ${base}/film.html?id=${encodeURIComponent(id)}`);
    console.log(`  offer:       ${base}/offer.html?id=${encodeURIComponent(id)}`);
    console.log(`  production:  ${base}/production.html?id=${encodeURIComponent(id)}\n`);
  },

  chat: async () => {
    if (!SERVICE_JWT) {
      die('bmovies chat needs BMOVIES_SERVICE_JWT (Supabase access token) in env.');
    }
    // TODO: wire a proper readline REPL. Template stub reads one
    // message from stdin and prints the response.
    const msg = (args.slice(1).join(' ') || '').trim();
    if (!msg) die('usage: bmovies chat "<message>"');
    const data = await http<{ reply: string }>('/api/commission-chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: msg }] }),
    });
    console.log(`\n${data.reply}\n`);
  },
};

// ── Dispatch ─────────────────────────────────────────────────────

(async () => {
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    await COMMANDS.help();
    return;
  }
  const handler = COMMANDS[cmd];
  if (!handler) die(`unknown command: ${cmd}\n\nrun "bmovies help" for usage`);
  await handler();
})().catch((err) => {
  die((err as Error).message || String(err));
});
