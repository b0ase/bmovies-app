'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ALBUMS } from '@/lib/albums'
import { MUSIC_VIDEO_TRACKS } from '@/lib/music-video-manifest'

const ALL_RECORDED = ALBUMS.flatMap(a =>
  a.tracks.filter(t => t.status === 'recorded').map(t => ({
    slug: t.slug, title: t.title, japanese: t.japanese,
    clipCount: MUSIC_VIDEO_TRACKS[t.slug]?.clipCount || 0,
    hasVideo: !!(MUSIC_VIDEO_TRACKS[t.slug] && MUSIC_VIDEO_TRACKS[t.slug].clipCount > 5),
  }))
)

function AllTracksGrid() {
  return (
    <div className="grid grid-cols-5 gap-2 w-full p-2">
      {ALL_RECORDED.map(t => (
        <a key={t.slug} href={`/movie-editor/${t.slug}`}
          className="group relative aspect-video rounded-lg overflow-hidden border border-white/10 hover:border-red-500/50 transition-all">
          <video src={cdnUrl(`title-clips/${t.slug}.mp4`)} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute top-1.5 right-1.5">
            <span className="bg-green-600/90 text-white text-[7px] font-[family-name:var(--font-brand)] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-lg">Earn $10</span>
          </div>
          <div className="absolute bottom-1.5 left-1.5 right-1.5">
            <div className="font-[family-name:var(--font-brand)] text-white text-[9px] uppercase tracking-wider leading-tight">{t.title}</div>
            {t.hasVideo
              ? <span className="text-[7px] text-red-400 font-mono">{t.clipCount} clips</span>
              : <span className="text-[7px] text-green-400 font-mono">Needs editing</span>
            }
          </div>
        </a>
      ))}
    </div>
  )
}
import { cdnUrl } from '@/lib/cdn'
import {
  FaPlay, FaPause, FaStepForward, FaStepBackward,
  FaVolumeUp, FaVolumeMute, FaMusic, FaFilm,
  FaDownload, FaTrash, FaExpand, FaTimes,
  FaCompactDisc, FaFilter
} from 'react-icons/fa'

/* ── Types ───────────────────────────────────────────── */

interface Clip {
  id: string
  url: string
  character: string
  slug: string
  orientation: 'portrait' | 'landscape'
  source: 'content' | 'npg-x-10'
  filename: string
}

interface AlbumTrack {
  num: number
  title: string
  japanese?: string
  genre: string
  aSide?: string
  bSide?: string
}

interface Album {
  slug: string
  title: string
  tracks: AlbumTrack[]
}

interface TimelineEntry {
  clip: Clip
  uid: string // unique per instance (same clip can appear multiple times)
}

/* ── Effects ─────────────────────────────────────────── */

function applyCrimsonFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const d = ctx.getImageData(0, 0, w, h)
  const px = d.data
  for (let i = 0; i < px.length; i += 4) {
    px[i] = Math.min(255, px[i] * 1.4)
    px[i + 1] = Math.floor(px[i + 1] * 0.65)
    px[i + 2] = Math.floor(px[i + 2] * 0.45)
  }
  ctx.putImageData(d, 0, 0)
}

function applyGlitch(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const n = 3 + Math.floor(Math.random() * 5)
  for (let i = 0; i < n; i++) {
    const y = Math.floor(Math.random() * h)
    const sh = 5 + Math.floor(Math.random() * 30)
    const off = -30 + Math.floor(Math.random() * 60)
    const s = ctx.getImageData(0, y, w, sh)
    ctx.putImageData(s, off, y)
  }
}

let uid = 0
const nextUid = () => `te-${++uid}-${Date.now()}`

/* ── Page ────────────────────────────────────────────── */

export default function MovieEditor() {
  // Library
  const [clips, setClips] = useState<Clip[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [charFilter, setCharFilter] = useState<string>('all')
  const [characters, setCharacters] = useState<{ slug: string; name: string; letter: string }[]>([])
  const [libraryLoading, setLibraryLoading] = useState(true)

  // Timeline
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [activeIdx, setActiveIdx] = useState(0)

  // Playback
  const [isPlaying, setIsPlaying] = useState(false)
  const [showFx, setShowFx] = useState(false)
  const [autoJump, setAutoJump] = useState(true)
  const [jumpInterval, setJumpInterval] = useState(3)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  // Music
  const [musicTrack, setMusicTrack] = useState<{ title: string; url: string } | null>(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicVolume, setMusicVolume] = useState(0.5)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const [showBSide, setShowBSide] = useState(false)

  // Mode — portrait or landscape drives canvas, filtering, and export
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  // Export
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  const [projectTitle, setProjectTitle] = useState('Untitled Edit')

  // Fullscreen
  const [fullscreen, setFullscreen] = useState(false)

  /* ── Load Library ── */
  useEffect(() => {
    setLibraryLoading(true)
    fetch('/api/movie-editor/library')
      .then(r => r.json())
      .then(data => {
        setClips(data.clips || [])
        setAlbums(data.albums || [])
        setCharacters(data.characters || [])
        setLibraryLoading(false)
      })
      .catch(() => setLibraryLoading(false))
  }, [])

  /* ── Filtered clips — match the selected mode ── */
  const filteredClips = clips.filter(c => {
    if (charFilter !== 'all' && c.slug !== charFilter) return false
    // Only show clips matching the current orientation mode
    if (c.orientation !== orientation) return false
    return true
  })
  const isLandscape = orientation === 'landscape'

  /* ── Canvas render loop ── */
  const renderFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.paused || video.ended) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr

    const vw = video.videoWidth || canvas.width
    const vh = video.videoHeight || canvas.height
    // Cover-fit: fill the canvas entirely (may crop video edges)
    const scale = Math.max(canvas.width / vw, canvas.height / vh)
    const dw = vw * scale, dh = vh * scale
    const dx = (canvas.width - dw) / 2, dy = (canvas.height - dh) / 2

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(video, dx, dy, dw, dh)

    if (showFx) {
      applyCrimsonFilter(ctx, canvas.width, canvas.height)
      if (Math.random() > 0.85) applyGlitch(ctx, canvas.width, canvas.height)
    }
    rafRef.current = requestAnimationFrame(renderFrame)
  }, [showFx])

  /* ── Playback ── */
  const togglePlay = () => {
    const video = videoRef.current
    if (!video || timeline.length === 0) return
    if (isPlaying) {
      video.pause()
      cancelAnimationFrame(rafRef.current)
    } else {
      video.play().catch(() => {})
      rafRef.current = requestAnimationFrame(renderFrame)
    }
    setIsPlaying(!isPlaying)
  }

  const jumpTo = (idx: number) => {
    setActiveIdx(idx)
  }

  // Auto-jump
  useEffect(() => {
    if (!autoJump || !isPlaying || timeline.length < 2) return
    const iv = setInterval(() => setActiveIdx(p => (p + 1) % timeline.length), jumpInterval * 1000)
    return () => clearInterval(iv)
  }, [autoJump, isPlaying, timeline.length, jumpInterval])

  // Load clip on active change
  useEffect(() => {
    const video = videoRef.current
    if (!video || timeline.length === 0) return
    const entry = timeline[activeIdx]
    if (!entry) return
    video.src = entry.clip.url
    video.load()
    if (isPlaying) {
      video.play().catch(() => {})
      rafRef.current = requestAnimationFrame(renderFrame)
    }
  }, [activeIdx, timeline.length])

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoRef.current) videoRef.current.pause()
      cancelAnimationFrame(rafRef.current)
      if (musicRef.current) musicRef.current.pause()
    }
  }, [])

  /* ── Music ── */
  const selectMusic = (title: string, url: string) => {
    if (musicRef.current) musicRef.current.pause()
    const audio = new Audio(url)
    audio.volume = musicVolume
    audio.loop = true
    musicRef.current = audio
    setMusicTrack({ title, url })
    setMusicPlaying(false)
  }

  const toggleMusic = () => {
    if (!musicRef.current) return
    if (musicPlaying) {
      musicRef.current.pause()
    } else {
      musicRef.current.play().catch(() => {})
    }
    setMusicPlaying(!musicPlaying)
  }

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicVolume
  }, [musicVolume])

  /* ── Timeline Ops ── */
  const addClip = (clip: Clip) => {
    setTimeline(prev => [...prev, { clip, uid: nextUid() }])
  }

  const removeClip = (idx: number) => {
    setTimeline(prev => prev.filter((_, i) => i !== idx))
    if (activeIdx >= timeline.length - 1) setActiveIdx(Math.max(0, timeline.length - 2))
  }

  const clearTimeline = () => { setTimeline([]); setActiveIdx(0) }

  /* ── Export ── */
  const exportVideo = async () => {
    if (timeline.length === 0) return
    setExporting(true)
    setExportProgress('Assembling video via FFmpeg...')
    try {
      const res = await fetch('/api/movie-editor/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: timeline.map(e => ({ url: e.clip.url })),
          music: musicTrack ? { url: musicTrack.url, volume: musicVolume } : undefined,
          transition: 'fade',
          transitionDuration: 0.5,
          resolution,
          orientation,
          watermark: `NPGX — ${projectTitle}`,
          title: projectTitle,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Export failed')
      }

      setExportProgress('Downloading...')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || `npgx-edit-${Date.now()}.mp4`
      a.click()
      URL.revokeObjectURL(url)
      setExportProgress('Done!')
      setTimeout(() => setExportProgress(''), 3000)
    } catch (err: any) {
      setExportProgress(`Error: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const activeEntry = timeline[activeIdx]

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-black text-white">
      <video ref={videoRef} className="hidden" muted loop playsInline crossOrigin="anonymous" />

      <div className="max-w-[1920px] mx-auto px-3 py-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent">
              NPGX MOVIE EDITOR
            </h1>
            <input
              value={projectTitle}
              onChange={e => setProjectTitle(e.target.value)}
              className="bg-transparent border-b border-white/10 focus:border-red-500/50 text-sm text-gray-400 px-1 py-0.5 outline-none w-40 font-mono"
              placeholder="Project title..."
            />
            {/* Mode toggle — primary control */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => setOrientation('portrait')}
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  !isLandscape ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                <span>&#9646;</span> Portrait
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  isLandscape ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                <span>&#9644;</span> Landscape
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
            <span>{timeline.length} clips</span>
            <span className="text-gray-700">|</span>
            <span>{filteredClips.length} in library</span>
            {musicTrack && (
              <>
                <span className="text-gray-700">|</span>
                <span className="text-red-400">{musicTrack.title}</span>
              </>
            )}
            <Link href="/mixer" className="ml-2 px-3 py-1.5 bg-red-600/20 text-red-400 text-xs font-bold rounded border border-red-500/20 hover:bg-red-600/40 transition-colors uppercase tracking-wider">
              Mixer
            </Link>
            <Link href="/album/tokyo-gutter-punk" className="px-3 py-1.5 bg-white/5 text-gray-400 text-xs font-bold rounded border border-white/10 hover:bg-white/10 transition-colors uppercase tracking-wider">
              Album
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-3">

          {/* ═══ LEFT: Clip Library + Music ═══ */}
          <div className="space-y-3 max-h-[85vh] overflow-y-auto">

            {/* Character filter */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <FaFilter className="w-2.5 h-2.5 text-gray-600" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filter</span>
              </div>
              <select
                value={charFilter}
                onChange={e => setCharFilter(e.target.value)}
                className="w-full bg-black border border-white/10 text-gray-300 text-xs rounded px-2 py-1.5 mb-2"
              >
                <option value="all">All Characters</option>
                {characters.map(c => (
                  <option key={c.slug} value={c.slug}>{c.letter}. {c.name}</option>
                ))}
              </select>
              <p className="text-[9px] text-gray-600 mt-1">Showing {isLandscape ? 'landscape' : 'portrait'} clips</p>
            </div>

            {/* Clips grid */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Clips</span>
                <span className="text-[9px] font-mono text-gray-600">{filteredClips.length}</span>
              </div>
              {libraryLoading ? (
                <p className="text-xs text-gray-600 text-center py-8">Loading library...</p>
              ) : filteredClips.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">No clips found</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 max-h-[40vh] overflow-y-auto">
                  {filteredClips.map(clip => (
                    <div
                      key={clip.id}
                      onClick={() => addClip(clip)}
                      className={`relative bg-black rounded overflow-hidden cursor-pointer border border-white/10 hover:border-red-500/50 transition-all group ${
                        isLandscape ? 'aspect-video' : 'aspect-[9/16]'
                      }`}
                    >
                      <video
                        src={clip.url}
                        muted playsInline preload="metadata"
                        className="w-full h-full object-cover"
                        onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0 }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[9px] text-white font-bold bg-red-600 px-1.5 py-0.5 rounded">+ ADD</span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                        <span className="text-[7px] text-gray-300 truncate block">{clip.character.split(' ')[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Music selector */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaMusic className="w-2.5 h-2.5 text-red-500/60" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Music</span>
                </div>
                {musicTrack && (
                  <button onClick={toggleMusic} className={`p-1 rounded ${musicPlaying ? 'text-red-400' : 'text-gray-600'}`}>
                    {musicPlaying ? <FaPause className="w-2.5 h-2.5" /> : <FaPlay className="w-2.5 h-2.5" />}
                  </button>
                )}
              </div>

              {musicTrack && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                  <FaCompactDisc className={`w-3 h-3 text-red-400 ${musicPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                  <span className="text-[10px] text-red-300 font-mono truncate flex-1">{musicTrack.title}</span>
                  <button onClick={() => { if (musicRef.current) musicRef.current.pause(); setMusicTrack(null); setMusicPlaying(false) }} className="text-gray-600 hover:text-red-400">
                    <FaTimes className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}

              {musicTrack && (
                <div className="flex items-center gap-2 mb-2">
                  <FaVolumeUp className="w-2.5 h-2.5 text-gray-600" />
                  <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={e => setMusicVolume(parseFloat(e.target.value))} className="flex-1 h-1 accent-red-500" />
                  <span className="text-[9px] font-mono text-gray-600 w-6">{Math.round(musicVolume * 100)}%</span>
                </div>
              )}

              {/* Album tracks */}
              {albums.map(album => (
                <div key={album.slug} className="mb-2">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">{album.title}</p>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {album.tracks.map(t => {
                      const url = showBSide ? t.bSide : t.aSide
                      if (!url) return null
                      const isActive = musicTrack?.url === url
                      return (
                        <div
                          key={`${t.num}-${showBSide}`}
                          onClick={() => selectMusic(t.japanese ? `${t.japanese} — ${t.title}` : t.title, url)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            isActive ? 'bg-red-500/10 border border-red-500/20' : 'hover:bg-white/5'
                          }`}
                        >
                          <span className="text-[9px] font-mono text-gray-600 w-4">{String(t.num).padStart(2, '0')}</span>
                          <span className={`text-[10px] truncate flex-1 ${isActive ? 'text-red-400' : 'text-gray-400'}`}>
                            {t.japanese ? `${t.japanese}` : t.title}
                          </span>
                          <span className="text-[8px] font-mono text-gray-700">{t.genre}</span>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setShowBSide(!showBSide)}
                    className={`mt-1 w-full text-[9px] font-mono py-1 rounded transition-colors ${
                      showBSide ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' : 'bg-white/5 text-gray-600 border border-white/5'
                    }`}
                  >
                    {showBSide ? 'B-Sides' : 'A-Sides'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ CENTER: Preview + Timeline ═══ */}
          <div className="space-y-3">

            {/* Preview — or project browser when empty */}
            {timeline.length === 0 ? (
              <div className="bg-black rounded-xl border border-white/10 p-6">
                <p className="text-gray-500 text-xs font-[family-name:var(--font-brand)] uppercase tracking-[0.3em] mb-5 text-center">Select a music video to edit</p>
                <AllTracksGrid />
                <div className="text-center mt-5">
                  <a href="/movie-editor/new" className="inline-flex items-center gap-1.5 text-red-500/60 hover:text-red-400 text-[10px] font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">
                    + Create New Project
                  </a>
                </div>
              </div>
            ) : (
              <div className="relative bg-black rounded-xl overflow-hidden border border-white/10">
                <canvas
                  ref={canvasRef}
                  className={`bg-black ${
                    isLandscape ? 'w-full aspect-video' : 'aspect-[9/16] max-h-[55vh] mx-auto'
                  }`}
                />
                {activeEntry && (
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="bg-black/70 px-2 py-1 rounded text-[10px] text-white font-bold">{activeEntry.clip.character}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      isLandscape ? 'bg-blue-600/50 text-blue-200' : 'bg-pink-600/50 text-pink-200'
                    }`}>
                      {isLandscape ? '▬ 16:9' : '▮ 9:16'}
                    </span>
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className="bg-black/70 px-2 py-1 rounded text-[10px] text-gray-500 font-mono">{activeIdx + 1}/{timeline.length}</span>
                  <button onClick={() => setFullscreen(true)} className="bg-black/70 p-1.5 rounded text-gray-400 hover:text-white transition-colors">
                    <FaExpand className="w-3 h-3" />
                  </button>
                </div>
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30" onClick={togglePlay}>
                    <div className="w-16 h-16 rounded-full bg-red-600/80 flex items-center justify-center hover:bg-red-600 transition-colors">
                      <FaPlay className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transport */}
            <div className="flex items-center justify-center gap-3 bg-white/5 rounded-xl p-2.5 border border-white/10">
              <button onClick={() => setActiveIdx(p => Math.max(0, p - 1))} className="p-1.5 text-gray-400 hover:text-white">
                <FaStepBackward className="w-4 h-4" />
              </button>
              <button onClick={togglePlay} className={`p-2.5 rounded-full ${isPlaying ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={() => setActiveIdx(p => (p + 1) % Math.max(1, timeline.length))} className="p-1.5 text-gray-400 hover:text-white">
                <FaStepForward className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button onClick={() => setShowFx(!showFx)} className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded ${showFx ? 'bg-red-600/30 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                FX
              </button>
              <button onClick={() => setAutoJump(!autoJump)} className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded ${autoJump ? 'bg-pink-600/30 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                Auto
              </button>
              {autoJump && (
                <select value={jumpInterval} onChange={e => setJumpInterval(Number(e.target.value))} className="bg-black border border-white/10 text-gray-400 text-[10px] rounded px-1.5 py-1">
                  <option value={1}>1s</option>
                  <option value={2}>2s</option>
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                </select>
              )}
              {musicTrack && (
                <>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <button onClick={toggleMusic} className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded flex items-center gap-1 ${musicPlaying ? 'bg-red-600/30 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                    <FaMusic className="w-2 h-2" /> {musicPlaying ? 'ON' : 'OFF'}
                  </button>
                </>
              )}
            </div>

            {/* Timeline strip */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Timeline</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-gray-600">{timeline.length} clips</span>
                  {timeline.length > 0 && (
                    <button onClick={clearTimeline} className="text-gray-600 hover:text-red-400 transition-colors">
                      <FaTrash className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-2 min-h-[60px]">
                {timeline.map((entry, idx) => (
                  <div
                    key={entry.uid}
                    onClick={() => jumpTo(idx)}
                    className={`relative flex-shrink-0 rounded overflow-hidden cursor-pointer border-2 transition-all ${
                      isLandscape ? 'w-20 h-12' : 'w-9 h-14'
                    } ${
                      idx === activeIdx
                        ? 'border-red-500 shadow-lg shadow-red-500/30'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <video src={entry.clip.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end">
                      <span className="text-[6px] text-white px-0.5 pb-0.5 truncate w-full font-mono">{entry.clip.character.split(' ')[0]}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeClip(idx) }}
                      className="absolute top-0 right-0 w-3.5 h-3.5 bg-black/70 rounded-bl text-gray-400 hover:text-red-400 text-[8px] flex items-center justify-center"
                    >
                      ×
                    </button>
                    {idx === activeIdx && (
                      <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </div>
                ))}
                {timeline.length === 0 && (
                  <p className="text-gray-600 text-[10px] py-4 w-full text-center font-mono">Click clips from the library →</p>
                )}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT: Settings + Export ═══ */}
          <div className="space-y-3 max-h-[85vh] overflow-y-auto">

            {/* Export */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Export</span>
              <div className="space-y-2">
                <p className="text-[9px] text-gray-600">Mode: {isLandscape ? '16:9 Landscape' : '9:16 Portrait'}</p>
                <div className="flex gap-1.5">
                  {(['720p', '1080p'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setResolution(r)}
                      className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded transition-colors ${
                        resolution === r ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-600 border border-white/5'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button
                  onClick={exportVideo}
                  disabled={exporting || timeline.length === 0}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold text-xs rounded-lg transition-colors uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <FaDownload className="w-3 h-3" />
                  {exporting ? 'Exporting...' : 'Export MP4'}
                </button>
                {exportProgress && (
                  <p className={`text-[10px] font-mono ${exportProgress.startsWith('Error') ? 'text-red-400' : exportProgress === 'Done!' ? 'text-green-400' : 'text-gray-500'}`}>
                    {exportProgress}
                  </p>
                )}
              </div>
            </div>

            {/* Quick tools */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Tools</span>
              <div className="space-y-1.5">
                {[
                  { name: 'Video Mixer', href: '/mixer', desc: 'Effects, beat sync, chaos' },
                  { name: 'Poster Studio', href: '/image-gen', desc: 'Generate character images' },
                  { name: 'Video Generator', href: '/video-gen', desc: 'AI video from prompts' },
                  { name: 'Music Studio', href: '/music-studio', desc: 'Stems, MIDI, sheet music' },
                  { name: 'Album', href: '/album/tokyo-gutter-punk', desc: 'Tokyo Gutter Punk' },
                  { name: 'Script Generator', href: '/script-gen', desc: 'Write scene scripts' },
                  { name: 'Storyboard', href: '/storyboard-gen', desc: 'Plan your sequence' },
                ].map(tool => (
                  <Link key={tool.name} href={tool.href} className="block p-2.5 bg-black/30 rounded border border-white/5 hover:border-red-500/20 transition-colors">
                    <div className="text-xs font-bold text-white">{tool.name}</div>
                    <div className="text-[9px] text-gray-600">{tool.desc}</div>
                  </Link>
                ))}
              </div>
            </div>

            {/* API/CLI info */}
            <div className="bg-gradient-to-br from-red-950/40 to-black rounded-xl p-3 border border-red-500/10">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-2">API / CLI</span>
              <div className="space-y-2 text-[10px] font-mono text-gray-500">
                <div>
                  <p className="text-gray-400 mb-0.5">Library API</p>
                  <code className="text-red-400/70">GET /api/movie-editor/library</code>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">Export API</p>
                  <code className="text-red-400/70">POST /api/movie-editor/export</code>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">MCP Tool</p>
                  <code className="text-red-400/70">npgx_movie_export</code>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">CLI</p>
                  <code className="text-red-400/70">npx tsx scripts/npgx-movie.mts</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Fullscreen Modal ═══ */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <video ref={videoRef} className="hidden" muted loop playsInline crossOrigin="anonymous" />
            <canvas
              ref={canvasRef}
              className="flex-1 w-full bg-black"
            />
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setActiveIdx(p => Math.max(0, p - 1))} className="text-gray-400 hover:text-white">
                  <FaStepBackward className="w-4 h-4" />
                </button>
                <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white">
                  {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 ml-0.5" />}
                </button>
                <button onClick={() => setActiveIdx(p => (p + 1) % Math.max(1, timeline.length))} className="text-gray-400 hover:text-white">
                  <FaStepForward className="w-4 h-4" />
                </button>
                {musicTrack && (
                  <button onClick={toggleMusic} className={`px-3 py-1.5 rounded text-xs font-bold ${musicPlaying ? 'bg-red-600/30 text-red-400' : 'bg-white/10 text-gray-400'}`}>
                    <FaMusic className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => setShowFx(!showFx)} className={`px-3 py-1.5 rounded text-xs font-bold ${showFx ? 'bg-red-600/30 text-red-400' : 'bg-white/10 text-gray-400'}`}>
                  FX
                </button>
              </div>
              <div className="text-center mt-2 text-[10px] font-mono text-gray-600">
                {activeEntry?.clip.character} — {activeIdx + 1}/{timeline.length}
              </div>
            </div>
            <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-lg text-gray-400 hover:text-white">
              <FaTimes className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
