import { NextRequest, NextResponse } from 'next/server'
import { generateMusic, pollMusic, type MusicGenResult } from '@/lib/ai/music-gen'

// POST — start music generation
export async function POST(request: NextRequest) {
  // $402 paywall
  const { checkPaywall } = await import('@/lib/paywall');
  const { response: paywallResponse } = await checkPaywall(request, 'music-gen');
  if (paywallResponse) return paywallResponse;

  try {
    const { character, lyrics, prompt, duration, instrumental } = await request.json()

    if (!character && !lyrics && !prompt) {
      return NextResponse.json({ error: 'Provide character, lyrics, or prompt' }, { status: 400 })
    }

    // Build style prompt from character data or direct prompt
    const stylePrompt = prompt || buildStylePrompt(character)
    const songLyrics = lyrics || (instrumental ? undefined : generateCharacterLyrics(character))

    console.log(`[MusicGen] Starting for ${character?.name || 'custom'}: ${stylePrompt.slice(0, 80)}...`)

    const result = await generateMusic({
      prompt: stylePrompt,
      lyrics: songLyrics,
      duration: duration || 120,
      instrumental: instrumental || false,
    })

    if (result.status === 'error' && !result.requestId) {
      // No providers available — return lyrics-only
      return NextResponse.json({
        success: true,
        song: {
          title: `${character?.name || 'Character'} Theme`,
          artist: 'NPGX AI Music',
          lyrics: songLyrics || '',
          genre: getCharacterGenre(character),
          bpm: getCharacterBPM(character),
          key: getCharacterKey(character),
          duration: `${duration || 120}s`,
          mood: character?.attributes?.personality?.split(',')[0]?.trim() || 'Epic',
          audioUrl: null,
          status: 'lyrics-only',
          isReal: false,
          error: result.error,
        },
        message: `No music API configured. ${result.error}`,
      })
    }

    return NextResponse.json({
      success: true,
      song: {
        title: `${character?.name || 'Character'} Theme`,
        artist: 'NPGX AI Music',
        lyrics: songLyrics || '',
        genre: getCharacterGenre(character),
        bpm: getCharacterBPM(character),
        key: getCharacterKey(character),
        duration: `${duration || 120}s`,
        mood: character?.attributes?.personality?.split(',')[0]?.trim() || 'Epic',
        audioUrl: null,
        requestId: result.requestId,
        provider: result.provider,
        model: result.model,
        status: 'processing',
        isReal: true,
        cost: result.cost,
      },
      message: `Music generation started via ${result.provider} (${result.model})`,
    })
  } catch (error) {
    console.error('[MusicGen] Error:', error)
    return NextResponse.json({ error: 'Failed to generate song' }, { status: 500 })
  }
}

// GET — poll for status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('id')
  const provider = searchParams.get('provider') as 'wavespeed' | 'replicate' | 'aiml'

  if (!requestId || !provider) {
    return NextResponse.json({ error: 'Provide id and provider params' }, { status: 400 })
  }

  try {
    const result = await pollMusic(requestId, provider)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[MusicGen] Poll error:', error)
    return NextResponse.json({
      requestId,
      provider,
      status: 'error',
      error: error instanceof Error ? error.message : 'Poll failed',
    })
  }
}

// ─── Character → Music Style Tags (for ACE-Step `tags` field) ───
// ACE-Step wants concise comma-separated genre/style/instrument tags, not prose.

interface MusicProfile {
  tags: string       // ACE-Step style tags
  genre: string      // Display genre name
  bpm: number
  key: string
}

// Map character category → music profile
const CATEGORY_MUSIC: Record<string, MusicProfile> = {
  cyberpunk: {
    tags: 'cyberpunk, industrial rock, distorted synths, 808 bass, glitchy electronics, female vocalist, aggressive, dark, futuristic, 135 BPM',
    genre: 'Industrial Cyberpunk',
    bpm: 135,
    key: 'D Minor',
  },
  stealth: {
    tags: 'trip hop, dark electronica, minimal beats, deep bass, atmospheric, whispered vocals, shadowy, tense, noir, 95 BPM',
    genre: 'Dark Trip Hop',
    bpm: 95,
    key: 'C# Minor',
  },
  gothic: {
    tags: 'gothic metal, orchestral, pipe organ, heavy guitar riffs, operatic female vocals, dark choir, dramatic, epic, 120 BPM',
    genre: 'Gothic Metal',
    bpm: 120,
    key: 'E Minor',
  },
  elemental: {
    tags: 'electronic rock, powerful drums, distorted guitar, synth layers, female power vocals, anthemic, driving, energetic, 140 BPM',
    genre: 'Electronic Rock',
    bpm: 140,
    key: 'A Minor',
  },
  mecha: {
    tags: 'industrial metal, mechanical beats, heavy bass drops, distorted vocals, power electronics, aggressive, robotic, crushing, 150 BPM',
    genre: 'Industrial Metal',
    bpm: 150,
    key: 'B Minor',
  },
  arcane: {
    tags: 'dark wave, ethereal synths, ritual drums, haunting female vocals, reverb, mysterious, occult, atmospheric, 110 BPM',
    genre: 'Dark Wave',
    bpm: 110,
    key: 'F Minor',
  },
  street: {
    tags: 'punk rock, fast drums, distorted guitar, screaming vocals, raw energy, garage, rebellious, angry, lo-fi, 175 BPM',
    genre: 'Punk Rock',
    bpm: 175,
    key: 'G Minor',
  },
}

const DEFAULT_PROFILE: MusicProfile = {
  tags: 'rock, electronic, female vocalist, powerful, dark, edgy, cinematic, 130 BPM',
  genre: 'Dark Electronic Rock',
  bpm: 130,
  key: 'D Minor',
}

// Per-character overrides for characters with strong musical identities
const CHARACTER_OVERRIDES: Record<string, Partial<MusicProfile>> = {
  'echo-neonflare': {
    tags: 'EDM, bass music, dubstep drops, heavy sub bass, female MC, rave, dark club, filthy drops, speaker-shaking, 140 BPM',
    genre: 'Bass Music / EDM',
    bpm: 140,
  },
  'vivienne-void': {
    tags: 'dark techno, minimal, pulsing bass, industrial percussion, cold synths, underground club, monochrome, hypnotic, 128 BPM',
    genre: 'Dark Techno',
    bpm: 128,
  },
  'cherryx': {
    tags: 'j-pop punk, kawaii metal, fast drums, cute vocals, distorted guitar, pink energy, chaotic, bubblegum meets hardcore, 170 BPM',
    genre: 'Kawaii Punk',
    bpm: 170,
  },
  'zerodice': {
    tags: 'vaporwave, glitch pop, chopped samples, lo-fi synths, pitched vocals, retro futuristic, dreamy, digital, 100 BPM',
    genre: 'Glitch Pop / Vaporwave',
    bpm: 100,
  },
  'jinx-shadowfire': {
    tags: 'hardcore punk, thrash, blast beats, screaming vocals, chaos, noise rock, maximum aggression, breakneck speed, 190 BPM',
    genre: 'Hardcore Punk',
    bpm: 190,
  },
  'phoenix-darkfire': {
    tags: 'power metal, soaring guitar solo, double bass drums, epic chorus, triumphant, fire imagery, anthemic, heroic, 155 BPM',
    genre: 'Power Metal',
    bpm: 155,
  },
  'nova-bloodmoon': {
    tags: 'symphonic black metal, blast beats, orchestral strings, gothic choir, tremolo picking, dark atmosphere, nocturnal, vampiric, 160 BPM',
    genre: 'Symphonic Black Metal',
    bpm: 160,
  },
  'luna-cyberblade': {
    tags: 'synthwave, retro 80s, analog synths, arpeggiator, neon, driving bassline, outrun, cinematic, nocturnal city, 118 BPM',
    genre: 'Synthwave',
    bpm: 118,
  },
}

function getCharacterMusic(character: any): MusicProfile {
  if (!character) return DEFAULT_PROFILE

  const slug = character.slug || ''
  const category = character.category || ''

  // Check per-character override first
  if (CHARACTER_OVERRIDES[slug]) {
    const base = CATEGORY_MUSIC[category] || DEFAULT_PROFILE
    return { ...base, ...CHARACTER_OVERRIDES[slug] }
  }

  return CATEGORY_MUSIC[category] || DEFAULT_PROFILE
}

function buildStylePrompt(character: any): string {
  const profile = getCharacterMusic(character)
  return profile.tags
}

function generateCharacterLyrics(character: any): string {
  if (!character) return ''

  const name = (character.name || 'Ninja Girl').split(' ')[0] // First name only
  const tagline = character.tagline || 'dangerous and unstoppable'
  const category = character.category || 'cyberpunk'
  const desc = character.description || ''

  // Extract a key action/trait from specialties
  const spec1 = character.specialties?.[0] || 'fighting'
  const spec2 = character.specialties?.[1] || 'destruction'

  // Category-specific lyric templates — these are meant to SOUND like real songs
  const templates: Record<string, string> = {
    cyberpunk: `[Verse 1]
Neon bleeding through the rain
${name} jacking in again
Firewalls crumble, systems break
Every secret hers to take
Download the ghost, upload the pain
Nothing in this city stays the same

[Chorus]
We are the signal in the noise
We are the static, we're the void
${name}, ${name}
Burning through the motherboard
${name}, ${name}
Cut the wire, cut the cord

[Verse 2]
Chrome fingers on the keys
Corporations on their knees
She rewrites the code tonight
Turns their darkness into light
Every camera, every screen
${name} is the ghost machine

[Chorus]
We are the signal in the noise
We are the static, we're the void
${name}, ${name}
Burning through the motherboard
${name}, ${name}
Cut the wire, cut the cord

[Bridge]
They built the cage, she broke the lock
They wrote the rules, she broke the clock
In the network, in the stream
${name} is the fever dream`,

    stealth: `[Verse 1]
Silent footsteps, no one hears
${name} melting through the fears
Shadow dancer, blade in hand
Moving faster than you planned
By the time you see the mark
She's already in the dark

[Chorus]
You won't see her coming
Won't hear her at all
${name} in the shadows
Before the bodies fall
Whisper of a razor
Cold kiss on your skin
By the time you feel it
${name} already wins

[Verse 2]
Counting heartbeats, three, two, one
${spec1} before it's done
Every target, every name
She collects them all the same
Moonlight catching on the steel
Last thing that you'll ever feel

[Bridge]
Don't look behind you
Don't close your eyes
${name} is patient
${name} never dies`,

    gothic: `[Verse 1]
Cathedral shadows, crimson prayer
${name} breathing midnight air
Chains are singing, altar burns
The darkness worships when she turns
Ancient power, modern rage
Writing prophecy on every page

[Chorus]
Rise from the ashes, rise from the grave
${name} was never meant to be saved
Unholy fire, sacred sin
Let the ritual begin
Let the ritual begin

[Verse 2]
Iron communion, blood-red wine
Every demon falls in line
${spec1} — the final hymn
Angels weeping on a limb
Black cathedral, broken glass
All who enter never pass

[Chorus]
Rise from the ashes, rise from the grave
${name} was never meant to be saved
Unholy fire, sacred sin
Let the ritual begin
Let the ritual begin`,

    elemental: `[Verse 1]
Storm clouds gathering overhead
${name} raising from the dead
Thunder cracking, splitting sky
Lightning striking through her eyes
Every element obeys
The girl who sets the world ablaze

[Chorus]
She's the thunder, she's the flame
Nothing's ever been the same
${name} — force of nature, force of will
${name} — and the world is standing still
Standing still

[Verse 2]
Earthquake rumbling underground
${spec1} shaking down the town
Tidal waves and walls of fire
${name} takes it even higher
Can't contain what can't be held
All resistance just gets melted

[Bridge]
They tried to chain the hurricane
They tried to bottle all the rain
But you can't cage the wildfire
${name} burns a thousand times higher`,

    mecha: `[Verse 1]
Steel fist crashing through the wall
${name} answers every call
Servos screaming, pistons pump
Machine heart with a human thump
Locked and loaded, armed to teeth
War machine that never sleeps

[Chorus]
Metal bones and iron will
${name} born to fight and kill
Crushing everything in sight
Mecha warrior of the night
No surrender, no retreat
${name} never tastes defeat

[Verse 2]
Reactor burning in her chest
${spec1} puts them all to rest
Missile lock and target down
${name} leveling the ground
Smoke and fire, dust and steel
This is power you can feel`,

    arcane: `[Verse 1]
Candles flickering in the void
${name} speaks and worlds destroyed
Binary spells and silicon runes
Summoning digital monsoons
Every incantation hits
Where the code and magic sits

[Chorus]
Hex and algorithm combined
${name} rewrites space and time
Dark enchantment, circuit board
She's the only one adored
Whisper the forbidden name
Nothing ever stays the same

[Verse 2]
${spec1} — the ancient way
Coded for the modern day
Crimson wires drawing tight
Binding darkness into light
Every spell she ever cast
Burns the future, haunts the past`,

    street: `[Verse 1]
Concrete jungle, spray paint queen
${name} on the midnight scene
Broken bottles, busted lights
Every alley's hers tonight
Middle finger to the man
Tear it all down — that's the plan

[Chorus]
Burn it down, burn it down
${name} owns this rotten town
Smash the glass and light the fuse
Nothing left for us to lose
Burn it down, burn it down
Hear the sirens, hear the sound
We don't kneel and we don't pray
${name} does it her own way

[Verse 2]
Tattoo needles, leather skin
Chaos is her discipline
${spec1} in the parking lot
Giving everything she's got
Cops are coming, who gives a damn
${name} doesn't give a damn

[Bridge]
They said be quiet, they said behave
${name} is digging her own grave
But she'll climb out and light the match
This city's ashes — no way back`,
  }

  return templates[category] || templates.cyberpunk
}

function getCharacterGenre(character: any): string {
  return getCharacterMusic(character).genre
}

function getCharacterBPM(character: any): number {
  return getCharacterMusic(character).bpm
}

function getCharacterKey(character: any): string {
  return getCharacterMusic(character).key
}
