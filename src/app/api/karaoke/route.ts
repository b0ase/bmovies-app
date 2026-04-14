import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// Genre-specific visual styles for karaoke motion graphics
const GENRE_STYLES: Record<string, { colors: string; fontStyle: string; effects: string }> = {
  'Hardcore Punk': { colors: 'hot pink and blood red', fontStyle: 'aggressive scratched graffiti font', effects: 'screen shake, cracks radiating, concrete dust' },
  'Oi! Punk': { colors: 'neon green and hot pink', fontStyle: 'bold stencil military font', effects: 'boot stomp impact, spray paint mist' },
  'Street Punk': { colors: 'hot pink and acid green', fontStyle: 'spray-painted street graffiti font', effects: 'concrete particles, neon sign flicker' },
  'Gothic Punk': { colors: 'deep crimson and ghostly white', fontStyle: 'ornate gothic blackletter font', effects: 'rose petals falling, candle flame flicker, mist' },
  'J-Punk': { colors: 'neon yellow and hot pink', fontStyle: 'Japanese manga impact font', effects: 'speed lines, neon sign buzz' },
  'Pop Punk': { colors: 'hot pink and neon green', fontStyle: 'scratched kawaii-punk font', effects: 'mirror shards falling, razor scratch marks' },
  'Grindcore J-Punk': { colors: 'hot pink and acid green', fontStyle: 'kawaii font corrupting into horror font', effects: 'chainsaw sparks, cherry blossom razor blades' },
  'Anarcho-Punk': { colors: 'royal gold and crimson', fontStyle: 'bold anarchist stencil font', effects: 'gold dust, crown fragments, chain links' },
  'Hardcore': { colors: 'chrome silver and red', fontStyle: 'industrial block font', effects: 'shell casings, chrome sparks, muzzle flash' },
  'Riot Grrrl Punk': { colors: 'blood red and neon cyan', fontStyle: 'hand-scrawled riot zine font', effects: 'paint splatter, torn paper edges' },
  'Industrial Punk': { colors: 'chrome orange and steel', fontStyle: 'hammered industrial font', effects: 'factory sparks, hydraulic press, steam' },
  'Post-Punk New Wave': { colors: 'electric blue and pale pink', fontStyle: 'elegant electrified calligraphy', effects: 'electricity arcs, voltage sparks' },
  'Melodic Hardcore': { colors: 'concrete grey and cherry pink', fontStyle: 'cracked concrete font with flowers growing through', effects: 'concrete dust, sakura petals' },
  'Speed Punk': { colors: 'ninja black and neon purple', fontStyle: 'shadow ninja font with purple edge glow', effects: 'shuriken spinning, smoke bomb' },
  'Noise Punk': { colors: 'glitch neon and red', fontStyle: 'pixelating digital glitch font', effects: 'RGB split, CRT scanlines, pixel explosions' },
  'Garage Punk': { colors: 'fuel orange and hot pink', fontStyle: 'gasoline-dripping font', effects: 'iridescent rainbow sheen, fire ignition' },
  'Punk Ballad': { colors: 'cool blue and white', fontStyle: 'departure board mechanical flip font', effects: 'train station flicker, rain on glass' },
}

const DEFAULT_STYLE = { colors: 'hot pink and neon green', fontStyle: 'aggressive punk font', effects: 'smoke, neon flicker, sparks' }

export async function GET(req: NextRequest) {
  const trackSlug = req.nextUrl.searchParams.get('track')
  if (!trackSlug) return NextResponse.json({ error: 'No track specified' }, { status: 400 })

  // Load lyrics
  let segments: Array<{ start: number; end: number; text: string }> = []
  try {
    const sync = JSON.parse(readFileSync(join(process.cwd(), 'public', 'music', 'lyrics-sync', `${trackSlug}.json`), 'utf-8'))
    segments = sync.segments || []
  } catch {
    return NextResponse.json({ error: 'No lyrics found for this track' }, { status: 404 })
  }

  // Load track info
  let genre = 'Punk'
  let trackTitle = trackSlug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  try {
    // Dynamic import to avoid bundling issues
    const albumsPath = join(process.cwd(), 'src', 'lib', 'albums.ts')
    // Just read genre from the prompt file instead
    const promptPath = join(process.cwd(), 'music', 'prompts')
    const files = require('fs').readdirSync(promptPath)
    const match = files.find((f: string) => f.includes(trackSlug))
    if (match) {
      const content = readFileSync(join(promptPath, match), 'utf-8')
      const styleMatch = content.match(/\*\*Style:\*\*\s*(.+)/i)
      if (styleMatch) genre = styleMatch[1].split(',')[0].trim()
    }
  } catch {}

  const style = Object.entries(GENRE_STYLES).find(([g]) => genre.toLowerCase().includes(g.toLowerCase()))?.[1] || DEFAULT_STYLE

  // Group segments into 5-second clips
  const clips: Array<{ clipNum: number; startTime: number; endTime: number; lyrics: string; prompt: string }> = []
  const trackDuration = segments.length > 0 ? segments[segments.length - 1].end : 120
  const numClips = Math.ceil(trackDuration / 5)

  for (let i = 0; i < numClips; i++) {
    const clipStart = i * 5
    const clipEnd = (i + 1) * 5

    // Find lyrics in this window
    const lyricsInClip = segments
      .filter(s => s.start >= clipStart - 0.5 && s.start < clipEnd + 0.5)
      .map(s => s.text.trim())
      .filter(Boolean)

    const lyricText = lyricsInClip.join(' / ') || '...'
    const isChorus = lyricText.toLowerCase().includes('scream') || lyricText.toLowerCase().includes('shout') || lyricText.toLowerCase().includes('burn')
    const isQuiet = lyricText === '...'

    let prompt: string
    if (i === 0) {
      // Title card
      prompt = `Pure black background. ${style.colors} neon text "${trackTitle.toUpperCase()}" in massive ${style.fontStyle}, ${style.effects}. Motion graphic title card, cinematic, dark, neon lighting on black, 16:9 landscape, 8k quality`
    } else if (isQuiet) {
      // Instrumental break — ambient
      prompt = `Pure black background. Atmospheric abstract motion graphics, ${style.colors} light particles floating slowly, thin horizontal line pulsing to rhythm, subtle ${style.effects}, minimal and breathing, instrumental moment. Motion graphic, cinematic, dark, 16:9 landscape, 8k quality`
    } else if (isChorus) {
      // Chorus — maximum energy
      prompt = `Pure black background. Massive text "${lyricText}" in aggressive ${style.fontStyle}, maximum size filling screen, ${style.colors} with screen shake and strobe, letters breaking apart and reassembling, ${style.effects} at maximum intensity, chorus energy explosion. Motion graphic lyrics, 16:9 landscape, 8k quality`
    } else {
      // Normal verse
      prompt = `Pure black background. Text "${lyricText}" appears in ${style.fontStyle}, ${style.colors} neon glow, ${style.effects}, text animating letter by letter, atmospheric dark background with subtle particles. Motion graphic lyrics, cinematic, 16:9 landscape, 8k quality`
    }

    clips.push({
      clipNum: i + 1,
      startTime: clipStart,
      endTime: clipEnd,
      lyrics: lyricText,
      prompt,
    })
  }

  return NextResponse.json({
    trackSlug,
    trackTitle,
    genre,
    duration: trackDuration,
    style,
    clips,
  })
}
