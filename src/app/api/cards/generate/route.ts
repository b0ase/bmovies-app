import { NextRequest, NextResponse } from 'next/server'
import { ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { createTradingCard } from '@/lib/trading-cards'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { slug, series } = await req.json()

    if (!slug || !ROSTER_BY_SLUG[slug]) {
      return NextResponse.json({ success: false, error: 'Invalid character slug' }, { status: 400 })
    }

    // Generate a fresh AI image via the existing NPGX pipeline
    const imageRes = await fetch(new URL('/api/generate-image-npgx', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        additionalPrompt: 'trading card portrait, dramatic lighting, upper body shot, detailed face',
      }),
    })

    const imageData = await imageRes.json()
    let imageUrl: string

    if (imageData.success && imageData.imageUrl) {
      imageUrl = imageData.imageUrl
    } else {
      // Fallback to existing character image
      imageUrl = ROSTER_BY_SLUG[slug].image
    }

    // Create card with random variance for unique stats
    const variance = Date.now()
    const card = createTradingCard(slug, imageUrl, {
      series: series || 'GENERATED',
      serialCount: Math.floor(Math.random() * 9999) + 1,
      variance,
    })

    return NextResponse.json({
      success: true,
      card,
      provider: imageData?.provider || 'fallback',
      cost: imageData?.cost || 0,
    })
  } catch (err) {
    console.error('Card generation error:', err)
    return NextResponse.json(
      { success: false, error: 'Card generation failed' },
      { status: 500 }
    )
  }
}
