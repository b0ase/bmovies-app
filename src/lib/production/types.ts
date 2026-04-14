// Shared types for the video production agent pipeline
// Mirrors magazine/agents/types.ts pattern

import type { Soul } from '@/lib/souls'
import type { NPGXCharacter } from '@/lib/npgx-roster'

// ── Script ──────────────────────────────────────────────

export interface ScriptScene {
  sceneNumber: number
  title: string
  location: string
  timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK'
  characters: string[] // slugs
  description: string
  action: string[]
  dialogue: { character: string; line: string; direction?: string }[]
  duration: number // seconds
  mood: string
  visualStyle: string
}

export interface Script {
  title: string
  logline: string
  genre: string
  totalDuration: number // seconds
  scenes: ScriptScene[]
}

// ── Shot List (from Shot Director) ──────────────────────

export interface ShotBrief {
  sceneNumber: number
  shotNumber: number
  shotType: 'establishing' | 'close-up' | 'medium' | 'wide' | 'action' | 'reaction' | 'transition'
  concept: string
  character: string // slug
  action: string
  dialogue: string[]
  lighting: string
  camera: string // lens + angle + framing
  mood: string
  colorPalette: string
  reference: string // "think X meets Y"
  duration: number // seconds
  videoPrompt: string // final prompt for generation
}

// ── Production Context (shared across all agents) ───────

export interface ProductionContext {
  // Input
  primarySlug: string
  primarySoul: Soul
  primaryCharacter: NPGXCharacter
  format: 'short-film' | 'music-video' | 'trailer' | 'episode'
  userBrief?: string // optional user-provided creative direction

  // Agent outputs (populated sequentially)
  script: Script | null
  shotList: ShotBrief[]
  generatedVideos: GeneratedVideo[]

  // Magazine tie-in
  magazineCoverage: MagazineCoverage | null

  // Cost tracking
  textCalls: number
  videoCalls: number
  totalCost: number
  errors: string[]

  // Runtime
  origin: string
}

export interface GeneratedVideo {
  shotId?: string
  shotNumber: number
  sceneNumber: number
  provider: 'grok' | 'wan2.1'
  requestId: string
  status: 'queued' | 'generating' | 'done' | 'error'
  videoUrl?: string
  error?: string
  cost: number
  duration: number
}

export interface MagazineCoverage {
  headline: string
  behindTheScenes: string
  directorInterview: string
  productionStills: string[] // prompts for stills
}

// ── Final Output ────────────────────────────────────────

export interface Production {
  id: string
  title: string
  character: string
  slug: string
  format: string
  script: Script
  shotList: ShotBrief[]
  videos: GeneratedVideo[]
  assembledVideoUrl?: string | null
  magazineCoverage: MagazineCoverage | null
  totalDuration: number
  totalCost: number
  errors: string[]
  createdAt: string
}

export type ProgressCallback = (stage: string, detail: string) => void
