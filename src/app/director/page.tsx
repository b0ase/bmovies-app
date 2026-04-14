'use client'

import { useState, useCallback } from 'react'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { ALBUMS } from '@/lib/albums'
import Link from 'next/link'
import Image from 'next/image'

const ROLES = [
  { id: 'singer', name: 'Singer' },
  { id: 'guitarist', name: 'Guitar' },
  { id: 'bassist', name: 'Bass' },
  { id: 'drummer', name: 'Drums' },
  { id: 'dj', name: 'DJ' },
  { id: 'lead', name: 'Lead' },
]

interface CastMember { slug: string; name: string; role: string }
interface Shot {
  segNum: number; timeRange: string; clipType: string
  characters: string[]; lyrics: string; action: string; prompt: string
}

export default function DirectorPage() {
  const [step, setStep] = useState<'setup' | 'directing' | 'result'>('setup')

  // Setup
  const [selectedTrack, setSelectedTrack] = useState<any>(null)
  const [cast, setCast] = useState<CastMember[]>([])

  // Result
  const [story, setStory] = useState('')
  const [description, setDescription] = useState('')
  const [shots, setShots] = useState<Shot[]>([])
  const [generating, setGenerating] = useState(false)

  // Movie generation
  const [generatingMovie, setGeneratingMovie] = useState(false)
  const [movieProgress, setMovieProgress] = useState({ done: 0, total: 0 })

  const allTracks = ALBUMS.flatMap(album =>
    album.tracks.filter(t => t.status === 'recorded').map(t => ({ album, track: t }))
  )

  const toggleCast = (char: any) => {
    setCast(prev => {
      const exists = prev.find(c => c.slug === char.slug)
      if (exists) return prev.filter(c => c.slug !== char.slug)
      return [...prev, { slug: char.slug, name: char.name, role: 'singer' }]
    })
  }

  const setRole = (slug: string, role: string) => {
    setCast(prev => prev.map(c => c.slug === slug ? { ...c, role } : c))
  }

  const handleDirect = useCallback(async () => {
    if (!selectedTrack || cast.length === 0) return
    setGenerating(true)
    setStep('directing')

    try {
      const res = await fetch('/api/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackSlug: selectedTrack.track.slug,
          trackTitle: selectedTrack.track.title,
          trackJapanese: selectedTrack.track.japanese,
          genre: selectedTrack.track.genre,
          bpm: selectedTrack.track.bpm,
          cast,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setStory(data.story)
        setDescription(data.description)
        setShots(data.segments)
        setStep('result')
      }
    } catch (e) {
      console.error('Director failed:', e)
    } finally {
      setGenerating(false)
    }
  }, [selectedTrack, cast])

  const handleGenerateMovie = useCallback(async () => {
    if (!selectedTrack || shots.length === 0) return
    setGeneratingMovie(true)
    setMovieProgress({ done: 0, total: shots.length })

    try {
      const res = await fetch('/api/storyboard/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackSlug: selectedTrack.track.slug,
          segments: shots.map(s => ({ segNum: s.segNum, prompt: s.prompt, clipType: s.clipType })),
          model: 'seedance',
          orientation: 'landscape',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMovieProgress({ done: 0, total: data.submitted })

        // Poll
        let jobs = data.jobs
        const poll = setInterval(async () => {
          const pending = jobs.filter((j: any) => j.status === 'pending')
          if (pending.length === 0) { clearInterval(poll); setGeneratingMovie(false); return }

          const pollRes = await fetch('/api/storyboard/poll-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackSlug: selectedTrack.track.slug, jobs }),
          })
          if (pollRes.ok) {
            const d = await pollRes.json()
            jobs = d.jobs
            setMovieProgress({ done: d.done, total: d.done + d.pending + d.failed })
          }
        }, 15000)
      }
    } catch {
      setGeneratingMovie(false)
    }
  }, [selectedTrack, shots])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-brand)] text-4xl tracking-wider mb-1">DIRECTOR</h1>
          <p className="text-gray-500 text-sm">AI-directed music videos with narrative cohesion</p>
        </div>

        {/* SETUP */}
        {step === 'setup' && (
          <div>
            {/* Pick track */}
            <h2 className="font-[family-name:var(--font-brand)] text-sm text-red-400 mb-3">PICK A TRACK</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-8">
              {allTracks.map(({ album, track }) => (
                <button key={track.slug} onClick={() => setSelectedTrack({ album, track })}
                  className={`text-left p-3 border transition-all ${
                    selectedTrack?.track.slug === track.slug ? 'bg-red-600/20 border-red-500' : 'bg-white/5 border-white/10 hover:border-red-500/30'
                  }`}>
                  <div className="font-[family-name:var(--font-brand)] text-white text-xs">{track.title}</div>
                  {track.japanese && <div className="text-white/30 text-[10px] mt-0.5">{track.japanese}</div>}
                  <div className="text-white/20 text-[9px] mt-1">{track.genre} • {track.bpm} BPM</div>
                </button>
              ))}
            </div>

            {/* Cast */}
            <h2 className="font-[family-name:var(--font-brand)] text-sm text-red-400 mb-3">CAST YOUR BAND</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-4">
              {NPGX_ROSTER.filter(c => c.hasImages).map(char => {
                const inCast = cast.find(c => c.slug === char.slug)
                return (
                  <button key={char.slug} onClick={() => toggleCast(char)}
                    className={`relative p-1.5 border transition-all text-left ${
                      inCast ? 'bg-red-600/20 border-red-500 ring-1 ring-red-500/50' : 'bg-white/5 border-white/10 hover:border-red-500/30'
                    }`}>
                    <div className="aspect-square relative mb-1 overflow-hidden bg-black/50">
                      <Image src={char.image} alt={char.name} fill className="object-cover" sizes="100px" />
                    </div>
                    <div className="font-[family-name:var(--font-brand)] text-[9px] text-white truncate">{char.name.split(' ')[0]}</div>
                    {inCast && <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />}
                  </button>
                )
              })}
            </div>

            {/* Roles */}
            {cast.length > 0 && (
              <div className="border border-white/10 bg-white/5 p-3 mb-6">
                {cast.map(member => (
                  <div key={member.slug} className="flex items-center gap-2 mb-1.5">
                    <span className="text-white text-xs w-24 truncate">{member.name.split(' ')[0]}</span>
                    <div className="flex gap-1">
                      {ROLES.map(role => (
                        <button key={role.id} onClick={() => setRole(member.slug, role.id)}
                          className={`px-2 py-0.5 text-[9px] border transition-all ${
                            member.role === role.id ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-black/40 border-white/10 text-white/30'
                          }`}>
                          {role.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Direct button */}
            <button onClick={handleDirect}
              disabled={!selectedTrack || cast.length === 0 || generating}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white font-[family-name:var(--font-brand)] text-sm uppercase tracking-wider transition-all">
              {generating ? 'Director is writing...' : 'Direct This Video'}
            </button>
          </div>
        )}

        {/* DIRECTING (loading) */}
        {step === 'directing' && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4" />
              <div className="font-[family-name:var(--font-brand)] text-white/60 text-sm">Director is writing the story...</div>
              <div className="text-white/30 text-xs mt-2">{selectedTrack?.track.title}</div>
            </div>
          </div>
        )}

        {/* RESULT */}
        {step === 'result' && (
          <div>
            {/* Story */}
            <div className="border border-red-500/30 bg-red-600/5 p-4 mb-6">
              <div className="font-[family-name:var(--font-brand)] text-red-400 text-xs uppercase tracking-wider mb-2">Director&apos;s Story</div>
              <div className="text-white text-lg font-[family-name:var(--font-brand)] mb-2">&ldquo;{story}&rdquo;</div>
              <div className="text-white/50 text-sm">{description}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap mb-6">
              <button onClick={() => setStep('setup')}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 text-xs border border-white/10 transition-all">
                ← Re-direct
              </button>
              <button onClick={() => {
                const text = shots.map((s, i) =>
                  `--- ${i + 1}/${shots.length} | ${s.timeRange} | ${s.clipType} ---\n[${s.characters.join(', ')}] ${s.action}\nLyrics: ${s.lyrics}\n\nPROMPT:\n${s.prompt}\n`
                ).join('\n')
                navigator.clipboard.writeText(text)
              }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider border border-white/10 transition-all">
                Copy All Prompts
              </button>
              <button onClick={handleGenerateMovie} disabled={generatingMovie}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-all">
                {generatingMovie ? `Generating ${movieProgress.done}/${movieProgress.total}...` : `Generate Movie (${shots.length} shots)`}
              </button>
              {movieProgress.done > 0 && !generatingMovie && selectedTrack && (
                <Link href={`/watch/${selectedTrack.track.slug}`}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider border border-white/10 transition-all">
                  Watch →
                </Link>
              )}
            </div>

            {/* Shot list */}
            <div className="font-[family-name:var(--font-brand)] text-xs text-white/40 uppercase tracking-wider mb-3">
              Shot List — {shots.length} shots • {selectedTrack?.track.title}
            </div>
            <div className="space-y-1">
              {shots.map((shot, i) => (
                <div key={i} className="border border-white/10 bg-white/[0.03] p-3 hover:border-red-500/30 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-12">
                      <div className="font-[family-name:var(--font-brand)] text-red-500 text-xs">{String(i + 1).padStart(2, '0')}</div>
                      <div className="text-white/20 text-[9px]">{shot.timeRange}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 text-[8px] uppercase tracking-wider ${
                          shot.clipType === 'performance' ? 'bg-red-600/20 text-red-300 border border-red-500/20' :
                          shot.clipType === 'narrative' ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20' :
                          shot.clipType === 'title' ? 'bg-white/10 text-white/50 border border-white/10' :
                          'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                        }`}>{shot.clipType}</span>
                        {shot.characters.map(c => (
                          <span key={c} className="text-[9px] text-white/30">{c}</span>
                        ))}
                      </div>
                      <div className="text-white/70 text-xs mb-1">{shot.action}</div>
                      {shot.lyrics && (
                        <div className="text-white/20 text-[10px] italic">&ldquo;{shot.lyrics}&rdquo;</div>
                      )}
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(shot.prompt)}
                      className="shrink-0 text-[8px] text-white/15 hover:text-red-400 transition-colors">
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
