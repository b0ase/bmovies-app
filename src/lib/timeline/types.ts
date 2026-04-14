/* ── Multi-Track Timeline Data Model v3 ─────────── */

// ── Legacy v1 types (kept for migration) ──────────
export type TrackName = 'title' | 'slow' | 'fast'

// ── v3: 10 named channels ────────────────────────
export type ChannelName =
  | 'x'             // X-rated overlay (top priority)
  | 'narrative'     // Creative action / narrative scenes
  | 'lipsync'       // Lip-synced performance footage
  | 'scenes-v2'     // V2 character-locked creative shots
  | 'scenes-v1'     // V1 creative shots (alt/B-roll)
  | 'titles-v2'     // V2 motion graphics (corrected lyrics)
  | 'titles-v1'     // V1 motion graphics
  | 'fx'            // Effects / transitions
  | 'spare'         // Extra track
  | 'music'         // Audio waveform (always bottom)

export type SubTrack = 'a' | 'b'

export interface TimelineTrackClip {
  id: string
  clipUrl: string
  startTime: number           // seconds from beginning of timeline
  duration: number            // seconds on timeline

  // Source offsets — for cut clips. Full clip = 0 to source duration.
  sourceStartOffset: number   // where in the source file this clip begins (seconds)
  sourceEndOffset: number     // where in the source file this clip ends (seconds)

  segment: number             // scene/title number from manifest
  type: 'performance' | 'title' | 'x'
  label?: string
  characterSlug?: string      // for X channel — which girl (A-Z)
}

export interface ChannelTracks {
  a: TimelineTrackClip[]
  b: TimelineTrackClip[]
}

/** Create an empty channel with both sub-tracks */
export function emptyChannel(): ChannelTracks {
  return { a: [], b: [] }
}

/** All channel names for iteration */
export const ALL_CHANNELS: ChannelName[] = [
  'x', 'narrative', 'lipsync', 'scenes-v2', 'scenes-v1',
  'titles-v2', 'titles-v1', 'fx', 'spare', 'music',
]

export type ChannelsMap = Record<ChannelName, ChannelTracks>

export interface TimelineProject {
  id: string
  schemaVersion: 3
  title: string
  trackSlug: string           // e.g. 'shibuya-mosh-pit'
  musicUrl: string
  musicSide: 'a' | 'b'

  channels: ChannelsMap

  fx: { crimson: boolean; glitch: boolean; rgb: boolean }
  resolution: '720p' | '1080p'
  orientation: 'portrait' | 'landscape'

  // Chain integration
  mintHistory: MintRecord[]    // incremental NFT chain
  conditions: MintCondition[]  // licensing terms attached to this edit

  createdAt: string
  updatedAt: string
}

// ── Chain / $401 / $402 types ─────────────────────
export interface MintRecord {
  txid: string
  hash: string
  prevTxid: string | null
  version: number
  mintedAt: string
  creator?: string
}

export interface MintCondition {
  type: 'license' | 'royalty' | 'attribution' | 'custom'
  token?: string
  terms: string
  bps?: number
}

// ── Resolver result ───────────────────────────────
export interface ActiveClipResult {
  clip: TimelineTrackClip
  channel: ChannelName
  subTrack: SubTrack
}

// ── Legacy v1 project (for migration) ─────────────
export interface TimelineProjectV1 {
  id: string
  title: string
  trackSlug: string
  musicUrl: string
  musicSide: 'a' | 'b'
  tracks: {
    title: TimelineTrackClip[]
    slow: TimelineTrackClip[]
    fast: TimelineTrackClip[]
  }
  fx: { crimson: boolean; glitch: boolean; rgb: boolean }
  resolution: '720p' | '1080p'
  orientation: 'portrait' | 'landscape'
  createdAt: string
  updatedAt: string
}

// ── Legacy v2 project (3 channels, for migration) ─
export interface TimelineProjectV2 {
  id: string
  schemaVersion: 2
  title: string
  trackSlug: string
  musicUrl: string
  musicSide: 'a' | 'b'
  channels: {
    music: ChannelTracks
    scenes: ChannelTracks
    x: ChannelTracks
  }
  fx: { crimson: boolean; glitch: boolean; rgb: boolean }
  resolution: '720p' | '1080p'
  orientation: 'portrait' | 'landscape'
  mintHistory: MintRecord[]
  conditions: MintCondition[]
  createdAt: string
  updatedAt: string
}

// ── Legacy compat alias ───────────────────────────
export function getTracksCompat(project: TimelineProject): { title: TimelineTrackClip[]; slow: TimelineTrackClip[]; fast: TimelineTrackClip[] } {
  return {
    title: [...project.channels.music.a, ...project.channels.music.b],
    slow: [...(project.channels['scenes-v2']?.a || []), ...(project.channels['scenes-v2']?.b || []), ...(project.channels['scenes-v1']?.a || []), ...(project.channels['scenes-v1']?.b || [])],
    fast: [...project.channels.x.a, ...project.channels.x.b],
  }
}
