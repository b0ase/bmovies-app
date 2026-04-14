/**
 * Generation DNA — Recursive IP Inscription System
 *
 * Every generation (image, video, music) carries a "DNA tape" that records
 * the full lineage: prompt, look, character, parent/child relationships.
 * Each successive generation extends the tape, creating an immutable chain
 * of IP that can be inscribed on-chain via $401 attestation.
 *
 * Parent/child taxonomy:
 * - Platform (NPGX) retains master IP rights via root inscription
 * - User gets 50% of revenue when they branch platform IP into new token
 * - Each generation inherits DNA from all ancestors (the "tape")
 *
 * Economy:
 * - User pays tokens per generation (image=1, video=10, extend=15, movie=100)
 * - Each generation is an NFT (inscribed content hash)
 * - User can sell their generation NFTs on the exchange
 * - Revenue splits: 50% creator, 50% platform (via parent/child)
 */

import { createHash } from 'crypto'

// ── Types ──────────────────────────────────────────────────────────────────

export interface GenerationDNA {
  /** Unique generation ID (UUID) */
  id: string
  /** Previous generation in the chain (null = root) */
  parentId: string | null
  /** Original generation that started this lineage */
  rootId: string
  /** Which character this belongs to */
  characterSlug: string
  /** Content type */
  contentType: 'image' | 'video' | 'music' | 'magazine'
  /** The prompt used for this generation */
  prompt: string
  /** SHA-256 of the content */
  contentHash: string
  /** URL to the generated content */
  contentUrl: string
  /** On-chain attestation txid (set after inscription) */
  attestationTxid?: string
  /** Creator address (BRC-100 wallet or x401 identity) */
  creatorAddress?: string
  /** Generation cost in tokens */
  cost: number
  /** When created */
  timestamp: string
  /** AI model/provider used */
  model: string
  provider: string
  /** Content dimensions */
  width: number
  height: number
  /** Duration in seconds (video/music only) */
  duration?: number
  /** The cumulative DNA tape — all ancestor prompts concatenated */
  tape: TapeEntry[]
}

export interface TapeEntry {
  /** Generation ID this entry came from */
  generationId: string
  /** The prompt fragment */
  prompt: string
  /** Content type that was generated */
  contentType: 'image' | 'video' | 'music' | 'magazine'
  /** Visual style / look descriptors extracted */
  look: string
  /** Timestamp */
  timestamp: string
}

export interface GenerationLineage {
  /** The current generation */
  current: GenerationDNA
  /** All ancestors in order (root first) */
  ancestors: GenerationDNA[]
  /** Total generations in this lineage */
  depth: number
  /** Total tokens spent across all generations */
  totalCost: number
}

// ── DNA Tape Builder ───────────────────────────────────────────────────────

/**
 * Extract the visual "look" from a prompt — key descriptors that carry
 * the visual DNA forward into the next generation.
 */
export function extractLook(prompt: string): string {
  // Pull out key visual descriptors that should persist across generations
  const descriptors: string[] = []

  // Color/lighting
  const colorMatch = prompt.match(/(?:neon|crimson|red|pink|blue|golden|dark|bright|saturated|moody|warm|cold)\s*(?:light|lighting|glow|wash|tones?)?/gi)
  if (colorMatch) descriptors.push(...colorMatch.slice(0, 3))

  // Style
  const styleMatch = prompt.match(/(?:photorealistic|cinematic|editorial|raw|punk|cyberpunk|gothic|grunge|noir|ethereal)/gi)
  if (styleMatch) descriptors.push(...styleMatch.slice(0, 2))

  // Camera
  const cameraMatch = prompt.match(/(?:close-up|wide angle|low angle|dutch angle|fisheye|bokeh|shallow depth)/gi)
  if (cameraMatch) descriptors.push(...cameraMatch.slice(0, 1))

  // Wardrobe key items
  const wardrobeMatch = prompt.match(/(?:latex|PVC|leather|fishnet|harness|boots|corset|chains)/gi)
  if (wardrobeMatch) descriptors.push(...wardrobeMatch.slice(0, 3))

  return descriptors.join(', ') || 'NPGX house style'
}

/**
 * Build the cumulative DNA tape from parent's tape + current generation.
 * This is the "recursive inscription" — each generation appends to the tape.
 */
export function buildTape(
  parentTape: TapeEntry[],
  currentGeneration: {
    id: string
    prompt: string
    contentType: 'image' | 'video' | 'music' | 'magazine'
    timestamp: string
  },
): TapeEntry[] {
  const newEntry: TapeEntry = {
    generationId: currentGeneration.id,
    prompt: currentGeneration.prompt,
    contentType: currentGeneration.contentType,
    look: extractLook(currentGeneration.prompt),
    timestamp: currentGeneration.timestamp,
  }

  return [...parentTape, newEntry]
}

/**
 * Inject the DNA tape into a new generation prompt.
 * Takes the accumulated look/style from all ancestors and weaves it
 * into the new prompt to maintain visual continuity.
 */
export function injectDNA(basePrompt: string, tape: TapeEntry[]): string {
  if (tape.length === 0) return basePrompt

  // Extract all looks from the tape
  const looks = tape.map(e => e.look).filter(Boolean)
  const uniqueLooks = [...new Set(looks.join(', ').split(', '))]

  // Build DNA prefix — the accumulated visual identity
  const dnaPrefix = `[DNA: ${uniqueLooks.slice(0, 8).join(', ')}]`

  // For video generations, also include the most recent image prompt fragment
  const lastImageEntry = [...tape].reverse().find(e => e.contentType === 'image')
  const continuityHint = lastImageEntry
    ? `, maintaining exact appearance from previous frame: ${lastImageEntry.look}`
    : ''

  return `${dnaPrefix} ${basePrompt}${continuityHint}`
}

// ── Content Hash ───────────────────────────────────────────────────────────

/**
 * Hash content for inscription. Works with URLs, data URIs, and raw buffers.
 */
export function hashContent(content: string | Buffer): string {
  if (typeof content === 'string') {
    if (content.startsWith('data:')) {
      const b64 = content.split(',')[1]
      return createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex')
    }
    return createHash('sha256').update(content).digest('hex')
  }
  return createHash('sha256').update(content).digest('hex')
}

// ── Inscription Payload ────────────────────────────────────────────────────

/**
 * Build the OP_RETURN inscription data for on-chain recording.
 * This is what gets written to BSV via BRC-100 wallet.
 */
export function buildInscriptionPayload(gen: GenerationDNA): {
  protocol: string
  operation: string
  data: Record<string, unknown>
} {
  return {
    protocol: '401',
    operation: 'generation',
    data: {
      id: gen.id,
      parentId: gen.parentId,
      rootId: gen.rootId,
      characterSlug: gen.characterSlug,
      contentType: gen.contentType,
      contentHash: gen.contentHash,
      model: gen.model,
      provider: gen.provider,
      width: gen.width,
      height: gen.height,
      duration: gen.duration,
      cost: gen.cost,
      tapeLength: gen.tape.length,
      // Include the DNA tape hash — proves lineage without exposing all prompts
      tapeHash: createHash('sha256')
        .update(gen.tape.map(e => e.generationId).join(':'))
        .digest('hex'),
      timestamp: gen.timestamp,
    },
  }
}

// ── Token Cost Calculator ──────────────────────────────────────────────────

export const GENERATION_COSTS: Record<string, number> = {
  image: 1,
  video: 10,
  'video-extend': 15,
  music: 5,
  'magazine-page': 5,
  'magazine-full': 100,
  'movie-full': 100,
}

// ── Token Supply ───────────────────────────────────────────────────────────

/**
 * Standard token supply: 1 BILLION for everything. No exceptions.
 * $BOASE, $BCORP, $NPG, $NPGX, $LUNA, content tokens — all 1B.
 * 1% = 10,000,000 tokens. Clean math at every level.
 */
export const STANDARD_TOKEN_SUPPLY = 1_000_000_000

/**
 * Creator allocation: 50% of supply on mint.
 * Remaining 50% available on exchange via bonding curve.
 */
export const CREATOR_ALLOCATION_PCT = 0.5
export const CREATOR_ALLOCATION = Math.floor(STANDARD_TOKEN_SUPPLY * CREATOR_ALLOCATION_PCT)
export const EXCHANGE_ALLOCATION = STANDARD_TOKEN_SUPPLY - CREATOR_ALLOCATION

/**
 * Calculate the revenue split for a generation.
 * Parent/child taxonomy: platform 50%, creator 50%.
 * If this is a root generation (no parent), platform gets 100%.
 */
export function calculateRevenueSplit(gen: GenerationDNA): {
  platformShare: number
  creatorShare: number
  total: number
} {
  const total = gen.cost
  if (!gen.parentId || !gen.creatorAddress) {
    // Root generation — all platform
    return { platformShare: total, creatorShare: 0, total }
  }
  // Branched generation — 50/50
  return {
    platformShare: Math.ceil(total * 0.5),
    creatorShare: Math.floor(total * 0.5),
    total,
  }
}

// ── UUID Generator ─────────────────────────────────────────────────────────

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
