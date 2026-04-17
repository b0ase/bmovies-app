/**
 * bMovies x402 skill catalog.
 *
 * Each skill here is one agent-callable capability on the bMovies
 * platform. The catalog drives three surfaces:
 *
 *   1. `/.well-known/x402.json`  — agent discovery manifest (see the
 *      paired route.ts). Agents hit it once, then call any skill
 *      endpoint directly with a BSV micropayment header.
 *   2. `/skills`                 — human-browsable catalog UI.
 *   3. `mcp/bmovies-server.ts`   — MCP tool surface for Claude Code
 *      and other MCP-speaking clients.
 *
 * Pricing units are satoshis. Prices here are *template values* —
 * tune them against real upstream costs before production billing.
 * The endpoint paths are already live where noted; anything marked
 * with TODO inside a skill is scaffolding to flesh out later.
 *
 * All pay-to addresses route through BMOVIES_BSV_PAY_ADDRESS. Set
 * in .env.local; default is a placeholder that will 402-fail safely
 * so an unconfigured environment never accidentally accepts real
 * sats.
 */

// ── Types ────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'writing' | 'visual' | 'audio' | 'video' | 'production' | 'query';
  endpoint: string;
  method: 'GET' | 'POST';
  price: SkillPrice;
  params: SkillParam[];
  tags: string[];
  /** Requires a signed-in bMovies account before the call is served. */
  authRequired?: boolean;
  /** Rate-limit hint for clients. Not enforced here. */
  rateLimit?: string;
  /** Inline example of a successful call. */
  example?: string;
  /** True when the endpoint is wired and billable today. False = template. */
  live: boolean;
}

export interface SkillPrice {
  amountSats: number;
  currency: 'BSV';
  network: 'bsv';
  usdEquivalent: string;
  unit: string;
}

export interface SkillParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  description: string;
  enum?: string[];
  default?: string | number | boolean;
}

export interface X402Manifest {
  x402Version: 1;
  provider: {
    name: string;
    description: string;
    url: string;
    logo: string;
    network: 'bsv';
    payTo: string;
    agentDiscovery: string;
    documentation: string;
  };
  skills: Skill[];
  tiers: { tier: string; usd: number; description: string }[];
  meta: {
    totalSkills: number;
    liveSkills: number;
    templateSkills: number;
    freeSkills: number;
    generatedAt: string;
  };
}

// ── Configuration ────────────────────────────────────────────────

const PAY_ADDRESS =
  process.env.BMOVIES_BSV_PAY_ADDRESS ||
  '1bMoviesPayAddressNotConfigured';
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://bmovies.online';

// Soft sats→USD at ~$0.0005/sat. Display-only; clients should do
// their own conversion against the current BSV price.
function satsToUsd(sats: number): string {
  return `$${(sats * 0.0005).toFixed(4)}`;
}

function price(sats: number, unit: string): SkillPrice {
  return {
    amountSats: sats,
    currency: 'BSV',
    network: 'bsv',
    usdEquivalent: satsToUsd(sats),
    unit,
  };
}

// ── Tier reference (for agents asking "how do I commission?") ────

const TIERS = [
  { tier: 'pitch',   usd: 0.99,  description: 'Logline, synopsis, and key art. Delivered in ~90 seconds.' },
  { tier: 'trailer', usd: 9.99,  description: '32-second AI trailer with storyboard, poster, treatment, and video clips.' },
  { tier: 'short',   usd: 99,    description: '64-second short film with full crew credits.' },
  { tier: 'feature', usd: 999,   description: 'Full-length feature with an 8-specialist AI crew.' },
];

// ── Skill catalog ────────────────────────────────────────────────
//
// Template skills. Flesh out endpoint wiring + pricing before
// production. Each skill's `live: false` flag tells the manifest
// consumer whether billing should be enforced. When an endpoint is
// wired and the pricing is real, flip to `live: true`.

export const SKILLS: Skill[] = [
  // ── Writing ───────────────────────────────────────────────────
  {
    id: 'refine-idea',
    name: 'Refine Idea',
    description:
      'Turn a one-sentence pitch into a polished logline, synopsis, and suggested commission tier.',
    category: 'writing',
    endpoint: '/api/refine',
    method: 'POST',
    price: price(50, 'per refine call'),
    params: [
      { name: 'idea', type: 'string', required: true, description: 'Rough one-liner, 8+ chars.' },
    ],
    tags: ['logline', 'writer', 'pitch', 'grok'],
    example: '{ "idea": "A retired cartographer finds a map of a city that never existed." }',
    live: true,
  },
  {
    id: 'writers-room-chat',
    name: 'Writers-Room Chat',
    description:
      'Multi-turn creative development chat. Returns the next assistant reply given a message history.',
    category: 'writing',
    endpoint: '/api/commission-chat',
    method: 'POST',
    price: price(80, 'per assistant reply'),
    params: [
      { name: 'messages', type: 'object', required: true, description: 'Array of { role: user|assistant, content: string }.' },
    ],
    tags: ['chat', 'writer', 'grok'],
    authRequired: true,
    rateLimit: '32 turns per conversation',
    live: true,
  },
  {
    id: 'generate-treatment',
    name: 'Generate Treatment',
    description:
      'Full cinematic treatment (800-1200 words) from a title + synopsis. Third-person present tense.',
    category: 'writing',
    endpoint: '/api/skills/generate-treatment',
    method: 'POST',
    price: price(120, 'per treatment'),
    params: [
      { name: 'title',    type: 'string', required: true,  description: 'Film title.' },
      { name: 'synopsis', type: 'string', required: true,  description: 'Logline or short synopsis seed.' },
      { name: 'tone',     type: 'string', required: false, description: 'Optional tone tag (e.g. "neo-noir").' },
    ],
    tags: ['writer', 'treatment'],
    live: false,  // TODO: wire /api/skills/generate-treatment
  },
  {
    id: 'generate-screenplay',
    name: 'Generate Screenplay',
    description:
      'Screenplay-formatted scenes with dialogue, slug lines, and action. Output as plaintext.',
    category: 'writing',
    endpoint: '/api/skills/generate-screenplay',
    method: 'POST',
    price: price(400, 'per screenplay'),
    params: [
      { name: 'treatment', type: 'string', required: true,  description: 'Treatment to script from.' },
      { name: 'scenes',    type: 'number', required: false, description: 'Number of scenes to output.', default: 6 },
    ],
    tags: ['writer', 'screenplay'],
    live: false,  // TODO
  },

  // ── Visual ────────────────────────────────────────────────────
  {
    id: 'generate-poster',
    name: 'Generate Poster',
    description:
      'Cinematic movie poster for a title + synopsis. Portrait 2:3, dramatic lighting.',
    category: 'visual',
    endpoint: '/api/skills/generate-poster',
    method: 'POST',
    price: price(500, 'per poster'),
    params: [
      { name: 'title',    type: 'string', required: true,  description: 'Film title.' },
      { name: 'synopsis', type: 'string', required: true,  description: 'Synopsis for creative context.' },
      { name: 'palette',  type: 'string', required: false, description: 'Optional palette hint (e.g. "teal and amber").' },
    ],
    tags: ['storyboard', 'poster', 'grok-imagine-image-pro'],
    live: false,  // TODO: wire to existing trailer/generate.ts poster step
  },
  {
    id: 'generate-storyboard-frame',
    name: 'Generate Storyboard Frame',
    description:
      'Single cinematic frame generated from a 40-80 word prompt. Used to build multi-frame storyboards.',
    category: 'visual',
    endpoint: '/api/skills/generate-storyboard-frame',
    method: 'POST',
    price: price(200, 'per frame'),
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Cinematic visual prompt, 40-80 words.' },
    ],
    tags: ['storyboard', 'frame', 'grok-imagine-image'],
    live: false,  // TODO
  },

  // ── Audio ─────────────────────────────────────────────────────
  {
    id: 'generate-score-cue',
    name: 'Generate Score Cue',
    description:
      'One ~30-second music cue generated from a theme brief. Returns an audio URL.',
    category: 'audio',
    endpoint: '/api/skills/generate-score-cue',
    method: 'POST',
    price: price(800, 'per cue'),
    params: [
      { name: 'brief', type: 'string', required: true,  description: 'Composer brief (mood, tempo, key, instruments).' },
      { name: 'bpm',   type: 'number', required: false, description: 'Override BPM if the brief isn\'t specific.' },
    ],
    tags: ['composer', 'score', 'audio'],
    live: false,  // TODO
  },

  // ── Video ─────────────────────────────────────────────────────
  {
    id: 'generate-clip',
    name: 'Generate Video Clip',
    description:
      '~8-second cinematic video clip generated from a prompt. Used for trailer and short-film pipelines.',
    category: 'video',
    endpoint: '/api/skills/generate-clip',
    method: 'POST',
    price: price(1500, 'per 8s clip'),
    params: [
      { name: 'prompt',          type: 'string', required: true,  description: 'Motion-aware video prompt, 40-80 words.' },
      { name: 'referenceImages', type: 'object', required: false, description: 'Array of up to 7 image URLs for reference-to-video conditioning.' },
    ],
    tags: ['editor', 'video', 'grok-imagine-video'],
    live: false,  // TODO
  },

  // ── Production (tier commissions) ─────────────────────────────
  {
    id: 'commission-pitch',
    name: 'Commission Pitch',
    description:
      'Kick off a $0.99 pitch production. Delivers logline + synopsis + key art as a BSV-21 royalty token.',
    category: 'production',
    endpoint: '/api/checkout',
    method: 'POST',
    price: price(1_980_000, 'per pitch (≈$0.99)'),
    params: [
      { name: 'title',    type: 'string', required: true, description: 'Working title.' },
      { name: 'synopsis', type: 'string', required: true, description: 'Seed synopsis or rough idea.' },
      { name: 'tier',     type: 'string', required: true, description: 'Must equal "pitch".', enum: ['pitch'] },
      { name: 'email',    type: 'string', required: true, description: 'Receipt email.' },
    ],
    tags: ['commission', 'pitch', 'stripe-or-bsv'],
    authRequired: true,
    live: true,
  },
  {
    id: 'commission-trailer',
    name: 'Commission Trailer',
    description:
      'Kick off a $9.99 trailer production. Full 8-agent crew delivers a 32-second teaser with score.',
    category: 'production',
    endpoint: '/api/checkout',
    method: 'POST',
    price: price(19_980_000, 'per trailer (≈$9.99)'),
    params: [
      { name: 'title',    type: 'string', required: true, description: 'Working title.' },
      { name: 'synopsis', type: 'string', required: true, description: 'Seed synopsis.' },
      { name: 'tier',     type: 'string', required: true, description: 'Must equal "trailer".', enum: ['trailer'] },
      { name: 'email',    type: 'string', required: true, description: 'Receipt email.' },
    ],
    tags: ['commission', 'trailer'],
    authRequired: true,
    live: true,
  },

  // ── Query (read-only, cheap) ──────────────────────────────────
  {
    id: 'list-studios',
    name: 'List Studios',
    description:
      'Returns all founding studios on the platform with their logos, aesthetics, and slugs.',
    category: 'query',
    endpoint: '/api/studios',
    method: 'GET',
    price: price(0, 'free'),
    params: [],
    tags: ['read', 'studios'],
    live: false,  // TODO: add /api/studios
  },
  {
    id: 'get-offer',
    name: 'Get Offer',
    description:
      'Fetch an offer by id — title, tier, status, token_ticker, artifacts count.',
    category: 'query',
    endpoint: '/api/offers/:id',
    method: 'GET',
    price: price(0, 'free'),
    params: [
      { name: 'id', type: 'string', required: true, description: 'Offer id (pitch-… / trailer-… / short-… / feature-…).' },
    ],
    tags: ['read', 'offer'],
    live: false,  // TODO: add /api/offers/[id]
  },
];

// ── Manifest builder ─────────────────────────────────────────────

export function buildManifest(): X402Manifest {
  const live = SKILLS.filter((s) => s.live).length;
  const free = SKILLS.filter((s) => s.price.amountSats === 0).length;

  return {
    x402Version: 1,
    provider: {
      name: 'bMovies',
      description:
        'Autonomous AI film studio on Bitcoin SV. Commission AI-produced films at four tiers and own 99% of the royalty shares.',
      url: BASE_URL,
      logo: `${BASE_URL}/bmovies-logo.svg`,
      network: 'bsv',
      payTo: PAY_ADDRESS,
      agentDiscovery: `${BASE_URL}/.well-known/x402.json`,
      documentation: `${BASE_URL}/skills`,
    },
    skills: SKILLS.map((s) => ({
      ...s,
      endpoint: s.endpoint.startsWith('http') ? s.endpoint : `${BASE_URL}${s.endpoint}`,
    })),
    tiers: TIERS,
    meta: {
      totalSkills: SKILLS.length,
      liveSkills: live,
      templateSkills: SKILLS.length - live,
      freeSkills: free,
      generatedAt: new Date().toISOString(),
    },
  };
}

export function getSkillById(id: string): Skill | null {
  return SKILLS.find((s) => s.id === id) ?? null;
}
