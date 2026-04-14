'use client'

import { cdnUrl } from '@/lib/cdn'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'

export default function VFXPage() {
  const { trackSlug } = useParams<{ trackSlug: string }>()
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
  const [vhsLines, setVhsLines] = useState<Array<{top:number,h:number,shift:number}>>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const bassRef = useRef(0)
  const bassAvgRef = useRef(0)
  const beatRef = useRef(false)

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  useEffect(() => {
    const show = () => { setShowControls(true); if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setShowControls(false), 3000) }
    show(); window.addEventListener('mousemove', show); window.addEventListener('touchstart', show)
    return () => { window.removeEventListener('mousemove', show); window.removeEventListener('touchstart', show) }
  }, [])

  useEffect(() => {
    if (!trackSlug) return
    fetch(`/api/music-video-clips?track=${trackSlug}`)
      .then(r => r.json())
      .then(data => { if (data.clips?.length) setClips(data.clips.filter((c:string) => !c.includes('-titles-')).sort()) })
      .catch(() => {})
  }, [trackSlug])

  useEffect(() => {
    const audio = new Audio()
    audio.loop = true; audio.volume = 1; audio.preload = 'auto'
    if (trackSlug) {
      const map: Record<string,string> = {'razor-kisses':'06','tokyo-gutter-queen':'01','underground-empress':'09','blade-girl':'02','shibuya-mosh-pit':'03','black-rose':'04','kabukicho-wolf':'05','harajuku-chainsaw':'08','tokaido-reload':'11'}
      audio.src = `/music/albums/tokyo-gutter-punk/${map[trackSlug]||'01'}-a.mp3`
      audio.load()
    }
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [trackSlug])

  // Clip switching
  useEffect(() => {
    if (!isPlaying || clips.length === 0) return
    const id = setInterval(() => {
      const elapsed = (Date.now() - playStartRef.current) / 1000
      if (elapsed < 10) return
      if (Math.random() < 0.5 && videoRef.current && videoRef.current.duration > 0) {
        videoRef.current.currentTime = Math.random() * videoRef.current.duration
      } else {
        setCurrentIdx(prev => (prev + 1) % clips.length)
      }
    }, 1500)
    return () => clearInterval(id)
  }, [isPlaying, clips.length])

  // Setup audio analyser
  const setupAnalyser = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return
    try {
      const ctx = new AudioContext()
      const source = ctx.createMediaElementSource(audioRef.current)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.3
      source.connect(analyser)
      analyser.connect(ctx.destination)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
    } catch {}
  }, [])

  // VHS FX — 60fps RAF loop synced to audio
  useEffect(() => {
    if (!isPlaying) return
    const freqData = new Uint8Array(128)
    let rafId = 0
    let lastGlitch = 0

    const tick = () => {
      const elapsed = (Date.now() - playStartRef.current) / 1000
      const now = Date.now()

      // Read bass from analyser
      let bass = 0
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData)
        for (let i = 0; i < 8; i++) bass += freqData[i]
        bass /= 8
      }
      bassAvgRef.current = bassAvgRef.current * 0.9 + bass * 0.1
      const isBeat = bass > bassAvgRef.current * 1.5 && bass > 80
      beatRef.current = isBeat
      bassRef.current = bass

      if (elapsed < 6) {
        setFxStyle({}); setVhsLines([])
        rafId = requestAnimationFrame(tick); return
      }

      // Intensity scales with bass
      const intensity = Math.min(1, bass / 180)

      // VHS tracking — big jolts on beats
      const tracking = isBeat ? (Math.random() - 0.5) * 20 * intensity : (Math.random() - 0.5) * 2
      // Color bleed — stronger on beats
      const bleedX = isBeat ? (Math.random() - 0.5) * 8 : 0
      // Brightness flash on beats
      const brightness = isBeat ? 120 + intensity * 80 : 90 + Math.random() * 20
      const contrast = isBeat ? 130 + intensity * 40 : 100
      const saturation = isBeat ? 60 + Math.random() * 80 : 100
      const hue = isBeat && Math.random() < 0.3 ? Math.floor(Math.random() * 40) - 20 : 0

      setFxStyle({
        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`,
        transform: `translateY(${tracking}px) translateX(${bleedX}px)`,
      })

      // Glitch bars — more frequent and bigger on beats
      if (isBeat || (now - lastGlitch > 100 && Math.random() < 0.15)) {
        lastGlitch = now
        const count = isBeat ? 4 + Math.floor(Math.random() * 8) : 1 + Math.floor(Math.random() * 3)
        setVhsLines(Array.from({length: count}, () => ({
          top: Math.random() * 100,
          h: isBeat ? 2 + Math.random() * 8 : 1 + Math.random() * 3,
          shift: (Math.random() - 0.5) * (isBeat ? 30 : 10),
        })))
      } else if (Math.random() < 0.4) {
        setVhsLines([])
      }

      // Beat-synced clip cut
      if (isBeat && now - lastGlitch > 300 && Math.random() < 0.3) {
        if (videoRef.current && videoRef.current.duration > 0) {
          videoRef.current.currentTime = Math.random() * videoRef.current.duration
        }
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying])

  // Seek on clip change
  useEffect(() => {
    const v = videoRef.current
    if (!v || !isPlaying) return
    const onLoaded = () => { if (v.duration > 0) v.currentTime = Math.random() * v.duration; v.play().catch(() => {}) }
    v.addEventListener('loadedmetadata', onLoaded, { once: true })
    return () => v.removeEventListener('loadedmetadata', onLoaded)
  }, [currentIdx, isPlaying])

  const handleStart = () => {
    if (isPlaying) return
    playStartRef.current = Date.now()
    setIsPlaying(true)
    setupAnalyser()
    audioRef.current?.play().catch(() => {})
    videoRef.current?.play().catch(() => {})
  }

  return (
    <div className="fixed inset-0 bg-black z-[200] overflow-hidden" onClick={() => !isPlaying ? handleStart() : undefined}>
      {/* Video */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={isPlaying ? fxStyle : undefined}
        muted playsInline src={clips[currentIdx] || undefined} poster={`/og/${trackSlug}.png`}
        onEnded={() => setCurrentIdx(prev => (prev + 1) % (clips.length || 1))} />

      {/* VHS scanlines overlay */}
      {isPlaying && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Persistent scanlines — high res */}
          <div className="absolute inset-0" style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.12) 1px, rgba(0,0,0,0.12) 2px)',
            mixBlendMode: 'multiply',
          }} />
          {/* Glitch bars */}
          {vhsLines.map((line, i) => (
            <div key={i} className="absolute w-full" style={{
              top: `${line.top}%`,
              height: `${line.h}px`,
              background: `rgba(255,255,255,${0.1 + Math.random() * 0.2})`,
              transform: `translateX(${line.shift}%)`,
            }} />
          ))}
          {/* VHS color aberration edge */}
          {Math.random() < 0.3 && (
            <div className="absolute inset-0" style={{
              boxShadow: `inset ${2 + Math.random()*3}px 0 ${3+Math.random()*5}px rgba(255,0,0,0.15), inset ${-2-Math.random()*3}px 0 ${3+Math.random()*5}px rgba(0,200,255,0.15)`,
            }} />
          )}
          {/* Bottom VHS timestamp */}
          <div className="absolute bottom-4 right-4 font-mono text-[10px] text-white/20 tracking-wider">
            REC ● {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Play screen */}
      {!isPlaying && clips.length > 0 && (
        <>
          <video className="absolute inset-0 w-full h-full object-cover bg-black z-10"
            autoPlay muted loop playsInline poster={`/og/${trackSlug}.png`} src={cdnUrl(`title-clips/${trackSlug}.mp4`)} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <div className="text-center">
              <div className="font-[family-name:var(--font-brand)] text-red-600 text-xs tracking-[0.5em] mb-4">VHS GLITCH</div>
              <svg viewBox="0 0 40 46" className="w-14 h-16 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(220,20,60,0.4)]">
                <polygon points="4,0 40,23 4,46" fill="#dc2626" />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* Badge */}
      <div className="absolute top-4 left-4 z-30">
        <div className="font-[family-name:var(--font-brand)] text-red-600 text-xs tracking-[0.3em] opacity-50">VFX</div>
      </div>

      {/* Controls */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300"
          style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}>
          <div className="bg-gradient-to-t from-black/80 to-transparent pt-16 pb-4 px-4">
            <div className="flex items-center gap-3 justify-center">
              <button onClick={e => { e.stopPropagation(); setVolume(v => v > 0 ? 0 : 1) }} className="text-white/40 hover:text-red-300">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">{volume === 0 ? <path d="M4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/> : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>}</svg>
              </button>
              <input type="range" min={0} max={1} step={0.05} value={volume} onClick={e => e.stopPropagation()} onChange={e => setVolume(Number(e.target.value))} className="w-20 h-1 accent-red-500 opacity-60"/>
              <a href={`/watch/${trackSlug}`} onClick={e => e.stopPropagation()} className="font-[family-name:var(--font-brand)] text-[10px] text-white/20 hover:text-white/50 uppercase tracking-wider">← Standard</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
