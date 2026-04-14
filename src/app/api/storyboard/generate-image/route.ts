import { NextRequest, NextResponse } from 'next/server'

const ATLAS_API = 'https://api.atlascloud.ai'
const MODEL_ID = 'alibaba/wan-2.6/text-to-image'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ATLASCLOUD_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No ATLASCLOUD_API_KEY' }, { status: 500 })

  const { prompt, index, orientation } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 })

  const isPortrait = orientation === 'portrait'

  try {
    // Start generation
    const res = await fetch(`${ATLAS_API}/api/v1/model/generateImage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL_ID,
        prompt,
        width: isPortrait ? 720 : 1280,
        height: isPortrait ? 1280 : 720,
        seed: -1,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Atlas error: ${err.slice(0, 200)}` }, { status: 500 })
    }

    const result = await res.json()
    const id = result?.data?.id || result?.id

    if (!id) return NextResponse.json({ error: 'No job ID returned' }, { status: 500 })

    // Poll for result (max 60s)
    const start = Date.now()
    while (Date.now() - start < 60000) {
      await new Promise(r => setTimeout(r, 3000))

      const pollRes = await fetch(`${ATLAS_API}/api/v1/model/result/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })
      const pollData = await pollRes.json()
      const data = pollData?.data || pollData
      const status = (data.status || '').toLowerCase()

      if ((status === 'completed' || status === 'succeeded') && data.outputs?.[0]) {
        return NextResponse.json({ imageUrl: data.outputs[0], index })
      }
      if (status === 'failed') {
        return NextResponse.json({ error: 'Generation failed', index }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Timeout', index }, { status: 504 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, index }, { status: 500 })
  }
}
