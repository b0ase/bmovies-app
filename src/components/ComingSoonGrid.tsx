'use client'

import { cdnUrl } from '@/lib/cdn'

import { useState, useRef } from 'react'

interface Track {
  slug: string
  title: string
  japanese?: string
  genre: string
  bpm: number
  albumTitle: string
  aSide?: string
}

export function ComingSoonGrid({ tracks }: { tracks: Track[] }) {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [isListening, setIsListening] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleListen = () => {
    if (!selectedTrack?.aSide) return
    if (isListening) {
      audioRef.current?.pause()
      setIsListening(false)
      return
    }
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = 0.5
    }
    audioRef.current.src = selectedTrack.aSide
    audioRef.current.play().catch(() => {})
    setIsListening(true)
    audioRef.current.onended = () => setIsListening(false)
  }

  const handleClose = () => {
    audioRef.current?.pause()
    setIsListening(false)
    setSelectedTrack(null)
  }

  const handleBuy = () => {
    // Placeholder — would connect to $402 payment
    const purchases = JSON.parse(localStorage.getItem('npgx-video-purchases') || '[]')
    purchases.push({
      id: `nft-${Date.now()}`,
      trackSlug: selectedTrack?.slug,
      trackTitle: selectedTrack?.title,
      price: 99,
      purchasedAt: new Date().toISOString(),
    })
    localStorage.setItem('npgx-video-purchases', JSON.stringify(purchases))
    handleClose()
    // Redirect to director to create the video
    window.location.href = `/director?track=${selectedTrack?.slug}`
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tracks.map(track => (
          <button key={track.slug} onClick={() => setSelectedTrack(track)}
            className="group border border-white/5 bg-white/[0.02] hover:border-red-500/30 transition-all overflow-hidden text-left">
            <div className="aspect-video relative overflow-hidden bg-black">
              <video
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                autoPlay muted loop playsInline
                src={cdnUrl(`title-clips/${track.slug}.mp4`)}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <div className="bg-red-600 px-3 py-1 rounded text-[10px] font-[family-name:var(--font-brand)] text-white uppercase tracking-wider shadow-lg">
                  $99
                </div>
              </div>
            </div>
            <div className="p-2">
              <div className="font-[family-name:var(--font-brand)] text-white/40 group-hover:text-red-400 text-[11px] tracking-wider transition-colors">
                {track.title}
              </div>
              {track.japanese && (
                <div className="text-white/15 text-[9px] mt-0.5">{track.japanese}</div>
              )}
              <div className="text-[8px] text-white/10 mt-1">{track.genre}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Purchase modal */}
      {selectedTrack && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleClose}>
          <div className="bg-black border border-white/10 rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Title clip preview */}
            <div className="aspect-video relative bg-black">
              <video
                className="w-full h-full object-cover"
                autoPlay muted loop playsInline
                src={cdnUrl(`title-clips/${selectedTrack.slug}.mp4`)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3">
                <div className="font-[family-name:var(--font-brand)] text-white text-lg tracking-wider">{selectedTrack.title}</div>
                {selectedTrack.japanese && (
                  <div className="font-[family-name:var(--font-brand)] text-white/40 text-xs tracking-wider">{selectedTrack.japanese}</div>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 text-white/30 text-xs mb-4">
                <span>{selectedTrack.genre}</span>
                <span>•</span>
                <span>{selectedTrack.bpm} BPM</span>
                <span>•</span>
                <span className="text-red-500/60">{selectedTrack.albumTitle}</span>
              </div>

              <p className="text-white/50 text-sm mb-5 leading-relaxed">
                Commission the first-ever music video for <span className="text-white">{selectedTrack.title}</span>.
                You&apos;ll own the NFT — a unique generative music video you can sell on the exchange.
              </p>

              {/* Listen button */}
              {selectedTrack.aSide && (
                <button onClick={handleListen}
                  className={`w-full py-3 mb-3 border rounded-lg font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all ${
                    isListening
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30'
                  }`}>
                  {isListening ? '⏸ Pause Preview' : '▶ Listen to Track'}
                </button>
              )}

              {/* Buy button */}
              <button onClick={handleBuy}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all rounded-lg shadow-lg shadow-red-600/20">
                Commission Video — $99
              </button>

              <div className="text-white/15 text-[9px] text-center mt-3">
                Minted as NFT on Bitcoin • Tradeable on Exchange • $402 Protocol
              </div>

              {/* Close */}
              <button onClick={handleClose}
                className="w-full mt-4 text-white/20 hover:text-white/50 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
