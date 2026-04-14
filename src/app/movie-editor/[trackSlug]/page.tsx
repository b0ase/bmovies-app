'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  FaPlay, FaPause,
  FaVolumeUp, FaVolumeMute,
  FaDownload, FaExpand, FaTimes,
  FaRandom, FaStar, FaFilm, FaFire
} from 'react-icons/fa'
import TimelineEditor from '@/components/timeline/TimelineEditor'
import type { TimelineAction } from '@/components/timeline/TimelineEditor'
import type { TimelineProject, TrackName } from '@/lib/timeline/types'
import { createEmptyProject, formatTime, getTimelineDuration, channelClips } from '@/lib/timeline/utils'
import { CHANNEL_ORDER } from '@/lib/timeline/constants'
import { saveProject, listProjects } from '@/lib/timeline/store'
import { findTrackBySlug, ALBUMS } from '@/lib/albums'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { useMusic } from '@/hooks/MusicProvider'

/* ── Constants ──────────────────────────────────────── */

const HETZNER = 'https://api.b0ase.com/npg-assets/music-videos'

/* ── Types ──────────────────────────────────────────── */

interface ManifestItem {
  uuid: string
  video: string
  width: number
  height: number
  orientation: string
  segment: number
}

interface TitleVideoItem {
  uuid: string
  video: string
  width: number
  height: number
  orientation: string
}

interface Clip {
  id: string
  url: string
  segment: number
  type: 'performance' | 'title'
}

/* ── Effects ────────────────────────────────────────── */

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

function applyGlitch(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) {
  const n = Math.floor(intensity / 20) + 1
  for (let i = 0; i < n; i++) {
    const y = Math.floor(Math.random() * h)
    const sh = 5 + Math.floor(Math.random() * (intensity / 2))
    const off = Math.floor((Math.random() - 0.5) * intensity)
    const s = ctx.getImageData(0, y, w, sh)
    ctx.putImageData(s, off, y)
  }
}

function applyRGBShift(ctx: CanvasRenderingContext2D, w: number, h: number, shift: number) {
  const img = ctx.getImageData(0, 0, w, h)
  const shifted = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const rx = Math.min(w - 1, x + shift)
      const bx = Math.max(0, x - shift)
      shifted.data[i] = img.data[(y * w + rx) * 4]
      shifted.data[i + 1] = img.data[i + 1]
      shifted.data[i + 2] = img.data[(y * w + bx) * 4 + 2]
      shifted.data[i + 3] = img.data[i + 3]
    }
  }
  ctx.putImageData(shifted, 0, 0)
}

/* ── Page ────────────────────────────────────────────── */

export default function TrackMovieEditor() {
  const params = useParams()
  const trackSlug = params.trackSlug as string
  const { kill: killGlobalMusic } = useMusic()

  // Kill the global music player — this editor has its own audio via WaveSurfer
  useEffect(() => { killGlobalMusic() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve track from albums
  const found = findTrackBySlug(trackSlug)
  const album = found?.album
  const track = found?.track

  const LOCAL = `/music-videos/${trackSlug}-1`
  const CDN_REMOTE = `${HETZNER}/${trackSlug}-1`
  const [CDN, setCDN] = useState(LOCAL)
  const trackTitle = track?.title || trackSlug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  const MUSIC_A = track?.aSide || ''
  const MUSIC_B = track?.bSide || ''

  // Clip library
  const [perfClips, setPerfClips] = useState<Clip[]>([])
  const [titleClips, setTitleClips] = useState<Clip[]>([])
  const [ownKaraokeClips, setOwnKaraokeClips] = useState<Clip[]>([]) // original track's karaoke clips — never overwritten by source changes
  const [loading, setLoading] = useState(true)
  const [clipTab, setClipTab] = useState<'title' | 'performance' | 'x'>('title')
  const [clipSource, setClipSource] = useState(trackSlug)
  const [xClips, setXClips] = useState<Clip[]>([])
  const [xCharacter, setXCharacter] = useState('all')
  const [xLoading, setXLoading] = useState(false)

  // Project
  const [projectKey, setProjectKey] = useState(0)
  const [project, setProject] = useState<TimelineProject>(() => {
    const p = createEmptyProject(trackSlug, trackTitle)
    p.musicUrl = MUSIC_A
    p.musicSide = 'a'
    p.orientation = 'landscape'
    return p
  })

  // Playback
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeClipUrl, setActiveClipUrl] = useState<string | null>(null)
  const [nextClipUrl, setNextClipUrl] = useState<string | null>(null)
  const [playheadTime, setPlayheadTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasBRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  // Transitions
  const [transition, setTransition] = useState<'cut' | 'fade' | 'wipe' | 'dissolve'>('cut')
  const [transitionDuration, setTransitionDuration] = useState(0.5)

  // FX
  const [fx, setFx] = useState({ crimson: false, glitch: false, rgb: false })
  const [glitchIntensity, setGlitchIntensity] = useState(40)

  // Music
  const [bSide, setBSide] = useState(false)
  const [musicVolume, setMusicVolume] = useState(0.7)

  // Export
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')

  // Timeline dispatch ref
  const timelineDispatchRef = useRef<((action: TimelineAction) => void) | null>(null)

  // Fullscreen
  const [fullscreen, setFullscreen] = useState(false)

  /* ── Load clips — reloads when clipSource changes ── */
  useEffect(() => {
    const src = clipSource
    const enc = (u: string) => { const i = u.lastIndexOf('/'); return u.slice(0, i + 1) + encodeURIComponent(u.slice(i + 1)) }

    const load = async () => {
      setLoading(true)
      setPerfClips([])
      setTitleClips([])
      try {
        // Always try the local clips API first — most reliable
        let allClips: string[] = []
        const lowRes = await fetch(`/api/music-video-clips?track=${src}&quality=low`).catch(() => null)
        if (lowRes?.ok) {
          const data = await lowRes.json()
          allClips = data.clips || []
        }
        if (allClips.length === 0) {
          const fullRes = await fetch(`/api/music-video-clips?track=${src}`).catch(() => null)
          if (fullRes?.ok) {
            const data = await fullRes.json()
            allClips = data.clips || []
          }
        }

        if (allClips.length > 0) {
          const titles = allClips.filter(c => c.includes('-titles-') || c.includes('-lyrics-'))
          const scenes = allClips.filter(c => !c.includes('-titles-') && !c.includes('-lyrics-'))
          setPerfClips(scenes.map((url, i) => ({ id: `perf-${i}`, url: enc(url), segment: i + 1, type: 'performance' as const })))
          setTitleClips(titles.map((url, i) => ({ id: `title-${i}`, url: enc(url), segment: i + 1, type: 'title' as const })))
        } else {
          // Fallback: CDN manifest
          const srcCDN = `${HETZNER}/${src}-1`
          const manifestRes = await fetch(`${srcCDN}/manifest.json`).catch(() => null)
          if (manifestRes?.ok) {
            const manifest = await manifestRes.json()
            const collections = manifest.collections || {}
            const items: ManifestItem[] = collections[src]?.items || (Object.values(collections)[0] as any)?.items || []
            setPerfClips(items.map((item, i) => ({
              id: `perf-${i}`,
              url: `${srcCDN}/${encodeURIComponent(item.video)}`,
              segment: item.segment || i + 1,
              type: 'performance' as const,
            })))
          }
        }
      } catch (e) {
        console.error('Failed to load clips:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clipSource]) // eslint-disable-line react-hooks/exhaustive-deps

  // Capture own karaoke clips after initial title clips load
  useEffect(() => {
    if (clipSource === trackSlug && titleClips.length > 0 && ownKaraokeClips.length === 0) {
      setOwnKaraokeClips(titleClips)
    }
  }, [titleClips, clipSource, trackSlug, ownKaraokeClips.length])

  // Load X content when character changes
  useEffect(() => {
    if (clipTab !== 'x') return
    const loadX = async () => {
      setXLoading(true)
      setXClips([])
      const chars = xCharacter === 'all'
        ? NPGX_ROSTER.filter(c => c.hasImages)
        : NPGX_ROSTER.filter(c => c.slug === xCharacter)
      const allXClips: Clip[] = []
      for (const char of chars) {
        try {
          const res = await fetch(`/api/content/list?slug=${char.slug}`)
          if (!res.ok) continue
          const data = await res.json()
          const items = (data.items || []).filter((item: any) => {
            const p = item.path?.toLowerCase() || ''
            return (p.includes('/fetish/') || p.includes('/x/') || p.includes('/xx/') || p.includes('/xxx/'))
              && item.type === 'image'
          })
          for (const item of items) {
            allXClips.push({
              id: `x-${char.slug}-${allXClips.length}`,
              url: item.path,
              segment: allXClips.length + 1,
              type: 'title' as const, // images go to library, user drags to X channel
            })
          }
        } catch {}
      }
      setXClips(allXClips)
      setXLoading(false)
    }
    loadX()
  }, [clipTab, xCharacter])

  // Load saved project if exists, else try seed file. Seed wins if newer.
  useEffect(() => {
    listProjects().then(async projects => {
      const existing = projects.find(p => p.trackSlug === trackSlug)

      // Try loading seed to compare
      let seed: TimelineProject | null = null
      try {
        const seedRes = await fetch(`/music-videos/${trackSlug}-1/project-seed.json?t=${Date.now()}`)
        if (seedRes.ok) {
          seed = await seedRes.json() as TimelineProject
          seed.musicUrl = MUSIC_A
        }
      } catch {}

      // Use seed if it has more clips than saved project, or if no saved project
      const countAll = (p: TimelineProject) => Object.values(p.channels).reduce((s, ch) => s + channelClips(ch).length, 0)
      const existingClipCount = existing ? countAll(existing) : 0
      const seedClipCount = seed ? countAll(seed) : 0

      if (seed && seedClipCount > existingClipCount) {
        setProject(seed)
        setProjectKey(k => k + 1)
        saveProject(seed)
        return
      }
      if (existingClipCount > 0 && existing) {
        setProject(existing)
        setProjectKey(k => k + 1)
        return
      }
    }).catch(() => {})
  }, [trackSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update music URL when A/B side changes
  useEffect(() => {
    setProject(prev => ({ ...prev, musicUrl: bSide ? MUSIC_B : MUSIC_A, musicSide: bSide ? 'b' : 'a' }))
  }, [bSide, MUSIC_A, MUSIC_B])

  /* ── Canvas render loop ── */
  const drawVideoToCanvas = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement, applyFx: boolean) => {
    if (video.readyState < 2) return // not ready — keep last frame on canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const needsResize = canvas.width !== canvas.offsetWidth * dpr || canvas.height !== canvas.offsetHeight * dpr
    if (needsResize) {
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
    }
    const vw = video.videoWidth || canvas.width
    const vh = video.videoHeight || canvas.height
    const scale = Math.max(canvas.width / vw, canvas.height / vh)
    const dw = vw * scale, dh = vh * scale
    const dx = (canvas.width - dw) / 2, dy = (canvas.height - dh) / 2
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(video, dx, dy, dw, dh)
    if (applyFx) {
      if (fx.crimson) applyCrimsonFilter(ctx, canvas.width, canvas.height)
      if (fx.glitch && Math.random() > 0.7) applyGlitch(ctx, canvas.width, canvas.height, glitchIntensity)
      if (fx.rgb) applyRGBShift(ctx, canvas.width, canvas.height, 3)
    }
  }, [fx, glitchIntensity])

  // Single always-on render loop — draws whatever's available, never stops
  useEffect(() => {
    let rafId = 0
    const draw = () => {
      try {
        if (videoRef.current && canvasRef.current) drawVideoToCanvas(videoRef.current, canvasRef.current, true)
      } catch {}
      try {
        if (videoBRef.current && canvasBRef.current) drawVideoToCanvas(videoBRef.current, canvasBRef.current, false)
      } catch {}
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [drawVideoToCanvas])

  // Load scene clip
  const lastClipUrlRef = useRef<string | null>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeClipUrl) return
    if (activeClipUrl === lastClipUrlRef.current) return
    lastClipUrlRef.current = activeClipUrl
    video.src = activeClipUrl
    video.load()
  }, [activeClipUrl])

  // Load title clip
  const lastNextUrlRef = useRef<string | null>(null)
  useEffect(() => {
    const video = videoBRef.current
    if (!video || !nextClipUrl) return
    if (nextClipUrl === lastNextUrlRef.current) return
    lastNextUrlRef.current = nextClipUrl
    video.src = nextClipUrl
    video.load()
  }, [nextClipUrl])

  // Play/pause — just start/stop the video elements
  useEffect(() => {
    if (isPlaying) {
      videoRef.current?.play().catch(() => {})
      videoBRef.current?.play().catch(() => {})
    } else {
      videoRef.current?.pause()
      videoBRef.current?.pause()
    }
  }, [isPlaying])

  /* ── Timeline callbacks ── */
  const handlePlayheadChange = useCallback((time: number, clipUrl: string | null) => {
    setPlayheadTime(time)
    const titleClips_all = [...channelClips(project.channels['titles-v2']), ...channelClips(project.channels['titles-v1']), ...channelClips(project.channels.music)]
    const sceneClips = [...channelClips(project.channels['scenes-v2']), ...channelClips(project.channels['scenes-v1']), ...channelClips(project.channels.x)]
    const titleClip = titleClips_all.find(c => time >= c.startTime && time < c.startTime + c.duration)
    const sceneClip = sceneClips.find(c => time >= c.startTime && time < c.startTime + c.duration)
    // SCENES preview = scenes/x channels, TITLES preview = music channel
    setActiveClipUrl(sceneClip?.clipUrl || null)
    setNextClipUrl(titleClip?.clipUrl || null)
  }, [project.channels])

  const handleProjectChange = useCallback((p: TimelineProject) => { setProject(p) }, [])
  const handlePlayToggle = useCallback(() => { setIsPlaying(prev => !prev) }, [])

  /* ── Whisper auto-timeline ── */
  interface WhisperSegment { id: number; start: number; end: number; text: string }
  const [whisperSegments, setWhisperSegments] = useState<WhisperSegment[]>([])
  const karaokePopulated = useRef(false)

  useEffect(() => {
    fetch(`/music/lyrics-sync/${trackSlug}.json`)
      .then(r => r.json())
      .then(data => setWhisperSegments(data.segments || []))
      .catch(() => {})
  }, [trackSlug])

  // Auto-populate KARAOKE track on first load using own track's karaoke clips
  useEffect(() => {
    if (karaokePopulated.current) return
    if (channelClips(project.channels['titles-v1']).length > 0 || channelClips(project.channels['titles-v2']).length > 0) return
    if (ownKaraokeClips.length === 0) return
    if (whisperSegments.length === 0) return

    karaokePopulated.current = true
    const karaoke = ownKaraokeClips

    setTimeout(() => {
      const hasLyrics = karaoke.some(c => c.url.includes('-lyrics-') || c.url.includes('-titles-'))
      if (hasLyrics) {
        const duration = whisperSegments[whisperSegments.length - 1]?.end || 120
        const clipDur = duration / karaoke.length
        karaoke.forEach((clip, i) => {
          timelineDispatchRef.current?.({
            type: 'ADD_CLIP', track: 'title' as TrackName,
            clip: { id: crypto.randomUUID(), clipUrl: clip.url, startTime: i * clipDur, duration: clipDur, sourceStartOffset: 0, sourceEndOffset: clipDur, segment: clip.segment, type: 'title' },
          })
        })
      } else {
        let idx = 0
        for (const seg of whisperSegments) {
          const clip = karaoke[idx % karaoke.length]
          idx++
          timelineDispatchRef.current?.({
            type: 'ADD_CLIP', track: 'title' as TrackName,
            clip: { id: crypto.randomUUID(), clipUrl: clip.url, startTime: seg.start, duration: seg.end - seg.start, sourceStartOffset: 0, sourceEndOffset: seg.end - seg.start, segment: clip.segment, type: 'title' },
          })
        }
      }
    }, 200)
  }, [ownKaraokeClips, whisperSegments, project.channels['titles-v1']]) // eslint-disable-line react-hooks/exhaustive-deps

  const generateFromWhisper = useCallback(() => {
    if (whisperSegments.length === 0) return
    const karaoke = ownKaraokeClips.length > 0 ? ownKaraokeClips : titleClips
    if (karaoke.length === 0 && perfClips.length === 0) return
    timelineDispatchRef.current?.({ type: 'CLEAR_ALL' })
    setTimeout(() => {
      const totalDuration = whisperSegments[whisperSegments.length - 1]?.end || 120
      const introEnd = whisperSegments[0]?.start || 0

      // KARAOKE/TITLES track — distribute evenly from 0 across full duration
      if (karaoke.length > 0) {
        const clipDur = totalDuration / karaoke.length
        karaoke.forEach((clip, i) => {
          timelineDispatchRef.current?.({
            type: 'ADD_CLIP', track: 'title' as TrackName,
            clip: { id: crypto.randomUUID(), clipUrl: clip.url, startTime: i * clipDur, duration: clipDur, sourceStartOffset: 0, sourceEndOffset: clipDur, segment: clip.segment, type: 'title' },
          })
        })
      }

      // VIDEO/SCENES track — fill intro then follow whisper segments
      if (perfClips.length > 0) {
        let sceneIdx = 0
        // Fill intro gap with scene clips
        if (introEnd > 1) {
          const numIntro = Math.ceil(introEnd / 3)
          const introDur = introEnd / numIntro
          for (let i = 0; i < numIntro; i++) {
            const clip = perfClips[sceneIdx % perfClips.length]
            sceneIdx++
            timelineDispatchRef.current?.({
              type: 'ADD_CLIP', track: 'slow' as TrackName,
              clip: { id: crypto.randomUUID(), clipUrl: clip.url, startTime: i * introDur, duration: introDur, sourceStartOffset: 0, sourceEndOffset: introDur, segment: clip.segment, type: 'performance' },
            })
          }
        }
        // Follow whisper segments
        for (const seg of whisperSegments) {
          const clip = perfClips[sceneIdx % perfClips.length]
          sceneIdx++
          timelineDispatchRef.current?.({
            type: 'ADD_CLIP', track: 'slow' as TrackName,
            clip: { id: crypto.randomUUID(), clipUrl: clip.url, startTime: seg.start, duration: seg.end - seg.start, sourceStartOffset: 0, sourceEndOffset: seg.end - seg.start, segment: clip.segment, type: 'performance' },
          })
        }
      }
    }, 100)
  }, [whisperSegments, perfClips, titleClips, ownKaraokeClips])

  /* ── Library actions ── */
  const clipDuration = 3
  const addClip = (clip: Clip) => {
    const clipTrack: TrackName = clip.type === 'title' ? 'title' : 'slow'
    timelineDispatchRef.current?.({
      type: 'ADD_CLIP', track: clipTrack,
      clip: { id: crypto.randomUUID(), clipUrl: clip.url, startTime: -1, duration: clipDuration, sourceStartOffset: 0, sourceEndOffset: clipDuration, segment: clip.segment, type: clip.type },
    })
  }

  const addRandomSequence = (count: number) => {
    const all = [...perfClips, ...titleClips]
    for (let i = 0; i < count; i++) {
      const clip = all[Math.floor(Math.random() * all.length)]
      const clipTrack: TrackName = clip.type === 'title' ? 'title' : (Math.random() > 0.5 ? 'slow' : 'fast')
      timelineDispatchRef.current?.({
        type: 'ADD_CLIP', track: clipTrack,
        clip: { id: crypto.randomUUID(), clipUrl: clip.url, startTime: 99999, duration: clipDuration, sourceStartOffset: 0, sourceEndOffset: clipDuration, segment: clip.segment, type: clip.type },
      })
    }
  }

  /* ── Export ── */
  const totalClips = CHANNEL_ORDER.reduce((sum, ch) => sum + channelClips(project.channels[ch]).length, 0)
  const totalDuration = getTimelineDuration(project.channels)

  const exportVideo = async () => {
    if (totalClips === 0) return
    setExporting(true)
    setExportProgress('Assembling via FFmpeg...')
    try {
      const allClips = CHANNEL_ORDER.flatMap(ch => channelClips(project.channels[ch]).map(c => ({ url: c.clipUrl, duration: c.duration })))
      const res = await fetch('/api/movie-editor/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: allClips, music: { url: project.musicUrl, volume: musicVolume },
          transition: 'fade', transitionDuration: 0.3, resolution: '1080p', orientation: 'landscape',
          watermark: `NPGX — ${trackTitle}`, title: trackTitle,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Export failed')
      setExportProgress('Downloading...')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${trackSlug}-edit-${Date.now()}.mp4`; a.click()
      URL.revokeObjectURL(url)
      setExportProgress('Done!')
      setTimeout(() => setExportProgress(''), 3000)
    } catch (err: any) {
      setExportProgress(`Error: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const displayClips = clipTab === 'title' ? titleClips : clipTab === 'x' ? xClips : perfClips

  if (!track) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Track not found</h1>
          <p className="text-gray-500 mb-4">&quot;{trackSlug}&quot; not in album data</p>
          <Link href="/movie-editor" className="text-pink-400 hover:text-pink-300">Back to Movie Editor</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <video ref={videoRef} className="hidden" muted loop playsInline crossOrigin="anonymous" />
      <video ref={videoBRef} className="hidden" muted loop playsInline crossOrigin="anonymous" />

      <div className="max-w-[1920px] mx-auto px-3 py-4">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/watch/${trackSlug}`} className="group flex items-center gap-3">
              <div>
                <h1 className="text-lg font-black font-[family-name:var(--font-brand)] uppercase tracking-wide bg-gradient-to-r from-pink-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                  {trackTitle}
                </h1>
                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">Multi-Track Music Video Editor</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
            <span>{totalClips} clips</span>
            <span className="text-gray-700">|</span>
            <span>{formatTime(totalDuration)}</span>
            <span className="text-gray-700">|</span>
            <span>{perfClips.length + titleClips.length} available</span>
            <Link href="/movie-editor" className="ml-2 px-3 py-1.5 bg-white/5 text-gray-400 text-xs font-bold rounded border border-white/10 hover:bg-white/10 transition-colors uppercase tracking-wider">
              Full Editor
            </Link>
            <Link href={`/watch/${trackSlug}`} className="px-3 py-1.5 bg-pink-600/20 text-pink-400 text-xs font-bold rounded border border-pink-500/20 hover:bg-pink-600/40 transition-colors uppercase tracking-wider">
              Watch
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-3">

          {/* ═══ LEFT: Clip Library ═══ */}
          <div className="space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="p-2 border-b border-white/5">
                <select value={clipSource} onChange={e => setClipSource(e.target.value)}
                  className="w-full bg-black border border-white/10 text-gray-300 text-[10px] rounded px-2 py-1.5 font-[family-name:var(--font-brand)] uppercase tracking-wider">
                  {ALBUMS.flatMap(a => a.tracks.filter(t => t.status === 'recorded').map(t => (
                    <option key={t.slug} value={t.slug}>{t.title}{t.japanese ? ` — ${t.japanese}` : ''}</option>
                  )))}
                </select>
              </div>
              <div className="flex">
                <button onClick={() => setClipTab('title')}
                  className={`flex-1 px-2 py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                    clipTab === 'title' ? 'bg-cyan-600/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:bg-white/5'
                  }`}>
                  <FaStar className="w-2 h-2" /> Titles ({titleClips.length})
                </button>
                <button onClick={() => setClipTab('performance')}
                  className={`flex-1 px-2 py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                    clipTab === 'performance' ? 'bg-pink-600/20 text-pink-400 border-b-2 border-pink-500' : 'text-gray-500 hover:bg-white/5'
                  }`}>
                  <FaFilm className="w-2 h-2" /> Scenes ({perfClips.length})
                </button>
                <button onClick={() => setClipTab('x')}
                  className={`flex-1 px-2 py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                    clipTab === 'x' ? 'bg-orange-600/20 text-orange-400 border-b-2 border-orange-500' : 'text-gray-500 hover:bg-white/5'
                  }`}>
                  <FaFire className="w-2 h-2" /> X ({xClips.length})
                </button>
              </div>
              {clipTab === 'x' && (
                <div className="p-2 border-t border-white/5">
                  <select value={xCharacter} onChange={e => setXCharacter(e.target.value)}
                    className="w-full bg-black border border-orange-500/20 text-gray-300 text-[10px] rounded px-2 py-1.5">
                    <option value="all">All Girls</option>
                    {NPGX_ROSTER.filter(c => c.hasImages).map(c => (
                      <option key={c.slug} value={c.slug}>{c.letter}. {c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-1.5 p-2 border-t border-white/5">
                <button onClick={generateFromWhisper} disabled={whisperSegments.length === 0}
                  className="flex-1 py-1.5 text-[9px] font-bold uppercase bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Auto ({whisperSegments.length} segs)
                </button>
                <button onClick={() => displayClips.forEach(c => addClip(c))}
                  className="flex-1 py-1.5 text-[9px] font-bold uppercase bg-white/5 text-gray-400 rounded hover:bg-white/10 transition-colors">+ All</button>
                <button onClick={() => addRandomSequence(12)}
                  className="flex-1 py-1.5 text-[9px] font-bold uppercase bg-white/5 text-gray-400 rounded hover:bg-white/10 transition-colors flex items-center justify-center gap-1">
                  <FaRandom className="w-2 h-2" /> 12
                </button>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="text-[9px] text-gray-600 mb-2">Drag clips to timeline tracks or click to add</p>
              {loading ? (
                <p className="text-xs text-gray-600 text-center py-8 animate-pulse">Loading clips...</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 max-h-[55vh] overflow-y-auto">
                  {displayClips.map(clip => {
                    const isImage = clip.url.match(/\.(png|jpg|jpeg|webp)$/i)
                    const borderColor = clipTab === 'x' ? 'border-orange-500/20 hover:border-orange-500/50'
                      : clip.type === 'title' ? 'border-cyan-500/20 hover:border-cyan-500/50'
                      : 'border-white/10 hover:border-pink-500/50'
                    const badgeColor = clipTab === 'x' ? 'bg-orange-600' : clip.type === 'title' ? 'bg-cyan-600' : 'bg-pink-600'
                    return (
                      <div key={clip.id} draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            clipUrl: clip.url, segment: clip.segment,
                            clipType: clipTab === 'x' ? 'x' : clip.type,
                            duration: clipDuration, characterSlug: clip.url.split('/content/')[1]?.split('/')[0],
                          }))
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                        onClick={() => addClip(clip)}
                        className={`relative bg-black rounded overflow-hidden cursor-grab border transition-all group aspect-video ${borderColor}`}>
                        {isImage ? (
                          <img src={clip.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={clip.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className={`text-[9px] text-white font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>+ ADD</span>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
                          <span className={`text-[7px] font-bold ${clipTab === 'x' ? 'text-orange-300' : clip.type === 'title' ? 'text-cyan-300' : 'text-gray-400 font-mono'}`}>
                            {clipTab === 'x' ? clip.url.split('/').pop()?.split('.')[0]?.slice(0, 12) : clip.type === 'title' ? `T${clip.segment}` : `#${clip.segment}`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ═══ CENTER: Transport + Preview + Timeline ═══ */}
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-center gap-2 bg-white/5 rounded-xl p-2.5 border border-white/10 flex-wrap">
              <button onClick={handlePlayToggle} className={`p-2.5 rounded-full ${isPlaying ? 'bg-pink-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 ml-0.5" />}
              </button>
              <span className="text-[10px] font-mono text-gray-500 w-20 text-center">{formatTime(playheadTime)}</span>
              <div className="w-px h-5 bg-white/10 mx-1" />
              {(['crimson', 'glitch', 'rgb'] as const).map(key => (
                <button key={key} onClick={() => setFx(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors ${
                    fx[key] ? 'bg-pink-600/30 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-gray-500 border border-white/10'
                  }`}>{key}</button>
              ))}
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button onClick={() => setFullscreen(true)} className="p-1.5 text-gray-400 hover:text-white"><FaExpand className="w-3.5 h-3.5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative bg-black rounded-xl overflow-hidden border border-pink-500/20">
                <div className="absolute top-1.5 left-2 z-10"><span className="text-[8px] font-black uppercase tracking-widest bg-black/60 text-pink-400 px-1.5 py-0.5 rounded">SCENES</span></div>
                <canvas ref={canvasRef} className="w-full bg-black" style={{ aspectRatio: '16/9' }} />
                {!activeClipUrl && <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs text-gray-600">Add clips to timeline</span></div>}
              </div>
              <div className="relative bg-black rounded-xl overflow-hidden border border-cyan-500/20">
                <div className="absolute top-1.5 left-2 z-10"><span className="text-[8px] font-black uppercase tracking-widest bg-black/60 text-cyan-400 px-1.5 py-0.5 rounded">TITLES</span></div>
                <canvas ref={canvasBRef} className="w-full bg-black" style={{ aspectRatio: '16/9' }} />
                {!nextClipUrl && <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs text-gray-600">Title track empty</span></div>}
              </div>
            </div>

            <TimelineEditor
              key={projectKey}
              initialProject={project}
              isPlaying={isPlaying}
              onPlayheadChange={handlePlayheadChange}
              onProjectChange={handleProjectChange}
              onPlayToggle={handlePlayToggle}
              musicVolume={musicVolume}
              dispatchRef={timelineDispatchRef}
            />
          </div>

          {/* ═══ RIGHT: Controls ═══ */}
          <div className="space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Music</span>
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <button onClick={() => setBSide(false)} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${!bSide ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>A-Side</button>
                  <button onClick={() => setBSide(true)} disabled={!MUSIC_B} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${bSide ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-500 border border-white/10'} disabled:opacity-30`}>B-Side</button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMusicVolume(prev => prev > 0 ? 0 : 0.7)} className="text-gray-500 hover:text-pink-400">
                    {musicVolume > 0 ? <FaVolumeUp className="w-3 h-3" /> : <FaVolumeMute className="w-3 h-3" />}
                  </button>
                  <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={e => setMusicVolume(parseFloat(e.target.value))} className="flex-1 h-1 accent-pink-500" />
                  <span className="text-[9px] font-mono text-gray-600 w-6">{Math.round(musicVolume * 100)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Effects</span>
              <div className="space-y-2">
                {([
                  { key: 'crimson' as const, label: 'Crimson', desc: 'Red-shifted color grading' },
                  { key: 'glitch' as const, label: 'Glitch', desc: 'Scan line displacement' },
                  { key: 'rgb' as const, label: 'RGB Shift', desc: 'Chromatic aberration' },
                ]).map(effect => (
                  <button key={effect.key} onClick={() => setFx(prev => ({ ...prev, [effect.key]: !prev[effect.key] }))}
                    className={`w-full p-2 rounded border text-left transition-colors ${fx[effect.key] ? 'bg-pink-600/10 border-pink-500/30 text-pink-300' : 'bg-black/30 border-white/5 text-gray-500 hover:border-pink-500/20'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{effect.label}</span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${fx[effect.key] ? 'bg-pink-600/30 text-pink-400' : 'bg-white/5 text-gray-600'}`}>{fx[effect.key] ? 'ON' : 'OFF'}</span>
                    </div>
                    <p className="text-[9px] text-gray-600 mt-0.5">{effect.desc}</p>
                  </button>
                ))}
                {fx.glitch && (
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[9px] text-gray-600">Intensity</span>
                    <input type="range" min="10" max="100" step="5" value={glitchIntensity} onChange={e => setGlitchIntensity(Number(e.target.value))} className="flex-1 h-1 accent-pink-500" />
                    <span className="text-[9px] font-mono text-gray-600 w-6">{glitchIntensity}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-950/30 to-black rounded-xl p-3 border border-cyan-500/10">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block mb-3">Export</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px]"><span className="text-gray-500">Clips</span><span className="font-mono text-gray-300">{totalClips}</span></div>
                <div className="flex items-center justify-between text-[10px]"><span className="text-gray-500">Duration</span><span className="font-mono text-gray-300">{formatTime(totalDuration)}</span></div>
                <div className="flex items-center justify-between text-[10px]"><span className="text-gray-500">Track</span><span className="font-mono text-gray-300">{bSide ? 'B-Side' : 'A-Side'}</span></div>
                <button onClick={exportVideo} disabled={exporting || totalClips === 0}
                  className="w-full py-3 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white font-bold text-xs rounded-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2 mt-3">
                  <FaDownload className="w-3 h-3" />
                  {exporting ? 'Exporting...' : 'Export MP4'}
                </button>
                {exportProgress && <p className={`text-[10px] font-mono text-center ${exportProgress.startsWith('Error') ? 'text-red-400' : exportProgress === 'Done!' ? 'text-green-400' : 'text-gray-500'}`}>{exportProgress}</p>}
                <button onClick={() => {
                  const json = JSON.stringify(project, null, 2)
                  navigator.clipboard.writeText(json).then(() => {
                    const btn = document.activeElement as HTMLButtonElement
                    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy JSON' }, 1500) }
                  })
                }} className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 font-mono text-[10px] rounded-lg transition-all border border-white/10 mt-1">
                  Copy JSON
                </button>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Track Info</span>
              <div className="space-y-1.5 text-[10px] text-gray-500">
                <div className="flex justify-between"><span>Album</span><span className="text-gray-300">{album?.title}</span></div>
                <div className="flex justify-between"><span>Track</span><span className="text-gray-300">#{String(track.num).padStart(2, '0')}</span></div>
                <div className="flex justify-between"><span>Genre</span><span className="text-gray-300">{track.genre}</span></div>
                <div className="flex justify-between"><span>BPM</span><span className="text-gray-300">{track.bpm}</span></div>
                <div className="flex justify-between"><span>Titles</span><span className="text-cyan-400">{channelClips(project.channels['titles-v1']).length + channelClips(project.channels['titles-v2']).length}</span></div>
                <div className="flex justify-between"><span>Scenes</span><span className="text-pink-400">{channelClips(project.channels['scenes-v2']).length + channelClips(project.channels['scenes-v1']).length}</span></div>
                <div className="flex justify-between"><span>X</span><span className="text-orange-400">{channelClips(project.channels.x).length}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {fullscreen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col">
            <canvas ref={canvasRef} className="flex-1 w-full bg-black" />
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-4">
                <button onClick={handlePlayToggle} className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center text-white">
                  {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 ml-0.5" />}
                </button>
                {(['crimson', 'glitch', 'rgb'] as const).map(key => (
                  <button key={key} onClick={() => setFx(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={`px-2.5 py-1.5 rounded text-[10px] font-bold uppercase ${fx[key] ? 'bg-pink-600/30 text-pink-400' : 'bg-white/10 text-gray-400'}`}>{key}</button>
                ))}
              </div>
              <div className="text-center mt-2 text-[10px] font-mono text-gray-600">{formatTime(playheadTime)}</div>
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
