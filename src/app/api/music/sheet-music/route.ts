import { NextRequest, NextResponse } from 'next/server'
import { runFullPipeline } from '@/lib/ai/music-pipeline'

// POST — full pipeline: audio → stems → MIDI → (sheet music data)
// Returns stems + MIDI URLs. Sheet music rendering happens client-side via OSMD.
export async function POST(request: NextRequest) {
  try {
    const { audioUrl, stems: stemsToTranscribe } = await request.json()

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 })
    }

    const result = await runFullPipeline(audioUrl, {
      stemsToTranscribe: stemsToTranscribe || ['vocals', 'bass', 'other'],
    })

    // Estimate total cost
    const stemCount = Object.keys(result.midi).length
    const cost = 0.022 + (stemCount * 0.0024)

    return NextResponse.json({
      success: true,
      stems: result.stems,
      midi: result.midi,
      totalCost: cost,
      providers: {
        separation: 'replicate/demucs',
        transcription: 'replicate/basic-pitch',
      },
      message: `Separated into ${Object.keys(result.stems).length} stems, transcribed ${stemCount} to MIDI. Use MIDI URLs with a MusicXML converter for sheet music rendering.`,
    })
  } catch (error) {
    console.error('[Music/SheetMusic] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pipeline failed' },
      { status: 500 }
    )
  }
}
