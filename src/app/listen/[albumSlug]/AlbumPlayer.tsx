'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Album } from '@/lib/albums'

// ── Types ──
interface VideoClip { url: string; width: number; height: number; trackNum: number }
interface TrackChapter { trackNum: number; title: string; startTime: number; duration: number }

const POOL_SIZE = 3
const isMobile = () => typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))

// ── Pool helpers ──
interface PoolEntry { video: HTMLVideoElement; clipIdx: number; ready: boolean }

function createPoolEntry(): PoolEntry {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.loop = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  return { video, clipIdx: -1, ready: false }
}

interface AlbumPlayerProps {
  album: Album
}

export default function AlbumPlayer({ album }: AlbumPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // State
  const [videos, setVideos] = useState<VideoClip[]>([])
  const [chapters, setChapters] = useState<TrackChapter[]>([])
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [trackEnded, setTrackEnded] = useState(false)
  const [playingBSide, setPlayingBSide] = useState(false)
  const [needsTap, setNeedsTap] = useState(true)
  const [showTitle, setShowTitle] = useState(true)

  // Refs
  const videosRef = useRef<VideoClip[]>([])
  const poolRef = useRef<PoolEntry[]>([])
  const activeSlotRef = useRef(0)
  const playlistPosRef = useRef(0)
  const mobileRef = useRef(false)
  const startedRef = useRef(false)

  useEffect(() => { videosRef.current = videos }, [videos])
  useEffect(() => { mobileRef.current = isMobile() }, [])

  // Create independent audio element
  useEffect(() => {
    if (audioRef.current) return
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = 1
    audioRef.current = audio
    return () => {
      if (audio) {
        audio.pause()
        audio.src = ''
        audioRef.current = null
      }
    }
  }, [])

  // Build chapters array and load first track
  useEffect(() => {
    let totalDuration = 0
    const trackChapters: TrackChapter[] = []

    for (let i = 0; i < album.tracks.length; i++) {
      const track = album.tracks[i]
      if (track.status !== 'recorded') continue

      // Estimate duration: 60 / BPM * 180 (rough estimate for ~3min songs)
      const estimatedDuration = (60 / track.bpm) * 180

      trackChapters.push({
        trackNum: i,
        title: track.title,
        startTime: totalDuration,
        duration: estimatedDuration,
      })

      totalDuration += estimatedDuration
    }

    setChapters(trackChapters)
    loadTrackAudio(0)
  }, [album])

  // Load audio for a specific track
  const loadTrackAudio = (trackIdx: number) => {
    if (!audioRef.current || !album.tracks[trackIdx]) return

    const track = album.tracks[trackIdx]
    const audioSrc = playingBSide ? track.bSide : track.aSide
    if (!audioSrc) return

    const audio = audioRef.current
    audio.src = audioSrc
    audio.load()

    const handleMetadata = () => {
      // Update chapter duration based on actual audio
      setChapters(prev => {
        const updated = [...prev]
        const chapterIdx = prev.findIndex(c => c.trackNum === trackIdx)
        if (chapterIdx >= 0) {
          updated[chapterIdx] = {
            ...updated[chapterIdx],
            duration: audio.duration || 0,
          }
        }
        return updated
      })
    }

    const handleEnded = () => {
      // Auto-advance to next track
      const nextIdx = trackIdx + 1
      if (nextIdx < album.tracks.length) {
        setCurrentTrackIdx(nextIdx)
        loadTrackAudio(nextIdx)
        setTimeout(() => audio.play().catch(() => {}), 100)
      } else {
        setTrackEnded(true)
      }
    }

    audio.addEventListener('loadedmetadata', handleMetadata)
    audio.addEventListener('ended', handleEnded)

    const progressInterval = setInterval(() => {
      if (audio && !audio.paused) {
        setAudioProgress(audio.currentTime)
      }
    }, 100)

    return () => {
      clearInterval(progressInterval)
      audio.removeEventListener('loadedmetadata', handleMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }

  useEffect(() => {
    return loadTrackAudio(currentTrackIdx)
  }, [currentTrackIdx, playingBSide, album])

  // Load all videos from all tracks
  useEffect(() => {
    const loadAllVideos = async () => {
      const allClips: VideoClip[] = []

      for (let trackIdx = 0; trackIdx < album.tracks.length; trackIdx++) {
        const track = album.tracks[trackIdx]
        if (track.status !== 'recorded') continue

        try {
          const manifestUrl = `/music-videos/${track.slug}-1/manifest.json`
          const res = await fetch(manifestUrl)
          if (!res.ok) continue

          const manifest = await res.json()
          const items = Object.values(manifest.collections as any)
            .flatMap((c: any) => c.items)
            .filter((i: any) => i.video)

          const trackClips = items.map((v: any) => ({
            url: `/music-videos/${track.slug}-1/${v.video}`,
            width: v.width || 720,
            height: v.height || 1280,
            trackNum: trackIdx,
          }))

          allClips.push(...trackClips)
        } catch (e) {
          console.warn(`Failed to load videos for track ${track.title}:`, e)
        }
      }

      // Shuffle
      const shuffled = [...allClips]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }

      setVideos(shuffled)
    }

    loadAllVideos()
  }, [album])

  // Initialize video pool
  useEffect(() => {
    if (videos.length === 0) return
    if (poolRef.current.length === 0) {
      poolRef.current = Array.from({ length: POOL_SIZE }, () => createPoolEntry())
    }
    const count = Math.min(POOL_SIZE, videos.length)
    for (let i = 0; i < count; i++) {
      loadIntoSlot(poolRef.current[i], videos, i)
    }
    activeSlotRef.current = 0
    playlistPosRef.current = 0
  }, [videos])

  // Load video into pool slot
  const loadIntoSlot = (slot: PoolEntry, clips: VideoClip[], clipIdx: number) => {
    if (clips.length === 0) return
    const idx = ((clipIdx % clips.length) + clips.length) % clips.length
    slot.clipIdx = idx
    slot.ready = false
    const videoUrl = clips[idx].url
    slot.video.src = videoUrl
    slot.video.load()
    slot.video.onloadeddata = () => {
      slot.ready = true
      slot.video.play().catch(() => {})
    }
    slot.video.onerror = () => { slot.ready = false }
  }

  const getActiveVideo = useCallback((): HTMLVideoElement | null => {
    const pool = poolRef.current
    return pool.length > 0 ? pool[activeSlotRef.current]?.video || null : null
  }, [])

  const advanceVideo = useCallback(() => {
    const pool = poolRef.current
    const clips = videosRef.current
    if (pool.length === 0 || clips.length === 0) return
    const oldSlot = activeSlotRef.current
    activeSlotRef.current = (activeSlotRef.current + 1) % pool.length
    playlistPosRef.current++
    loadIntoSlot(pool[oldSlot], clips, playlistPosRef.current + pool.length - 1)
  }, [])

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const render = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { animRef.current = requestAnimationFrame(render); return }

      const dpr = window.devicePixelRatio > 1 ? 2 : 1
      const cw = canvas.clientWidth * dpr
      const ch = canvas.clientHeight * dpr
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch }

      const video = poolRef.current.length > 0 ? poolRef.current[activeSlotRef.current]?.video : null

      if (video && video.readyState >= 1) {
        const vw = video.videoWidth || 1, vh = video.videoHeight || 1
        const scale = Math.max(cw / vw, ch / vh)
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, cw, ch)
        ctx.drawImage(video, (cw - vw * scale) / 2, (ch - vh * scale) / 2, vw * scale, vh * scale)
      } else {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, cw, ch)
      }

      // Vignette
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.3, cw / 2, ch / 2, cw * 0.85)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.45)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, cw, ch)

      animRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // Title fade
  useEffect(() => {
    if (!needsTap && showTitle) {
      const timeout = setTimeout(() => setShowTitle(false), 5000)
      return () => clearTimeout(timeout)
    }
  }, [needsTap, showTitle])

  const handleStart = () => {
    if (startedRef.current) return
    startedRef.current = true
    if (audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
    for (const entry of poolRef.current) {
      if (entry.video.src) entry.video.play().catch(() => {})
    }
    setNeedsTap(false)
  }

  const currentTrack = album.tracks[currentTrackIdx]
  const currentChapter = chapters.find(c => c.trackNum === currentTrackIdx)

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ zIndex: 200 }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {needsTap && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black cursor-pointer"
          onClick={handleStart}
        >
          <div className="text-center">
            <div className="font-[family-name:var(--font-brand)] text-5xl text-white uppercase tracking-[0.3em] mb-8">NPGX</div>
            <div className="font-[family-name:var(--font-brand)] text-white/80 text-sm mb-2">{album.title}</div>
            <div className="font-[family-name:var(--font-brand)] text-white/20 text-[10px] uppercase tracking-[0.5em]">Press play</div>
          </div>
        </div>
      )}

      {!needsTap && (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="bg-gradient-to-t from-black/80 to-transparent pt-16 pb-4 px-5">
            <div className="mb-3">
              <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-200"
                  style={{ width: `${currentChapter ? ((audioProgress - currentChapter.startTime) / currentChapter.duration) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-[family-name:var(--font-brand)] text-white/60 text-[10px] uppercase tracking-wider">
                  #{currentTrack?.num} {currentTrack?.title}
                </div>
                <div className="font-[family-name:var(--font-brand)] text-white/20 text-[9px] uppercase tracking-wider">
                  {album.title}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {currentTrack?.bSide && (
                  <button
                    onClick={() => setPlayingBSide(!playingBSide)}
                    className="font-[family-name:var(--font-brand)] text-white/20 hover:text-red-500/60 text-[10px] uppercase tracking-wider"
                  >
                    {playingBSide ? 'A' : 'B'}
                  </button>
                )}
                <a href={`/listen/${album.slug}`} className="font-[family-name:var(--font-brand)] text-white/20 hover:text-red-500/60 text-[10px] uppercase tracking-wider">
                  Exit
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
