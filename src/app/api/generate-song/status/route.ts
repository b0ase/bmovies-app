import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const generationId = searchParams.get('id')

    if (!generationId) {
      return NextResponse.json(
        { error: 'Generation ID is required' },
        { status: 400 }
      )
    }

    console.log('🎵 Checking music generation status:', generationId)

    // Check if we have AIML API key
    const aimlApiKey = process.env.AIML_API_KEY
    if (!aimlApiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    try {
      // Check MiniMax Music generation status
      const statusUrl = `https://api.aimlapi.com/v2/generate/audio?generation_id=${generationId}`
      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${aimlApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json()
        console.error('❌ MiniMax music status check error:', statusResponse.status, errorData)
        return NextResponse.json(
          { error: `Status check failed: ${statusResponse.status}` },
          { status: statusResponse.status }
        )
      }

      const statusData = await statusResponse.json()
      console.log('🎵 Music generation status:', statusData)

      return NextResponse.json({
        success: true,
        status: statusData.status,
        generationId,
        audioUrl: statusData.audio_file?.url || null,
        fileName: statusData.audio_file?.file_name || null,
        fileSize: statusData.audio_file?.file_size || null,
        progress: statusData.progress || 0,
        message: getStatusMessage(statusData.status),
        data: statusData
      })

    } catch (error) {
      console.error('❌ Music status check error:', error)
      return NextResponse.json(
        { error: 'Failed to check generation status' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Music status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check music status' },
      { status: 500 }
    )
  }
}

function getStatusMessage(status: string): string {
  const messages: { [key: string]: string } = {
    'queued': '⏳ Music generation queued...',
    'processing': '🎵 Composing your theme song...',
    'completed': '✅ Song ready!',
    'failed': '❌ Generation failed',
    'cancelled': '🚫 Generation cancelled'
  }
  
  return messages[status] || `Status: ${status}`
} 