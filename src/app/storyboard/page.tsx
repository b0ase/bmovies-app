'use client'

/**
 * /storyboard — view and re-generate storyboard frames for a film.
 *
 * Two modes:
 *   1. No ?id= — film picker
 *   2. ?id=<offer-id> — grid of storyboard.frame_* image artifacts
 *      with "regen this frame" buttons that POST to the revise API
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { bmovies } from '@/lib/supabase-bmovies'

interface Film {
  id: string
  title: string
  tier: string
  token_ticker: string | null
}

interface Frame {
  id: number
  url: string
  step_id: string | null
  prompt: string | null
  version: number
}

function Inner() {
  const params = useSearchParams()
  const id = params?.get('id') || null
  if (!id) return <Picker />
  return <Board offerId={id} />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-12 text-[#666]">Loading…</div>}>
      <Inner />
    </Suspense>
  )
}

function Picker() {
  const [films, setFilms] = useState<Film[] | null>(null)
  useEffect(() => {
    bmovies
      .from('bct_offers')
      .select('id, title, tier, token_ticker')
      .is('archived_at', null)
      .in('tier', ['pitch', 'trailer', 'short', 'feature'])
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => setFilms((data as Film[]) || []))
  }, [])
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold mb-2">
          Storyboard
        </div>
        <h1 className="text-5xl font-black leading-none mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>
          Hero frames,<br/>film by film
        </h1>
        <p className="text-[#888] text-sm max-w-xl">
          Pick a film to see its storyboard grid. Regenerate any frame
          with a new direction note — the storyboard artist will
          re-shoot that single frame and the new version becomes head
          of the chain while the old one stays addressable.
        </p>
      </header>
      {films === null ? (
        <div className="text-[#666] text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {films.map((f) => (
            <Link
              key={f.id}
              href={`/storyboard?id=${encodeURIComponent(f.id)}`}
              className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914]"
            >
              <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-1">
                {f.tier} · ${f.token_ticker}
              </div>
              <div className="text-xl font-black text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
                {f.title}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function Board({ offerId }: { offerId: string }) {
  const [film, setFilm] = useState<Film | null>(null)
  const [frames, setFrames] = useState<Frame[]>([])
  const [loading, setLoading] = useState(true)
  const [regenOpen, setRegenOpen] = useState<number | null>(null)
  const [regenNote, setRegenNote] = useState('')
  const [regenStatus, setRegenStatus] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: offer }, { data: arts }] = await Promise.all([
        bmovies
          .from('bct_offers')
          .select('id, title, tier, token_ticker')
          .eq('id', offerId)
          .maybeSingle(),
        bmovies
          .from('bct_artifacts')
          .select('id, url, step_id, prompt, version, role, kind')
          .eq('offer_id', offerId)
          .eq('kind', 'image')
          .is('superseded_by', null)
          .order('step_id', { ascending: true }),
      ])
      if (cancelled) return
      setFilm(offer as Film | null)
      const storyboardFrames: Frame[] = (arts || [])
        .filter((a: any) => (a.step_id || '').startsWith('storyboard.frame_') || a.role === 'storyboard')
        .map((a: any) => ({
          id: a.id,
          url: a.url,
          step_id: a.step_id,
          prompt: a.prompt,
          version: a.version || 1,
        }))
      setFrames(storyboardFrames)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [offerId])

  const submitRegen = async (frameIdx: number) => {
    if (!regenNote.trim()) return
    setRegenStatus('Submitting…')
    try {
      const res = await fetch('https://bmovies.online/api/feature/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          step: 'storyboard.pack',
          note: `Frame ${frameIdx + 1}: ${regenNote}`,
        }),
      })
      if (!res.ok) throw new Error(`Revise failed: ${res.status}`)
      setRegenStatus('✓ Queued — regen in ~30s')
      setTimeout(() => {
        setRegenOpen(null)
        setRegenNote('')
        setRegenStatus('')
      }, 2500)
    } catch (err: any) {
      setRegenStatus('⚠ ' + (err.message || 'failed'))
    }
  }

  if (loading) {
    return <div className="max-w-[1400px] mx-auto px-6 py-12 text-[#666] text-sm">Loading storyboard…</div>
  }
  if (!film) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center">
          <div className="text-[#888] text-sm mb-4">Film not found.</div>
          <Link href="/storyboard" className="text-[#E50914] text-xs font-bold uppercase">← Pick another</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-6 pb-6 border-b border-[#1a1a1a]">
        <Link href="/storyboard" className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] hover:text-[#E50914] font-bold">
          ← Pick another film
        </Link>
        <h1 className="text-4xl font-black leading-none mt-2" style={{ fontFamily: 'var(--font-bebas)' }}>
          {film.title}
        </h1>
        <div className="text-[#888] text-sm mt-2">
          {frames.length} storyboard frame{frames.length === 1 ? '' : 's'}
        </div>
      </header>
      {frames.length === 0 ? (
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center">
          <div className="text-[#888] text-sm">
            No storyboard frames yet for this film. Pitch tier ships a
            single poster but no storyboard; trailer/short/feature tiers
            ship 6–12 frames each.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {frames.map((f, i) => (
            <div key={f.id} className="border border-[#222] bg-[#0a0a0a]">
              <img src={f.url} alt={`Frame ${i + 1}`} className="w-full aspect-[3/2] object-cover" />
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666]">
                    Frame {i + 1}
                  </span>
                  {f.version > 1 && (
                    <span className="text-[0.55rem] text-[#e8c46b]">v{f.version}</span>
                  )}
                </div>
                {f.prompt && (
                  <p className="text-[0.65rem] text-[#888] line-clamp-3 mb-2 leading-relaxed">
                    {f.prompt}
                  </p>
                )}
                <button
                  onClick={() => setRegenOpen(regenOpen === i ? null : i)}
                  className="text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914] hover:text-white"
                >
                  {regenOpen === i ? '× Cancel' : '🎨 Regen this frame'}
                </button>
                {regenOpen === i && (
                  <div className="mt-2 pt-2 border-t border-[#2a2a2a]">
                    <textarea
                      value={regenNote}
                      onChange={(e) => setRegenNote(e.target.value)}
                      placeholder="New direction (e.g. 'wider shot, dusk lighting')"
                      className="w-full px-2 py-1.5 bg-black border border-[#333] text-white text-[0.65rem] font-mono resize-y min-h-[50px]"
                    />
                    <button
                      onClick={() => submitRegen(i)}
                      className="mt-2 w-full px-2 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.55rem] font-black uppercase tracking-wider"
                    >
                      Submit
                    </button>
                    {regenStatus && (
                      <div className="mt-1.5 text-[0.55rem] text-[#888]">{regenStatus}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
