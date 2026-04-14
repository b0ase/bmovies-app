'use client'

import { useState, useEffect, useRef } from 'react'

const MUSIC_TRACKS = [
  '/music/暴走ハートビート.mp3',
  '/music/反逆エンジン.mp3',
  '/music/赤信号ぶっちぎれ.mp3',
  '/music/爆速ギャルズ・ゼロ距離.mp3',
  '/music/焦げたスニーカー.mp3',
  '/music/地下ガールズ革命.mp3',
  '/music/燃えるまで噛みつけ.mp3',
]

interface VideoClip {
  url: string
  width: number
  height: number
}

function MixerBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const animRef = useRef(0)
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const [videos, setVideos] = useState<VideoClip[]>([])
  const [clipIdx, setClipIdx] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const musicStarted = useRef(false)
  const musicIdxRef = useRef(Math.floor(Math.random() * MUSIC_TRACKS.length))
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const bassAvgRef = useRef(0)
  const beatPulseRef = useRef(0)

  // Load videos from manifest + adult content
  useEffect(() => {
    fetch('/NPG-X-10/manifest.json')
      .then(r => r.json())
      .then(async (data: { collections: Record<string, { items: { uuid: string; video?: string; width?: number; height?: number }[] }> }) => {
        const all = Object.values(data.collections).flatMap(c => c.items).filter(i => i.video)
        const manifestVids: VideoClip[] = all.map(v => ({
          url: `/NPG-X-10/${v.video}`,
          width: v.width || 464,
          height: v.height || 688,
        }))
        // Fetch adult content dynamically
        const ac = await fetch('/api/adult-content').then(r => r.json()).catch(() => ({ videos: [] }))
        const adultVids: VideoClip[] = (ac.videos || []).map((url: string) => ({
          url,
          width: 1024,
          height: 576,
        }))
        const combined = [...manifestVids, ...adultVids]
        for (let i = combined.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [combined[i], combined[j]] = [combined[j], combined[i]]
        }
        setVideos(combined)
      })
      .catch(console.error)
  }, [])

  // Load clip
  useEffect(() => {
    if (videos.length === 0 || !videoRef.current) return
    const v = videoRef.current
    v.src = videos[clipIdx % videos.length].url
    v.load()
    v.onloadeddata = () => v.play().catch(() => {})
    v.onerror = () => setClipIdx(p => (p + 1) % Math.max(1, videos.length))
  }, [clipIdx, videos])

  // Auto-advance clips every 6s
  useEffect(() => {
    if (videos.length === 0) return
    const id = setInterval(() => setClipIdx(p => (p + 1) % videos.length), 6000)
    return () => clearInterval(id)
  }, [videos])

  // Music auto-play disabled

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const freqData = new Uint8Array(128)

    const render = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { animRef.current = requestAnimationFrame(render); return }

      const dpr = window.devicePixelRatio > 1 ? 2 : 1
      const cw = canvas.clientWidth * dpr
      const ch = canvas.clientHeight * dpr
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }

      // Beat detection
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData)
        let bass = 0
        for (let i = 0; i < 6; i++) bass += freqData[i]
        bass /= 6
        bassAvgRef.current = bassAvgRef.current * 0.92 + bass * 0.08
        if (bass > bassAvgRef.current * 1.4 && bass > 80) {
          beatPulseRef.current = Math.min(1, beatPulseRef.current + 0.5)
        }
        beatPulseRef.current *= 0.93
      } else {
        beatPulseRef.current *= 0.95
      }
      const bp = beatPulseRef.current

      const videoReady = video.readyState >= 2 && !video.seeking

      if (videoReady) {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, cw, ch)

        const vw = video.videoWidth, vh = video.videoHeight
        if (vw && vh) {
          const isPortrait = vh > vw
          if (isPortrait) {
            const bgScale = Math.max(cw / vw, ch / vh) * 1.15
            ctx.filter = 'blur(20px) brightness(0.25)'
            ctx.drawImage(video, (cw - vw * bgScale) / 2, (ch - vh * bgScale) / 2, vw * bgScale, vh * bgScale)
            ctx.filter = 'none'
            const fgScale = Math.min(cw / vw, ch / vh)
            ctx.drawImage(video, (cw - vw * fgScale) / 2, (ch - vh * fgScale) / 2, vw * fgScale, vh * fgScale)
          } else {
            const scale = Math.max(cw / vw, ch / vh)
            ctx.drawImage(video, (cw - vw * scale) / 2, (ch - vh * scale) / 2, vw * scale, vh * scale)
          }
        }

        // Subtle crimson tint
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = 'rgb(255, 240, 230)'
        ctx.fillRect(0, 0, cw, ch)
        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = 'rgba(40, 0, 0, 0.08)'
        ctx.fillRect(0, 0, cw, ch)
        ctx.globalCompositeOperation = 'source-over'

        // Beat flash
        if (bp > 0.3) {
          ctx.fillStyle = `rgba(220, 20, 60, ${bp * 0.08})`
          ctx.fillRect(0, 0, cw, ch)
        }

        // Vignette
        const grad = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.25, cw / 2, ch / 2, cw * 0.8)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(1, 'rgba(0,0,0,0.5)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, cw, ch)

        // Bottom gradient for CTA
        const bottomGrad = ctx.createLinearGradient(0, ch * 0.5, 0, ch)
        bottomGrad.addColorStop(0, 'rgba(0,0,0,0)')
        bottomGrad.addColorStop(1, 'rgba(0,0,0,0.7)')
        ctx.fillStyle = bottomGrad
        ctx.fillRect(0, ch * 0.5, cw, ch * 0.5)

        // Buffer
        if (!bufferRef.current) bufferRef.current = document.createElement('canvas')
        const buf = bufferRef.current
        if (buf.width !== cw || buf.height !== ch) { buf.width = cw; buf.height = ch }
        buf.getContext('2d')?.drawImage(canvas, 0, 0)
      } else if (bufferRef.current) {
        ctx.drawImage(bufferRef.current, 0, 0, cw, ch)
      }

      // Beat bar
      if (bp > 0.05) {
        ctx.fillStyle = `rgba(220, 20, 60, ${bp * 0.5})`
        ctx.fillRect(0, ch - 3, cw * bp, 3)
      }

      animRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [videos])

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ imageRendering: 'auto' }} />
      <video ref={videoRef} className="hidden" muted playsInline autoPlay
        onEnded={() => setClipIdx(p => (p + 1) % Math.max(1, videos.length))} />
    </>
  )
}

export default function AltPaywallPage() {
  const handleSignIn = async () => {
    try {
      const res = await fetch('/api/auth/handcash/login?returnTo=/')
      const data = await res.json()
      if (data.redirectUrl) window.location.href = data.redirectUrl
    } catch {
      window.location.href = '/api/auth/handcash?returnTo=/'
    }
  }

  return (
    <div className="fixed inset-0 z-[150] bg-black overflow-hidden">
      <MixerBackground />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        {/* Title */}
        <div className="text-center pointer-events-auto mb-6">
          <h1
            className="text-white font-black text-7xl sm:text-8xl lg:text-[10rem] tracking-tighter leading-[0.82]"
            style={{ fontFamily: 'var(--font-brand)', textShadow: '0 4px 30px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.6)' }}
          >
            <span className="block sm:inline">NINJA</span>{' '}
            <span className="block sm:inline">PUNK</span>{' '}
            <span className="block sm:inline">GIRLS</span>
          </h1>
          <span
            className="text-red-500 inline-block ml-2"
            style={{
              fontSize: 'clamp(3rem, 13vw, 11rem)',
              fontFamily: "var(--font-graffiti), 'Permanent Marker', 'Impact', cursive",
              transform: 'rotate(-4deg) skewX(-3deg)',
              textShadow: '4px 4px 0 rgba(0,0,0,0.9), 0 0 60px rgba(220,20,60,0.6)',
              lineHeight: 0.7,
              verticalAlign: 'baseline',
            }}
          >
            X
          </span>
        </div>

        {/* $402 badge */}
        <div className="mb-8">
          <span
            className="text-5xl sm:text-7xl font-black text-white"
            style={{ fontFamily: 'var(--font-brand)', textShadow: '0 0 40px rgba(255,255,255,0.15), 0 4px 20px rgba(0,0,0,0.8)' }}
          >
            $402
          </span>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pointer-events-auto">
          <button
            onClick={handleSignIn}
            className="bg-red-600/90 hover:bg-red-500 backdrop-blur-sm text-white px-10 sm:px-14 py-4 sm:py-5 rounded-2xl text-xl sm:text-2xl font-black uppercase tracking-wider transition-all cursor-pointer border border-red-400/30"
            style={{
              fontFamily: 'var(--font-brand)',
              boxShadow: '0 0 60px rgba(220, 20, 60, 0.5), 0 0 120px rgba(220, 20, 60, 0.2), 0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            SIGN IN
          </button>
          <button
            onClick={() => window.location.href = '/store/buy'}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-10 sm:px-14 py-4 sm:py-5 rounded-2xl text-xl sm:text-2xl font-black uppercase tracking-wider transition-all cursor-pointer border border-white/20"
            style={{
              fontFamily: 'var(--font-brand)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            BUY — $402
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center gap-3 pointer-events-auto">
          <span className="text-red-500 text-sm font-black">18+</span>
          <span className="text-white/30 text-xs">Adult content</span>
          <span className="text-white/10 text-xs">·</span>
          <span className="text-white/20 text-[10px]">HandCash · Bitcoin SV · OpenClaw</span>
        </div>
      </div>
    </div>
  )
}
