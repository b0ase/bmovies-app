import { NextRequest, NextResponse } from 'next/server'
import { assembleVideo, type AssemblyConfig } from '@/lib/video/assembler'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * POST /api/movie-editor/export
 *
 * Export a movie editor timeline to a final assembled video via FFmpeg.
 *
 * Body: {
 *   clips: [{ url: string, duration?: number }]
 *   music?: { url: string, volume?: number }
 *   transition?: 'fade' | 'cut'
 *   transitionDuration?: number
 *   resolution?: '720p' | '1080p'
 *   orientation?: 'portrait' | 'landscape'
 *   watermark?: string
 *   title?: string
 * }
 */
export async function POST(request: NextRequest) {
  // $402 paywall — micropayment required
  const { checkPaywall } = await import('@/lib/paywall');
  const { response: paywallResponse } = await checkPaywall(request, 'movie-export');
  if (paywallResponse) return paywallResponse;

  try {
    const body = await request.json()
    const { clips, music, transition, transitionDuration, resolution, orientation, watermark, title } = body

    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json({ error: 'No clips in timeline' }, { status: 400 })
    }

    if (clips.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 clips per export' }, { status: 400 })
    }

    // Resolve local paths for clips in /public/
    const resolvedClips = clips.map((c: { url: string; duration?: number }) => {
      let url = c.url
      if (url.startsWith('/') && !url.startsWith('//')) {
        // Local path — resolve to filesystem
        const localPath = join(process.cwd(), 'public', url)
        url = localPath
      }
      return { url, duration: c.duration }
    })

    // Resolve music path
    let audioPath: string | undefined
    if (music?.url) {
      if (music.url.startsWith('/') && !music.url.startsWith('//')) {
        audioPath = join(process.cwd(), 'public', music.url)
      } else {
        audioPath = music.url
      }
    }

    const config: AssemblyConfig = {
      clips: resolvedClips,
      audio: audioPath,
      audioVolume: music?.volume ?? 0.4,
      transition: transition || 'fade',
      transitionDuration: transitionDuration ?? 0.5,
      resolution: resolution || '720p',
      orientation: orientation || 'portrait',
      watermark: watermark || (title ? `NPGX — ${title}` : 'NPGX'),
      outputFormat: 'mp4',
    }

    const result = await assembleVideo(config)
    const videoBuffer = readFileSync(result.outputPath)

    // Clean up temp dir (parent of output file)
    try {
      const { execSync } = require('child_process')
      const path = require('path')
      execSync(`rm -rf "${path.dirname(result.outputPath)}"`)
    } catch {}

    const filename = title
      ? `npgx-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.mp4`
      : `npgx-edit-${Date.now()}.mp4`

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(videoBuffer.length),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-NPGX-Clips': String(result.clips),
        'X-NPGX-Duration': String(result.duration.toFixed(1)),
        'X-NPGX-Has-Audio': String(result.hasAudio),
      },
    })
  } catch (err: any) {
    console.error('[Movie Editor Export]', err.message)
    return NextResponse.json(
      { error: err.message || 'Export failed' },
      { status: 500 }
    )
  }
}
