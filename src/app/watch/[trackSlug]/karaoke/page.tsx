'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ALBUMS } from '@/lib/albums'
import Link from 'next/link'

const ALL_TRACKS = ALBUMS.flatMap(a =>
  a.tracks.filter(t => t.status === 'recorded').map(t => ({
    slug: t.slug, title: t.title, japanese: t.japanese, aSide: t.aSide, albumTitle: a.title,
  }))
)

interface Segment { id: number; start: number; end: number; text: string }

export default function KaraokePage() {
  const { trackSlug } = useParams<{ trackSlug: string }>()
  const track = ALL_TRACKS.find(t => t.slug === trackSlug)

  const [clips, setClips] = useState<string[]>([])
  const [currentClip, setCurrentClip] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [needsTap, setNeedsTap] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentClipRef = useRef(-1)
  const clipsRef = useRef<string[]>([])
  const segmentsRef = useRef<Segment[]>([])

  // Load clips + segments
  useEffect(() => {
    if (!trackSlug) return

    fetch(`/api/music-video-clips?track=${trackSlug}`)
      .then(r => r.json())
      .then(data => {
        const lyrics = (data.clips || []).filter((c: string) => c.includes('-lyrics-')).sort()
        setClips(lyrics)
        clipsRef.current = lyrics
      })
      .catch(() => {})

    fetch(`/music/lyrics-sync/${trackSlug}.json`)
      .then(r => r.json())
      .then(data => { segmentsRef.current = data.segments || [] })
      .catch(() => {})
  }, [trackSlug])

  // Timeupdate — proportional mapping from segments to clips
  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    const segs = segmentsRef.current
    const clps = clipsRef.current
    if (!audio || segs.length === 0 || clps.length === 0) return

    const t = audio.currentTime

    // Which segment are we in?
    let segIdx = 0
    for (let i = segs.length - 1; i >= 0; i--) {
      if (t >= segs[i].start) { segIdx = i; break }
    }

    // Map segment → clip proportionally
    const clipIdx = Math.min(
      Math.floor((segIdx / segs.length) * clps.length),
      clps.length - 1
    )

    if (clipIdx !== currentClipRef.current) {
      currentClipRef.current = clipIdx
      setCurrentClip(clipIdx)
      const v = videoRef.current
      if (v && clps[clipIdx]) {
        v.src = clps[clipIdx]
        v.load()
        v.play().catch(() => {})
      }
    }
  }, [])

  const handleStart = () => {
    if (isPlaying) return
    setNeedsTap(false)
    setIsPlaying(true)

    const audio = new Audio()
    audio.src = track?.aSide || ''
    audio.volume = 1
    audio.addEventListener('timeupdate', onTimeUpdate)
    audioRef.current = audio
    audio.play().catch(() => {})

    const clps = clipsRef.current
    if (clps[0] && videoRef.current) {
      currentClipRef.current = 0
      setCurrentClip(0)
      videoRef.current.src = clps[0]
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }

  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' } }
  }, [])

  if (!track) return <div className="fixed inset-0 bg-black flex items-center justify-center text-white">Track not found</div>

  return (
    <div className="fixed inset-0 bg-black z-[200]">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain bg-black" muted playsInline loop />

      {isPlaying && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/60 to-transparent pt-4 pb-8 px-5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <div className="font-[family-name:var(--font-brand)] text-red-500/60 text-[9px] uppercase tracking-[0.4em]">Karaoke</div>
              <div className="font-[family-name:var(--font-brand)] text-white text-sm tracking-wider">{track.title}</div>
              {track.japanese && <div className="font-[family-name:var(--font-brand)] text-white/30 text-xs">{track.japanese}</div>}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/20 text-[10px] font-mono">{currentClip + 1} / {clips.length}</span>
              <Link href={`/watch/${trackSlug}`}
                className="text-white/20 hover:text-white/50 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-colors">
                Full Video →
              </Link>
            </div>
          </div>
        </div>
      )}

      {needsTap && (
        <div className="absolute inset-0 z-50 flex items-center justify-center cursor-pointer bg-black/70" onClick={handleStart}>
          <div className="text-center group">
            <div className="font-[family-name:var(--font-brand)] text-red-500/60 text-xs uppercase tracking-[0.5em] mb-3">Karaoke</div>
            <div className="font-[family-name:var(--font-brand)] text-white text-3xl md:text-5xl uppercase tracking-[0.2em] mb-2">{track.title}</div>
            {track.japanese && <div className="font-[family-name:var(--font-brand)] text-white/30 text-lg mb-8">{track.japanese}</div>}
            <div className="flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg viewBox="0 0 40 46" className="w-16 h-20 drop-shadow-[0_0_30px_rgba(220,20,60,0.5)]">
                <polygon points="4,0 40,23 4,46" fill="#dc2626" />
              </svg>
            </div>
            <div className="font-[family-name:var(--font-brand)] text-white/20 text-[10px] uppercase tracking-[0.5em]">Sing Along</div>
          </div>
        </div>
      )}
    </div>
  )
}
