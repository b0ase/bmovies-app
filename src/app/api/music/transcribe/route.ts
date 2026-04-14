import { NextRequest, NextResponse } from 'next/server'
import { transcribeToMidi } from '@/lib/ai/music-pipeline'

// POST — transcribe audio to MIDI via Basic Pitch
export async function POST(request: NextRequest) {
  try {
    const { audioUrl, stem } = await request.json()

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 })
    }

    const result = await transcribeToMidi(audioUrl, stem)

    return NextResponse.json({
      success: true,
      midiUrl: result.midiUrl,
      stem: result.stem,
      cost: 0.0024,
      provider: 'replicate/basic-pitch',
    })
  } catch (error) {
    console.error('[Music/Transcribe] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'MIDI transcription failed' },
      { status: 500 }
    )
  }
}
