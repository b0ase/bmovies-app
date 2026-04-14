// Photographer Agent — generates 8 character-specific images
// Uses soul data for character-accurate prompts, editor plan for mood/setting

import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { SHOT_TEMPLATES, ENVIRONMENTS, fillPrompt } from '@/lib/npgx-photoshoot-templates'
import type { MagazineGenerationContext, PhotoAssignment, ProgressCallback } from './types'

// Map our extended shot types to the 5 standard template shot types
const SHOT_TYPE_MAP: Record<string, string> = {
  hero: 'hero-portrait',
  'full-body': 'full-body-fashion',
  environmental: 'environmental-story',
  'night-city': 'environmental-story',
  intimate: 'intimate-closeup',
  action: 'action-dynamic',
  'behind-the-scenes': 'intimate-closeup',
  signature: 'hero-portrait',
  'fashion-spread-1': 'full-body-fashion',
  'fashion-spread-2': 'full-body-fashion',
  'fashion-spread-3': 'intimate-closeup',
  centrefold: 'full-body-fashion',
}

export async function runPhotographer(
  ctx: MagazineGenerationContext,
  onProgress?: ProgressCallback,
): Promise<void> {
  if (!ctx.editorPlan) throw new Error('Photographer needs editor plan')

  const soul = ctx.primarySoul
  const char = ctx.primaryCharacter
  const photos = ctx.editorPlan.photos

  // Generate images in sequence (avoid overwhelming the API)
  const generatedImages: { assignment: PhotoAssignment; imageUrl: string }[] = []

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    onProgress?.('photographer', `Shot ${i + 1}/${photos.length}: ${photo.shotType}...`)

    const imageUrl = await generatePhoto(photo, ctx, i)
    generatedImages.push({ assignment: photo, imageUrl })
  }

  // Insert photoshoot pages into the page array at the right positions
  // Pages 4-5: Hero Portrait + Full-Body Fashion
  const heroShot = generatedImages.find(g => g.assignment.shotType === 'hero')
  const fullBodyShot = generatedImages.find(g => g.assignment.shotType === 'full-body')
  if (heroShot) {
    ctx.pages.push({
      type: 'photoshoot',
      image: heroShot.imageUrl,
      character: char.name,
      shotType: 'hero',
      title: char.name.toUpperCase(),
    })
  }
  if (fullBodyShot) {
    ctx.pages.push({
      type: 'photoshoot',
      image: fullBodyShot.imageUrl,
      character: char.name,
      shotType: 'full-body',
    })
  }

  // Pages 6-7: Environmental Origin + Night City
  const envShot = generatedImages.find(g => g.assignment.shotType === 'environmental')
  const nightShot = generatedImages.find(g => g.assignment.shotType === 'night-city')
  if (envShot) {
    ctx.pages.push({
      type: 'photoshoot',
      image: envShot.imageUrl,
      character: char.name,
      shotType: 'environmental',
      title: soul.identity.origin.toUpperCase(),
    })
  }
  if (nightShot) {
    ctx.pages.push({
      type: 'photoshoot',
      image: nightShot.imageUrl,
      character: char.name,
      shotType: 'environmental',
    })
  }

  // Pages 9-10: Intimate + Action (stored for interleaving with articles)
  const intimateShot = generatedImages.find(g => g.assignment.shotType === 'intimate')
  const actionShot = generatedImages.find(g => g.assignment.shotType === 'action')
  if (intimateShot) {
    ctx.pages.push({
      type: 'photoshoot',
      image: intimateShot.imageUrl,
      character: char.name,
      shotType: 'intimate',
    })
  }
  if (actionShot) {
    ctx.pages.push({
      type: 'photoshoot',
      image: actionShot.imageUrl,
      character: char.name,
      shotType: 'action',
    })
  }

  // Pages 12-13: Behind-the-Scenes + Signature
  const btsShot = generatedImages.find(g => g.assignment.shotType === 'behind-the-scenes')
  const sigShot = generatedImages.find(g => g.assignment.shotType === 'signature')
  if (btsShot) {
    ctx.pages.push({
      type: 'photoshoot',
      image: btsShot.imageUrl,
      character: char.name,
      shotType: 'intimate',
      title: 'BEHIND THE SCENES',
    })
  }
  if (sigShot) {
    ctx.pages.push({
      type: 'photoshoot',
      image: sigShot.imageUrl,
      character: char.name,
      shotType: 'hero',
      title: `THE ${char.name.split(' ')[0].toUpperCase()} SHOT`,
    })
  }

  // Fashion spreads + centrefold
  const fashion1 = generatedImages.find(g => g.assignment.shotType === 'fashion-spread-1')
  const fashion2 = generatedImages.find(g => g.assignment.shotType === 'fashion-spread-2')
  const fashion3 = generatedImages.find(g => g.assignment.shotType === 'fashion-spread-3')
  const centrefold = generatedImages.find(g => g.assignment.shotType === 'centrefold')
  if (fashion1) {
    ctx.pages.push({
      type: 'photoshoot',
      image: fashion1.imageUrl,
      character: char.name,
      shotType: 'full-body',
      title: 'FASHION SPREAD',
    })
  }
  if (fashion2) {
    ctx.pages.push({
      type: 'photoshoot',
      image: fashion2.imageUrl,
      character: char.name,
      shotType: 'full-body',
    })
  }
  if (fashion3) {
    ctx.pages.push({
      type: 'photoshoot',
      image: fashion3.imageUrl,
      character: char.name,
      shotType: 'intimate',
      title: 'UNDRESSED',
    })
  }
  if (centrefold) {
    ctx.pages.push({
      type: 'photoshoot',
      image: centrefold.imageUrl,
      character: char.name,
      shotType: 'hero',
      title: 'CENTREFOLD',
    })
  }

  // Store cover image (first hero shot)
  if (heroShot) {
    ctx.pages[0] = ctx.pages[0] // cover gets set in pipeline assembly
  }
}

async function generatePhoto(
  photo: PhotoAssignment,
  ctx: MagazineGenerationContext,
  shotIndex: number,
): Promise<string> {
  const soul = ctx.primarySoul
  const char = ctx.primaryCharacter

  // Check if Creative Director provided a detailed brief for this shot
  const creativeBrief = ctx.creativeBriefs?.[shotIndex]

  // Build a character-specific prompt using soul data
  const templateId = SHOT_TYPE_MAP[photo.shotType] || 'hero-portrait'
  const template = SHOT_TEMPLATES.find(t => t.id === templateId) || SHOT_TEMPLATES[0]

  // Pick environment based on setting description
  const env = ENVIRONMENTS.find(e =>
    photo.setting.toLowerCase().includes(e.name.toLowerCase())
  ) || ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)]

  let fullPrompt: string

  if (creativeBrief) {
    // Rich prompt from Creative Director's brief
    fullPrompt = [
      soul.generation.promptPrefix,
      `${creativeBrief.concept}.`,
      `Location: ${creativeBrief.location}.`,
      `Lighting: ${creativeBrief.lighting}.`,
      `Styling: ${creativeBrief.styling}.`,
      `Camera: ${creativeBrief.camera}.`,
      `Mood: ${creativeBrief.mood}.`,
      `Color palette: ${creativeBrief.colorPalette}.`,
      `Visual reference: ${creativeBrief.reference}.`,
      soul.generation.promptSuffix,
    ].join(' ')
  } else {
    // Fallback: basic prompt from template + soul
    const shotPrompt = fillPrompt(template.promptBase, {
      character: soul.identity.name,
      character_description: `${soul.appearance.face}, ${soul.appearance.hair.color} ${soul.appearance.hair.style} hair, ${soul.appearance.eyes.color} eyes, ${soul.appearance.bodyType}, ${soul.appearance.distinguishing}, wearing ${soul.style.clothing[0] || 'cyberpunk outfit'}`,
      environment: env.prompt,
      action_type: photo.artDirection,
    })
    fullPrompt = `${soul.generation.promptPrefix} ${shotPrompt} ${photo.artDirection}. Mood: ${photo.mood}. ${soul.generation.promptSuffix}`
  }

  try {
    const res = await fetch(`${ctx.origin}/api/generate-image-npgx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: ctx.primarySlug,
        additionalPrompt: fullPrompt,
        width: template.settings.aspectRatio === '1:1' ? 1024 : 1024,
        height: template.settings.aspectRatio === '1:1' ? 1024 : 1536,
      }),
    })

    const data = await res.json()
    if (data.success && data.imageUrl) {
      ctx.imageCalls++
      ctx.totalCost += data.cost || 0.07
      return data.imageUrl
    }
  } catch (err) {
    ctx.errors.push(`Photo gen failed: ${photo.shotType} — ${err}`)
  }

  // Fallback to character's static image
  ctx.imageCalls++
  return char.image || '/NPG-X-10/a4e7133a-ba6d-451f-8093-42d7b7264073.jpg'
}
