// WRITER AGENT — generates a screenplay/script from character soul data
// Input: character soul + format + optional user brief
// Output: populates ctx.script with scenes, dialogue, action

import { generateText } from '@/lib/magazine/text-generation'
import type { ProductionContext, Script, ProgressCallback } from '../types'

export async function runWriter(ctx: ProductionContext, onProgress?: ProgressCallback) {
  onProgress?.('writer', `Writing ${ctx.format} script for ${ctx.primaryCharacter.name}...`)

  const soul = ctx.primarySoul
  const char = ctx.primaryCharacter

  const formatGuide: Record<string, { scenes: number; duration: number; desc: string }> = {
    'short-film': { scenes: 5, duration: 60, desc: '60-second short film with clear arc' },
    'music-video': { scenes: 4, duration: 45, desc: '45-second music video with visual storytelling' },
    'trailer': { scenes: 6, duration: 30, desc: '30-second trailer with hooks and reveals' },
    'episode': { scenes: 8, duration: 120, desc: '2-minute episode with cliffhanger' },
  }

  const guide = formatGuide[ctx.format] || formatGuide['short-film']

  const systemPrompt = `You are a screenwriter for NPGX — a cyberpunk anime-influenced production studio.
You write scripts for AI-generated video productions featuring the NPGX character roster.

RULES:
- Every scene must be VISUALLY describable (AI video generators can't read dialogue)
- Action beats matter more than dialogue — show, don't tell
- Each scene needs a clear visual concept that translates to a single video generation prompt
- Keep scenes between 3-15 seconds each
- Total duration target: ${guide.duration} seconds across ${guide.scenes} scenes
- Genre: cyberpunk, noir, transgressive, editorial fashion
- The character should feel powerful, dangerous, and magnetic

OUTPUT FORMAT: Return valid JSON only (no markdown fences).`

  const userPrompt = `Write a ${guide.desc} for:

CHARACTER: ${char.name}
TOKEN: ${soul.identity.token}
TAGLINE: ${soul.identity.tagline}
BIO: ${soul.identity.bio}
ORIGIN: ${soul.identity.origin}
APPEARANCE: ${soul.appearance.face}. Hair: ${soul.appearance.hair?.color} ${soul.appearance.hair?.style}. Eyes: ${soul.appearance.eyes?.color}. Body: ${soul.appearance.bodyType}. Tattoos: ${Array.isArray(soul.appearance.tattoos) ? soul.appearance.tattoos.join(', ') : (soul.appearance.tattoos || 'none')}.
STYLE: ${soul.style.aesthetic}. Colors: ${soul.style.colors?.join(', ')}.
PERSONALITY: ${soul.personality.archetype}. Traits: ${soul.personality.traits?.join(', ')}.
${ctx.userBrief ? `\nDIRECTOR'S BRIEF: ${ctx.userBrief}` : ''}

Return JSON:
{
  "title": "string — production title",
  "logline": "string — one sentence hook",
  "genre": "string",
  "totalDuration": number,
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "string — scene title",
      "location": "string — specific place",
      "timeOfDay": "NIGHT",
      "characters": ["${char.slug}"],
      "description": "string — what we SEE (2-3 sentences, purely visual)",
      "action": ["string — beat 1", "string — beat 2"],
      "dialogue": [{"character": "${char.name}", "line": "string", "direction": "string"}],
      "duration": number,
      "mood": "string — emotional tone",
      "visualStyle": "string — cinematic reference"
    }
  ]
}`

  try {
    const result = await generateText({
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxTokens: 2000,
    })

    ctx.textCalls++
    ctx.totalCost += result.cost

    // Parse JSON from response
    const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const script: Script = JSON.parse(cleaned)

    // Validate and clamp
    if (!script.scenes || script.scenes.length === 0) {
      throw new Error('Script has no scenes')
    }

    ctx.script = script
    onProgress?.('writer', `Script complete: "${script.title}" — ${script.scenes.length} scenes, ${script.totalDuration}s`)
  } catch (err) {
    const msg = `Writer failed: ${err instanceof Error ? err.message : err}`
    ctx.errors.push(msg)
    onProgress?.('writer', msg)

    // Fallback: minimal script
    ctx.script = {
      title: `${char.name}: Emergence`,
      logline: `${char.name} emerges from the neon shadows of ${soul.identity.origin}.`,
      genre: 'cyberpunk',
      totalDuration: 30,
      scenes: [
        {
          sceneNumber: 1,
          title: 'The Arrival',
          location: `Neon alleyway, ${soul.identity.origin}`,
          timeOfDay: 'NIGHT',
          characters: [char.slug],
          description: `${char.name} steps out of shadows into neon light. Rain glistens on her skin. She looks directly at camera.`,
          action: ['Steps forward from darkness', 'Turns to face camera', 'Subtle smile'],
          dialogue: [],
          duration: 10,
          mood: 'mysterious, powerful',
          visualStyle: 'Blade Runner meets fashion editorial',
        },
        {
          sceneNumber: 2,
          title: 'The Power',
          location: `Rooftop overlooking ${soul.identity.origin}`,
          timeOfDay: 'NIGHT',
          characters: [char.slug],
          description: `${char.name} stands on a rooftop, city lights behind her. Wind catches her hair. She radiates confidence.`,
          action: ['Wind catches hair', 'Looks over city', 'Clenches fist'],
          dialogue: [],
          duration: 10,
          mood: 'powerful, commanding',
          visualStyle: 'cinematic wide shot, cyberpunk',
        },
        {
          sceneNumber: 3,
          title: 'The Signature',
          location: 'Close-up, abstract background',
          timeOfDay: 'NIGHT',
          characters: [char.slug],
          description: `Extreme close-up of ${char.name}'s face. Eyes lock with camera. A knowing look. Cut to black.`,
          action: ['Eyes meet camera', 'Slight tilt of head', 'Fade to black'],
          dialogue: [],
          duration: 10,
          mood: 'intimate, intense',
          visualStyle: 'portrait, shallow depth of field',
        },
      ],
    }
    onProgress?.('writer', 'Using fallback script')
  }
}
