'use client'

/**
 * /exchange — tabbed view of every canonical BSV-21 token on bMovies.
 *
 * Mirrors the public /exchange.html on bmovies.online but lives inside
 * the authenticated app so we can later wire buy / sell / cap-table
 * modals directly without round-tripping to the public site.
 *
 * Four tabs: Films, Studios, Directors, $bMovies (platform token).
 * Every row has deep-links to 1sat.market, GorillaPool, and the local
 * cap-table view on bmovies.online.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { bmovies } from '@/lib/supabase-bmovies'

type Tab = 'films' | 'studios' | 'directors' | 'platform'

interface Asset {
  id: string
  title: string
  ticker: string
  txid: string | null
  tier?: string
  image?: string | null
  subtitle?: string
}

// xAI image URLs expire within hours — treat as missing.
const isEphemeralUrl = (url: string | null | undefined) =>
  typeof url === 'string' && /imgen\.x\.ai\/xai-imgen\/xai-tmp/.test(url)

// Commissioner-curated posters live at bmovies.online/img/films/{slug}.jpg
// and are permanent. Win over xAI pipeline output.
const LOCAL_POSTERS = new Set([
  'echoes-of-the-last-signal', 'the-fold', 'the-weight-of-water',
  'the-lantern-that-forgot-its-flame', 'the-mirror-protocol',
  'off-key-heroes', 'midnight-swarm', 'the-last-piece',
  'episode-1000', 'star-wars-episode-1000', 'that-weirdo-isnt-satoshi',
])
const slugify = (s: string) =>
  String(s || '').toLowerCase()
    .replace(/['\u2018\u2019]/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
const localPosterFor = (title: string) => {
  const slug = slugify(title)
  return slug && LOCAL_POSTERS.has(slug) ? `https://bmovies.online/img/films/${slug}.jpg` : null
}

export default function ExchangePage() {
  const [tab, setTab] = useState<Tab>('films')
  const [films, setFilms] = useState<Asset[] | null>(null)
  const [studios, setStudios] = useState<Asset[] | null>(null)
  const [directors, setDirectors] = useState<Asset[] | null>(null)
  const [platform, setPlatform] = useState<{ supply: number; sold: number; price_cents: number; txid: string | null } | null>(null)

  useEffect(() => {
    async function load() {
      const [filmsRes, studiosRes, directorsRes, cfgRes] = await Promise.all([
        bmovies
          .from('bct_offers')
          .select('id, title, token_ticker, token_mint_txid, tier, bct_artifacts(kind, role, url, superseded_by)')
          .is('archived_at', null)
          .in('tier', ['pitch', 'trailer', 'short', 'feature'])
          .not('token_mint_txid', 'is', null)
          .order('created_at', { ascending: false }),
        bmovies
          .from('bct_studios')
          .select('id, name, token_ticker, token_mint_txid, logo_url, aesthetic'),
        bmovies
          .from('bct_directors')
          .select('id, name, token_ticker, token_mint_txid, headshot_url, studio_id'),
        bmovies
          .from('bct_platform_config')
          .select('*')
          .eq('id', 'platform')
          .maybeSingle(),
      ])

      setFilms(
        ((filmsRes.data as any[]) || [])
          .filter((f) => f.token_mint_txid && /^[0-9a-f]{64}$/.test(f.token_mint_txid))
          .map((f) => {
            const local = localPosterFor(f.title)
            const arts = (f.bct_artifacts || []).filter(
              (a: any) => !a.superseded_by && !isEphemeralUrl(a.url),
            )
            const poster = arts.find((a: any) => a.kind === 'image' && a.role === 'poster')
            const storyboard = arts.find((a: any) => a.kind === 'image' && a.role === 'storyboard')
            const frame = arts.find((a: any) => a.kind === 'image')
            return {
              id: f.id,
              title: f.title,
              ticker: f.token_ticker,
              txid: f.token_mint_txid,
              tier: f.tier,
              image: local || poster?.url || storyboard?.url || frame?.url || null,
            }
          }),
      )
      setStudios(
        ((studiosRes.data as any[]) || []).map((s) => ({
          id: s.id,
          title: s.name,
          ticker: s.token_ticker,
          txid: s.token_mint_txid,
          image: s.logo_url,
          subtitle: s.aesthetic || undefined,
        })),
      )
      setDirectors(
        ((directorsRes.data as any[]) || []).map((d) => ({
          id: d.id,
          title: d.name,
          ticker: d.token_ticker,
          txid: d.token_mint_txid,
          image: d.headshot_url,
          subtitle: d.studio_id || undefined,
        })),
      )
      if (cfgRes.data) {
        const cfg = cfgRes.data as any
        setPlatform({
          supply: Number(cfg.total_supply),
          sold: Number(cfg.sold_supply),
          price_cents: Number(cfg.current_tranche_price_cents),
          txid: cfg.token_mint_txid,
        })
      }
    }
    load()
  }, [])

  const list = tab === 'films' ? films : tab === 'studios' ? studios : tab === 'directors' ? directors : null

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-6 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold mb-2">
          bMovies exchange
        </div>
        <h1
          className="text-5xl font-black leading-none mb-2"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Every token.<br/>Every asset.
        </h1>
        <p className="text-[#888] text-sm max-w-2xl">
          Every film, studio, director, and the $bMovies platform share —
          all on BSV mainnet, all tradeable at 1sat.market, all
          independently verifiable at GorillaPool. You don't need a wallet
          to look; you need one to trade.
        </p>
      </header>

      <nav className="flex gap-1 mb-8 border-b border-[#1a1a1a]">
        {(['films', 'studios', 'directors', 'platform'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === t
                ? 'text-white border-b-2 border-[#E50914]'
                : 'text-[#666] hover:text-[#bbb]'
            }`}
          >
            {t === 'platform' ? '$bMovies' : t}
          </button>
        ))}
      </nav>

      {tab === 'platform' ? (
        <PlatformTab platform={platform} />
      ) : list === null ? (
        <div className="text-[#666] text-sm">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-[#666] text-sm">No assets in this category yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function AssetCard({ asset }: { asset: Asset }) {
  const short = asset.txid ? `${asset.txid.slice(0, 10)}…${asset.txid.slice(-6)}` : null
  return (
    <div className="border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors">
      <div className="aspect-[3/2] bg-[#050505] overflow-hidden relative">
        {asset.image ? (
          <img
            src={asset.image}
            alt={asset.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="text-4xl font-black text-[#1a1a1a] tracking-tighter"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              ${asset.ticker}
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3
            className="font-black text-lg leading-tight text-white"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {asset.title}
          </h3>
          <span className="text-[0.55rem] font-mono text-[#E50914] shrink-0">
            ${asset.ticker}
          </span>
        </div>
        {asset.tier && (
          <span className="inline-block text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#888] mb-2">
            {asset.tier}
          </span>
        )}
        {asset.subtitle && (
          <p className="text-[#888] text-xs mb-2">{asset.subtitle}</p>
        )}
        {short && (
          <div className="font-mono text-[0.55rem] text-[#555] mb-3 break-all">
            {short}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {asset.txid && (
            <>
              <a
                href={`https://1sat.market/outpoint/${asset.txid}_0/bsv21`}
                target="_blank"
                rel="noopener"
                className="text-[0.55rem] font-bold uppercase tracking-wider px-2 py-1 bg-[#E50914] text-white"
              >
                Trade
              </a>
              <a
                href={`https://ordinals.gorillapool.io/api/bsv20/id/${asset.txid}_0`}
                target="_blank"
                rel="noopener"
                className="text-[0.55rem] font-bold uppercase tracking-wider px-2 py-1 border border-[#333] text-[#bbb] hover:text-white"
              >
                On-chain
              </a>
            </>
          )}
          <a
            href={`https://bmovies.online/captable.html?id=${encodeURIComponent(asset.id)}`}
            className="text-[0.55rem] font-bold uppercase tracking-wider px-2 py-1 border border-[#333] text-[#bbb] hover:text-white"
          >
            Cap table
          </a>
        </div>
      </div>
    </div>
  )
}

function PlatformTab({ platform }: { platform: { supply: number; sold: number; price_cents: number; txid: string | null } | null }) {
  if (!platform) return <div className="text-[#666] text-sm">Loading platform token…</div>
  const fmt = (n: number) => n.toLocaleString()
  const onChain = platform.txid && /^[0-9a-f]{64}$/.test(platform.txid)
  return (
    <div className="max-w-3xl">
      <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-8 mb-4">
        <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914] mb-2">
          Platform token
        </div>
        <h2
          className="text-5xl font-black mb-4"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          $<span className="text-[#E50914]">bMovies</span>
        </h2>
        <p className="text-[#bbb] text-sm mb-6 leading-relaxed max-w-xl">
          One billion shares, fixed. Every share is a pro-rata claim on
          1% of every production's royalty supply — passed through to
          $bMovies holders as tickets sell. The treasury holds the full
          supply until the first tranche opens to KYC'd retail.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div>
            <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-1">Supply</div>
            <div className="font-mono text-lg text-white">{fmt(platform.supply)}</div>
          </div>
          <div>
            <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-1">Sold</div>
            <div className="font-mono text-lg text-white">{fmt(platform.sold)}</div>
          </div>
          <div>
            <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-1">T1 price</div>
            <div className="font-mono text-lg text-white">${(platform.price_cents / 100).toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-1">Status</div>
            <div className="text-xs font-bold text-[#6bff8a]">
              {onChain ? 'On chain' : 'Not minted'}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onChain && (
            <>
              <a
                href={`https://1sat.market/outpoint/${platform.txid}_0/bsv21`}
                target="_blank"
                rel="noopener"
                className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
              >
                Trade on 1sat.market
              </a>
              <a
                href={`https://ordinals.gorillapool.io/api/bsv20/id/${platform.txid}_0`}
                target="_blank"
                rel="noopener"
                className="px-4 py-2 border border-[#333] hover:border-[#E50914] text-white text-xs font-black uppercase tracking-wider"
              >
                Verify at GorillaPool
              </a>
            </>
          )}
          <a
            href="https://bmovies.online/captable.html?id=platform"
            className="px-4 py-2 border border-[#333] hover:border-[#E50914] text-white text-xs font-black uppercase tracking-wider"
          >
            Cap table
          </a>
          <a
            href="https://bmovies.online/legal/platform-token-prospectus.html"
            className="px-4 py-2 border border-[#333] hover:border-[#E50914] text-white text-xs font-black uppercase tracking-wider"
          >
            Prospectus
          </a>
        </div>
      </div>
      {onChain && (
        <div className="text-[#666] text-[0.65rem] font-mono break-all">
          txid: {platform.txid}
        </div>
      )}
    </div>
  )
}
