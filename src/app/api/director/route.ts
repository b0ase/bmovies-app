import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

interface CastMember { slug: string; name: string; role: string }

function getSoulPrompt(slug: string): string {
  try {
    const soul = JSON.parse(readFileSync(join(process.cwd(), 'public', 'souls', `${slug}.json`), 'utf-8'))
    const prefix = soul?.generation?.promptPrefix || ''
    return prefix.startsWith('beautiful') || prefix.includes('beautiful') ? prefix : 'beautiful ' + prefix
  } catch { return '' }
}

function getLyrics(trackSlug: string): string {
  try {
    const sync = JSON.parse(readFileSync(join(process.cwd(), 'public', 'music', 'lyrics-sync', `${trackSlug}.json`), 'utf-8'))
    if (sync.segments?.length) {
      return sync.segments.map((s: any) => `[${Math.floor(s.start)}s] ${s.text}`).join('\n')
    }
    return sync.transcription || ''
  } catch { return '' }
}

function getSongPrompt(trackSlug: string): string {
  try {
    return readFileSync(join(process.cwd(), 'music', 'prompts', `${trackSlug.replace(/(\d+)-/, '$1-')}.md`), 'utf-8')
  } catch {
    // Try with track number prefix
    try {
      const files = require('fs').readdirSync(join(process.cwd(), 'music', 'prompts'))
      const match = files.find((f: string) => f.includes(trackSlug))
      if (match) return readFileSync(join(process.cwd(), 'music', 'prompts', match), 'utf-8')
    } catch {}
    return ''
  }
}

const NEG = 'not anime not cartoon not illustration not 3d render not airbrushed not glossy not HDR, not male not masculine'
const CAM = 'photorealistic photograph, film grain ISO 800, chromatic aberration, shot on Canon EOS R5'

export async function POST(req: NextRequest) {
  const { trackSlug, trackTitle, trackJapanese, genre, bpm, duration, cast, style } = await req.json() as {
    trackSlug: string; trackTitle: string; trackJapanese?: string
    genre: string; bpm: number; duration?: number
    cast: CastMember[]; style?: string
  }

  const lyrics = getLyrics(trackSlug)
  const songDesc = getSongPrompt(trackSlug)
  const trackDuration = duration || (bpm >= 180 ? 135 : bpm >= 150 ? 160 : 190)
  const numShots = Math.floor(trackDuration / 5)

  // Build cast descriptions
  const castInfo = cast.map(c => ({
    ...c,
    soulPrompt: getSoulPrompt(c.slug),
    firstName: c.name.split(' ')[0],
  }))

  const castSummary = castInfo.map(c => `${c.firstName} (${c.role}): ${c.soulPrompt.slice(0, 150)}...`).join('\n')

  // Use Anthropic API to generate director's story + shot list
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    // Fallback: generate programmatically without AI
    return generateFallback(trackSlug, trackTitle, trackJapanese, genre, bpm, trackDuration, numShots, castInfo, lyrics)
  }

  const systemPrompt = `You are a music video director for NPGX, a Japanese punk rock content platform. You create cohesive, narrative-driven music videos.

Your job:
1. Read the lyrics and song description
2. Create a simple but compelling STORY MOTIF — one sentence that unifies the whole video
3. Write a shot-by-shot breakdown where every shot serves the story
4. Each shot is 5 seconds of video

Rules:
- The story motif should be SIMPLE: a search, a chase, a transformation, a confrontation, a journey
- Every shot should have SPECIFIC ACTION — not "girl stands on stage" but "Aria kicks open the venue door and storms toward the stage"
- Performance shots (singing, playing instruments) should be intercut with narrative shots
- Title/lyrics cards should appear at key moments
- The emotional arc should match the song structure (build → chorus → calm → finale)
- Characters must be described as beautiful young adult women, feminine
- Camera specs: Canon EOS R5, specific lens per shot
- All shots are 16:9 landscape

Output format (JSON):
{
  "story": "One sentence story motif",
  "description": "2-3 sentence description of what this song is about",
  "shots": [
    {
      "time": "0-5s",
      "lyrics": "lyrics being sung",
      "action": "what happens in this shot",
      "characters": ["FirstName"],
      "camera": "lens and angle description",
      "type": "title|performance|narrative|lyrics"
    }
  ]
}`

  const userPrompt = `Create a music video for:

TRACK: ${trackTitle}${trackJapanese ? ` (${trackJapanese})` : ''}
GENRE: ${genre} | BPM: ${bpm}
DURATION: ${trackDuration}s (${numShots} shots × 5s each)

SONG DESCRIPTION:
${songDesc || 'No description available — infer from lyrics and genre.'}

LYRICS (timed):
${lyrics || 'No lyrics available — create a visual-only narrative.'}

CAST:
${castSummary}

Create exactly ${numShots} shots. Return valid JSON only.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      return generateFallback(trackSlug, trackTitle, trackJapanese, genre, bpm, trackDuration, numShots, castInfo, lyrics)
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return generateFallback(trackSlug, trackTitle, trackJapanese, genre, bpm, trackDuration, numShots, castInfo, lyrics)
    }

    const directorPlan = JSON.parse(jsonMatch[0])

    // Convert shots to full prompts
    const segments = directorPlan.shots.map((shot: any, i: number) => {
      const chars = (shot.characters || []).map((name: string) => {
        const c = castInfo.find(ci => ci.firstName === name)
        return c?.soulPrompt || name
      })

      const charDesc = chars.length > 1
        ? chars.map((c: string) => c.slice(0, 120)).join(', ')
        : chars[0] || castInfo[0]?.soulPrompt || ''

      const prompt = `${charDesc}, ${shot.action}, ${shot.camera || 'dynamic composition'}, underground punk venue, neon lighting, smoke, beautiful young woman, female, feminine, ${CAM}, ${NEG}, 16:9 landscape, 8k quality`

      return {
        segNum: i + 1,
        timeRange: shot.time || `${i * 5}-${(i + 1) * 5}s`,
        clipType: shot.type || 'narrative',
        characters: shot.characters || [],
        lyrics: shot.lyrics || '',
        action: shot.action || '',
        prompt,
      }
    })

    return NextResponse.json({
      story: directorPlan.story,
      description: directorPlan.description,
      segments,
    })
  } catch {
    return generateFallback(trackSlug, trackTitle, trackJapanese, genre, bpm, trackDuration, numShots, castInfo, lyrics)
  }
}

// Fallback when no AI available
function generateFallback(
  trackSlug: string, trackTitle: string, trackJapanese: string | undefined,
  genre: string, bpm: number, duration: number, numShots: number,
  castInfo: Array<CastMember & { soulPrompt: string; firstName: string }>,
  lyrics: string
) {
  const singer = castInfo.find(c => c.role === 'singer') || castInfo[0]
  const guitarist = castInfo.find(c => c.role === 'guitarist')
  const drummer = castInfo.find(c => c.role === 'drummer')
  const bassist = castInfo.find(c => c.role === 'bassist')

  const lyricLines = lyrics.split('\n').filter(l => l.trim())

  const segments = Array.from({ length: numShots }, (_, i) => {
    const t = i * 5
    const lyricLine = lyricLines[i % lyricLines.length] || ''
    const lyricText = lyricLine.replace(/^\[\d+s\]\s*/, '')

    // Determine shot type based on position
    let type: string, action: string, chars: string[]
    const phase = i / numShots

    if (i === 0) {
      type = 'title'
      action = `title card "${trackTitle}" in aggressive punk font, neon pink on black, smoke drifting`
      chars = []
    } else if (phase < 0.15) {
      type = 'narrative'
      action = `walking through neon-lit Tokyo street at night, approaching underground venue, determined expression`
      chars = [singer.firstName]
    } else if (i % 5 === 0) {
      type = 'performance'
      action = `screaming into microphone, aggressive vocal performance, sweat flying, crowd visible`
      chars = [singer.firstName]
    } else if (i % 5 === 1 && guitarist) {
      type = 'performance'
      action = `shredding guitar solo, headbanging, hair flying through colored spotlights`
      chars = [guitarist.firstName]
    } else if (i % 5 === 2 && drummer) {
      type = 'performance'
      action = `drumming aggressive fill, sticks blurring, cymbal crash, sweat spraying`
      chars = [drummer.firstName]
    } else if (i % 5 === 3) {
      type = 'lyrics'
      action = `singing at camera, intimate close-up, lyrics "${lyricText.slice(0, 50)}" visible in expression`
      chars = [singer.firstName]
    } else {
      type = 'narrative'
      const narrativeActions = [
        'running through rain-soaked alley, neon reflections in puddles',
        'spray painting on wall, aggressive strokes, paint mist catching light',
        'standing on rooftop edge looking over city, wind in hair',
        'smashing through door into underground club',
        'crowd surfing over reaching hands, euphoric expression',
        'sitting on amp backstage, tuning guitar, quiet moment',
      ]
      action = narrativeActions[i % narrativeActions.length]
      chars = [castInfo[i % castInfo.length].firstName]
    }

    if (phase > 0.85) {
      type = 'performance'
      action = `final power stance, all band members visible, maximum energy, pyro behind`
      chars = castInfo.map(c => c.firstName)
    }

    const charDesc = chars.map(name => {
      const c = castInfo.find(ci => ci.firstName === name)
      return c?.soulPrompt || name
    }).join(', ')

    const prompt = chars.length === 0
      ? `${action}, photorealistic, neon lighting on black, 16:9 landscape, 8k quality`
      : `${charDesc}, ${action}, underground punk venue, neon lighting, smoke, beautiful young woman, female, feminine, ${CAM}, ${NEG}, 16:9 landscape, 8k quality`

    return {
      segNum: i + 1,
      timeRange: `${t}-${t + 5}s`,
      clipType: type,
      characters: chars,
      lyrics: lyricText,
      action,
      prompt,
    }
  })

  return NextResponse.json({
    story: `${singer.firstName} leads her band through a chaotic night of punk performance and Tokyo street rebellion`,
    description: `A ${genre} music video at ${bpm} BPM. ${singer.firstName} fronts the band through underground venues and neon-lit streets, building from intimate moments to explosive finale.`,
    segments,
  })
}
