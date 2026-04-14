'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { cdnUrl } from '@/lib/cdn'

const PUBLIC_PATHS = ['/store', '/alt', '/watch', '/albums', '/title-designer', '/buy', '/join', '/paywall', '/music-videos', '/exchange', '/director', '/storyboard', '/motion-graphics', '/graphic-design', '/home', '/music-video-editor', '/movie-editor']

const PAID_KEY = 'npgx_paid'
const ADMIN_HANDLES = ['ninjapunkgirlsx', 'boase', 'ninjapunkgirls']


const BG_VIDEOS = [
  // { src: cdnUrl('landing-page-videos/spicy.mp4'), halfOnly: true },
  { src: cdnUrl('landing-page-videos/TITLE_VIDEO.mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/title-2.mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/title-3.mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/title-4.mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/title-5.mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/title-6.mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/title-7.mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/title-8.mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/title-9.mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/grok-video-fa18a0a9-2ed2-4842-9674-22cb6e9b3043 (3).mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/grok-video-fa18a0a9-2ed2-4842-9674-22cb6e9b3043 (4).mp4'), halfOnly: false },
  { src: cdnUrl('landing-page-videos/grok-video-fa18a0a9-2ed2-4842-9674-22cb6e9b3043 (5).mp4'), halfOnly: false },
]

const MUSIC_TRACKS = [
  cdnUrl('music/暴走ハートビート.mp3'),
  cdnUrl('music/反逆エンジン.mp3'),
  cdnUrl('music/赤信号ぶっちぎれ.mp3'),
  cdnUrl('music/爆速ギャルズ・ゼロ距離.mp3'),
  cdnUrl('music/焦げたスニーカー.mp3'),
  cdnUrl('music/地下ガールズ革命.mp3'),
  cdnUrl('music/燃えるまで噛みつけ.mp3'),
]

const MOBILE_TITLE_VIDEOS = [
  cdnUrl('landing-page-videos/grok-video-1648cc68-c6d1-4e1f-aa73-3e037215f211 (2).mp4'),
  cdnUrl('landing-page-videos/grok-video-1648cc68-c6d1-4e1f-aa73-3e037215f211 (3).mp4'),
  cdnUrl('landing-page-videos/grok-video-53975e60-f22c-4839-bd4f-447e73e86716.mp4'),
  cdnUrl('landing-page-videos/magazine-preview.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-left.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-3.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-4.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-5.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-6.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-7.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-8.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-9.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-10.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-11.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-12.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-13.mp4'),
]

const PREVIEW_VIDEOS = [
  cdnUrl('landing-page-videos/magazine-preview.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-left.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-3.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-4.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-5.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-6.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-7.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-8.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-9.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-10.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-11.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-12.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-13.mp4'),
]

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

// Cycling title copy variants
const TITLE_VARIANTS = [
  {
    subtitle: '$402 ClawMiner · Phone · Studio · Exchange',
    headline: 'Your AI agent. In your pocket.',
    tagline: '26 girls. Movies, magazines, music — all yours to create, own, and trade.',
    footer: '$402 ClawMiner — one device, the whole studio',
  },
  {
    subtitle: '$NPGX tokens included · Mine $402 · Trade on 4 chains',
    headline: 'Not just a phone. A machine.',
    tagline: 'The ClawMiner mines $402 tokens while you sleep and creates content while you play.',
    footer: 'BSV · Ethereum · Base · Solana',
  },
  {
    subtitle: '$402 · Everything in the box',
    headline: 'Pick your girl. Build your empire.',
    tagline: 'Choose 1 of 26 characters. Direct movies. Generate magazines. Sell on the exchange.',
    footer: 'AI Studio · $NPGX Tokens · Content Exchange · On-chain IP',
  },
  {
    subtitle: 'The $402 ClawMiner',
    headline: 'Own the studio. Not just the content.',
    tagline: 'Your phone becomes an autonomous economic agent — powered by OpenClaw and $NPGX.',
    footer: '$402.00 · Ships worldwide · $NPGX tokens included',
  },
]

export function Paywall({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    if (window.location.hostname === 'localhost') setIsDev(true)
  }, [])
  const [paid, setPaid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [leftVideoIdx, setLeftVideoIdx] = useState(0)
  const [rightVideoIdx, setRightVideoIdx] = useState(1)
  const [bgVideoIdx, setBgVideoIdx] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [titleVariant, setTitleVariant] = useState(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Cycle title variants every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTitleVariant(v => (v + 1) % TITLE_VARIANTS.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const musicStarted = useRef(false)
  const musicIdxRef = useRef(Math.floor(Math.random() * MUSIC_TRACKS.length))

  // Stop paywall music when user gets through
  useEffect(() => {
    if (paid || isPublic) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeAttribute('src')
        audioRef.current = null
      }
      musicStarted.current = false
    }
  }, [paid, isPublic])

  // Start music on first interaction — ONLY when paywall is actually showing (paid === false)
  useEffect(() => {
    if (isPublic || isDev || paid !== false) return
    const playTrack = (idx: number) => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeAttribute('src')
      }
      const audio = new Audio(MUSIC_TRACKS[idx])
      audio.volume = 0.3
      audio.oncanplaythrough = () => audio.play().catch(() => {})
      audio.onended = () => {
        const next = (idx + 1) % MUSIC_TRACKS.length
        musicIdxRef.current = next
        playTrack(next)
      }
      audio.onerror = () => {
        // Skip broken track
        const next = (idx + 1) % MUSIC_TRACKS.length
        musicIdxRef.current = next
        setTimeout(() => playTrack(next), 500)
      }
      audioRef.current = audio
      audio.load()
    }
    const startMusic = () => {
      if (musicStarted.current) return
      musicStarted.current = true
      playTrack(musicIdxRef.current)
    }
    // Only start on explicit click — mousemove auto-play is bad UX
    window.addEventListener('click', startMusic, { once: true })
    return () => {
      window.removeEventListener('click', startMusic)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [isPublic, paid]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const paidCookie = getCookie(PAID_KEY)
    if (paidCookie === 'true') {
      setPaid(true)
      return
    }

    // Any HandCash user gets through — sign-in is the gate, not purchase
    const handle = getCookie('npgx_user_handle')
    if (handle) {
      setPaid(true)
      return
    }

    setPaid(false)
  }, [])

  // Re-check after HandCash login redirect
  useEffect(() => {
    if (paid !== false) return
    const handle = getCookie('npgx_user_handle')
    if (handle) {
      setPaid(true)
    }
  }, [paid])

  const handleClick = () => {
    window.location.href = '/buy'
  }

  const handleSignIn = async () => {
    try {
      const res = await fetch('/api/auth/handcash/login?returnTo=/')
      const data = await res.json()
      if (data.redirectUrl) window.location.href = data.redirectUrl
    } catch {
      window.location.href = '/api/auth/handcash?returnTo=/'
    }
  }

  // Dev mode or public paths bypass paywall
  if (isDev || isPublic) return <>{children}</>

  if (paid === null) {
    return <div style={{ minHeight: '100vh', background: '#000' }} />
  }

  if (paid) return <>{children}</>

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black overflow-hidden overflow-y-auto">
      {/* Background video */}
      <video
        key={(isMobile ? MOBILE_TITLE_VIDEOS[bgVideoIdx % MOBILE_TITLE_VIDEOS.length] : BG_VIDEOS[bgVideoIdx].src)}
        src={(isMobile ? MOBILE_TITLE_VIDEOS[bgVideoIdx % MOBILE_TITLE_VIDEOS.length] : BG_VIDEOS[bgVideoIdx].src)}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        onTimeUpdate={(e) => {
          const v = e.currentTarget
          if (!isMobile && BG_VIDEOS[bgVideoIdx].halfOnly && v.duration && v.currentTime >= v.duration / 2) {
            v.pause()
            setBgVideoIdx((bgVideoIdx + 1) % BG_VIDEOS.length)
          }
        }}
        onEnded={() => setBgVideoIdx((bgVideoIdx + 1) % (isMobile ? MOBILE_TITLE_VIDEOS.length : BG_VIDEOS.length))}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />

      {/* Phone preview — left side ($401 Identity) */}
      <div
        className="absolute left-[8%] sm:left-[14%] top-[55%] z-[5] hidden lg:block"
        style={{ transform: 'translateY(-50%) rotate(-6deg) perspective(800px) rotateY(12deg)' }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 text-center mb-3" style={{ fontFamily: 'var(--font-brand)' }}>
          $402 · Content
        </p>
        {/* Phone frame */}
        <div className="relative" style={{ width: '320px' }}>
          {/* Phone bezel */}
          <div className="relative bg-gray-900 rounded-[2.5rem] p-[6px] border border-gray-700/50"
            style={{ boxShadow: '0 0 30px 6px rgba(220, 20, 60, 0.2), 0 0 60px 12px rgba(220, 20, 60, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255,255,255,0.05)' }}
          >
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-2xl z-20" />
            {/* Screen */}
            <div className="relative rounded-[2rem] overflow-hidden bg-black" style={{ height: '680px' }}>
              <video
                key={PREVIEW_VIDEOS[leftVideoIdx]}
                src={PREVIEW_VIDEOS[leftVideoIdx]}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain"
                onEnded={() => setLeftVideoIdx((leftVideoIdx + 1) % PREVIEW_VIDEOS.length)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {/* $401 badge */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
                <span className="text-3xl font-black text-red-500" style={{ fontFamily: 'var(--font-brand)', textShadow: '0 0 30px rgba(220,20,60,0.8), 0 2px 8px rgba(0,0,0,0.9)' }}>$402</span>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80">Payment Required</span>
              </div>
            </div>
            {/* Screen gloss */}
            <div className="absolute inset-0 rounded-[2rem] pointer-events-none z-10"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%)' }}
            />
            {/* Home bar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* Phone preview — right side ($403 Access) */}
      <div
        className="absolute right-[8%] sm:right-[14%] top-[55%] z-[5] hidden lg:block"
        style={{ transform: 'translateY(-50%) rotate(6deg) perspective(800px) rotateY(-12deg)' }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 text-center mb-3" style={{ fontFamily: 'var(--font-brand)' }}>
          $402 · Exchange
        </p>
        {/* Phone frame */}
        <div className="relative" style={{ width: '320px' }}>
          {/* Phone bezel */}
          <div className="relative bg-gray-900 rounded-[2.5rem] p-[6px] border border-gray-700/50"
            style={{ boxShadow: '0 0 40px 10px rgba(220, 20, 60, 0.3), 0 0 80px 20px rgba(220, 20, 60, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255,255,255,0.05)' }}
          >
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-2xl z-20" />
            {/* Screen */}
            <div className="relative rounded-[2rem] overflow-hidden bg-black" style={{ height: '680px' }}>
              <video
                key={PREVIEW_VIDEOS[rightVideoIdx]}
                src={PREVIEW_VIDEOS[rightVideoIdx]}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain"
                onEnded={() => setRightVideoIdx((rightVideoIdx + 1) % PREVIEW_VIDEOS.length)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {/* $NPGX badge */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
                <span className="text-3xl font-black text-red-500" style={{ fontFamily: 'var(--font-brand)', textShadow: '0 0 30px rgba(220,20,60,0.8), 0 2px 8px rgba(0,0,0,0.9)' }}>$NPGX</span>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80">Content Token</span>
              </div>
            </div>
            {/* Screen gloss */}
            <div className="absolute inset-0 rounded-[2rem] pointer-events-none z-10"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%)' }}
            />
            {/* Home bar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* Center content — full viewport cinematic layout */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full px-4 py-6 sm:py-8 gap-3 sm:gap-8 sm:-mt-20">

        {/* TOP: Title — huge, commanding */}
        <div className="text-center sm:mt-12">
          <h1
            className="text-white font-black text-7xl sm:text-8xl lg:text-[9rem] tracking-tighter leading-[0.82] sm:leading-[0.8] inline"
            style={{ fontFamily: 'var(--font-brand)', textShadow: '0 0 60px rgba(0,0,0,0.8)' }}
          >
            <span className="block sm:inline">NINJA</span>{' '}
            <span className="block sm:inline tracking-[0.01em]">PUNK</span>{' '}
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

        {/* Proposition block — cycles through variants */}
        <div className="text-center space-y-2 sm:space-y-4 max-w-4xl px-2">
          <p
            key={`sub-${titleVariant}`}
            className="text-[10px] sm:text-lg tracking-[0.2em] sm:tracking-[0.3em] uppercase font-bold text-red-500/70 animate-[fade-in_0.8s_ease-out]"
          >
            {TITLE_VARIANTS[titleVariant].subtitle}
          </p>
          <p
            key={`head-${titleVariant}`}
            className="text-3xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.85] animate-[fade-in_0.8s_ease-out]"
            style={{ fontFamily: 'var(--font-brand)', textShadow: '0 0 40px rgba(0,0,0,0.6)' }}
          >
            {TITLE_VARIANTS[titleVariant].headline}
          </p>
          <div className="flex items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-3">
            <div className="h-px w-8 sm:w-14 bg-gradient-to-r from-transparent to-red-500/50" />
            <p
              key={`tag-${titleVariant}`}
              className="text-sm sm:text-base text-red-500 font-black tracking-tight animate-[fade-in_0.8s_ease-out]"
            >
              {TITLE_VARIANTS[titleVariant].tagline}
            </p>
            <div className="h-px w-8 sm:w-14 bg-gradient-to-l from-transparent to-red-500/50" />
          </div>
          <p
            key={`foot-${titleVariant}`}
            className="text-[10px] sm:text-xs text-white/30 font-bold tracking-widest uppercase animate-[fade-in_0.8s_ease-out]"
          >
            {TITLE_VARIANTS[titleVariant].footer}
          </p>
          {/* Price + what's included */}
          <div className="flex items-baseline justify-center gap-2 sm:gap-3 pt-2 sm:pt-3">
            <span className="text-4xl sm:text-6xl font-black text-white" style={{ fontFamily: 'var(--font-brand)', textShadow: '0 0 30px rgba(255,255,255,0.1)' }}>$402</span>
            <span className="text-lg sm:text-xl font-bold text-white/40">.00</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
            <span className="text-[10px] sm:text-xs text-white/40 font-mono uppercase tracking-wider">ClawMiner Phone</span>
            <span className="text-white/10">+</span>
            <span className="text-[10px] sm:text-xs text-white/40 font-mono uppercase tracking-wider">$NPGX Tokens</span>
            <span className="text-white/10">+</span>
            <span className="text-[10px] sm:text-xs text-white/40 font-mono uppercase tracking-wider">AI Studio</span>
            <span className="text-white/10">+</span>
            <span className="text-[10px] sm:text-xs text-white/40 font-mono uppercase tracking-wider">Content Exchange</span>
            <span className="text-white/10">+</span>
            <span className="text-[10px] sm:text-xs text-white/40 font-mono uppercase tracking-wider">26 Characters</span>
          </div>
        </div>

        {/* CTA block */}
        <div className="text-center space-y-3 sm:space-y-4">
          {/* $NPGX Token purchase */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-red-500 font-black text-sm tracking-wider" style={{ fontFamily: 'var(--font-brand)' }}>$NPGX</span>
              <span className="text-white/30 text-[10px]">IP Licence Token</span>
            </div>
            <p className="text-white/40 text-[10px] max-w-md">
              $NPGX tokens are your ticket in. Buy tokens to generate content, trade on the exchange, and earn dividends.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 max-w-3xl mx-auto">
            <a href="/join/invest"
              className="flex flex-col items-center justify-center py-5 sm:py-6 rounded-xl sm:rounded-2xl text-center transition-all cursor-pointer border-2 border-yellow-500/30 bg-yellow-600/10 hover:bg-yellow-600/20 hover:border-yellow-500/60"
              style={{ fontFamily: 'var(--font-brand)', boxShadow: '0 0 30px rgba(245,158,11,0.15)' }}>
              <span className="text-yellow-400 text-xl sm:text-2xl font-black uppercase tracking-wider">Invest</span>
              <span className="text-yellow-400/40 text-[9px] uppercase tracking-widest mt-1">Own the Machine</span>
            </a>
            <a href="/join/direct"
              className="flex flex-col items-center justify-center py-5 sm:py-6 rounded-xl sm:rounded-2xl text-center transition-all cursor-pointer border-2 border-red-500/30 bg-red-600/10 hover:bg-red-600/20 hover:border-red-500/60"
              style={{ fontFamily: 'var(--font-brand)', boxShadow: '0 0 30px rgba(220,20,60,0.15)' }}>
              <span className="text-red-400 text-xl sm:text-2xl font-black uppercase tracking-wider">Direct</span>
              <span className="text-red-400/40 text-[9px] uppercase tracking-widest mt-1">Be the Director</span>
            </a>
            <a href="/join/star"
              className="flex flex-col items-center justify-center py-5 sm:py-6 rounded-xl sm:rounded-2xl text-center transition-all cursor-pointer border-2 border-purple-500/30 bg-purple-600/10 hover:bg-purple-600/20 hover:border-purple-500/60"
              style={{ fontFamily: 'var(--font-brand)', boxShadow: '0 0 30px rgba(168,85,247,0.15)' }}>
              <span className="text-purple-400 text-xl sm:text-2xl font-black uppercase tracking-wider">Star</span>
              <span className="text-purple-400/40 text-[9px] uppercase tracking-widest mt-1">Be the Star</span>
            </a>
            <a href="/watch"
              className="flex flex-col items-center justify-center py-5 sm:py-6 rounded-xl sm:rounded-2xl text-center transition-all cursor-pointer border-2 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
              style={{ fontFamily: 'var(--font-brand)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <span className="text-white text-xl sm:text-2xl font-black uppercase tracking-wider">Watch</span>
              <span className="text-white/30 text-[9px] uppercase tracking-widest mt-1">Music Videos</span>
            </a>
            <a href="/home"
              className="flex flex-col items-center justify-center py-5 sm:py-6 rounded-xl sm:rounded-2xl text-center transition-all cursor-pointer border-2 border-cyan-500/30 bg-cyan-600/10 hover:bg-cyan-600/20 hover:border-cyan-500/60"
              style={{ fontFamily: 'var(--font-brand)', boxShadow: '0 0 30px rgba(6,182,212,0.15)' }}>
              <span className="text-cyan-400 text-xl sm:text-2xl font-black uppercase tracking-wider">Enter</span>
              <span className="text-cyan-400/40 text-[9px] uppercase tracking-widest mt-1">Homepage</span>
            </a>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <style>{`
            @keyframes fade-in {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes glow-pulse {
              0%, 100% {
                box-shadow: 0 0 60px rgba(220, 20, 60, 0.5), 0 0 120px rgba(220, 20, 60, 0.2), 0 20px 40px rgba(0,0,0,0.5);
                text-shadow: 0 0 10px rgba(255,255,255,0.3);
              }
              50% {
                box-shadow: 0 0 100px rgba(220, 20, 60, 0.8), 0 0 200px rgba(220, 20, 60, 0.4), 0 0 300px rgba(220, 20, 60, 0.2), 0 20px 40px rgba(0,0,0,0.5);
                text-shadow: 0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(220,20,60,0.6);
              }
            }
          `}</style>
          <div className="flex items-center justify-center gap-3">
            <span className="text-red-500 text-sm font-black">18+</span>
            <span className="text-gray-500 text-xs">Adult content</span>
            <span className="text-gray-700 text-xs">·</span>
            <span className="text-gray-600 text-[10px]">HandCash · OpenClaw · Bitcoin SV</span>
          </div>
        </div>

      </div>
    </div>
  )
}
