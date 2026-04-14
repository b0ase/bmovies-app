'use client'

import { useEffect, useRef, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'

interface Props {
  musicUrl: string
  isPlaying: boolean
  zoom: number
  duration: number
  onTimeUpdate: (time: number) => void
  onReady: (duration: number) => void
  onPlay: () => void
  onPause: () => void
  seekTo?: number | null  // external seek request
  volume: number
}

export default function WaveformTrack({
  musicUrl, isPlaying, zoom, duration, onTimeUpdate, onReady, onPlay, onPause, seekTo, volume,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const totalWidth = Math.max(duration * zoom, 800)

  // Init wavesurfer
  useEffect(() => {
    if (!containerRef.current || !musicUrl) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#ec4899',
      progressColor: '#06b6d4',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      height: 48,
      normalize: true,
      interact: false,       // disable click-to-play/seek — parent controls playback
      autoplay: false,
    })

    ws.load(musicUrl).catch(() => {})

    ws.on('ready', () => {
      onReady(ws.getDuration())
    })

    ws.on('seeking', () => {
      onTimeUpdate(ws.getCurrentTime())
    })

    wsRef.current = ws

    // Poll time at 30fps — more reliable than audioprocess event
    let rafId: number
    const pollTime = () => {
      if (wsRef.current && wsRef.current.isPlaying()) {
        onTimeUpdate(wsRef.current.getCurrentTime())
      }
      rafId = requestAnimationFrame(pollTime)
    }
    rafId = requestAnimationFrame(pollTime)

    return () => {
      cancelAnimationFrame(rafId)
      try { ws.destroy() } catch {}
      wsRef.current = null
    }
  }, [musicUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync play/pause
  useEffect(() => {
    const ws = wsRef.current
    if (!ws) return
    if (isPlaying && !ws.isPlaying()) ws.play().catch(() => {})
    if (!isPlaying && ws.isPlaying()) ws.pause()
  }, [isPlaying])

  // External seek
  useEffect(() => {
    if (seekTo !== null && seekTo !== undefined && wsRef.current) {
      const dur = wsRef.current.getDuration()
      if (dur > 0) wsRef.current.seekTo(seekTo / dur)
    }
  }, [seekTo])

  // Volume
  useEffect(() => {
    if (wsRef.current) wsRef.current.setVolume(volume)
  }, [volume])

  return (
    <div className="relative bg-black/40 border-b border-white/5" style={{ height: 56, width: totalWidth }}>
      <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center z-10 bg-black/40 border-r border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-green-400">AUDIO</span>
      </div>
      <div className="absolute left-0 top-1 bottom-1 overflow-hidden" style={{ width: totalWidth }}>
        <div ref={containerRef} style={{ width: totalWidth, height: '100%' }} />
      </div>
    </div>
  )
}
