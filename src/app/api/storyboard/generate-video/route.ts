import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const ATLAS_API = 'https://api.atlascloud.ai'

// Cheap, fast, decent quality
const MODELS: Record<string, { id: string; price: number }> = {
  'seedance-fast': { id: 'bytedance/seedance-v1.5-pro/image-to-video-fast', price: 0.018 },
  'seedance': { id: 'bytedance/seedance-v1.5-pro/text-to-video', price: 0.044 },
  'wan-t2v': { id: 'alibaba/wan-2.6/text-to-video', price: 0.07 },
  'kling-std': { id: 'kwaivgi/kling-v3.0-std/text-to-video', price: 0.153 },
  'kling-pro': { id: 'kwaivgi/kling-v3.0-pro/text-to-video', price: 0.204 },
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ATLASCLOUD_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No ATLASCLOUD_API_KEY' }, { status: 500 })

  const { trackSlug, segments, model: modelKey, orientation } = await req.json() as {
    trackSlug: string
    segments: Array<{ segNum: number; prompt: string; clipType: string }>
    model: string
    orientation: 'landscape' | 'portrait'
  }

  const model = MODELS[modelKey] || MODELS['seedance']
  const outputDir = join(process.cwd(), 'public', 'music-videos', `${trackSlug}-1`)
  mkdirSync(outputDir, { recursive: true })

  const results: Array<{ index: number; jobId: string; status: string; filename: string }> = []

  // Submit all jobs
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const filename = `${trackSlug}-${seg.clipType.split(':')[0].split(' ')[0].toLowerCase()}-${String(seg.segNum).padStart(2, '0')}.mp4`

    try {
      const res = await fetch(`${ATLAS_API}/api/v1/model/generateVideo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model.id,
          prompt: seg.prompt,
          duration: 5,
          resolution: '720p',
          aspect_ratio: orientation === 'portrait' ? '9:16' : '16:9',
          seed: -1,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        results.push({ index: i, jobId: '', status: 'failed', filename })
        // Stop on rate limit / credit exhaustion
        if (res.status === 429 || err.includes('exhausted')) break
        continue
      }

      const data = await res.json()
      const jobId = data?.data?.id || data?.id || ''
      results.push({ index: i, jobId, status: 'pending', filename })

      await new Promise(r => setTimeout(r, 300))
    } catch {
      results.push({ index: i, jobId: '', status: 'error', filename })
    }
  }

  return NextResponse.json({
    submitted: results.filter(r => r.status === 'pending').length,
    failed: results.filter(r => r.status !== 'pending').length,
    model: model.id,
    pricePerClip: model.price,
    estimatedCost: results.filter(r => r.status === 'pending').length * model.price,
    jobs: results,
    trackSlug,
  })
}
