// Marketer Agent — generates cover lines, ad page, and back cover
// Reads completed articles to create compelling teasers

import { generateText } from '../text-generation'
import { NPGX_ROSTER, ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { SOUL_SLUGS } from '@/lib/souls'
import type { MagazineGenerationContext, ProgressCallback } from './types'

export async function runMarketer(
  ctx: MagazineGenerationContext,
  onProgress?: ProgressCallback,
): Promise<void> {
  if (!ctx.editorPlan) throw new Error('Marketer needs editor plan')

  const soul = ctx.primarySoul
  const char = ctx.primaryCharacter

  // Generate cover lines from completed articles
  onProgress?.('marketer', 'Writing cover lines...')
  const articleTitles = ctx.pages
    .filter(p => p.type === 'article')
    .map(p => `${p.title}: ${p.subtitle || ''}`)
    .join('\n')

  const coverResult = await generateText({
    systemPrompt: 'You write magazine cover lines. Punchy, provocative, 5-8 words each. All caps energy. Think Dazed & Confused meets cyberpunk.',
    userPrompt: `Write 5 cover lines for NPGX Magazine Issue "${ctx.editorPlan.issueTitle}" featuring ${soul.identity.name}.

Articles in this issue:
${articleTitles}

Character: ${soul.identity.tagline}
Theme: ${ctx.editorPlan.theme}

Respond with exactly 5 lines, one per line. No numbering, no bullets. First line must feature the character's first name. Make each line tease a different article.`,
    temperature: 0.9,
    maxTokens: 200,
  })
  ctx.textCalls++
  ctx.totalCost += coverResult.cost

  const coverLines = coverResult.text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 3 && l.length < 80)
    .slice(0, 5)

  // Store cover lines — they'll be used when assembling the final issue
  if (ctx.editorPlan) {
    ;(ctx.editorPlan as any).coverLines = coverLines.length >= 4 ? coverLines : [
      `${soul.identity.name.split(' ')[0].toUpperCase()} — ${ctx.editorPlan.issueTitle}`,
      `Exclusive: The ${soul.identity.name.split(' ')[0]} Interview`,
      `Origin Story: ${soul.identity.origin}`,
      `Fiction: ${ctx.editorPlan.theme}`,
      `City Guide: ${soul.identity.origin}`,
    ]
  }

  // Ad page — character-themed NPGX token CTA
  onProgress?.('marketer', 'Creating ad page...')
  const adResult = await generateText({
    systemPrompt: 'You write bold ad copy for a cyberpunk brand. Short, punchy, rebellious. Think Nike meets underground zine.',
    userPrompt: `Write ad copy for an NPGX Magazine ad page themed around ${soul.identity.name}.

Character: ${soul.identity.name} — ${soul.identity.tagline}
Token: ${soul.identity.token}
Aesthetic: ${soul.style.aesthetic}

Write:
1. HEADLINE (3-5 words, all caps energy)
2. BODY (2-3 sentences, max 50 words)
3. CTA (one line, e.g. "Mint ${soul.identity.token} at npgx.website")

Format: HEADLINE on first line, blank line, BODY, blank line, CTA.`,
    temperature: 0.85,
    maxTokens: 200,
  })
  ctx.textCalls++
  ctx.totalCost += adResult.cost

  ctx.pages.push({
    type: 'ad',
    title: `${soul.identity.token} — NPGX`,
    body: adResult.text,
    character: char.name,
  })

  // Second ad page (page 12 in layout)
  onProgress?.('marketer', 'Creating second ad page...')
  const ad2Result = await generateText({
    systemPrompt: 'You write bold ad copy for a cyberpunk brand. Short, punchy, rebellious. Think Nike meets underground zine.',
    userPrompt: `Write a second ad page for NPGX Magazine — this one is a brand/lifestyle ad, not character-specific.

Theme: ${ctx.editorPlan.theme}
Magazine mood: ${ctx.editorPlan.mood}

This is a full-page lifestyle ad for the NPGX brand itself. Think "Join the movement" energy.

Write:
1. HEADLINE (3-5 words, all caps energy)
2. BODY (2-3 sentences, max 50 words)
3. CTA (one line, e.g. "npgx.website — 26 characters. One world.")

Format: HEADLINE on first line, blank line, BODY, blank line, CTA.`,
    temperature: 0.85,
    maxTokens: 200,
  })
  ctx.textCalls++
  ctx.totalCost += ad2Result.cost

  ctx.pages.push({
    type: 'ad',
    title: 'NPGX — THE MOVEMENT',
    body: ad2Result.text,
  })

  // STATIC — reader letters / community page (page 29 in layout)
  onProgress?.('marketer', 'Creating STATIC reader letters page...')
  const staticResult = await generateText({
    systemPrompt: 'You write fictional reader letters for a counter-culture magazine. Each letter is from a different persona — fans, critics, obsessives. Raw, funny, weird, real-feeling. Think Vice reader mail meets cyberpunk forum posts.',
    userPrompt: `Write 4-5 fictional reader letters for the STATIC section of NPGX Magazine, Issue "${ctx.editorPlan.issueTitle}" featuring ${soul.identity.name}.

Each letter should:
- Have a username/handle (cyberpunk-style, e.g. @neon_wraith, @chrome_duchess)
- Be 30-50 words
- Reference previous issues, characters, or NPGX culture
- Range from gushing fan to sarcastic critic to conspiracy theorist

Format each letter as:
@handle — City
Letter text here.

Separate letters with a blank line.`,
    temperature: 0.9,
    maxTokens: 400,
  })
  ctx.textCalls++
  ctx.totalCost += staticResult.cost

  ctx.pages.push({
    type: 'article',
    title: 'STATIC',
    subtitle: 'Transmissions from the community',
    body: staticResult.text,
  })

  // Back cover — tease next issue (next letter's character)
  onProgress?.('marketer', 'Writing back cover...')
  const slugIndex = SOUL_SLUGS.indexOf(ctx.primarySlug as any)
  const nextSlug = SOUL_SLUGS[(slugIndex + 1) % SOUL_SLUGS.length]
  const nextChar = ROSTER_BY_SLUG[nextSlug]

  let nextTeaser: string
  if (nextChar) {
    const teaserResult = await generateText({
      systemPrompt: 'You write magazine teasers. Mysterious, compelling, makes the reader need the next issue.',
      userPrompt: `Write a 50-word teaser for the next issue of NPGX Magazine, which will feature ${nextChar.name}.

Next character: ${nextChar.name} — ${nextChar.tagline}
Category: ${nextChar.category}
Specialties: ${nextChar.specialties.join(', ')}

Make it mysterious. End with "Coming soon." or "Next month."`,
      temperature: 0.85,
      maxTokens: 150,
    })
    ctx.textCalls++
    ctx.totalCost += teaserResult.cost
    nextTeaser = teaserResult.text
  } else {
    nextTeaser = 'The next chapter of NPGX is coming. 26 characters. Infinite chaos. Stay connected.'
  }

  ctx.pages.push({
    type: 'back-cover',
    title: 'NEXT ISSUE',
    subtitle: nextChar ? `${nextChar.name} — Letter ${nextChar.letter}` : 'Coming Soon',
    body: nextTeaser,
  })
}
