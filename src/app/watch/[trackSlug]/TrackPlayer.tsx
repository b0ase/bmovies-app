'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMusic } from '@/hooks/MusicProvider'
import type { Album, Track } from '@/lib/albums'
import { cdnUrl } from '@/lib/cdn'

type Rating = 'SFW' | 'X' | 'XX' | 'XXX'
interface VideoClip { url: string; width: number; height: number; rating: Rating }
interface SegmentClip { url: string; width: number; height: number; segment: number; type: 'main' | 'title' }

type StrobeMode = 'off' | 'start' | 'mid' | 'end' | 'stagger'

interface FX {
  seek: boolean
  glitch: boolean
  rgbShift: boolean
  strobe: boolean
  strobeMode: StrobeMode
  speed: boolean
  static: boolean
}

const DEFAULT_FX: FX = { seek: true, glitch: true, rgbShift: true, strobe: true, strobeMode: 'stagger', speed: true, static: false }
const POOL_SIZE = 3 // keep small for mobile compatibility

interface TitleVideoManifest {
  track: string
  titleSegments?: number[]
  titleVideos: Array<{ uuid: string; video: string; width: number; height: number; orientation: string }>
}

interface ColourGrade {
  track: string
  palette: string
  fxColors: number[][]
}

const isMobile = () => typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))

interface PoolEntry {
  video: HTMLVideoElement
  clipIdx: number
  ready: boolean
}

function createPoolEntry(): PoolEntry {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.loop = false
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  return { video, clipIdx: -1, ready: false }
}

function loadIntoSlot(slot: PoolEntry, clips: VideoClip[], clipIdx: number) {
  if (clips.length === 0) return
  const idx = ((clipIdx % clips.length) + clips.length) % clips.length
  slot.clipIdx = idx
  slot.ready = false
  slot.video.src = clips[idx].url
  slot.video.load()
  slot.video.onloadeddata = () => {
    slot.ready = true
    slot.video.play().catch(() => {})
  }
  // When clip ends, restart it so canvas always has a frame
  slot.video.onended = () => { slot.video.currentTime = 0; slot.video.play().catch(() => {}) }
  slot.video.onerror = () => {
    slot.ready = false
  }
}

interface TrackPlayerProps {
  album: Album
  track: Track
  trackSlug?: string
  prevSlug?: string
  nextSlug?: string
}

export default function TrackPlayer({ album, track, trackSlug, prevSlug, nextSlug }: TrackPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const [allVideos, setAllVideos] = useState<VideoClip[]>([])
  const [videos, setVideos] = useState<VideoClip[]>([])
  const [titleVideos, setTitleVideos] = useState<VideoClip[]>([])
  const [chorusMode, setChorusMode] = useState(false)
  const titleSegmentsRef = useRef<number[]>([])
  const videosRef = useRef<VideoClip[]>([])
  const [editMode, setEditMode] = useState(true) // true = edited music video, false = VJ chaos mode
  const editTimelineRef = useRef<SegmentClip[]>([])
  const editSegmentRef = useRef(-1) // currently playing segment in edit mode
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const [rating, setRating] = useState<Rating>('SFW')
  const [needsTap, setNeedsTap] = useState(true)
  const [titleClipUrl, setTitleClipUrl] = useState(cdnUrl(`title-clips/${trackSlug}.mp4`))
  const [hasPaid, setHasPaid] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(true)
  const [looping, setLooping] = useState(true)
  const mobileRef = useRef(false)
  const startedRef = useRef(false)
  const playStartRef = useRef(0)

  const poolRef = useRef<PoolEntry[]>([])
  const activeSlotRef = useRef(0)
  const playlistPosRef = useRef(0)

  const { pause: pauseGlobal } = useMusic()
  // Own dedicated audio element — MusicProvider's shared one fights with other components
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const play = useCallback(() => {
    const audio = musicAudioRef.current
    if (audio) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }, [])

  const pause = useCallback(() => {
    const audio = musicAudioRef.current
    if (audio) {
      audio.pause()
      setIsPlaying(false)
    }
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) pause(); else play()
  }, [isPlaying, play, pause])

  // Payment gate disabled — all content free for now
  useEffect(() => {
    setHasPaid(true)
    setCheckingPayment(false)
  }, [trackSlug])

  const handlePurchase = async () => {
    try {
      const res = await fetch('/api/auth/handcash/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 20, product: `watch-${trackSlug}`, description: `Music Video — ${track.title}` }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          document.cookie = `npgx_watch_${trackSlug}=owned; path=/; max-age=${365 * 24 * 60 * 60}`
          setHasPaid(true)
          return
        }
        if (data.redirectUrl) { window.location.href = data.redirectUrl; return }
      }
    } catch {}
    // Fallback demo
    localStorage.setItem(`npgx-watch-${trackSlug}`, 'paid')
    document.cookie = `npgx_watch_${trackSlug}=owned; path=/; max-age=${365 * 24 * 60 * 60}`
    setHasPaid(true)
  }

  // Create dedicated audio element on mount
  useEffect(() => {
    pauseGlobal() // stop MusicProvider's audio so it doesn't compete
    const audio = new Audio()
    audio.loop = true
    audio.volume = 1
    audio.preload = 'auto'
    musicAudioRef.current = audio

    if (track.aSide) {
      audio.src = track.aSide
      audio.load()

      // Don't autoplay — wait for user to click play button
    }

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [track.aSide]) // eslint-disable-line react-hooks/exhaustive-deps
  const bassAvgRef = useRef(0)
  const beatPulseRef = useRef(0)

  // Rotating color palette — shifts on beat hits and over time
  const FX_COLORS = useRef([
    [220, 20, 60],   // crimson
    [0, 200, 255],   // cyan
    [255, 0, 180],   // magenta
    [120, 0, 255],   // purple
    [255, 120, 0],   // orange
    [0, 255, 120],   // green
    [255, 255, 0],   // yellow
    [255, 50, 50],   // red
  ]).current
  const fxColorIdx = useRef(0)
  const lastColorChange = useRef(0)
  const getFxColor = useCallback((alpha: number) => {
    const c = FX_COLORS[fxColorIdx.current % FX_COLORS.length]
    return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`
  }, [FX_COLORS])
  const advanceFxColor = useCallback(() => {
    const now = Date.now()
    if (now - lastColorChange.current > 2000) { // min 2s between color shifts
      lastColorChange.current = now
      fxColorIdx.current = (fxColorIdx.current + 1) % FX_COLORS.length
    }
  }, [FX_COLORS])

  const [trackEnded, setTrackEnded] = useState(false)
  const trackEndedRef = useRef(false)

  // Audio source is set in the dedicated audio element useEffect above

  const EDIT_FX: FX = { seek: false, glitch: false, rgbShift: false, strobe: true, strobeMode: 'stagger', speed: false, static: false }
  const [fx, setFx] = useState<FX>(DEFAULT_FX)
  const fxRef = useRef<FX>(DEFAULT_FX)
  const [chaos, setChaos] = useState(true)

  // When toggling edit mode, set appropriate defaults
  useEffect(() => {
    if (editMode) {
      setChaos(false)
      setFx(EDIT_FX)
    } else {
      setChaos(true)
      setFx(DEFAULT_FX)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])
  const [jumpSpeed, setJumpSpeed] = useState(250)
  const jumpSpeedRef = useRef(250)
  const [glitchIntensity, setGlitchIntensity] = useState(60)
  const glitchIntensityRef = useRef(60)

  useEffect(() => { fxRef.current = fx }, [fx])
  useEffect(() => { jumpSpeedRef.current = jumpSpeed }, [jumpSpeed])
  useEffect(() => { glitchIntensityRef.current = glitchIntensity }, [glitchIntensity])

  const [cursorVisible, setCursorVisible] = useState(true)
  const cursorTimer = useRef<ReturnType<typeof setTimeout>>()

  const TITLE_CARDS = [
    cdnUrl('landing-page-videos/TITLE_VIDEO.mp4'),
    cdnUrl('landing-page-videos/title-2.mp4'),
    cdnUrl('landing-page-videos/title-3.mp4'),
    cdnUrl('landing-page-videos/title-4.mp4'),
    cdnUrl('landing-page-videos/title-5.mp4'),
  ]
  const [titleIdx, setTitleIdx] = useState(0)
  useEffect(() => { setTitleIdx(Math.floor(Math.random() * TITLE_CARDS.length)) }, [])

  useEffect(() => { videosRef.current = videos }, [videos])
  useEffect(() => { mobileRef.current = isMobile() }, [])

  useEffect(() => {
    if (!musicAudioRef.current || audioCtxRef.current) return
    const trySetup = () => {
      if (audioCtxRef.current) return
      try {
        const audio = musicAudioRef.current
        if (!audio) return
        const ctx = new AudioContext()
        const source = ctx.createMediaElementSource(audio)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.4
        source.connect(analyser); analyser.connect(ctx.destination)
        audioCtxRef.current = ctx; analyserRef.current = analyser
      } catch {}
    }
    trySetup()
    if (!audioCtxRef.current) {
      const retry = () => trySetup()
      window.addEventListener('click', retry, { once: true })
      window.addEventListener('touchstart', retry, { once: true })
      return () => { window.removeEventListener('click', retry); window.removeEventListener('touchstart', retry) }
    }
  }, [musicAudioRef])

  // Sync loop state to audio element
  useEffect(() => {
    const audio = musicAudioRef.current
    if (audio) audio.loop = looping
  }, [looping])

  // Detect track end — stop everything and show end screen (only fires when loop is off)
  useEffect(() => {
    const audio = musicAudioRef.current
    if (!audio) return
    const onEnded = () => {
      if (looping) return // shouldn't fire when looping, but guard anyway
      trackEndedRef.current = true
      setTrackEnded(true)
      pause()
      for (const entry of poolRef.current) {
        entry.video.pause()
      }
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [musicAudioRef, pause])

  useEffect(() => {
    const show = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (cursorTimer.current) clearTimeout(cursorTimer.current)
      setShowControls(true); setCursorVisible(true)
      hideTimer.current = setTimeout(() => setShowControls(false), 3000)
      cursorTimer.current = setTimeout(() => setCursorVisible(false), 1000)
    }
    show()
    window.addEventListener('mousemove', show)
    window.addEventListener('touchstart', show)
    return () => {
      window.removeEventListener('mousemove', show)
      window.removeEventListener('touchstart', show)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (cursorTimer.current) clearTimeout(cursorTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!chaos || editMode) return
    const id = setInterval(() => {
      setFx({
        seek: Math.random() < 0.8,
        glitch: Math.random() < 0.7,
        rgbShift: Math.random() < 0.6,
        strobe: Math.random() < 0.3,
        strobeMode: (['start', 'mid', 'end', 'stagger'] as StrobeMode[])[Math.floor(Math.random() * 4)],
        speed: Math.random() < 0.5,
        static: Math.random() < 0.3,
      })
      setJumpSpeed(100 + Math.random() * 500)
      setGlitchIntensity(20 + Math.random() * 80)
    }, 3000)
    return () => clearInterval(id)
  }, [chaos, editMode])

  // Load all clips from local directory via API
  useEffect(() => {
    if (!trackSlug) return
    let isMounted = true
    const load = async () => {
      try {
        const res = await fetch(`/api/music-video-clips?track=${trackSlug}`)
        if (!res.ok || !isMounted) return
        const { clips } = await res.json() as { clips: string[] }
        // Separate by type — keep in sorted order (sequential playback)
        const titles = clips.filter(c => c.includes('-titles-')).sort()
        const scenes = clips.filter(c => c.includes('-scenes-') || c.includes('-scene-')).sort()
        const lyrics = clips.filter(c => c.includes('-lyrics-')).sort()
        const xx = clips.filter(c => c.includes('-xx-')).sort()
        const rest = clips.filter(c => !c.includes('-titles-') && !c.includes('-scenes-') && !c.includes('-scene-') && !c.includes('-lyrics-') && !c.includes('-xx-')).sort()

        // Sequential playback: scenes → lyrics → rest (no XX unless rated)
        // Titles excluded from playback — only used on play screen
        const includeXX = rating === 'XX' || rating === 'XXX'
        const ordered = [...scenes, ...lyrics, ...rest, ...(includeXX ? xx : [])]
        const vids: VideoClip[] = ordered.map(url => ({ url, width: 720, height: 1280, rating: 'SFW' as Rating }))
        setAllVideos(vids)
        setVideos(vids)
        // Set title clip for play screen (not in playback sequence)
        if (titles.length > 0) setTitleClipUrl(titles[0])
      } catch (e) {
        console.error('Failed to load clips:', e)
      }
    }
    load()
    return () => { isMounted = false }
  }, [trackSlug, rating])

  // Load colour grade if available
  useEffect(() => {
    if (!trackSlug) return
    fetch(`/music-videos/${trackSlug}-1/colour-grade.json`)
      .then(r => r.ok ? r.json() : null)
      .then((grade: ColourGrade | null) => {
        if (grade?.fxColors?.length) {
          FX_COLORS.length = 0
          grade.fxColors.forEach(c => FX_COLORS.push(c))
        }
      })
      .catch(() => {})
  }, [trackSlug, FX_COLORS])

  // Init pool when videos are loaded
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

  const getActiveVideo = useCallback((): HTMLVideoElement | null => {
    const pool = poolRef.current
    if (pool.length === 0) return null
    return pool[activeSlotRef.current]?.video || null
  }, [])

  const strobeCycleRef = useRef(0) // for stagger mode: cycles through start/mid/end

  const advanceForward = useCallback(() => {
    const pool = poolRef.current
    const clips = videosRef.current
    if (pool.length === 0 || clips.length === 0) return

    // Find a ready slot to switch to (not the current one)
    const nextSlot = (activeSlotRef.current + 1) % pool.length
    if (!pool[nextSlot].ready) return // don't switch if next clip isn't loaded yet

    const oldSlot = activeSlotRef.current
    activeSlotRef.current = nextSlot
    playlistPosRef.current++

    const video = pool[nextSlot].video
    const duration = video.duration || 5

    // Seek based on strobe mode
    const mode = fxRef.current.strobeMode
    if (mode === 'start') {
      video.currentTime = 0
    } else if (mode === 'mid') {
      video.currentTime = duration * 0.4 + Math.random() * duration * 0.2
    } else if (mode === 'end') {
      video.currentTime = Math.max(0, duration - 1.5 + Math.random() * 0.5)
    } else if (mode === 'stagger') {
      // Cycle: start → mid → end → mid → start...
      const positions = [0, 0.4, 0.8, 0.5, 0.1, 0.7, 0.3, 0.9]
      const pos = positions[strobeCycleRef.current % positions.length]
      video.currentTime = duration * pos
      strobeCycleRef.current++
    } else {
      video.currentTime = 0
    }

    video.play().catch(() => {})

    // Preload next clip into the slot we just left
    const futureIdx = playlistPosRef.current + pool.length - 1
    loadIntoSlot(pool[oldSlot], clips, futureIdx)
  }, [])

  const jumpToRandomSlot = useCallback(() => {
    const pool = poolRef.current
    if (pool.length <= 1) return
    const candidates = pool
      .map((p, i) => ({ i, ready: p.ready }))
      .filter(c => c.i !== activeSlotRef.current && c.ready)
    if (candidates.length === 0) return
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    activeSlotRef.current = pick.i
    if (fxRef.current.speed) {
      pool[pick.i].video.playbackRate = 0.5 + Math.random() * 2.5
    }
  }, [])

  useEffect(() => {
    const video = getActiveVideo()
    if (!video) return
    video.playbackRate = fx.speed ? (0.5 + Math.random() * 2.5) : 1
  }, [fx.speed, getActiveVideo])

  // Beat-synced clip switching — triggered from render loop, with fallback timer
  const lastClipSwitch = useRef(0)
  const beatSwitchRef = useRef(false) // set true in render loop on strong beat

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const freqData = new Uint8Array(128)

    const render = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { animRef.current = requestAnimationFrame(render); return }

      const mobile = mobileRef.current
      const dpr = mobile ? 1 : (window.devicePixelRatio > 1 ? 2 : 1)
      const cw = canvas.clientWidth * dpr
      const ch = canvas.clientHeight * dpr
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch }

      // If track ended, just draw black and bail
      if (trackEndedRef.current) {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, cw, ch)
        animRef.current = requestAnimationFrame(render)
        return
      }

      const ef = fxRef.current
      const pool = poolRef.current
      const video = pool.length > 0 ? pool[activeSlotRef.current]?.video : null

      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData)
        let bass = 0
        for (let i = 0; i < 6; i++) bass += freqData[i]
        bass /= 6
        bassAvgRef.current = bassAvgRef.current * 0.92 + bass * 0.08

        // Detect vocals (mid-high frequencies 20-50) for "TOKYO GUTTER QUEEN" drop
        let vocals = 0
        for (let i = 20; i < 50; i++) vocals += freqData[i]
        vocals /= 30

        // Beat-reactive color shifts + beat-synced cuts
        if (bass > bassAvgRef.current * 1.4 && bass > 80) {
          beatPulseRef.current = Math.min(1, beatPulseRef.current + 0.6)
          advanceFxColor()

          // Intro phase — slow uncut titles for first 15 seconds
          const elapsed = (Date.now() - playStartRef.current) / 1000
          const introPhase = playStartRef.current > 0 && elapsed < 15

          if (!introPhase) {
            // Cut on beat — minimum gap depends on strobe mode
            const now = Date.now()
            const mode = fxRef.current.strobeMode
            const minGap = mode === 'off' ? 800 : 150
            if (now - lastClipSwitch.current > minGap) {
              const threshold = mode === 'off' ? 140 : 100
              if (bass > threshold) {
                lastClipSwitch.current = now
                advanceForward()
              }
            }
          }
        }
        beatPulseRef.current *= 0.92
      } else {
        beatPulseRef.current *= 0.95
      }

      // Fallback timer — slow during intro, fast after
      const elapsed = (Date.now() - playStartRef.current) / 1000
      const introPhase = playStartRef.current > 0 && elapsed < 15
      const now = Date.now()
      const mode = fxRef.current.strobeMode
      const fallback = introPhase ? 5000 : mode === 'off' ? 3000 : 500
      if (now - lastClipSwitch.current > fallback) {
        lastClipSwitch.current = now
        advanceForward()
      }
      const bp = beatPulseRef.current

      const videoReady = video && video.readyState >= 2

      if (video && video.readyState >= 1) {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, cw, ch)
        const vw = video.videoWidth || 1, vh = video.videoHeight || 1
        const videoAspect = vw / vh
        const canvasAspect = cw / ch
        // Always scale to fill — crop edges rather than showing blurred bg + small fg
        const scale = Math.max(cw / vw, ch / vh)
        ctx.drawImage(video, (cw - vw * scale) / 2, (ch - vh * scale) / 2, vw * scale, vh * scale)

        if (!mobile) {
          if (ef.rgbShift) {
            const imageData = ctx.getImageData(0, 0, cw, ch)
            const data = imageData.data
            const shift = Math.sin(Date.now() / 100) * 10
            for (let i = 0; i < data.length; i += 4) {
              const si = i + Math.floor(shift) * 4
              if (si >= 0 && si < data.length) {
                data[i] = data[si + 1]
              }
            }
            ctx.putImageData(imageData, 0, 0)
          }

          if (ef.glitch && Math.random() < 0.04) {
            const gi = glitchIntensityRef.current
            const numTears = 1 + (Math.random() < gi / 80 ? 1 : 0)
            for (let t = 0; t < numTears; t++) {
              const y = Math.floor(Math.random() * ch)
              const h = Math.floor(1 + Math.random() * 4) * dpr
              const shift = Math.floor((Math.random() - 0.5) * gi * 0.6)
              const stripH = Math.min(h, ch - y)
              if (stripH > 0) {
                const strip = ctx.getImageData(0, y, cw, stripH)
                ctx.putImageData(strip, shift, y)
                if (Math.random() < 0.15) {
                  ctx.fillStyle = getFxColor(0.02 + Math.random() * 0.05)
                  ctx.fillRect(shift, y, cw, h)
                }
              }
            }
            if (Math.random() < gi / 2000) {
              const slipY = Math.floor(Math.random() * ch * 0.6)
              const slipH = Math.floor(ch * (0.05 + Math.random() * 0.1))
              const slipShift = Math.floor((Math.random() - 0.5) * cw * 0.15)
              const slipData = ctx.getImageData(0, slipY, cw, Math.min(slipH, ch - slipY))
              ctx.putImageData(slipData, slipShift, slipY)
            }
          }
        } else {
          if (ef.rgbShift && Math.random() < 0.1) {
            ctx.fillStyle = getFxColor(0.03 + Math.random() * 0.05)
            ctx.fillRect(0, 0, cw, ch)
          }
          if (ef.glitch && Math.random() < 0.03) {
            const y = Math.random() * ch
            ctx.fillStyle = getFxColor(0.1 + Math.random() * 0.15)
            ctx.fillRect(0, y, cw, 2 + Math.random() * 6)
          }
        }

        if (ef.static) {
          const numScratches = mobile ? 1 : (2 + Math.floor(Math.random() * 4))
          for (let s = 0; s < numScratches; s++) {
            const x = Math.random() * cw
            ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.15})`
            ctx.lineWidth = Math.random() < 0.7 ? 1 : 2
            ctx.beginPath()
            ctx.moveTo(x + (Math.random() - 0.5) * 3, 0)
            ctx.lineTo(x + (Math.random() - 0.5) * 5, ch)
            ctx.stroke()
          }
          if (Math.random() < 0.3) {
            const y = Math.random() * ch
            ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.06})`
            ctx.fillRect(0, y, cw, 1 + Math.random() * 3)
          }
          if (!mobile) {
            for (let g = 0; g < 30; g++) {
              const gx = Math.random() * cw
              const gy = Math.random() * ch
              const v = 180 + Math.random() * 75
              ctx.fillStyle = `rgba(${v},${v},${v},${0.02 + Math.random() * 0.04})`
              ctx.fillRect(gx, gy, 1 + Math.random() * 2, 1 + Math.random() * 2)
            }
          }
        }

        if (ef.strobe && (bp > 0.5 || Math.random() < 0.05)) {
          ctx.fillStyle = getFxColor(bp > 0.5 ? bp * 0.4 : 0.15)
          ctx.fillRect(0, 0, cw, ch)
        }

        if (!mobile) {
          if (videoReady && !video.seeking) {
            if (!bufferRef.current) bufferRef.current = document.createElement('canvas')
            const buf = bufferRef.current
            if (buf.width !== cw || buf.height !== ch) { buf.width = cw; buf.height = ch }
            if (cw > 0 && ch > 0) buf.getContext('2d')?.drawImage(canvas, 0, 0)
          }
        }
      } else if (!mobile && bufferRef.current) {
        ctx.drawImage(bufferRef.current, 0, 0, cw, ch)
      }

      // Vignette
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.3, cw / 2, ch / 2, cw * 0.85)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.35)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, cw, ch)

      if (bp > 0.05) {
        ctx.fillStyle = getFxColor(bp * 0.5)
        ctx.fillRect(0, ch - 2, cw * bp, 2)
      }

      // Fade to black at end of track
      const audio = musicAudioRef.current
      if (audio && audio.duration > 0) {
        const remaining = audio.duration - audio.currentTime
        if (remaining < 3) {
          const fadeAlpha = 1 - (remaining / 3)
          ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`
          ctx.fillRect(0, 0, cw, ch)
        }
        // Stop video switching after track ends
        if (remaining <= 0) {
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, cw, ch)
        }
      }

      animRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [videos, jumpToRandomSlot])

  const [videoPaused, setVideoPaused] = useState(false)
  const videoPausedRef = useRef(false)
  useEffect(() => { videoPausedRef.current = videoPaused }, [videoPaused])

  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      const video = getActiveVideo()
      if (video && video.duration) {
        setVideoProgress(video.currentTime)
        setVideoDuration(video.duration)
      }
    }, 250)
    return () => clearInterval(id)
  }, [getActiveVideo])

  const [volume, setVolume] = useState(1)
  useEffect(() => {
    if (musicAudioRef.current) musicAudioRef.current.volume = volume
  }, [volume, musicAudioRef])

  const toggleVideo = useCallback(() => {
    const paused = !videoPausedRef.current
    setVideoPaused(paused)
    for (const entry of poolRef.current) {
      if (paused) entry.video.pause()
      else entry.video.play().catch(() => {})
    }
  }, [])

  const advanceBackward = useCallback(() => {
    const pool = poolRef.current
    const clips = videosRef.current
    if (pool.length === 0 || clips.length === 0) return
    activeSlotRef.current = (activeSlotRef.current - 1 + pool.length) % pool.length
    playlistPosRef.current = Math.max(0, playlistPosRef.current - 1)
    const video = pool[activeSlotRef.current].video
    if (video.src) video.play().catch(() => {})
  }, [])

  const seekTo = useCallback((time: number) => {
    const video = getActiveVideo()
    if (video?.duration) video.currentTime = time
  }, [getActiveVideo])

  const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
    if (speed !== 1) setChaos(false)
    setFx(prev => ({ ...prev, speed: false }))
    for (const entry of poolRef.current) {
      entry.video.playbackRate = speed
    }
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    return () => {
      for (const entry of poolRef.current) {
        entry.video.pause()
        entry.video.src = ''
      }
    }
  }, [])

  const toggleFx = (key: keyof FX) => {
    setChaos(false)
    setFx(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleStart = () => {
    if (startedRef.current) return
    startedRef.current = true
    playStartRef.current = Date.now()

    // Must play audio directly in click handler for mobile
    let audio = musicAudioRef.current
    if (!audio) {
      // Audio element not created yet — create inline so play() is in click stack
      audio = new Audio()
      audio.loop = true
      audio.volume = 1
      musicAudioRef.current = audio
    }
    if (track.aSide && (!audio.src || !audio.src.includes(track.aSide))) {
      audio.src = track.aSide
    }
    audio.play().then(() => setIsPlaying(true)).catch(() => {})

    for (const entry of poolRef.current) {
      if (entry.video.src) entry.video.play().catch(() => {})
    }
    setNeedsTap(false)
  }

  const RATINGS: Rating[] = ['SFW', 'X', 'XX', 'XXX']
  const FX_BUTTONS: { key: keyof FX; label: string }[] = [
    { key: 'seek', label: 'Cut' },
    { key: 'glitch', label: 'Glitch' },
    { key: 'rgbShift', label: 'RGB' },
    { key: 'strobe', label: 'Flash' },
    { key: 'speed', label: 'Speed' },
    { key: 'static', label: 'Static' },
  ]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      style={{ zIndex: 200, cursor: cursorVisible ? 'default' : 'none' }}
      onClick={toggle}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Prev/Next track arrows — match play button style */}
      {prevSlug && (
        <a href={`/watch/${prevSlug}`} onClick={e => e.stopPropagation()}
          className={`absolute left-6 top-1/2 -translate-y-1/2 z-[60] group transition-all ${
            needsTap ? 'opacity-100' : showControls ? 'opacity-80' : 'opacity-0 pointer-events-none'
          }`}
          title="Previous track">
          <div className="group-hover:scale-110 transition-transform duration-300">
            <svg viewBox="0 0 40 46" className="w-10 h-12 drop-shadow-[0_0_20px_rgba(220,20,60,0.4)]" style={{ transform: 'rotate(180deg)' }}>
              <polygon points="4,0 40,23 4,46" fill="#dc2626" />
            </svg>
          </div>
        </a>
      )}
      {nextSlug && (
        <a href={`/watch/${nextSlug}`} onClick={e => e.stopPropagation()}
          className={`absolute right-6 top-1/2 -translate-y-1/2 z-[60] group transition-all ${
            needsTap ? 'opacity-100' : showControls ? 'opacity-80' : 'opacity-0 pointer-events-none'
          }`}
          title="Next track">
          <div className="group-hover:scale-110 transition-transform duration-300">
            <svg viewBox="0 0 40 46" className="w-10 h-12 drop-shadow-[0_0_20px_rgba(220,20,60,0.4)]">
              <polygon points="4,0 40,23 4,46" fill="#dc2626" />
            </svg>
          </div>
        </a>
      )}

      {/* NPGX logo slug — always on, screened like MTV */}
      {!mobileRef.current && (
        <video
          key={titleIdx}
          src={TITLE_CARDS[titleIdx]}
          autoPlay muted playsInline
          className="absolute top-4 left-4 w-44 pointer-events-none select-none"
          style={{ mixBlendMode: 'screen', mask: 'radial-gradient(ellipse at center, black 40%, transparent 75%)', opacity: 0.85 }}
          onEnded={() => setTitleIdx(Math.floor(Math.random() * TITLE_CARDS.length))}
        />
      )}

      {/* Track title slug — always on, bottom-left, music TV style */}
      {!trackEnded && (
        <div className="absolute bottom-24 left-5 z-20 pointer-events-none select-none" style={{ opacity: 0.7 }}>
          <div className="font-[family-name:var(--font-brand)] text-white text-xl md:text-2xl uppercase tracking-[0.15em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {track.title}
          </div>
          {track.japanese && (
            <div className="font-[family-name:var(--font-brand)] text-white/50 text-xs md:text-sm tracking-[0.2em] mt-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              {track.japanese}
            </div>
          )}
          <div className="font-[family-name:var(--font-brand)] text-red-500/40 text-[9px] uppercase tracking-[0.4em] mt-1">
            {album.title}
          </div>
        </div>
      )}

      {needsTap && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center cursor-pointer"
          onClick={e => { e.stopPropagation(); if (hasPaid) handleStart() }}
        >
          {/* Title clip looping as preview */}
          <video
            className="absolute inset-0 w-full h-full object-cover bg-black"
            autoPlay muted loop playsInline
            poster={`/og/${trackSlug}.png`}
            src={titleClipUrl}
            onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-black/40" />

          {hasPaid ? (
            /* Paid — show play button */
            <div className="relative z-10 text-center group">
              <div className="font-[family-name:var(--font-brand)] text-white/30 text-xs uppercase tracking-[0.5em] mb-2">NPGX</div>
              <div className="font-[family-name:var(--font-brand)] text-white text-2xl md:text-4xl uppercase tracking-[0.2em] mb-1 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">{track.title}</div>
              {track.japanese && (
                <div className="font-[family-name:var(--font-brand)] text-white/40 text-sm tracking-[0.3em] mb-8">{track.japanese}</div>
              )}
              <div className="flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 40 46" className="w-16 h-20 drop-shadow-[0_0_30px_rgba(220,20,60,0.5)]">
                  <polygon points="4,0 40,23 4,46" fill="#dc2626" />
                </svg>
              </div>
              <div className="font-[family-name:var(--font-brand)] text-white/20 text-[10px] uppercase tracking-[0.5em]">Play</div>
            </div>
          ) : (
            /* Not paid — show $20 paywall */
            <div className="relative z-10 text-center max-w-md mx-auto px-6">
              <div className="font-[family-name:var(--font-brand)] text-white/30 text-xs uppercase tracking-[0.5em] mb-2">NPGX</div>
              <div className="font-[family-name:var(--font-brand)] text-white text-2xl md:text-4xl uppercase tracking-[0.2em] mb-1 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">{track.title}</div>
              {track.japanese && (
                <div className="font-[family-name:var(--font-brand)] text-white/40 text-sm tracking-[0.3em] mb-4">{track.japanese}</div>
              )}
              <div className="border border-red-500/30 bg-black/60 backdrop-blur-sm p-5 mb-4 rounded-lg">
                <div className="font-[family-name:var(--font-brand)] text-xs text-red-400 uppercase tracking-widest mb-2">Buy $WATCH Token</div>
                <div className="font-[family-name:var(--font-brand)] text-3xl text-white mb-1">$20</div>
                <div className="text-white/40 text-[10px] mb-3">Token purchase • Early buyers get more tokens</div>
                <button onClick={(e) => { e.stopPropagation(); handlePurchase() }}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all rounded-lg">
                  Pay with HandCash — $20
                </button>
                <div className="text-white/15 text-[8px] mt-2">$402 protocol • Minted on Bitcoin • Tradeable</div>
              </div>
              <a href="/music-videos" onClick={e => e.stopPropagation()}
                className="text-white/30 hover:text-white/60 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">
                ← Back
              </a>
            </div>
          )}
        </div>
      )}

      {/* End screen */}
      {trackEnded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="font-[family-name:var(--font-brand)] text-white/15 text-[10px] uppercase tracking-[0.5em] mb-6">
              {album.title}
            </div>
            <div className="font-[family-name:var(--font-brand)] text-3xl md:text-5xl text-white uppercase tracking-[0.2em] mb-3">
              {track.title}
            </div>
            {track.japanese && (
              <div className="font-[family-name:var(--font-brand)] text-white/30 text-lg md:text-xl mb-10">
                {track.japanese}
              </div>
            )}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  trackEndedRef.current = false
                  setTrackEnded(false)
                  setVideoPaused(false)
                  if (track.aSide) {
                    const audio = musicAudioRef.current
                    if (audio) {
                      audio.currentTime = 0
                      audio.play().then(() => setIsPlaying(true)).catch(() => {})
                    }
                  }
                  for (const entry of poolRef.current) {
                    entry.video.play().catch(() => {})
                  }
                }}
                className="group flex items-center gap-3 px-6 py-3 border-2 border-red-500/40 hover:border-red-400 bg-red-600/10 hover:bg-red-600/20 transition-all"
                style={{ transform: 'skewX(-12deg)' }}
              >
                <span style={{ transform: 'skewX(12deg)' }} className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-red-400 group-hover:text-red-300">
                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                  </svg>
                  <span className="font-[family-name:var(--font-brand)] text-white/70 group-hover:text-white text-sm uppercase tracking-wider">
                    Replay
                  </span>
                </span>
              </button>
              {nextSlug && (
                <a
                  href={`/watch/${nextSlug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="group flex items-center gap-3 px-6 py-3 border-2 border-white/10 hover:border-red-500/30 bg-white/5 hover:bg-white/10 transition-all"
                  style={{ transform: 'skewX(-12deg)' }}
                >
                  <span style={{ transform: 'skewX(12deg)' }} className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white/40 group-hover:text-red-300">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                    <span className="font-[family-name:var(--font-brand)] text-white/50 group-hover:text-white text-sm uppercase tracking-wider">
                      Next
                    </span>
                  </span>
                </a>
              )}
            </div>
            <div className="font-[family-name:var(--font-brand)] text-white/8 text-[10px] uppercase tracking-[0.5em] mt-12">
              NPGX
            </div>
          </div>
        </div>
      )}

      <div
        className="absolute inset-x-0 bottom-0 z-10 transition-opacity duration-700"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-24 pb-5 px-5">
          <div className="mb-3 group relative">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-200 rounded-full"
                style={{ width: `${videoDuration ? (videoProgress / videoDuration) * 100 : 0}%` }}
              />
            </div>
            <input
              type="range" min={0} max={videoDuration || 1} step={0.1} value={videoProgress}
              onChange={e => seekTo(Number(e.target.value))}
              className="w-full h-1.5 opacity-0 cursor-pointer relative z-10"
            />
            <div className="flex justify-between mt-1">
              <span className="text-white/30 text-[9px] font-[family-name:var(--font-brand)] tabular-nums">
                {Math.floor(videoProgress / 60)}:{String(Math.floor(videoProgress % 60)).padStart(2, '0')}
              </span>
              <span className="text-white/20 text-[9px] font-[family-name:var(--font-brand)] tabular-nums">
                {Math.floor(videoDuration / 60)}:{String(Math.floor(videoDuration % 60)).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-white/20 text-[9px] font-[family-name:var(--font-brand)] uppercase tracking-wider mr-1">Video</span>
              <button
                onClick={() => advanceBackward()}
                className="w-8 h-8 flex items-center justify-center text-red-400/50 hover:text-red-300 hover:drop-shadow-[0_0_6px_rgba(220,20,60,0.6)] transition-all"
                title="Previous clip"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
              </button>
              <button
                onClick={toggleVideo}
                className="w-10 h-10 rounded-full bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 hover:border-red-400/60 flex items-center justify-center transition-all shadow-[0_0_12px_rgba(220,20,60,0.15)] hover:shadow-[0_0_20px_rgba(220,20,60,0.3)] hover:scale-105"
                title={videoPaused ? 'Play video' : 'Pause video'}
              >
                {videoPaused
                  ? <span className="w-0 h-0 border-t-[7px] border-b-[7px] border-l-[11px] border-transparent border-l-white ml-0.5" />
                  : <span className="w-3 h-3.5 border-l-[2.5px] border-r-[2.5px] border-white" />
                }
              </button>
              <button
                onClick={() => advanceForward()}
                className="w-8 h-8 flex items-center justify-center text-red-400/50 hover:text-red-300 hover:drop-shadow-[0_0_6px_rgba(220,20,60,0.6)] transition-all"
                title="Next clip"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              </button>

              <div className="h-5 w-px bg-white/10 mx-1" />
              <div className="flex items-center gap-0.5">
                {SPEED_STEPS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className="transition-all"
                    style={{ transform: 'skewX(-12deg)' }}
                  >
                    <span
                      className={`block px-1.5 py-0.5 text-[9px] font-[family-name:var(--font-brand)] uppercase border transition-all ${
                        playbackSpeed === s
                          ? 'bg-red-600/60 border-red-400/60 text-white shadow-[0_0_6px_rgba(220,20,60,0.4)]'
                          : 'bg-black/60 border-white/10 text-white/25 hover:text-white/60 hover:border-red-500/30'
                      }`}
                      style={{ transform: 'skewX(12deg)' }}
                    >
                      {s}x
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/20 text-[9px] font-[family-name:var(--font-brand)] uppercase tracking-wider mr-1">Audio</span>
              <button
                onClick={toggle}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
                  isPlaying
                    ? 'bg-red-600/20 border-red-500/30 shadow-[0_0_12px_rgba(220,20,60,0.3)] hover:bg-red-600/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                title={isPlaying ? 'Pause music' : 'Play music'}
              >
                {isPlaying
                  ? <span className="w-3 h-3 border-l-[2.5px] border-r-[2.5px] border-red-300" />
                  : <span className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[10px] border-transparent border-l-red-400/60 ml-0.5" />
                }
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setVolume(v => v > 0 ? 0 : 1)}
                  className="text-white/40 hover:text-red-300 transition-colors"
                  title={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    {volume === 0
                      ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    }
                  </svg>
                </button>
                <input
                  type="range" min={0} max={1} step={0.05} value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="w-16 h-1 accent-red-500 opacity-60"
                />
              </div>
              <div className="h-5 w-px bg-white/10 mx-1" />
              <button
                onClick={() => setLooping(l => !l)}
                className={`w-8 h-8 flex items-center justify-center rounded transition-all ${
                  looping
                    ? 'text-red-400 drop-shadow-[0_0_6px_rgba(220,20,60,0.5)]'
                    : 'text-white/25 hover:text-white/50'
                }`}
                title={looping ? 'Loop: on' : 'Loop: off'}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-3 flex-wrap justify-center">
            <button
              onClick={() => { setChaos(!chaos); if (!chaos) setFx(DEFAULT_FX) }}
              className={`font-[family-name:var(--font-brand)] text-[11px] uppercase tracking-wider px-3 py-1 border-2 transition-all ${
                chaos
                  ? 'bg-red-600/60 border-red-400 text-white shadow-[0_0_12px_rgba(220,20,60,0.5)] animate-pulsate-glow'
                  : 'bg-black/60 border-white/15 text-white/30 hover:text-white/60 hover:border-red-500/30'
              }`}
              style={{ transform: 'skewX(-12deg)' }}
            >
              <span style={{ transform: 'skewX(12deg)', display: 'block' }}>Chaos</span>
            </button>
            <div className="w-px h-5 bg-white/10" />
            {FX_BUTTONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleFx(key)}
                className={`font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-all ${
                  fx[key]
                    ? 'bg-white/10 border-red-400/40 text-red-300 shadow-[0_0_8px_rgba(220,20,60,0.25)]'
                    : 'bg-black/40 border-white/5 text-white/20 hover:text-white/40 hover:border-red-500/20'
                }`}
                style={{ transform: 'skewX(-12deg)' }}
              >
                <span style={{ transform: 'skewX(12deg)', display: 'block' }}>{label}</span>
              </button>
            ))}
            <div className="w-px h-5 bg-white/10" />
            <button
              onClick={() => {
                setChaos(false)
                const modes: StrobeMode[] = ['stagger', 'start', 'mid', 'end', 'off']
                const idx = modes.indexOf(fx.strobeMode)
                setFx(prev => ({ ...prev, strobeMode: modes[(idx + 1) % modes.length] }))
              }}
              className={`font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-all ${
                fx.strobeMode !== 'off'
                  ? 'bg-white/10 border-red-400/40 text-red-300 shadow-[0_0_8px_rgba(220,20,60,0.25)]'
                  : 'bg-black/40 border-white/5 text-white/20 hover:text-white/40 hover:border-red-500/20'
              }`}
              style={{ transform: 'skewX(-12deg)' }}
            >
              <span style={{ transform: 'skewX(12deg)', display: 'block' }}>
                {fx.strobeMode === 'off' ? 'Slow' : fx.strobeMode === 'stagger' ? 'Stagger' : fx.strobeMode === 'start' ? 'S:Start' : fx.strobeMode === 'mid' ? 'S:Mid' : 'S:End'}
              </span>
            </button>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-white/30 text-[9px] font-[family-name:var(--font-brand)] uppercase">Cut</span>
              <input
                type="range" min={50} max={1000} step={25} value={jumpSpeed}
                onChange={e => { setChaos(false); setJumpSpeed(Number(e.target.value)) }}
                className="w-20 h-1 accent-red-500 opacity-60"
              />
              <span className="text-white/20 text-[9px] font-[family-name:var(--font-brand)] tabular-nums">{jumpSpeed}ms</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              {RATINGS.map(r => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className="transition-all"
                  style={{ transform: 'skewX(-12deg)' }}
                >
                  <span
                    className={`block px-2 py-0.5 text-[10px] font-[family-name:var(--font-brand)] uppercase border-2 transition-all ${
                      rating === r
                        ? r === 'XXX'
                          ? 'bg-red-600/80 border-red-400 text-white shadow-[0_0_10px_rgba(220,20,60,0.5)]'
                          : 'bg-red-600/40 border-red-500/50 text-white shadow-[0_0_8px_rgba(220,20,60,0.3)]'
                        : 'bg-black/60 border-white/10 text-white/25 hover:text-white/50 hover:border-red-500/20'
                    }`}
                    style={{ transform: 'skewX(12deg)' }}
                  >
                    {r}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Edit/VJ mode toggle */}
              {editTimelineRef.current.length > 0 && (
                <button
                  onClick={() => { setEditMode(!editMode); editSegmentRef.current = -1 }}
                  className={`px-2 py-1 text-[9px] font-[family-name:var(--font-brand)] uppercase rounded transition-all ${
                    editMode
                      ? 'bg-green-600/80 border border-green-400 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                  }`}
                  title={editMode ? 'Edit mode — clips synced to song timeline' : 'VJ mode — random chaos mixing'}
                >
                  {editMode ? '▶ EDIT' : 'VJ'}
                </button>
              )}
              {!editMode && titleVideos.length > 0 && (
                <button
                  onClick={() => setChorusMode(!chorusMode)}
                  className={`px-2 py-1 text-[9px] font-[family-name:var(--font-brand)] uppercase rounded transition-all ${
                    chorusMode
                      ? 'bg-purple-600/80 border border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                  }`}
                  title="Toggle chorus mode — cut to title videos during chorus"
                >
                  {chorusMode ? '♪ CHORUS' : 'Chorus'}
                </button>
              )}
              <button
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-600/20 flex items-center justify-center transition-all hover:shadow-[0_0_10px_rgba(220,20,60,0.2)]"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-white/30 hover:text-red-300">
                  {isFullscreen
                    ? <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                    : <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  }
                </svg>
              </button>

              <a href="/watch" className="font-[family-name:var(--font-brand)] text-white/20 hover:text-red-400/60 text-[10px] uppercase tracking-wider transition-colors">
                Exit
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
