/**
 * NPGX Tiered Video Provider
 *
 * Routes video generation to the right model based on content grade:
 *   Title / X-grade  → Kling v3.0 Pro (character-accurate, cinematic)
 *   XX-grade          → Seedance v1.5 Pro Fast (cheap, permissive)
 *   XXX-grade         → Wan 2.2 Spicy Lora (proven NSFW, dirty)
 *
 * All models via Atlas Cloud API.
 */

const ATLAS_API = 'https://api.atlascloud.ai'

function getApiKey(): string {
  const key = process.env.ATLASCLOUD_API_KEY
  if (!key) throw new Error('ATLASCLOUD_API_KEY not configured')
  return key
}

// ── Model Registry ──────────────────────────────────────────────────────────

export type ContentGrade = 'title' | 'x' | 'xx' | 'xxx'

export interface VideoModel {
  id: string
  name: string
  costPerSec: number
  grade: ContentGrade[]
  notes: string
}

export const VIDEO_MODELS: Record<string, VideoModel> = {
  'kling-pro': {
    id: 'kwaivgi/kling-v3.0-pro/image-to-video',
    name: 'Kling v3.0 Pro',
    costPerSec: 0.204,
    grade: ['title', 'x'],
    notes: 'Best quality, character-accurate, cinematic motion',
  },
  'kling-std': {
    id: 'kwaivgi/kling-v3.0-std/image-to-video',
    name: 'Kling v3.0 Std',
    costPerSec: 0.153,
    grade: ['title', 'x'],
    notes: 'Good quality, cheaper Kling',
  },
  'seedance-fast': {
    id: 'bytedance/seedance-v1.5-pro/image-to-video-fast',
    name: 'Seedance v1.5 Fast',
    costPerSec: 0.018,
    grade: ['xx'],
    notes: 'Very cheap, permissive ByteDance model',
  },
  'seedance-pro': {
    id: 'bytedance/seedance-v1.5-pro/image-to-video',
    name: 'Seedance v1.5 Pro',
    costPerSec: 0.044,
    grade: ['xx'],
    notes: 'Higher quality Seedance',
  },
  'wan-spicy-lora': {
    id: 'alibaba/wan-2.2-spicy/image-to-video-lora',
    name: 'Wan 2.2 Spicy Lora',
    costPerSec: 0.04,
    grade: ['xxx'],
    notes: 'NSFW LoRA — proven for explicit content',
  },
  'wan-spicy': {
    id: 'alibaba/wan-2.2-spicy/image-to-video',
    name: 'Wan 2.2 Spicy',
    costPerSec: 0.03,
    grade: ['xxx'],
    notes: 'NSFW base model — cheaper than LoRA',
  },
  'wan-26': {
    id: 'alibaba/wan-2.6/image-to-video',
    name: 'Wan 2.6',
    costPerSec: 0.07,
    grade: ['x', 'xx'],
    notes: 'Newer Wan, good general quality',
  },
  'wan-26-flash': {
    id: 'alibaba/wan-2.6/image-to-video-flash',
    name: 'Wan 2.6 Flash',
    costPerSec: 0.018,
    grade: ['xx'],
    notes: 'Flash version — fast and cheap',
  },
}

/** Pick the default model for a content grade */
export function modelForGrade(grade: ContentGrade): VideoModel {
  switch (grade) {
    case 'title': return VIDEO_MODELS['kling-pro']
    case 'x':     return VIDEO_MODELS['kling-std']
    case 'xx':    return VIDEO_MODELS['seedance-fast']
    case 'xxx':   return VIDEO_MODELS['wan-spicy-lora']
  }
}

/** Calculate cost for a clip */
export function clipCost(model: VideoModel, durationSec: number): number {
  return +(model.costPerSec * durationSec).toFixed(3)
}

// ── Generation API ──────────────────────────────────────────────────────────

export interface VideoGenRequest {
  /** Atlas Cloud model ID */
  model: string
  /** Image URL (for image-to-video) */
  image: string
  /** Motion/scene prompt */
  prompt: string
  /** Duration in seconds (5 or 10) */
  duration: 5 | 10
  /** Negative prompt (optional) */
  negativePrompt?: string
}

export interface VideoGenResult {
  requestId: string
  model: string
  estimatedCost: number
}

export interface VideoStatus {
  status: 'generating' | 'done' | 'error'
  videoUrl: string | null
  error?: string
}

/** Start a video generation on Atlas Cloud */
export async function startVideo(req: VideoGenRequest): Promise<VideoGenResult> {
  const apiKey = getApiKey()

  const body: Record<string, unknown> = {
    model: req.model,
    image: req.image,
    prompt: req.prompt,
    duration: req.duration,
  }
  if (req.negativePrompt) {
    body.negative_prompt = req.negativePrompt
  }

  const res = await fetch(`${ATLAS_API}/api/v1/model/generateVideo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Atlas Cloud ${res.status}: ${err}`)
  }

  const result = await res.json()
  const requestId = result?.data?.id || result?.id

  if (!requestId) {
    throw new Error(`No request ID: ${JSON.stringify(result)}`)
  }

  // Find the model definition to calculate cost
  const modelDef = Object.values(VIDEO_MODELS).find(m => m.id === req.model)
  const estimatedCost = modelDef ? clipCost(modelDef, req.duration) : 0

  return { requestId, model: req.model, estimatedCost }
}

/** Poll for video completion */
export async function pollVideo(requestId: string): Promise<VideoStatus> {
  const apiKey = getApiKey()

  const res = await fetch(`${ATLAS_API}/api/v1/model/result/${requestId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  let result: any
  try {
    result = await res.json()
  } catch {
    if (!res.ok) return { status: 'error', videoUrl: null, error: `HTTP ${res.status}` }
    return { status: 'generating', videoUrl: null }
  }

  const data = result?.data || result
  const status = (data.status || '').toLowerCase()

  if (status === 'completed' || status === 'succeeded') {
    const videoUrl = Array.isArray(data.outputs) && data.outputs[0] ? data.outputs[0] : null
    return { status: 'done', videoUrl }
  }
  if (status === 'failed') {
    return { status: 'error', videoUrl: null, error: data.error || 'Generation failed' }
  }
  return { status: 'generating', videoUrl: null }
}

/** Download a video from URL to local file */
export async function downloadVideo(url: string, destPath: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { writeFile, mkdir } = await import('fs/promises')
  const { dirname } = await import('path')
  await mkdir(dirname(destPath), { recursive: true })
  await writeFile(destPath, buf)
}
