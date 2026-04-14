'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { NPGX_ROSTER, ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import MagazineCoverOverlay from '@/components/MagazineCoverOverlay'

// Video scenarios — maximum edge. Intentional, suggestive, dangerous. Rock energy + glitch aesthetic.
const SCENARIOS = [
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, slow motion walk through neon Tokyo alley at night, rain soaking through thin black top clinging to skin, gold chains swinging with hips, camera following from behind at hip level, water running down curves, she looks back over shoulder with predatory stare, tongue across lips, VHS glitch artifacts, heavy guitar riff energy, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, dark rooftop edge overlooking city, wind whipping hair, wearing tiny black crop top and low-rise leather pants, diamond choker, slow orbit camera starting from behind showing silhouette, she arches back against railing, smoke and red neon, chromatic aberration glitch effect, rock energy, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, grinding dance in dark underground club, red and purple neon, thick smoke, wearing tight black mini dress riding up thighs, camera low angle behind her as she dances, gold chains catching light, slow motion hair whip sending sweat flying, RGB split glitch frames, filthy bass drop energy, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, straddling motorcycle under highway overpass, wearing open leather jacket over black bra, tiny shorts and thigh-high boots, low angle behind showing legs and bike, licking lips staring at camera, headlights illuminating body from behind, digital glitch scan lines, punk anthem energy, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, backstage dressing room, vanity mirror lights, bending over pulling fishnet stockings up tattooed legs, wearing black lace bodysuit and spiked collar, camera behind at low angle, biting lip watching herself in mirror, cigarette smoke, VHS tracking artifacts, voyeuristic camera angle, raw intimate, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, walking away from camera through heavy rain on empty city street at 3am, soaking wet clothes clinging to curves, tiny black skirt and heels, water dripping down legs, she stops and looks back, mascara running, chromatic glitch distortion, distant punk bass, predatory atmosphere, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, dark luxury penthouse, floor to ceiling windows, dropping black silk robe off shoulders revealing tattooed back and thong, camera tracking down her body from behind, gold jewelry, walking toward window barefoot on marble, red glow, VHS noise and scan lines, blues rock vinyl, every step dangerous, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, underground punk stage, spotlight through smoke, wearing ripped crop top and micro skirt with platform boots, low angle camera from behind as she grabs mic stand, crowd insane below, guitar feedback screaming, glitch pixel blocks flashing, sweat flying, raw transgressive energy, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, neon tattoo parlor after hours, lying face down on chair getting lower back tattoo, wearing tiny shorts pulled low, biting lip looking back at camera, leather boots, buzzing needle, rock posters everywhere, red lighting, VHS glitch overlay, camera slowly drifting across body, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, crawling toward camera on hands and knees in dark room, predatory eyes, wet hair hanging, wearing soaked black tank top riding up and tiny shorts, gold chains dragging on floor, smoke swirling, red neon, RGB shift glitch effect, slow deliberate movement like hunting prey, dangerous and hypnotic, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, standing in shower fully clothed, water cascading down, white shirt becoming transparent, she turns slowly showing profile, hands running through wet hair, steam and red neon light through glass, digital glitch scan lines, slow motion water on skin, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, dark pool hall, bent over pool table lining up a shot, wearing tight low-cut top and mini skirt, camera at table level behind her, chalking cue stick, neon beer signs, smoke, she looks back at camera with smirk, VHS tracking noise, punk rock on jukebox, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, gym locker room after hours, sitting on bench in sports bra and tiny shorts, pouring water over head, water running down abs and thighs, red emergency lighting, steam, camera slowly orbiting, chromatic aberration glitch, raw athletic energy, cinematic, 8k`,
  (name: string, desc: string) =>
    `${name}, photorealistic woman, ${desc}, walking down long dark hallway toward camera in slow motion, wearing black latex bodysuit unzipped, heels echoing, red lights flashing behind her, VHS glitch blocks and scan lines, she reaches camera and the image corrupts to static, cyberpunk horror energy, cinematic, 8k`,
]

/* ── Canvas Effects ── */
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

function applyRGBShift(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const src = ctx.getImageData(0, 0, w, h)
  const dst = ctx.createImageData(w, h)
  const s = src.data, d = dst.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const rOff = Math.min(w - 1, Math.max(0, x + amount))
      const bOff = Math.min(w - 1, Math.max(0, x - amount))
      d[i] = s[(y * w + rOff) * 4]         // R shifted right
      d[i + 1] = s[i + 1]                   // G stays
      d[i + 2] = s[(y * w + bOff) * 4 + 2] // B shifted left
      d[i + 3] = 255
    }
  }
  ctx.putImageData(dst, 0, 0)
}

function applyScanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 2)
  }
}

interface GeneratedVideo {
  id: string
  character: string
  duration: string
  cost: string
  prompt: string
  videoUrl: string | null
  status: 'pending' | 'done' | 'expired' | 'error'
  requestId: string
  orientation: 'portrait' | 'landscape'
}

export default function VideoGeneratorPage() {
  const searchParams = useSearchParams()
  const initialChar = searchParams.get('character') || NPGX_ROSTER[0].slug

  const [selectedCharacter, setSelectedCharacter] = useState(initialChar)
  const [customPrompt, setCustomPrompt] = useState('')
  const [duration, setDuration] = useState<5 | 8>(5)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [resolution, setResolution] = useState<'480p' | '720p'>('480p')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [soulData, setSoulData] = useState<Record<string, unknown> | null>(null)
  const [showBranding, setShowBranding] = useState(true)
  const [glitchMode, setGlitchMode] = useState(true)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number>(0)

  const char = ROSTER_BY_SLUG[selectedCharacter]
  const latestVideo = generatedVideos[0] || null

  // Load soul data when character changes
  useEffect(() => {
    fetch(`/souls/${selectedCharacter}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setSoulData(data))
      .catch(() => setSoulData(null))
  }, [selectedCharacter])

  // Canvas render loop
  const renderFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.paused || video.ended) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cw = canvas.offsetWidth * dpr
    const ch = canvas.offsetHeight * dpr
    canvas.width = cw
    canvas.height = ch

    // Draw video — cover-fit into canvas
    const vw = video.videoWidth || cw
    const vh = video.videoHeight || ch
    const scale = Math.max(cw / vw, ch / vh) // cover, not contain
    const dw = vw * scale
    const dh = vh * scale
    const dx = (cw - dw) / 2
    const dy = (ch - dh) / 2

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, cw, ch)
    ctx.drawImage(video, dx, dy, dw, dh)

    // Apply effects
    if (glitchMode) {
      applyCrimsonFilter(ctx, cw, ch)
      applyScanlines(ctx, cw, ch)
      if (Math.random() > 0.85) applyGlitch(ctx, cw, ch)
      if (Math.random() > 0.92) applyRGBShift(ctx, cw, ch, 3 + Math.floor(Math.random() * 8))
    }

    // Branding overlay
    if (showBranding) {
      const fontSize = Math.floor(cw * 0.035)
      ctx.save()
      ctx.font = `900 ${fontSize}px 'Orbitron', monospace`
      ctx.textAlign = 'center'
      // Shadow
      ctx.fillStyle = 'rgba(220,20,60,0.3)'
      ctx.fillText('NINJA PUNK GIRLS X', cw / 2 + 2, ch * 0.07 + 2)
      // Main
      ctx.fillStyle = '#ffffff'
      ctx.fillText('NINJA PUNK GIRLS X', cw / 2, ch * 0.07)
      // Character name bottom
      if (char) {
        const nameSize = Math.floor(cw * 0.025)
        ctx.font = `700 ${nameSize}px 'Orbitron', monospace`
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fillText(char.name.toUpperCase(), cw / 2, ch * 0.95)
        // Token
        ctx.font = `400 ${Math.floor(cw * 0.015)}px monospace`
        ctx.fillStyle = 'rgba(220,20,60,0.7)'
        ctx.fillText(char.token, cw / 2, ch * 0.975)
      }
      ctx.restore()
    }

    rafRef.current = requestAnimationFrame(renderFrame)
  }, [glitchMode, showBranding, char])

  // Start/stop render loop when video plays
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onPlay = () => { rafRef.current = requestAnimationFrame(renderFrame) }
    const onPause = () => { cancelAnimationFrame(rafRef.current) }
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onPause)
    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onPause)
      cancelAnimationFrame(rafRef.current)
    }
  }, [renderFrame])

  // Load video when latest changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !latestVideo?.videoUrl || latestVideo.status !== 'done') return
    video.src = latestVideo.videoUrl
    video.load()
    video.play().catch(() => {})
  }, [latestVideo?.videoUrl, latestVideo?.status])

  const buildVideoPrompt = () => {
    const soulPrompt = soulData
      ? (soulData as { generation?: { promptPrefix?: string } }).generation?.promptPrefix || ''
      : `${char?.name || 'ninja punk girl'}, slim beautiful woman, tattooed, edgy`

    if (customPrompt) {
      return `${soulPrompt}, ${customPrompt}, photorealistic, cinematic video, not anime, not cartoon, not 3d render, 8k quality`
    }

    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
    return scenario(char?.name || 'Ninja Punk Girl', soulPrompt)
  }

  // Poll for video completion
  const pollForVideo = useCallback(async (requestId: string, videoId: string) => {
    const maxAttempts = 120
    let attempts = 0

    const poll = async () => {
      attempts++
      try {
        const res = await fetch(`/api/generate-video/status?id=${requestId}`)
        const data = await res.json()

        if (data.status === 'done' && data.videoUrl) {
          setGeneratedVideos(prev => prev.map(v =>
            v.id === videoId ? { ...v, status: 'done', videoUrl: data.videoUrl } : v
          ))
          return
        }

        if (data.status === 'expired' || data.status === 'error') {
          setGeneratedVideos(prev => prev.map(v =>
            v.id === videoId ? { ...v, status: 'error' } : v
          ))
          return
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setGeneratedVideos(prev => prev.map(v =>
            v.id === videoId ? { ...v, status: 'expired' } : v
          ))
        }
      } catch {
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        }
      }
    }

    poll()
  }, [])

  const handleGenerate = async () => {
    if (!char) return
    setIsGenerating(true)

    try {
      const videoPrompt = buildVideoPrompt()
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: char,
          prompt: videoPrompt,
          slug: selectedCharacter,
          duration,
          resolution,
          orientation,
        }),
      })

      const result = await res.json()

      if (result.success && result.requestId) {
        const videoId = crypto.randomUUID()
        const newVideo: GeneratedVideo = {
          id: videoId,
          character: char.name,
          duration: `${duration}s`,
          cost: result.estimatedCost || '$0.04',
          prompt: videoPrompt,
          videoUrl: null,
          status: 'pending',
          requestId: result.requestId,
          orientation,
        }

        setGeneratedVideos(prev => [newVideo, ...prev])
        pollForVideo(result.requestId, videoId)
      } else {
        alert(`Failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Video generation failed:', error)
      alert('Video generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  const activeBtn = 'bg-red-600 text-white border border-red-500'
  const inactiveBtn = 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
  const isLandscape = orientation === 'landscape'

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">
      {/* Hidden video element — canvas renders from this */}
      <video ref={videoRef} className="hidden" muted loop playsInline crossOrigin="anonymous" />

      {/* Left — Controls */}
      <div className="w-72 shrink-0 border-r border-white/10 bg-black/40 overflow-y-auto p-4 space-y-4">

        {/* Title */}
        <h1 className="text-xl font-black uppercase tracking-wider font-[family-name:var(--font-brand)] text-white">
          Video Gen
        </h1>

        {/* Character Cards */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Character</label>
          <div className="grid grid-cols-4 gap-1 max-h-[30vh] overflow-y-auto pr-1">
            {NPGX_ROSTER.map(c => (
              <button
                key={c.slug}
                onClick={() => setSelectedCharacter(c.slug)}
                className={`relative rounded-lg overflow-hidden aspect-[3/4] border-2 transition-all ${
                  selectedCharacter === c.slug
                    ? 'border-red-500 shadow-[0_0_12px_rgba(220,20,60,0.4)] scale-105 z-10'
                    : 'border-white/10 hover:border-red-500/40 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-0.5 text-center">
                  <span className="text-[7px] font-black text-white leading-none block">{c.letter}</span>
                </div>
                {selectedCharacter === c.slug && (
                  <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(220,20,60,0.8)]" />
                )}
              </button>
            ))}
          </div>
          {char && (
            <div className="mt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-white block">{char.name}</span>
                <span className="text-red-400 font-mono text-[10px]">{char.token}</span>
              </div>
              <span className="text-2xl font-black text-red-500/20">{char.letter}</span>
            </div>
          )}
        </div>

        {/* Orientation — prominent toggle */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Mode</label>
          <div className="flex gap-2">
            <button onClick={() => setOrientation('portrait')} className={`flex-1 py-3 rounded-lg text-sm font-black transition-all flex flex-col items-center gap-1 ${!isLandscape ? activeBtn : inactiveBtn}`}>
              <span className="text-lg">&#9646;</span>
              <span className="text-[10px]">Portrait 9:16</span>
            </button>
            <button onClick={() => setOrientation('landscape')} className={`flex-1 py-3 rounded-lg text-sm font-black transition-all flex flex-col items-center gap-1 ${isLandscape ? activeBtn : inactiveBtn}`}>
              <span className="text-lg">&#9644;</span>
              <span className="text-[10px]">Landscape 16:9</span>
            </button>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Duration</label>
          <div className="flex gap-2">
            <button onClick={() => setDuration(5)} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${duration === 5 ? activeBtn : inactiveBtn}`}>5s</button>
            <button onClick={() => setDuration(8)} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${duration === 8 ? activeBtn : inactiveBtn}`}>8s</button>
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Resolution</label>
          <div className="flex gap-2">
            <button onClick={() => setResolution('480p')} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${resolution === '480p' ? activeBtn : inactiveBtn}`}>480p</button>
            <button onClick={() => setResolution('720p')} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${resolution === '720p' ? activeBtn : inactiveBtn}`}>720p</button>
          </div>
        </div>

        {/* Custom Prompt */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Custom Scene <span className="text-gray-600 normal-case">(optional)</span></label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Leave empty for random scene..."
            className="w-full h-16 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        {/* Branding */}
        <button
          onClick={() => setShowBranding(!showBranding)}
          className={`w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            showBranding ? 'bg-pink-600/20 border border-pink-500/30 text-pink-300' : 'bg-white/5 border border-white/10 text-gray-500'
          }`}
        >
          Branding: {showBranding ? 'ON' : 'OFF'}
        </button>

        {/* Glitch */}
        <button
          onClick={() => setGlitchMode(!glitchMode)}
          className={`w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            glitchMode ? 'bg-red-600/20 border border-red-500/30 text-red-300' : 'bg-white/5 border border-white/10 text-gray-500'
          }`}
        >
          Glitch FX: {glitchMode ? 'ON' : 'OFF'}
        </button>

        {/* Random — one click, no thinking */}
        <button
          onClick={() => {
            const randomChar = NPGX_ROSTER[Math.floor(Math.random() * NPGX_ROSTER.length)]
            setSelectedCharacter(randomChar.slug)
            setCustomPrompt('')
            setTimeout(() => handleGenerate(), 100)
          }}
          disabled={isGenerating}
          className={`w-full font-black py-5 rounded-xl text-lg uppercase tracking-wider transition-all shadow-lg ${
            isGenerating ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-red-600 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] text-white'
          }`}
          style={{ boxShadow: isGenerating ? 'none' : '0 0 30px rgba(220, 20, 60, 0.3)' }}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </span>
          ) : 'RANDOM VIDEO'}
        </button>

        {/* Generate with current settings */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`w-full font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition-all ${
            isGenerating ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
          }`}
        >
          Generate with Settings
        </button>

        <p className="text-[10px] text-gray-600 text-center">Wan 2.2 Spicy &middot; Atlas Cloud &middot; $0.04/video</p>
      </div>

      {/* Center — Canvas Preview */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-black/20">
        {latestVideo ? (
          <div className="h-full w-full flex flex-col items-center justify-center">
            {/* Status bar */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-black text-white">{latestVideo.character}</span>
              <span className="text-xs text-gray-500">{latestVideo.duration}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                latestVideo.status === 'done' ? 'bg-green-500/20 text-green-400' :
                latestVideo.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {latestVideo.status === 'done' ? 'Ready' : latestVideo.status === 'pending' ? 'Processing...' : 'Failed'}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                latestVideo.orientation === 'landscape' ? 'bg-blue-600/30 text-blue-300' : 'bg-pink-600/30 text-pink-300'
              }`}>
                {latestVideo.orientation === 'landscape' ? '16:9' : '9:16'}
              </span>
            </div>

            {/* Canvas / Loading / Error */}
            <div className={`relative rounded-xl overflow-hidden bg-black border border-white/10 ${
              isLandscape ? 'w-full max-w-4xl' : 'h-[calc(100vh-220px)]'
            }`}>
              {latestVideo.status === 'done' && latestVideo.videoUrl && (
                <canvas
                  ref={canvasRef}
                  className={`bg-black ${
                    isLandscape ? 'w-full aspect-video' : 'h-full aspect-[9/16]'
                  }`}
                />
              )}

              {latestVideo.status === 'pending' && (
                <div className={`flex items-center justify-center ${
                  isLandscape ? 'aspect-video w-full' : 'aspect-[9/16] h-[calc(100vh-220px)]'
                }`}>
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-400">Generating with Wan 2.2...</p>
                    <p className="text-xs text-gray-600 mt-1">~1-3 minutes</p>
                    <p className="text-[10px] text-gray-700 mt-2 font-mono">{isLandscape ? '16:9' : '9:16'} &middot; {resolution}</p>
                  </div>
                </div>
              )}

              {(latestVideo.status === 'error' || latestVideo.status === 'expired') && (
                <div className={`flex items-center justify-center ${
                  isLandscape ? 'aspect-video w-full' : 'aspect-[9/16] h-[calc(100vh-220px)]'
                }`}>
                  <div className="text-center">
                    <p className="text-red-400 text-sm font-bold">Generation failed</p>
                    <button onClick={handleGenerate} disabled={isGenerating} className="mt-3 text-xs text-gray-400 hover:text-white underline">
                      Try again
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {latestVideo.status === 'done' && latestVideo.videoUrl && (
              <div className="flex gap-2 mt-3">
                <a
                  href={latestVideo.videoUrl}
                  download={`npgx-${latestVideo.character.toLowerCase().replace(/\s+/g, '-')}-${isLandscape ? 'landscape' : 'portrait'}.mp4`}
                  className="text-xs font-bold py-2 px-6 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-all"
                >
                  Download
                </a>
                <button
                  onClick={() => {
                    const extPrompt = `continuation of previous scene, ${latestVideo.prompt}, seamless transition, extending the action further`
                    setCustomPrompt(extPrompt)
                    setTimeout(() => handleGenerate(), 100)
                  }}
                  disabled={isGenerating}
                  className="text-xs font-bold py-2 px-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 rounded-lg text-white transition-all"
                >
                  Extend +{duration}s
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-xs font-bold py-2 px-6 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                >
                  Another
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center">
            <div className={`border border-white/5 rounded-xl mx-auto mb-6 flex items-center justify-center bg-black/30 ${
              isLandscape ? 'w-96 aspect-video' : 'w-48 aspect-[9/16]'
            }`}>
              <span className="text-gray-700 text-xs font-mono">{isLandscape ? '16:9' : '9:16'} &middot; {resolution}</span>
            </div>
            <h3 className="text-3xl font-black text-white uppercase tracking-wider mb-2 font-[family-name:var(--font-brand)]">
              {char?.name}
            </h3>
            <p className="text-gray-500 italic text-sm mb-4">&ldquo;{char?.tagline}&rdquo;</p>
            <p className="text-xs text-gray-600 max-w-xs mx-auto">
              Hit generate to create a cinematic video. Random scene, rock energy, every time.
            </p>
          </div>
        )}
      </div>

      {/* Right — History (if multiple videos) */}
      {generatedVideos.length > 1 && (
        <div className="w-48 shrink-0 border-l border-white/10 bg-black/40 overflow-y-auto p-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">History</p>
          <div className="space-y-2">
            {generatedVideos.slice(1).map((video) => (
              <button
                key={video.id}
                onClick={() => {
                  setGeneratedVideos(prev => [video, ...prev.filter(v => v.id !== video.id)])
                  setOrientation(video.orientation)
                }}
                className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
              >
                <p className="text-xs font-bold text-white truncate">{video.character}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-gray-500">{video.duration}</span>
                  <span className={`text-[9px] ${video.orientation === 'landscape' ? 'text-blue-400' : 'text-pink-400'}`}>
                    {video.orientation === 'landscape' ? '16:9' : '9:16'}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    video.status === 'done' ? 'bg-green-400' :
                    video.status === 'pending' ? 'bg-yellow-400 animate-pulse' :
                    'bg-red-400'
                  }`} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
