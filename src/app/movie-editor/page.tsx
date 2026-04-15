'use client'

/**
 * /movie-editor — timeline-based scene editor for bMovies films.
 *
 * Two modes:
 *   1. No ?id= param — picker view: list films with scene videos,
 *      click one to open its editor.
 *   2. ?id=<offer-id>  — editor view: load scene.N.video artifacts,
 *      show sequential video player, let the commissioner re-cut
 *      any scene with a natural-language note (wires to the revise
 *      API on bmovies.online's production worker).
 *
 * Data layer: bct_offers + bct_artifacts via supabase-bmovies.
 * Revision writes: POST to https://bmovies.online/api/feature/revise
 * with { offerId, step, note }. Same endpoint the production.html
 * draft view uses. The worker on Hetzner picks it up within ~30s,
 * regenerates the scene video, and the new version supersedes the
 * old one in bct_artifacts.
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { bmovies } from '@/lib/supabase-bmovies'

interface Film {
  id: string
  title: string
  synopsis: string | null
  tier: string
  status: string
  token_ticker: string | null
}

interface Scene {
  id: number
  url: string
  step_id: string | null
  model: string | null
  prompt: string | null
  version: number
}

function MovieEditorInner() {
  const params = useSearchParams()
  const offerId = params?.get('id') || null

  if (!offerId) return <FilmPicker />
  return <Editor offerId={offerId} />
}

export default function MovieEditorPage() {
  return (
    <Suspense fallback={<div className="p-12 text-[#666]">Loading…</div>}>
      <MovieEditorInner />
    </Suspense>
  )
}

/* ──────────── Film picker ──────────── */

function FilmPicker() {
  const [films, setFilms] = useState<Film[] | null>(null)
  useEffect(() => {
    bmovies
      .from('bct_offers')
      .select('id, title, synopsis, tier, status, token_ticker')
      .is('archived_at', null)
      .in('tier', ['trailer', 'short', 'feature'])
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => setFilms((data as Film[]) || []))
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold mb-2">
          Movie editor
        </div>
        <h1
          className="text-5xl font-black leading-none mb-2"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Pick a film<br/>to <span className="text-[#E50914]">cut</span>
        </h1>
        <p className="text-[#888] text-sm max-w-xl">
          Timeline editor for bMovies productions. Load any film with
          scene videos, re-order shots, request re-cuts with a
          natural-language note. Every edit lives as a new version in
          bct_artifacts with the old version still addressable.
        </p>
      </header>

      {films === null ? (
        <div className="text-[#666] text-sm">Loading films…</div>
      ) : films.length === 0 ? (
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center">
          <div className="text-[#888] text-sm mb-4">
            No films available yet. Commission a trailer or feature on
            bMovies and come back when it's shipped.
          </div>
          <a
            href="https://bmovies.online/commission.html"
            className="inline-block px-5 py-2.5 bg-[#E50914] text-white text-xs font-black uppercase tracking-wider"
          >
            Commission a film →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {films.map((f) => (
            <Link
              key={f.id}
              href={`/movie-editor?id=${encodeURIComponent(f.id)}`}
              className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666]">
                  {f.tier} · {f.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[0.55rem] font-mono text-[#E50914]">
                  ${f.token_ticker}
                </span>
              </div>
              <h3
                className="text-xl font-black text-white mb-2 leading-tight"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                {f.title}
              </h3>
              <p className="text-[#888] text-xs leading-relaxed line-clamp-2">
                {f.synopsis || 'No synopsis yet.'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────── Editor ──────────── */

function Editor({ offerId }: { offerId: string }) {
  const [film, setFilm] = useState<Film | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [currentScene, setCurrentScene] = useState(0)
  const [reviseOpen, setReviseOpen] = useState<number | null>(null)
  const [reviseNote, setReviseNote] = useState('')
  const [reviseStatus, setReviseStatus] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: offer }, { data: arts }] = await Promise.all([
        bmovies
          .from('bct_offers')
          .select('id, title, synopsis, tier, status, token_ticker')
          .eq('id', offerId)
          .maybeSingle(),
        bmovies
          .from('bct_artifacts')
          .select('id, url, step_id, model, prompt, version, superseded_by, kind')
          .eq('offer_id', offerId)
          .eq('kind', 'video')
          .is('superseded_by', null)
          .order('step_id', { ascending: true }),
      ])
      if (cancelled) return
      setFilm(offer as Film | null)
      const sceneList: Scene[] = (arts || [])
        .filter((a: any) => (a.step_id || '').startsWith('scene.'))
        .map((a: any) => ({
          id: a.id,
          url: a.url,
          step_id: a.step_id,
          model: a.model,
          prompt: a.prompt,
          version: a.version || 1,
        }))
      setScenes(sceneList)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [offerId])

  const submitRevise = async (sceneIdx: number) => {
    if (!reviseNote.trim()) return
    setReviseStatus('Submitting…')
    try {
      const res = await fetch('https://bmovies.online/api/feature/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          step: 'phase2.scene_loop',
          note: `Scene ${sceneIdx + 1}: ${reviseNote}`,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `Revise failed: ${res.status}`)
      setReviseStatus('✓ Revision queued — worker will regenerate within ~30s')
      setTimeout(() => {
        setReviseOpen(null)
        setReviseNote('')
        setReviseStatus('')
      }, 2500)
    } catch (err: any) {
      setReviseStatus('⚠ ' + (err.message || 'failed'))
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-12 text-[#666] text-sm">
        Loading editor…
      </div>
    )
  }

  if (!film) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center">
          <div className="text-[#888] text-sm mb-4">
            Film not found. It may have been archived or the id is wrong.
          </div>
          <Link
            href="/movie-editor"
            className="inline-block px-5 py-2.5 bg-[#E50914] text-white text-xs font-black uppercase tracking-wider"
          >
            Pick another film →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-6 pb-6 border-b border-[#1a1a1a] flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/movie-editor"
            className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] hover:text-[#E50914] font-bold"
          >
            ← Pick another film
          </Link>
          <h1
            className="text-4xl font-black leading-none mt-2"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {film.title}
          </h1>
          <div className="flex gap-2 mt-2 text-[0.55rem] uppercase tracking-wider font-bold">
            <span className="px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
              {film.tier}
            </span>
            <span className="px-2 py-0.5 bg-[#1a1a1a] text-[#E50914]">
              ${film.token_ticker}
            </span>
            <span className="px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
              {film.status.replace(/_/g, ' ')}
            </span>
            <span className="px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
              {scenes.length} scene{scenes.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://bmovies.online/film.html?id=${encodeURIComponent(offerId)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-2 border border-[#333] text-[#bbb] hover:text-white"
          >
            Film page ↗
          </a>
          <a
            href={`https://bmovies.online/production.html?id=${encodeURIComponent(offerId)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-2 border border-[#333] text-[#bbb] hover:text-white"
          >
            Production timeline ↗
          </a>
        </div>
      </header>

      {scenes.length === 0 ? (
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center">
          <div className="text-[#888] text-sm mb-4">
            This film has no scene videos yet. Either the production
            hasn't reached the phase2.scene_loop step, or the video
            artifacts have been archived.
          </div>
          <a
            href={`https://bmovies.online/production.html?id=${encodeURIComponent(offerId)}`}
            className="inline-block px-5 py-2.5 bg-[#E50914] text-white text-xs font-black uppercase tracking-wider"
          >
            Open production timeline →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="border border-[#222] bg-black aspect-video mb-3">
              <video
                key={scenes[currentScene]?.id}
                src={scenes[currentScene]?.url}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setCurrentScene((i) => Math.max(0, i - 1))}
                disabled={currentScene === 0}
                className="px-4 py-2 border border-[#333] text-xs font-bold uppercase tracking-wider text-white disabled:opacity-30"
              >
                ← Previous
              </button>
              <div className="text-[#888] text-xs">
                Scene {currentScene + 1} of {scenes.length}
                {scenes[currentScene]?.version > 1 && (
                  <span className="text-[#E50914] ml-2">
                    v{scenes[currentScene].version}
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  setCurrentScene((i) => Math.min(scenes.length - 1, i + 1))
                }
                disabled={currentScene === scenes.length - 1}
                className="px-4 py-2 border border-[#333] text-xs font-bold uppercase tracking-wider text-white disabled:opacity-30"
              >
                Next →
              </button>
            </div>
            {scenes[currentScene]?.prompt && (
              <div className="mt-4 border border-[#222] bg-[#0a0a0a] p-4">
                <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-1">
                  Prompt used
                </div>
                <div className="text-[#bbb] text-xs leading-relaxed font-mono">
                  {scenes[currentScene].prompt}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-3">
              Timeline
            </div>
            <div className="space-y-2">
              {scenes.map((s, i) => (
                <div
                  key={s.id}
                  className={`border p-3 transition-colors ${
                    i === currentScene
                      ? 'border-[#E50914] bg-[#1a0003]'
                      : 'border-[#222] bg-[#0a0a0a] hover:border-[#444]'
                  }`}
                >
                  <button
                    onClick={() => setCurrentScene(i)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[#E50914] text-xs">
                        {s.step_id}
                      </span>
                      {s.version > 1 && (
                        <span className="text-[0.55rem] text-[#e8c46b]">
                          v{s.version}
                        </span>
                      )}
                    </div>
                    <div className="text-[#888] text-xs truncate">
                      {s.prompt?.slice(0, 50) || '—'}
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setReviseOpen(reviseOpen === i ? null : i)
                    }
                    className="mt-2 text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914] hover:text-white"
                  >
                    {reviseOpen === i ? '× Cancel' : '✏ Re-cut this scene'}
                  </button>
                  {reviseOpen === i && (
                    <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                      <textarea
                        value={reviseNote}
                        onChange={(e) => setReviseNote(e.target.value)}
                        placeholder="Describe the re-cut (e.g. 'darker mood, slower cuts, less dialogue')"
                        className="w-full px-2 py-1.5 bg-black border border-[#333] text-white text-xs font-mono resize-y min-h-[60px]"
                      />
                      <button
                        onClick={() => submitRevise(i)}
                        className="mt-2 w-full px-3 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.55rem] font-black uppercase tracking-wider"
                      >
                        Submit revision
                      </button>
                      {reviseStatus && (
                        <div className="mt-2 text-[0.6rem] text-[#888]">
                          {reviseStatus}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
