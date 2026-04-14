'use client'

import { useCallback } from 'react'
import type { TimelineTrackClip, TrackName } from '@/lib/timeline/types'
import { TRACK_CONFIG, TRACK_HEIGHT } from '@/lib/timeline/constants'
import TrackClip from './TrackClip'

interface Props {
  name: TrackName
  clips: TimelineTrackClip[]
  zoom: number
  duration: number
  activeClipId: string | null
  selectedClipId: string | null
  onSelect: (clipId: string, clickTime?: number) => void
  onRemove: (clipId: string) => void
  onDrop: (track: TrackName, startTime: number, data: string) => void
  onClipMove?: (clipId: string, newStartTime: number) => void
}

export default function Track({ name, clips, zoom, duration, activeClipId, selectedClipId, onSelect, onRemove, onDrop, onClipMove }: Props) {
  const config = TRACK_CONFIG[name]
  const totalWidth = Math.max(duration * zoom, 800)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft
    const startTime = Math.max(0, x / zoom)

    const json = e.dataTransfer.getData('application/json')
    if (json) { onDrop(name, startTime, json); return }

    const clipData = e.dataTransfer.getData('text/plain')
    if (clipData) onDrop(name, startTime, clipData)
  }, [name, zoom, onDrop])

  // Click on empty track area to seek
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    // Could add seek-on-click here
  }, [])

  return (
    <div
      className={`relative ${config.bgClass} border-b border-white/5`}
      style={{ height: TRACK_HEIGHT, width: totalWidth }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* Track label */}
      <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center z-10 bg-black/40 border-r border-white/5">
        <span className={`text-[9px] font-black uppercase tracking-widest ${config.textClass}`}>
          {config.label}
        </span>
      </div>

      {/* Clips */}
      <div className="absolute left-14 top-0 bottom-0 right-0">
        {clips.map(clip => (
          <TrackClip
            key={clip.id}
            clip={clip}
            track={name}
            zoom={zoom}
            isActive={clip.id === activeClipId}
            isSelected={clip.id === selectedClipId}
            onSelect={onSelect}
            onRemove={onRemove}
            onMoveUpdate={onClipMove ? (id, t) => onClipMove(id, t) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
