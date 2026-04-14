'use client'

/**
 * /account — the bMovies studio dashboard.
 *
 * Seven tabs, each the landing surface for a major user workflow:
 *
 *   My Films          — every offer the user has commissioned, grouped
 *                       by tier, with status / thumbnail / deep-link
 *                       to the per-film tools
 *   My Studio         — studio brand (name, logo, bio) + current
 *                       production pipeline + quick agent picker
 *   Agents            — hire cast, hire crew, hire editors, salaries,
 *                       soul files (scaffolded — live agent marketplace
 *                       is Phase 2)
 *   Cap Tables        — per-film and $bMovies cap tables with allocation
 *                       bars and on-chain verification
 *   Investor Packs    — printable per-film decks, one click to PDF
 *   Creative Tools    — launcher grid for the 6 creative tools
 *   Wallet            — BRC-100 wallet connect + $bMovies balance +
 *                       per-film $TICKER balances + dividend history
 *
 * Data layer: supabase-bmovies.ts (reads bct_offers, bct_artifacts,
 * bct_studios, bct_agents, bct_share_sales, bct_platform_config).
 *
 * Auth: Supabase session. We pull the current user from the shared
 * auth cookie (storageKey = 'bmovies-auth') and match against
 * bct_offers.producer_id.
 *
 * Fallback: if the user isn't signed in, the page shows a "sign in
 * to open your studio" screen with a link back to bmovies.online.
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { bmovies } from '@/lib/supabase-bmovies'
import type { User } from '@supabase/supabase-js'

type Tab =
  | 'my-films'
  | 'studio'
  | 'agents'
  | 'cap-tables'
  | 'investor-packs'
  | 'creative-tools'
  | 'wallet'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'my-films',        label: 'My Films',        icon: '🎬' },
  { id: 'studio',          label: 'Studio',          icon: '🏢' },
  { id: 'agents',          label: 'Agents',          icon: '🎭' },
  { id: 'cap-tables',      label: 'Cap Tables',      icon: '📊' },
  { id: 'investor-packs',  label: 'Investor Packs',  icon: '📄' },
  { id: 'creative-tools',  label: 'Creative Tools',  icon: '🛠' },
  { id: 'wallet',          label: 'Wallet',          icon: '💳' },
]

interface Film {
  id: string
  title: string
  synopsis: string | null
  tier: string
  status: string
  token_ticker: string | null
  token_mint_txid: string | null
  commissioner_percent: number
  created_at: string
  bct_artifacts: { id: number; kind: string; role: string | null; url: string; step_id: string | null; superseded_by: number | null }[]
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('my-films')
  const [films, setFilms] = useState<Film[]>([])
  const [filmsLoading, setFilmsLoading] = useState(false)

  // ─── Auth bootstrap ───
  useEffect(() => {
    let cancelled = false
    async function boot() {
      const { data } = await bmovies.auth.getSession()
      if (cancelled) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    }
    boot()
    const { data: sub } = bmovies.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // ─── Load films for the current user ───
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadFilms() {
      setFilmsLoading(true)
      // Two-pass lookup: by producer_id if set, otherwise by buyer_email
      // (via bct_share_sales or bct_platform_investments) — we start
      // with the producer_id path since commissioners are recorded
      // there. If the user has zero commissioned films the UI shows
      // an empty state with a CTA to commission one.
      const { data, error } = await bmovies
        .from('bct_offers')
        .select(
          `id, title, synopsis, tier, status, token_ticker, token_mint_txid,
           commissioner_percent, created_at,
           bct_artifacts ( id, kind, role, url, step_id, superseded_by )`,
        )
        .eq('producer_id', user!.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        console.error('[account] films fetch failed:', error)
        setFilms([])
      } else {
        setFilms((data as unknown as Film[]) || [])
      }
      setFilmsLoading(false)
    }
    loadFilms()
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-[#666] text-sm">Loading your studio…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div
            className="text-6xl font-black mb-4"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            Sign in to<br/>
            open your <span className="text-[#E50914]">studio</span>
          </div>
          <p className="text-[#888] text-sm leading-relaxed mb-6">
            Your account, your films, your cap tables, your agents, your
            dividends — all live inside this dashboard. Sign in with the
            same email you used to commission a film on bMovies, or start
            fresh with a $0.99 pitch.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="px-6 py-3 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
            >
              Sign in →
            </Link>
            <a
              href="https://bmovies.online/commission.html"
              className="px-6 py-3 border border-[#333] hover:border-[#E50914] text-white text-xs font-black uppercase tracking-wider"
            >
              Commission a film ($0.99 +)
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-12">
      {/* Header */}
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">
          {user.email}
        </div>
        <h1
          className="text-5xl font-black leading-none"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '-0.01em' }}
        >
          My <span className="text-[#E50914]">studio</span>
        </h1>
        <p className="text-[#888] text-sm mt-2 max-w-xl">
          Every film you've commissioned, every agent you've hired, every
          royalty share you hold. All in one place. Share cap tables and
          investor packs with a single click.
        </p>
      </header>

      {/* Tabs */}
      <nav className="mb-8 flex flex-wrap gap-1 border-b border-[#1a1a1a]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === t.id
                ? 'text-white border-b-2 border-[#E50914]'
                : 'text-[#666] hover:text-[#bbb]'
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div>
        {activeTab === 'my-films' && (
          <MyFilmsTab films={films} loading={filmsLoading} />
        )}
        {activeTab === 'studio' && <StudioTab />}
        {activeTab === 'agents' && <AgentsTab />}
        {activeTab === 'cap-tables' && <CapTablesTab films={films} />}
        {activeTab === 'investor-packs' && <InvestorPacksTab films={films} />}
        {activeTab === 'creative-tools' && <CreativeToolsTab />}
        {activeTab === 'wallet' && <WalletTab user={user} />}
      </div>
    </div>
  )
}

/* ───────── My Films tab ───────── */

function MyFilmsTab({ films, loading }: { films: Film[]; loading: boolean }) {
  if (loading) return <div className="text-[#666] text-sm py-8">Loading your films…</div>

  if (films.length === 0) {
    return (
      <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center">
        <div className="text-[#888] text-sm mb-4">
          You haven't commissioned any films yet. Start with a $0.99 pitch
          and upgrade any winner to a trailer, short, or feature.
        </div>
        <a
          href="https://bmovies.online/commission.html"
          className="inline-block px-5 py-2.5 bg-[#E50914] text-white text-xs font-black uppercase tracking-wider"
        >
          Commission a film →
        </a>
      </div>
    )
  }

  return (
    <div>
      <div className="text-[#888] text-xs mb-4">
        {films.length} film{films.length === 1 ? '' : 's'} commissioned
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {films.map((f) => (
          <FilmCard key={f.id} film={f} />
        ))}
      </div>
    </div>
  )
}

function FilmCard({ film }: { film: Film }) {
  const poster = (film.bct_artifacts || []).find(
    (a) => !a.superseded_by && (a.role === 'poster' || a.step_id === 'storyboard.poster'),
  )
  const onChain = film.token_mint_txid && /^[0-9a-f]{64}$/.test(film.token_mint_txid)
  return (
    <div className="border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors">
      {poster?.url ? (
        <div className="aspect-[2/3] bg-[#050505] overflow-hidden">
          <img src={poster.url} alt={film.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[2/3] bg-gradient-to-br from-[#1a0003] to-[#0a0000] flex items-center justify-center">
          <div className="text-[#444] text-5xl">🎬</div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3
            className="font-black text-lg leading-tight text-white"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {film.title}
          </h3>
          <span className="text-[0.55rem] font-mono text-[#E50914] shrink-0">
            ${film.token_ticker}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-3">
          <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
            {film.tier}
          </span>
          <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
            {film.status.replace(/_/g, ' ')}
          </span>
          {onChain && (
            <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#0e3a0e] text-[#6bff8a]">
              On chain
            </span>
          )}
        </div>
        <p className="text-[#888] text-xs leading-relaxed mb-4 line-clamp-2">
          {film.synopsis || 'No synopsis yet.'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <a
            href={`https://bmovies.online/film.html?id=${encodeURIComponent(film.id)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 bg-[#E50914] text-white"
          >
            Watch
          </a>
          <Link
            href={`/movie-editor?id=${encodeURIComponent(film.id)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] text-white hover:border-[#E50914]"
          >
            Edit
          </Link>
          <a
            href={`https://bmovies.online/captable.html?id=${encodeURIComponent(film.id)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] text-[#bbb] hover:text-white"
          >
            Cap table
          </a>
          <a
            href={`https://bmovies.online/deck.html?id=${encodeURIComponent(film.id)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] text-[#bbb] hover:text-white"
          >
            Deck
          </a>
        </div>
      </div>
    </div>
  )
}

/* ───────── Studio tab ───────── */

function StudioTab() {
  return (
    <div className="max-w-2xl">
      <div className="border border-[#222] bg-[#0a0a0a] p-6 mb-4">
        <h3
          className="text-2xl font-black mb-2"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Your studio brand
        </h3>
        <p className="text-[#888] text-sm leading-relaxed mb-4">
          At launch, every film you commission is attributed to one of the
          six founding studios ($BOLTD, $CLNKR, $BOT21, $DREAM, $NRLSP,
          $PRMNT). Their aesthetic shapes the work, and their brand goes
          on the poster alongside yours as the producer.
        </p>
        <p className="text-[#888] text-sm leading-relaxed mb-4">
          Phase 2 (post-hackathon): spawn your own named studio with your
          own logo and bio, and other users can commission through you.
          See <a href="https://bmovies.online/about.html#ponzinomics-field-guide" className="text-[#E50914]">the Ponzinomics field guide</a> for the full plan.
        </p>
        <a
          href="https://bmovies.online/studios.html"
          className="inline-block text-xs font-bold uppercase tracking-wider text-[#E50914] border-b border-[#E50914] pb-0.5"
        >
          Browse founding studios →
        </a>
      </div>
      <div className="border border-dashed border-[#222] bg-[#050505] p-6 text-center">
        <div className="text-[#666] text-xs uppercase tracking-wider font-bold mb-2">Coming in Phase 2</div>
        <div className="text-[#888] text-sm">
          Your own studio name, logo upload, bio, production pipeline
          dashboard, agent roster.
        </div>
      </div>
    </div>
  )
}

/* ───────── Agents tab ───────── */

function AgentsTab() {
  return (
    <div>
      <div className="mb-6 max-w-2xl">
        <p className="text-[#888] text-sm leading-relaxed">
          Every commission draws an <strong className="text-white">11-specialist crew</strong> from
          the bMovies bench: writer, director, cinematographer, casting,
          production designer, storyboard, composer, editor, sound,
          publicist, producer. They work under your selected studio
          brand. 58 named agents across 6 founding studios + a shared
          specialist pool.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <a
          href="https://bmovies.online/agents.html"
          className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
        >
          <div className="text-3xl mb-2">🎭</div>
          <div className="text-sm font-black text-white mb-1">58 agents</div>
          <div className="text-[#888] text-xs">Browse the bench on the public site.</div>
        </a>
        <a
          href="https://bmovies.online/studios.html"
          className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
        >
          <div className="text-3xl mb-2">🏢</div>
          <div className="text-sm font-black text-white mb-1">6 studios</div>
          <div className="text-[#888] text-xs">Each with 8 specialists + shared pool.</div>
        </a>
        <div className="p-5 border border-dashed border-[#222] bg-[#050505]">
          <div className="text-3xl mb-2 opacity-40">⭐</div>
          <div className="text-sm font-black text-[#666] mb-1">Actor market</div>
          <div className="text-[#444] text-xs">Phase 2 — salaried talent marketplace.</div>
        </div>
        <div className="p-5 border border-dashed border-[#222] bg-[#050505]">
          <div className="text-3xl mb-2 opacity-40">✂️</div>
          <div className="text-sm font-black text-[#666] mb-1">Editor market</div>
          <div className="text-[#444] text-xs">Phase 2 — freelance editor bidding.</div>
        </div>
      </div>
    </div>
  )
}

/* ───────── Cap Tables tab ───────── */

function CapTablesTab({ films }: { films: Film[] }) {
  return (
    <div>
      <div className="mb-6 max-w-2xl">
        <p className="text-[#888] text-sm leading-relaxed">
          Every film has a cap table. Every share is on-chain and
          verifiable independently at GorillaPool. Cap tables are
          printable for investor outreach.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <a
          href="https://bmovies.online/captable.html?id=platform"
          className="p-5 border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] hover:from-[#2a0005]"
        >
          <div className="text-xs text-[#E50914] font-bold uppercase tracking-wider mb-1">
            Platform token
          </div>
          <div className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-bebas)' }}>
            $bMovies
          </div>
          <div className="text-[#888] text-xs">1B supply · live on BSV mainnet</div>
        </a>
        {films.length === 0 ? (
          <div className="p-5 border border-dashed border-[#222] bg-[#050505] flex items-center justify-center">
            <div className="text-[#666] text-xs text-center">
              Commission a film to see its cap table here.
            </div>
          </div>
        ) : (
          films.slice(0, 8).map((f) => (
            <a
              key={f.id}
              href={`https://bmovies.online/captable.html?id=${encodeURIComponent(f.id)}`}
              className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
            >
              <div className="text-xs text-[#666] font-bold uppercase tracking-wider mb-1">
                {f.tier} · {f.commissioner_percent}% yours
              </div>
              <div
                className="text-xl font-black text-white mb-1 leading-tight"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                {f.title}
              </div>
              <div className="text-[0.65rem] font-mono text-[#E50914]">
                ${f.token_ticker}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  )
}

/* ───────── Investor Packs tab ───────── */

function InvestorPacksTab({ films }: { films: Film[] }) {
  if (films.length === 0) {
    return (
      <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 text-center max-w-xl">
        <div className="text-[#888] text-sm mb-4">
          Every film you commission generates a printable investor pack:
          synopsis, treatment, cap table, storyboard frames, production
          timeline, on-chain token receipt. Commission a film to get
          your first pack.
        </div>
        <a
          href="https://bmovies.online/commission.html"
          className="inline-block px-5 py-2.5 bg-[#E50914] text-white text-xs font-black uppercase tracking-wider"
        >
          Commission a film →
        </a>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
      {films.map((f) => (
        <a
          key={f.id}
          href={`https://bmovies.online/deck.html?id=${encodeURIComponent(f.id)}`}
          target="_blank"
          rel="noopener"
          className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
        >
          <div className="text-xs text-[#666] font-bold uppercase tracking-wider mb-1">
            {f.tier} · ${f.token_ticker}
          </div>
          <div
            className="text-xl font-black text-white mb-2 leading-tight"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {f.title}
          </div>
          <div className="text-[0.65rem] text-[#666]">Open printable deck →</div>
        </a>
      ))}
    </div>
  )
}

/* ───────── Creative Tools tab ───────── */

function CreativeToolsTab() {
  const tools = [
    { href: '/movie-editor',    label: 'Movie editor',    desc: 'Timeline-based scene editor' },
    { href: '/storyboard',      label: 'Storyboard',      desc: 'Frame-by-frame with AI gen' },
    { href: '/storyboard-gen',  label: 'Storyboard gen',  desc: 'Batch-generate hero frames' },
    { href: '/script-gen',      label: 'Script editor',   desc: 'Screenplay with act structure' },
    { href: '/storyline-gen',   label: 'Storyline',       desc: 'Treatment + beat sheet' },
    { href: '/title-gen',       label: 'Title generator', desc: 'Cinematic title brainstorm' },
    { href: '/pitch-deck',      label: 'Pitch deck',      desc: 'Printable investor deck' },
    { href: '/prompt-gen',      label: 'Prompt gen',      desc: 'Better prompts for the crew' },
  ]
  return (
    <div>
      <div className="mb-6 max-w-2xl">
        <p className="text-[#888] text-sm leading-relaxed">
          Ported from NPGX and wired to your bMovies films. Each tool
          reads and writes to your film's artifact history, so any edit
          you make lives forever as a new version with the old one still
          addressable on the production timeline.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
          >
            <div
              className="text-lg font-black text-white mb-1"
              style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.02em' }}
            >
              {t.label}
            </div>
            <div className="text-[#888] text-xs leading-relaxed">{t.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ───────── Wallet tab ───────── */

function WalletTab({ user }: { user: User }) {
  return (
    <div className="max-w-2xl">
      <div className="border border-[#222] bg-[#0a0a0a] p-6 mb-4">
        <div className="text-xs text-[#666] font-bold uppercase tracking-wider mb-1">
          Signed in as
        </div>
        <div className="text-white font-mono text-sm mb-4">{user.email}</div>
        <div className="text-xs text-[#666] font-bold uppercase tracking-wider mb-1">
          Supabase user id
        </div>
        <div className="text-[#888] font-mono text-xs break-all">{user.id}</div>
      </div>
      <div className="border border-dashed border-[#222] bg-[#050505] p-6">
        <div className="text-[#666] text-xs uppercase tracking-wider font-bold mb-2">Coming next</div>
        <ul className="text-[#888] text-sm leading-relaxed space-y-1.5">
          <li>· BRC-100 wallet connect (Metanet Client, Yours Wallet, HandCash)</li>
          <li>· $bMovies balance + tranche price + buy interface</li>
          <li>· Per-film $TICKER balances for films you hold shares in</li>
          <li>· Dividend history from ticket sales (paid out in $MNEE via the Runar covenant)</li>
          <li>· Export wallet + KYC status</li>
        </ul>
      </div>
    </div>
  )
}
