'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { cdnUrl } from '@/lib/cdn'
import Link from 'next/link'
import {
  FaPlay, FaPause, FaFont, FaMusic, FaArrowLeft,
  FaVolumeUp, FaVolumeMute, FaEye, FaEyeSlash
} from 'react-icons/fa'
import { getLyrics, getLyricFrame, type TrackLyrics, type LyricFrame, type LyricCue } from '@/lib/lyrics'

/* ── Constants ──────────────────────────────────────── */

const CDN = 'https://api.b0ase.com/npg-assets/music-videos/tokyo-gutter-queen-1'
const MUSIC_A = cdnUrl('music/albums/tokyo-gutter-punk/01-a.mp3')
const MUSIC_B = cdnUrl('music/albums/tokyo-gutter-punk/01-b.mp3')

const FONTS = [
  { id: 'punk', name: 'Punk', family: '"Impact", "Arial Black", sans-serif', weight: 900 },
  { id: 'neon', name: 'Neon', family: '"Orbitron", "Arial", sans-serif', weight: 700 },
  { id: 'elegant', name: 'Elegant', family: '"Playfair Display", "Georgia", serif', weight: 400 },
  { id: 'graffiti', name: 'Graffiti', family: '"Permanent Marker", "Comic Sans MS", cursive', weight: 400 },
  { id: 'cyber', name: 'Cyber', family: '"Share Tech Mono", "Courier New", monospace', weight: 400 },
  { id: 'manga', name: 'Manga', family: '"Bangers", "Impact", sans-serif', weight: 400 },
  { id: 'gothic', name: 'Gothic', family: '"UnifrakturMaguntia", "Times New Roman", serif', weight: 400 },
  { id: 'condensed', name: 'Condensed', family: '"Bebas Neue", "Arial Narrow", sans-serif', weight: 400 },
]

const GLOW_PRESETS = [
  { id: 'none', name: 'None', color: '', blur: 0 },
  { id: 'neon-pink', name: 'Neon Pink', color: '#ec4899', blur: 20 },
  { id: 'neon-cyan', name: 'Neon Cyan', color: '#06b6d4', blur: 20 },
  { id: 'fire', name: 'Fire', color: '#f97316', blur: 15 },
  { id: 'ice', name: 'Ice', color: '#7dd3fc', blur: 25 },
  { id: 'blood', name: 'Blood', color: '#dc2626', blur: 12 },
]

const POSITIONS = [
  { id: 'bottom', name: 'Bottom', y: 0.85 },
  { id: 'center', name: 'Center', y: 0.5 },
  { id: 'top', name: 'Top', y: 0.15 },
  { id: 'lower-third', name: 'Lower Third', y: 0.78 },
]

interface LyricStyle {
  font: typeof FONTS[0]
  fontSize: number
  color: string
  strokeColor: string
  strokeWidth: number
  glow: typeof GLOW_PRESETS[0]
  position: typeof POSITIONS[0]
  uppercase: boolean
  japaneseVisible: boolean
  flashVisible: boolean
  echoVisible: boolean
}

/* ── Page ────────────────────────────────────────────── */

export default function TGQTitleDesigner() {
  const [tab, setTab] = useState<'lyrics' | 'titles'>('lyrics')

  // Music / playback
  const [isPlaying, setIsPlaying] = useState(false)
  const [bSide, setBSide] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Lyrics
  const [lyrics, setLyrics] = useState<TrackLyrics | null>(null)
  const [style, setStyle] = useState<LyricStyle>({
    font: FONTS[0],
    fontSize: 48,
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    glow: GLOW_PRESETS[1],
    position: POSITIONS[0],
    uppercase: true,
    japaneseVisible: true,
    flashVisible: true,
    echoVisible: true,
  })

  // Video background
  const [bgVideoUrl, setBgVideoUrl] = useState<string | null>(null)

  // Load lyrics
  useEffect(() => {
    const l = getLyrics('路地裏の叫び')
    setLyrics(l)
  }, [])

  // Load a random background video
  useEffect(() => {
    fetch(`${CDN}/manifest.json`)
      .then(r => r.json())
      .then(manifest => {
        const items = manifest.collections?.['tokyo-gutter-queen']?.items || []
        if (items.length > 0) {
          const item = items[Math.floor(Math.random() * items.length)]
          setBgVideoUrl(`${CDN}/${encodeURIComponent(item.video)}`)
        }
      })
      .catch(() => {})
  }, [])

  // Init audio
  useEffect(() => {
    const audio = new Audio(bSide ? MUSIC_B : MUSIC_A)
    audio.volume = volume
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
    })
    audio.addEventListener('ended', () => setIsPlaying(false))
    if (audioRef.current) {
      const wasPlaying = !audioRef.current.paused
      audioRef.current.pause()
      if (wasPlaying) { audio.play().catch(() => {}); setIsPlaying(true) }
    }
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [bSide]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play().catch(() => {}) }
    setIsPlaying(!isPlaying)
  }

  // Load background video
  useEffect(() => {
    if (videoRef.current && bgVideoUrl) {
      videoRef.current.src = bgVideoUrl
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [bgVideoUrl])

  // Canvas render loop — video bg + lyrics overlay
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    const w = canvas.width
    const h = canvas.height

    // Draw video background
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    if (video && video.readyState >= 2) {
      const vw = video.videoWidth, vh = video.videoHeight
      const scale = Math.max(w / vw, h / vh)
      const dw = vw * scale, dh = vh * scale
      ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh)
      // Darken for text readability
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(0, 0, w, h)
    }

    // Draw lyrics
    if (lyrics && duration > 0) {
      // Simple beat pulse (no analyser — just BPM-based)
      const bpm = 180
      const beatPhase = (currentTime * bpm / 60) % 1
      const beatPulse = beatPhase < 0.1 ? 1 - beatPhase / 0.1 : 0

      const frame = getLyricFrame(lyrics, currentTime, duration, beatPulse)
      drawLyricFrame(ctx, frame, w, h, style, beatPulse)
    }

    rafRef.current = requestAnimationFrame(renderFrame)
  }, [lyrics, currentTime, duration, style])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [renderFrame])

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (audioRef.current) audioRef.current.pause()
    }
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-black text-white">
      <video ref={videoRef} className="hidden" muted loop playsInline crossOrigin="anonymous" />

      <div className="max-w-[1920px] mx-auto px-3 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/movie-editor/tokyo-gutter-queen" className="p-2 text-gray-500 hover:text-white transition-colors">
              <FaArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black font-[family-name:var(--font-brand)] uppercase tracking-wide bg-gradient-to-r from-pink-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                Title Designer — Tokyo Gutter Queen
              </h1>
              <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">Lyrics & Motion Graphics</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setTab('lyrics')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-l-lg border transition-all ${tab === 'lyrics' ? 'bg-pink-600/20 text-pink-400 border-pink-500' : 'bg-white/5 text-gray-500 border-white/10'}`}>
              <FaFont className="w-3 h-3 inline mr-1.5" />Lyrics
            </button>
            <button onClick={() => setTab('titles')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-r-lg border transition-all ${tab === 'titles' ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500' : 'bg-white/5 text-gray-500 border-white/10'}`}>
              <FaMusic className="w-3 h-3 inline mr-1.5" />Titles
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">

          {/* ═══ MAIN: Preview ═══ */}
          <div className="space-y-3">
            {/* Canvas preview */}
            <div className="relative bg-black rounded-xl overflow-hidden border border-white/10">
              <canvas ref={canvasRef} className="w-full bg-black" style={{ aspectRatio: '16/9' }} />
            </div>

            {/* Transport */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5 border border-white/10">
              <button onClick={togglePlay} className={`p-2 rounded-full ${isPlaying ? 'bg-pink-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                {isPlaying ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4 ml-0.5" />}
              </button>
              <span className="text-[10px] font-mono text-gray-500 w-16">{formatTime(currentTime)}</span>
              <input
                type="range" min="0" max={duration || 1} step="0.1" value={currentTime}
                onChange={e => { if (audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value) }}
                className="flex-1 h-1 accent-pink-500"
              />
              <span className="text-[10px] font-mono text-gray-500 w-16 text-right">{formatTime(duration)}</span>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={() => setVolume(v => v > 0 ? 0 : 0.7)} className="text-gray-500 hover:text-pink-400">
                {volume > 0 ? <FaVolumeUp className="w-3 h-3" /> : <FaVolumeMute className="w-3 h-3" />}
              </button>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex rounded overflow-hidden border border-white/10">
                <button onClick={() => setBSide(false)} className={`px-3 py-1 text-[9px] font-bold ${!bSide ? 'bg-pink-600 text-white' : 'bg-white/5 text-gray-500'}`}>A</button>
                <button onClick={() => setBSide(true)} className={`px-3 py-1 text-[9px] font-bold ${bSide ? 'bg-cyan-600 text-white' : 'bg-white/5 text-gray-500'}`}>B</button>
              </div>
            </div>

            {/* Lyrics scroll — shows all lyrics with current line highlighted */}
            {tab === 'lyrics' && lyrics && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 max-h-[30vh] overflow-y-auto">
                <div className="space-y-1">
                  {lyrics.cues.map((cue, i) => {
                    const cueTime = duration / lyrics.cues.length
                    const cueIdx = Math.floor(currentTime / cueTime)
                    const isCurrent = i === cueIdx
                    const isPast = i < cueIdx
                    return (
                      <div
                        key={i}
                        onClick={() => { if (audioRef.current && duration > 0) audioRef.current.currentTime = i * cueTime }}
                        className={`px-3 py-1.5 rounded cursor-pointer transition-all ${
                          isCurrent ? 'bg-pink-600/20 border border-pink-500/30 scale-105' :
                          isPast ? 'opacity-40' : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                        }`}
                      >
                        <span className={`text-sm ${
                          cue.style === 'japanese' ? 'text-cyan-400 font-bold' :
                          cue.style === 'shout' || cue.style === 'gang' ? 'text-red-400 font-black uppercase' :
                          cue.style === 'flash' ? 'text-yellow-400 font-bold italic' :
                          cue.style === 'whisper' ? 'text-gray-400 italic' :
                          'text-white'
                        }`}>
                          {cue.text}
                        </span>
                        <span className="text-[8px] font-mono text-gray-600 ml-2">{cue.section}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Titles tab placeholder */}
            {tab === 'titles' && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <p className="text-gray-500 text-sm mb-3">Full 3D title designer</p>
                <Link href="/title-designer" className="px-4 py-2 bg-cyan-600/20 text-cyan-400 text-xs font-bold rounded-lg border border-cyan-500/20 hover:bg-cyan-600/40 transition-colors">
                  Open Title Designer
                </Link>
              </div>
            )}
          </div>

          {/* ═══ RIGHT: Style Controls ═══ */}
          <div className="space-y-3 max-h-[85vh] overflow-y-auto">

            {/* Font */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Font</span>
              <div className="grid grid-cols-2 gap-1">
                {FONTS.map(f => (
                  <button key={f.id} onClick={() => setStyle(s => ({ ...s, font: f }))}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded transition-colors ${style.font.id === f.id ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-black/30 text-gray-500 border border-white/5 hover:border-white/20'}`}
                    style={{ fontFamily: f.family }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[9px] text-gray-600">Size</span>
                <input type="range" min="24" max="96" value={style.fontSize} onChange={e => setStyle(s => ({ ...s, fontSize: Number(e.target.value) }))} className="flex-1 h-1 accent-pink-500" />
                <span className="text-[9px] font-mono text-gray-500 w-6">{style.fontSize}</span>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={style.uppercase} onChange={e => setStyle(s => ({ ...s, uppercase: e.target.checked }))} className="accent-pink-500" />
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">Uppercase</span>
              </label>
            </div>

            {/* Colors */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Colors</span>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-600 w-12">Fill</span>
                  <input type="color" value={style.color} onChange={e => setStyle(s => ({ ...s, color: e.target.value }))} className="w-8 h-6 rounded border border-white/10 bg-transparent cursor-pointer" />
                  <span className="text-[9px] font-mono text-gray-500">{style.color}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-600 w-12">Stroke</span>
                  <input type="color" value={style.strokeColor} onChange={e => setStyle(s => ({ ...s, strokeColor: e.target.value }))} className="w-8 h-6 rounded border border-white/10 bg-transparent cursor-pointer" />
                  <input type="range" min="0" max="8" value={style.strokeWidth} onChange={e => setStyle(s => ({ ...s, strokeWidth: Number(e.target.value) }))} className="flex-1 h-1 accent-pink-500" />
                  <span className="text-[9px] font-mono text-gray-500 w-4">{style.strokeWidth}</span>
                </div>
              </div>
            </div>

            {/* Glow */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Glow</span>
              <div className="grid grid-cols-3 gap-1">
                {GLOW_PRESETS.map(g => (
                  <button key={g.id} onClick={() => setStyle(s => ({ ...s, glow: g }))}
                    className={`px-2 py-1.5 text-[9px] font-bold rounded transition-colors ${style.glow.id === g.id ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-black/30 text-gray-500 border border-white/5 hover:border-white/20'}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Position</span>
              <div className="grid grid-cols-2 gap-1">
                {POSITIONS.map(p => (
                  <button key={p.id} onClick={() => setStyle(s => ({ ...s, position: p }))}
                    className={`px-2 py-1.5 text-[9px] font-bold rounded transition-colors ${style.position.id === p.id ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-black/30 text-gray-500 border border-white/5 hover:border-white/20'}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Layer visibility */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Layers</span>
              <div className="space-y-1.5">
                {([
                  { key: 'japaneseVisible' as const, label: 'Japanese overlay' },
                  { key: 'flashVisible' as const, label: 'Flash words' },
                  { key: 'echoVisible' as const, label: 'Echo (prev line)' },
                ]).map(layer => (
                  <label key={layer.key} className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-white/5">
                    <span className="text-[10px] text-gray-400">{layer.label}</span>
                    <button onClick={() => setStyle(s => ({ ...s, [layer.key]: !s[layer.key] }))}
                      className={`p-1 rounded ${style[layer.key] ? 'text-pink-400' : 'text-gray-600'}`}>
                      {style[layer.key] ? <FaEye className="w-3 h-3" /> : <FaEyeSlash className="w-3 h-3" />}
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick presets */}
            <div className="bg-gradient-to-br from-pink-950/30 to-black rounded-xl p-3 border border-pink-500/10">
              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest block mb-2">Quick Presets</span>
              <div className="grid grid-cols-2 gap-1">
                {([
                  { name: 'Punk Neon', font: FONTS[0], glow: GLOW_PRESETS[1], color: '#ffffff', stroke: '#000000' },
                  { name: 'Cyber Cold', font: FONTS[4], glow: GLOW_PRESETS[4], color: '#7dd3fc', stroke: '#000000' },
                  { name: 'Blood Gothic', font: FONTS[6], glow: GLOW_PRESETS[5], color: '#dc2626', stroke: '#000000' },
                  { name: 'Graffiti Fire', font: FONTS[3], glow: GLOW_PRESETS[3], color: '#f97316', stroke: '#1a1a1a' },
                  { name: 'Clean White', font: FONTS[7], glow: GLOW_PRESETS[0], color: '#ffffff', stroke: '#000000' },
                  { name: 'Manga Pop', font: FONTS[5], glow: GLOW_PRESETS[2], color: '#06b6d4', stroke: '#ffffff' },
                ]).map(preset => (
                  <button key={preset.name}
                    onClick={() => setStyle(s => ({ ...s, font: preset.font, glow: preset.glow, color: preset.color, strokeColor: preset.stroke }))}
                    className="px-2 py-2 text-[9px] font-bold rounded bg-black/30 text-gray-400 border border-white/5 hover:border-pink-500/30 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Canvas Lyric Renderer ──────────────────────────── */

function drawLyricFrame(
  ctx: CanvasRenderingContext2D,
  frame: LyricFrame,
  w: number, h: number,
  style: LyricStyle,
  beatPulse: number,
) {
  // Echo (previous line fading out)
  if (style.echoVisible && frame.echo) {
    const y = h * (style.position.y + frame.echo.offsetY)
    ctx.save()
    ctx.globalAlpha = frame.echo.opacity
    ctx.font = `${style.font.weight} ${style.fontSize * 0.7}px ${style.font.family}`
    ctx.fillStyle = style.color
    ctx.textAlign = 'center'
    ctx.fillText(frame.echo.text, w / 2, y)
    ctx.restore()
  }

  // Japanese overlay
  if (style.japaneseVisible && frame.japanese) {
    const x = w * (0.5 + frame.japanese.offsetX)
    const y = h * (style.position.y + frame.japanese.offsetY)
    ctx.save()
    ctx.globalAlpha = frame.japanese.opacity
    ctx.font = `700 ${style.fontSize * 0.6}px "Noto Sans JP", "Hiragino Sans", sans-serif`
    ctx.fillStyle = '#06b6d4'
    ctx.textAlign = 'center'
    ctx.fillText(frame.japanese.text, x, y)
    ctx.restore()
  }

  // Flash word
  if (style.flashVisible && frame.flash) {
    ctx.save()
    ctx.globalAlpha = frame.flash.opacity
    ctx.font = `900 ${style.fontSize * frame.flash.scale}px ${style.font.family}`
    ctx.fillStyle = style.color
    ctx.textAlign = 'center'
    if (style.glow.blur > 0) {
      ctx.shadowColor = style.glow.color
      ctx.shadowBlur = style.glow.blur * 2
    }
    ctx.fillText(frame.flash.text, w * frame.flash.x, h * frame.flash.y)
    ctx.restore()
  }

  // Main text
  if (frame.main) {
    const text = style.uppercase ? frame.main.text.toUpperCase() : frame.main.text
    const x = w / 2 + frame.main.offsetX
    const y = h * style.position.y + frame.main.offsetY
    const size = style.fontSize * frame.main.scale

    ctx.save()
    ctx.globalAlpha = frame.main.opacity
    ctx.translate(x, y)
    ctx.rotate(frame.main.rotation)

    ctx.font = `${style.font.weight} ${size}px ${style.font.family}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Glow
    if (style.glow.blur > 0) {
      ctx.shadowColor = style.glow.color
      ctx.shadowBlur = style.glow.blur + beatPulse * 10
    }

    // Stroke
    if (style.strokeWidth > 0) {
      ctx.strokeStyle = style.strokeColor
      ctx.lineWidth = style.strokeWidth * 2
      ctx.lineJoin = 'round'
      ctx.strokeText(text, 0, 0)
    }

    // Fill
    ctx.fillStyle = style.color
    ctx.fillText(text, 0, 0)

    ctx.restore()
  }
}
