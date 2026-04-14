import type { TextOverlay } from '@/lib/mint/types'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

// ── Font presets mapped to TextOverlay fontFamily ──

export type TitleStyle = 'punk' | 'neon' | 'elegant' | 'graffiti' | 'cyber' | 'manga'

const FONT_MAP: Record<TitleStyle, { family: string; weight: number }> = {
  punk: { family: 'Impact', weight: 900 },
  neon: { family: 'Orbitron', weight: 700 },
  elegant: { family: 'Georgia', weight: 300 },
  graffiti: { family: 'Permanent Marker', weight: 400 },
  cyber: { family: 'Courier New', weight: 700 },
  manga: { family: 'Impact', weight: 900 },
}

// ── Magazine title word banks ──

const MASTHEAD_LINES = [
  'NINJA PUNK GIRLS',
  'NINJA PUNK GIRLS XXX',
  'NPGX',
  'NPG MAGAZINE',
  'NPGX EXCLUSIVE',
]

const COVER_VERBS = [
  'EXCLUSIVE', 'UNCENSORED', 'UNCUT', 'RAW', 'EXPOSED',
  'REVEALED', 'UNLEASHED', 'UNTAMED', 'FORBIDDEN', 'ICONIC',
]

const COVER_PHRASES = [
  'THE FULL STORY', 'BEHIND THE SCENES', 'FIRST LOOK',
  'WORLD EXCLUSIVE', 'NEVER BEFORE SEEN', 'COLLECTOR\'S EDITION',
  'DEBUT ISSUE', 'LIMITED RUN', 'DIGITAL ORIGINAL',
  'TOKYO NIGHTS', 'AFTER DARK', 'MIDNIGHT EDITION',
  'NEON DISTRICT', 'UNDERGROUND', 'NO RULES',
]

const TAGLINES = [
  '26 GIRLS. YOUR FANTASY. YOUR FILM.',
  'GENERATIVE CINEMA ON BITCOIN',
  'AI-POWERED. BLOCKCHAIN-OWNED.',
  'CREATE. OWN. TRADE.',
  'THE FUTURE IS ADULT.',
  'DIRECT YOUR OWN MOVIE',
  'MINT YOUR MOMENT',
]

const ISSUE_DESCRIPTORS = [
  'SPRING 2026', 'TOKYO EDITION', 'LAUNCH ISSUE',
  'COLLECTOR\'S EDITION', 'PREMIUM ISSUE', 'SPECIAL EDITION',
  'VOL. I', 'VOL. II', 'DIGITAL EXCLUSIVE',
]

// ── Helpers ──

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickStyle(): TitleStyle {
  const styles: TitleStyle[] = ['punk', 'neon', 'elegant', 'graffiti', 'cyber', 'manga']
  return pick(styles)
}

function uid(): string {
  return crypto.randomUUID()
}

// ── Title template generators ──

export interface TitleTemplate {
  id: string
  name: string
  description: string
  style: TitleStyle
  generate: (characterSlug?: string, issueNumber?: number) => TextOverlay[]
}

/** Create a text overlay with title-designer defaults */
function overlay(
  text: string,
  style: TitleStyle,
  overrides: Partial<TextOverlay> = {},
): TextOverlay {
  const font = FONT_MAP[style]
  return {
    id: uid(),
    text,
    fontFamily: font.family,
    fontSize: 48,
    fontWeight: font.weight,
    color: '#ffffff',
    backgroundColor: '#000000',
    backgroundOpacity: 0,
    letterSpacing: 4,
    lineHeight: 1.1,
    align: 'center',
    x: 0.5,
    y: 0.5,
    width: 0.9,
    rotation: 0,
    opacity: 1,
    visible: true,
    ...overrides,
  }
}

function getCharName(slug?: string): string {
  if (!slug) return pick(NPGX_ROSTER).name
  const char = NPGX_ROSTER.find(c => c.slug === slug)
  return char?.name || slug.replace(/-/g, ' ').toUpperCase()
}

export const TITLE_TEMPLATES: TitleTemplate[] = [
  {
    id: 'classic-cover',
    name: 'Classic Magazine Cover',
    description: 'Masthead + character name + coverline + issue info',
    style: 'punk',
    generate: (slug, issue) => [
      overlay('NINJA PUNK GIRLS', 'punk', {
        fontSize: 28, y: 0.06, letterSpacing: 12, color: '#ef4444',
      }),
      overlay('XXX', 'neon', {
        fontSize: 18, y: 0.11, letterSpacing: 20, color: '#ffffff', opacity: 0.7,
      }),
      overlay(getCharName(slug).toUpperCase(), 'manga', {
        fontSize: 72, y: 0.5, color: '#ffffff', letterSpacing: 6,
      }),
      overlay(pick(COVER_VERBS), 'elegant', {
        fontSize: 14, y: 0.62, letterSpacing: 8, color: '#ef4444', opacity: 0.9,
      }),
      overlay(pick(COVER_PHRASES), 'cyber', {
        fontSize: 12, y: 0.92, letterSpacing: 6, color: '#ffffff', opacity: 0.5,
      }),
      overlay(issue ? `ISSUE ${issue}` : pick(ISSUE_DESCRIPTORS), 'cyber', {
        fontSize: 10, y: 0.96, letterSpacing: 4, color: '#ffffff', opacity: 0.3,
      }),
    ],
  },
  {
    id: 'neon-minimal',
    name: 'Neon Minimal',
    description: 'Glowing name, subtle tagline',
    style: 'neon',
    generate: (slug) => [
      overlay(getCharName(slug).toUpperCase(), 'neon', {
        fontSize: 64, y: 0.45, color: '#00ffff', letterSpacing: 8,
      }),
      overlay(pick(TAGLINES), 'cyber', {
        fontSize: 10, y: 0.55, color: '#ffffff', opacity: 0.4, letterSpacing: 6,
      }),
    ],
  },
  {
    id: 'punk-splash',
    name: 'Punk Splash',
    description: 'Aggressive angled text, red/black',
    style: 'punk',
    generate: (slug) => [
      overlay(getCharName(slug).toUpperCase(), 'punk', {
        fontSize: 80, y: 0.4, color: '#ef4444', rotation: -5, letterSpacing: 2,
      }),
      overlay(pick(COVER_VERBS), 'graffiti', {
        fontSize: 36, y: 0.58, color: '#ffffff', rotation: 3, opacity: 0.8,
      }),
      overlay(pick(COVER_PHRASES), 'punk', {
        fontSize: 14, y: 0.88, color: '#ef4444', letterSpacing: 10, opacity: 0.6,
      }),
    ],
  },
  {
    id: 'elegant-editorial',
    name: 'Elegant Editorial',
    description: 'Serif typography, sophisticated layout',
    style: 'elegant',
    generate: (slug, issue) => [
      overlay('NPGX', 'elegant', {
        fontSize: 16, y: 0.04, letterSpacing: 20, color: '#d4af37', opacity: 0.7,
      }),
      overlay(getCharName(slug), 'elegant', {
        fontSize: 56, y: 0.48, color: '#ffffff', letterSpacing: 4,
      }),
      overlay(pick(COVER_PHRASES), 'elegant', {
        fontSize: 14, y: 0.58, color: '#d4af37', letterSpacing: 6, opacity: 0.8,
      }),
      overlay(issue ? `No. ${issue}` : pick(ISSUE_DESCRIPTORS), 'elegant', {
        fontSize: 10, y: 0.94, color: '#ffffff', opacity: 0.3, letterSpacing: 8,
      }),
    ],
  },
  {
    id: 'graffiti-raw',
    name: 'Graffiti Raw',
    description: 'Street art style, handwritten feel',
    style: 'graffiti',
    generate: (slug) => [
      overlay(getCharName(slug).toUpperCase(), 'graffiti', {
        fontSize: 64, y: 0.45, color: '#ff1493', rotation: -3,
      }),
      overlay(pick(COVER_VERBS) + '!', 'graffiti', {
        fontSize: 28, y: 0.6, color: '#ffff00', rotation: 5, opacity: 0.9,
      }),
    ],
  },
  {
    id: 'cyber-hud',
    name: 'Cyber HUD',
    description: 'Terminal/HUD aesthetic with data overlay',
    style: 'cyber',
    generate: (slug) => {
      const name = getCharName(slug)
      return [
        overlay(`[ ${name.toUpperCase()} ]`, 'cyber', {
          fontSize: 48, y: 0.42, color: '#00ff00', letterSpacing: 6,
        }),
        overlay(`STATUS: ${pick(COVER_VERBS)} // CLEARANCE: LEVEL 5`, 'cyber', {
          fontSize: 10, y: 0.52, color: '#00ff00', opacity: 0.5, letterSpacing: 3,
        }),
        overlay('NPGX NETWORK // AUTHENTICATED', 'cyber', {
          fontSize: 8, y: 0.04, color: '#00ff00', opacity: 0.3, letterSpacing: 4, align: 'left', x: 0.02,
        }),
        overlay(`SYS.TIME: ${new Date().toISOString().split('T')[0]}`, 'cyber', {
          fontSize: 8, y: 0.96, color: '#00ff00', opacity: 0.3, letterSpacing: 2, align: 'right', x: 0.98,
        }),
      ]
    },
  },
  {
    id: 'manga-impact',
    name: 'Manga Impact',
    description: 'Bold impact lettering, manga panel style',
    style: 'manga',
    generate: (slug) => [
      overlay(getCharName(slug).toUpperCase(), 'manga', {
        fontSize: 96, y: 0.48, color: '#ffffff', letterSpacing: 0,
        backgroundColor: '#ef4444', backgroundOpacity: 0.9,
      }),
      overlay(pick(COVER_PHRASES), 'manga', {
        fontSize: 16, y: 0.65, color: '#ef4444', letterSpacing: 4,
      }),
    ],
  },
]

/** Generate random title overlays for a photo, picking a random template */
export function generateAutoTitle(
  characterSlug?: string,
  issueNumber?: number,
  templateId?: string,
): TextOverlay[] {
  const template = templateId
    ? TITLE_TEMPLATES.find(t => t.id === templateId) || pick(TITLE_TEMPLATES)
    : pick(TITLE_TEMPLATES)
  return template.generate(characterSlug, issueNumber)
}

/** Get a style-matched title for a story type */
export function getStyleForStoryType(storyType: string): TitleStyle {
  switch (storyType) {
    case 'photoshoot': return pick(['punk', 'elegant', 'manga'])
    case 'erotic-editorial': return pick(['elegant', 'neon'])
    case 'interview': return pick(['cyber', 'elegant'])
    case 'article': return pick(['elegant', 'cyber'])
    case 'graphic-panel': return pick(['manga', 'graffiti'])
    case 'review': return pick(['cyber', 'neon'])
    default: return pickStyle()
  }
}
