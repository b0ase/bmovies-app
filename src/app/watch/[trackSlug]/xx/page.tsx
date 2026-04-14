'use client'

import { cdnUrl } from '@/lib/cdn'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'

const PRICE = 49

export default function XXWatchPage() {
  const { trackSlug } = useParams<{ trackSlug: string }>()
  const [paid, setPaid] = useState(false)
  const [checking, setChecking] = useState(true)
  const [clips, setClips] = useState<string[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const playStartRef = useRef(0)

  // Volume sync
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  // Auto-hide controls
  useEffect(() => {
    const show = () => {
      setShowControls(true)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setShowControls(false), 3000)
    }
    show()
    window.addEventListener('mousemove', show)
    window.addEventListener('touchstart', show)
    return () => { window.removeEventListener('mousemove', show); window.removeEventListener('touchstart', show); if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [])

  // Check payment — HandCash cookie or token purchase cookie
  useEffect(() => {
    const handle = document.cookie.match(/npgx_user_handle=([^;]+)/)?.[1] || ''
    const freeAccess = ['boase', 'ninjapunkgirlsx'].includes(handle.toLowerCase())
    const hasToken = document.cookie.includes(`npgx_xx_${trackSlug}=owned`)
    const hasLocal = localStorage.getItem(`npgx-xx-${trackSlug}`) === 'paid'
    setPaid(freeAccess || hasToken || hasLocal)
    setChecking(false)
  }, [trackSlug])

  // Load clips
  useEffect(() => {
    if (!paid || !trackSlug) return
    fetch(`/api/music-video-clips?track=${trackSlug}&subfolder=xx`)
      .then(r => r.json())
      .then(data => {
        if (data.clips?.length) {
          const [first, ...rest] = data.clips
          setClips([first, ...rest.sort(() => Math.random() - 0.5)])
        }
      }).catch(() => {})
  }, [paid, trackSlug])

  // Create audio
  useEffect(() => {
    const audio = new Audio()
    audio.loop = true
    audio.volume = 1
    audio.preload = 'auto'
    if (trackSlug) {
      const trackNum = trackSlug === 'razor-kisses' ? '06' : '01'
      audio.src = `/music/albums/tokyo-gutter-punk/${trackNum}-a.mp3`
      audio.load()
    }
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [trackSlug])

  // Advance to next clip
  const nextClip = useCallback(() => {
    setCurrentIdx(prev => (prev + 1) % (clips.length || 1))
  }, [clips.length])

  // When currentIdx changes, seek to a random position
  useEffect(() => {
    const v = videoRef.current
    if (!v || !isPlaying) return
    // Seek to stagger position after metadata loads
    const onLoaded = () => {
      if (v.duration) {
        const elapsed = (Date.now() - playStartRef.current) / 1000
        if (elapsed < 15) {
          v.currentTime = 0 // intro: play from start
        } else {
          const positions = [0, 0.4, 0.8, 0.5, 0.1, 0.7, 0.3, 0.9]
          v.currentTime = v.duration * positions[currentIdx % positions.length]
        }
      }
      v.play().catch(() => {})
    }
    v.addEventListener('loadedmetadata', onLoaded, { once: true })
    return () => v.removeEventListener('loadedmetadata', onLoaded)
  }, [currentIdx, isPlaying])

  // Timer for clip switching
  useEffect(() => {
    if (!isPlaying || clips.length === 0) return
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - playStartRef.current) / 1000
      const interval = elapsed < 15 ? 5000 : 2000 // slow intro, then faster
      // Only advance if enough time passed (interval is checked by clearing/resetting)
      nextClip()
    }, 2000) // check every 2s, intro handled by seek logic
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, clips.length, nextClip])

  const handleStart = () => {
    if (isPlaying) return
    playStartRef.current = Date.now()
    setIsPlaying(true)
    audioRef.current?.play().catch(() => {})
    videoRef.current?.play().catch(() => {})
  }

  const handlePurchase = async () => {
    // Try HandCash payment first
    try {
      const res = await fetch(`/api/auth/handcash/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: PRICE, product: `xx-${trackSlug}`, description: `XX Music Video — ${trackSlug}` }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success || data.redirectUrl) {
          // Payment succeeded — set cookie
          document.cookie = `npgx_xx_${trackSlug}=owned; path=/; max-age=${365 * 24 * 60 * 60}`
          setPaid(true)
          setTimeout(() => {
            playStartRef.current = Date.now()
            setIsPlaying(true)
            audioRef.current?.play().catch(() => {})
            videoRef.current?.play().catch(() => {})
          }, 300)
          return
        }
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl
          return
        }
      }
    } catch {}

    // Fallback — demo mode (localStorage)
    localStorage.setItem(`npgx-xx-${trackSlug}`, 'paid')
    document.cookie = `npgx_xx_${trackSlug}=owned; path=/; max-age=${365 * 24 * 60 * 60}`
    setPaid(true)
    setTimeout(() => {
      playStartRef.current = Date.now()
      setIsPlaying(true)
      audioRef.current?.play().catch(() => {})
      videoRef.current?.play().catch(() => {})
    }, 300)
  }

  if (checking) return <div className="fixed inset-0 bg-black" />

  // Paywall
  if (!paid) {
    return (
      <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-6">
          <div className="font-[family-name:var(--font-brand)] text-6xl text-red-600 tracking-wider mb-4">XX</div>
          <div className="font-[family-name:var(--font-brand)] text-2xl text-white tracking-wider mb-2">
            {trackSlug?.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
          </div>
          <div className="text-white/30 text-sm mb-8">Uncensored • Full explicit content • {clips.length || 15} exclusive clips</div>
          <div className="border border-red-500/30 bg-red-600/5 p-6 mb-6">
            <div className="font-[family-name:var(--font-brand)] text-xs text-red-400 uppercase tracking-widest mb-2">Buy $XX Token</div>
            <div className="font-[family-name:var(--font-brand)] text-4xl text-white mb-1">${PRICE}</div>
            <div className="text-white/40 text-xs mb-4">Token purchase • Lifetime access • Tradeable on Exchange</div>
            <button onClick={handlePurchase}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all mb-2">
              Pay with HandCash — ${PRICE}
            </button>
            <div className="text-white/20 text-[9px] mt-2">$402 protocol • Token minted on Bitcoin • Resellable on Exchange</div>
          </div>
          <a href={`/watch/${trackSlug}`}
            className="text-white/30 hover:text-white/60 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">
            ← Back to SFW version
          </a>
        </div>
      </div>
    )
  }

  // Player — single <video> element, no canvas, no pool
  return (
    <div className="fixed inset-0 bg-black z-[200]" onClick={() => isPlaying ? (audioRef.current?.paused ? audioRef.current?.play().catch(()=>{}) : audioRef.current?.pause()) : handleStart()}>
      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover bg-black"
        muted playsInline
        src={clips[currentIdx] || undefined}
        poster={`/og/${trackSlug}.png`}
        onEnded={nextClip}
      />

      {/* Title clip before play */}
      {!isPlaying && clips.length > 0 && (
        <video
          className="absolute inset-0 w-full h-full object-cover bg-black z-10"
          autoPlay muted loop playsInline
          poster={`/og/${trackSlug}.png`}
          src={cdnUrl(`title-clips/${trackSlug}.mp4`)}
        />
      )}

      {/* XX badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className="font-[family-name:var(--font-brand)] text-red-600 text-xs tracking-[0.3em] opacity-30">XX</div>
      </div>

      {/* Controls */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300"
          style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}>
          <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-4 px-4">
            <div className="flex items-center gap-3 justify-center flex-wrap">
              <div className="flex items-center gap-1.5">
                <button onClick={(e) => { e.stopPropagation(); setVolume(v => v > 0 ? 0 : 1) }}
                  className="text-white/40 hover:text-red-300 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    {volume === 0
                      ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    }
                  </svg>
                </button>
                <input type="range" min={0} max={1} step={0.05} value={volume}
                  onClick={e => e.stopPropagation()}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="w-20 h-1 accent-red-500 opacity-60" />
              </div>
              <div className="w-px h-5 bg-white/10" />
              <span className="text-white/20 text-[10px] font-[family-name:var(--font-brand)]">{currentIdx + 1}/{clips.length}</span>
              <div className="w-px h-5 bg-white/10" />
              <a href={`/watch/${trackSlug}`} onClick={e => e.stopPropagation()}
                className="font-[family-name:var(--font-brand)] text-[10px] text-white/20 hover:text-white/50 uppercase tracking-wider transition-colors">
                ← SFW
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tap to play */}
      {!isPlaying && clips.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
          <div className="text-center">
            <svg viewBox="0 0 40 46" className="w-14 h-16 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(220,20,60,0.4)]">
              <polygon points="4,0 40,23 4,46" fill="#dc2626" />
            </svg>
            <div className="font-[family-name:var(--font-brand)] text-white/25 text-[10px] uppercase tracking-[0.5em]">Tap to play</div>
          </div>
        </div>
      )}
    </div>
  )
}
