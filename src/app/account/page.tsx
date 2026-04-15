'use client'

/**
 * /account — the bMovies studio dashboard.
 *
 * Six tabs on the authenticated user's dashboard:
 *
 *   My Films          — offers the user has commissioned, with
 *                       thumbnail, status, deep-links to the film /
 *                       timeline / cap table / deck brochure pages.
 *   Studio            — studio brand + current production pipeline.
 *   Agents            — agent marketplace scaffolding.
 *   Cap Tables        — per-film + $bMovies cap tables.
 *   Investor Packs    — printable per-film decks.
 *   Wallet            — BRC-100 wallet + $bMovies balance + dividends.
 *
 * Data layer: supabase-bmovies.ts (reads bct_offers, bct_artifacts,
 * bct_studios, bct_agents, bct_share_sales, bct_platform_config).
 *
 * Auth: Supabase session via storageKey 'bmovies-auth'. Works for
 * BRC-100 sign-ins because /api/auth/brc100/verify mints a real
 * Supabase session via the service_role key; BRC-100 users surface
 * here identified by `user.user_metadata.brc100_address` (the real
 * BSV key) and `display_name` (e.g. "BSV-1RkW4dt6"), with the raw
 * `user.email` being a synthetic `<addr>@bsv.bmovies.online` address
 * that we hide from the UI.
 *
 * My Films query: to tolerate both email/Google users (producer_id =
 * Supabase UUID) AND BRC-100 users (producer_id may = Supabase UUID
 * OR producer_address = BSV key), we OR both fields in a single
 * Supabase `.or()` clause when a BRC-100 address is available.
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
  | 'wallet'

const TABS: { id: Tab; label: string }[] = [
  { id: 'my-films',        label: 'My Films' },
  { id: 'studio',          label: 'Studio' },
  { id: 'agents',          label: 'Agents' },
  { id: 'cap-tables',      label: 'Cap Tables' },
  { id: 'investor-packs',  label: 'Investor Packs' },
  { id: 'wallet',          label: 'Wallet' },
]

/** USD price per tier — the four commission tiers on /commission.html */
const PRICE_BY_TIER: Record<string, number> = {
  pitch: 0.99,
  trailer: 9.99,
  short: 99,
  feature: 999,
}

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

/**
 * User-facing identity helpers.
 *
 * BRC-100 users have `user.email = <address>@bsv.bmovies.online` which
 * we never want to show. Prefer `user_metadata.display_name`, then the
 * raw BRC-100 address, and only fall back to `email` if neither is set
 * (email / Google users).
 */
function displayNameFor(user: User): string {
  const md = (user.user_metadata ?? {}) as Record<string, unknown>
  const display = typeof md.display_name === 'string' ? md.display_name : ''
  const addr = typeof md.brc100_address === 'string' ? md.brc100_address : ''
  if (display) return display
  if (addr) return `${addr.slice(0, 8)}…${addr.slice(-4)}`
  return user.email ?? 'Signed in'
}

function isBrc100User(user: User): boolean {
  const md = (user.user_metadata ?? {}) as Record<string, unknown>
  return typeof md.brc100_address === 'string' && md.brc100_address.length > 20
}

function brc100AddressOf(user: User): string | null {
  const md = (user.user_metadata ?? {}) as Record<string, unknown>
  return typeof md.brc100_address === 'string' ? md.brc100_address : null
}

function brc100ProviderOf(user: User): string | null {
  const md = (user.user_metadata ?? {}) as Record<string, unknown>
  return typeof md.brc100_provider === 'string' ? md.brc100_provider : null
}

function publicEmailFor(user: User): string | null {
  // Hide the synthetic BRC-100 email from the UI
  if (!user.email) return null
  if (user.email.endsWith('@bsv.bmovies.online')) return null
  return user.email
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('my-films')
  const [films, setFilms] = useState<Film[]>([])
  const [filmsLoading, setFilmsLoading] = useState(false)
  const [filmsError, setFilmsError] = useState<string | null>(null)

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
  //
  // Covers two identity shapes in bct_offers.producer_id:
  //   (a) Supabase UUID — the canonical case for email/Google users
  //   (b) BSV address — if a BRC-100 user's commission predates the
  //       verify endpoint linking (falls back to producer_address
  //       match in the OR clause)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadFilms() {
      if (!user) return
      setFilmsLoading(true)
      setFilmsError(null)
      const address = brc100AddressOf(user)
      try {
        let q = bmovies
          .from('bct_offers')
          .select(
            `id, title, synopsis, tier, status, token_ticker, token_mint_txid,
             commissioner_percent, created_at,
             bct_artifacts ( id, kind, role, url, step_id, superseded_by )`,
          )
          .is('archived_at', null)
          .order('created_at', { ascending: false })
        if (address) {
          q = q.or(`producer_id.eq.${user.id},producer_address.eq.${address}`)
        } else {
          q = q.eq('producer_id', user.id)
        }
        const { data, error } = await q
        if (cancelled) return
        if (error) {
          console.error('[account] films fetch failed:', error)
          setFilmsError(error.message)
          setFilms([])
        } else {
          setFilms((data as unknown as Film[]) || [])
        }
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[account] films fetch threw:', msg)
        setFilmsError(msg)
        setFilms([])
      } finally {
        if (!cancelled) setFilmsLoading(false)
      }
    }
    loadFilms()
    return () => {
      cancelled = true
    }
  }, [user])

  // ─── Derived stats for the header ───
  const stats = useMemo(() => {
    const count = films.length
    const committedUsd = films.reduce(
      (sum, f) => sum + (PRICE_BY_TIER[f.tier] ?? 0),
      0,
    )
    const onChainCount = films.filter(
      (f) => f.token_mint_txid && /^[0-9a-f]{64}$/.test(f.token_mint_txid),
    ).length
    const activeCount = films.filter(
      (f) => !['released', 'archived'].includes(f.status),
    ).length
    return { count, committedUsd, onChainCount, activeCount }
  }, [films])

  // ─── Top-level branches ───

  if (loading) return <SkeletonDashboard />

  if (!user) return <SignedOutHero />

  // Signed-in dashboard
  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-12">
      {/* Header */}
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2 truncate">
          {displayNameFor(user)}
          {isBrc100User(user) && (
            <span className="ml-2 text-[#E50914]">· BRC-100</span>
          )}
        </div>
        <h1
          className="text-5xl font-black leading-none"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '-0.01em' }}
        >
          My <span className="text-[#E50914]">studio</span>
        </h1>
        <p className="text-[#888] text-sm mt-2 max-w-xl">
          Every film you&apos;ve commissioned, every agent you&apos;ve hired, every
          royalty share you hold. All in one place. Share cap tables and
          investor packs with a single click.
        </p>
      </header>

      {/* Stats strip */}
      <StatsStrip
        filmsCount={stats.count}
        committedUsd={stats.committedUsd}
        onChainCount={stats.onChainCount}
        activeCount={stats.activeCount}
      />

      {/* Tabs */}
      <nav
        className="mb-8 flex flex-wrap gap-1 border-b border-[#1a1a1a]"
        role="tablist"
        aria-label="Studio sections"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === t.id
                ? 'text-white border-b-2 border-[#E50914]'
                : 'text-[#666] hover:text-[#bbb]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div>
        {activeTab === 'my-films' && (
          <MyFilmsTab films={films} loading={filmsLoading} error={filmsError} />
        )}
        {activeTab === 'studio' && <StudioTab hasFilms={stats.count > 0} />}
        {activeTab === 'agents' && <AgentsTab />}
        {activeTab === 'cap-tables' && <CapTablesTab films={films} />}
        {activeTab === 'investor-packs' && <InvestorPacksTab films={films} />}
        {activeTab === 'wallet' && <WalletTab user={user} />}
      </div>
    </div>
  )
}

/* ───────── Signed-out hero ───────── */

function SignedOutHero() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="max-w-md text-center">
        <div
          className="text-6xl font-black mb-4 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Sign in to<br/>
          open your <span className="text-[#E50914]">studio</span>
        </div>
        <p className="text-[#888] text-sm leading-relaxed mb-6">
          Your account, your films, your cap tables, your agents, your
          dividends — all live inside this dashboard. Sign in with your
          BRC-100 wallet (recommended) or with the email you used to
          commission a film.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="px-6 py-3 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
          >
            Sign in →
          </Link>
          <a
            href="/commission.html"
            className="px-6 py-3 border border-[#333] hover:border-[#E50914] text-white text-xs font-black uppercase tracking-wider"
          >
            Commission a film ($0.99 +)
          </a>
        </div>
      </div>
    </div>
  )
}

/* ───────── Loading skeleton ───────── */

/**
 * Rendered before the auth bootstrap completes. Matches the shape of
 * the signed-in dashboard (header + stats strip + tabs row + content
 * area) so the transition to the real UI is invisible to the eye.
 * Still animates (via Tailwind `animate-pulse`) so the user sees the
 * page is alive instead of a dead gray block.
 */
function SkeletonDashboard() {
  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-12 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="h-2 w-32 bg-[#1a1a1a] mb-3" />
        <div className="h-12 w-64 bg-[#1a1a1a]" />
        <div className="h-3 w-80 bg-[#0e0e0e] mt-4" />
      </div>

      {/* Stats strip skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
            <div className="h-2 w-16 bg-[#1a1a1a] mb-3" />
            <div className="h-8 w-24 bg-[#151515]" />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="mb-8 flex gap-4 border-b border-[#1a1a1a] pb-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-3 w-20 bg-[#1a1a1a]" />
        ))}
      </div>

      {/* Tab content skeleton — 3-card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a]">
            <div className="aspect-[2/3] bg-[#050505]" />
            <div className="p-4">
              <div className="h-4 w-3/4 bg-[#1a1a1a] mb-2" />
              <div className="h-3 w-1/2 bg-[#151515] mb-3" />
              <div className="h-2 w-full bg-[#0e0e0e]" />
              <div className="h-2 w-5/6 bg-[#0e0e0e] mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────── Stats strip ───────── */

function StatsStrip({
  filmsCount,
  committedUsd,
  onChainCount,
  activeCount,
}: {
  filmsCount: number
  committedUsd: number
  onChainCount: number
  activeCount: number
}) {
  const formatUsd = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <StatCard label="Films commissioned" value={filmsCount.toLocaleString()} />
      <StatCard label="Committed" value={formatUsd(committedUsd)} />
      <StatCard label="On chain" value={onChainCount.toLocaleString()} accent={onChainCount > 0} />
      <StatCard label="In production" value={activeCount.toLocaleString()} />
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={`border bg-[#0a0a0a] p-5 transition-colors ${
        accent ? 'border-[#E50914]' : 'border-[#1a1a1a]'
      }`}
    >
      <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">
        {label}
      </div>
      <div
        className="text-3xl font-black leading-none"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        {accent && value !== '0' ? (
          <span className="text-[#E50914]">{value}</span>
        ) : (
          value
        )}
      </div>
    </div>
  )
}

/* ───────── My Films tab ───────── */

function MyFilmsTab({
  films,
  loading,
  error,
}: {
  films: Film[]
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a]">
            <div className="aspect-[2/3] bg-[#050505]" />
            <div className="p-4">
              <div className="h-4 w-3/4 bg-[#1a1a1a] mb-2" />
              <div className="h-2 w-full bg-[#0e0e0e]" />
              <div className="h-2 w-5/6 bg-[#0e0e0e] mt-1" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-[#E50914] bg-[#1a0003] p-6">
        <div className="text-[#ff6b7a] text-xs font-bold uppercase tracking-wider mb-2">
          Could not load your films
        </div>
        <div className="text-[#bbb] text-sm mb-3">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-[0.65rem] font-bold uppercase tracking-wider text-[#E50914] border-b border-[#E50914]"
        >
          Retry →
        </button>
      </div>
    )
  }

  if (films.length === 0) {
    return (
      <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 max-w-2xl">
        <div
          className="text-3xl font-black mb-3 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          You haven&apos;t commissioned<br/>
          <span className="text-[#E50914]">a film yet.</span>
        </div>
        <p className="text-[#888] text-sm leading-relaxed mb-5">
          Start with a $0.99 pitch — the AI swarm writes a logline,
          synopsis, and one poster in under 60 seconds. If you like it,
          upgrade to a trailer, short, or feature. Every film becomes a
          BSV-21 token with its own cap table.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/commission.html"
            className="inline-block px-5 py-2.5 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
          >
            Commission a film →
          </a>
          <a
            href="/productions.html"
            className="inline-block px-5 py-2.5 border border-[#333] hover:border-[#E50914] text-white text-xs font-black uppercase tracking-wider"
          >
            Browse the slate
          </a>
        </div>
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
          <div
            className="text-[#666] text-5xl font-black"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            b<span className="text-[#E50914]">M</span>
          </div>
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
            href={`/film.html?id=${encodeURIComponent(film.id)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 bg-[#E50914] text-white"
          >
            Watch
          </a>
          <a
            href={`/production.html?id=${encodeURIComponent(film.id)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] text-white hover:border-[#E50914]"
          >
            Timeline
          </a>
          <a
            href={`/captable.html?id=${encodeURIComponent(film.id)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] text-[#bbb] hover:text-white"
          >
            Cap table
          </a>
          <a
            href={`/deck.html?id=${encodeURIComponent(film.id)}`}
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

function StudioTab({ hasFilms }: { hasFilms: boolean }) {
  return (
    <div className="max-w-2xl">
      <div className="border border-[#222] bg-[#0a0a0a] p-6 mb-4">
        <h3
          className="text-2xl font-black mb-2 leading-none"
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
          See{' '}
          <a
            href="/about.html#ponzinomics-field-guide"
            className="text-[#E50914] hover:underline"
          >
            the Ponzinomics field guide
          </a>{' '}
          for the full plan.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/studios.html"
            className="inline-block text-[0.65rem] font-bold uppercase tracking-wider px-3 py-2 bg-[#E50914] text-white"
          >
            Browse founding studios →
          </a>
          {!hasFilms && (
            <a
              href="/commission.html"
              className="inline-block text-[0.65rem] font-bold uppercase tracking-wider px-3 py-2 border border-[#333] hover:border-[#E50914] text-white"
            >
              Start a commission
            </a>
          )}
        </div>
      </div>
      <div className="border border-dashed border-[#222] bg-[#050505] p-6">
        <div className="text-[#666] text-[0.55rem] uppercase tracking-wider font-bold mb-2">
          Coming in Phase 2
        </div>
        <div className="text-[#888] text-sm leading-relaxed">
          Your own studio name, logo upload, bio, production pipeline
          dashboard, agent roster, and a studio treasury token that earns
          1% of every commission routed through your brand.
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
          href="/agents.html"
          className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
        >
          <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914] mb-2">
            The bench
          </div>
          <div
            className="text-3xl font-black text-white mb-1 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            58 agents
          </div>
          <div className="text-[#888] text-xs">Browse the public roster.</div>
        </a>
        <a
          href="/studios.html"
          className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
        >
          <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914] mb-2">
            Founding studios
          </div>
          <div
            className="text-3xl font-black text-white mb-1 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            6 studios
          </div>
          <div className="text-[#888] text-xs">
            Each with 8 specialists + shared pool.
          </div>
        </a>
        <div className="p-5 border border-dashed border-[#222] bg-[#050505]">
          <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-2">
            Phase 2
          </div>
          <div
            className="text-3xl font-black text-[#666] mb-1 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            Actors
          </div>
          <div className="text-[#444] text-xs">Salaried talent marketplace.</div>
        </div>
        <div className="p-5 border border-dashed border-[#222] bg-[#050505]">
          <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#666] mb-2">
            Phase 2
          </div>
          <div
            className="text-3xl font-black text-[#666] mb-1 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            Editors
          </div>
          <div className="text-[#444] text-xs">Freelance editor bidding.</div>
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
          href="/captable.html?id=platform"
          className="p-5 border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] hover:from-[#2a0005] transition-colors"
        >
          <div className="text-[0.55rem] text-[#E50914] font-bold uppercase tracking-wider mb-2">
            Platform token
          </div>
          <div
            className="text-3xl font-black text-white mb-1 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            $bMovies
          </div>
          <div className="text-[#888] text-xs">1B supply · live on BSV mainnet</div>
        </a>
        {films.length === 0 ? (
          <div className="p-5 border border-dashed border-[#222] bg-[#050505] flex items-center justify-center">
            <div className="text-[#666] text-xs text-center max-w-[12rem]">
              Commission a film to see its cap table here alongside the
              platform token.
            </div>
          </div>
        ) : (
          films.slice(0, 8).map((f) => (
            <a
              key={f.id}
              href={`/captable.html?id=${encodeURIComponent(f.id)}`}
              className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
            >
              <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-2">
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
        <div className="text-[#888] text-sm mb-4 leading-relaxed">
          Every film you commission generates a printable investor pack:
          synopsis, treatment, cap table, storyboard frames, production
          timeline, on-chain token receipt. Commission a film to get
          your first pack.
        </div>
        <a
          href="/commission.html"
          className="inline-block px-5 py-2.5 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
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
          href={`/deck.html?id=${encodeURIComponent(f.id)}`}
          target="_blank"
          rel="noopener"
          className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
        >
          <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-2">
            {f.tier} · ${f.token_ticker}
          </div>
          <div
            className="text-xl font-black text-white mb-2 leading-tight"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {f.title}
          </div>
          <div className="text-[0.6rem] text-[#666]">Open printable deck →</div>
        </a>
      ))}
    </div>
  )
}

/* ───────── Wallet tab ───────── */

function WalletTab({ user }: { user: User }) {
  const brc100Address = brc100AddressOf(user)
  const brc100Provider = brc100ProviderOf(user)
  const email = publicEmailFor(user)
  const isBrc100 = isBrc100User(user)
  return (
    <div className="max-w-2xl">
      {/* Primary identity card */}
      {isBrc100 && brc100Address ? (
        <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-6 mb-4">
          <div className="text-[0.55rem] text-[#E50914] font-bold uppercase tracking-wider mb-2">
            BRC-100 wallet · {brc100Provider || 'unknown'}
          </div>
          <div
            className="text-2xl font-black text-white mb-3 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {displayNameFor(user)}
          </div>
          <div className="text-[#bbb] font-mono text-xs break-all mb-1">
            {brc100Address}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <a
              href={`https://whatsonchain.com/address/${brc100Address}`}
              target="_blank"
              rel="noopener"
              className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] hover:border-[#E50914] text-[#bbb]"
            >
              View on WhatsOnChain →
            </a>
          </div>
        </div>
      ) : (
        <div className="border border-[#222] bg-[#0a0a0a] p-6 mb-4">
          <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-2">
            Signed in as
          </div>
          <div className="text-white font-mono text-sm break-all mb-3">
            {email ?? user.id}
          </div>
          <Link
            href="/login"
            className="inline-block text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white"
          >
            Link a BRC-100 wallet →
          </Link>
        </div>
      )}

      {/* Secondary: internal Supabase id (collapsed) */}
      <details className="mb-4 border border-[#222] bg-[#0a0a0a]">
        <summary className="p-4 cursor-pointer text-[0.6rem] text-[#666] font-bold uppercase tracking-wider hover:text-white">
          Technical details
        </summary>
        <div className="px-4 pb-4 -mt-1">
          <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-1">
            Supabase user id
          </div>
          <div className="text-[#888] font-mono text-[0.65rem] break-all">{user.id}</div>
        </div>
      </details>

      {/* Roadmap card */}
      <div className="border border-dashed border-[#222] bg-[#050505] p-6">
        <div className="text-[#666] text-[0.55rem] uppercase tracking-wider font-bold mb-3">
          Coming next
        </div>
        <ul className="text-[#888] text-sm leading-relaxed space-y-1.5">
          <li>· $bMovies balance + tranche price + buy interface</li>
          <li>· Per-film $TICKER balances for films you hold shares in</li>
          <li>· Dividend history from ticket sales (paid out in $MNEE via the Runar covenant)</li>
          <li>· Export wallet + KYC status</li>
        </ul>
      </div>
    </div>
  )
}
