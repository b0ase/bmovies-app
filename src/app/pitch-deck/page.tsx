'use client'

/**
 * /pitch-deck — printable investor deck for any film.
 *
 * The full deck template already exists on bmovies.online at
 * /deck.html?id=<offer-id> (print-friendly HTML that renders the
 * synopsis, treatment, storyboard frames, cast, budget, on-chain
 * receipts, and IP cascade split). Rather than port that template
 * here, this page is a film picker that deep-links to the existing
 * deck URL in a new tab.
 *
 * Phase 2: host a local react editor here that lets users edit the
 * deck template (add custom sections, swap frames, upload a logo).
 * For the hackathon the existing bmovies.online/deck.html is enough.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { bmovies } from '@/lib/supabase-bmovies'

interface Film {
  id: string
  title: string
  synopsis: string | null
  tier: string
  token_ticker: string | null
  status: string
}

export default function PitchDeckPage() {
  const [films, setFilms] = useState<Film[] | null>(null)
  useEffect(() => {
    bmovies
      .from('bct_offers')
      .select('id, title, synopsis, tier, token_ticker, status')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => setFilms((data as Film[]) || []))
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold mb-2">
          Pitch deck
        </div>
        <h1
          className="text-5xl font-black leading-none mb-2"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Printable<br/>investor packs
        </h1>
        <p className="text-[#888] text-sm max-w-xl">
          Every film on bMovies has a printable investor deck with the
          synopsis, treatment, storyboard frames, cap table, and on-chain
          mint receipt. Pick a film to open its deck in a new tab —
          Cmd+P / Ctrl+P to save as PDF.
        </p>
      </header>

      {films === null ? (
        <div className="text-[#666] text-sm">Loading films…</div>
      ) : films.length === 0 ? (
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center">
          <div className="text-[#888] text-sm mb-4">
            No films in the catalogue yet.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {films.map((f) => (
            <a
              key={f.id}
              href={`https://bmovies.online/deck.html?id=${encodeURIComponent(f.id)}`}
              target="_blank"
              rel="noopener"
              className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors block"
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
              <p className="text-[#888] text-xs leading-relaxed line-clamp-3 mb-3">
                {f.synopsis || 'No synopsis yet.'}
              </p>
              <div className="text-[0.6rem] uppercase tracking-wider font-bold text-[#E50914]">
                Open printable deck →
              </div>
            </a>
          ))}
        </div>
      )}

      <section className="mt-12 pt-6 border-t border-[#1a1a1a]">
        <p className="text-xs text-[#666] leading-relaxed max-w-2xl">
          The deck template lives on{' '}
          <a href="https://bmovies.online/deck.html?id=feature-test-002" className="text-[#E50914] hover:underline">
            bmovies.online/deck.html
          </a>
          . Phase 2 will bring an inline editor here so you can
          customise sections, upload a studio logo, swap hero frames,
          and regenerate sections with a new direction. For now the
          deck is read-only from the film's current artifacts.
        </p>
      </section>
    </div>
  )
}
