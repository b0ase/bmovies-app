'use client'

/**
 * /studio — the six founding studios, each a real BSV-21 token.
 *
 * Lists the six founding studios with their logos, tickers, aesthetic
 * notes, and director roster. Phase 2 will let users spawn their own
 * studio brand and commission under it.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { bmovies } from '@/lib/supabase-bmovies'

interface Studio {
  id: string
  name: string
  token_ticker: string
  token_mint_txid: string | null
  treasury_address: string
  bio: string | null
  logo_url: string | null
  founded_year: number
  aesthetic: string | null
}

interface Director {
  id: string
  name: string
  token_ticker: string
  token_mint_txid: string | null
  studio_id: string | null
  headshot_url: string | null
}

export default function StudioPage() {
  const [studios, setStudios] = useState<Studio[] | null>(null)
  const [directors, setDirectors] = useState<Director[]>([])

  useEffect(() => {
    Promise.all([
      bmovies.from('bct_studios').select('*').order('id'),
      bmovies.from('bct_directors').select('*').order('studio_id'),
    ]).then(([sRes, dRes]) => {
      setStudios((sRes.data as Studio[]) || [])
      setDirectors((dRes.data as Director[]) || [])
    })
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-6 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold mb-2">
          Studios
        </div>
        <h1
          className="text-5xl font-black leading-none mb-2"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Six founding<br/>studios
        </h1>
        <p className="text-[#888] text-sm max-w-2xl">
          Every commission on bMovies runs through one of the six
          founding studios. Each studio has 8 in-house specialists plus
          access to the 10-strong shared pool — an 11-specialist crew
          draws for every project. Each studio is its own BSV-21 token,
          tradeable at 1sat.market.
        </p>
      </header>

      {studios === null ? (
        <div className="text-[#666] text-sm">Loading studios…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studios.map((s) => {
            const studioDirs = directors.filter((d) => d.studio_id === s.id)
            const onChain = s.token_mint_txid && /^[0-9a-f]{64}$/.test(s.token_mint_txid)
            return (
              <div
                key={s.id}
                className="border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
              >
                {s.logo_url && (
                  <div className="aspect-[3/1] bg-[#050505] overflow-hidden">
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2
                      className="text-2xl font-black text-white leading-tight"
                      style={{ fontFamily: 'var(--font-bebas)' }}
                    >
                      {s.name}
                    </h2>
                    <span className="text-[0.6rem] font-mono text-[#E50914] shrink-0">
                      ${s.token_ticker}
                    </span>
                  </div>
                  <div className="flex gap-2 mb-3 text-[0.55rem] uppercase tracking-wider font-bold">
                    <span className="px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
                      Founded {s.founded_year}
                    </span>
                    {onChain && (
                      <span className="px-2 py-0.5 bg-[#0e3a0e] text-[#6bff8a]">
                        On chain
                      </span>
                    )}
                  </div>
                  {s.aesthetic && (
                    <p className="text-[#bbb] text-sm leading-relaxed mb-3">
                      {s.aesthetic}
                    </p>
                  )}
                  {studioDirs.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-1">
                        Director
                      </div>
                      {studioDirs.map((d) => (
                        <div
                          key={d.id}
                          className="text-[#bbb] text-sm flex items-center gap-2"
                        >
                          {d.headshot_url && (
                            <img
                              src={d.headshot_url}
                              alt={d.name}
                              className="w-8 h-8 object-cover rounded-full"
                            />
                          )}
                          <span>{d.name}</span>
                          <span className="font-mono text-[#E50914] text-[0.6rem]">
                            ${d.token_ticker}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[#1a1a1a]">
                    {onChain && (
                      <a
                        href={`https://1sat.market/market/bsv21/${s.token_mint_txid}_0`}
                        target="_blank"
                        rel="noopener"
                        className="text-[0.55rem] font-bold uppercase tracking-wider px-2.5 py-1.5 bg-[#E50914] text-white"
                      >
                        Trade ${s.token_ticker}
                      </a>
                    )}
                    <a
                      href={`https://bmovies.online/studio.html?id=${encodeURIComponent(s.id)}`}
                      className="text-[0.55rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] text-[#bbb] hover:text-white"
                    >
                      Studio page
                    </a>
                    <a
                      href={`https://bmovies.online/commission.html?studio=${encodeURIComponent(s.id)}`}
                      className="text-[0.55rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] text-[#bbb] hover:text-white"
                    >
                      Commission here
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <section className="mt-12 pt-8 border-t border-[#1a1a1a] max-w-2xl">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold mb-2">
          Phase 2
        </div>
        <h2
          className="text-3xl font-black mb-3"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Spawn your own studio
        </h2>
        <p className="text-[#888] text-sm leading-relaxed">
          The six founding studios are the launch roster. Post-hackathon,
          any user can spawn their own named studio, upload a logo, write
          a bio, and commission films under their own brand. The studio
          becomes a tradeable token; the studio owner earns 1% of every
          production commissioned through them. See the{' '}
          <a href="https://bmovies.online/about.html#ponzinomics-field-guide" className="text-[#E50914]">
            Ponzinomics field guide
          </a>{' '}
          for the full plan.
        </p>
      </section>
    </div>
  )
}
