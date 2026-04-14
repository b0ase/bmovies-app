import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

export interface WordTimestamp {
  word: string
  start: number
  end: number
}

export interface LyricsSyncResult {
  text: string
  words: WordTimestamp[]
  segments: { id: number; start: number; end: number; text: string }[]
  language: string
  duration: number
}

// POST — transcribe audio to word-level timestamps via Whisper
export async function POST(request: NextRequest) {
  try {
    const { audioUrl } = await request.json()

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 })
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 })
    }

    console.log('[LyricsSync] Starting Whisper transcription for:', audioUrl)

    const output = await replicate.run(
      'openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e',
      {
        input: {
          audio: audioUrl,
          model: 'large-v3',
          language: 'en',
          word_timestamps: true,
          translate: false,
        },
      },
    ) as any

    // Replicate Whisper returns { transcription, segments, detected_language }
    const segments = output?.segments || []
    const words: WordTimestamp[] = []

    for (const seg of segments) {
      if (seg.words) {
        for (const w of seg.words) {
          words.push({
            word: w.word?.trim() || '',
            start: w.start || 0,
            end: w.end || 0,
          })
        }
      }
    }

    const result: LyricsSyncResult = {
      text: output?.transcription || '',
      words,
      segments: segments.map((s: any, i: number) => ({
        id: i,
        start: s.start || 0,
        end: s.end || 0,
        text: s.text?.trim() || '',
      })),
      language: output?.detected_language || 'en',
      duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
    }

    console.log(`[LyricsSync] Done: ${words.length} words, ${segments.length} segments`)

    return NextResponse.json({
      success: true,
      ...result,
      cost: '~$0.003/sec',
      provider: 'replicate/openai-whisper-large-v3',
    })
  } catch (error) {
    console.error('[LyricsSync] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lyrics sync failed' },
      { status: 500 },
    )
  }
}
