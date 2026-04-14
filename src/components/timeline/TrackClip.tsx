'use client'

import { useRef, useCallback } from 'react'
import type { TimelineTrackClip, TrackName } from '@/lib/timeline/types'
import { TRACK_CONFIG, TRACK_HEIGHT } from '@/lib/timeline/constants'

interface Props {
  clip: TimelineTrackClip
  track: TrackName
  zoom: number
  isActive: boolean
  isSelected: boolean
  onSelect: (clipId: string, clickTime?: number) => void
  onRemove: (clipId: string) => void
  onMoveStart?: (clipId: string, track: TrackName) => void
  onMoveUpdate?: (clipId: string, newStartTime: number) => void
  onMoveEnd?: (clipId: string) => void
}

export default function TrackClip({ clip, track, zoom, isActive, isSelected, onSelect, onRemove, onMoveStart, onMoveUpdate, onMoveEnd }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const config = TRACK_CONFIG[track]
  const width = clip.duration * zoom
  const left = clip.startTime * zoom
  const dragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartTime = useRef(0)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Don't start drag on delete button
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    dragStartX.current = e.clientX
    dragStartTime.current = clip.startTime
    // Calculate click time relative to clip start
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickTime = clip.startTime + (clickX / zoom) * (clip.duration / (width / zoom))
    onSelect(clip.id, clickTime)
    onMoveStart?.(clip.id, track)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [clip.id, clip.startTime, clip.duration, width, track, zoom, onSelect, onMoveStart])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStartX.current
    const dt = dx / zoom
    const newStart = Math.max(0, dragStartTime.current + dt)
    onMoveUpdate?.(clip.id, newStart)
  }, [clip.id, zoom, onMoveUpdate])

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    onMoveEnd?.(clip.id)
  }, [clip.id, onMoveEnd])

  // Also support HTML drag for cross-track moves
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ clipId: clip.id, sourceTrack: track }))
    e.dataTransfer.effectAllowed = 'move'
  }, [clip.id, track])

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute top-1 bottom-1 rounded overflow-hidden border transition-colors group touch-none ${
        isSelected ? `${config.borderClass} border-2 shadow-lg cursor-grabbing` :
        isActive ? `${config.borderClass} border shadow-md cursor-grab` :
        'border-white/10 hover:border-white/20 cursor-grab'
      }`}
      style={{ left, width: Math.max(width, 20), height: TRACK_HEIGHT - 8 }}
    >
      <video
        ref={videoRef}
        src={clip.clipUrl}
        muted playsInline preload="metadata"
        className="w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0.5 left-1 right-4 flex items-center gap-1 pointer-events-none">
        <span className={`text-[7px] font-bold ${config.textClass}`}>
          {clip.type === 'title' ? `T${clip.segment}` : `#${clip.segment}`}
        </span>
        <span className="text-[7px] font-mono text-gray-400">{clip.duration.toFixed(1)}s</span>
      </div>
      {isActive && (
        <div className={`absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full animate-pulse ${
          track === 'title' ? 'bg-cyan-400' : track === 'slow' ? 'bg-pink-400' : 'bg-orange-400'
        }`} />
      )}
      <button
        onClick={e => { e.stopPropagation(); onRemove(clip.id) }}
        className="absolute top-0 right-0 w-5 h-5 bg-red-900/80 hover:bg-red-600 rounded-bl text-white text-[10px] font-bold flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        x
      </button>
    </div>
  )
}
