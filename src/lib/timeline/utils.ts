/* ── Timeline Utility Functions ───────────────────── */

import type {
  TimelineProject, TimelineProjectV1, TimelineProjectV2, TimelineTrackClip,
  TrackName, ChannelName, SubTrack, ActiveClipResult, ChannelTracks, ChannelsMap,
  ALL_CHANNELS, emptyChannel,
} from './types'
import { TRACK_ORDER, CHANNEL_ORDER, SNAP_GRID } from './constants'

// Re-export for convenience
export { emptyChannel } from './types'

// ── Channel helpers ─────────────────────────────────

/** Get all clips from a channel (both sub-tracks) */
export function channelClips(ch: ChannelTracks): TimelineTrackClip[] {
  return [...(ch?.a || []), ...(ch?.b || [])]
}

/** Create a full empty channels map with all 10 tracks */
function emptyChannels(): ChannelsMap {
  const { emptyChannel: ec } = require('./types')
  return {
    'x': ec(), 'narrative': ec(), 'lipsync': ec(),
    'scenes-v2': ec(), 'scenes-v1': ec(),
    'titles-v2': ec(), 'titles-v1': ec(),
    'fx': ec(), 'spare': ec(), 'music': ec(),
  }
}

/** Resolve which clip should play at a given time (top channel = highest priority) */
export function resolveActiveClip(
  channels: ChannelsMap,
  time: number,
  priority: ChannelName[] = CHANNEL_ORDER,
): ActiveClipResult | null {
  for (const ch of priority) {
    if (!channels[ch]) continue
    for (const sub of ['a', 'b'] as SubTrack[]) {
      const clip = (channels[ch][sub] || []).find(
        c => time >= c.startTime && time < c.startTime + c.duration,
      )
      if (clip) return { clip, channel: ch, subTrack: sub }
    }
  }
  return null
}

/** Resolve active clip per channel (for multi-preview) */
export function resolveActivePerChannel(
  channels: ChannelsMap,
  time: number,
): Partial<Record<ChannelName, TimelineTrackClip | null>> {
  const result: Partial<Record<ChannelName, TimelineTrackClip | null>> = {}
  for (const ch of CHANNEL_ORDER) {
    result[ch] = null
    if (!channels[ch]) continue
    for (const sub of ['a', 'b'] as SubTrack[]) {
      const clip = (channels[ch][sub] || []).find(
        c => time >= c.startTime && time < c.startTime + c.duration,
      )
      if (clip) { result[ch] = clip; break }
    }
  }
  return result
}

/** Get the total duration of the timeline */
export function getTimelineDuration(channels: ChannelsMap): number {
  let max = 0
  for (const ch of CHANNEL_ORDER) {
    if (!channels[ch]) continue
    for (const sub of ['a', 'b'] as SubTrack[]) {
      for (const clip of (channels[ch][sub] || [])) {
        const end = clip.startTime + clip.duration
        if (end > max) max = end
      }
    }
  }
  return max
}

/** Legacy compat — get duration from old tracks format */
export function getTimelineDurationLegacy(tracks: { title: TimelineTrackClip[]; slow: TimelineTrackClip[]; fast: TimelineTrackClip[] }): number {
  let max = 0
  for (const name of TRACK_ORDER) {
    for (const clip of tracks[name]) {
      const end = clip.startTime + clip.duration
      if (end > max) max = end
    }
  }
  return max
}

// ── Clip operations ─────────────────────────────────

/** Check if two clips overlap */
export function clipsOverlap(a: TimelineTrackClip, b: TimelineTrackClip): boolean {
  return a.startTime < b.startTime + b.duration && b.startTime < a.startTime + a.duration
}

/** Find nearest non-overlapping start time */
export function findFreeSlot(
  track: TimelineTrackClip[],
  desiredStart: number,
  duration: number,
  excludeId?: string,
): number {
  const candidate: TimelineTrackClip = {
    id: '', clipUrl: '', startTime: desiredStart, duration, segment: 0,
    type: 'performance', sourceStartOffset: 0, sourceEndOffset: duration,
  }
  const existing = excludeId ? track.filter(c => c.id !== excludeId) : track
  const overlapping = existing.find(c => clipsOverlap(candidate, c))
  if (!overlapping) return Math.max(0, desiredStart)
  return overlapping.startTime + overlapping.duration
}

/** Split a clip at an absolute timeline time → returns [clipA, clipB] */
export function splitClipAtTime(
  clip: TimelineTrackClip,
  absoluteSplitTime: number,
): [TimelineTrackClip, TimelineTrackClip] {
  const clipEnd = clip.startTime + clip.duration
  if (absoluteSplitTime <= clip.startTime || absoluteSplitTime >= clipEnd) {
    throw new Error('Split time must be within clip bounds')
  }

  const splitDurationA = absoluteSplitTime - clip.startTime
  const splitDurationB = clipEnd - absoluteSplitTime

  const sourceRange = clip.sourceEndOffset - clip.sourceStartOffset
  const splitRatio = splitDurationA / clip.duration
  const sourceSplitPoint = clip.sourceStartOffset + (sourceRange * splitRatio)

  const clipA: TimelineTrackClip = {
    ...clip,
    id: crypto.randomUUID(),
    duration: splitDurationA,
    sourceEndOffset: sourceSplitPoint,
  }

  const clipB: TimelineTrackClip = {
    ...clip,
    id: crypto.randomUUID(),
    startTime: absoluteSplitTime,
    duration: splitDurationB,
    sourceStartOffset: sourceSplitPoint,
  }

  return [clipA, clipB]
}

/** Create a clip with proper defaults */
export function createClip(partial: {
  clipUrl: string
  startTime: number
  duration: number
  segment?: number
  type?: TimelineTrackClip['type']
  label?: string
  characterSlug?: string
}): TimelineTrackClip {
  return {
    id: crypto.randomUUID(),
    clipUrl: partial.clipUrl,
    startTime: partial.startTime,
    duration: partial.duration,
    sourceStartOffset: 0,
    sourceEndOffset: partial.duration,
    segment: partial.segment ?? 0,
    type: partial.type ?? 'performance',
    label: partial.label,
    characterSlug: partial.characterSlug,
  }
}

// ── Formatting ──────────────────────────────────────

export function snapToGrid(time: number, grid: number = SNAP_GRID): number {
  return Math.round(time / grid) * grid
}

export function secondsToPixels(seconds: number, zoom: number): number {
  return seconds * zoom
}

export function pixelsToSeconds(px: number, zoom: number): number {
  return px / zoom
}

export function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// ── Flatten (for export) ────────────────────────────

export function flattenByPriority(
  channels: ChannelsMap,
  totalDuration: number,
  step: number = 0.1,
): { clipUrl: string; duration: number }[] {
  const sequence: { clipUrl: string; duration: number }[] = []
  let currentUrl = ''
  let currentDuration = 0

  for (let t = 0; t < totalDuration; t += step) {
    const result = resolveActiveClip(channels, t)
    const url = result?.clip.clipUrl || ''

    if (url === currentUrl) {
      currentDuration += step
    } else {
      if (currentUrl && currentDuration > 0) {
        sequence.push({ clipUrl: currentUrl, duration: Math.round(currentDuration * 10) / 10 })
      }
      currentUrl = url
      currentDuration = step
    }
  }

  if (currentUrl && currentDuration > 0) {
    sequence.push({ clipUrl: currentUrl, duration: Math.round(currentDuration * 10) / 10 })
  }

  return sequence
}

// ── Migration ───────────────────────────────────────

/** Migrate a v1 clip to v3 (add source offsets) */
function migrateClip(clip: any): TimelineTrackClip {
  return {
    ...clip,
    sourceStartOffset: clip.sourceStartOffset ?? 0,
    sourceEndOffset: clip.sourceEndOffset ?? clip.duration,
    type: clip.type === 'title' ? 'title' : clip.type === 'x' ? 'x' : 'performance',
  }
}

/** Detect if a project is v1 (has tracks, no channels) */
export function isV1Project(project: any): project is TimelineProjectV1 {
  return project && 'tracks' in project && !('channels' in project)
}

/** Detect if a project is v2 (3 channels, schemaVersion 2) */
export function isV2Project(project: any): boolean {
  return project?.schemaVersion === 2 && project.channels && !project.channels['scenes-v2']
}

/** Migrate v1 project → v3 */
export function migrateV1Project(old: TimelineProjectV1): TimelineProject {
  const channels = emptyChannels()
  channels['titles-v1'].a = (old.tracks.title || []).map(migrateClip)
  channels['scenes-v1'].a = (old.tracks.slow || []).map(migrateClip)
  channels.x.a = (old.tracks.fast || []).map(migrateClip)

  return {
    id: old.id,
    schemaVersion: 3,
    title: old.title,
    trackSlug: old.trackSlug,
    musicUrl: old.musicUrl,
    musicSide: old.musicSide,
    channels,
    fx: old.fx,
    resolution: old.resolution,
    orientation: old.orientation,
    mintHistory: [],
    conditions: [],
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
  }
}

/** Migrate v2 project (3 channels) → v3 (10 channels) */
export function migrateV2Project(old: TimelineProjectV2): TimelineProject {
  const channels = emptyChannels()
  // Map old channels to new
  channels['titles-v1'] = old.channels.music || { a: [], b: [] }
  // scenes.a → scenes-v2, scenes.b → scenes-v1
  channels['scenes-v2'].a = old.channels.scenes?.a || []
  channels['scenes-v1'].a = old.channels.scenes?.b || []
  channels.x = old.channels.x || { a: [], b: [] }

  return {
    id: old.id,
    schemaVersion: 3,
    title: old.title,
    trackSlug: old.trackSlug,
    musicUrl: old.musicUrl,
    musicSide: old.musicSide,
    channels,
    fx: old.fx,
    resolution: old.resolution,
    orientation: old.orientation,
    mintHistory: old.mintHistory || [],
    conditions: old.conditions || [],
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
  }
}

/** Create a new empty v3 project */
export function createEmptyProject(trackSlug: string, title?: string): TimelineProject {
  return {
    id: crypto.randomUUID(),
    schemaVersion: 3,
    title: title || 'Untitled Edit',
    trackSlug,
    musicUrl: '',
    musicSide: 'a',
    channels: emptyChannels(),
    fx: { crimson: false, glitch: false, rgb: false },
    resolution: '1080p',
    orientation: 'landscape',
    mintHistory: [],
    conditions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/** Compute SHA-256 hash of project JSON (for chain minting) */
export async function hashProject(project: TimelineProject): Promise<string> {
  const { updatedAt, mintHistory, ...hashable } = project
  const json = JSON.stringify(hashable, null, 0)
  const buf = new TextEncoder().encode(json)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}
