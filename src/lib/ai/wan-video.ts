// Wan 2.2 Spicy — Image-to-Video via Atlas Cloud
// POST /api/v1/model/generateVideo, GET /api/v1/model/result/{id}

const ATLAS_API = 'https://api.atlascloud.ai'
const MODEL_ID = 'alibaba/wan-2.2-spicy/image-to-video-lora'

function getApiKey(): string {
  const key = process.env.ATLASCLOUD_API_KEY
  if (!key) throw new Error('ATLASCLOUD_API_KEY not configured')
  return key
}

export interface WanVideoResult {
  requestId: string
  provider: 'wan2.1'
}

export interface WanVideoStatus {
  status: 'generating' | 'done' | 'error'
  videoUrl: string | null
  duration: number | null
  provider: 'wan2.1'
  error?: string
}

/**
 * Start a Wan 2.2 image-to-video generation via Atlas Cloud.
 * Requires an image URL as the starting frame.
 */
export async function startWanVideo({
  prompt,
  image,
  duration = 5,
  resolution = '720p',
  width,
  height,
  seed = -1,
}: {
  prompt: string
  image: string
  duration?: number
  resolution?: '480p' | '720p'
  width?: number
  height?: number
  seed?: number
}): Promise<WanVideoResult> {
  const apiKey = getApiKey()

  // Atlas Cloud only supports duration 5 or 8
  const clampedDuration = duration <= 6 ? 5 : 8

  // Build request body — include width/height if provided to match input image dimensions
  const requestBody: Record<string, unknown> = {
    model: MODEL_ID,
    image,
    prompt,
    duration: clampedDuration,
    resolution,
    seed,
    high_noise_loras: [],
    low_noise_loras: [],
  }

  // Pass explicit dimensions to preserve input image aspect ratio
  if (width && height) {
    requestBody.width = width
    requestBody.height = height
  }

  const response = await fetch(`${ATLAS_API}/api/v1/model/generateVideo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Atlas Cloud error ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  const predictionId = result?.data?.id || result?.id

  if (!predictionId) {
    throw new Error(`No prediction ID returned: ${JSON.stringify(result)}`)
  }

  return {
    requestId: predictionId,
    provider: 'wan2.1',
  }
}

/**
 * Poll an Atlas Cloud prediction for status.
 */
export async function pollWanVideo(requestId: string): Promise<WanVideoStatus> {
  const apiKey = getApiKey()
  const url = `${ATLAS_API}/api/v1/model/result/${requestId}`

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  // Atlas Cloud returns 500 for failed tasks with error details — parse anyway
  let result: any
  try {
    result = await response.json()
  } catch {
    if (!response.ok) {
      return { status: 'error', videoUrl: null, duration: null, provider: 'wan2.1', error: `Atlas Cloud error ${response.status}` }
    }
    return { status: 'generating', videoUrl: null, duration: null, provider: 'wan2.1' }
  }

  const data = result?.data || result

  const rawStatus = (data.status || '').toLowerCase()

  if (rawStatus === 'completed' || rawStatus === 'succeeded') {
    const videoUrl = Array.isArray(data.outputs) && data.outputs.length > 0
      ? data.outputs[0]
      : null
    return { status: 'done', videoUrl, duration: null, provider: 'wan2.1' }
  }

  if (rawStatus === 'failed') {
    return { status: 'error', videoUrl: null, duration: null, provider: 'wan2.1', error: data.error || 'Generation failed' }
  }

  // created, processing, etc → still generating
  return { status: 'generating', videoUrl: null, duration: null, provider: 'wan2.1' }
}

/**
 * Get a default character reference image URL from the NPGX site.
 * These are publicly hosted on Vercel and always accessible.
 */
export function getDefaultReferenceImage(slug?: string): string {
  // Always use production URL — Atlas Cloud can't reach localhost
  const siteUrl = 'https://www.npgx.website'

  // Character-specific images
  const characterImages: Record<string, string> = {
    'luna-cyberblade': '/npgx-images/characters/luna-cyberblade-1.jpg',
    'nova-bloodmoon': '/npgx-images/characters/nova-bloodmoon-1.jpg',
    'phoenix-darkfire': '/npgx-images/characters/phoenix-darkfire-1.jpg',
    'raven-shadowblade': '/npgx-images/characters/raven-shadowblade-1.jpg',
    'storm-razorclaw': '/npgx-images/characters/storm-razorclaw-1.jpg',
  }

  if (slug && characterImages[slug]) {
    return `${siteUrl}${characterImages[slug]}`
  }

  // Fallback: use a random NPG-X-10 image
  const fallbacks = [
    '/NPG-X-10/00f227e8-2b57-4b73-835a-85cf066e267d.jpg',
    '/NPG-X-10/060e384f-272f-4f71-8422-512eb808a4d8.jpg',
    '/NPG-X-10/0787e269-cc55-4dca-86b2-3019778fb71d.jpg',
    '/NPG-X-10/08a0da98-6cf9-4d84-86ea-7309e6ddd5d7.jpg',
    '/NPG-X-10/0f472fe2-780a-4262-a244-991caa1507e3.jpg',
  ]

  const pick = fallbacks[Math.floor(Math.random() * fallbacks.length)]
  return `${siteUrl}${pick}`
}

/**
 * Get the download URL for a completed video (kept for backward compat).
 */
export function downloadWanVideo(requestId: string): string {
  return `${ATLAS_API}/api/v1/model/result/${requestId}`
}
