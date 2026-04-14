'use client'

import { cdnUrl } from '@/lib/cdn'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const PRICE = 99

export default function XXXFXPage() {
  const { trackSlug } = useParams<{ trackSlug: string }>()
  const [paid, setPaid] = useState(false)
  const [checking, setChecking] = useState(true)
  const [clips, setClips] = useState<string[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const playStartRef = useRef(0)
  const [fxStyle, setFxStyle] = useState<React.CSSProperties>({})

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  useEffect(() => {
    const show = () => { setShowControls(true); if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setShowControls(false), 3000) }
    show(); window.addEventListener('mousemove', show); window.addEventListener('touchstart', show)
    return () => { window.removeEventListener('mousemove', show); window.removeEventListener('touchstart', show) }
  }, [])

  useEffect(() => {
    const key = `npgx-xxx-${trackSlug}`
    const hasPaid = localStorage.getItem(key) === 'paid'
    const handle = document.cookie.match(/npgx_user_handle=([^;]+)/)?.[1] || ''
    const freeAccess = ['boase', 'ninjapunkgirlsx'].includes(handle.toLowerCase())
    setPaid(hasPaid || freeAccess)
    setChecking(false)
  }, [trackSlug])

  useEffect(() => {
    if (!paid || !trackSlug) return
    fetch(`/api/music-video-clips?track=${trackSlug}&subfolder=xxx`)
      .then(r => r.json())
      .then(data => { if (data.clips?.length) setClips(data.clips.sort(() => Math.random() - 0.5)) })
      .catch(() => {})
  }, [paid, trackSlug])

  useEffect(() => {
    const audio = new Audio()
    audio.loop = true; audio.volume = 1; audio.preload = 'auto'
    if (trackSlug) { audio.src = `/music/albums/tokyo-gutter-punk/${trackSlug === 'razor-kisses' ? '06' : '01'}-a.mp3`; audio.load() }
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [trackSlug])

  // Clip switching timer
  useEffect(() => {
    if (!isPlaying || clips.length === 0) return
    const id = setInterval(() => {
      const elapsed = (Date.now() - playStartRef.current) / 1000
      if (elapsed < 10) return // slow intro
      // 50% seek, 50% next clip
      if (Math.random() < 0.5 && videoRef.current && videoRef.current.duration > 0) {
        videoRef.current.currentTime = Math.random() * videoRef.current.duration
      } else {
        setCurrentIdx(prev => (prev + 1) % clips.length)
      }
    }, 1500)
    return () => clearInterval(id)
  }, [isPlaying, clips.length])

  // FX timer — randomize CSS filter
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      const elapsed = (Date.now() - playStartRef.current) / 1000
      if (elapsed < 10) { setFxStyle({}); return }
      const hue = Math.random() < 0.2 ? Math.floor(Math.random() * 360) : 0
      const sat = Math.random() < 0.15 ? 50 + Math.random() * 300 : 100
      const bright = Math.random() < 0.1 ? 50 + Math.random() * 200 : 100
      const inv = Math.random() < 0.03
      const skew = Math.random() < 0.06 ? (Math.random() - 0.5) * 10 : 0
      const flip = Math.random() < 0.04
      setFxStyle({
        filter: `hue-rotate(${hue}deg) saturate(${sat}%) brightness(${bright}%)${inv ? ' invert(1)' : ''}`,
        transform: `scaleX(${flip ? -1 : 1}) skewX(${skew}deg)`,
      })
    }, 150)
    return () => clearInterval(id)
  }, [isPlaying])

  const handleStart = () => {
    if (isPlaying) return
    playStartRef.current = Date.now()
    setIsPlaying(true)
    audioRef.current?.play().catch(() => {})
    videoRef.current?.play().catch(() => {})
  }

  if (checking) return <div className="fixed inset-0 bg-black" />

  if (!paid) {
    return (
      <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-6">
          <div className="font-[family-name:var(--font-brand)] text-6xl text-red-600 tracking-wider mb-4">XXX FX</div>
          <div className="text-white/30 text-sm mb-8">Chaos mode • Glitch FX • Uncensored</div>
          <div className="border border-red-500/30 bg-red-600/5 p-6 mb-6">
            <button onClick={() => { localStorage.setItem(`npgx-xxx-${trackSlug}`, 'paid'); setPaid(true) }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider">
              Unlock — ${PRICE}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-[200] overflow-hidden" onClick={() => !isPlaying ? handleStart() : undefined}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={isPlaying ? fxStyle : undefined}
        muted playsInline
        src={clips.length > 0 ? clips[currentIdx] : undefined}
        poster={`/og/${trackSlug}.png`}
        onEnded={() => setCurrentIdx(prev => (prev + 1) % (clips.length || 1))}
      />

      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 cursor-pointer">
          <div className="text-center">
            <div className="font-[family-name:var(--font-brand)] text-red-600 text-xs tracking-[0.5em] mb-4">CHAOS MODE</div>
            <svg viewBox="0 0 40 46" className="w-14 h-16 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(220,20,60,0.4)]">
              <polygon points="4,0 40,23 4,46" fill="#dc2626" />
            </svg>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 z-30">
        <div className="font-[family-name:var(--font-brand)] text-red-600 text-xs tracking-[0.3em] opacity-50">XXX FX</div>
      </div>

      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300"
          style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}>
          <div className="bg-gradient-to-t from-black/80 to-transparent pt-16 pb-4 px-4">
            <div className="flex items-center gap-3 justify-center">
              <button onClick={e => { e.stopPropagation(); setVolume(v => v > 0 ? 0 : 1) }} className="text-white/40 hover:text-red-300">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">{volume === 0 ? <path d="M4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/> : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>}</svg>
              </button>
              <input type="range" min={0} max={1} step={0.05} value={volume} onClick={e => e.stopPropagation()} onChange={e => setVolume(Number(e.target.value))} className="w-20 h-1 accent-red-500 opacity-60"/>
              <a href={`/watch/${trackSlug}/xxx`} onClick={e => e.stopPropagation()} className="font-[family-name:var(--font-brand)] text-[10px] text-white/20 hover:text-white/50 uppercase tracking-wider">← Standard</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
