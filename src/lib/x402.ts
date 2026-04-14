/**
 * x402 Protocol Implementation for NPGX
 *
 * Implements the HTTP 402 Payment Required standard for BSV micropayments.
 * Compatible with x402agency.com agent discovery and the open x402 spec.
 *
 * Flow:
 *   1. Agent/client GETs /.well-known/x402.json → discovers all skills + pricing
 *   2. Agent calls a skill endpoint without payment → gets 402 + PaymentRequired
 *   3. Agent signs a BSV micropayment → retries with X-PAYMENT header
 *   4. Server verifies payment → returns resource + X-PAYMENT-RESPONSE header
 *
 * BSV adaptation of the x402 spec (coinbase/x402):
 *   - Network: "bsv" instead of EVM chains
 *   - Asset: satoshis (native BSV), not ERC-20 stablecoins
 *   - Payment: raw BSV transaction hex, not EIP-3009 authorization
 *
 * Reference: https://www.x402.org / https://x402agency.com
 */

import { PRICING, type PriceTier, REVENUE_SPLIT } from './pricing'
import { NPGX_ROSTER } from './npgx-roster'

// ── Types ─────────────────────────────────────────────────────────────

export interface X402Skill {
  id: string
  name: string
  description: string
  category: string
  endpoint: string
  method: 'POST' | 'GET'
  price: X402Price
  params: X402Param[]
  tags: string[]
  rateLimit?: string
  example?: string
}

export interface X402Price {
  amount: number          // satoshis
  currency: 'BSV'
  network: 'bsv'
  usdEquivalent: string   // approximate USD
  unit: string            // "per image", "per clip", etc.
}

export interface X402Param {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object'
  required: boolean
  description: string
  enum?: string[]
  default?: string | number | boolean
}

export interface X402PaymentRequired {
  x402Version: 1
  accepts: X402PaymentOption[]
  error: string
  skill: string
  description: string
}

export interface X402PaymentOption {
  scheme: 'exact'
  network: 'bsv'
  maxAmountRequired: string   // satoshis as string
  resource: string            // endpoint path
  description: string
  payTo: string               // BSV address
  asset: 'BSV'
  maxTimeoutSeconds: number
}

export interface X402PaymentResponse {
  success: boolean
  transaction?: string        // txid
  network: 'bsv'
  payer?: string              // sender address
  errorReason?: string | null
}

export interface X402Manifest {
  x402Version: 1
  provider: {
    name: string
    description: string
    url: string
    logo: string
    network: 'bsv'
    payTo: string
    agentDiscovery: string
    documentation: string
  }
  skills: X402Skill[]
  characters: { slug: string; name: string; token: string }[]
  revenueSplit: typeof REVENUE_SPLIT
  meta: {
    totalSkills: number
    freeSkills: number
    paidSkills: number
    generatedAt: string
  }
}

// ── Configuration ─────────────────────────────────────────────────────

const NPGX_PAY_ADDRESS = process.env.NPGX_BSV_ADDRESS || '1NPGXpay...'  // Set in .env
const NPGX_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.npgx.website'

// ── Skill definitions ─────────────────────────────────────────────────

const slugParam: X402Param = {
  name: 'slug',
  type: 'string',
  required: false,
  description: 'Character slug (e.g. "aria-voidstrike"). See /api/characters for full roster.',
  enum: NPGX_ROSTER.map(c => c.slug),
}

function satsToUsd(sats: number): string {
  return (sats * 0.0005).toFixed(4)
}

function makePrice(tier: PriceTier): X402Price {
  return {
    amount: tier.costSats,
    currency: 'BSV',
    network: 'bsv',
    usdEquivalent: `$${satsToUsd(tier.costSats)}`,
    unit: tier.description,
  }
}

export const X402_SKILLS: X402Skill[] = [
  {
    id: 'generate-image',
    name: 'Generate Image',
    description: 'Soul-aware character image generation. 4-provider cascade: Atlas Cloud ($0.01) → Grok ($0.07) → Stability ($0.04) → Replicate ($0.003). Returns image URL + SHA-256 content hash for on-chain attestation.',
    category: 'image',
    endpoint: '/api/generate-image-npgx',
    method: 'POST',
    price: makePrice(PRICING['image-gen']),
    params: [
      { ...slugParam, required: true },
      { name: 'prompt', type: 'string', required: false, description: 'Custom prompt (overrides soul template)' },
      { name: 'additionalPrompt', type: 'string', required: false, description: 'Additional prompt layered with soul prefix' },
      { name: 'width', type: 'number', required: false, description: 'Image width in pixels', default: 1024 },
      { name: 'height', type: 'number', required: false, description: 'Image height in pixels', default: 1536 },
    ],
    tags: ['image', 'ai', 'character', 'poster', 'photorealistic'],
    rateLimit: '30/min',
    example: `curl -X POST ${NPGX_BASE_URL}/api/generate-image-npgx \\\n  -H "Content-Type: application/json" \\\n  -d '{"slug":"aria-voidstrike","width":1024,"height":1536}'`,
  },
  {
    id: 'generate-video',
    name: 'Generate Video',
    description: 'Image-to-video animation via Wan 2.2. Takes a character image and animates it with cinematic motion. 5-8 second clips.',
    category: 'video',
    endpoint: '/api/generate-video',
    method: 'POST',
    price: makePrice(PRICING['video-gen']),
    params: [
      slugParam,
      { name: 'prompt', type: 'string', required: false, description: 'Motion/action prompt' },
      { name: 'imageUrl', type: 'string', required: false, description: 'Source image URL (or uses character default)' },
      { name: 'duration', type: 'number', required: false, description: 'Duration in seconds', default: 5 },
    ],
    tags: ['video', 'ai', 'animation', 'wan', 'cinematic'],
    rateLimit: '10/min',
    example: `curl -X POST ${NPGX_BASE_URL}/api/generate-video \\\n  -H "Content-Type: application/json" \\\n  -d '{"slug":"luna-cyberblade","prompt":"slow walk through neon rain"}'`,
  },
  {
    id: 'generate-song',
    name: 'Generate Song',
    description: 'AI music composition. Character-themed tracks with genre, mood, and lyric control. Returns audio URL. Supports stem separation and MIDI transcription.',
    category: 'music',
    endpoint: '/api/generate-song',
    method: 'POST',
    price: makePrice(PRICING['music-gen']),
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Music generation prompt (genre, mood, instruments, lyrics)' },
      slugParam,
      { name: 'duration', type: 'number', required: false, description: 'Duration in seconds', default: 30 },
    ],
    tags: ['music', 'ai', 'audio', 'composition', 'theme-song'],
    rateLimit: '10/min',
  },
  {
    id: 'generate-script',
    name: 'Generate Script',
    description: 'AI screenplay/script generation. Character-aware dialogue, scene descriptions, and narrative arcs.',
    category: 'text',
    endpoint: '/api/generate-script',
    method: 'POST',
    price: makePrice(PRICING['script-gen']),
    params: [
      { name: 'character', type: 'object', required: true, description: '{ name, persona?, backstory? }' },
      { name: 'brief', type: 'string', required: false, description: 'Story concept or theme' },
    ],
    tags: ['script', 'text', 'screenplay', 'narrative'],
    rateLimit: '20/min',
  },
  {
    id: 'full-production',
    name: 'One-Shot Production',
    description: 'Complete production pipeline: photoshoot (3 images) → screenplay → video clips → theme song → 32-page magazine → trading cards. The full NPGX content package. Streams NDJSON progress. Incremental DB saves survive timeouts.',
    category: 'production',
    endpoint: '/api/produce',
    method: 'POST',
    price: makePrice(PRICING['full-produce']),
    params: [
      { ...slugParam, required: true },
      { name: 'format', type: 'string', required: false, description: 'Production format', default: 'short-film', enum: ['short-film', 'music-video', 'magazine-only'] },
      { name: 'brief', type: 'string', required: false, description: 'Creative brief / concept' },
    ],
    tags: ['production', 'full-package', 'premium', 'magazine', 'video', 'music', 'pipeline'],
    rateLimit: '2/min',
    example: `curl -X POST ${NPGX_BASE_URL}/api/produce \\\n  -H "Content-Type: application/json" \\\n  -d '{"slug":"blade-nightshade","brief":"Tokyo midnight chase"}'`,
  },
  {
    id: 'generate-magazine',
    name: 'Generate Magazine',
    description: '32-page digital magazine with cover, editorial spreads, character feature, and marketing pages. 5-agent pipeline: Editor → Creative Director → Photographer → Writer → Marketer.',
    category: 'production',
    endpoint: '/api/magazine/generate-canonical',
    method: 'POST',
    price: makePrice(PRICING['magazine-gen']),
    params: [
      { ...slugParam, required: true },
      { name: 'theme', type: 'string', required: false, description: 'Magazine theme/issue concept' },
      { name: 'issueNumber', type: 'number', required: false, description: 'Issue number' },
    ],
    tags: ['magazine', 'editorial', 'design', 'layout', '32-page'],
    rateLimit: '5/min',
  },
  {
    id: 'generate-cards',
    name: 'Generate Trading Cards',
    description: 'Collectible trading cards with character stats, rarity tiers, and holographic effects. Pack or single card.',
    category: 'design',
    endpoint: '/api/cards/generate',
    method: 'POST',
    price: makePrice(PRICING['cards-gen']),
    params: [
      { ...slugParam, required: true },
      { name: 'rarity', type: 'string', required: false, description: 'Card rarity', enum: ['common', 'rare', 'epic', 'legendary'] },
      { name: 'count', type: 'number', required: false, description: 'Number of cards', default: 1 },
    ],
    tags: ['cards', 'collectible', 'design', 'nft', 'holographic'],
    rateLimit: '20/min',
  },
  {
    id: 'title-design',
    name: 'Title Designer',
    description: 'Styled title overlays for posters, videos, and marketing. SVG-based with 6 font presets (punk/neon/elegant/graffiti/cyber/manga), effects (glow/stroke/shadow), multi-layer support.',
    category: 'design',
    endpoint: '/api/title-design',
    method: 'POST',
    price: { amount: 10, currency: 'BSV', network: 'bsv', usdEquivalent: '$0.005', unit: 'per design' },
    params: [
      { name: 'text', type: 'string', required: true, description: 'Title text' },
      { name: 'font', type: 'string', required: false, description: 'Font preset', enum: ['punk', 'neon', 'elegant', 'graffiti', 'cyber', 'manga'] },
      { name: 'color', type: 'string', required: false, description: 'Hex color', default: '#ff0000' },
      { name: 'effects', type: 'object', required: false, description: '{ glow: boolean, stroke: boolean, shadow: boolean }' },
      { name: 'width', type: 'number', required: false, description: 'Canvas width', default: 900 },
      { name: 'height', type: 'number', required: false, description: 'Canvas height', default: 640 },
    ],
    tags: ['title', 'typography', 'design', 'overlay', 'svg'],
    rateLimit: '60/min',
  },
  {
    id: 'inscribe',
    name: 'On-Chain Inscription',
    description: 'Inscribe content on BSV blockchain. SHA-256 content hash + $401 attestation. B:// protocol compatible. Proves ownership and creation timestamp.',
    category: 'blockchain',
    endpoint: '/api/content/inscribe',
    method: 'POST',
    price: { amount: 100, currency: 'BSV', network: 'bsv', usdEquivalent: '$0.05', unit: 'per inscription' },
    params: [
      { name: 'imageUrl', type: 'string', required: true, description: 'Image URL to inscribe' },
      { name: 'contentHash', type: 'string', required: true, description: 'SHA-256 content hash' },
      slugParam,
    ],
    tags: ['blockchain', 'inscription', 'bsv', 'attestation', '$401'],
    rateLimit: '10/min',
  },
  {
    id: 'content-attest',
    name: 'Content Attestation',
    description: 'Create a $401 on-chain attestation for any content. Records content hash, creator, and timestamp on BSV. Returns WoC explorer link.',
    category: 'blockchain',
    endpoint: '/api/content/attest',
    method: 'POST',
    price: { amount: 100, currency: 'BSV', network: 'bsv', usdEquivalent: '$0.05', unit: 'per attestation' },
    params: [
      { name: 'contentHash', type: 'string', required: true, description: 'SHA-256 hash of the content' },
      { name: 'contentType', type: 'string', required: true, description: 'MIME type of the content' },
      { name: 'metadata', type: 'object', required: false, description: '{ title, creator, slug, ... }' },
    ],
    tags: ['attestation', '$401', 'identity', 'proof', 'timestamp'],
    rateLimit: '10/min',
  },
  {
    id: 'produce-music-video',
    name: 'Produce Music Video',
    description: 'Complete AI music video production. Agent assembles timeline from clip library + newly generated clips, synced to the music track. Tiers: quick ($49, existing clips only), standard ($99, new clips + karaoke + titles), full ($199, + portraits + Premiere XML + NFT mint), directors ($499, multi-character + extended + 1-of-26 NFT).',
    category: 'production',
    endpoint: '/api/music-video/produce',
    method: 'POST',
    price: makePrice(PRICING['mv-standard']),
    params: [
      { name: 'trackSlug', type: 'string', required: true, description: 'Music track slug (e.g. "razor-kisses", "tokyo-gutter-queen")' },
      { ...slugParam, required: true, description: 'Primary character slug for the video' },
      { name: 'tier', type: 'string', required: true, description: 'Production tier', enum: ['quick', 'standard', 'full', 'directors'] },
      { name: 'brief', type: 'string', required: false, description: 'Creative direction / narrative concept' },
      { name: 'additionalCharacters', type: 'string', required: false, description: 'Comma-separated slugs for multi-character videos (directors tier only)' },
    ],
    tags: ['music-video', 'production', 'premium', 'tokenized', 'nft', 'premiere'],
    rateLimit: '2/min',
    example: `curl -X POST ${NPGX_BASE_URL}/api/music-video/produce \\\n  -H "Content-Type: application/json" \\\n  -d '{"trackSlug":"razor-kisses","slug":"dahlia-ironveil","tier":"standard"}'`,
  },
  {
    id: 'buy-music-video-edition',
    name: 'Buy Music Video Edition',
    description: 'Purchase a tokenized edition of an NPGX music video. Editions grant revenue share via $DIVVY cascade — 50% of all future revenue from this video flows to edition holders. Standard ($25, 100 supply), Limited ($99, 26 supply A-Z), Directors ($499, 1-of-1).',
    category: 'marketplace',
    endpoint: '/api/marketplace/music-video/buy',
    method: 'POST',
    price: makePrice(PRICING['mv-edition-standard']),
    params: [
      { name: 'tokenTick', type: 'string', required: true, description: 'Content token ticker (e.g. "$MV_RAZOR_KISSES_001")' },
      { name: 'edition', type: 'string', required: true, description: 'Edition tier', enum: ['standard', 'limited', 'directors'] },
    ],
    tags: ['nft', 'edition', 'marketplace', 'token', 'revenue-share', '$divvy'],
    rateLimit: '10/min',
  },
  {
    id: 'list-characters',
    name: 'List Characters',
    description: 'Full NPGX roster — 26 characters A-Z with names, slugs, tokens, categories, images, and specialties.',
    category: 'data',
    endpoint: '/api/generate-image-npgx',
    method: 'GET',
    price: { amount: 0, currency: 'BSV', network: 'bsv', usdEquivalent: '$0.00', unit: 'free' },
    params: [],
    tags: ['characters', 'roster', 'metadata', 'free', 'discovery'],
    rateLimit: '60/min',
  },
  {
    id: 'platform-stats',
    name: 'Platform Stats',
    description: 'Real-time platform statistics — total content generated, per-girl counts, revenue, recent activity. Powers the live ticker.',
    category: 'data',
    endpoint: '/api/stats',
    method: 'GET',
    price: { amount: 0, currency: 'BSV', network: 'bsv', usdEquivalent: '$0.00', unit: 'free' },
    params: [],
    tags: ['stats', 'analytics', 'free', 'ticker', 'real-time'],
    rateLimit: '60/min',
  },
]

// ── Manifest builder ──────────────────────────────────────────────────

export function buildManifest(): X402Manifest {
  const paid = X402_SKILLS.filter(s => s.price.amount > 0)
  const free = X402_SKILLS.filter(s => s.price.amount === 0)

  return {
    x402Version: 1,
    provider: {
      name: 'NPGX — Ninja Punk Girls X',
      description: 'AI-powered creative studio for generative cinema on Bitcoin. 26 characters, each a content creation engine. Images, video, music, magazines, trading cards — all payable via BSV micropayments.',
      url: NPGX_BASE_URL,
      logo: `${NPGX_BASE_URL}/npgx-logo.png`,
      network: 'bsv',
      payTo: NPGX_PAY_ADDRESS,
      agentDiscovery: 'https://x402agency.com',
      documentation: `${NPGX_BASE_URL}/skills`,
    },
    skills: X402_SKILLS,
    characters: NPGX_ROSTER.map(c => ({
      slug: c.slug,
      name: c.name,
      token: c.token,
    })),
    revenueSplit: REVENUE_SPLIT,
    meta: {
      totalSkills: X402_SKILLS.length,
      freeSkills: free.length,
      paidSkills: paid.length,
      generatedAt: new Date().toISOString(),
    },
  }
}

// ── Payment Required response builder ─────────────────────────────────

export function buildPaymentRequired(skillId: string): X402PaymentRequired {
  const skill = X402_SKILLS.find(s => s.id === skillId)
  if (!skill) {
    return {
      x402Version: 1,
      accepts: [],
      error: `Unknown skill: ${skillId}`,
      skill: skillId,
      description: '',
    }
  }

  return {
    x402Version: 1,
    accepts: [{
      scheme: 'exact',
      network: 'bsv',
      maxAmountRequired: String(skill.price.amount),
      resource: skill.endpoint,
      description: skill.description,
      payTo: NPGX_PAY_ADDRESS,
      asset: 'BSV',
      maxTimeoutSeconds: 300,
    }],
    error: 'X-PAYMENT header is required',
    skill: skill.id,
    description: skill.description,
  }
}
