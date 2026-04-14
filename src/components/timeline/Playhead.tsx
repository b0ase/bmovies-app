'use client'

import { useCallback, useRef } from 'react'

interface Props {
  time: number
  zoom: number
  height: number
  onSeek?: (time: number) => void
  duration?: number
}

export default function Playhead({ time, zoom, height, onSeek, duration }: Props) {
  const left = time * zoom + 56 // 56px = track label width (w-14)
  const dragging = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!onSeek) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [onSeek])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !onSeek) return
    const parent = (e.currentTarget as HTMLElement).parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    const x = e.clientX - rect.left - 56
    const t = Math.max(0, Math.min(duration || 999, x / zoom))
    onSeek(t)
  }, [onSeek, zoom, duration])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <div
      className="absolute top-0 z-20"
      style={{ left, height, transform: 'translateX(-5px)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Draggable handle — wider hit area */}
      <div className="w-[11px] cursor-col-resize" style={{ height }}>
        {/* Triangle */}
        <div className="w-0 h-0 ml-[0.5px] border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-red-500" />
        {/* Line */}
        <div className="w-px bg-red-500/80 ml-[5px]" style={{ height: height - 7 }} />
      </div>
    </div>
  )
}
