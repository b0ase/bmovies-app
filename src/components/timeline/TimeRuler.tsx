'use client'

import { useCallback, useRef } from 'react'
import { RULER_HEIGHT } from '@/lib/timeline/constants'
import { formatTime } from '@/lib/timeline/utils'

interface Props {
  duration: number
  zoom: number
  playheadTime: number
  onSeek: (time: number) => void
  scrollLeft: number
}

export default function TimeRuler({ duration, zoom, playheadTime, onSeek, scrollLeft }: Props) {
  const totalWidth = Math.max(duration * zoom, 800)
  const interval = zoom >= 80 ? 1 : zoom >= 40 ? 2 : zoom >= 20 ? 5 : 10
  const dragging = useRef(false)

  const getTimeFromEvent = useCallback((e: { clientX: number }, rect: DOMRect) => {
    const x = e.clientX - rect.left
    return Math.max(0, Math.min(duration, x / zoom))
  }, [zoom, duration])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragging.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek(getTimeFromEvent(e, rect))
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [getTimeFromEvent, onSeek])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek(getTimeFromEvent(e, rect))
  }, [getTimeFromEvent, onSeek])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  const markers: { time: number; major: boolean }[] = []
  for (let t = 0; t <= duration + interval; t += interval) {
    markers.push({ time: t, major: t % (interval * 5) === 0 || interval >= 5 })
  }

  return (
    <div
      className="relative cursor-pointer select-none touch-none"
      style={{ width: totalWidth, height: RULER_HEIGHT }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {markers.map(m => (
        <div
          key={m.time}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: m.time * zoom }}
        >
          <div className={`w-px ${m.major ? 'h-3 bg-gray-500' : 'h-2 bg-gray-700'}`} />
          {m.major && (
            <span className="text-[8px] font-mono text-gray-600 mt-0.5 whitespace-nowrap">
              {formatTime(m.time)}
            </span>
          )}
        </div>
      ))}

      {/* Playhead position indicator on ruler */}
      <div
        className="absolute top-0 w-2.5 h-full"
        style={{ left: playheadTime * zoom - 5 }}
      >
        <div className="w-0 h-0 mx-auto border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-500" />
      </div>
    </div>
  )
}
