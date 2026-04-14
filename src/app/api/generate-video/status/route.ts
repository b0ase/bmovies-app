import { NextRequest, NextResponse } from 'next/server'
import { pollVideo } from '@/lib/ai/video-provider'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('id')

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    const result = await pollVideo(requestId)

    return NextResponse.json({
      success: true,
      status: result.status,
      requestId,
      videoUrl: result.videoUrl,
      error: result.error || undefined,
      message: result.error
        ? result.error
        : result.status === 'done'
        ? 'Video ready!'
        : 'Video is being generated...',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to check video status'
    console.error('[video-status] Error:', msg)
    return NextResponse.json({
      success: false,
      status: 'error',
      error: msg,
    }, { status: 500 })
  }
}
