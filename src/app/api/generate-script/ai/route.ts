// POST /api/generate-script/ai
// AI-powered script generation using Grok text completions

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/magazine/text-generation'
import { ROSTER_BY_SLUG } from '@/lib/npgx-roster'

export const maxDuration = 60

interface ScriptRequest {
  title?: string
  characters: string[] // slugs
  format: string
  genre?: string
  duration?: number
  sceneCount?: number
  dialogueStyle?: string
  visualEmphasis?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: ScriptRequest = await req.json()
    const { characters, format, genre, duration, sceneCount, dialogueStyle, visualEmphasis, notes } = body

    if (!characters?.length) {
      return NextResponse.json({ error: 'At least one character required' }, { status: 400 })
    }

    const charDescriptions = characters.map(slug => {
      const c = ROSTER_BY_SLUG[slug]
      return c ? `${c.name} (${c.token}) — ${c.tagline}. ${c.description}` : slug
    }).join('\n')

    const primaryChar = ROSTER_BY_SLUG[characters[0]]
    const title = body.title || `${primaryChar?.name || 'NPGX'}: Untitled`

    const result = await generateText({
      systemPrompt: `You are a professional screenwriter for NPGX — a cyberpunk adult action franchise featuring tattooed Japanese ninja punk girls in a neon-lit dystopian world. Write scripts in proper screenplay format (FADE IN, INT/EXT, character names in CAPS, parentheticals for direction). The tone is raw, aggressive, sexy, violent, and unapologetically punk. These characters are dangerous, seductive, and self-aware. The world is Tokyo 2087 — neon, chrome, rain, underground clubs, rooftop chases, corporate conspiracy. Every scene should have tension — sexual, violent, or both.`,
      userPrompt: `Write a complete ${format || 'Short Film'} script.

TITLE: ${title}
GENRE: ${genre || 'Cyberpunk Action'}
TARGET DURATION: ${duration || 15} minutes
SCENES: ${sceneCount || 8}
DIALOGUE STYLE: ${dialogueStyle || 'Action-packed & Fast-paced'}
VISUAL EMPHASIS: ${visualEmphasis || 'Action sequences & Stunts'}

CHARACTERS:
${charDescriptions}

${notes ? `ADDITIONAL NOTES: ${notes}` : ''}

Write the FULL script with ${sceneCount || 8} scenes. Each scene needs:
- INT/EXT location heading with time of day
- Action/description paragraphs
- Character dialogue with parenthetical direction
- Visual style notes in brackets

Make it cinematic, raw, and true to NPGX. No censorship. These are punk warrior women who fight, fuck, and run the underground. End with a powerful final image.`,
      temperature: 0.9,
      maxTokens: 4000,
    })

    return NextResponse.json({
      success: true,
      script: result.text,
      title,
      genre: genre || 'Cyberpunk Action',
      duration: duration || 15,
      scenes: sceneCount || 8,
      cost: result.cost,
      provider: result.provider,
    })
  } catch (err: any) {
    console.error('AI script generation failed:', err)
    return NextResponse.json({ error: err.message || 'Script generation failed' }, { status: 500 })
  }
}
