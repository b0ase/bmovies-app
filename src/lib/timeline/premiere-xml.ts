/**
 * Premiere Pro XML Export
 *
 * Converts a TimelineProject to FCP XML (Final Cut Pro 7 XML format),
 * which Premiere Pro imports natively via File > Import.
 *
 * Channel mapping:
 *   music  → V1 (base layer — karaoke/lyrics)
 *   scenes → V2 (performance clips)
 *   x      → V3 (overlay — X content)
 *   audio  → A1 (music track)
 *
 * Sub-tracks a/b are flattened into a single track per channel.
 */

import type { TimelineProject, TimelineTrackClip, ChannelName } from './types'

// ── Types ──────────────────────────────────────────────────────────

interface ExportOptions {
  fps: number           // default 30
  width: number         // default 1920
  height: number        // default 1080
  sampleRate: number    // default 48000
}

const DEFAULTS: ExportOptions = {
  fps: 30,
  width: 1920,
  height: 1080,
  sampleRate: 48000,
}

// ── Helpers ────────────────────────────────────────────────────────

function framesToTimecode(frames: number, fps: number): string {
  const totalSeconds = Math.floor(frames / fps)
  const f = frames % fps
  const s = totalSeconds % 60
  const m = Math.floor(totalSeconds / 60) % 60
  const h = Math.floor(totalSeconds / 3600)
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ── XML Generation ────────────────────────────────────────────────

function generateClipItem(
  clip: TimelineTrackClip,
  index: number,
  fps: number,
): string {
  const startFrame = secondsToFrames(clip.startTime, fps)
  const endFrame = secondsToFrames(clip.startTime + clip.duration, fps)
  const sourceInFrame = secondsToFrames(clip.sourceStartOffset, fps)
  const sourceOutFrame = secondsToFrames(clip.sourceEndOffset || clip.duration, fps)

  const clipName = clip.label || `clip-${index + 1}`
  const fileId = `file-${clip.id}`

  return `
          <clipitem id="clipitem-${clip.id}">
            <name>${escapeXml(clipName)}</name>
            <duration>${endFrame - startFrame}</duration>
            <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
            <start>${startFrame}</start>
            <end>${endFrame}</end>
            <in>${sourceInFrame}</in>
            <out>${sourceOutFrame}</out>
            <file id="${fileId}">
              <name>${escapeXml(clipName)}</name>
              <pathurl>${escapeXml(clip.clipUrl)}</pathurl>
              <media>
                <video>
                  <duration>${sourceOutFrame - sourceInFrame}</duration>
                  <samplecharacteristics>
                    <width>1920</width>
                    <height>1080</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
          </clipitem>`
}

function generateTrack(
  trackName: string,
  clips: TimelineTrackClip[],
  trackIndex: number,
  fps: number,
): string {
  if (clips.length === 0) return ''

  const sorted = [...clips].sort((a, b) => a.startTime - b.startTime)
  const clipItems = sorted.map((clip, i) => generateClipItem(clip, i, fps)).join('\n')

  return `
        <track>
          <name>${escapeXml(trackName)}</name>
          <locked>FALSE</locked>
          <enabled>TRUE</enabled>${clipItems}
        </track>`
}

/**
 * Export a TimelineProject as Premiere-compatible FCP XML.
 */
export function exportToPremiereXml(
  project: TimelineProject,
  options?: Partial<ExportOptions>,
): string {
  const opts = { ...DEFAULTS, ...options }

  // Resolve orientation
  if (project.orientation === 'portrait') {
    opts.width = 1080
    opts.height = 1920
  }
  if (project.resolution === '720p') {
    opts.width = Math.round(opts.width * 720 / 1080)
    opts.height = 720
  }

  // Flatten sub-tracks a + b per channel
  const { CHANNEL_ORDER: chOrder } = require('./constants')
  const { CHANNEL_CONFIG: chConfig } = require('./constants')
  const channelMap: Partial<Record<ChannelName, { label: string; clips: TimelineTrackClip[] }>> = {}
  for (const ch of chOrder as ChannelName[]) {
    const data = project.channels[ch]
    if (!data) continue
    const clips = [...(data.a || []), ...(data.b || [])]
    if (clips.length > 0) {
      channelMap[ch] = { label: chConfig[ch]?.label || ch, clips }
    }
  }

  // Calculate total duration
  const allClips = Object.values(channelMap).flatMap(ch => ch!.clips)
  const totalDuration = allClips.length > 0
    ? Math.max(...allClips.map(c => c.startTime + c.duration))
    : 0
  const totalFrames = secondsToFrames(totalDuration, opts.fps)

  // Generate video tracks for all channels that have clips
  const trackOrder = Object.keys(channelMap) as ChannelName[]
  const videoTracks = trackOrder
    .map((ch, i) => generateTrack(channelMap[ch]!.label, channelMap[ch]!.clips, i, opts.fps))
    .filter(Boolean)
    .join('\n')

  // Audio track for music
  const audioTrack = project.musicUrl ? `
        <track>
          <name>MUSIC</name>
          <locked>FALSE</locked>
          <enabled>TRUE</enabled>
          <clipitem id="clipitem-music">
            <name>${escapeXml(project.title)} (${project.musicSide.toUpperCase()}-Side)</name>
            <duration>${totalFrames}</duration>
            <rate><timebase>${opts.fps}</timebase><ntsc>FALSE</ntsc></rate>
            <start>0</start>
            <end>${totalFrames}</end>
            <in>0</in>
            <out>${totalFrames}</out>
            <file id="file-music">
              <name>${escapeXml(project.title)} Audio</name>
              <pathurl>${escapeXml(project.musicUrl)}</pathurl>
              <media>
                <audio>
                  <channelcount>2</channelcount>
                  <samplecharacteristics>
                    <samplerate>${opts.sampleRate}</samplerate>
                    <depth>16</depth>
                  </samplecharacteristics>
                </audio>
              </media>
            </file>
          </clipitem>
        </track>` : ''

  const sequenceName = `${project.title} — NPGX Edit`

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence>
    <name>${escapeXml(sequenceName)}</name>
    <duration>${totalFrames}</duration>
    <rate>
      <timebase>${opts.fps}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <timecode>
      <string>${framesToTimecode(0, opts.fps)}</string>
      <frame>0</frame>
      <rate><timebase>${opts.fps}</timebase><ntsc>FALSE</ntsc></rate>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <width>${opts.width}</width>
            <height>${opts.height}</height>
            <pixelaspectratio>square</pixelaspectratio>
            <rate><timebase>${opts.fps}</timebase><ntsc>FALSE</ntsc></rate>
            <codec>
              <name>Apple ProRes 422</name>
            </codec>
          </samplecharacteristics>
        </format>
${videoTracks}
      </video>
      <audio>
        <format>
          <samplecharacteristics>
            <samplerate>${opts.sampleRate}</samplerate>
            <depth>16</depth>
          </samplecharacteristics>
        </format>
${audioTrack}
      </audio>
    </media>
  </sequence>
</xmeml>
`
}
