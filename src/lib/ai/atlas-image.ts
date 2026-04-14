// Atlas Cloud text-to-image provider
// Uses same account as Wan video — cheapest option at $0.01/image
// Endpoint: POST /api/v1/model/generateImage (sync mode)

const ATLAS_API = 'https://api.atlascloud.ai'

// Models ranked by cost (cheapest first)
// z-image/turbo: $0.01, seedream-v5.0-lite: $0.032, qwen-image/plus: $0.021
const DEFAULT_MODEL = 'z-image/turbo'

function getApiKey(): string {
  const key = process.env.ATLASCLOUD_API_KEY
  if (!key) throw new Error('ATLASCLOUD_API_KEY not configured')
  return key
}

export interface AtlasImageResult {
  url: string
  sourceUrl: string  // Original HTTP URL from Atlas (for server-to-server use like Wan 2.2)
  provider: 'atlas'
  model: string
  cost: number
}

/**
 * Generate an image via Atlas Cloud (sync mode — blocks until done).
 * Default model: z-image/turbo ($0.01/image)
 * Fallback: bytedance/seedream-v5.0-lite ($0.032/image)
 */
export async function generateWithAtlas({
  prompt,
  width = 1024,
  height = 1536,
  model = DEFAULT_MODEL,
}: {
  prompt: string
  width?: number
  height?: number
  model?: string
}): Promise<AtlasImageResult> {
  const apiKey = getApiKey()

  // z-image/turbo accepts arbitrary WxH (min 512, max 2048)
  // seedream uses preset sizes like "2048*2048", "1728*2304" etc
  const size = `${Math.min(2048, Math.max(512, width))}*${Math.min(2048, Math.max(512, height))}`

  const response = await fetch(`${ATLAS_API}/api/v1/model/generateImage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      enable_sync_mode: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Atlas Cloud error ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  const data = result?.data || result

  if (data.status !== 'completed' || !data.outputs?.length) {
    throw new Error(`Atlas Cloud generation failed: ${data.error || data.status || 'no output'}`)
  }

  const imageUrl = data.outputs[0]

  // Proxy to base64 to avoid CORS issues on client — keep original URL for server-to-server
  const cost = model === 'z-image/turbo' ? 0.01 : 0.032
  try {
    const imgResponse = await fetch(imageUrl)
    if (imgResponse.ok) {
      const buffer = await imgResponse.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = imgResponse.headers.get('content-type') || 'image/png'
      return {
        url: `data:${contentType};base64,${base64}`,
        sourceUrl: imageUrl,
        provider: 'atlas',
        model,
        cost,
      }
    }
  } catch {
    // Fall back to raw URL
  }

  return {
    url: imageUrl,
    sourceUrl: imageUrl,
    provider: 'atlas',
    model,
    cost,
  }
}
