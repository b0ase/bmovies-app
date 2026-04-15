'use client'

/**
 * /script-gen — view and re-generate the screenplay for a film.
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

function Inner() {
  const params = useSearchParams()
  const id = params?.get('id') || null
  if (!id) return <Picker />
  return <Script offerId={id} />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-12 text-[#666]">Loading…</div>}>
      <Inner />
    </Suspense>
  )
}

function decodeDataUrl(url: string): string | null {
  if (!url || !url.startsWith('data:')) return null
  try {
    const idx = url.indexOf(',')
    if (idx < 0) return null
    const meta = url.slice(5, idx)
    const payload = url.slice(idx + 1)
    return /;base64/.test(meta) ? atob(payload) : decodeURIComponent(payload)
  } catch {
    return null
  }
}

function Picker() {
  const [films, setFilms] = useState<Film[] | null>(null)
  useEffect(() => {
    bmovies
      .from('bct_offers')
      .select('id, title, tier, token_ticker')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => setFilms((data as Film[]) || []))
  }, [])
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold mb-2">
          Script editor
        </div>
        <h1 className="text-5xl font-black leading-none mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>
          Every screenplay,<br/>every film
        </h1>
        <p className="text-[#888] text-sm max-w-xl">
          Read the writer agent's output for any film — logline,
          synopsis, beat sheet, treatment, screenplay. Request a rewrite
          with a one-line note and the writer re-runs against your
          direction.
        </p>
      </header>
      {films === null ? (
        <div className="text-[#666] text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {films.map((f) => (
            <Link
              key={f.id}
              href={`/script-gen?id=${encodeURIComponent(f.id)}`}
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

function Script({ offerId }: { offerId: string }) {
  const [film, setFilm] = useState<Film | null>(null)
  const [sections, setSections] = useState<{ label: string; step_id: string; text: string; version: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(0)
  const [reviseOpen, setReviseOpen] = useState(false)
  const [reviseNote, setReviseNote] = useState('')
  const [reviseStatus, setReviseStatus] = useState('')

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
          .select('id, url, step_id, version')
          .eq('offer_id', offerId)
          .eq('role', 'writer')
          .eq('kind', 'text')
          .is('superseded_by', null)
          .order('step_id', { ascending: true }),
      ])
      if (cancelled) return
      setFilm(offer as Film | null)
      const stepLabels: Record<string, string> = {
        'writer.logline':    'Logline',
        'writer.synopsis':   'Synopsis',
        'writer.beat_sheet': 'Beat sheet',
        'writer.treatment':  'Treatment',
        'writer.screenplay': 'Screenplay',
      }
      const secs = (arts || [])
        .map((a: any) => ({
          label: stepLabels[a.step_id] || a.step_id || 'Section',
          step_id: a.step_id,
          text: decodeDataUrl(a.url) || '(empty)',
          version: a.version || 1,
        }))
      setSections(secs)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [offerId])

  const submitRevise = async () => {
    if (!reviseNote.trim() || !sections[active]) return
    setReviseStatus('Submitting…')
    try {
      const res = await fetch('https://bmovies.online/api/feature/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          step: sections[active].step_id,
          note: reviseNote,
        }),
      })
      if (!res.ok) throw new Error(`Revise failed: ${res.status}`)
      setReviseStatus('✓ Queued — writer re-runs in ~30s')
      setTimeout(() => {
        setReviseOpen(false)
        setReviseNote('')
        setReviseStatus('')
      }, 2500)
    } catch (err: any) {
      setReviseStatus('⚠ ' + (err.message || 'failed'))
    }
  }

  if (loading) {
    return <div className="max-w-[1400px] mx-auto px-6 py-12 text-[#666] text-sm">Loading screenplay…</div>
  }
  if (!film) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center">
          <div className="text-[#888] text-sm mb-4">Film not found.</div>
          <Link href="/script-gen" className="text-[#E50914] text-xs font-bold uppercase">← Pick another</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-6 pb-6 border-b border-[#1a1a1a]">
        <Link href="/script-gen" className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] hover:text-[#E50914] font-bold">
          ← Pick another film
        </Link>
        <h1 className="text-4xl font-black leading-none mt-2" style={{ fontFamily: 'var(--font-bebas)' }}>
          {film.title}
        </h1>
      </header>

      {sections.length === 0 ? (
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center">
          <div className="text-[#888] text-sm">
            No writer artifacts yet for this film.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-3">
              Sections
            </div>
            <div className="space-y-1">
              {sections.map((s, i) => (
                <button
                  key={s.step_id}
                  onClick={() => setActive(i)}
                  className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider ${
                    i === active
                      ? 'bg-[#E50914] text-white'
                      : 'text-[#bbb] hover:bg-[#1a1a1a]'
                  }`}
                >
                  {s.label}
                  {s.version > 1 && <span className="ml-1 text-[0.55rem] text-[#e8c46b]">v{s.version}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="border border-[#222] bg-[#0a0a0a] p-6 mb-3 font-mono text-sm text-[#ddd] leading-relaxed whitespace-pre-wrap">
              {sections[active]?.text}
            </div>
            <button
              onClick={() => setReviseOpen(!reviseOpen)}
              className="text-xs uppercase tracking-wider font-bold text-[#E50914] hover:text-white"
            >
              {reviseOpen ? '× Cancel revision' : '✏ Request a rewrite'}
            </button>
            {reviseOpen && (
              <div className="mt-3 border-t border-[#222] pt-3">
                <textarea
                  value={reviseNote}
                  onChange={(e) => setReviseNote(e.target.value)}
                  placeholder="New direction (e.g. 'more tension in act 2, darker tone, cut the romantic subplot')"
                  className="w-full px-3 py-2 bg-black border border-[#333] text-white text-xs font-mono resize-y min-h-[80px]"
                />
                <button
                  onClick={submitRevise}
                  className="mt-2 px-5 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-black uppercase tracking-wider"
                >
                  Submit rewrite request
                </button>
                {reviseStatus && (
                  <div className="mt-2 text-xs text-[#888]">{reviseStatus}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
