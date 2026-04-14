// Creative Director Agent — generates detailed photoshoot briefs
// Takes the Editor's plan + soul data and produces rich briefs with
// lighting, styling, camera, mood, and visual references for each shot.
// Runs AFTER Editor, BEFORE Photographer.

import { generateText } from '../text-generation'
import type { MagazineGenerationContext, CreativeBrief, ProgressCallback } from './types'

export async function runCreativeDirector(
  ctx: MagazineGenerationContext,
  onProgress?: ProgressCallback,
): Promise<void> {
  if (!ctx.editorPlan) throw new Error('Creative Director needs editor plan')

  onProgress?.('creative-director', 'Developing photoshoot concepts...')

  const soul = ctx.primarySoul
  const char = ctx.primaryCharacter
  const plan = ctx.editorPlan

  // Build a single comprehensive prompt for all 8 shots — more coherent than per-shot
  const result = await generateText({
    systemPrompt: `You are a Creative Director for NPGX Magazine — a cyberpunk counter-culture fashion publication. You write detailed photoshoot briefs that a photographer and production team execute. You think in terms of lighting setups, wardrobe pulls, camera rigs, and visual storytelling. Every shot tells a story. Every detail matters.

You know this character intimately and design each shot to reveal a different facet of who they are.`,
    userPrompt: `Create 8 detailed photoshoot briefs for ${soul.identity.name}'s canonical magazine issue.

CHARACTER:
- Name: ${soul.identity.name}
- Bio: ${soul.identity.bio}
- Origin: ${soul.identity.origin}
- Age: ${soul.appearance.age}, ${soul.appearance.ethnicity}
- Face: ${soul.appearance.face}
- Hair: ${soul.appearance.hair.color}, ${soul.appearance.hair.style}, ${soul.appearance.hair.texture}
- Eyes: ${soul.appearance.eyes.color}, ${soul.appearance.eyes.shape}
- Body: ${soul.appearance.bodyType}, ${soul.appearance.height}
- Tattoos: ${soul.appearance.tattoos}
- Piercings: ${soul.appearance.piercings}
- Distinguishing: ${soul.appearance.distinguishing}
- Aesthetic: ${soul.style.aesthetic}
- Clothing: ${soul.style.clothing.join(', ')}
- Colors: ${soul.style.colors.join(', ')}
- Makeup: ${soul.style.makeup}
- Category: ${char.category}
- Specialties: ${char.specialties.join(', ')}

ISSUE THEME: ${plan.issueTitle} — ${plan.theme}
ISSUE MOOD: ${plan.mood}

SHOT LIST (in narrative order):
1. HERO PORTRAIT — the cover/reveal shot
2. FULL-BODY FASHION — outfit editorial
3. ENVIRONMENTAL — in their origin setting (${soul.identity.origin})
4. NIGHT CITY — urban nightscape
5. INTIMATE CLOSE-UP — beauty/emotion shot
6. ACTION DYNAMIC — using their specialty (${char.specialties[0]})
7. BEHIND THE SCENES — candid/off-duty
8. SIGNATURE — the defining image of this character

Respond in valid JSON (no markdown, no code fences) — array of 8 objects:
[{
  "shotType": "hero",
  "concept": "what story does this image tell (1 sentence)",
  "lighting": "specific setup: key light type+position, fill, rim/hair, practicals, color gels",
  "styling": "exact wardrobe, hair styling, makeup for this shot",
  "location": "detailed set description with props and atmosphere",
  "camera": "lens mm, angle, framing, depth of field",
  "mood": "emotional tone in 2-3 words",
  "colorPalette": "3-4 dominant colors and overall grade",
  "reference": "think [visual reference] meets [visual reference]"
}]`,
    temperature: 0.85,
    maxTokens: 2000,
  })
  ctx.textCalls++
  ctx.totalCost += result.cost

  try {
    const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const briefs: CreativeBrief[] = JSON.parse(cleaned)

    // Validate and assign shot types
    const shotTypes = ['hero', 'full-body', 'environmental', 'night-city', 'intimate', 'action', 'behind-the-scenes', 'signature']
    ctx.creativeBriefs = briefs.map((brief, i) => ({
      ...brief,
      shotType: brief.shotType || shotTypes[i] || 'hero',
    }))

    onProgress?.('creative-director', `${ctx.creativeBriefs.length} briefs ready`)
  } catch {
    // Fallback briefs using soul data directly
    ctx.errors.push('Creative Director brief parse failed — using soul-based fallback')
    ctx.creativeBriefs = buildFallbackBriefs(ctx)
    onProgress?.('creative-director', 'Using fallback briefs')
  }
}

function buildFallbackBriefs(ctx: MagazineGenerationContext): CreativeBrief[] {
  const soul = ctx.primarySoul
  const char = ctx.primaryCharacter
  const clothing = soul.style.clothing[0] || 'cyberpunk outfit'
  const colors = soul.style.colors.join(', ')

  return [
    {
      shotType: 'hero',
      concept: `${soul.identity.name} revealed — power and beauty`,
      lighting: 'Hard key from 45-degrees camera-left, warm rim light camera-right, no fill for drama',
      styling: `${clothing}, ${soul.style.makeup}, hair ${soul.appearance.hair.style}`,
      location: `Studio cyclorama with smoke machine, ${colors} gel washes on backdrop`,
      camera: '85mm f/2, eye-level, tight crop shoulders up, shallow DOF',
      mood: `${ctx.editorPlan?.mood || 'fierce'}, confrontational`,
      colorPalette: colors,
      reference: `Helmut Newton meets ${soul.style.aesthetic}`,
    },
    {
      shotType: 'full-body',
      concept: `Full outfit editorial — ${soul.style.aesthetic} decoded`,
      lighting: 'Soft overhead beauty dish, strip lights both sides for texture',
      styling: `Full wardrobe: ${soul.style.clothing.join(', ')}`,
      location: 'Minimalist studio, seamless backdrop, clean editorial',
      camera: '50mm f/4, slightly below eye-level, full body with headroom',
      mood: 'confident, editorial',
      colorPalette: colors,
      reference: 'Vogue Japan meets cyberpunk',
    },
    {
      shotType: 'environmental',
      concept: `${soul.identity.name} in ${soul.identity.origin} — where it all started`,
      lighting: 'Practical neon signs, ambient city light, subtle bounce for face',
      styling: `${clothing}, battle-worn, lived-in`,
      location: soul.identity.origin,
      camera: '35mm f/2.8, environmental wide, character small in frame',
      mood: 'atmospheric, nostalgic',
      colorPalette: `neon, ${colors}, wet pavement reflections`,
      reference: 'Wong Kar-wai meets Blade Runner',
    },
    {
      shotType: 'night-city',
      concept: 'Urban nightscape — the city is her playground',
      lighting: 'Mixed neon practicals, car headlights, rain-slicked reflections',
      styling: `${soul.style.clothing[1] || clothing}, combat-ready`,
      location: 'Rain-soaked city intersection, neon signs, late night',
      camera: '24mm f/1.8, low angle, dynamic perspective, bokeh city lights',
      mood: 'electric, dangerous',
      colorPalette: `red neon, blue-purple, ${colors}`,
      reference: 'Gaspar Noe meets cyberpunk fashion',
    },
    {
      shotType: 'intimate',
      concept: `The private ${soul.identity.name.split(' ')[0]} — unguarded moment`,
      lighting: 'Single warm key through window/blinds, natural falloff, soft shadows',
      styling: `Minimal — ${soul.style.makeup}, natural hair, skin visible`,
      location: 'Private space — apartment, motel room, backstage dressing room',
      camera: '85mm f/1.4, extreme shallow DOF, tight on eyes/face',
      mood: 'vulnerable, raw',
      colorPalette: `warm amber, skin tones, deep shadows`,
      reference: 'Nan Goldin meets Annie Leibovitz',
    },
    {
      shotType: 'action',
      concept: `${soul.identity.name} uses ${char.specialties[0]} — caught in the act`,
      lighting: 'High-speed flash freeze, rim lights for separation, sparks/particles',
      styling: `Combat outfit, ${soul.appearance.distinguishing}`,
      location: 'Industrial space — warehouse, rooftop, fight arena',
      camera: '70-200mm f/2.8, 1/2000s freeze, motion blur on background',
      mood: 'explosive, kinetic',
      colorPalette: `${colors}, spark orange, steel grey`,
      reference: 'Matrix fight photography meets fashion editorial',
    },
    {
      shotType: 'behind-the-scenes',
      concept: 'Off-duty candid — the real person behind the fighter',
      lighting: 'Available light only, tungsten practicals, candid feel',
      styling: 'Casual version of their aesthetic, undone hair, no makeup or minimal',
      location: 'Backstage, green room, street corner, eating ramen',
      camera: '35mm f/2, documentary style, slightly grainy, imperfect',
      mood: 'candid, authentic',
      colorPalette: 'muted, warm tones, natural',
      reference: 'Terry Richardson candid meets street photography',
    },
    {
      shotType: 'signature',
      concept: `The definitive ${soul.identity.name} image — this is who she is`,
      lighting: `Dramatic, tailored to ${soul.style.aesthetic} — one light, maximum impact`,
      styling: `Signature look: ${soul.style.clothing[0]}, ${soul.style.makeup}, ${soul.appearance.hair.style} hair`,
      location: `${soul.style.aesthetic} environment — the world built for this character`,
      camera: '85mm f/2, eye-level, centered, symmetrical composition',
      mood: `${ctx.editorPlan?.mood || 'iconic'}, definitive`,
      colorPalette: colors,
      reference: `Peter Lindbergh meets ${soul.style.aesthetic}`,
    },
  ]
}
