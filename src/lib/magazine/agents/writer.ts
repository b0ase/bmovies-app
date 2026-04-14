// Writer Agent — processes section assignments from the Editor
// Each article is driven by soul data and the editor's unique brief

import { generateText } from '../text-generation'
import type { MagazineGenerationContext, SectionAssignment, ProgressCallback } from './types'

const MAGAZINE_VOICE = `You write for NPGX Magazine — a counter-culture publication that sits between Vice, Dazed & Confused, and a cyberpunk zine. Raw, poetic, unapologetic. Short paragraphs. Vivid imagery. No filler. Every sentence earns its place.`

export async function runWriter(
  ctx: MagazineGenerationContext,
  onProgress?: ProgressCallback,
): Promise<void> {
  if (!ctx.editorPlan) throw new Error('Writer needs editor plan')

  const writerSections = ctx.editorPlan.sections.filter(s => s.targetAgent === 'writer')
  const soul = ctx.primarySoul
  const char = ctx.primaryCharacter

  for (const section of writerSections) {
    onProgress?.('writer', `Writing ${section.type}...`)

    const page = await writeSection(section, ctx)
    ctx.pages.push(page)
  }

  async function writeSection(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const crossRefs = ctx.crossRefSouls

    switch (section.type) {
      case 'interview':
        return writeInterview(section, ctx)
      case 'origin-story':
        return writeOriginStory(section, ctx)
      case 'style-guide':
        return writeStyleGuide(section, ctx)
      case 'fiction':
        return writeFiction(section, ctx)
      case 'rivalry-profile':
        return writeRivalryProfile(section, ctx)
      case 'city-guide':
        return writeCityGuide(section, ctx)
      case 'the-wire':
        return writeTheWire(section, ctx)
      case 'the-armoury':
        return writeTheArmoury(section, ctx)
      case 'frequencies':
        return writeFrequencies(section, ctx)
      case 'last-rites':
        return writeLastRites(section, ctx)
      default:
        return writeGenericArticle(section, ctx)
    }
  }

  async function writeTheWire(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const result = await generateText({
      systemPrompt: `${MAGAZINE_VOICE}\n\nYou write the THE WIRE section — short, punchy news dispatches from the NPGX underground. Think Vice news ticker meets cyberpunk bulletin board.`,
      userPrompt: `Write 5-6 short news items for THE WIRE section of Ninja Punk Girls X Magazine.

Character context: ${soul.identity.name} — ${soul.identity.bio}
Origin: ${soul.identity.origin}
Scene: ${soul.style.aesthetic}

Editor's angle: ${section.instructions}

Format each item as:
HEADLINE (5-8 words, all caps)
2-3 sentences of dispatch. Include dates, locations, specific details. Mix: one event, one rumour, one product drop, one scene update, one controversy, one sighting.

Make it feel like a real underground news feed. Reference specific locations and characters from the NPGX world.`,
      temperature: 0.9,
      maxTokens: 600,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: 'THE WIRE',
      subtitle: 'Dispatches from the Underground',
      body: result.text,
      character: char.name,
    }
  }

  async function writeTheArmoury(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const result = await generateText({
      systemPrompt: `${MAGAZINE_VOICE}\n\nYou write THE ARMOURY — gear reviews, tech breakdowns, and kit guides. Think Wired meets military surplus catalogue meets fetish accessories. Rate items out of 5 skulls.`,
      userPrompt: `Write THE ARMOURY section for Ninja Punk Girls X Magazine, themed around ${soul.identity.name}'s kit.

Character: ${soul.identity.name}
Specialties: ${char.specialties.join(', ')}
Aesthetic: ${soul.style.aesthetic}
Clothing: ${soul.style.clothing.join(', ')}

Editor's angle: ${section.instructions}

Review 4 items. For each:
ITEM NAME (fictional brand)
Rating: X/5 skulls
2-3 sentences — what it is, why it matters, attitude.

Mix: one weapon/tool, one clothing piece, one tech gadget, one accessory. Make brand names sound cyberpunk. Include prices in $NPGX tokens.`,
      temperature: 0.85,
      maxTokens: 500,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: 'THE ARMOURY',
      subtitle: `${soul.identity.name.split(' ')[0]}'s Essential Kit`,
      body: result.text,
      character: char.name,
    }
  }

  async function writeFrequencies(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const result = await generateText({
      systemPrompt: `${MAGAZINE_VOICE}\n\nYou write FREQUENCIES — the culture section. Music reviews, film picks, event listings, media recommendations. Think NME meets Pitchfork meets underground zine.`,
      userPrompt: `Write the FREQUENCIES culture section for Ninja Punk Girls X Magazine, through the lens of ${soul.identity.name}'s world.

Character: ${soul.identity.name}
Aesthetic: ${soul.style.aesthetic}
Origin: ${soul.identity.origin}
Personality: ${soul.personality.traits.join(', ')}

Editor's angle: ${section.instructions}

Include:
LISTENING — 2 album/track recommendations (fictional artists, real genres)
WATCHING — 1 film or series pick
ATTENDING — 1 upcoming event (fictional, with date and venue)
READING — 1 book/zine recommendation

Each entry: title, creator, 2-sentence review with attitude. Make it feel curated by someone who actually lives in this culture.`,
      temperature: 0.85,
      maxTokens: 500,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: 'FREQUENCIES',
      subtitle: 'Culture / Music / Media',
      body: result.text,
      character: char.name,
    }
  }

  async function writeLastRites(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const result = await generateText({
      systemPrompt: `${MAGAZINE_VOICE}\n\nYou write LAST RITES — the back-page opinion column. First person. Provocative. The character speaks directly to the reader. Think Hunter S. Thompson's last paragraph meets a punk manifesto. Short. Sharp. Leaves a mark.`,
      userPrompt: `Write LAST RITES — the final column in Ninja Punk Girls X Magazine, written in the voice of ${soul.identity.name}.

Character voice: ${soul.personality.voice}
Catchphrases: ${soul.personality.catchphrases.join('; ')}
Traits: ${soul.personality.traits.join(', ')}
Bio: ${soul.identity.bio}

Editor's angle: ${section.instructions}

Write 200-250 words in first person as ${soul.identity.name.split(' ')[0]}. Pick one thing about the world that pisses her off and tear it apart. End with a line that makes the reader close the magazine and stare at the ceiling. Use at least one catchphrase naturally.`,
      temperature: 0.9,
      maxTokens: 400,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: 'LAST RITES',
      subtitle: `${soul.identity.name.split(' ')[0]} Has the Last Word`,
      body: result.text,
      character: char.name,
    }
  }

  async function writeInterview(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const result = await generateText({
      systemPrompt: `${MAGAZINE_VOICE}

You are writing an exclusive interview for NPGX Magazine. The interviewer is cool, sharp, asks real questions. The character responds IN THEIR OWN VOICE.

Character voice: ${soul.personality.voice}
Catchphrases they actually use: ${soul.personality.catchphrases.join('; ')}
Traits: ${soul.personality.traits.join(', ')}`,
      userPrompt: `Write a 400-500 word exclusive interview with ${soul.identity.name}.

Character details:
- Bio: ${soul.identity.bio}
- Origin: ${soul.identity.origin}
- Specialties: ${char.specialties.join(', ')}
- Aesthetic: ${soul.style.aesthetic}
- Clothing: ${soul.style.clothing.join(', ')}
- Distinguishing features: ${soul.appearance.distinguishing}

Editor's angle: ${section.instructions}

Format: Alternating NPGX: and ${soul.identity.name.split(' ')[0].toUpperCase()}: lines. Include a brief setting description at the top (one paragraph, italicized). The character must use at least one of their catchphrases naturally. End with them saying something that leaves the reader wanting more.`,
      temperature: 0.85,
      maxTokens: 800,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: `${soul.identity.name.split(' ')[0].toUpperCase()} SPEAKS`,
      subtitle: `Exclusive Interview — ${ctx.editorPlan!.issueTitle}`,
      body: result.text,
      character: char.name,
    }
  }

  async function writeOriginStory(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const result = await generateText({
      systemPrompt: MAGAZINE_VOICE,
      userPrompt: `Write a 400-500 word narrative origin story for ${soul.identity.name}.

Source material:
- Bio: ${soul.identity.bio}
- Origin: ${soul.identity.origin}
- Age: ${soul.appearance.age}
- Ethnicity: ${soul.appearance.ethnicity}
- Distinguishing: ${soul.appearance.distinguishing}
- Tattoos: ${soul.appearance.tattoos}
- Specialties: ${char.specialties.join(', ')}
- Voice: ${soul.personality.voice}
- Traits: ${soul.personality.traits.join(', ')}

Editor's angle: ${section.instructions}

Write as a narrative feature — third person, present tense, cinematic. Start with a vivid scene from their past. Weave in their appearance details naturally. End with the moment they became who they are. This is not a bio — this is a story.`,
      temperature: 0.85,
      maxTokens: 800,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: `ORIGIN: ${soul.identity.name.split(' ')[0].toUpperCase()}`,
      subtitle: `From ${soul.identity.origin}`,
      body: result.text,
      character: char.name,
    }
  }

  async function writeStyleGuide(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const result = await generateText({
      systemPrompt: MAGAZINE_VOICE,
      userPrompt: `Write a 300-400 word fashion editorial / style guide for ${soul.identity.name}.

Style data:
- Aesthetic: ${soul.style.aesthetic}
- Clothing: ${soul.style.clothing.join(', ')}
- Colors: ${soul.style.colors.join(', ')}
- Makeup: ${soul.style.makeup}
- Hair: ${soul.appearance.hair.color}, ${soul.appearance.hair.style}
- Tattoos: ${soul.appearance.tattoos}
- Piercings: ${soul.appearance.piercings}
- Body type: ${soul.appearance.bodyType}

Editor's angle: ${section.instructions}

Write as a fashion feature. Break it into: THE LOOK (overall vibe), KEY PIECES (specific items with attitude), THE DETAILS (accessories, ink, piercings), STEAL THE STYLE (how readers can channel this look). Make each section 2-3 sentences max. Attitude over information.`,
      temperature: 0.8,
      maxTokens: 600,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: `STYLE FILE: ${soul.identity.name.split(' ')[0].toUpperCase()}`,
      subtitle: `${soul.style.aesthetic} Decoded`,
      body: result.text,
      character: char.name,
    }
  }

  async function writeFiction(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const crossRef = ctx.crossRefSouls[0]
    const crossRefName = crossRef?.character.name || 'a shadowy figure'
    const crossRefSpecialties = crossRef?.character.specialties?.join(', ') || 'unknown abilities'

    const result = await generateText({
      systemPrompt: `${MAGAZINE_VOICE}

You are writing cyberpunk fiction. Think William Gibson meets Tarantino. Short, punchy sentences. Vivid action. Sharp dialogue. Cliffhanger ending. Characters speak in their established voices.

${soul.identity.name}'s voice: ${soul.personality.voice}
${crossRef ? `${crossRefName}'s tagline: ${crossRef.character.tagline}` : ''}`,
      userPrompt: `Write a 500-600 word fiction chapter for NPGX Magazine.

Primary character: ${soul.identity.name} — ${soul.identity.bio}. Specialties: ${char.specialties.join(', ')}.
Secondary character: ${crossRefName} — specialties: ${crossRefSpecialties}.

Editor's angle: ${section.instructions}

Start mid-action. Include at least 4 lines of dialogue. Reference specific character abilities from their soul data. End on a cliffhanger with "To be continued in Issue ${ctx.issueNumber + 1}..."`,
      temperature: 0.9,
      maxTokens: 900,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: ctx.editorPlan!.issueTitle,
      subtitle: `Fiction — Chapter ${ctx.issueNumber}`,
      body: result.text,
    }
  }

  async function writeRivalryProfile(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const rival = ctx.crossRefSouls[1] || ctx.crossRefSouls[0]
    const rivalName = rival?.character.name || 'the unknown'

    const result = await generateText({
      systemPrompt: MAGAZINE_VOICE,
      userPrompt: `Write a 300-400 word rivalry/alliance profile from ${soul.identity.name}'s perspective about ${rivalName}.

${soul.identity.name}: ${soul.identity.bio}. Voice: ${soul.personality.voice}. Category: ${char.category}.
${rivalName}: ${rival?.character.description || 'A mysterious figure from the underground'}. Category: ${rival?.character.category || 'unknown'}.

Editor's angle: ${section.instructions}

Write in first person as ${soul.identity.name.split(' ')[0]}. Use their voice (${soul.personality.voice}). Include specific details about both characters' abilities. Is this respect, hatred, fear, desire, or something more complicated? Make the reader feel the tension between them.`,
      temperature: 0.85,
      maxTokens: 600,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: `${soul.identity.name.split(' ')[0].toUpperCase()} ON ${rivalName.split(' ')[0].toUpperCase()}`,
      subtitle: 'Rivalry Profile',
      body: result.text,
      character: char.name,
    }
  }

  async function writeCityGuide(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const city = section.instructions.replace('Underground guide to ', '') || soul.identity.origin

    const result = await generateText({
      systemPrompt: MAGAZINE_VOICE,
      userPrompt: `Write a 250-350 word underground city guide for ${city} in the style of NPGX Magazine.

This is ${soul.identity.name}'s city — they know it from the inside.
Their origin: ${soul.identity.origin}
Their aesthetic: ${soul.style.aesthetic}

Format as a list: DRINK, EAT, SLEEP, INK, SHOP, SEE, AVOID. Each entry: venue name (fictional), location hint, one-liner with attitude. Include crypto payment refs and cyberpunk elements. Make it feel underground, dangerous, exclusive — like only ${soul.identity.name.split(' ')[0]} could show you this city.`,
      temperature: 0.85,
      maxTokens: 600,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: `CITY GUIDE: ${city.toUpperCase()}`,
      subtitle: `${soul.identity.name.split(' ')[0]}'s Underground`,
      body: result.text,
    }
  }

  async function writeGenericArticle(section: SectionAssignment, ctx: MagazineGenerationContext) {
    const result = await generateText({
      systemPrompt: MAGAZINE_VOICE,
      userPrompt: `Write a ${section.wordCount}-word article about ${soul.identity.name} for NPGX Magazine. Angle: ${section.instructions}. Bio: ${soul.identity.bio}. Voice: ${soul.personality.voice}.`,
      temperature: 0.85,
      maxTokens: section.wordCount * 2,
    })
    ctx.textCalls++
    ctx.totalCost += result.cost

    return {
      type: 'article' as const,
      title: section.type.toUpperCase().replace(/-/g, ' '),
      subtitle: section.instructions,
      body: result.text,
      character: char.name,
    }
  }
}
