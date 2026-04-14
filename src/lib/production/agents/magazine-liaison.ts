// MAGAZINE LIAISON AGENT — generates editorial coverage of the video production
// Input: ctx.script + ctx.shotList + ctx.generatedVideos
// Output: populates ctx.magazineCoverage

import { generateText } from '@/lib/magazine/text-generation'
import type { ProductionContext, ProgressCallback } from '../types'

export async function runMagazineLiaison(ctx: ProductionContext, onProgress?: ProgressCallback) {
  if (!ctx.script) {
    ctx.errors.push('Magazine Liaison: no script to cover')
    return
  }

  onProgress?.('magazine', `Writing editorial coverage of "${ctx.script.title}"...`)

  const char = ctx.primaryCharacter
  const soul = ctx.primarySoul
  const successCount = ctx.generatedVideos.filter(v => v.status === 'done').length

  try {
    const result = await generateText({
      systemPrompt: `You are a journalist for NPGX Magazine covering video productions.
Write in a punchy, editorial style — think Vice meets Vogue meets cyberpunk zine.
Reference specific scenes and production details to make it authentic.

OUTPUT FORMAT: Return valid JSON only (no markdown fences).`,
      userPrompt: `Write editorial coverage for this production:

PRODUCTION: "${ctx.script.title}"
CHARACTER: ${char.name} (${soul.identity.token})
FORMAT: ${ctx.format}
LOGLINE: ${ctx.script.logline}
SCENES: ${ctx.script.scenes.map(s => `${s.sceneNumber}. "${s.title}" — ${s.description}`).join('\n')}
SHOTS GENERATED: ${successCount}/${ctx.generatedVideos.length}
TOTAL COST: $${ctx.totalCost.toFixed(2)}
ERRORS: ${ctx.errors.length > 0 ? ctx.errors.join('; ') : 'None'}

Return JSON:
{
  "headline": "string — magazine headline (punchy, 5-8 words)",
  "behindTheScenes": "string — 200-word behind-the-scenes article about the production process",
  "directorInterview": "string — 200-word mock Q&A with the AI director about creative choices",
  "productionStills": ["string — 3 image generation prompts for behind-the-scenes photos"]
}`,
      temperature: 0.9,
      maxTokens: 1500,
    })

    ctx.textCalls++
    ctx.totalCost += result.cost

    const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    ctx.magazineCoverage = JSON.parse(cleaned)

    onProgress?.('magazine', `Coverage complete: "${ctx.magazineCoverage?.headline}"`)
  } catch (err) {
    const msg = `Magazine Liaison failed: ${err instanceof Error ? err.message : err}`
    ctx.errors.push(msg)
    onProgress?.('magazine', msg)

    // Fallback coverage
    ctx.magazineCoverage = {
      headline: `${char.name.split(' ')[0].toUpperCase()} UNLEASHED`,
      behindTheScenes: `The latest NPGX production, "${ctx.script.title}", brings ${char.name} to life in a ${ctx.format} spanning ${ctx.script.scenes.length} scenes. Shot entirely by AI on the Grok and Wan2.1 pipelines, this production pushed the boundaries of what's possible with synthetic filmmaking. ${successCount} of ${ctx.generatedVideos.length} shots were successfully generated at a total cost of $${ctx.totalCost.toFixed(2)}.`,
      directorInterview: `Q: What was the vision for this production?\nA: We wanted to capture the raw energy of ${char.name} — that ${soul.personality.archetype} quality that makes her unique. The ${ctx.script.logline}\n\nQ: Any challenges?\nA: Content moderation is always a dance. We had ${ctx.errors.length} issues during production. But the shots that landed? Pure cinema.`,
      productionStills: [
        `Behind the scenes photo of film crew in neon-lit cyberpunk studio, monitors showing ${char.name}, photorealistic, 8k`,
        `Director's monitor close-up showing ${char.name} scene playback, neon reflections on screen, cinematic`,
        `Wide shot of production set with lighting rigs and cameras, cyberpunk aesthetic, ${soul.identity.origin} location`,
      ],
    }
  }
}
