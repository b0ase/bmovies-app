// Editor Agent — plans the issue and writes the Editor's Letter
// Reads the soul file, generates a unique editorial plan, selects cross-reference characters

import { generateText } from '../text-generation'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { loadSoul } from '@/lib/souls'
import type { MagazineGenerationContext, EditorPlan, ProgressCallback } from './types'

const MAGAZINE_VOICE = `You are the Editor-in-Chief of NPGX Magazine — a counter-culture publication that sits between Vice, Dazed & Confused, and a cyberpunk zine. Your tone is raw, poetic, unapologetic. Short paragraphs. Vivid imagery. You never explain — you reveal.`

export async function runEditor(
  ctx: MagazineGenerationContext,
  onProgress?: ProgressCallback,
): Promise<void> {
  onProgress?.('editor', 'Planning issue...')

  const soul = ctx.primarySoul
  const char = ctx.primaryCharacter

  // Select 2-3 cross-reference characters by category proximity
  const sameCat = NPGX_ROSTER.filter(c => c.category === char.category && c.slug !== ctx.primarySlug)
  const otherCat = NPGX_ROSTER.filter(c => c.category !== char.category && c.slug !== ctx.primarySlug)
  const crossRefs = [
    ...(sameCat.length > 0 ? [sameCat[Math.floor(Math.random() * sameCat.length)]] : []),
    ...(otherCat.length > 0 ? [otherCat[Math.floor(Math.random() * otherCat.length)]] : []),
    ...(otherCat.length > 1 ? [otherCat[Math.floor(Math.random() * otherCat.length)]] : []),
  ].filter((c, i, arr) => arr.findIndex(x => x.slug === c.slug) === i).slice(0, 3)

  // Load cross-ref souls
  for (const ref of crossRefs) {
    try {
      const refSoul = await loadSoul(ref.slug)
      ctx.crossRefSouls.push({ slug: ref.slug, soul: refSoul, character: ref })
    } catch {
      // Soul file missing — still include character data from roster
      ctx.crossRefSouls.push({
        slug: ref.slug,
        soul: null as any,
        character: ref,
      })
    }
  }

  // Ask AI to plan the issue
  const soulJSON = JSON.stringify({
    identity: soul.identity,
    appearance: soul.appearance,
    style: soul.style,
    personality: soul.personality,
  }, null, 2)

  const crossRefNames = crossRefs.map(c => `${c.name} (${c.category}, ${c.tagline})`).join(', ')

  const planResult = await generateText({
    systemPrompt: MAGAZINE_VOICE,
    userPrompt: `Plan a unique magazine issue dedicated to this character:

${soulJSON}

Cross-reference characters: ${crossRefNames}

Respond in valid JSON with this exact structure (no markdown, no code fences):
{
  "issueTitle": "ONE WORD — dramatic, evocative",
  "theme": "2-3 word theme for this issue",
  "mood": "single mood word (raw, electric, haunting, fierce, etc.)",
  "editorLetterAngle": "one sentence — what makes this character's story worth telling",
  "interviewAngle": "one sentence — what question only this character can answer",
  "originAngle": "one sentence — what part of their origin to expand",
  "fictionAngle": "one sentence — what scenario puts this character and ${crossRefs[0]?.name || 'another'} together",
  "styleAngle": "one sentence — what fashion story to tell from their wardrobe",
  "rivalryAngle": "one sentence — the dynamic between ${char.name} and ${crossRefs[1]?.name || crossRefs[0]?.name || 'a rival'}",
  "cityGuideCity": "city name based on character's origin"
}`,
    temperature: 0.9,
    maxTokens: 500,
  })
  ctx.textCalls++
  ctx.totalCost += planResult.cost

  const fallbackTitles = ['VOLTAGE', 'UPRISING', 'NEON', 'INFERNO', 'PHANTOM', 'CHROME', 'SIGNAL', 'FLUX', 'ROGUE', 'BLACKOUT', 'RAZOR', 'ANTHEM']
  let plan: any
  try {
    // Strip any markdown code fences if present
    const cleaned = planResult.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    plan = JSON.parse(cleaned)
  } catch {
    // Fallback plan
    plan = {
      issueTitle: fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)],
      theme: `${char.category} rising`,
      mood: 'fierce',
      editorLetterAngle: `Why ${char.name} matters right now`,
      interviewAngle: `What drives ${char.name}`,
      originAngle: `The streets of ${soul.identity.origin}`,
      fictionAngle: `${char.name} meets ${crossRefs[0]?.name || 'the unknown'}`,
      styleAngle: `${soul.style.aesthetic} decoded`,
      rivalryAngle: `${char.name} vs the system`,
      cityGuideCity: soul.identity.origin.split("'s")[0] || 'Tokyo',
    }
    ctx.errors.push('Editor plan parse failed — using fallback')
  }

  // Build the structured plan
  ctx.editorPlan = {
    issueTitle: plan.issueTitle || fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)],
    theme: plan.theme || char.category,
    mood: plan.mood || 'fierce',
    sections: [
      {
        type: 'editors-letter',
        targetAgent: 'editor',
        character: ctx.primarySlug,
        instructions: plan.editorLetterAngle || `Why ${char.name} matters`,
        wordCount: 300,
      },
      {
        type: 'interview',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: plan.interviewAngle || `The world through ${char.name}'s eyes`,
        wordCount: 500,
      },
      {
        type: 'origin-story',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: plan.originAngle || `From ${soul.identity.origin} to legend`,
        wordCount: 500,
      },
      {
        type: 'style-guide',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: plan.styleAngle || `${soul.style.aesthetic} fashion editorial`,
        wordCount: 400,
      },
      {
        type: 'fiction',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: plan.fictionAngle || `${char.name} in the neon night`,
        wordCount: 600,
      },
      {
        type: 'rivalry-profile',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: plan.rivalryAngle || `${char.name} and ${crossRefs[0]?.name || 'the unknown'}`,
        wordCount: 400,
      },
      {
        type: 'city-guide',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: `Underground guide to ${plan.cityGuideCity || 'Tokyo'}`,
        wordCount: 350,
      },
      {
        type: 'the-wire',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: `Scene news and dispatch from ${soul.identity.origin}`,
        wordCount: 300,
      },
      {
        type: 'the-armoury',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: `Gear, weapons, tech, and kit that ${char.name} uses`,
        wordCount: 300,
      },
      {
        type: 'frequencies',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: `Music, culture, and media that shapes ${char.name}'s world`,
        wordCount: 300,
      },
      {
        type: 'last-rites',
        targetAgent: 'writer',
        character: ctx.primarySlug,
        instructions: `Provocative opinion column in ${char.name}'s voice`,
        wordCount: 250,
      },
    ],
    photos: [
      { character: ctx.primarySlug, shotType: 'hero', mood: plan.mood, setting: 'studio with dramatic lighting', artDirection: 'Magazine cover shot, hero reveal, dramatic' },
      { character: ctx.primarySlug, shotType: 'full-body', mood: plan.mood, setting: 'fashion editorial backdrop', artDirection: 'Full outfit display, high fashion pose' },
      { character: ctx.primarySlug, shotType: 'environmental', mood: plan.mood, setting: soul.identity.origin, artDirection: `In their natural habitat: ${soul.identity.origin}` },
      { character: ctx.primarySlug, shotType: 'night-city', mood: 'electric', setting: 'neon-soaked city streets at night', artDirection: 'Urban nightscape, neon reflections, cinematic' },
      { character: ctx.primarySlug, shotType: 'intimate', mood: 'vulnerable', setting: 'private space, soft lighting', artDirection: 'Close-up beauty shot, emotional, raw' },
      { character: ctx.primarySlug, shotType: 'action', mood: 'explosive', setting: 'combat arena or rooftop', artDirection: `Using ${char.specialties[0] || 'combat skills'}, frozen mid-action` },
      { character: ctx.primarySlug, shotType: 'behind-the-scenes', mood: 'candid', setting: 'backstage / off-duty moment', artDirection: 'Candid, unposed, real moment captured' },
      { character: ctx.primarySlug, shotType: 'signature', mood: plan.mood, setting: `${soul.style.aesthetic} environment`, artDirection: `The definitive ${char.name} shot — ${soul.style.aesthetic} essence` },
      { character: ctx.primarySlug, shotType: 'fashion-spread-1', mood: plan.mood, setting: 'high fashion editorial setting', artDirection: 'Full-page fashion spread, editorial pose, dramatic lighting' },
      { character: ctx.primarySlug, shotType: 'fashion-spread-2', mood: plan.mood, setting: 'contrasting environment', artDirection: 'Fashion spread continuation, different outfit, different energy' },
      { character: ctx.primarySlug, shotType: 'fashion-spread-3', mood: 'sensual', setting: 'intimate luxury setting', artDirection: 'Most explicit shot — lingerie/fetishwear editorial, tasteful but provocative' },
      { character: ctx.primarySlug, shotType: 'centrefold', mood: 'iconic', setting: 'dramatic backdrop, minimal props', artDirection: 'The centrefold — full body, maximum impact, the shot readers pin to their wall' },
    ],
    crossRefCharacters: crossRefs.map(c => ({
      slug: c.slug,
      reason: `${c.category} perspective — ${c.tagline}`,
    })),
  }

  // Write Editor's Letter
  onProgress?.('editor', 'Writing Editor\'s Letter...')
  const letterResult = await generateText({
    systemPrompt: MAGAZINE_VOICE,
    userPrompt: `Write the Editor's Letter for NPGX Magazine Issue "${ctx.editorPlan.issueTitle}" — dedicated to ${char.name}.

Character data:
- Name: ${soul.identity.name}
- Tagline: ${soul.identity.tagline}
- Bio: ${soul.identity.bio}
- Origin: ${soul.identity.origin}
- Voice: ${soul.personality.voice}
- Traits: ${soul.personality.traits.join(', ')}
- Aesthetic: ${soul.style.aesthetic}
- Category: ${char.category}

Angle: ${plan.editorLetterAngle}

Write 250-300 words. Address the reader directly. Explain why this character demanded their own issue. Reference specific details from their soul data. End with a line that makes the reader turn the page. No title — just the letter body.`,
    temperature: 0.85,
    maxTokens: 600,
  })
  ctx.textCalls++
  ctx.totalCost += letterResult.cost

  ctx.pages.push({
    type: 'article',
    title: 'EDITOR\'S LETTER',
    subtitle: `Issue ${ctx.issueNumber} — ${ctx.editorPlan.issueTitle}`,
    body: letterResult.text,
  })
}
