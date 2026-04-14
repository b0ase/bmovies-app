'use client'

import { useState, useEffect, useRef } from 'react'
import { ALBUMS } from '@/lib/albums'
import Link from 'next/link'

interface KaraokeClip {
  clipNum: number; startTime: number; endTime: number; lyrics: string; prompt: string
}

interface TimelineClip {
  id: string; layer: 'karaoke' | 'singing' | 'cinematic'
  startTime: number; endTime: number; prompt: string; lyrics?: string
  videoUrl?: string; status: 'prompt' | 'generating' | 'done'
}

const allTracks = ALBUMS.flatMap(a =>
  a.tracks.filter(t => t.status === 'recorded').map(t => ({ slug: t.slug, title: t.title, japanese: t.japanese, genre: t.genre, bpm: t.bpm, aSide: t.aSide, album: a.title }))
)

export default function MusicVideoEditorPage() {
  const [selectedTrack, setSelectedTrack] = useState<typeof allTracks[0] | null>(null)
  const [karaokeClips, setKaraokeClips] = useState<KaraokeClip[]>([])
  const [timeline, setTimeline] = useState<TimelineClip[]>([])
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playInterval = useRef<ReturnType<typeof setInterval>>()
  const [zoom, setZoom] = useState(8) // pixels per second

  // Load karaoke when track selected
  useEffect(() => {
    if (!selectedTrack) return
    setLoading(true)
    fetch(`/api/karaoke?track=${selectedTrack.slug}`)
      .then(r => r.json())
      .then(data => {
        setKaraokeClips(data.clips || [])
        // Auto-populate karaoke layer
        const tl: TimelineClip[] = (data.clips || []).map((c: KaraokeClip) => ({
          id: `karaoke-${c.clipNum}`,
          layer: 'karaoke' as const,
          startTime: c.startTime,
          endTime: c.endTime,
          prompt: c.prompt,
          lyrics: c.lyrics,
          status: 'prompt' as const,
        }))
        setTimeline(tl)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Setup audio
    const audio = new Audio()
    audio.preload = 'auto'
    if (selectedTrack.aSide) { audio.src = selectedTrack.aSide; audio.load() }
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [selectedTrack])

  // Playhead sync
  useEffect(() => {
    if (isPlaying) {
      playInterval.current = setInterval(() => {
        if (audioRef.current) setPlayhead(audioRef.current.currentTime)
      }, 50)
    }
    return () => { if (playInterval.current) clearInterval(playInterval.current) }
  }, [isPlaying])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play().catch(() => {}); setIsPlaying(true) }
  }

  const seek = (time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setPlayhead(time) }
  }

  const duration = karaokeClips.length > 0 ? karaokeClips[karaokeClips.length - 1].endTime : 0
  const timelineWidth = duration * zoom

  const copyAllPrompts = () => {
    const text = timeline
      .filter(c => c.layer === 'karaoke')
      .map((c, i) => `--- ${i + 1}/${timeline.filter(t => t.layer === 'karaoke').length} | ${c.startTime}-${c.endTime}s | SAVE AS: ${selectedTrack?.slug}-karaoke-${String(i + 1).padStart(2, '0')}.mp4 ---\n${c.prompt}\n`)
      .join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-[family-name:var(--font-brand)] text-2xl tracking-wider">MUSIC VIDEO EDITOR</h1>
            <p className="text-gray-500 text-xs">Three-layer timeline: Karaoke → Singing → Cinematic</p>
          </div>
          <div className="flex gap-2">
            <Link href="/music-videos" className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/40 text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider hover:text-white/60 transition-colors">← Videos</Link>
          </div>
        </div>

        {/* Track selector */}
        {!selectedTrack && (
          <div>
            <h2 className="font-[family-name:var(--font-brand)] text-sm text-red-400 mb-3">SELECT TRACK</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {allTracks.map(t => (
                <button key={t.slug} onClick={() => setSelectedTrack(t)}
                  className="text-left p-3 border border-white/10 bg-white/5 hover:border-red-500/30 transition-all">
                  <div className="font-[family-name:var(--font-brand)] text-white text-xs">{t.title}</div>
                  {t.japanese && <div className="text-white/20 text-[9px]">{t.japanese}</div>}
                  <div className="text-white/15 text-[8px] mt-1">{t.genre} • {t.bpm}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor */}
        {selectedTrack && (
          <div>
            {/* Track info + controls */}
            <div className="flex items-center gap-4 mb-4 border border-white/10 bg-white/5 p-3">
              <div className="flex-1">
                <div className="font-[family-name:var(--font-brand)] text-white text-sm">{selectedTrack.title}</div>
                <div className="text-white/30 text-[10px]">{selectedTrack.genre} • {selectedTrack.bpm} BPM • {duration.toFixed(0)}s</div>
              </div>
              <button onClick={togglePlay}
                className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full transition-all">
                {isPlaying
                  ? <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg viewBox="0 0 40 46" className="w-3 h-4 fill-white ml-0.5"><polygon points="4,0 40,23 4,46"/></svg>
                }
              </button>
              <div className="text-white/40 text-xs font-mono w-20 text-right">{playhead.toFixed(1)}s / {duration.toFixed(0)}s</div>
              <button onClick={() => setSelectedTrack(null)} className="text-white/20 hover:text-white/50 text-xs">✕</button>
            </div>

            {/* Layer controls */}
            <div className="flex gap-2 mb-3">
              <button onClick={copyAllPrompts}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-[family-name:var(--font-brand)] uppercase tracking-wider transition-all">
                Copy Karaoke Prompts
              </button>
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-white/20 text-[9px]">Zoom</span>
                <input type="range" min={4} max={20} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-20 h-1 accent-red-500"/>
              </div>
            </div>

            {/* Timeline */}
            <div className="border border-white/10 bg-white/[0.02] overflow-x-auto relative">
              {/* Time ruler */}
              <div className="h-5 border-b border-white/10 relative" style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
                {Array.from({ length: Math.ceil(duration / 5) }, (_, i) => (
                  <div key={i} className="absolute top-0 h-full border-l border-white/5" style={{ left: `${i * 5 * zoom}px` }}>
                    <span className="text-[8px] text-white/20 ml-1">{i * 5}s</span>
                  </div>
                ))}
                {/* Playhead */}
                <div className="absolute top-0 h-full w-0.5 bg-red-500 z-10" style={{ left: `${playhead * zoom}px` }} />
              </div>

              {/* Cinematic layer */}
              <div className="h-12 border-b border-white/5 relative" style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
                <div className="absolute left-0 top-0 h-full w-16 bg-blue-600/10 border-r border-white/10 flex items-center justify-center z-10">
                  <span className="text-[8px] text-blue-400 font-[family-name:var(--font-brand)] uppercase tracking-wider">Cinema</span>
                </div>
                {timeline.filter(c => c.layer === 'cinematic').map(c => (
                  <div key={c.id} className="absolute top-1 h-10 bg-blue-600/20 border border-blue-500/30 rounded-sm flex items-center px-1 overflow-hidden"
                    style={{ left: `${c.startTime * zoom + 64}px`, width: `${(c.endTime - c.startTime) * zoom}px` }}>
                    <span className="text-[7px] text-blue-300 truncate">{c.lyrics || 'cinematic'}</span>
                  </div>
                ))}
              </div>

              {/* Singing layer */}
              <div className="h-12 border-b border-white/5 relative" style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
                <div className="absolute left-0 top-0 h-full w-16 bg-pink-600/10 border-r border-white/10 flex items-center justify-center z-10">
                  <span className="text-[8px] text-pink-400 font-[family-name:var(--font-brand)] uppercase tracking-wider">Singing</span>
                </div>
                {timeline.filter(c => c.layer === 'singing').map(c => (
                  <div key={c.id} className="absolute top-1 h-10 bg-pink-600/20 border border-pink-500/30 rounded-sm flex items-center px-1 overflow-hidden"
                    style={{ left: `${c.startTime * zoom + 64}px`, width: `${(c.endTime - c.startTime) * zoom}px` }}>
                    <span className="text-[7px] text-pink-300 truncate">{c.lyrics || 'singing'}</span>
                  </div>
                ))}
              </div>

              {/* Karaoke layer */}
              <div className="h-14 relative" style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
                <div className="absolute left-0 top-0 h-full w-16 bg-red-600/10 border-r border-white/10 flex items-center justify-center z-10">
                  <span className="text-[8px] text-red-400 font-[family-name:var(--font-brand)] uppercase tracking-wider">Karaoke</span>
                </div>
                {timeline.filter(c => c.layer === 'karaoke').map(c => (
                  <div key={c.id}
                    className={`absolute top-1 h-12 rounded-sm flex items-center px-1.5 overflow-hidden cursor-pointer transition-all hover:brightness-125 ${
                      c.lyrics === '...' ? 'bg-white/5 border border-white/5' : 'bg-red-600/15 border border-red-500/25'
                    }`}
                    style={{ left: `${c.startTime * zoom + 64}px`, width: `${(c.endTime - c.startTime) * zoom}px` }}
                    onClick={() => seek(c.startTime)}>
                    <span className="text-[7px] text-white/50 truncate leading-tight">{c.lyrics}</span>
                  </div>
                ))}
                {/* Playhead */}
                <div className="absolute top-0 h-full w-0.5 bg-red-500 z-10" style={{ left: `${playhead * zoom + 64}px` }} />
              </div>
            </div>

            {/* Clip list */}
            {loading ? (
              <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-400 mx-auto" /></div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {karaokeClips.map(c => (
                  <div key={c.clipNum} className="border border-white/10 bg-white/[0.03] p-2 hover:border-red-500/30 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-[family-name:var(--font-brand)] text-red-500 text-[10px]">{String(c.clipNum).padStart(2, '0')}</span>
                      <span className="text-white/20 text-[9px]">{c.startTime}-{c.endTime}s</span>
                    </div>
                    <div className="text-white/50 text-[10px] mb-1 line-clamp-1">{c.lyrics}</div>
                    <button onClick={() => navigator.clipboard.writeText(c.prompt)}
                      className="text-[8px] text-white/15 hover:text-red-400 transition-colors">Copy prompt</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
