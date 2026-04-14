/* ── Timeline Editor Constants ────────────────────── */

import type { TrackName, ChannelName } from './types'

// Legacy track order (used by migration + compat)
export const TRACK_ORDER: TrackName[] = ['fast', 'slow', 'title']

// v3: Channel order — top to bottom in timeline UI (top = highest playback priority)
export const CHANNEL_ORDER: ChannelName[] = [
  'x',             // X-rated overlay
  'narrative',     // Creative action / narrative
  'lipsync',       // Lip-synced footage
  'scenes-v2',     // V2 character-locked shots
  'scenes-v1',     // V1 shots (alt)
  'titles-v2',     // V2 motion graphics
  'titles-v1',     // V1 motion graphics
  'fx',            // Effects / transitions
  'spare',         // Extra
  'music',         // Audio base (always bottom)
]

export const CHANNEL_CONFIG: Record<ChannelName, {
  label: string
  color: string
  bgClass: string
  borderClass: string
  textClass: string
  subALabel: string
  subBLabel: string
  hidden?: boolean   // hidden by default, show when has clips
}> = {
  x: {
    label: 'X',
    color: 'orange',
    bgClass: 'bg-orange-950/30',
    borderClass: 'border-orange-500/40',
    textClass: 'text-orange-400',
    subALabel: 'Main',
    subBLabel: 'Edit',
    hidden: true,
  },
  narrative: {
    label: 'NARRATIVE',
    color: 'amber',
    bgClass: 'bg-amber-950/30',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-400',
    subALabel: 'Main',
    subBLabel: 'Edit',
    hidden: true,
  },
  lipsync: {
    label: 'LIP SYNC',
    color: 'violet',
    bgClass: 'bg-violet-950/30',
    borderClass: 'border-violet-500/40',
    textClass: 'text-violet-400',
    subALabel: 'Main',
    subBLabel: 'Edit',
    hidden: true,
  },
  'scenes-v2': {
    label: 'SCENES V2',
    color: 'pink',
    bgClass: 'bg-pink-950/30',
    borderClass: 'border-pink-500/40',
    textClass: 'text-pink-400',
    subALabel: 'Main',
    subBLabel: 'Edit',
  },
  'scenes-v1': {
    label: 'SCENES V1',
    color: 'rose',
    bgClass: 'bg-rose-950/20',
    borderClass: 'border-rose-500/30',
    textClass: 'text-rose-400/70',
    subALabel: 'Main',
    subBLabel: 'Edit',
  },
  'titles-v2': {
    label: 'TITLES V2',
    color: 'cyan',
    bgClass: 'bg-cyan-950/30',
    borderClass: 'border-cyan-500/40',
    textClass: 'text-cyan-400',
    subALabel: 'Main',
    subBLabel: 'Edit',
  },
  'titles-v1': {
    label: 'TITLES V1',
    color: 'teal',
    bgClass: 'bg-teal-950/20',
    borderClass: 'border-teal-500/30',
    textClass: 'text-teal-400/70',
    subALabel: 'Main',
    subBLabel: 'Edit',
  },
  fx: {
    label: 'FX',
    color: 'purple',
    bgClass: 'bg-purple-950/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400/70',
    subALabel: 'Main',
    subBLabel: 'Edit',
    hidden: true,
  },
  spare: {
    label: 'SPARE',
    color: 'gray',
    bgClass: 'bg-gray-950/20',
    borderClass: 'border-gray-500/20',
    textClass: 'text-gray-500',
    subALabel: 'Main',
    subBLabel: 'Edit',
    hidden: true,
  },
  music: {
    label: 'MUSIC',
    color: 'green',
    bgClass: 'bg-green-950/20',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-400',
    subALabel: 'Main',
    subBLabel: 'Edit',
  },
}

// Legacy track config (compat for existing components)
export const TRACK_CONFIG: Record<TrackName, {
  label: string
  color: string
  bgClass: string
  borderClass: string
  textClass: string
}> = {
  fast: { ...CHANNEL_CONFIG.x, label: 'X' },
  slow: { ...CHANNEL_CONFIG['scenes-v2'], label: 'SCENES' },
  title: { ...CHANNEL_CONFIG.music, label: 'TITLES' },
}

export const DEFAULT_CLIP_DURATION = 3   // seconds
export const DEFAULT_ZOOM = 50          // pixels per second
export const MIN_ZOOM = 10
export const MAX_ZOOM = 200
export const TRACK_HEIGHT = 48          // px — collapsed single track (slightly smaller for 10 tracks)
export const CHANNEL_EXPANDED_HEIGHT = 96 // px — expanded dual sub-tracks
export const SUB_TRACK_HEIGHT = 44      // px — each sub-track when expanded
export const RULER_HEIGHT = 28          // px
export const SNAP_GRID = 0.25          // snap to quarter-second
