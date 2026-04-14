import { NextRequest, NextResponse } from 'next/server'
import { separateStems } from '@/lib/ai/music-pipeline'

// POST — separate audio into stems (vocals, drums, bass, other)
export async function POST(request: NextRequest) {
  try {
    const { audioUrl } = await request.json()

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 })
    }

    const stems = await separateStems(audioUrl)

    return NextResponse.json({
      success: true,
      stems,
      cost: 0.022,
      provider: 'replicate/demucs',
    })
  } catch (error) {
    console.error('[Music/Separate] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stem separation failed' },
      { status: 500 }
    )
  }
}
