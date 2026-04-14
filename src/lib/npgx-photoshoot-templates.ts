// NPGX Photoshoot Prompt Templates
// Standardized prompts for generating consistent magazine-quality character images

export interface PhotoshootTemplate {
  id: string
  name: string
  shotType: 'hero' | 'full-body' | 'environmental' | 'intimate' | 'action'
  description: string
  promptBase: string
  negativePrompt: string
  settings: {
    aspectRatio: '3:4' | '4:3' | '1:1' | '9:16' | '16:9'
    style: string
    lighting: string
  }
}

export interface MagazineIssueTemplate {
  id: string
  name: string
  theme: string
  description: string
  photoShots: PhotoshootTemplate[]
  editorialPrompts: {
    interview: string
    fiction: string
    cityGuide: string
  }
}

// ─── Shot templates ───

export const SHOT_TEMPLATES: PhotoshootTemplate[] = [
  {
    id: 'hero-portrait',
    name: 'Hero Portrait',
    shotType: 'hero',
    description: 'Main character reveal shot — dramatic lighting, strong pose, editorial quality',
    promptBase: 'Professional editorial magazine photography, dramatic hero portrait of {character}, {character_description}. Strong confident pose, direct eye contact with camera. Magazine cover quality, high-gloss finish, cyberpunk aesthetic. Shot on medium format camera, 85mm lens, f/2.8.',
    negativePrompt: 'low quality, blurry, amateur, cartoon, anime, illustration, deformed hands, extra fingers, watermark, text overlay',
    settings: {
      aspectRatio: '3:4',
      style: 'editorial-portrait',
      lighting: 'dramatic-rim',
    },
  },
  {
    id: 'full-body-fashion',
    name: 'Full Body Fashion',
    shotType: 'full-body',
    description: 'Full body shot showing outfit and attitude',
    promptBase: 'High fashion editorial full body photograph of {character}, {character_description}. Standing pose showing full outfit, cyberpunk fashion, leather and PVC details. Clean studio backdrop with colored gel lighting. Magazine editorial spread, Vogue-quality photography.',
    negativePrompt: 'low quality, blurry, amateur, cartoon, anime, cropped, partial body, deformed',
    settings: {
      aspectRatio: '3:4',
      style: 'fashion-editorial',
      lighting: 'studio-gels',
    },
  },
  {
    id: 'environmental-story',
    name: 'Environmental Story',
    shotType: 'environmental',
    description: 'Character in their natural habitat — tells a story',
    promptBase: 'Cinematic environmental portrait of {character}, {character_description}. Set in {environment}. Natural interaction with surroundings, narrative mood. Atmospheric lighting, depth of field, neon reflections. Shot in the style of Wong Kar-wai meets Blade Runner. Editorial magazine quality.',
    negativePrompt: 'low quality, blurry, amateur, cartoon, anime, flat lighting, boring composition',
    settings: {
      aspectRatio: '4:3',
      style: 'cinematic-narrative',
      lighting: 'practical-neon',
    },
  },
  {
    id: 'intimate-closeup',
    name: 'Intimate Close-Up',
    shotType: 'intimate',
    description: 'Tight crop, emotional, revealing — the private moment',
    promptBase: 'Intimate editorial close-up photograph of {character}, {character_description}. Tight crop showing face and shoulders. Soft but dramatic lighting, shallow depth of field. Vulnerable yet powerful expression. Beauty editorial quality, skin texture visible, magazine print quality.',
    negativePrompt: 'low quality, blurry, amateur, cartoon, anime, overly retouched, plastic skin',
    settings: {
      aspectRatio: '1:1',
      style: 'beauty-editorial',
      lighting: 'soft-dramatic',
    },
  },
  {
    id: 'action-dynamic',
    name: 'Action Dynamic',
    shotType: 'action',
    description: 'Movement, energy, combat or dance — frozen in time',
    promptBase: 'Dynamic action photograph of {character}, {character_description}. Mid-motion shot, {action_type}. Motion blur on background, sharp focus on subject. Dramatic lighting with sparks/particles. High-speed photography feel, editorial sports/action magazine quality. Cyberpunk urban environment.',
    negativePrompt: 'low quality, blurry subject, amateur, cartoon, anime, static pose, boring',
    settings: {
      aspectRatio: '3:4',
      style: 'action-editorial',
      lighting: 'high-speed-flash',
    },
  },
]

// ─── Environment presets ───

export const ENVIRONMENTS = [
  { id: 'neo-tokyo', name: 'Neo-Tokyo', prompt: 'neon-lit back alleys of Kabukicho, Tokyo at night, rain-slicked streets, glowing kanji signs' },
  { id: 'bangkok-underground', name: 'Bangkok Underground', prompt: 'underground fight club in Bangkok, dim red lighting, sweaty atmosphere, industrial warehouse' },
  { id: 'berlin-techno', name: 'Berlin Techno Club', prompt: 'dark Berlin techno club, strobe lights, industrial interior, concrete walls, fog machine haze' },
  { id: 'seoul-rooftop', name: 'Seoul Rooftop', prompt: 'Seoul rooftop at night, city skyline backdrop, LED signs, wind in hair, urban panorama' },
  { id: 'la-motel', name: 'LA Motel', prompt: 'seedy Los Angeles motel room, neon sign glow through blinds, retro 70s interior, noir atmosphere' },
  { id: 'tokyo-studio', name: 'Tokyo Studio', prompt: 'minimalist Tokyo photography studio, white cyclorama with colored gels, professional lighting setup' },
  { id: 'cyberpunk-lab', name: 'Cyberpunk Lab', prompt: 'high-tech laboratory, holographic displays, server racks, blue and red accent lighting, cables and wires' },
  { id: 'abandoned-warehouse', name: 'Abandoned Warehouse', prompt: 'abandoned industrial warehouse, broken windows, graffiti walls, shafts of light, urban decay beauty' },
]

// ─── Action presets ───

export const ACTIONS = [
  { id: 'combat', prompt: 'executing a spinning kick, martial arts combat pose' },
  { id: 'hacking', prompt: 'typing rapidly on holographic keyboard, code projections around her' },
  { id: 'riding', prompt: 'straddling a modified cyberpunk motorcycle, leaning forward' },
  { id: 'dancing', prompt: 'dancing in a club, body in fluid motion, arms raised' },
  { id: 'running', prompt: 'sprinting through rain, splashing puddles, looking back over shoulder' },
  { id: 'posing', prompt: 'striking a power pose against a wall, arms crossed, head tilted' },
]

// ─── Full issue template ───

export const ISSUE_TEMPLATE: MagazineIssueTemplate = {
  id: 'standard-issue',
  name: 'Standard NPGX Issue',
  theme: 'variable',
  description: '24-page issue: 4 characters x 5 photoshoot pages + 4 editorial pages',
  photoShots: SHOT_TEMPLATES,
  editorialPrompts: {
    interview: 'Write a 300-word in-character interview with {character} for NPGX Magazine. They are {character_description}. The interview takes place in {location}. Write in the style of a Vice Magazine or Dazed & Confused feature — raw, authentic, counter-culture. Include vivid setting details and the character\'s actual quotes. Topics: their origin story, what drives them, their view on the system, what they do for fun.',
    fiction: 'Write a 400-word cyberpunk fiction chapter for NPGX Magazine. Theme: {theme}. Characters involved: {characters}. Setting: {setting}. Write in punchy noir style — short sentences, vivid imagery, cliffhanger ending. Think William Gibson meets Tarantino. Include dialogue.',
    cityGuide: 'Write a 250-word underground city guide for {city} in the style of NPGX Magazine. Format as a list of recommendations: DRINK, EAT, SLEEP, INK, SHOP, SEE, AVOID. Each entry should have a venue name, location hint, and one-liner description. Make it feel underground, dangerous, exclusive. Include crypto payment references and cyberpunk elements.',
  },
}

// ─── Helper to fill template ───

export function fillPrompt(
  template: string,
  vars: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}
