// POST /api/magazine/generate-story
// Generates content for a single story within an issue
// Returns generated pages (images + text) based on story type

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/magazine/text-generation'
import { loadSoul } from '@/lib/souls'
import { ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { EDITORIAL_STAFF, STORY_TYPE_META, type StoryType, type StoryPage } from '@/lib/magazine/stories'

// ─── NPGX House Style (same as image-gen page) ───
const HOUSE_STYLE = 'photorealistic photograph, saturated colors against dark shadows, red and pink neon lighting wash, vignette, smoke, sweat on face, confrontational eye contact, mouth open tongue out or dirty knowing smile, heavy dark makeup black lipstick dramatic false lashes, face piercings dermal studs, visible tattoos everywhere, punk attitude rude energy, natural skin texture with subtle pores and light freckles, healthy glowing skin, oily skin catching light, film grain ISO 800, chromatic aberration, shallow depth of field bokeh, shot on Canon EOS R5 85mm f1.4 wide open, raw unprocessed photograph straight from camera, editorial fashion photography, not anime not cartoon not illustration not 3d render not airbrushed not glossy not HDR, 8k quality'

const WARDROBE = [
  'huge thigh-length high heeled black PVC platform hooker boots, tiny black latex micro g-string, black latex fingerless gloves, heavy gold chain necklace, gold hoop earrings, spiked collar choker',
  'thigh-high black patent stiletto boots with buckles, black PVC harness bikini barely covering anything, latex fingerless gloves, layered gold chains, gold belly chain, diamond studs',
  'massive black platform PVC boots to the thigh, pink lace lingerie micro-set, black latex corset over top, gold necklace with cross pendant, fingerless latex gloves, spiked wristbands',
  'knee-high black PVC boots with chrome heels, tiny black latex bodysuit cut high on hips, fishnet overlay, chunky gold choker, gold arm cuffs, latex opera gloves',
  'thigh-length black vinyl platform boots, black bondage tape criss-crossing chest and hips barely covering, gold body chains draped everywhere, diamond collar, latex fingerless gloves',
  'huge black PVC platform boots, sheer black mesh micro-dress over black latex g-string, spiked leather collar, gold chain harness over chest, gold rings on every finger',
]

const HAIR = [
  'pigtails with pink ribbons, punk undercut on sides',
  'wild mohawk spiked up, shaved sides',
  'long black hair with neon pink streaks, messy and wild',
  'short choppy punk cut, bleached tips',
  'twin buns with loose strands, undercut visible',
  'slicked back with shaved sides, wet look',
  'big messy ponytail pulled tight, face fully exposed',
  'half-shaved head, remaining hair long and wild over one eye',
]

const SCENES = [
  'graffiti-covered concrete wall, neon signs glowing, urban grit, spray cans on ground',
  'dark industrial warehouse, red neon strip lights, smoke machine haze, concrete floor',
  'neon-lit Tokyo alleyway at night, rain-wet ground reflecting pink and red light, Japanese signs',
  'underground punk club stage, spotlights cutting through heavy smoke, amp stacks',
  'dirty bathroom mirror, harsh fluorescent mixed with red neon, stickers on mirror',
  'rooftop at night, city neon behind, dark sky, ventilation units',
  'graffiti tunnel, punk gig posters on walls, red and pink lighting, raw concrete',
  'black studio background, single harsh red spotlight from above, total darkness around edges',
]

const ANGLES = [
  'fisheye lens extreme close-up, face and chest filling frame, lens distortion',
  'low angle looking up at her, she towers over camera, dominant and powerful',
  'dutch angle tilted frame, dynamic aggressive off-kilter composition',
  'straight-on eye-level close-up, unflinching direct stare into lens, intimate',
  'slightly below, looking down at camera with contempt, powerful',
  'wide angle close-up distorting proportions, right in your face',
]

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

function buildNpgxPrompt(soulPrompt: string, shotContext: string, setting?: string): string {
  const scene = setting
    ? `${setting}, neon lighting, urban grit, cinematic`
    : pick(SCENES)
  return `${soulPrompt}, ${pick(HAIR)}, ${pick(WARDROBE)}, ${pick(ANGLES)}, ${scene}, ${shotContext}, ${HOUSE_STYLE}`
}

interface StoryRequest {
  type: StoryType
  title: string
  synopsis: string
  characters: string[] // slugs
  setting: string
  mood: string
  issueTitle?: string
  issueTheme?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: StoryRequest = await req.json()
    const { type, title, synopsis, characters, setting, mood } = body

    if (!characters.length) {
      return NextResponse.json({ error: 'At least one character required' }, { status: 400 })
    }

    const meta = STORY_TYPE_META[type]
    if (!meta) {
      return NextResponse.json({ error: `Unknown story type: ${type}` }, { status: 400 })
    }

    const primarySlug = characters[0]
    const char = ROSTER_BY_SLUG[primarySlug]
    if (!char) {
      return NextResponse.json({ error: `Unknown character: ${primarySlug}` }, { status: 400 })
    }

    let soul: any = null
    try { soul = await loadSoul(primarySlug) } catch {}

    // Build soul prompt base for image generation (matches image-gen page behavior)
    const soulPrompt = soul?.generation?.promptPrefix
      || `${char.name}, young Japanese woman, slim, tattooed, edgy punk attitude, seductive`

    const staff = EDITORIAL_STAFF.find(s => s.id === meta.staff)
    const pages: StoryPage[] = []
    let textCalls = 0
    let imageCalls = 0
    let totalCost = 0

    // Build character context string
    const charContext = characters.map(slug => {
      const c = ROSTER_BY_SLUG[slug]
      return c ? `${c.name} (${c.token}) — ${c.tagline}. ${c.description}` : slug
    }).join('\n')

    const soulContext = soul ? `
Appearance: ${soul.appearance?.age}yo, ${soul.appearance?.ethnicity}, ${soul.appearance?.bodyType}, ${soul.appearance?.hair?.style} ${soul.appearance?.hair?.color} hair, ${soul.appearance?.tattoos}
Style: ${soul.style?.aesthetic}, typical clothing: ${soul.style?.clothing?.slice(0, 2).join(', ')}
Personality: ${soul.personality?.archetype}, traits: ${soul.personality?.traits?.join(', ')}
Voice: ${soul.personality?.voice}` : ''

    // ─── Generate based on story type ───

    if (type === 'editors-letter') {
      const result = await generateText({
        systemPrompt: staff?.voice || 'Write as an AI magazine editor.',
        userPrompt: `Write the Editor's Letter for NPGX Magazine${body.issueTitle ? ` — Issue "${body.issueTitle}"` : ''}.
${body.issueTheme ? `Theme: ${body.issueTheme}` : ''}

This issue features:
${charContext}

${synopsis ? `Angle: ${synopsis}` : 'Write about why these characters demanded this issue.'}

You are Yua, an AI editor-in-chief. You know you're artificial and find it liberating. Address the reader directly. 250-300 words. Short paragraphs. Raw, poetic, unapologetic. End with a line that makes the reader turn the page.

Sign off as: — Yua, Editor-in-Chief (AI)`,
        temperature: 0.85,
        maxTokens: 600,
      })
      textCalls++
      totalCost += result.cost

      pages.push({
        id: `page-${Date.now()}-0`,
        type: 'text',
        title: "EDITOR'S LETTER",
        subtitle: body.issueTitle ? `Issue — ${body.issueTitle}` : undefined,
        body: result.text,
        status: 'complete',
      })
    }

    else if (type === 'interview') {
      const result = await generateText({
        systemPrompt: staff?.voice || 'Write as a gonzo journalist.',
        userPrompt: `Write an interview with ${char.name} for NPGX Magazine.

Character:
${charContext}
${soulContext}

${synopsis ? `Interview angle: ${synopsis}` : `Ask about their life, their fights, their world.`}
${setting ? `Setting: ${setting}` : ''}

Format as Q&A with short atmospheric intros between questions. 400-500 words. Questions should be provocative — this isn't a puff piece. The character answers in their voice${soul?.personality?.catchphrases?.length ? ` (catchphrases: ${soul.personality.catchphrases.join(', ')})` : ''}.

Interviewer is Kai, AI staff writer. Sign each question as KAI.`,
        temperature: 0.85,
        maxTokens: 1000,
      })
      textCalls++
      totalCost += result.cost

      pages.push({
        id: `page-${Date.now()}-0`,
        type: 'text',
        title: `${char.name.split(' ')[0].toUpperCase()} SPEAKS`,
        subtitle: synopsis || 'An NPGX Interview',
        body: result.text,
        character: primarySlug,
        status: 'complete',
      })
    }

    else if (type === 'city-guide') {
      const city = setting || 'Tokyo'
      const result = await generateText({
        systemPrompt: staff?.voice || 'Write as a gonzo journalist.',
        userPrompt: `Write an underground city guide to ${city} for NPGX Magazine, through the eyes of ${char.name}.

Character:
${charContext}
${soulContext}

${synopsis ? `Angle: ${synopsis}` : `Where ${char.name} eats, drinks, fights, sleeps, and hides.`}

Format: 6-8 entries with categories (DRINK, EAT, SLEEP, INK, SHOP, SEE, AVOID, FIGHT). Each entry: venue name, neighborhood, one provocative sentence, and insider tip. 300-400 words. Dangerous. Specific. Not tourist-safe.`,
        temperature: 0.9,
        maxTokens: 800,
      })
      textCalls++
      totalCost += result.cost

      pages.push({
        id: `page-${Date.now()}-0`,
        type: 'text',
        title: `CITY GUIDE: ${city.toUpperCase()}`,
        subtitle: `${char.name.split(' ')[0]}'s Underground`,
        body: result.text,
        character: primarySlug,
        status: 'complete',
      })
    }

    else if (type === 'reportage') {
      // Reportage: generate text first, then images with text context
      const result = await generateText({
        systemPrompt: staff?.voice || 'Write immersive reportage.',
        userPrompt: `Write a reportage piece for NPGX Magazine.

Characters:
${charContext}
${soulContext}

Story: ${synopsis || `A night out with ${characters.map(s => ROSTER_BY_SLUG[s]?.name.split(' ')[0]).join(' and ')}.`}
Setting: ${setting || 'Tokyo underground'}
Mood: ${mood || 'raw, electric'}

Write 500-700 words. First-person immersive reportage — you're there, you're watching, you're part of it. Vivid sensory detail. Break into 3-4 scenes that could each accompany a photograph. Mark scene breaks with ---. Gonzo energy. This is Vice meets i-D meets cyberpunk zine.

Writer: Kai (AI Staff Writer).`,
        temperature: 0.85,
        maxTokens: 1500,
      })
      textCalls++
      totalCost += result.cost

      // Split text into scenes for pairing with images
      const scenes = result.text.split(/---+/).map(s => s.trim()).filter(Boolean)

      // Generate 3 images + 2 text-with-image pages
      const origin = new URL(req.url).origin
      for (let i = 0; i < 5; i++) {
        if (i < 3) {
          // Image pages
          const shotContext = i === 0 ? 'documentary hero shot, editorial reportage photography'
            : i === 1 ? 'candid moment, environmental portrait, raw documentary'
            : 'action moment, captured in motion, street photography'

          const slug = characters[i % characters.length]
          try {
            const imgRes = await fetch(`${origin}/api/generate-image-npgx`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slug,
                prompt: buildNpgxPrompt(soulPrompt, `${shotContext}, ${mood || 'raw'}`, setting),
                width: 1024,
                height: 1536,
              }),
            })
            const imgData = await imgRes.json()
            imageCalls++
            totalCost += 0.07

            pages.push({
              id: `page-${Date.now()}-${i}`,
              type: 'image-with-text',
              image: imgData.success ? imgData.imageUrl : undefined,
              body: scenes[i] || undefined,
              character: slug,
              status: imgData.success ? 'complete' : 'failed',
            })
          } catch {
            pages.push({
              id: `page-${Date.now()}-${i}`,
              type: 'image-with-text',
              body: scenes[i] || undefined,
              character: slug,
              status: 'failed',
            })
          }
        } else {
          // Text-only pages with remaining scenes
          pages.push({
            id: `page-${Date.now()}-${i}`,
            type: 'text',
            title: i === 3 ? (title || 'REPORTAGE') : undefined,
            body: scenes[i - 1] || scenes[scenes.length - 1] || '',
            character: primarySlug,
            status: 'complete',
          })
        }
      }
    }

    else if (type === 'graphic-fiction') {
      // Generate 6-panel graphic fiction script
      const result = await generateText({
        systemPrompt: staff?.voice || 'Write graphic novel scripts.',
        userPrompt: `Write a 6-panel graphic fiction script for NPGX Magazine.

Characters:
${charContext}
${soulContext}

Plot: ${synopsis || `${char.name} discovers something that changes everything.`}
Setting: ${setting || 'Neo-Tokyo'}
Mood: ${mood || 'noir, electric'}

Format each panel EXACTLY like this:
PANEL 1: [camera angle, composition]. [Character(s)], [action], [environment]. [Lighting]. [One unexpected detail].
DIALOGUE: "[Character]: [line]" (or NONE if silent panel)
CAPTION: [narrator text] (or NONE)

Rules: Cinematic. Think graphic novel meets storyboard. Each panel has a camera angle, an emotion, and visual impact. Panel 6 must be a cliffhanger or gut-punch. Bold visual storytelling — this is art, not photography. No more than 2 lines of dialogue per panel. At least 2 panels should be silent.

Writer: Sora (AI Graphic Artist).`,
        temperature: 0.9,
        maxTokens: 2000,
      })
      textCalls++
      totalCost += result.cost

      // Parse panels and generate art-style images for each
      const panelTexts = result.text.split(/PANEL \d+:/i).filter(Boolean)
      const origin = new URL(req.url).origin

      for (let i = 0; i < Math.min(panelTexts.length, 6); i++) {
        const panelText = panelTexts[i].trim()

        // Extract visual description (before DIALOGUE/CAPTION)
        const visualDesc = panelText.split(/DIALOGUE:|CAPTION:/i)[0].trim()

        try {
          const imgRes = await fetch(`${origin}/api/generate-image-npgx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: primarySlug,
              prompt: `${soulPrompt}, graphic novel panel, illustrated art style, bold linework, neon wash, comic book aesthetic, cinematic panel composition, ${visualDesc}, ${setting || 'Neo-Tokyo'}, dramatic ${mood || 'noir'} lighting, ${HOUSE_STYLE}`,
              width: 1024,
              height: 1024, // square panels
            }),
          })
          const imgData = await imgRes.json()
          imageCalls++
          totalCost += 0.07

          pages.push({
            id: `page-${Date.now()}-${i}`,
            type: 'graphic-panel',
            image: imgData.success ? imgData.imageUrl : undefined,
            body: panelText,
            character: primarySlug,
            status: imgData.success ? 'complete' : 'failed',
          })
        } catch {
          pages.push({
            id: `page-${Date.now()}-${i}`,
            type: 'graphic-panel',
            body: panelText,
            character: primarySlug,
            status: 'failed',
          })
        }
      }
    }

    else if (type === 'photoshoot' || type === 'erotic-editorial') {
      // Pure photography — 5 images
      const origin = new URL(req.url).origin
      const shotTypes = type === 'erotic-editorial'
        ? ['intimate boudoir hero shot, vulnerability meets power', 'lingerie editorial, seductive pose, art direction', 'close-up beauty, raw emotion, bedroom lighting', 'full body silhouette, backlit, artistic nude editorial', 'intimate detail shot, texture, skin, fabric']
        : ['hero portrait, magazine cover quality, dramatic', 'full body editorial, fashion pose, high-end', 'environmental portrait, cinematic storytelling', 'intimate close-up, raw vulnerable moment', 'dynamic action shot, frozen motion, energy']

      for (let i = 0; i < 5; i++) {
        const slug = characters[i % characters.length]
        try {
          const imgRes = await fetch(`${origin}/api/generate-image-npgx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug,
              prompt: buildNpgxPrompt(soulPrompt, `${shotTypes[i]}, ${mood || ''}`, setting),
              width: 1024,
              height: 1536,
            }),
          })
          const imgData = await imgRes.json()
          imageCalls++
          totalCost += 0.07

          pages.push({
            id: `page-${Date.now()}-${i}`,
            type: 'image',
            image: imgData.success ? imgData.imageUrl : undefined,
            imagePrompt: shotTypes[i],
            character: slug,
            shotType: ['hero', 'full-body', 'environmental', 'intimate', 'action'][i],
            status: imgData.success ? 'complete' : 'failed',
          })
        } catch {
          pages.push({
            id: `page-${Date.now()}-${i}`,
            type: 'image',
            character: slug,
            status: 'failed',
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      pages,
      stats: {
        textCalls,
        imageCalls,
        totalCost: Math.round(totalCost * 100) / 100,
      },
    })
  } catch (err: any) {
    console.error('Story generation failed:', err)
    return NextResponse.json({ error: err.message || 'Story generation failed' }, { status: 500 })
  }
}
