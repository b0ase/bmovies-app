// SHOT DIRECTOR AGENT — converts script scenes into detailed shot briefs with video prompts
// Input: ctx.script (from Writer)
// Output: populates ctx.shotList with generation-ready prompts

import { generateText } from '@/lib/magazine/text-generation'
import { buildGenerationPrompt } from '@/lib/souls'
import type { ProductionContext, ShotBrief, ProgressCallback } from '../types'

export async function runShotDirector(ctx: ProductionContext, onProgress?: ProgressCallback) {
  if (!ctx.script) {
    ctx.errors.push('Shot Director: no script available')
    return
  }

  onProgress?.('shot-director', `Breaking ${ctx.script.scenes.length} scenes into shots...`)

  const soul = ctx.primarySoul
  const char = ctx.primaryCharacter
  const soulPrompt = buildGenerationPrompt(soul, '')

  // Process each scene
  for (const scene of ctx.script.scenes) {
    onProgress?.('shot-director', `Scene ${scene.sceneNumber}: ${scene.title}`)

    try {
      const result = await generateText({
        systemPrompt: `You are a Shot Director for NPGX video productions.
You break screenplay scenes into individual shots, each becoming a single AI video generation.

CRITICAL RULES:
- Each shot = ONE video generation prompt (5-10 seconds)
- Prompts must be SELF-CONTAINED (the AI has no context between shots)
- Always include character description in every prompt
- Always include setting, lighting, mood in every prompt
- Use photorealistic style — NOT anime, NOT cartoon, NOT 3D render
- Prompts should be 1-3 sentences, dense with visual detail
- Include camera direction (close-up, wide, tracking, etc)

CHARACTER VISUAL: ${soulPrompt}

OUTPUT FORMAT: Return valid JSON only (no markdown fences).`,
        userPrompt: `Break this scene into 1-3 shots:

SCENE ${scene.sceneNumber}: "${scene.title}"
LOCATION: ${scene.location}
TIME: ${scene.timeOfDay}
DESCRIPTION: ${scene.description}
ACTION: ${scene.action.join('. ')}
MOOD: ${scene.mood}
VISUAL STYLE: ${scene.visualStyle}
TOTAL DURATION: ${scene.duration}s

Return JSON array:
[{
  "shotNumber": 1,
  "shotType": "establishing|close-up|medium|wide|action|reaction|transition",
  "concept": "what story this shot tells (1 sentence)",
  "action": "what happens (1 sentence)",
  "dialogue": [],
  "lighting": "specific lighting description",
  "camera": "lens + angle + framing",
  "mood": "emotional tone",
  "colorPalette": "dominant colors",
  "reference": "think X meets Y",
  "duration": number,
  "videoPrompt": "FULL self-contained prompt for AI video generation. Must include character description, setting, action, style. 2-3 sentences max."
}]`,
        temperature: 0.7,
        maxTokens: 1500,
      })

      ctx.textCalls++
      ctx.totalCost += result.cost

      const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const shots: ShotBrief[] = JSON.parse(cleaned)

      // Enrich each shot
      for (const shot of shots) {
        shot.sceneNumber = scene.sceneNumber
        shot.character = char.slug

        // Enhance video prompt with soul data if not already rich
        if (shot.videoPrompt && !shot.videoPrompt.includes(char.name)) {
          shot.videoPrompt = `${char.name}, ${soulPrompt}, ${shot.videoPrompt}`
        }

        // Append quality tags
        if (!shot.videoPrompt.includes('8k')) {
          shot.videoPrompt += ', photorealistic, cinematic lighting, 8k'
        }

        ctx.shotList.push(shot)
      }

      onProgress?.('shot-director', `Scene ${scene.sceneNumber}: ${shots.length} shots`)
    } catch (err) {
      const msg = `Shot Director scene ${scene.sceneNumber} failed: ${err instanceof Error ? err.message : err}`
      ctx.errors.push(msg)
      onProgress?.('shot-director', msg)

      // Fallback: one shot per scene using scene description directly
      ctx.shotList.push({
        sceneNumber: scene.sceneNumber,
        shotNumber: 1,
        shotType: 'wide',
        concept: scene.description,
        character: char.slug,
        action: scene.action[0] || scene.description,
        dialogue: [],
        lighting: scene.timeOfDay === 'NIGHT' ? 'neon lighting, dark shadows' : 'natural light, golden hour',
        camera: 'wide shot, cinematic framing',
        mood: scene.mood,
        colorPalette: soul.style.colors?.join(', ') || 'neon red, deep blue',
        reference: scene.visualStyle,
        duration: scene.duration,
        videoPrompt: `${char.name}, ${soulPrompt}, ${scene.description}, ${scene.location}, ${scene.mood}, photorealistic, cinematic lighting, 8k`,
      })
    }
  }

  onProgress?.('shot-director', `Shot list complete: ${ctx.shotList.length} shots across ${ctx.script.scenes.length} scenes`)
}
