// Music Generation — WaveSpeed ACE-Step → Replicate MiniMax 2.5 → AIML MiniMax
// Same cascade pattern as image/video providers

const WAVESPEED_API = 'https://api.wavespeed.ai/api/v3'

export interface MusicGenRequest {
  prompt: string        // style description: "epic orchestral, dark ambient"
  lyrics?: string       // with [Verse]/[Chorus]/[Bridge] markers
  duration?: number     // seconds, default 120
  instrumental?: boolean
}

export interface MusicGenResult {
  requestId: string
  provider: 'wavespeed' | 'replicate' | 'aiml'
  model: string
  status: 'pending' | 'processing' | 'done' | 'error'
  audioUrl?: string
  cost?: number
  error?: string
}

// ─── 1. WaveSpeed ACE-Step 1.5 ($0.0003/sec) ───

async function startWaveSpeed(req: MusicGenRequest): Promise<MusicGenResult> {
  const key = process.env.WAVESPEED_API_KEY
  if (!key) throw new Error('WAVESPEED_API_KEY not configured')

  const duration = Math.min(req.duration || 120, 240)
  const lyrics = req.instrumental ? '[inst]' : (req.lyrics || '')

  const res = await fetch(`${WAVESPEED_API}/wavespeed-ai/ace-step-1.5`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tags: req.prompt,
      lyrics,
      duration,
      seed: -1,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WaveSpeed error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const requestId = data?.data?.id || data?.id

  if (!requestId) throw new Error(`No request ID: ${JSON.stringify(data)}`)

  return {
    requestId,
    provider: 'wavespeed',
    model: 'ace-step-1.5',
    status: 'pending',
    cost: duration * 0.0003,
  }
}

export async function pollWaveSpeed(requestId: string): Promise<MusicGenResult> {
  const key = process.env.WAVESPEED_API_KEY
  if (!key) throw new Error('WAVESPEED_API_KEY not configured')

  const res = await fetch(`${WAVESPEED_API}/predictions/${requestId}/result`, {
    headers: { 'Authorization': `Bearer ${key}` },
  })

  let data: any
  try { data = await res.json() } catch {
    return { requestId, provider: 'wavespeed', model: 'ace-step-1.5', status: 'processing' }
  }

  const status = (data?.data?.status || data?.status || '').toLowerCase()

  if (status === 'completed' || status === 'succeeded') {
    const audioUrl = data?.data?.outputs?.[0] || data?.output?.audio || data?.data?.output?.audio
    return { requestId, provider: 'wavespeed', model: 'ace-step-1.5', status: 'done', audioUrl }
  }

  if (status === 'failed') {
    return { requestId, provider: 'wavespeed', model: 'ace-step-1.5', status: 'error', error: data?.error || 'Failed' }
  }

  return { requestId, provider: 'wavespeed', model: 'ace-step-1.5', status: 'processing' }
}

// ─── 2. Replicate MiniMax Music 2.5 ───

async function startReplicate(req: MusicGenRequest): Promise<MusicGenResult> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

  const input: Record<string, any> = {
    prompt: req.prompt,
    sample_rate: 44100,
    audio_format: 'mp3',
  }

  if (req.lyrics && !req.instrumental) {
    input.lyrics = req.lyrics
  }

  const res = await fetch('https://api.replicate.com/v1/models/minimax/music-2.5/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Replicate error ${res.status}: ${err}`)
  }

  const data = await res.json()

  return {
    requestId: data.id,
    provider: 'replicate',
    model: 'minimax-music-2.5',
    status: 'pending',
    cost: 0.15,
  }
}

export async function pollReplicate(requestId: string): Promise<MusicGenResult> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

  const res = await fetch(`https://api.replicate.com/v1/predictions/${requestId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  const data = await res.json()
  const status = data.status

  if (status === 'succeeded') {
    // Replicate MiniMax returns audio URL in output
    const audioUrl = typeof data.output === 'string' ? data.output : data.output?.audio || data.output?.[0]
    return { requestId, provider: 'replicate', model: 'minimax-music-2.5', status: 'done', audioUrl }
  }

  if (status === 'failed' || status === 'canceled') {
    return { requestId, provider: 'replicate', model: 'minimax-music-2.5', status: 'error', error: data.error || 'Failed' }
  }

  return { requestId, provider: 'replicate', model: 'minimax-music-2.5', status: 'processing' }
}

// ─── 3. AIML API MiniMax Music 2.0 ───

async function startAIML(req: MusicGenRequest): Promise<MusicGenResult> {
  const key = process.env.AIML_API_KEY
  if (!key) throw new Error('AIML_API_KEY not configured')

  const body: Record<string, any> = {
    model: 'minimax/music-2.0',
    prompt: req.prompt,
  }

  if (req.lyrics && !req.instrumental) {
    body.lyrics = req.lyrics
  }

  const res = await fetch('https://api.aimlapi.com/v2/generate/audio', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AIML error ${res.status}: ${err}`)
  }

  const data = await res.json()

  return {
    requestId: data.id || data.generation_id,
    provider: 'aiml',
    model: 'minimax-music-2.0',
    status: 'pending',
    cost: 0.10,
  }
}

export async function pollAIML(requestId: string): Promise<MusicGenResult> {
  const key = process.env.AIML_API_KEY
  if (!key) throw new Error('AIML_API_KEY not configured')

  const res = await fetch(`https://api.aimlapi.com/v2/generate/audio?generation_id=${requestId}`, {
    headers: { 'Authorization': `Bearer ${key}` },
  })

  const data = await res.json()
  const status = (data.status || '').toLowerCase()

  if (status === 'completed' || status === 'succeeded') {
    const audioUrl = data.audio_url || data.audio_file?.url || data.result?.audio_url
    return { requestId, provider: 'aiml', model: 'minimax-music-2.0', status: 'done', audioUrl }
  }

  if (status === 'failed' || status === 'error') {
    return { requestId, provider: 'aiml', model: 'minimax-music-2.0', status: 'error', error: data.error || 'Failed' }
  }

  return { requestId, provider: 'aiml', model: 'minimax-music-2.0', status: 'processing' }
}

// ─── CASCADE: Try providers in order ───

export async function generateMusic(req: MusicGenRequest): Promise<MusicGenResult> {
  // 1. WaveSpeed ACE-Step ($0.07/4min)
  if (process.env.WAVESPEED_API_KEY) {
    try {
      console.log('[MusicGen] Trying WaveSpeed ACE-Step...')
      return await startWaveSpeed(req)
    } catch (err) {
      console.warn('[MusicGen] WaveSpeed failed:', err)
    }
  }

  // 2. Replicate MiniMax 2.5 (~$0.15/song)
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      console.log('[MusicGen] Trying Replicate MiniMax 2.5...')
      return await startReplicate(req)
    } catch (err) {
      console.warn('[MusicGen] Replicate failed:', err)
    }
  }

  // 3. AIML MiniMax 2.0
  if (process.env.AIML_API_KEY) {
    try {
      console.log('[MusicGen] Trying AIML MiniMax 2.0...')
      return await startAIML(req)
    } catch (err) {
      console.warn('[MusicGen] AIML failed:', err)
    }
  }

  return {
    requestId: '',
    provider: 'wavespeed',
    model: 'none',
    status: 'error',
    error: 'No music generation API keys configured. Set WAVESPEED_API_KEY, REPLICATE_API_TOKEN, or AIML_API_KEY.',
  }
}

/**
 * Poll any provider by requestId + provider name.
 */
export async function pollMusic(requestId: string, provider: 'wavespeed' | 'replicate' | 'aiml'): Promise<MusicGenResult> {
  switch (provider) {
    case 'wavespeed': return pollWaveSpeed(requestId)
    case 'replicate': return pollReplicate(requestId)
    case 'aiml': return pollAIML(requestId)
  }
}
