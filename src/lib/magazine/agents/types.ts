// Shared types for the magazine agent pipeline

import type { Soul } from '@/lib/souls'
import type { NPGXCharacter } from '@/lib/npgx-roster'
import type { MagazinePage } from '@/lib/npgx-magazines'

export interface SectionAssignment {
  type: 'editors-letter' | 'interview' | 'origin-story' | 'style-guide' | 'fiction' | 'rivalry-profile' | 'city-guide' | 'the-wire' | 'the-armoury' | 'frequencies' | 'static' | 'last-rites'
  targetAgent: 'editor' | 'writer'
  character: string // slug
  instructions: string // unique brief from the editor
  wordCount: number
}

export interface PhotoAssignment {
  character: string // slug
  shotType: 'hero' | 'full-body' | 'environmental' | 'intimate' | 'action' | 'behind-the-scenes' | 'signature' | 'night-city' | 'fashion-spread-1' | 'fashion-spread-2' | 'fashion-spread-3' | 'centrefold'
  mood: string
  setting: string
  artDirection: string // specific prompt additions from editor
}

// Creative Director's detailed brief for each photo — richer than PhotoAssignment
export interface CreativeBrief {
  shotType: string
  concept: string // the story this image tells
  lighting: string // specific lighting setup (key, fill, rim, practicals)
  styling: string // wardrobe, hair, makeup direction
  location: string // detailed set/location description
  camera: string // lens, angle, framing notes
  mood: string // emotional tone
  colorPalette: string // dominant colors and grade
  reference: string // "think X meets Y" visual reference
}

export interface EditorPlan {
  issueTitle: string
  theme: string
  mood: string
  sections: SectionAssignment[]
  photos: PhotoAssignment[]
  crossRefCharacters: { slug: string; reason: string }[]
}

export interface MagazineGenerationContext {
  // Input
  primarySlug: string
  issueNumber: number
  primarySoul: Soul
  primaryCharacter: NPGXCharacter
  crossRefSouls: { slug: string; soul: Soul; character: NPGXCharacter }[]

  // Editor output
  editorPlan: EditorPlan | null

  // Creative Director output
  creativeBriefs: CreativeBrief[]

  // Accumulated pages
  pages: MagazinePage[]

  // Cost tracking
  textCalls: number
  imageCalls: number
  totalCost: number
  errors: string[]

  // Runtime
  origin: string // base URL for internal API calls
}

export type ProgressCallback = (stage: string, detail: string) => void
