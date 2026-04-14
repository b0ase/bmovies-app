import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const character = url.searchParams.get('character')

    // In a real implementation, this would serve actual video content
    // For now, we'll return metadata about the placeholder video
    
    return NextResponse.json({
      id,
      character,
      type: 'placeholder-video',
      message: `Placeholder video for ${character || 'character'}`,
      status: 'ready',
      thumbnail: '/npgx-images/heroes/hero-1.jpg',
      duration: '30 seconds',
      format: 'mp4',
      resolution: '1024x576',
      note: 'This is a placeholder. In production, this would serve actual video content.'
    })

  } catch (error) {
    console.error('Placeholder video error:', error)
    return NextResponse.json(
      { error: 'Failed to serve placeholder video' },
      { status: 500 }
    )
  }
} 