'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { cdnUrl } from '@/lib/cdn'

const MOVIE = {
  title: 'ARIA VOIDSTRIKE',
  subtitle: 'The Dungeon Sessions',
  grade: 'XXX',
  duration: '0:55',
  shots: 10,
  model: 'Wan 2.2 Spicy LoRA',
  resolution: '1280x720',
  price: 0.99,
  priceSats: 2000,
  trailerUrl: cdnUrl('adult-content/aria-movie-v2/aria-voidstrike-trailer-v2.mp4'),
  fullUrl: cdnUrl('adult-content/aria-movie-v2/aria-voidstrike-xxx-v2.mp4'),
  poster: '/content/aria-voidstrike/images/avatar/aria-voidstrike-seductive.png',
  character: {
    name: 'Aria Kurosawa Voidstrike',
    token: '$ARIA',
    tagline: 'The most dangerous woman you\'ll ever want',
    slug: 'aria-voidstrike',
  },
  scenes: [
    { id: '01', title: 'Entrance', time: '0:00' },
    { id: '02', title: 'Robe Drop', time: '0:05' },
    { id: '03', title: 'On The Bed', time: '0:11' },
    { id: '04', title: 'Spread', time: '0:16' },
    { id: '05', title: 'Self Touch', time: '0:22' },
    { id: '06', title: 'Riding', time: '0:27' },
    { id: '07', title: 'From Behind', time: '0:33' },
    { id: '08', title: 'Against The Wall', time: '0:38' },
    { id: '09', title: 'Climax', time: '0:44' },
    { id: '10', title: 'Aftermath', time: '0:49' },
  ],
}

export default function AriaMoviePage() {
  const [unlocked, setUnlocked] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check localStorage for previous purchase
  useEffect(() => {
    const purchased = localStorage.getItem('npgx_movie_aria_xxx')
    if (purchased === 'true') setUnlocked(true)
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => setProgress((v.currentTime / (v.duration || 1)) * 100)
    const onEnd = () => {
      setPlaying(false)
      if (!unlocked) setShowPaywall(true)
    }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('ended', onEnd)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('ended', onEnd)
    }
  }, [unlocked])

  const handleUnlock = () => {
    // In production: trigger $402 payment flow
    // For now: unlock immediately (dev mode)
    localStorage.setItem('npgx_movie_aria_xxx', 'true')
    setUnlocked(true)
    setShowPaywall(false)
    // Switch to full video
    const v = videoRef.current
    if (v) {
      v.src = MOVIE.fullUrl
      v.load()
      v.play()
      setPlaying(true)
    }
  }

  const seekTo = (timeStr: string) => {
    const v = videoRef.current
    if (!v || !unlocked) return
    const [min, sec] = timeStr.split(':').map(Number)
    v.currentTime = min * 60 + sec
    if (v.paused) { v.play(); setPlaying(true) }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Video */}
      <div className="relative w-full max-w-md mx-auto" style={{ aspectRatio: '9/16' }}>
        <video
          ref={videoRef}
          src={unlocked ? MOVIE.fullUrl : MOVIE.trailerUrl}
          poster={MOVIE.poster}
          playsInline
          className="w-full h-full object-cover"
          onClick={togglePlay}
        />

        {/* Play overlay */}
        {!playing && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
          >
            <div className="w-20 h-20 rounded-full bg-red-600/80 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}

        {/* Grade badge */}
        <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
          {MOVIE.grade}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Lock overlay for trailer */}
        {!unlocked && progress > 90 && (
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center justify-end pb-20">
            <div className="text-center">
              <p className="text-red-400 text-sm font-mono mb-2">TRAILER ENDED</p>
              <p className="text-white text-xl font-bold mb-4">Unlock Full Movie</p>
              <button
                onClick={() => setShowPaywall(true)}
                className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors"
              >
                ${MOVIE.price} — Buy Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight">{MOVIE.title}</h1>
          <p className="text-red-400 text-lg font-mono">{MOVIE.subtitle}</p>
          <p className="text-zinc-500 text-sm mt-1">
            {MOVIE.duration} / {MOVIE.shots} scenes / {MOVIE.resolution} / AI Generated
          </p>
        </div>

        {/* Character card */}
        <Link
          href={`/npgx/${MOVIE.character.slug}`}
          className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6 hover:border-red-600/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <img
              src={MOVIE.poster}
              alt={MOVIE.character.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-red-600"
            />
            <div>
              <h3 className="font-bold">{MOVIE.character.name}</h3>
              <p className="text-red-400 text-sm font-mono">{MOVIE.character.token}</p>
              <p className="text-zinc-400 text-xs italic">{MOVIE.character.tagline}</p>
            </div>
          </div>
        </Link>

        {/* Buy button (if not unlocked) */}
        {!unlocked && (
          <button
            onClick={() => setShowPaywall(true)}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-lg font-bold text-xl mb-6 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Unlock Full Movie — ${MOVIE.price}
          </button>
        )}

        {/* Scene list */}
        <div className="mb-6">
          <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-wider mb-3">Scenes</h2>
          <div className="space-y-1">
            {MOVIE.scenes.map((scene, i) => (
              <button
                key={scene.id}
                onClick={() => seekTo(scene.time)}
                disabled={!unlocked}
                className={`w-full flex items-center justify-between py-2 px-3 rounded text-left transition-colors ${
                  unlocked
                    ? 'hover:bg-zinc-800 text-white cursor-pointer'
                    : 'text-zinc-600 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-500 w-6">{scene.id}</span>
                  <span className="text-sm">{scene.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500">{scene.time}</span>
                  {!unlocked && (
                    <svg className="w-3 h-3 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tech specs */}
        <div className="border-t border-zinc-800 pt-4 mb-6">
          <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-wider mb-3">Production</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-zinc-500">AI Model</div>
            <div className="text-zinc-300">{MOVIE.model}</div>
            <div className="text-zinc-500">Resolution</div>
            <div className="text-zinc-300">{MOVIE.resolution} Portrait</div>
            <div className="text-zinc-500">Duration</div>
            <div className="text-zinc-300">{MOVIE.duration}</div>
            <div className="text-zinc-500">Scenes</div>
            <div className="text-zinc-300">{MOVIE.shots}</div>
            <div className="text-zinc-500">Soundtrack</div>
            <div className="text-zinc-300">Tokyo Gutter Punk</div>
            <div className="text-zinc-500">Content Rating</div>
            <div className="text-red-400 font-bold">{MOVIE.grade}</div>
          </div>
        </div>

        {/* More movies */}
        <div className="border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-wider">More Movies</h2>
            <Link href="/watch" className="text-red-400 text-xs hover:text-red-300">
              Watch Free
            </Link>
          </div>
          <p className="text-zinc-600 text-sm italic">More NPGX movies coming soon...</p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-zinc-700 text-xs">
          <p>All characters are AI-generated adults (25+). No real persons depicted.</p>
          <p className="mt-1">Powered by NPGX / $402 Protocol</p>
        </div>
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold">Unlock Full Movie</h3>
              <p className="text-zinc-400 text-sm mt-1">{MOVIE.title} — {MOVIE.subtitle}</p>
            </div>

            <div className="bg-black/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Full movie ({MOVIE.duration})</span>
                <span className="text-white font-bold">${MOVIE.price}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Scenes</span>
                <span className="text-zinc-300">{MOVIE.shots} chapters</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Rating</span>
                <span className="text-red-400 font-bold">{MOVIE.grade}</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* $402 payment */}
              <button
                onClick={handleUnlock}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold transition-colors"
              >
                Pay ${MOVIE.price} with $402
              </button>

              {/* Token holders */}
              <button
                onClick={handleUnlock}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-medium transition-colors border border-zinc-600"
              >
                Redeem $ARIA Token
              </button>

              <button
                onClick={() => setShowPaywall(false)}
                className="w-full text-zinc-500 hover:text-zinc-300 py-2 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>

            <p className="text-zinc-600 text-xs text-center mt-4">
              Payment via BSV $402 micropayment. Token holders watch free.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
