import { NextRequest, NextResponse } from 'next/server'
import { assembleVideo, type AssemblyConfig } from '@/lib/video/assembler'
import { readFileSync, unlinkSync } from 'fs'

/**
 * POST /api/video/assemble
 *
 * Assembles video clips with transitions and optional audio.
 * Returns the assembled video file.
 *
 * Body: {
 *   clips: [{ url: string, label?: string }],
 *   audio?: string,
 *   audioVolume?: number,
 *   transition?: 'fade' | 'cut',
 *   transitionDuration?: number,
 *   resolution?: '720p' | '1080p',
 *   orientation?: 'portrait' | 'landscape',
 *   watermark?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clips, audio, audioVolume, transition, transitionDuration, resolution, orientation, watermark } = body

    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json({ error: 'No clips provided' }, { status: 400 })
    }

    if (clips.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 clips per assembly' }, { status: 400 })
    }

    const config: AssemblyConfig = {
      clips: clips.map((c: any) => ({
        url: c.url,
        duration: c.duration,
        label: c.label,
      })),
      audio,
      audioVolume: audioVolume ?? 0.3,
      transition: transition || 'fade',
      transitionDuration: transitionDuration ?? 0.5,
      resolution: resolution || '720p',
      orientation: orientation || 'portrait',
      watermark: watermark || 'NPGX',
      outputFormat: 'mp4',
    }

    const result = await assembleVideo(config)

    // Read the output file and return it
    const videoBuffer = readFileSync(result.outputPath)

    // Clean up
    try { unlinkSync(result.outputPath) } catch {}

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(videoBuffer.length),
        'Content-Disposition': `attachment; filename="npgx-assembled-${Date.now()}.mp4"`,
        'X-NPGX-Clips': String(result.clips),
        'X-NPGX-Duration': String(result.duration.toFixed(1)),
        'X-NPGX-Has-Audio': String(result.hasAudio),
      },
    })
  } catch (err: any) {
    console.error('[Video Assembly]', err.message)
    return NextResponse.json(
      { error: err.message || 'Assembly failed' },
      { status: 500 }
    )
  }
}
