import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultReferenceImage } from '@/lib/ai/wan-video'
import { startVideo, modelForGrade, clipCost, type ContentGrade } from '@/lib/ai/video-provider'
import { saveGeneratedImage } from '@/lib/supabase'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  // $402 paywall — micropayment required
  const { checkPaywall } = await import('@/lib/paywall');
  const { response: paywallResponse } = await checkPaywall(request, 'video-gen');
  if (paywallResponse) return paywallResponse;

  try {
    const body = await request.json()
    const { character, prompt, slug, duration, resolution, orientation, width, height } = body
    // grade determines which model: title/x → Kling, xx → Seedance, xxx → Wan Spicy
    const grade: ContentGrade = body.grade || 'x'
    let { imageUrl } = body

    if (!character && !prompt && !slug) {
      return NextResponse.json({ error: 'Character, prompt, or slug required' }, { status: 400 })
    }

    // Build video prompt from character data or use provided prompt
    let videoPrompt = prompt
    if (!videoPrompt && character) {
      videoPrompt = buildCharacterVideoPrompt(character)
    }
    if (!videoPrompt) {
      videoPrompt = 'Cyberpunk ninja action sequence, neon-lit Tokyo rooftop, dramatic lighting'
    }

    // Load soul data if slug provided AND no prompt was given
    if (slug && !prompt) {
      try {
        const soulUrl = new URL(`/souls/${slug}.json`, request.url)
        const soulRes = await fetch(soulUrl)
        if (soulRes.ok) {
          const soul = await soulRes.json()
          videoPrompt = `${soul.generation.promptPrefix} ${videoPrompt}. ${soul.generation.promptSuffix}`
        }
      } catch {
        // Continue with existing prompt
      }
    }

    // Resolve image URL
    if (imageUrl && imageUrl.startsWith('/content/')) {
      imageUrl = `https://www.npgx.website${imageUrl}`
    }

    // If imageUrl is base64, save to disk — Atlas Cloud can't fetch data URIs
    if (imageUrl && imageUrl.startsWith('data:image')) {
      try {
        const dir = join(process.cwd(), 'public', 'content', '_temp')
        await mkdir(dir, { recursive: true })
        const filename = `video-ref-${randomUUID().slice(0, 8)}.jpg`
        const buf = Buffer.from(imageUrl.split(',')[1], 'base64')
        await writeFile(join(dir, filename), buf)
        imageUrl = `https://www.npgx.website/content/_temp/${filename}`
      } catch {
        imageUrl = null
      }
    }

    if (!imageUrl) {
      imageUrl = getDefaultReferenceImage(slug)
    }

    // Select model based on content grade
    const model = modelForGrade(grade)
    const dur: 5 | 10 = (duration && duration >= 8) ? 10 : 5
    const cost = clipCost(model, dur)

    console.log(`[video-gen] Grade: ${grade} → ${model.name} ($${cost}) | Prompt: ${videoPrompt.slice(0, 80)}...`)

    // Get session for auto-save
    let userId: string | undefined
    try {
      const session = await getServerSession(authOptions)
      userId = (session?.user as any)?.id
    } catch {}

    try {
      const result = await startVideo({
        model: model.id,
        image: imageUrl,
        prompt: videoPrompt,
        duration: dur,
      })

      // Auto-save video generation record
      if (userId) {
        const charName = character?.name || slug || 'NPGX Character'
        saveGeneratedImage({
          url: '',
          prompt: videoPrompt,
          options: { style: 'video', width: width || 720, height: height || 1280 } as any,
          provider: model.name,
          cost,
          user_id: userId,
          metadata: {
            character_name: charName,
            style: 'video',
            grade,
            model: model.id,
            tags: ['npgx', 'video', grade, charName.toLowerCase()],
          },
        }).catch(err => console.warn('Video auto-save failed:', err))
      }

      return NextResponse.json({
        success: true,
        requestId: result.requestId,
        provider: model.name,
        model: model.id,
        grade,
        status: 'pending',
        message: `Video generation started with ${model.name}. Poll /api/generate-video/status for progress.`,
        estimatedCost: `$${cost.toFixed(3)}`,
      })
    } catch (err) {
      console.error(`[video-gen] ${model.name} error:`, err)
      return NextResponse.json({
        success: false,
        error: err instanceof Error ? err.message : `${model.name} video generation failed`,
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[video-gen] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start video generation',
    }, { status: 500 })
  }
}

function buildCharacterVideoPrompt(character: { name?: string; description?: string; category?: string; tagline?: string }): string {
  const name = character.name || 'Ninja punk girl'
  const category = character.category || 'cyberpunk'

  const scenarios = [
    `${name} slow seductive walk through neon rain, soaking wet, clothes clinging, predatory stare at camera, ${category} aesthetic, dangerous energy, cinematic`,
    `${name} grinding dance in underground club, sweating, hair whipping, tight black outfit, neon smoke, ${category} style, raw energy, cinematic`,
    `${name} crawling toward camera on all fours, predatory eyes, wet hair, gold chains dragging, ${category} aesthetic, hunting prey, cinematic`,
    `${name} straddling motorcycle, leather jacket open, licking lips, staring down camera, headlights behind, ${category} style, punk anthem, cinematic`,
    `${name} throwing aggressive kicks at camera, wild hair flying, rain splashing, ${category} aesthetic, fierce combat, cinematic`,
    `${name} headbanging wildly on stage, sweat flying, crowd below, guitar feedback, ${category} aesthetic, raw chaos, cinematic`,
    `${name} spinning katana slash at camera, sparks flying, combat stance, ${category} powers activating, neon rain, cinematic`,
    `${name} slow motion tongue across lips then middle finger up, punk attitude, smoke and neon, ${category} style, confrontational, cinematic`,
  ]

  return scenarios[Math.floor(Math.random() * scenarios.length)]
}
