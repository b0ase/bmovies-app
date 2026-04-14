// Runway — Video Generation via API
// gen4_turbo: $0.05/sec (5 credits/sec) — best value
// gen4.5: $0.12/sec (12 credits/sec) — flagship
// Docs: https://docs.dev.runwayml.com/

const RUNWAY_API = 'https://api.dev.runwayml.com/v1'
const API_VERSION = '2024-11-06'

function getApiKey(): string {
  const key = process.env.RUNWAYML_API_SECRET
  if (!key) throw new Error('RUNWAYML_API_SECRET not configured')
  return key
}

// ── Types ────────────────────────────────────────────────────────────────────

export type RunwayModel = 'gen4_turbo' | 'gen4.5' | 'gen3a_turbo'

export interface RunwayResult {
  taskId: string
  provider: 'runway'
  estimatedCost: number
}

export interface RunwayStatus {
  status: 'pending' | 'processing' | 'done' | 'error'
  videoUrl: string | null
  provider: 'runway'
  error?: string
}

export interface RunwayVideoRequest {
  /** Runway model (default: gen4_turbo) */
  model?: RunwayModel
  /** Public HTTPS URL to source image (JPEG, PNG, WebP) */
  promptImage: string
  /** Text prompt guiding the motion/scene */
  promptText: string
  /** Duration in seconds (2-10, default 10) */
  duration?: number
  /** Output aspect ratio (default 1280:720) */
  ratio?: string
  /** Watermark text — leave empty for none */
  watermark?: string
}

export interface RunwayTextToVideoRequest {
  model?: RunwayModel
  promptText: string
  duration?: number
  ratio?: string
  watermark?: string
}

// ── Cost ─────────────────────────────────────────────────────────────────────

/** Credits per second by model (1 credit = $0.01) */
export const RUNWAY_CREDITS_PER_SEC: Record<RunwayModel, number> = {
  'gen4_turbo': 5,
  'gen4.5': 12,
  'gen3a_turbo': 5,
}

export function runwayCost(model: RunwayModel, durationSec: number): number {
  return +(RUNWAY_CREDITS_PER_SEC[model] * durationSec * 0.01).toFixed(3)
}

// ── API ──────────────────────────────────────────────────────────────────────

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
    'X-Runway-Version': API_VERSION,
  }
}

/**
 * Start an image-to-video generation.
 * promptImage must be a publicly accessible HTTPS URL (JPEG/PNG/WebP, max 16MB).
 */
export async function startRunwayVideo(req: RunwayVideoRequest): Promise<RunwayResult> {
  const model = req.model || 'gen4_turbo'
  const duration = Math.min(Math.max(req.duration || 10, 2), 10)

  const body: Record<string, unknown> = {
    model,
    promptImage: req.promptImage,
    promptText: req.promptText,
    duration,
    ratio: req.ratio || '1280:720',
  }
  if (req.watermark !== undefined) body.watermark = req.watermark

  console.log(`[runway] Starting ${model} image-to-video (${duration}s)...`)

  const res = await fetch(`${RUNWAY_API}/image_to_video`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Runway ${res.status}: ${err}`)
  }

  const result = await res.json()
  const taskId = result.id

  if (!taskId) {
    throw new Error(`No task ID returned: ${JSON.stringify(result)}`)
  }

  console.log(`[runway] Task started: ${taskId}`)
  return {
    taskId,
    provider: 'runway',
    estimatedCost: runwayCost(model, duration),
  }
}

/**
 * Start a text-to-video generation (no source image).
 */
export async function startRunwayTextToVideo(req: RunwayTextToVideoRequest): Promise<RunwayResult> {
  const model = req.model || 'gen4_turbo'
  const duration = Math.min(Math.max(req.duration || 10, 2), 10)

  const body: Record<string, unknown> = {
    model,
    promptText: req.promptText,
    duration,
    ratio: req.ratio || '1280:720',
  }
  if (req.watermark !== undefined) body.watermark = req.watermark

  console.log(`[runway] Starting ${model} text-to-video (${duration}s)...`)

  const res = await fetch(`${RUNWAY_API}/text_to_video`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Runway ${res.status}: ${err}`)
  }

  const result = await res.json()
  const taskId = result.id

  if (!taskId) {
    throw new Error(`No task ID returned: ${JSON.stringify(result)}`)
  }

  console.log(`[runway] Task started: ${taskId}`)
  return {
    taskId,
    provider: 'runway',
    estimatedCost: runwayCost(model, duration),
  }
}

/**
 * Poll a Runway task for status.
 * Statuses: PENDING → THROTTLED → RUNNING → SUCCEEDED (or FAILED/CANCELLED)
 */
export async function pollRunwayVideo(taskId: string): Promise<RunwayStatus> {
  const res = await fetch(`${RUNWAY_API}/tasks/${taskId}`, {
    headers: headers(),
  })

  if (!res.ok) {
    return {
      status: 'error',
      videoUrl: null,
      provider: 'runway',
      error: `HTTP ${res.status}`,
    }
  }

  const result = await res.json()
  const rawStatus = (result.status || '').toUpperCase()

  if (rawStatus === 'SUCCEEDED') {
    const url = Array.isArray(result.output) ? result.output[0] : result.output
    return {
      status: 'done',
      videoUrl: url || null,
      provider: 'runway',
    }
  }

  if (rawStatus === 'FAILED' || rawStatus === 'CANCELLED') {
    return {
      status: 'error',
      videoUrl: null,
      provider: 'runway',
      error: result.failure || result.failureCode || 'Generation failed',
    }
  }

  // PENDING, THROTTLED, RUNNING → still processing
  return {
    status: rawStatus === 'RUNNING' ? 'processing' : 'pending',
    videoUrl: null,
    provider: 'runway',
  }
}

/**
 * Wait for a Runway task to complete (polling with backoff).
 * Throws on failure or timeout.
 */
export async function waitForRunwayVideo(
  taskId: string,
  { maxWaitMs = 5 * 60 * 1000, intervalMs = 5000 } = {},
): Promise<string> {
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    const status = await pollRunwayVideo(taskId)

    if (status.status === 'done' && status.videoUrl) {
      console.log(`[runway] Complete: ${status.videoUrl}`)
      return status.videoUrl
    }

    if (status.status === 'error') {
      throw new Error(`Runway generation failed: ${status.error}`)
    }

    console.log(`[runway] Status: ${status.status} (${Math.round((Date.now() - start) / 1000)}s)`)
    await new Promise(r => setTimeout(r, intervalMs))
  }

  throw new Error(`Runway generation timed out after ${maxWaitMs / 1000}s`)
}
