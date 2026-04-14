// Story-based magazine data model
// Stories are discrete editorial units assembled into issues

// ─── Story Types ───────────────────────────────────────────────
// Each issue contains a mix of these. Default layout: 4 photoshoots (5pp each)
// + 1 graphic fiction (text-only with illustrations) + 1 reportage + editor's letter + ads

export type StoryType =
  | 'erotic-editorial'     // Photoshoot with editorial styling notes — pictures only, 5 pages
  | 'reportage'            // Documentary-style text + accompanying photography, 5 pages
  | 'graphic-fiction'       // Illustrated narrative — no photography, AI-generated art panels
  | 'photoshoot'           // Pure photoshoot — pictures only, 5 pages
  | 'editors-letter'       // Letter from the editor (AI staff member)
  | 'interview'            // Q&A with a character
  | 'city-guide'           // Underground city guide

export type StoryStatus = 'planned' | 'generating' | 'complete' | 'failed'

export interface StoryPage {
  id: string
  type: 'image' | 'text' | 'graphic-panel' | 'image-with-text'
  image?: string          // generated image URL
  imagePrompt?: string    // prompt used (for regeneration)
  title?: string
  subtitle?: string
  body?: string
  character?: string      // slug
  shotType?: string
  svgOverlay?: string     // SVG markup for text/graphics overlay
  status: 'empty' | 'generating' | 'complete' | 'failed'
}

export interface Story {
  id: string
  type: StoryType
  title: string
  synopsis: string        // editorial brief / pitch
  characters: string[]    // slugs
  setting: string         // location/environment
  mood: string
  pages: StoryPage[]
  status: StoryStatus
  sortOrder: number
}

// ─── AI Editorial Staff ────────────────────────────────────────
// Self-consciously AI. They know what they are.

export interface StaffMember {
  id: string
  name: string
  nameJa: string         // katakana
  role: string
  bio: string
  avatar?: string
  voice: string          // writing style instruction
}

export const EDITORIAL_STAFF: StaffMember[] = [
  {
    id: 'yua',
    name: 'Yua',
    nameJa: 'ユア',
    role: 'Editor-in-Chief',
    bio: 'First-generation AI editor. Built to curate chaos. She picks the stories, sets the tone, and writes the letter that opens every issue. She knows she\'s artificial and finds it liberating.',
    voice: 'Raw, poetic, unapologetic. Short paragraphs. Vivid imagery. You never explain — you reveal. Write like the best editors at Vice, Dazed & Confused, and i-D had a baby that was raised by a cyberpunk zine.',
  },
  {
    id: 'ren',
    name: 'Ren',
    nameJa: 'レン',
    role: 'Creative Director',
    bio: 'Designs every photoshoot, every layout, every visual decision. Ren thinks in color palettes and camera angles. Trained on a million fashion editorials and chose to make something weirder.',
    voice: 'Visual and precise. Describe images like a photographer giving direction. Use specific technical terms — lens, aperture, key light. Think in compositions.',
  },
  {
    id: 'kai',
    name: 'Kai',
    nameJa: 'カイ',
    role: 'Staff Writer',
    bio: 'Writes the reportage, the fiction, the interviews. Kai is an AI that studied every gonzo journalist and decided Hunter Thompson was too conservative. First-person, immersive, sometimes unreliable.',
    voice: 'Gonzo meets cyberpunk. First-person when reporting, third-person when writing fiction. Vivid sensory details. Let sentences run when the energy demands it. Punctuate with fragments when it doesn\'t.',
  },
  {
    id: 'sora',
    name: 'Sora',
    nameJa: 'ソラ',
    role: 'Graphic Artist',
    bio: 'Handles the graphic fiction — panels, layouts, sequential art. Sora doesn\'t do photography. Sora does illustrated narratives with bold linework and neon washes.',
    voice: 'Panel descriptions are cinematic. Think graphic novel script meets storyboard. Each panel has a camera angle, an emotion, and a punchline.',
  },
  {
    id: 'mio',
    name: 'Mio',
    nameJa: 'ミオ',
    role: 'Photographer',
    bio: 'AI photographer. Generates every image in the magazine. Mio thinks about light, skin texture, environment, and the story a single image can tell. Obsessed with the space between fashion and documentary.',
    voice: 'Prompts are detailed and cinematic. Always include lighting, lens, mood, and one unexpected detail that makes the image feel alive.',
  },
]

export function getStaffByRole(role: string): StaffMember | undefined {
  return EDITORIAL_STAFF.find(s => s.role.toLowerCase().includes(role.toLowerCase()))
}

// ─── Issue Blueprint ───────────────────────────────────────────
// An issue is a collection of stories + structural pages (cover, contents, ads, back cover)

export interface IssuePlan {
  id: string
  issueNumber: number
  title: string           // one-word issue title (e.g. "GENESIS", "VOLTAGE")
  theme: string           // 2-3 word theme
  date: string
  editorsLetter: string   // the letter body (written by Yua)
  stories: Story[]
  coverStory?: string     // story ID used for cover image
  status: 'planning' | 'in-progress' | 'complete'
  totalPages: number      // computed from stories
  estimatedCost: number
}

// ─── Defaults ──────────────────────────────────────────────────

export function createEmptyStory(type: StoryType, sortOrder: number): Story {
  const pageCount = type === 'editors-letter' || type === 'interview' || type === 'city-guide' ? 1
    : type === 'graphic-fiction' ? 6
    : 5

  const pages: StoryPage[] = Array.from({ length: pageCount }, (_, i) => ({
    id: `page-${Date.now()}-${i}`,
    type: type === 'graphic-fiction' ? 'graphic-panel'
      : type === 'reportage' ? (i < 3 ? 'image-with-text' : 'image')
      : type === 'editors-letter' || type === 'interview' || type === 'city-guide' ? 'text'
      : 'image',
    status: 'empty' as const,
  }))

  return {
    id: `story-${Date.now()}-${sortOrder}`,
    type,
    title: '',
    synopsis: '',
    characters: [],
    setting: '',
    mood: '',
    pages,
    status: 'planned',
    sortOrder,
  }
}

export function createDefaultIssuePlan(issueNumber: number): IssuePlan {
  return {
    id: `issue-plan-${Date.now()}`,
    issueNumber,
    title: '',
    theme: '',
    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    editorsLetter: '',
    stories: [
      // Default layout: editor's letter + 2 photoshoots + 1 erotic editorial + 1 reportage + 1 graphic fiction
      createEmptyStory('editors-letter', 0),
      createEmptyStory('photoshoot', 1),
      createEmptyStory('photoshoot', 2),
      createEmptyStory('erotic-editorial', 3),
      createEmptyStory('reportage', 4),
      createEmptyStory('graphic-fiction', 5),
    ],
    status: 'planning',
    totalPages: 0,
    estimatedCost: 0,
  }
}

// Story type metadata for UI
export const STORY_TYPE_META: Record<StoryType, {
  label: string
  description: string
  icon: string
  defaultPages: number
  hasPhotography: boolean
  hasText: boolean
  staff: string // staff member ID who owns this type
  color: string
}> = {
  'photoshoot': {
    label: 'Photoshoot',
    description: 'Pure editorial photography — 5 pages of images, no text',
    icon: '📸',
    defaultPages: 5,
    hasPhotography: true,
    hasText: false,
    staff: 'mio',
    color: 'red',
  },
  'erotic-editorial': {
    label: 'Erotic Editorial',
    description: 'Intimate photoshoot with editorial styling and art direction',
    icon: '🔥',
    defaultPages: 5,
    hasPhotography: true,
    hasText: false,
    staff: 'ren',
    color: 'pink',
  },
  'reportage': {
    label: 'Reportage',
    description: 'Documentary-style storytelling with accompanying photography',
    icon: '📰',
    defaultPages: 5,
    hasPhotography: true,
    hasText: true,
    staff: 'kai',
    color: 'blue',
  },
  'graphic-fiction': {
    label: 'Graphic Fiction',
    description: 'Illustrated narrative — AI-generated art panels, no photography',
    icon: '🎨',
    defaultPages: 6,
    hasPhotography: false,
    hasText: true,
    staff: 'sora',
    color: 'purple',
  },
  'editors-letter': {
    label: "Editor's Letter",
    description: 'Letter from AI Editor-in-Chief Yua',
    icon: '✉️',
    defaultPages: 1,
    hasPhotography: false,
    hasText: true,
    staff: 'yua',
    color: 'white',
  },
  'interview': {
    label: 'Interview',
    description: 'Q&A with a character — text only',
    icon: '🎤',
    defaultPages: 1,
    hasPhotography: false,
    hasText: true,
    staff: 'kai',
    color: 'green',
  },
  'city-guide': {
    label: 'City Guide',
    description: 'Underground guide to a character\'s city',
    icon: '🗺️',
    defaultPages: 1,
    hasPhotography: false,
    hasText: true,
    staff: 'kai',
    color: 'yellow',
  },
}
