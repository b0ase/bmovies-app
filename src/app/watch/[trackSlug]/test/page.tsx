'use client'

import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { getLyrics, getLyricFrame, type TrackLyrics } from '@/lib/lyrics'
import { interpolateKeyframes, type LineKeyframe } from '@/lib/motion-graphics'
import type { Title3DLine, Title3DSettings, FontKey, LayerMode } from '@/components/Title3DScene'
import { FONT_REGISTRY } from '@/components/Title3DScene'
import { findTrackBySlug } from '@/lib/albums'

const Title3DScene = lazy(() => import('@/components/Title3DScene'))

/* ── Per-track CDN config ─────────────────────────── */

interface TrackTestConfig {
  cdn: string
  collection: string
  chorusKeyword?: string   // word(s) in whisper that trigger title-clip cuts
  lyricsKey: string        // key for getLyrics()
}

const TRACK_CONFIGS: Record<string, TrackTestConfig> = {
  'tokyo-gutter-queen': {
    cdn: 'https://api.b0ase.com/npg-assets/music-videos/tokyo-gutter-queen-1',
    collection: 'tokyo-gutter-queen',
    chorusKeyword: 'gutter queen',
    lyricsKey: '路地裏の叫び',
  },
  'razor-kisses': {
    cdn: 'https://api.b0ase.com/npg-assets/music-videos/razor-kisses-1',
    collection: 'razor-kisses',
    chorusKeyword: 'razor',
    lyricsKey: 'Razor Kisses',
  },
  // Add more tracks as CDN assets become available
}

/* ── Fallback config for tracks without CDN videos ── */
function getTrackConfig(slug: string): TrackTestConfig | null {
  return TRACK_CONFIGS[slug] || null
}

/* ── Types ──────────────────────────────────────────── */

interface VideoClip { url: string; width: number; height: number }
interface WhisperSegment { id: number; start: number; end: number; text: string }
type LyricAnimStyle = 'slam' | 'strobe' | 'glitch' | 'zoom' | 'shake' | 'minimal'

/* ── Keyframe builders ─────────────────────────────── */

const CX = 640

function kf(time: number, o: Partial<LineKeyframe> = {}): LineKeyframe {
  return { time, x: CX, y: 460, fontSize: 62, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, color: '#ffffff', ...o }
}

function buildLyricKeyframes(text: string, style: LyricAnimStyle, yPos: number = 460): LineKeyframe[] {
  const fontSize = text.length > 30 ? 38 : text.length > 18 ? 48 : 62
  const base = { fontSize, y: yPos, color: '#ffffff' }

  switch (style) {
    case 'slam':
      return [
        kf(0, { ...base, y: -150, opacity: 0 }),
        kf(0.01, { ...base, y: -150, opacity: 1 }),
        kf(0.06, { ...base, y: yPos + 25, easing: 'easeOut' }),
        kf(0.09, { ...base, easing: 'easeOut' }),
        kf(0.85, base),
        kf(0.87, { ...base, opacity: 0, easing: 'snap' }),
      ]
    case 'strobe': {
      const frames: LineKeyframe[] = [kf(0, { ...base, opacity: 0 })]
      for (let i = 0; i < 6; i++) frames.push(kf(0.02 + i * 0.02, { ...base, opacity: i % 2 === 0 ? 1 : 0, easing: 'snap' }))
      frames.push(kf(0.15, base), kf(0.5, base))
      frames.push(kf(0.52, { ...base, color: '#00ffff', scaleX: 1.1, easing: 'snap' }))
      frames.push(kf(0.54, { ...base, easing: 'snap' }), kf(0.85, base), kf(0.87, { ...base, opacity: 0, easing: 'snap' }))
      return frames
    }
    case 'glitch': {
      const frames: LineKeyframe[] = [kf(0, { ...base, opacity: 0, color: '#00ffff' })]
      for (let i = 0; i < 8; i++) {
        const s = Math.sin(i * 5.7 + 2.1), s2 = Math.cos(i * 3.3 + 1.7)
        frames.push(kf(0.02 + i * 0.015, { ...base, x: CX + s * 60, skewX: s2 * 25, scaleX: 1 + Math.abs(s) * 0.3, color: i % 2 === 0 ? '#ff0040' : '#00ffff', opacity: 1, easing: 'snap' }))
      }
      frames.push(kf(0.15, { ...base, x: CX, skewX: 0, scaleX: 1 }), kf(0.6, base))
      frames.push(kf(0.62, { ...base, color: '#ff0040', skewX: -15, x: CX - 40, easing: 'snap' }))
      frames.push(kf(0.64, { ...base, color: '#00ffff', skewX: 10, x: CX + 20, easing: 'snap' }))
      frames.push(kf(0.66, { ...base, skewX: 0, x: CX, easing: 'snap' }), kf(0.85, base))
      frames.push(kf(0.88, { ...base, opacity: 0, color: '#ff0040', easing: 'snap' }))
      return frames
    }
    case 'zoom':
      return [
        kf(0, { ...base, opacity: 0, scaleX: 5, scaleY: 5 }),
        kf(0.05, { ...base, scaleX: 1, scaleY: 1, easing: 'easeOut' }),
        kf(0.08, { ...base, scaleX: 1.05, easing: 'easeOut' }),
        kf(0.1, base), kf(0.85, base), kf(0.88, { ...base, opacity: 0, easing: 'snap' }),
      ]
    case 'shake': {
      const frames: LineKeyframe[] = [kf(0, { ...base, opacity: 0 }), kf(0.02, { ...base, easing: 'snap' })]
      for (let i = 0; i < 8; i++) {
        const seed = Math.sin(i * 7.3 + 0.5), seed2 = Math.cos(i * 11.1 + 0.3)
        frames.push(kf(0.04 + i * 0.02, { ...base, x: CX + seed * 30, y: yPos + seed2 * 18, rotation: seed * 4.5, easing: 'linear' }))
      }
      frames.push(kf(0.22, { ...base, x: CX, rotation: 0 }), kf(0.85, base), kf(0.87, { ...base, opacity: 0, easing: 'snap' }))
      return frames
    }
    default:
      return [kf(0, { ...base, opacity: 0, y: yPos + 5 }), kf(0.03, { ...base, easing: 'snap' }), kf(0.85, base), kf(0.87, { ...base, opacity: 0, easing: 'snap' })]
  }
}

function buildJapaneseKeyframes(style: LyricAnimStyle): LineKeyframe[] {
  return [
    kf(0, { fontSize: 32, y: 200, color: '#06b6d4', opacity: 0 }),
    kf(0.08, { fontSize: 32, y: 200, color: '#06b6d4', opacity: 0.7, easing: style === 'slam' ? 'easeOut' : 'snap' }),
    kf(0.8, { fontSize: 32, y: 200, color: '#06b6d4', opacity: 0.7 }),
    kf(0.85, { fontSize: 32, y: 200, color: '#06b6d4', opacity: 0, easing: 'snap' }),
  ]
}

/* ── Page ────────────────────────────────────────────── */

export default function TrackTestPage() {
  const params = useParams<{ trackSlug: string }>()
  const trackSlug = params.trackSlug
  const trackResult = findTrackBySlug(trackSlug)
  const config = getTrackConfig(trackSlug)

  // Video pool
  const [clips, setClips] = useState<VideoClip[]>([])
  const [titleClips, setTitleClips] = useState<VideoClip[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)
  const poolRef = useRef<HTMLVideoElement[]>([])
  const activePoolIdx = useRef(0)
  const clipIdxRef = useRef(0)

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)

  // Beat detection
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const bassAvgRef = useRef(0)
  const beatPulseRef = useRef(0)

  // Chorus detection
  const [chorusMode, setChorusMode] = useState(false)

  // Whisper + lyrics
  const [whisperSegments, setWhisperSegments] = useState<WhisperSegment[]>([])
  const [currentSegment, setCurrentSegment] = useState<WhisperSegment | null>(null)
  const [lyrics, setLyrics] = useState<TrackLyrics | null>(null)

  // 3D lyrics
  const [lines3D, setLines3D] = useState<Title3DLine[]>([])
  const [show3D, setShow3D] = useState(true)
  const [animStyle, setAnimStyle] = useState<LyricAnimStyle>('slam')
  const [material, setMaterial] = useState<Title3DSettings['material']>('crimson')
  const [font3D, setFont3D] = useState<FontKey>('hardcore')

  // UI
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const [needsTap, setNeedsTap] = useState(true)

  const settings3D: Title3DSettings = {
    material, depth: 0.2, bevelEnabled: true, bevelSize: 0.03,
    lighting: 'stage', camera: 'static', bloomIntensity: 1.5,
    particles: 'sparks', animation: 'none', scene: 'transparent',
  }

  const trackTitle = trackResult?.track.title || trackSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const musicUrl = trackResult?.track.aSide || ''
  const chorusKeyword = config?.chorusKeyword || ''

  /* ── Load data ── */
  useEffect(() => {
    if (config) {
      Promise.all([
        fetch(`${config.cdn}/manifest.json`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${config.cdn}/title-videos.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]).then(([manifest, titleManifest]) => {
        const titleFilenames = new Set<string>()
        if (titleManifest?.titleVideos) {
          const titles: VideoClip[] = titleManifest.titleVideos.map((item: any) => {
            titleFilenames.add(item.video)
            return { url: `${config.cdn}/${encodeURIComponent(item.video)}`, width: item.width || 720, height: item.height || 1280 }
          })
          setTitleClips(titles)
        }
        if (manifest?.collections?.[config.collection]?.items) {
          setClips(manifest.collections[config.collection].items
            .filter((item: any) => !titleFilenames.has(item.video) && !titleFilenames.has(decodeURIComponent(item.video)))
            .map((item: any) => ({ url: `${config.cdn}/${encodeURIComponent(item.video)}`, width: item.width || 720, height: item.height || 1280 }))
          )
        }
      })
    }

    // Load whisper sync data
    fetch(`/music/lyrics-sync/${trackSlug}.json`).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.segments) setWhisperSegments(data.segments)
    }).catch(() => {})

    // Load lyrics
    if (config) {
      setLyrics(getLyrics(config.lyricsKey))
    } else if (trackResult?.track.title) {
      setLyrics(getLyrics(trackResult.track.title) || getLyrics(trackResult.track.japanese || ''))
    }
  }, [trackSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Audio ── */
  useEffect(() => {
    if (!musicUrl) return
    const audio = new Audio(musicUrl)
    audio.volume = volume; audio.crossOrigin = 'anonymous'
    audio.addEventListener('timeupdate', () => { setCurrentTime(audio.currentTime); setDuration(audio.duration || 0) })
    audio.addEventListener('ended', () => setIsPlaying(false))
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [musicUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  /* ── Video pool ── */
  useEffect(() => {
    if (titleClips.length === 0 && clips.length === 0) return
    if (poolRef.current.length === 0) {
      poolRef.current = Array.from({ length: 4 }, () => {
        const v = document.createElement('video')
        v.muted = true; v.playsInline = true; v.loop = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'
        return v
      })
    }
    const ambient = titleClips.length > 0
      ? [titleClips[0], titleClips[1] || titleClips[0]]
      : [clips[0], clips[1] || clips[0]]
    ambient.filter(Boolean).forEach((clip, i) => {
      if (poolRef.current[i]) {
        poolRef.current[i].src = clip.url
        poolRef.current[i].load()
        poolRef.current[i].play().catch(() => {})
      }
    })
    activePoolIdx.current = 0
  }, [titleClips, clips])

  // Ambient loop before play
  useEffect(() => {
    if (isPlaying || poolRef.current.length < 2) return
    const iv = setInterval(() => { activePoolIdx.current = activePoolIdx.current === 0 ? 1 : 0 }, 4000)
    return () => clearInterval(iv)
  }, [isPlaying])

  // On play: load full pool
  useEffect(() => {
    if (!isPlaying || clips.length === 0) return
    const ordered = [titleClips[0], titleClips[1] || titleClips[0], clips[0], clips[Math.floor(Math.random() * clips.length)]].filter(Boolean)
    ordered.forEach((clip, i) => {
      if (poolRef.current[i]) { poolRef.current[i].src = clip.url; poolRef.current[i].load(); poolRef.current[i].play().catch(() => {}) }
    })
    activePoolIdx.current = 0; clipIdxRef.current = ordered.length
  }, [isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  const advanceClip = useCallback(() => {
    const pool = poolRef.current
    if (pool.length === 0 || clips.length === 0) return
    const oldIdx = activePoolIdx.current
    activePoolIdx.current = (activePoolIdx.current + 1) % pool.length
    clipIdxRef.current++
    const nextClip = clips[Math.floor(Math.random() * clips.length)]
    pool[oldIdx].src = nextClip.url; pool[oldIdx].load(); pool[oldIdx].play().catch(() => {})
    pool[activePoolIdx.current].playbackRate = 0.5 + Math.random() * 2
  }, [clips])

  /* ── Start on tap ── */
  const [introPhase, setIntroPhase] = useState<'idle' | 'black' | 'title' | 'playing'>('idle')

  const startPlayback = useCallback(() => {
    if (!audioRef.current) return
    setNeedsTap(false)
    if (!analyserRef.current && audioRef.current) {
      try {
        const ctx = new AudioContext()
        const source = ctx.createMediaElementSource(audioRef.current)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.4
        source.connect(analyser); analyser.connect(ctx.destination)
        audioCtxRef.current = ctx; analyserRef.current = analyser; setAnalyserNode(analyser)
      } catch {}
    }
    setIntroPhase('black')
    setTimeout(() => {
      setIntroPhase('title')
      if (titleClips.length > 0 && poolRef.current.length > 0) {
        poolRef.current[0].src = titleClips[0].url; poolRef.current[0].load(); poolRef.current[0].play().catch(() => {})
        activePoolIdx.current = 0
      }
      audioRef.current?.play().catch(() => {}); setIsPlaying(true)
      poolRef.current.forEach(v => v.play().catch(() => {}))
      setTimeout(() => setIntroPhase('playing'), 3000)
    }, 800)
  }, [titleClips])

  /* ── Canvas render loop ── */
  useEffect(() => {
    const freqData = new Uint8Array(128)
    const render = () => {
      const canvas = canvasRef.current
      if (!canvas) { animRef.current = requestAnimationFrame(render); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { animRef.current = requestAnimationFrame(render); return }
      const dpr = window.devicePixelRatio > 1 ? 2 : 1
      const cw = canvas.clientWidth * dpr, ch = canvas.clientHeight * dpr
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch }

      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData)
        let bass = 0; for (let i = 0; i < 6; i++) bass += freqData[i]; bass /= 6
        bassAvgRef.current = bassAvgRef.current * 0.92 + bass * 0.08
        let vocals = 0; for (let i = 20; i < 50; i++) vocals += freqData[i]; vocals /= 30
        if (titleClips.length > 0) { if (vocals > 100) setChorusMode(true); else if (vocals < 60) setChorusMode(false) }
        if (bass > bassAvgRef.current * 1.4 && bass > 80) {
          beatPulseRef.current = Math.min(1, beatPulseRef.current + 0.6)
          if (beatPulseRef.current > 0.5 && Math.random() < 0.15) advanceClip()
        }
        beatPulseRef.current *= 0.92
      }

      if (introPhase === 'black') { animRef.current = requestAnimationFrame(render); return }

      let video = poolRef.current[activePoolIdx.current]
      if (!video || video.readyState < 2) video = poolRef.current.find(v => v && v.readyState >= 2) || video
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch)

      if (video && video.readyState >= 2) {
        const vw = video.videoWidth, vh = video.videoHeight
        const videoAspect = vw / vh, canvasAspect = cw / ch
        const needsBlurBg = Math.abs(videoAspect - canvasAspect) > 0.3
        if (needsBlurBg) {
          const bgScale = Math.max(cw / vw, ch / vh) * 1.15
          ctx.filter = 'blur(20px) brightness(0.3)'; ctx.drawImage(video, (cw - vw * bgScale) / 2, (ch - vh * bgScale) / 2, vw * bgScale, vh * bgScale); ctx.filter = 'none'
          const fgScale = Math.min(cw / vw, ch / vh); ctx.drawImage(video, (cw - vw * fgScale) / 2, (ch - vh * fgScale) / 2, vw * fgScale, vh * fgScale)
        } else {
          const scale = Math.max(cw / vw, ch / vh); ctx.drawImage(video, (cw - vw * scale) / 2, (ch - vh * scale) / 2, vw * scale, vh * scale)
        }
        const bp = beatPulseRef.current
        if (bp > 0.3 && Math.random() < 0.04) {
          const numTears = 1 + (bp > 0.7 ? 1 : 0)
          for (let t = 0; t < numTears; t++) {
            const y = Math.floor(Math.random() * ch), h = Math.floor(1 + Math.random() * 4) * dpr
            const shift = Math.floor((Math.random() - 0.5) * bp * 40), stripH = Math.min(h, ch - y)
            if (stripH > 0) { const strip = ctx.getImageData(0, y, cw, stripH); ctx.putImageData(strip, shift, y) }
          }
        }
      }
      animRef.current = requestAnimationFrame(render)
    }
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [titleClips.length, advanceClip, introPhase])

  // Auto-advance clips
  const playStartRef = useRef(0)
  useEffect(() => {
    if (introPhase !== 'playing' || clips.length === 0) return
    if (playStartRef.current === 0) playStartRef.current = Date.now()
    const tick = () => {
      advanceClip()
      const elapsed = (Date.now() - playStartRef.current) / 1000
      const speed = elapsed < 6 ? 1000 : chorusMode ? 1500 : 2500
      timerRef.current = setTimeout(tick, speed)
    }
    const timerRef = { current: setTimeout(tick, 500) }
    return () => clearTimeout(timerRef.current)
  }, [introPhase, clips.length, chorusMode, advanceClip])

  /* ── Whisper → 3D lines + title clip on chorus ── */
  const lastChorusCutRef = useRef(-1)
  useEffect(() => {
    const seg = whisperSegments.find(s => currentTime >= s.start && currentTime < s.end)
    setCurrentSegment(seg || null)

    const isChorusLine = seg && chorusKeyword && seg.text.toLowerCase().includes(chorusKeyword)
    const wasChorus = lastChorusCutRef.current >= 0

    if (isChorusLine && titleClips.length > 0) {
      if (lastChorusCutRef.current !== seg.id) {
        lastChorusCutRef.current = seg.id
        const pool = poolRef.current
        if (pool.length > 0) {
          const titleClip = titleClips[Math.floor(Math.random() * titleClips.length)]
          pool[activePoolIdx.current].src = titleClip.url; pool[activePoolIdx.current].load(); pool[activePoolIdx.current].play().catch(() => {})
        }
      }
      setLines3D([]); return
    }

    if (introPhase === 'title' && seg && !isChorusLine) setIntroPhase('playing')

    if (wasChorus && !isChorusLine && seg) {
      lastChorusCutRef.current = -1
      const pool = poolRef.current
      if (pool.length > 0 && clips.length > 0) {
        const sceneClip = clips[Math.floor(Math.random() * clips.length)]
        pool[activePoolIdx.current].src = sceneClip.url; pool[activePoolIdx.current].load(); pool[activePoolIdx.current].play().catch(() => {})
      }
    }

    if (!show3D || !seg) { setLines3D([]); return }

    const segProgress = (currentTime - seg.start) / (seg.end - seg.start)
    const text = seg.text.toUpperCase()
    const fontInfo = FONT_REGISTRY[font3D]
    const useMode: LayerMode = fontInfo?.supports3d ? '3d' : '2d'

    const textLines: string[] = text.length > 22
      ? (() => { const w = text.split(' '); const m = Math.ceil(w.length / 2); return [w.slice(0, m).join(' '), w.slice(m).join(' ')] })()
      : [text]

    const newLines: Title3DLine[] = textLines.map((line, i) => {
      const yBase = 460 + (textLines.length > 1 ? (i === 0 ? -40 : 40) : 0)
      const s = interpolateKeyframes(buildLyricKeyframes(line, animStyle, yBase), segProgress)
      return { text: line, color: s.color, fontSize: s.fontSize, x: s.x, y: s.y, rotation: s.rotation, scaleX: s.scaleX, scaleY: s.scaleY, skewX: s.skewX, opacity: s.opacity, mode: useMode, font: font3D }
    })

    if (lyrics && duration > 0) {
      const bp = beatPulseRef.current
      const frame = getLyricFrame(lyrics, currentTime, duration, bp)
      if (frame.japanese) {
        const js = interpolateKeyframes(buildJapaneseKeyframes(animStyle), segProgress)
        newLines.push({ text: frame.japanese.text, color: js.color, fontSize: js.fontSize, x: js.x, y: js.y, rotation: js.rotation, scaleX: js.scaleX, scaleY: js.scaleY, skewX: js.skewX, opacity: js.opacity, mode: '2d' })
      }
    }
    setLines3D(newLines)
  }, [currentTime, whisperSegments, lyrics, duration, show3D, font3D, animStyle, chorusKeyword, titleClips, clips, introPhase])

  /* ── Auto-hide controls ── */
  useEffect(() => {
    const show = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setShowControls(true)
      hideTimer.current = setTimeout(() => setShowControls(false), 3000)
    }
    show()
    window.addEventListener('mousemove', show); window.addEventListener('touchstart', show)
    return () => { window.removeEventListener('mousemove', show); window.removeEventListener('touchstart', show) }
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  // No track found
  if (!trackResult) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[200]">
        <div className="text-center">
          <div className="font-[family-name:var(--font-brand)] text-2xl text-white/60">Track not found</div>
          <a href="/watch" className="text-red-400 text-sm mt-4 block">Back to Watch</a>
        </div>
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div className="fixed inset-0 bg-black z-[200]" style={{ cursor: showControls ? 'default' : 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" onClick={() => needsTap ? startPlayback() : setShowControls(s => !s)} />

      {show3D && !needsTap && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <Suspense fallback={null}>
            <Title3DScene lines={lines3D} settings={settings3D} analyserNode={analyserNode} />
          </Suspense>
        </div>
      )}

      {needsTap && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 cursor-pointer" onClick={startPlayback}>
          <div className="font-[family-name:var(--font-brand)] text-4xl text-white tracking-wider mb-2">{trackTitle.toUpperCase()}</div>
          <div className="font-[family-name:var(--font-brand)] text-red-500/60 text-xs uppercase tracking-widest mb-8">3D Lyrics Experience</div>
          <div className="w-20 h-20 rounded-full bg-red-600/80 flex items-center justify-center hover:bg-red-600 transition-colors">
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8 ml-1"><polygon points="6,4 20,12 6,20" /></svg>
          </div>
          <div className="mt-6 text-[10px] text-white/30 font-mono uppercase tracking-widest">click to start</div>
        </div>
      )}

      <div className={`absolute bottom-0 inset-x-0 z-20 bg-black/60 backdrop-blur-sm transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
        <div className="px-4 pt-2">
          <input type="range" min="0" max={duration || 1} step="0.1" value={currentTime}
            onChange={e => { if (audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value) }}
            className="w-full h-1 accent-red-500 cursor-pointer" />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          <button onClick={() => { if (needsTap) startPlayback(); else { if (isPlaying) audioRef.current?.pause(); else audioRef.current?.play().catch(() => {}); setIsPlaying(!isPlaying) } }}
            className="text-white/80 hover:text-white w-6 h-6 flex items-center justify-center">
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><polygon points="6,4 20,12 6,20" /></svg>
            )}
          </button>
          <span className="text-[10px] text-white/40 font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <div className="flex-1" />

          {show3D && <>
            {(['slam', 'strobe', 'glitch', 'zoom', 'shake', 'minimal'] as LyricAnimStyle[]).map(s => (
              <button key={s} onClick={() => setAnimStyle(s)}
                className={`text-[9px] font-mono px-1.5 py-0.5 transition-all ${animStyle === s ? 'text-red-400 bg-red-500/20' : 'text-white/30 hover:text-white/60'}`}
              >{s}</button>
            ))}
            <div className="w-px h-4 bg-white/10" />
          </>}

          {show3D && <>
            {(['crimson', 'gold'] as const).map(m => (
              <button key={m} onClick={() => setMaterial(m)}
                className={`text-[9px] font-mono px-1.5 py-0.5 transition-all ${material === m ? 'text-red-400 bg-red-500/20' : 'text-white/30 hover:text-white/60'}`}
              >{m}</button>
            ))}
            <div className="w-px h-4 bg-white/10" />
          </>}

          {show3D && <>
            {(Object.entries(FONT_REGISTRY) as [FontKey, typeof FONT_REGISTRY[FontKey]][]).map(([key, info]) => (
              <button key={key} onClick={() => setFont3D(key)}
                className={`text-[9px] font-mono px-1.5 py-0.5 transition-all ${font3D === key ? 'text-orange-400 bg-orange-500/20' : 'text-white/30 hover:text-white/60'}`}
              >{info.label}</button>
            ))}
            <div className="w-px h-4 bg-white/10" />
          </>}

          <button onClick={() => setShow3D(!show3D)}
            className={`text-[9px] font-mono px-1.5 py-0.5 transition-all ${show3D ? 'text-purple-400 bg-purple-500/20' : 'text-white/30 hover:text-white/60'}`}
          >3D {show3D ? 'on' : 'off'}</button>

          <button onClick={() => setVolume(v => v > 0 ? 0 : 0.8)}
            className="text-[9px] font-mono text-white/30 hover:text-white/60 px-1">
            {volume > 0 ? 'vol' : 'mute'}
          </button>

          <a href={`/watch/${trackSlug}`} className="text-[9px] font-mono text-white/20 hover:text-white/50 px-1">watch</a>
          <a href={`/movie-editor/${trackSlug}`} className="text-[9px] font-mono text-white/20 hover:text-white/50 px-1">editor</a>
        </div>
      </div>

      {chorusMode && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <span className="text-[10px] font-black text-red-500 bg-black/60 px-2 py-1 animate-pulse uppercase tracking-widest">CHORUS</span>
        </div>
      )}
    </div>
  )
}
