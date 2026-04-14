import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

interface CastMember { slug: string; name: string; role: string }

const SCENARIO_CLIPS: Record<string, string[]> = {
  performance: [
    'screaming into microphone mouth wide open aggressive',
    'playing electric guitar aggressive power chords headbanging',
    'drumming fast aggressive snare and cymbal hits sticks blurring',
    'playing bass guitar groove fingers on thick strings body moving',
    'headbanging violently hair flying sweat spraying',
    'crowd surfing horizontal over reaching hands',
    'jumping off stage monitor mid-song fist raised',
    'power stance on stage legs wide arms raised',
    'playing guitar solo single spotlight eyes closed',
    'all band members synchronized headbang wide shot',
  ],
  dance: [
    'dancing aggressively in underground club neon lights',
    'street dancing under neon signs wet Tokyo pavement',
    'rooftop dancing at night city skyline behind',
    'dancing in rain hair plastered neon reflections',
  ],
  romance: [
    'two girls face to face intense eye contact foreheads touching',
    'holding hands walking through neon-lit Tokyo alley at night',
    'sharing a cigarette backstage intimate close-up',
    'nose to nose about to kiss dual colored spotlights',
  ],
  heartbreak: [
    'smashing guitar against wall fragments flying',
    'screaming at sky in pouring rain arms spread',
    'crying in dressing room mirror mascara running',
    'walking away down empty neon street alone',
  ],
  scifi: [
    'walking through street of holographic billboards cyberpunk Tokyo',
    'interfacing with floating holographic screens dark room',
    'riding motorcycle through neon tunnel city lights streaking',
    'standing on skyscraper edge looking down at cyberpunk city',
  ],
  chase: [
    'sprinting through neon Tokyo alley security lights behind',
    'parkour across rooftops jumping between buildings',
    'fight scene in underground club bodies moving fast',
    'motorcycle chase through Tokyo highway neon streaks',
  ],
  'lost-item': [
    'searching frantically through drawers and boxes',
    'running through rain desperately looking around',
    'holding precious found object close to chest eyes closed',
  ],
  backstage: [
    'tuning guitar sitting on amp between songs beer beside',
    'smoking cigarette in concrete backstage corridor',
    'applying makeup in dressing room mirror bare bulb light',
    'collapsed on ratty backstage couch exhausted satisfied',
  ],
  nightlife: [
    'drinking at tiny Tokyo bar counter warm amber light',
    'walking through Kabukicho neon district at night',
    'in convenience store at 3AM harsh fluorescent light',
    'singing in karaoke booth colored lights',
  ],
  rebellion: [
    'spray painting graffiti on wall aggressive strokes',
    'smashing TV screen with baseball bat sparks',
    'standing defiantly on burning car silhouette',
    'ripping posters off wall aggressive',
  ],
}

// Style presets — suffix and negative prompt per visual style
const STYLE_PRESETS: Record<string, { suffix: string; neg: string }> = {
  'music-video': {
    suffix: 'photorealistic photograph, film grain ISO 800, chromatic aberration, shot on Canon EOS R5, raw unedited photograph, concert photography, neon lighting, smoke, 8k quality',
    neg: 'not anime not cartoon not illustration not 3d render not airbrushed not glossy not HDR, not male not masculine',
  },
  'anime': {
    suffix: 'anime style, cel-shaded, vibrant saturated colors, dynamic action pose, detailed anime face, Japanese animation, studio quality, clean linework, dramatic lighting, 4K',
    neg: 'photorealistic, photograph, film grain, blurry, low quality, deformed, western cartoon, 3d render, male, masculine',
  },
  'game': {
    suffix: 'Unreal Engine 5 render, volumetric lighting, ray tracing, subsurface scattering, character portrait, video game cinematic, AAA quality, dramatic rim light, depth of field, 4K',
    neg: 'blurry, low quality, deformed, anime, cartoon, photograph, film grain, male, masculine',
  },
  'cinema': {
    suffix: 'cinematic film still, anamorphic lens flare, Arri Alexa, 35mm film, shallow depth of field, dramatic chiaroscuro lighting, color graded teal and orange, atmospheric haze, movie production quality, 8k',
    neg: 'anime, cartoon, illustration, 3d render, airbrushed, glossy, HDR, male, masculine, bright, overexposed',
  },
  'comic': {
    suffix: 'comic book art style, bold black outlines, halftone dot shading, pop art colors, dynamic composition, manga-influenced, action lines, screen tone, high contrast, ink and color',
    neg: 'photorealistic, photograph, film grain, 3d render, blurry, male, masculine',
  },
  'noir': {
    suffix: 'film noir style, black and white, high contrast, dramatic shadows, venetian blind light, cigarette smoke, vintage 1940s aesthetic, femme fatale, moody atmospheric, silver gelatin print, grain',
    neg: 'color, bright, anime, cartoon, 3d render, male, masculine',
  },
  'vaporwave': {
    suffix: 'vaporwave aesthetic, retro 80s neon, pastel pink and cyan, VHS glitch effects, grid floor, sunset gradient, retro-futuristic, lo-fi, scanlines, nostalgic, dreamy',
    neg: 'photorealistic, dark, gritty, male, masculine, anime',
  },
}

const LENSES = ['24mm f2.8', '35mm f2.8', '50mm f2', '70mm f2.8', '85mm f1.4', '100mm f2.8']

function getSoulPrompt(slug: string): string {
  try {
    const soulPath = join(process.cwd(), 'public', 'souls', `${slug}.json`)
    const soul = JSON.parse(readFileSync(soulPath, 'utf-8'))
    const prefix = soul?.generation?.promptPrefix || ''
    // Always ensure "beautiful" is in there
    if (prefix && !prefix.toLowerCase().includes('beautiful')) {
      return 'beautiful ' + prefix
    }
    return prefix
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { trackSlug, trackTitle, trackJapanese, genre, bpm, albumTitle, cast, scenarios, style, looks } = body as {
    trackSlug: string; trackTitle: string; trackJapanese?: string
    genre: string; bpm: number; albumTitle: string
    cast: CastMember[]; scenarios: string[]; style?: string; looks?: string[]
  }

  const preset = STYLE_PRESETS[style || 'music-video'] || STYLE_PRESETS['music-video']

  // Look suffixes — layered onto style
  const LOOK_SUFFIXES: Record<string, string> = {
    punk: 'punk aesthetic, leather and spikes, aggressive pose, underground venue, dirty sweaty raw',
    rock: 'rock performance, electric guitar, amp stacks, stage lighting, concert energy, sweat and smoke',
    fetish: 'fetish fashion, PVC latex leather, bondage accessories, dark glamour, provocative pose',
    street: 'Tokyo street fashion, urban grit, graffiti walls, neon signs, wet pavement, streetwear',
    glam: 'high fashion editorial, beauty photography, perfect lighting, glamorous, magazine quality',
    bw: 'black and white, high contrast, dramatic shadows, moody atmospheric, grain',
    color: 'vivid saturated colors, neon color palette, bold bright, striking color contrast',
    npgxmag: 'magazine editorial photography, cover shoot quality, fashion editorial',
    missvoid: 'dark gothic editorial, black latex, cathedral lighting, candles, iron textures',
  }

  const looksSuffix = (looks || []).map(l => LOOK_SUFFIXES[l] || '').filter(Boolean).join(', ')
  const CAM = [preset.suffix, looksSuffix].filter(Boolean).join(', ')
  const NEG = preset.neg

  // Load soul prompts for each cast member
  const castWithPrompts = cast.map(c => ({
    ...c,
    soulPrompt: getSoulPrompt(c.slug),
    firstName: c.name.split(' ')[0],
  }))

  // Build segments
  const segments: Array<{ segNum: number; timeRange: string; clipType: string; characters: string[]; prompt: string }> = []
  let segNum = 1

  // Estimate track duration (rough: 3-4 min for punk)
  const estimatedDuration = bpm >= 180 ? 135 : bpm >= 150 ? 160 : 190
  const segDuration = 5 // seconds per clip

  // Gather all clip types from selected scenarios
  const allClipTypes: Array<{ scenario: string; clip: string }> = []
  for (const scenarioId of scenarios) {
    const clips = SCENARIO_CLIPS[scenarioId] || []
    for (const clip of clips) {
      allClipTypes.push({ scenario: scenarioId, clip })
    }
  }

  // Title card
  const titlePrompt = `Pure black background, hot pink neon text "${trackTitle.toUpperCase()}" flickers on in scratched aggressive punk font, cracks radiating from letters${trackJapanese ? `, below in neon green "${trackJapanese}" appears` : ''}, thin white line extends left and right, floating dust particles catching pink and green light, smoke drifting, motion graphic title card, photorealistic neon lighting on black, 16:9 landscape, 8k quality`
  segments.push({ segNum: segNum++, timeRange: '0-5s', clipType: 'title', characters: [], prompt: titlePrompt })

  // Character reveals (one per cast member)
  for (const member of castWithPrompts) {
    const lens = LENSES[Math.floor(Math.random() * LENSES.length)]
    const roleAction = member.role === 'singer' ? 'screaming directly into camera, mouth wide open, tendons in neck visible'
      : member.role === 'guitarist' ? 'playing aggressive power chords on electric guitar, headbanging'
      : member.role === 'bassist' ? 'playing bass guitar, body grooving to rhythm'
      : member.role === 'drummer' ? 'behind drum kit smashing crash cymbal with both sticks overhead'
      : member.role === 'dj' ? 'behind DJ decks, hands on mixer, headphones on one ear'
      : 'stepping out of darkness into spotlight, confrontational stare'

    const prompt = `${member.soulPrompt}, ${roleAction}, underground punk club stage, neon spotlights cutting through smoke, beautiful young woman, female, feminine, ${CAM}, shot on Canon EOS R5 ${lens}, ${NEG}, 16:9 landscape, 8k quality`
    segments.push({
      segNum: segNum++,
      timeRange: `${(segNum - 1) * segDuration}-${segNum * segDuration}s`,
      clipType: 'title-reveal',
      characters: [member.firstName],
      prompt,
    })
  }

  // Main body — interleave performance and scenario clips
  const singer = castWithPrompts.find(c => c.role === 'singer') || castWithPrompts[0]
  const guitarist = castWithPrompts.find(c => c.role === 'guitarist')
  const bassist = castWithPrompts.find(c => c.role === 'bassist')
  const drummer = castWithPrompts.find(c => c.role === 'drummer')

  let clipIdx = 0
  const targetClips = Math.floor(estimatedDuration / segDuration) - segments.length - 2 // leave room for finale

  for (let i = 0; i < targetClips; i++) {
    const clipInfo = allClipTypes[clipIdx % allClipTypes.length]
    clipIdx++

    // Decide which character(s) for this clip
    let chars: typeof castWithPrompts
    const clip = clipInfo.clip

    if (clip.includes('all band') || clip.includes('synchronized')) {
      chars = castWithPrompts
    } else if (clip.includes('two girls') || clip.includes('face to face') || clip.includes('nose to nose')) {
      chars = castWithPrompts.slice(0, 2)
    } else if (clip.includes('guitar') || clip.includes('shredding')) {
      chars = guitarist ? [guitarist] : [castWithPrompts[Math.floor(Math.random() * castWithPrompts.length)]]
    } else if (clip.includes('drum') || clip.includes('sticks')) {
      chars = drummer ? [drummer] : [castWithPrompts[Math.floor(Math.random() * castWithPrompts.length)]]
    } else if (clip.includes('bass')) {
      chars = bassist ? [bassist] : [castWithPrompts[Math.floor(Math.random() * castWithPrompts.length)]]
    } else if (clip.includes('screaming') || clip.includes('singing') || clip.includes('crowd surf') || clip.includes('jumping')) {
      chars = [singer]
    } else {
      // Rotate through cast
      chars = [castWithPrompts[i % castWithPrompts.length]]
    }

    const lens = LENSES[Math.floor(Math.random() * LENSES.length)]
    const charDesc = chars.length > 2
      ? `Wide shot: ${chars.map(c => `${c.soulPrompt.slice(0, 80)}`).join(', ')}`
      : chars.map(c => c.soulPrompt).join(' and ')

    const prompt = chars.length > 2
      ? `${charDesc}, ${clip}, underground punk venue, multiple neon spotlights, heavy smoke, packed crowd, beautiful young women, female, feminine, ${CAM}, shot on Canon EOS R5 ${lens}, ${NEG}, 16:9 landscape, 8k quality`
      : `${charDesc}, ${clip}, underground punk venue, neon spotlights through smoke, beautiful young woman, female, feminine, ${CAM}, shot on Canon EOS R5 ${lens}, ${NEG}, 16:9 landscape, 8k quality`

    const startTime = segments.length * segDuration
    segments.push({
      segNum: segNum++,
      timeRange: `${startTime}-${startTime + segDuration}s`,
      clipType: clipInfo.scenario + ': ' + clip.slice(0, 40),
      characters: chars.map(c => c.firstName),
      prompt,
    })
  }

  // Finale — all together
  const allNames = castWithPrompts.map(c => c.firstName).join(', ')
  const finalePrompt = `Final power stance all members on stage: ${castWithPrompts.map(c => `${c.firstName} (${c.role})`).join(', ')}, ${castWithPrompts.map(c => c.soulPrompt.slice(0, 60)).join(', ')}, all sweating exhausted triumphant, maximum neon all colors, pyro sparks, smoke, crowd hands raised, underground venue, beautiful young women, female, feminine, ${CAM}, shot on Canon EOS R5 24mm f2.8, ${NEG}, 16:9 landscape, 8k quality`
  segments.push({
    segNum: segNum++,
    timeRange: `${(estimatedDuration - 10)}-${estimatedDuration - 5}s`,
    clipType: 'finale',
    characters: castWithPrompts.map(c => c.firstName),
    prompt: finalePrompt,
  })

  // Outro
  const outroPrompt = `High angle overhead, all members collapsed on stage floor breathing heavy, ${allNames}, stage lights fading to single dim spot, smoke dissipating upward, sweat on stage floor, satisfied exhausted smiles, beautiful young women, female, feminine, ${CAM}, shot on Canon EOS R5 35mm f2.8 overhead, ${NEG}, 16:9 landscape, 8k quality`
  segments.push({
    segNum: segNum++,
    timeRange: `${estimatedDuration - 5}-${estimatedDuration}s`,
    clipType: 'outro',
    characters: castWithPrompts.map(c => c.firstName),
    prompt: outroPrompt,
  })

  return NextResponse.json({ segments })
}
