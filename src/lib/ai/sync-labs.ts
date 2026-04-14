// Sync Labs — Lip Sync via sync.so API
// lipsync-2-pro: $0.085/sec, diffusion upscale, up to 4K
// lipsync-2: $0.05/sec, 512x512 face region
// Docs: https://sync.so/docs/api-reference

const SYNC_API = 'https://api.sync.so/v2'

function getApiKey(): string {
  const key = process.env.SYNC_API_KEY
  if (!key) throw new Error('SYNC_API_KEY not configured')
  return key
}

// ── Types ────────────────────────────────────────────────────────────────────

export type SyncLabsModel = 'lipsync-2' | 'lipsync-2-pro'
export type SyncMode = 'bounce' | 'loop' | 'cut_off' | 'silence' | 'remap'
export type SyncEmotion = 'happy' | 'sad' | 'angry' | 'disgusted' | 'surprised' | 'neutral'

export interface LipSyncResult {
  generationId: string
  provider: 'sync-labs'
}

export interface LipSyncStatus {
  status: 'pending' | 'processing' | 'done' | 'error'
  videoUrl: string | null
  provider: 'sync-labs'
  error?: string
}

export interface LipSyncRequest {
  /** URL to source video (MP4, MOV, WebM — max 4K, H.264 recommended) */
  videoUrl: string
  /** URL to audio file (WAV/MP3/FLAC — isolated vocals recommended) */
  audioUrl: string
  /** Model: lipsync-2-pro for broadcast quality, lipsync-2 for speed */
  model?: SyncLabsModel
  /** How to handle audio/video duration mismatch */
  syncMode?: SyncMode
  /** Facial expression during sync */
  emotion?: SyncEmotion
  /** Expression intensity 0-1 (default 0.5) */
  temperature?: number
}

// ── Cost ─────────────────────────────────────────────────────────────────────

export const SYNC_COST_PER_SEC: Record<SyncLabsModel, number> = {
  'lipsync-2': 0.05,
  'lipsync-2-pro': 0.085,
}

export function lipSyncCost(model: SyncLabsModel, durationSec: number): number {
  return +(SYNC_COST_PER_SEC[model] * durationSec).toFixed(3)
}

// ── API ──────────────────────────────────────────────────────────────────────

/**
 * Start a lip sync generation.
 * Both videoUrl and audioUrl must be publicly accessible HTTPS URLs.
 */
export async function startLipSync(req: LipSyncRequest): Promise<LipSyncResult> {
  const apiKey = getApiKey()
  const model = req.model || 'lipsync-2-pro'

  const options: Record<string, unknown> = {
    sync_mode: req.syncMode || 'cut_off',
  }
  if (req.emotion) options.emotion = req.emotion
  if (req.temperature !== undefined) options.temperature = req.temperature

  const body = {
    model,
    input: [
      { type: 'video', url: req.videoUrl },
      { type: 'audio', url: req.audioUrl },
    ],
    options,
  }

  console.log(`[sync-labs] Starting ${model} lip sync...`)

  const res = await fetch(`${SYNC_API}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sync Labs ${res.status}: ${err}`)
  }

  const result = await res.json()
  const id = result.id

  if (!id) {
    throw new Error(`No generation ID returned: ${JSON.stringify(result)}`)
  }

  console.log(`[sync-labs] Generation started: ${id}`)
  return { generationId: id, provider: 'sync-labs' }
}

/**
 * Poll a lip sync generation for status.
 * Statuses: PENDING → PROCESSING → COMPLETED (or FAILED/REJECTED)
 */
export async function pollLipSync(generationId: string): Promise<LipSyncStatus> {
  const apiKey = getApiKey()

  const res = await fetch(`${SYNC_API}/generate/${generationId}`, {
    headers: { 'x-api-key': apiKey },
  })

  if (!res.ok) {
    return {
      status: 'error',
      videoUrl: null,
      provider: 'sync-labs',
      error: `HTTP ${res.status}`,
    }
  }

  const result = await res.json()
  const rawStatus = (result.status || '').toUpperCase()

  if (rawStatus === 'COMPLETED') {
    return {
      status: 'done',
      videoUrl: result.outputUrl || null,
      provider: 'sync-labs',
    }
  }

  if (rawStatus === 'FAILED' || rawStatus === 'REJECTED') {
    return {
      status: 'error',
      videoUrl: null,
      provider: 'sync-labs',
      error: result.error || result.reason || 'Generation failed',
    }
  }

  return {
    status: rawStatus === 'PROCESSING' ? 'processing' : 'pending',
    videoUrl: null,
    provider: 'sync-labs',
  }
}

/**
 * Wait for a lip sync generation to complete (polling with backoff).
 * Throws on failure or timeout.
 */
export async function waitForLipSync(
  generationId: string,
  { maxWaitMs = 5 * 60 * 1000, intervalMs = 5000 } = {},
): Promise<string> {
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    const status = await pollLipSync(generationId)

    if (status.status === 'done' && status.videoUrl) {
      console.log(`[sync-labs] Complete: ${status.videoUrl}`)
      return status.videoUrl
    }

    if (status.status === 'error') {
      throw new Error(`Sync Labs generation failed: ${status.error}`)
    }

    console.log(`[sync-labs] Status: ${status.status} (${Math.round((Date.now() - start) / 1000)}s)`)
    await new Promise(r => setTimeout(r, intervalMs))
  }

  throw new Error(`Sync Labs generation timed out after ${maxWaitMs / 1000}s`)
}
