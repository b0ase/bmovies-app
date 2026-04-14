import { NextRequest, NextResponse } from 'next/server'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { SHOT_TEMPLATES, ENVIRONMENTS, ACTIONS, fillPrompt } from '@/lib/npgx-photoshoot-templates'
import type { MagazineIssue, MagazinePage } from '@/lib/npgx-magazines'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min timeout — generating 20+ images takes time

const CITIES = ['Tokyo', 'Bangkok', 'Berlin', 'Seoul', 'Los Angeles', 'London', 'Lagos', 'Mumbai', 'Buenos Aires', 'Taipei']
const FICTION_THEMES = ['The hunt for the 26 keys', 'A betrayal inside the Syndicate', 'The underground tournament', 'A heist at the data vault', 'The ghost signal', 'Escape from Neo-Tokyo']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

async function generateImage(slug: string, additionalPrompt: string, origin: string): Promise<string | null> {
  try {
    console.log(`[MagGen] Image request: ${origin}/api/generate-image-npgx for ${slug}`)
    const res = await fetch(`${origin}/api/generate-image-npgx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, additionalPrompt, width: 1024, height: 1536 }),
    })
    const data = await res.json()
    if (data.success && data.imageUrl) {
      console.log(`[MagGen] Image OK for ${slug}: ${data.imageUrl.slice(0, 60)}...`)
      return data.imageUrl
    }
    console.error(`[MagGen] Image API returned failure for ${slug}:`, data.error || data)
  } catch (err) {
    console.error(`[MagGen] Image gen failed for ${slug}:`, err)
  }
  // Fallback — return null so caller knows generation failed
  console.warn(`[MagGen] ALL providers failed for ${slug}`)
  return null
}

function generateEditorial(type: 'interview' | 'fiction' | 'cityGuide', characters: typeof NPGX_ROSTER): MagazinePage {
  const char = pick(characters)

  if (type === 'interview') {
    const city = pick(CITIES)
    return {
      type: 'article',
      title: `${char.name.split(' ')[0].toUpperCase()} SPEAKS`,
      subtitle: `${city} — Exclusive Interview`,
      body: `We meet ${char.name} at a converted warehouse in ${city}. The walls pulse with projected code.\n\n"The system is a game," she explains, adjusting her neural interface. "And I always win. But it's not about winning anymore. It's about showing others how to play."\n\nHer latest project is distributed, decentralised, and dangerous. Each piece of content is a node in a larger organism. "We're building something that lives and breathes," she says. "Something that can't be shut down because it exists everywhere at once."\n\nWhen asked about the other 25, she smirks. "We're not a team. We're a network. Different nodes, same signal."\n\nHer specialties — ${char.specialties.join(', ')} — make her uniquely suited for what's coming next. But she won't say what that is.\n\n"You'll know when it happens. Everyone will."`,
      character: char.name,
    }
  }

  if (type === 'fiction') {
    const theme = pick(FICTION_THEMES)
    const chars = pickN(characters, 2)
    return {
      type: 'article',
      title: 'THE NEON MOTEL',
      subtitle: `Fiction — ${theme}`,
      body: `The motel sign flickered between pink and dead. ${chars[0].name.split(' ')[0]} pulled the van into the lot and killed the engine.\n\n"This is it?" ${chars[1].name.split(' ')[0]} peeled her face off the window.\n\n"Room 14. The package is under the mattress." ${chars[0].name.split(' ')[0]} checked her phone — encrypted, burner, bought with cash from a machine that no longer existed. "We have forty minutes before the Syndicate knows we're here."\n\n${chars[1].name.split(' ')[0]} cracked her knuckles. The sound was wet, mechanical. "Forty minutes is thirty-nine more than I need."\n\nThe room smelled like cigarettes and regret. Standard issue. Inside the case: twenty-six keys. Each one different. Each one glowing faintly with encrypted data.\n\n"One for each of us," ${chars[0].name.split(' ')[0]} whispered.\n\nThe door handle turned. They weren't alone.\n\nTo be continued...`,
    }
  }

  // cityGuide
  const city = pick(CITIES)
  return {
    type: 'article',
    title: `CITY GUIDE: ${city.toUpperCase()}`,
    subtitle: '48 hours in the electric wasteland',
    body: `DRINK: Neon Venom Bar — Order the "Red Code." Don't ask what's in it.\n\nEAT: Cyber Ramen — 24-hour spot. Pay in crypto. The tonkotsu hits different at 4am.\n\nSLEEP: Capsule Zero — Soundproof pods with neural-link charging. No questions asked. Cash only.\n\nINK: Iron Lotus Studio — Ask for Yuki. Bioluminescent tattoos that glow under UV. 3-month waitlist.\n\nSHOP: VOID Market (location changes weekly — check the encrypted Telegram) — PVC, leather, custom harnesses, modified tech.\n\nSEE: The Fights — Underground combat with augmented fighters. Betting encouraged. Losing is permanent.\n\nAVOID: Anything above ground after 2am. The Syndicate runs facial recognition on every camera. Wear a mask or don't go.`,
  }
}

export async function POST(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const host = req.headers.get('host') || 'localhost:5001'
  const origin = req.headers.get('origin') || `${proto}://${host}`

  const body = await req.json().catch(() => ({}))
  const characterCount = body.characters || 4
  const pagesPerCharacter = body.pagesPerCharacter || 5

  // Pick random characters (prefer ones with hasImages + soul files)
  const eligible = NPGX_ROSTER.filter(c => c.hasImages)
  const selectedChars = pickN(eligible.length >= characterCount ? eligible : NPGX_ROSTER, characterCount)

  // Determine issue number
  const issueNum = body.issueNumber || Math.floor(Math.random() * 900) + 100

  const pages: MagazinePage[] = []
  const allImageUrls: string[] = []
  let totalCost = 0

  // 1. Cover — use first character's hero shot
  console.log(`[MagGen] Starting issue #${issueNum} with ${selectedChars.map(c => c.name.split(' ')[0]).join(', ')}`)

  const coverChar = selectedChars[0]
  const coverPrompt = fillPrompt(SHOT_TEMPLATES[0].promptBase, {
    character: coverChar.name,
    character_description: coverChar.description,
  })
  const coverImage = await generateImage(coverChar.slug, coverPrompt, origin)
  if (!coverImage) {
    return NextResponse.json({
      success: false,
      error: 'Image generation failed — all providers down or out of credits. Check your Grok/Stability/Replicate API keys and credit balances.',
    }, { status: 503 })
  }
  allImageUrls.push(coverImage)

  pages.push({
    type: 'cover',
    image: coverImage,
    title: 'NINJA PUNK GIRLS X',
    subtitle: `ISSUE ${issueNum}`,
  })

  // 2. Contents page
  pages.push({
    type: 'contents',
    title: 'CONTENTS',
    body: `Welcome to Issue ${issueNum} of NINJA PUNK GIRLS X Magazine. Featuring ${selectedChars.map(c => c.name.split(' ')[0]).join(', ')}. ${selectedChars.length * pagesPerCharacter} pages of photoshoots. Fiction. City guides. The underground culture that fuels the rebellion.`,
  })

  // 3. Character photoshoots
  for (const char of selectedChars) {
    const shotTypes = SHOT_TEMPLATES.slice(0, pagesPerCharacter)
    const env = pick(ENVIRONMENTS)
    const action = pick(ACTIONS)

    for (let i = 0; i < shotTypes.length; i++) {
      const shot = shotTypes[i]
      const prompt = fillPrompt(shot.promptBase, {
        character: char.name,
        character_description: char.description,
        environment: env.prompt,
        action_type: action.prompt,
      })

      console.log(`[MagGen] Generating ${char.name.split(' ')[0]} - ${shot.name}...`)
      const imageUrl = await generateImage(char.slug, prompt, origin)
      if (!imageUrl) {
        console.warn(`[MagGen] Skipping ${char.name.split(' ')[0]} - ${shot.name} (generation failed)`)
        continue
      }
      allImageUrls.push(imageUrl)

      pages.push({
        type: 'photoshoot',
        image: imageUrl,
        character: char.name,
        shotType: shot.shotType,
        title: i === 0 ? char.name.toUpperCase() : undefined,
      })
    }

    // After each character's photoshoot, add an editorial piece
    if (char === selectedChars[0]) {
      pages.push(generateEditorial('interview', selectedChars))
    } else if (char === selectedChars[1]) {
      pages.push(generateEditorial('fiction', selectedChars))
    } else if (char === selectedChars[selectedChars.length - 1]) {
      pages.push(generateEditorial('cityGuide', selectedChars))
    }
  }

  // 4. Back cover
  pages.push({
    type: 'back-cover',
    title: 'NEXT ISSUE',
    subtitle: `Issue ${issueNum + 1} — Coming Soon`,
    body: `More characters. More chaos. More of everything you came for. Subscribe for $30/mo and never miss an issue.`,
  })

  // Estimate cost (~$0.07 per Grok image, $0.04 Stability, $0.003 Replicate)
  totalCost = allImageUrls.length * 0.07 // worst case estimate

  const issue: MagazineIssue = {
    id: `issue-${issueNum.toString().padStart(3, '0')}`,
    issue: issueNum,
    title: pick(['VOLTAGE', 'CHAOS', 'SIGNAL', 'OVERRIDE', 'MAINFRAME', 'BLACKOUT', 'FIREWALL', 'DECRYPT', 'FLUX', 'UPRISING', 'PHANTOM', 'ROGUE', 'VENOM', 'INFERNO', 'MIDNIGHT', 'CIRCUIT', 'NERVE', 'SHRAPNEL', 'SYNDICATE', 'UNDERGROUND', 'GENESIS', 'ECLIPSE', 'NEON', 'CHROME', 'RAZOR', 'ANTHEM', 'RIOT', 'PARADOX', 'CATALYST', 'ANOMALY']),
    subtitle: `Auto-Generated Issue`,
    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    price: 10,
    coverImage: coverImage,
    coverLines: [
      `${selectedChars[0].name.split(' ')[0].toUpperCase()} — Exclusive Photoshoot`,
      `${selectedChars[1]?.name.split(' ')[0].toUpperCase() || 'BLADE'} — Behind the Scenes`,
      'Fiction: The Neon Motel',
      `City Guide: ${pick(CITIES)}`,
    ],
    characters: selectedChars.map(c => c.name),
    pageCount: pages.length,
    pages,
    locked: false, // generated issues are unlocked for testing
    previewPages: pages.length,
  }

  console.log(`[MagGen] Issue #${issueNum} complete: ${pages.length} pages, ~$${totalCost.toFixed(2)} estimated cost`)

  return NextResponse.json({
    success: true,
    issue,
    stats: {
      pages: pages.length,
      images: allImageUrls.length,
      estimatedCost: totalCost,
      characters: selectedChars.map(c => ({ name: c.name, slug: c.slug })),
    },
  })
}
