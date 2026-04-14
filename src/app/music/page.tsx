'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  FaPlay, FaPause, FaStepForward, FaStepBackward,
  FaVolumeUp, FaVolumeMute, FaRandom, FaRedo, FaMusic,
  FaCompactDisc, FaLink, FaCheck, FaLock
} from 'react-icons/fa'
import { useMusic, ALBUMS, type MusicAlbum } from '@/hooks/MusicProvider'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

export default function MusicPage() {
  const {
    isPlaying, currentTrack, currentTrackInfo, musicTracks,
    progress, duration, volume, isMuted, shuffle, repeat,
    toggle, next, previous, playTrackByIndex, seekTo,
    setVolume, setMuted, setShuffle, setRepeat,
  } = useMusic()

  const [activeAlbum, setActiveAlbum] = useState<string>('all')
  const [inscribing, setInscribing] = useState<number | null>(null)
  const [inscribed, setInscribed] = useState<Set<number>>(new Set())

  // Get tracks for current view
  const displayTracks = activeAlbum === 'all'
    ? musicTracks
    : musicTracks.filter(t => t.album === activeAlbum)

  // Map track to its global index
  const getGlobalIndex = (displayIdx: number) => {
    const track = displayTracks[displayIdx]
    return musicTracks.findIndex(t => t.url === track.url)
  }

  // Assign characters to tracks for artwork
  const getTrackGirl = (idx: number) => NPGX_ROSTER[idx % NPGX_ROSTER.length]
  const getAlbumForTrack = (track: typeof musicTracks[0]) =>
    ALBUMS.find(a => a.id === track.album)

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // Inscribe track on-chain ($0.05)
  const inscribeTrack = useCallback(async (globalIdx: number) => {
    const track = musicTracks[globalIdx]
    if (!track) return

    setInscribing(globalIdx)
    try {
      // Hash the track URL as content identifier
      const encoder = new TextEncoder()
      const data = encoder.encode(track.url + track.title)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // Pay via HandCash
      const payRes = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 0.05,
          currency: 'USD',
          description: `Inscribe: ${track.title}`,
          tag: 'music-inscription',
        }),
      })

      if (!payRes.ok) {
        const err = await payRes.json()
        alert(err.error || 'Payment failed — sign in with HandCash')
        return
      }

      // Attest on-chain
      const attestRes = await fetch('/api/content/attest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentHash,
          contentType: 'music',
          metadata: {
            title: track.title,
            artist: track.artist,
            album: track.album,
            genre: track.genre,
            bpm: track.bpm,
          },
        }),
      })

      if (attestRes.ok) {
        setInscribed(prev => new Set([...prev, globalIdx]))
      }
    } catch (err) {
      console.error('Inscription failed:', err)
    } finally {
      setInscribing(null)
    }
  }, [musicTracks])

  const currentAlbum = getAlbumForTrack(currentTrackInfo)
  const currentGirl = getTrackGirl(currentTrack)

  return (
    <div className="min-h-screen pt-20 pb-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter mb-3" style={{ fontFamily: 'var(--font-brand)' }}>
            MUSIC
          </h1>
          <p className="text-gray-500 text-lg">
            Original NPGX soundtrack — Japanese punk, cyberpunk rock, and underground beats.
            <span className="text-red-500/60 ml-2">{musicTracks.length} tracks</span>
          </p>
        </div>

        {/* Album Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* All tracks */}
          <button
            onClick={() => setActiveAlbum('all')}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
              activeAlbum === 'all'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center shrink-0">
              <FaMusic className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">All Tracks</p>
              <p className="text-gray-500 text-xs">{musicTracks.length} tracks</p>
            </div>
          </button>

          {ALBUMS.map(album => (
            <button
              key={album.id}
              onClick={() => setActiveAlbum(album.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                activeAlbum === album.id
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-zinc-900">
                <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{album.title}</p>
                <p className="text-gray-600 text-xs">{album.titleJa}</p>
                <p className="text-gray-500 text-xs">{album.tracks.length} tracks &middot; {album.year}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Now Playing Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 bg-gradient-to-br from-red-500/10 to-pink-500/5 rounded-2xl p-6 sm:p-8 border border-red-500/20"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Album art */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-zinc-900 relative">
              <img
                src={currentAlbum?.cover || currentGirl.image}
                alt={currentTrackInfo.title}
                className={`w-full h-full object-cover ${isPlaying ? '' : 'opacity-60'}`}
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <FaCompactDisc className="w-8 h-8 text-red-500 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left w-full">
              <p className="text-xs text-red-500/60 font-mono uppercase tracking-widest mb-1">Now Playing</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-1">{currentTrackInfo.title}</h2>
              <p className="text-gray-500 font-mono text-sm mb-1">{currentTrackInfo.romanji}</p>
              <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-gray-600 font-mono mb-4 flex-wrap">
                <span>{currentTrackInfo.genre}</span>
                {currentTrackInfo.bpm && (
                  <>
                    <span className="text-gray-800">&bull;</span>
                    <span>{currentTrackInfo.bpm} BPM</span>
                  </>
                )}
                {currentTrackInfo.side && (
                  <>
                    <span className="text-gray-800">&bull;</span>
                    <span className="text-red-500/60">Side {currentTrackInfo.side}</span>
                  </>
                )}
                {currentAlbum && (
                  <>
                    <span className="text-gray-800">&bull;</span>
                    <span className="text-red-400/50">{currentAlbum.title}</span>
                  </>
                )}
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono text-gray-600 w-10 text-right">{formatTime(progress)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={progress}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-red-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-gray-600 w-10">{formatTime(duration)}</span>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center sm:justify-start gap-4">
                <button
                  onClick={() => setShuffle(!shuffle)}
                  className={`transition-colors ${shuffle ? 'text-red-500' : 'text-gray-600 hover:text-gray-400'}`}
                  title="Shuffle"
                >
                  <FaRandom className="w-3.5 h-3.5" />
                </button>
                <button onClick={previous} className="text-gray-400 hover:text-white transition-colors" title="Previous">
                  <FaStepBackward className="w-4 h-4" />
                </button>
                <button
                  onClick={toggle}
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
                >
                  {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 ml-0.5" />}
                </button>
                <button onClick={next} className="text-gray-400 hover:text-white transition-colors" title="Next">
                  <FaStepForward className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRepeat(!repeat)}
                  className={`transition-colors ${repeat ? 'text-red-500' : 'text-gray-600 hover:text-gray-400'}`}
                  title="Repeat"
                >
                  <FaRedo className="w-3.5 h-3.5" />
                </button>
                <div className="hidden sm:flex items-center gap-2 ml-4">
                  <button onClick={() => setMuted(!isMuted)} className="text-gray-600 hover:text-gray-400 transition-colors">
                    {isMuted ? <FaVolumeMute className="w-3.5 h-3.5" /> : <FaVolumeUp className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 accent-red-500 cursor-pointer"
                  />
                </div>

                {/* Inscribe current track */}
                <button
                  onClick={() => inscribeTrack(currentTrack)}
                  disabled={inscribing === currentTrack || inscribed.has(currentTrack)}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                    inscribed.has(currentTrack)
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white'
                  }`}
                  title="Inscribe on-chain ($0.05)"
                >
                  {inscribing === currentTrack ? (
                    <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  ) : inscribed.has(currentTrack) ? (
                    <FaCheck className="w-2.5 h-2.5" />
                  ) : (
                    <FaLink className="w-2.5 h-2.5" />
                  )}
                  {inscribed.has(currentTrack) ? 'ON-CHAIN' : '$0.05'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Track List */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-4 px-4 py-2 bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Title</span>
            <span className="hidden sm:block w-28">Genre</span>
            <span className="hidden sm:block w-16 text-center">BPM</span>
            <span className="hidden md:block w-32">Album</span>
            <span className="w-20 text-center">Chain</span>
          </div>

          {displayTracks.map((track, displayIdx) => {
            const globalIdx = getGlobalIndex(displayIdx)
            const isCurrentTrack = globalIdx === currentTrack
            const girl = getTrackGirl(globalIdx)
            const album = getAlbumForTrack(track)

            return (
              <motion.div
                key={track.url}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                onClick={() => playTrackByIndex(globalIdx)}
                className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors border-b border-white/5 last:border-0 ${
                  isCurrentTrack ? 'bg-red-500/5' : ''
                }`}
              >
                {/* Track number / equalizer */}
                <span className={`w-8 text-center font-mono text-sm ${isCurrentTrack ? 'text-red-500' : 'text-gray-600'}`}>
                  {isCurrentTrack && isPlaying ? (
                    <span className="inline-flex items-end gap-0.5 h-4">
                      <motion.span className="w-0.5 bg-red-500" animate={{ height: [3, 14, 5, 11, 3] }} transition={{ duration: 0.7, repeat: Infinity }} />
                      <motion.span className="w-0.5 bg-red-500" animate={{ height: [8, 3, 12, 4, 8] }} transition={{ duration: 0.7, repeat: Infinity, delay: 0.15 }} />
                      <motion.span className="w-0.5 bg-red-500" animate={{ height: [5, 10, 3, 14, 5] }} transition={{ duration: 0.7, repeat: Infinity, delay: 0.3 }} />
                    </span>
                  ) : (
                    displayIdx + 1
                  )}
                </span>

                {/* Character avatar + title */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-zinc-900">
                    <img
                      src={album?.cover || girl.image}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold truncate ${isCurrentTrack ? 'text-red-400' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className="text-xs text-gray-600 font-mono truncate">
                      {track.romanji}
                      {track.side && <span className="text-gray-700 ml-1.5">Side {track.side}</span>}
                    </p>
                  </div>
                </div>

                {/* Genre */}
                <span className="hidden sm:block w-28 text-xs text-gray-500 font-mono truncate">{track.genre}</span>

                {/* BPM */}
                <span className="hidden sm:block w-16 text-center text-xs text-gray-600 font-mono">{track.bpm}</span>

                {/* Album */}
                <span className="hidden md:block w-32 text-xs text-gray-600 font-mono truncate">
                  {album ? album.title : 'Single'}
                </span>

                {/* Inscribe button */}
                <div className="w-20 flex justify-center" onClick={(e) => e.stopPropagation()}>
                  {inscribed.has(globalIdx) ? (
                    <span className="text-purple-400 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <FaCheck className="w-2 h-2" />
                      Owned
                    </span>
                  ) : (
                    <button
                      onClick={() => inscribeTrack(globalIdx)}
                      disabled={inscribing === globalIdx}
                      className="text-gray-600 hover:text-red-400 text-[9px] font-bold uppercase tracking-wider transition flex items-center gap-1"
                      title="Inscribe on-chain ($0.05)"
                    >
                      {inscribing === globalIdx ? (
                        <div className="w-2.5 h-2.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <FaLink className="w-2 h-2" />
                      )}
                      $0.05
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-700 text-xs font-mono">
            {musicTracks.length} tracks &middot; {ALBUMS.length} albums &middot; NPGX Original Soundtrack
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/mixer"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 font-semibold transition-colors"
            >
              <FaMusic /> Open in Mixer &rarr;
            </Link>
            <Link
              href="/music-gen"
              className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-400 font-semibold transition-colors"
            >
              <FaMusic /> Generate new tracks &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
