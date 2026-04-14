import { NextRequest, NextResponse } from 'next/server'
import { convertToMusicXml } from '@/lib/ai/music-pipeline'

// POST — convert MIDI URL to MusicXML via music21 on Hetzner
export async function POST(request: NextRequest) {
  try {
    const { midiUrl, title } = await request.json()

    if (!midiUrl) {
      return NextResponse.json({ error: 'midiUrl is required' }, { status: 400 })
    }

    const musicXml = await convertToMusicXml(midiUrl, title)

    return NextResponse.json({
      success: true,
      musicXml,
      provider: 'hetzner/music21',
    })
  } catch (error) {
    console.error('[Music/ToMusicXML] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'MusicXML conversion failed' },
      { status: 500 }
    )
  }
}
