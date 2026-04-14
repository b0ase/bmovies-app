// Issue Templates — pre-built editorial structures for one-shot generation
// Each template defines a complete issue layout with story slots, character selection logic,
// and narrative prompts. The AI editorial staff fills in the details.

import { NPGX_ROSTER, type NPGXCharacter } from '@/lib/npgx-roster'
import { createEmptyStory, type Story, type StoryType, type IssuePlan, EDITORIAL_STAFF } from './stories'

// ─── Template Definition ───────────────────────────────────

export interface IssueTemplate {
  id: string
  name: string
  description: string
  characterCount: number  // how many characters featured
  stories: StorySlot[]
  titleGenerator: (chars: NPGXCharacter[]) => string
  themeGenerator: (chars: NPGXCharacter[]) => string
}

export interface StorySlot {
  type: StoryType
  titleGenerator: (chars: NPGXCharacter[], slotIndex: number) => string
  synopsisGenerator: (chars: NPGXCharacter[], slotIndex: number) => string
  characterPicker: 'primary' | 'secondary' | 'duo' | 'all' | 'random'
  settingGenerator: (chars: NPGXCharacter[]) => string
  moodOptions: string[]
}

// ─── Character Selection ───────────────────────────────────

function pickCharacters(count: number, exclude?: string[]): NPGXCharacter[] {
  const available = NPGX_ROSTER.filter(c => !exclude?.includes(c.slug))
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function pickByCategory(category: string, exclude?: string[]): NPGXCharacter | undefined {
  const matches = NPGX_ROSTER.filter(c => c.category === category && !exclude?.includes(c.slug))
  return matches[Math.floor(Math.random() * matches.length)]
}

function pickContrast(char: NPGXCharacter): NPGXCharacter {
  // Pick a character from a different category for narrative tension
  const others = NPGX_ROSTER.filter(c => c.category !== char.category && c.slug !== char.slug)
  return others[Math.floor(Math.random() * others.length)]
}

// ─── Setting Pools ─────────────────────────────────────────

const CITIES = [
  'Neo-Tokyo', 'Bangkok Underground', 'Berlin Techno District', 'Seoul Rooftops',
  'Los Angeles Motel Strip', 'Osaka Back Alleys', 'Shinjuku Red Light',
  'Kabukicho After Dark', 'Roppongi Fight Clubs', 'Akihabara Tech Ghetto',
  'Shibuya Undercroft', 'Harajuku Backstreets',
]

const CLUBS = [
  'BED — underground club, Tokyo basement', 'VOID — techno warehouse, Berlin',
  'NEON TEMPLE — converted shrine, Osaka', 'CRIMSON — fight club & bar, Roppongi',
  'STATIC — hacker collective, Akihabara', 'PULSE — rooftop venue, Seoul',
  'BLACK LOTUS — members-only, Kabukicho', 'GHOST FREQUENCY — pirate radio station basement',
]

const LOCATIONS = [
  'rain-soaked rooftop overlooking the city', 'abandoned warehouse with emergency lighting',
  'luxury penthouse, floor-to-ceiling windows', 'backstage at an underground punk venue',
  'neon-lit tattoo parlor after hours', 'capsule hotel corridor at 4am',
  'motorcycle garage under a highway overpass', 'onsen at midnight, steam and moonlight',
]

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Templates ─────────────────────────────────────────────

export const ISSUE_TEMPLATES: IssueTemplate[] = [
  {
    id: 'classic',
    name: 'Classic Issue',
    description: '4 characters, 2 photoshoots, 1 erotic editorial, 1 reportage, 1 fiction, editor\'s letter, interview, city guide. The definitive NPGX format.',
    characterCount: 4,
    titleGenerator: (chars) => {
      const titles = ['GENESIS', 'VOLTAGE', 'UNDERGROUND', 'RED LIGHT', 'NEON', 'STATIC', 'VENOM', 'CHROME', 'SIGNAL', 'PULSE', 'VOID', 'FRACTURE', 'ECHO', 'SURGE', 'BLACKOUT']
      return randomFrom(titles)
    },
    themeGenerator: (chars) => `${chars[0].name.split(' ')[0]} and the ${randomFrom(['neon underground', 'midnight rebellion', 'electric void', 'punk uprising', 'chrome frontier'])}`,
    stories: [
      {
        type: 'editors-letter',
        titleGenerator: () => "EDITOR'S LETTER",
        synopsisGenerator: (chars) => `Why ${chars[0].name} demanded this issue. What she represents. What's coming.`,
        characterPicker: 'primary',
        settingGenerator: () => 'NPGX Editorial Office (AI-generated, obviously)',
        moodOptions: ['raw', 'electric', 'fierce'],
      },
      {
        type: 'photoshoot',
        titleGenerator: (chars) => `${chars[0].name.split(' ')[0].toUpperCase()} — EXCLUSIVE`,
        synopsisGenerator: (chars) => `${chars[0].name} in ${randomFrom(LOCATIONS)}. ${chars[0].tagline}. Hero to action, five pages of ${chars[0].category} energy.`,
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(LOCATIONS),
        moodOptions: ['fierce', 'electric', 'raw', 'dangerous'],
      },
      {
        type: 'photoshoot',
        titleGenerator: (chars, i) => `${chars[1]?.name.split(' ')[0].toUpperCase() || 'UNKNOWN'} SESSIONS`,
        synopsisGenerator: (chars, i) => {
          const c = chars[1] || chars[0]
          return `${c.name}, ${c.tagline}. Studio session with dramatic lighting, then out into the streets of ${randomFrom(CITIES)}.`
        },
        characterPicker: 'secondary',
        settingGenerator: () => `Studio then ${randomFrom(CITIES)}`,
        moodOptions: ['moody', 'cinematic', 'provocative'],
      },
      {
        type: 'erotic-editorial',
        titleGenerator: (chars, i) => {
          const c = chars[2] || chars[0]
          return `${c.name.split(' ')[0].toUpperCase()} — AFTER HOURS`
        },
        synopsisGenerator: (chars, i) => {
          const c = chars[2] || chars[0]
          return `${c.name} in an intimate setting. Vulnerability meets power. Lingerie, low light, skin texture. Art direction by Ren.`
        },
        characterPicker: 'random',
        settingGenerator: () => randomFrom(['luxury penthouse, city lights', 'hotel room, harsh bathroom light', 'backstage dressing room, vanity mirror', 'onsen at midnight']),
        moodOptions: ['intimate', 'vulnerable', 'powerful', 'seductive'],
      },
      {
        type: 'interview',
        titleGenerator: (chars) => `${chars[0].name.split(' ')[0].toUpperCase()} SPEAKS`,
        synopsisGenerator: (chars) => {
          const questions = [
            'What keeps you fighting when the odds are impossible',
            'The moment that changed everything',
            'Why the underground chose you',
            'What the surface world will never understand',
            'The one rule you\'ll never break',
          ]
          return `${chars[0].name} sits down with Kai at ${randomFrom(CLUBS).split('—')[0].trim()}. Topic: ${randomFrom(questions)}.`
        },
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(CLUBS),
        moodOptions: ['raw', 'confrontational', 'honest'],
      },
      {
        type: 'reportage',
        titleGenerator: (chars) => {
          const c1 = chars[0].name.split(' ')[0]
          const c2 = (chars[3] || chars[1]).name.split(' ')[0]
          return `${c1} & ${c2} — A NIGHT AT ${randomFrom(CLUBS).split('—')[0].trim().toUpperCase()}`
        },
        synopsisGenerator: (chars) => {
          const c1 = chars[0]
          const c2 = chars[3] || chars[1]
          const club = randomFrom(CLUBS)
          return `What happens when ${c1.name.split(' ')[0]} (${c1.category}) and ${c2.name.split(' ')[0]} (${c2.category}) spend a night at ${club}. Kai follows them from door to dawn. Documentary style — real conversations, real chaos.`
        },
        characterPicker: 'duo',
        settingGenerator: () => randomFrom(CLUBS),
        moodOptions: ['electric', 'chaotic', 'immersive'],
      },
      {
        type: 'graphic-fiction',
        titleGenerator: () => {
          const titles = ['THE NEON MOTEL', 'GHOST FREQUENCY', 'BLOOD PROTOCOL', 'ZERO HOUR', 'THE LAST SIGNAL', 'CHROME & BONE', 'VOID WALKER', 'THE KILL SWITCH']
          return randomFrom(titles)
        },
        synopsisGenerator: (chars) => {
          const c1 = chars[0]
          const c2 = pickContrast(c1)
          const premises = [
            `${c1.name.split(' ')[0]} discovers a room in a motel that shouldn't exist. Inside: a message from ${c2.name.split(' ')[0]}. But ${c2.name.split(' ')[0]} has been dead for three days.`,
            `${c1.name.split(' ')[0]} intercepts a signal meant for someone else. Following it leads to a warehouse where ${c2.name.split(' ')[0]} is waiting with a proposition that could end both of them.`,
            `A power outage hits Neo-Tokyo for exactly 26 seconds. In those seconds, ${c1.name.split(' ')[0]} sees something in the dark that changes everything. ${c2.name.split(' ')[0]} saw it too.`,
            `${c1.name.split(' ')[0]} finds her own clone in a Kabukicho lab. The clone has memories she doesn't. ${c2.name.split(' ')[0]} built it.`,
          ]
          return randomFrom(premises)
        },
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(CITIES),
        moodOptions: ['noir', 'tense', 'surreal', 'electric'],
      },
      {
        type: 'city-guide',
        titleGenerator: (chars) => {
          const city = randomFrom(CITIES).split(' ')[0].toUpperCase()
          return `CITY GUIDE: ${city}`
        },
        synopsisGenerator: (chars) => `${chars[0].name.split(' ')[0]}'s underground guide. Where to drink, eat, fight, hide, and get inked. Not tourist-safe.`,
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(CITIES),
        moodOptions: ['dangerous', 'insider', 'raw'],
      },
    ],
  },
  {
    id: 'solo-deep-dive',
    name: 'Solo Deep Dive',
    description: '1 character, maximum depth. 3 photoshoots, 1 erotic editorial, interview, origin story fiction, editor\'s letter. The canonical character issue.',
    characterCount: 1,
    titleGenerator: (chars) => chars[0].name.split(' ')[0].toUpperCase(),
    themeGenerator: (chars) => `The definitive ${chars[0].name} issue`,
    stories: [
      {
        type: 'editors-letter',
        titleGenerator: () => "EDITOR'S LETTER",
        synopsisGenerator: (chars) => `This is the ${chars[0].name} issue. Why she matters. Why now. What you're about to see.`,
        characterPicker: 'primary',
        settingGenerator: () => '',
        moodOptions: ['reverent', 'fierce', 'intimate'],
      },
      {
        type: 'photoshoot',
        titleGenerator: (chars) => `${chars[0].name.split(' ')[0].toUpperCase()} — THE REVEAL`,
        synopsisGenerator: (chars) => `First look. Studio darkness, single red spotlight. ${chars[0].name} emerges. Hero to full-body fashion editorial.`,
        characterPicker: 'primary',
        settingGenerator: () => 'Black studio, single harsh red spotlight',
        moodOptions: ['dramatic', 'powerful', 'iconic'],
      },
      {
        type: 'photoshoot',
        titleGenerator: (chars) => `${chars[0].name.split(' ')[0].toUpperCase()} — ON LOCATION`,
        synopsisGenerator: (chars) => `${chars[0].name} in her natural habitat. The streets that made her. Environmental storytelling — every frame tells a story.`,
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(CITIES),
        moodOptions: ['cinematic', 'documentary', 'raw'],
      },
      {
        type: 'interview',
        titleGenerator: (chars) => `${chars[0].name.split(' ')[0].toUpperCase()} SPEAKS`,
        synopsisGenerator: (chars) => `The only interview ${chars[0].name} has ever given. Kai meets her at ${randomFrom(CLUBS).split('—')[0].trim()}. Nothing is off limits.`,
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(CLUBS),
        moodOptions: ['raw', 'vulnerable', 'honest'],
      },
      {
        type: 'erotic-editorial',
        titleGenerator: (chars) => `${chars[0].name.split(' ')[0].toUpperCase()} — UNGUARDED`,
        synopsisGenerator: (chars) => `The private side. ${chars[0].name} in a space that's hers alone. Intimate, powerful, unapologetic. Art-directed by Ren.`,
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(['penthouse bedroom, city lights through rain-streaked glass', 'traditional Japanese room, candlelight', 'hotel bathroom, steam and mirrors']),
        moodOptions: ['intimate', 'powerful', 'tender'],
      },
      {
        type: 'photoshoot',
        titleGenerator: (chars) => `${chars[0].name.split(' ')[0].toUpperCase()} — COMBAT`,
        synopsisGenerator: (chars) => `${chars[0].name} in motion. Using ${chars[0].specialties[0]}. Frozen mid-action, sweat and neon, pure kinetic energy.`,
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(['underground fight cage', 'rooftop in the rain', 'warehouse combat zone', 'dojo at midnight']),
        moodOptions: ['explosive', 'kinetic', 'fierce'],
      },
      {
        type: 'graphic-fiction',
        titleGenerator: (chars) => `ORIGIN: ${chars[0].name.split(' ')[0].toUpperCase()}`,
        synopsisGenerator: (chars) => `The origin story of ${chars[0].name}. How she became what she is. 6 panels from innocence to weapon. ${chars[0].description}`,
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(CITIES),
        moodOptions: ['tragic', 'brutal', 'mythic'],
      },
    ],
  },
  {
    id: 'versus',
    name: 'Versus Issue',
    description: '2 characters from different categories. Head to head. Contrasting photoshoots, a fiction showdown, and the question of who wins.',
    characterCount: 2,
    titleGenerator: (chars) => {
      const a = chars[0].name.split(' ')[0].toUpperCase()
      const b = chars[1].name.split(' ')[0].toUpperCase()
      return `${a} VS ${b}`
    },
    themeGenerator: (chars) => `${chars[0].category} meets ${chars[1].category} — only one walks away`,
    stories: [
      {
        type: 'editors-letter',
        titleGenerator: () => "EDITOR'S LETTER",
        synopsisGenerator: (chars) => `Two worlds collide. ${chars[0].name.split(' ')[0]} (${chars[0].category}) vs ${chars[1].name.split(' ')[0]} (${chars[1].category}). Why we had to put them in the same issue.`,
        characterPicker: 'all',
        settingGenerator: () => '',
        moodOptions: ['electric', 'confrontational'],
      },
      {
        type: 'photoshoot',
        titleGenerator: (chars) => `${chars[0].name.split(' ')[0].toUpperCase()} — CHALLENGER`,
        synopsisGenerator: (chars) => `${chars[0].name} prepares. Hero shots, combat stance, the calm before the storm.`,
        characterPicker: 'primary',
        settingGenerator: () => randomFrom(LOCATIONS),
        moodOptions: ['fierce', 'focused', 'dangerous'],
      },
      {
        type: 'photoshoot',
        titleGenerator: (chars) => `${chars[1].name.split(' ')[0].toUpperCase()} — CONTENDER`,
        synopsisGenerator: (chars) => `${chars[1].name} answers. Her territory, her rules, her power on display.`,
        characterPicker: 'secondary',
        settingGenerator: () => randomFrom(LOCATIONS),
        moodOptions: ['powerful', 'cold', 'calculated'],
      },
      {
        type: 'erotic-editorial',
        titleGenerator: (chars) => 'TENSION',
        synopsisGenerator: (chars) => `Both characters, same space, unresolved energy. Not fighting — not yet. The erotic charge between two apex predators who haven't decided if they're allies or enemies.`,
        characterPicker: 'duo',
        settingGenerator: () => randomFrom(['dimly lit bar, red neon', 'rooftop pool at night', 'backstage at a fight venue']),
        moodOptions: ['tense', 'charged', 'predatory'],
      },
      {
        type: 'interview',
        titleGenerator: (chars) => 'BOTH SIDES',
        synopsisGenerator: (chars) => `Kai interviews both — separately. Same questions, different answers. Who's telling the truth?`,
        characterPicker: 'all',
        settingGenerator: () => randomFrom(CLUBS),
        moodOptions: ['confrontational', 'revealing'],
      },
      {
        type: 'graphic-fiction',
        titleGenerator: () => 'THE FIGHT',
        synopsisGenerator: (chars) => `${chars[0].name.split(' ')[0]} and ${chars[1].name.split(' ')[0]} finally clash. ${chars[0].specialties[0]} vs ${chars[1].specialties[0]}. 6 panels of pure combat. Who wins? The last panel decides.`,
        characterPicker: 'all',
        settingGenerator: () => randomFrom(['abandoned subway station', 'rooftop in a thunderstorm', 'underground arena, crowd screaming']),
        moodOptions: ['explosive', 'brutal', 'mythic'],
      },
      {
        type: 'reportage',
        titleGenerator: () => 'THE AFTERMATH',
        synopsisGenerator: (chars) => `Kai documents what happened after the fight. The aftermath. The wounds. The respect — or the revenge.`,
        characterPicker: 'all',
        settingGenerator: () => randomFrom(CITIES),
        moodOptions: ['raw', 'quiet', 'haunted'],
      },
    ],
  },
]

// ─── Generate a complete IssuePlan from a template ─────────

export function generateIssuePlanFromTemplate(
  templateId: string,
  specificCharacters?: string[], // slugs — if provided, uses these instead of random
): IssuePlan {
  const template = ISSUE_TEMPLATES.find(t => t.id === templateId) || ISSUE_TEMPLATES[0]

  // Select characters
  let chars: NPGXCharacter[]
  if (specificCharacters?.length) {
    chars = specificCharacters
      .map(slug => NPGX_ROSTER.find(c => c.slug === slug))
      .filter(Boolean) as NPGXCharacter[]
    // Fill remaining slots randomly if not enough provided
    while (chars.length < template.characterCount) {
      const extra = pickCharacters(1, chars.map(c => c.slug))
      if (extra[0]) chars.push(extra[0])
    }
  } else {
    // For versus template, pick from different categories
    if (template.id === 'versus') {
      const first = pickCharacters(1)[0]
      const second = pickContrast(first)
      chars = [first, second]
    } else {
      chars = pickCharacters(template.characterCount)
    }
  }

  const title = template.titleGenerator(chars)
  const theme = template.themeGenerator(chars)

  // Build stories from template slots
  const stories: Story[] = template.stories.map((slot, i) => {
    const story = createEmptyStory(slot.type, i)

    // Assign characters based on picker strategy
    switch (slot.characterPicker) {
      case 'primary':
        story.characters = [chars[0].slug]
        break
      case 'secondary':
        story.characters = [(chars[1] || chars[0]).slug]
        break
      case 'duo':
        story.characters = [chars[0].slug, (chars[1] || chars[0]).slug]
        break
      case 'all':
        story.characters = chars.map(c => c.slug)
        break
      case 'random':
        story.characters = [chars[Math.floor(Math.random() * chars.length)].slug]
        break
    }

    story.title = slot.titleGenerator(chars, i)
    story.synopsis = slot.synopsisGenerator(chars, i)
    story.setting = slot.settingGenerator(chars)
    story.mood = randomFrom(slot.moodOptions)

    return story
  })

  const totalPages = stories.reduce((sum, s) => sum + s.pages.length, 0) + 4 // cover, contents, ad, back

  return {
    id: `issue-plan-${Date.now()}`,
    issueNumber: Math.floor(Math.random() * 99) + 1,
    title,
    theme,
    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    editorsLetter: '',
    stories,
    status: 'planning',
    totalPages,
    estimatedCost: stories.reduce((sum, s) => {
      const imgPages = s.pages.filter(p => p.type !== 'text').length
      const hasText = s.pages.some(p => p.type === 'text' || p.type === 'image-with-text' || p.type === 'graphic-panel')
      return sum + imgPages * 0.07 + (hasText ? 0.01 : 0)
    }, 0),
  }
}
