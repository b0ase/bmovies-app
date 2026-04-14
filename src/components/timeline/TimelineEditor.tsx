'use client'

import { useReducer, useCallback, useRef, useEffect, useState } from 'react'
import type { TimelineProject, TimelineTrackClip, ChannelName, SubTrack, ChannelTracks } from '@/lib/timeline/types'
import { CHANNEL_ORDER, CHANNEL_CONFIG, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, TRACK_HEIGHT, SUB_TRACK_HEIGHT, RULER_HEIGHT } from '@/lib/timeline/constants'
import { resolveActiveClip, resolveActivePerChannel, getTimelineDuration, findFreeSlot, snapToGrid, formatTime, splitClipAtTime, channelClips } from '@/lib/timeline/utils'
import { saveProject } from '@/lib/timeline/store'
import Track from './Track'
import Playhead from './Playhead'
import TimeRuler from './TimeRuler'
import WaveformTrack from './WaveformTrack'
import { FaSearchPlus, FaSearchMinus, FaCut } from 'react-icons/fa'

/* ── Reducer ─────────────────────────────────────── */

type Action =
  | { type: 'ADD_CLIP'; channel: ChannelName; sub: SubTrack; clip: TimelineTrackClip }
  | { type: 'REMOVE_CLIP'; clipId: string }
  | { type: 'MOVE_CLIP'; clipId: string; targetChannel: ChannelName; targetSub: SubTrack; startTime: number }
  | { type: 'REPOSITION_CLIP'; clipId: string; startTime: number }
  | { type: 'SPLIT_CLIP'; clipId: string; splitTime: number }
  | { type: 'SET_FX'; fx: Partial<TimelineProject['fx']> }
  | { type: 'SET_MUSIC'; musicUrl: string; musicSide: 'a' | 'b' }
  | { type: 'CLEAR_ALL' }
  | { type: 'LOAD'; project: TimelineProject }
  // Legacy compat — map old TrackName actions to channels
  | { type: 'ADD_CLIP'; track: string; clip: TimelineTrackClip }

function trackToChannel(track: string): { channel: ChannelName; sub: SubTrack } {
  // Legacy compat
  if (track === 'title') return { channel: 'titles-v1', sub: 'a' }
  if (track === 'slow') return { channel: 'scenes-v2', sub: 'a' }
  if (track === 'fast') return { channel: 'x', sub: 'a' }
  // v3 channel names pass through
  return { channel: track as ChannelName, sub: 'a' }
}

function findClipLocation(channels: TimelineProject['channels'], clipId: string): { channel: ChannelName; sub: SubTrack } | null {
  for (const ch of CHANNEL_ORDER) {
    for (const sub of ['a', 'b'] as SubTrack[]) {
      if (channels[ch][sub].find(c => c.id === clipId)) return { channel: ch, sub }
    }
  }
  return null
}

function reducer(state: TimelineProject, action: Action): TimelineProject {
  const now = new Date().toISOString()
  switch (action.type) {
    case 'ADD_CLIP': {
      // Support legacy 'track' field or new 'channel'+'sub' fields
      const { channel, sub } = 'channel' in action && action.channel
        ? { channel: action.channel as ChannelName, sub: (action as any).sub || 'a' as SubTrack }
        : trackToChannel((action as any).track || 'scenes-v2')
      const ch_data: ChannelTracks = state.channels[channel] || { a: [], b: [] }
      const track: TimelineTrackClip[] = sub === 'a' ? (ch_data.a || []) : (ch_data.b || [])
      const appendEnd = action.clip.startTime < 0
        ? (track.length > 0 ? Math.max(...track.map((c: TimelineTrackClip) => c.startTime + c.duration)) : 0)
        : action.clip.startTime
      const startTime = findFreeSlot(track, appendEnd, action.clip.duration)
      const clip = {
        ...action.clip,
        startTime: snapToGrid(startTime),
        sourceStartOffset: action.clip.sourceStartOffset ?? 0,
        sourceEndOffset: action.clip.sourceEndOffset ?? action.clip.duration,
      }
      const channels = { ...state.channels }
      channels[channel] = { ...channels[channel], [sub]: [...track, clip] }
      return { ...state, channels, updatedAt: now }
    }
    case 'REMOVE_CLIP': {
      const channels = { ...state.channels }
      for (const ch of CHANNEL_ORDER) {
        channels[ch] = {
          a: channels[ch].a.filter(c => c.id !== action.clipId),
          b: channels[ch].b.filter(c => c.id !== action.clipId),
        }
      }
      return { ...state, channels, updatedAt: now }
    }
    case 'MOVE_CLIP': {
      const loc = findClipLocation(state.channels, action.clipId)
      if (!loc) return state
      const clip = state.channels[loc.channel][loc.sub].find(c => c.id === action.clipId)
      if (!clip) return state
      const channels = { ...state.channels }
      channels[loc.channel] = {
        ...channels[loc.channel],
        [loc.sub]: channels[loc.channel][loc.sub].filter(c => c.id !== action.clipId),
      }
      const targetTrack = channels[action.targetChannel][action.targetSub]
      const startTime = findFreeSlot(targetTrack, action.startTime, clip.duration, clip.id)
      channels[action.targetChannel] = {
        ...channels[action.targetChannel],
        [action.targetSub]: [...targetTrack, { ...clip, startTime: snapToGrid(startTime) }],
      }
      return { ...state, channels, updatedAt: now }
    }
    case 'REPOSITION_CLIP': {
      const loc = findClipLocation(state.channels, action.clipId)
      if (!loc) return state
      const channels = { ...state.channels }
      channels[loc.channel] = {
        ...channels[loc.channel],
        [loc.sub]: channels[loc.channel][loc.sub].map(c =>
          c.id === action.clipId ? { ...c, startTime: snapToGrid(Math.max(0, action.startTime)) } : c
        ),
      }
      return { ...state, channels, updatedAt: now }
    }
    case 'SPLIT_CLIP': {
      const loc = findClipLocation(state.channels, action.clipId)
      if (!loc) return state
      const clip = state.channels[loc.channel][loc.sub].find(c => c.id === action.clipId)
      if (!clip) return state
      if (action.splitTime <= clip.startTime || action.splitTime >= clip.startTime + clip.duration) return state
      const [clipA, clipB] = splitClipAtTime(clip, action.splitTime)
      const channels = { ...state.channels }
      channels[loc.channel] = {
        ...channels[loc.channel],
        [loc.sub]: channels[loc.channel][loc.sub]
          .filter(c => c.id !== action.clipId)
          .concat([clipA, clipB]),
      }
      return { ...state, channels, updatedAt: now }
    }
    case 'SET_FX':
      return { ...state, fx: { ...state.fx, ...action.fx }, updatedAt: now }
    case 'SET_MUSIC':
      return { ...state, musicUrl: action.musicUrl, musicSide: action.musicSide, updatedAt: now }
    case 'CLEAR_ALL': {
      const cleared: Record<string, { a: TimelineTrackClip[]; b: TimelineTrackClip[] }> = {}
      for (const ch of CHANNEL_ORDER) cleared[ch] = { a: [], b: [] }
      return { ...state, channels: cleared as TimelineProject['channels'], updatedAt: now }
    }
    case 'LOAD':
      return action.project
    default:
      return state
  }
}

/* ── Component ───────────────────────────────────── */

export type TimelineAction = Action

interface Props {
  initialProject: TimelineProject
  onProjectChange?: (project: TimelineProject) => void
  onPlayheadChange?: (time: number, activeClipUrl: string | null) => void
  isPlaying: boolean
  onPlayToggle: () => void
  musicVolume: number
  dispatchRef?: React.MutableRefObject<((action: Action) => void) | null>
}

export default function TimelineEditor({
  initialProject, onProjectChange, onPlayheadChange, isPlaying, onPlayToggle, musicVolume, dispatchRef,
}: Props) {
  const [project, dispatch] = useReducer(reducer, initialProject)

  useEffect(() => {
    if (dispatchRef) dispatchRef.current = dispatch
    return () => { if (dispatchRef) dispatchRef.current = null }
  }, [dispatchRef])

  const [expandedChannel, setExpandedChannel] = useState<ChannelName | null>(null)
  const [toolMode, setToolMode] = useState<'select' | 'cut'>('select')
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [playheadTime, setPlayheadTime] = useState(0)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [seekRequest, setSeekRequest] = useState<number | null>(null)
  const [musicDuration, setMusicDuration] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const timelineDuration = Math.max(getTimelineDuration(project.channels), musicDuration, 30)
  const activeResult = resolveActiveClip(project.channels, playheadTime)

  // Total clips across all channels
  const totalClips = CHANNEL_ORDER.reduce((sum, ch) =>
    sum + project.channels[ch].a.length + project.channels[ch].b.length, 0)

  useEffect(() => { onProjectChange?.(project) }, [project, onProjectChange])
  useEffect(() => { onPlayheadChange?.(playheadTime, activeResult?.clip.clipUrl || null) }, [playheadTime, activeResult?.clip.clipUrl, onPlayheadChange])

  // Auto-save
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { saveProject(project).catch(() => {}) }, 1000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [project])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) setToolMode(m => m === 'cut' ? 'select' : 'cut')
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) setToolMode('select')
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) dispatch({ type: 'REMOVE_CLIP', clipId: selectedClipId })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedClipId])

  const handleSeek = useCallback((time: number) => {
    setPlayheadTime(time)
    setSeekRequest(time)
    setTimeout(() => setSeekRequest(null), 100)
  }, [])

  const handleTimeUpdate = useCallback((time: number) => { setPlayheadTime(time) }, [])

  const handleClipMove = useCallback((clipId: string, newStartTime: number) => {
    dispatch({ type: 'REPOSITION_CLIP', clipId, startTime: newStartTime })
  }, [])

  const handleClipClick = useCallback((clipId: string, clickTime?: number) => {
    if (toolMode === 'cut' && clickTime != null) {
      dispatch({ type: 'SPLIT_CLIP', clipId, splitTime: clickTime })
    } else {
      setSelectedClipId(clipId)
    }
  }, [toolMode])

  // Drop handler — maps legacy track names to channels
  const handleDrop = useCallback((trackName: string, startTime: number, data: string) => {
    try {
      const parsed = JSON.parse(data)
      const { channel, sub } = trackToChannel(trackName)

      if (parsed.clipId && parsed.sourceTrack) {
        const from = trackToChannel(parsed.sourceTrack)
        dispatch({ type: 'MOVE_CLIP', clipId: parsed.clipId, targetChannel: channel, targetSub: sub, startTime })
        return
      }

      if (parsed.clipUrl) {
        const clip: TimelineTrackClip = {
          id: crypto.randomUUID(),
          clipUrl: parsed.clipUrl,
          startTime,
          duration: parsed.duration || 3,
          sourceStartOffset: 0,
          sourceEndOffset: parsed.duration || 3,
          segment: parsed.segment || 0,
          type: parsed.clipType || 'performance',
        }
        dispatch({ type: 'ADD_CLIP', channel, sub, clip })
      }
    } catch {}
  }, [])

  // Determine which channels to show (hide empty channels marked hidden)
  const visibleChannels = CHANNEL_ORDER.filter(ch => {
    const config = CHANNEL_CONFIG[ch]
    if (!config.hidden) return true
    // Show hidden channels only if they have clips
    const clips = channelClips(project.channels[ch] || { a: [], b: [] })
    return clips.length > 0
  })

  // Calculate heights
  const channelHeights = visibleChannels.map(ch =>
    expandedChannel === ch ? SUB_TRACK_HEIGHT * 2 : TRACK_HEIGHT
  )
  const totalTracksHeight = channelHeights.reduce((s, h) => s + h, 0) + 56 // +56 waveform

  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 overflow-hidden max-w-full ${toolMode === 'cut' ? 'cursor-crosshair' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Timeline</span>
          <span className="text-[9px] font-mono text-gray-600">{totalClips} clips</span>
          <span className="text-gray-700">|</span>
          <span className="text-[9px] font-mono text-gray-600">{formatTime(playheadTime)} / {formatTime(timelineDuration)}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Cut tool toggle */}
          <button
            onClick={() => setToolMode(m => m === 'cut' ? 'select' : 'cut')}
            className={`p-1.5 rounded transition-colors ${toolMode === 'cut' ? 'bg-red-600/30 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-white'}`}
            title="Cut tool (C)"
          >
            <FaCut className="w-3 h-3" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 10))} className="p-1 text-gray-500 hover:text-white">
            <FaSearchMinus className="w-3 h-3" />
          </button>
          <span className="text-[9px] font-mono text-gray-600 w-8 text-center">{zoom}px</span>
          <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 10))} className="p-1 text-gray-500 hover:text-white">
            <FaSearchPlus className="w-3 h-3" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => dispatch({ type: 'CLEAR_ALL' })} className="text-[9px] font-bold text-gray-600 hover:text-red-400 uppercase px-2 py-1">
            Clear
          </button>
        </div>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden relative" style={{ maxHeight: totalTracksHeight + RULER_HEIGHT + 8 }}>
        {/* Ruler */}
        <div className="sticky top-0 z-30 bg-black/60 border-b border-white/5 pl-14">
          <TimeRuler duration={timelineDuration} zoom={zoom} playheadTime={playheadTime} onSeek={handleSeek} scrollLeft={scrollRef.current?.scrollLeft || 0} />
        </div>

        {/* Channels */}
        <div className="relative">
          {visibleChannels.map(ch => {
            const config = CHANNEL_CONFIG[ch]
            const isExpanded = expandedChannel === ch
            const legacyName = ch === 'music' ? 'title' : ch.startsWith('scenes') ? 'slow' : ch.startsWith('titles') ? 'title' : ch === 'x' ? 'fast' : 'slow'

            if (isExpanded) {
              // Dual sub-tracks
              return (
                <div key={ch}>
                  {/* Sub-track A */}
                  <div className="relative">
                    <div
                      className={`absolute left-0 top-0 w-14 h-full flex flex-col items-center justify-center z-20 cursor-pointer ${config.bgClass} border-r border-white/5`}
                      onClick={() => setExpandedChannel(null)}
                    >
                      <span className={`text-[8px] font-black uppercase tracking-widest ${config.textClass}`}>{config.label}</span>
                      <span className="text-[7px] text-gray-600">{config.subALabel}</span>
                    </div>
                    <Track
                      name={legacyName as any}
                      clips={project.channels[ch].a}
                      zoom={zoom}
                      duration={timelineDuration}
                      activeClipId={activeResult?.clip.id || null}
                      selectedClipId={selectedClipId}
                      onSelect={handleClipClick}
                      onRemove={clipId => dispatch({ type: 'REMOVE_CLIP', clipId })}
                      onDrop={handleDrop}
                      onClipMove={handleClipMove}
                    />
                  </div>
                  {/* Sub-track B (edit lane) */}
                  <div className="relative border-t border-dashed border-white/10">
                    <div className={`absolute left-0 top-0 w-14 h-full flex flex-col items-center justify-center z-20 ${config.bgClass} border-r border-white/5 opacity-60`}>
                      <span className="text-[7px] text-gray-600">{config.subBLabel}</span>
                    </div>
                    <Track
                      name={legacyName as any}
                      clips={project.channels[ch].b}
                      zoom={zoom}
                      duration={timelineDuration}
                      activeClipId={null}
                      selectedClipId={selectedClipId}
                      onSelect={handleClipClick}
                      onRemove={clipId => dispatch({ type: 'REMOVE_CLIP', clipId })}
                      onDrop={handleDrop}
                      onClipMove={handleClipMove}
                    />
                  </div>
                </div>
              )
            }

            // Collapsed — single track showing sub-track A
            return (
              <div key={ch} className="relative">
                <div
                  className={`absolute left-0 top-0 w-14 h-full flex items-center justify-center z-20 cursor-pointer ${config.bgClass} border-r border-white/5 hover:brightness-125 transition-all`}
                  onClick={() => setExpandedChannel(ch)}
                  title={`Click to expand ${config.label} for editing`}
                >
                  <span className={`text-[8px] font-black uppercase tracking-widest ${config.textClass}`}>{config.label}</span>
                </div>
                <Track
                  name={legacyName as any}
                  clips={[...project.channels[ch].a, ...project.channels[ch].b]}
                  zoom={zoom}
                  duration={timelineDuration}
                  activeClipId={activeResult?.clip.id || null}
                  selectedClipId={selectedClipId}
                  onSelect={handleClipClick}
                  onRemove={clipId => dispatch({ type: 'REMOVE_CLIP', clipId })}
                  onDrop={handleDrop}
                  onClipMove={handleClipMove}
                />
              </div>
            )
          })}

          {/* Waveform */}
          {project.musicUrl && (
            <WaveformTrack
              musicUrl={project.musicUrl}
              isPlaying={isPlaying}
              zoom={zoom}
              duration={timelineDuration}
              onTimeUpdate={handleTimeUpdate}
              onReady={setMusicDuration}
              onPlay={() => {}}
              onPause={() => {}}
              seekTo={seekRequest}
              volume={musicVolume}
            />
          )}

          {/* Playhead */}
          <Playhead time={playheadTime} zoom={zoom} height={totalTracksHeight} onSeek={handleSeek} duration={timelineDuration} />
        </div>
      </div>
    </div>
  )
}
