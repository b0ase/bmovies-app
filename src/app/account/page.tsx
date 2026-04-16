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

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
  | 'chat'

const TABS: { id: Tab; label: string }[] = [
  { id: 'my-films',        label: 'My Films' },
  { id: 'studio',          label: 'Studio' },
  { id: 'agents',          label: 'Agents' },
  { id: 'cap-tables',      label: 'Cap Tables' },
  { id: 'investor-packs',  label: 'Investor Packs' },
  { id: 'wallet',          label: 'Wallet' },
  { id: 'chat',            label: 'Agent' },
]

/** USD price per tier — the four commission tiers on /commission.html */
const PRICE_BY_TIER: Record<string, number> = {
  pitch: 0.99,
  trailer: 9.99,
  short: 99,
  feature: 999,
}

/**
 * Poster overrides — keep in sync with film.html / productions.html /
 * index.html / deck.html / leaderboard.html / offer.html / watch.html
 * in public/. The DB stores xAI temp URLs that expire in ~24h, so we
 * treat the static JPGs under public/img/films/ as the source of
 * truth and the bct_artifacts rows as a last-resort fallback.
 *
 * Keys MUST be lowercased and punctuation-exact against the film
 * title's .toLowerCase() — including the apostrophe in "isn't".
 */
const POSTER_MAP: Record<string, string> = {
  'echoes of the last signal':           '/img/films/echoes-of-the-last-signal.jpg',
  'the fold':                            '/img/films/the-fold.jpg',
  'the weight of water':                 '/img/films/the-weight-of-water.jpg',
  'the lantern that forgot its flame':   '/img/films/the-lantern-that-forgot-its-flame.jpg',
  'the mirror protocol':                 '/img/films/the-mirror-protocol.jpg',
  'off-key heroes':                      '/img/films/off-key-heroes.jpg',
  'midnight swarm':                      '/img/films/midnight-swarm.jpg',
  'the last piece':                      '/img/films/the-last-piece.jpg',
  'star wars episode 1000':              '/img/films/episode-1000.jpg',
  "that weirdo isn't satoshi":           '/img/films/that-weirdo-isnt-satoshi.jpg',
  'spoon from space':                    '/img/films/spoon-from-space.jpg',
  'silverfish in the cathedral':         '/img/films/silverfish-in-the-cathedral.jpg',
  'the clockmakers daughter':            '/img/films/the-clockmakers-daughter.jpg',
  'the cartographer who mapped dreams':  '/img/films/the-cartographer-who-mapped-dreams.jpg',
  'the coffee machine':                  '/img/films/the-coffee-machine.jpg',
  'the last lighthouse':                 '/img/films/the-last-lighthouse.jpg',
  'cipher of the drowned city':          '/img/films/cipher-of-the-drowned-city.jpg',
  'echoes beneath glacier 9':            '/img/films/echoes-beneath-glacier-9.jpg',
  'the cartographer of empty rooms':     '/img/films/the-cartographer-of-empty-rooms.jpg',
  'pale horse, iron sky':                '/img/films/pale-horse-iron-sky.jpg',
  'sub-orbital lullaby':                 '/img/films/sub-orbital-lullaby.jpg',
  'glasshouse':                          '/img/films/glasshouse.jpg',
  'the last transmission':               '/img/films/the-last-transmission.jpg',
}

/** Any URL matching the xAI imgen temp CDN is untrustworthy — it dies
 *  in ~24h. The feature-worker is supposed to mirror these to
 *  /var/www/bmovies-assets/ on Hetzner but the mirror is currently
 *  empty, so the DB rows point at dead upstreams. Treat as null. */
function isEphemeralUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && /imgen\.x\.ai\/xai-imgen\/xai-tmp/.test(url)
}

/** Resolve the poster for a film in priority order:
 *   1. POSTER_MAP override (static JPG in public/img/films/)
 *   2. Non-ephemeral poster artifact URL from bct_artifacts
 *   3. Non-ephemeral storyboard frame
 *   4. null — caller renders the bM placeholder badge
 */
function resolvePosterUrl(film: Film): string | null {
  const mapHit = POSTER_MAP[(film.title || '').toLowerCase()]
  if (mapHit) return mapHit
  const arts = film.bct_artifacts || []
  const poster = arts.find(
    (a) => !a.superseded_by && a.role === 'poster' && a.kind === 'image',
  )
  if (poster?.url && !isEphemeralUrl(poster.url)) return poster.url
  const storyboard = arts.find(
    (a) => !a.superseded_by && (a.role === 'storyboard' || a.step_id === 'storyboard.poster') && a.kind === 'image',
  )
  if (storyboard?.url && !isEphemeralUrl(storyboard.url)) return storyboard.url
  return null
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
  account_id: string | null
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
  return (
    <Suspense fallback={<SkeletonDashboard />}>
      <AccountContent />
    </Suspense>
  )
}

function AccountContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('my-films')
  const [films, setFilms] = useState<Film[]>([])
  const [filmsLoading, setFilmsLoading] = useState(false)
  const [filmsError, setFilmsError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)

  // If URL has ?tab=studio, switch to that tab on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam as Tab)
    }
  }, [searchParams])

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

  // ─── Resolve bct_accounts.id for the current user ───
  useEffect(() => {
    if (!user) { setAccountId(null); return; }
    let cancelled = false
    async function resolveAccount() {
      const { data } = await bmovies
        .from('bct_accounts')
        .select('id')
        .eq('auth_user_id', user!.id)
        .maybeSingle()
      if (!cancelled) setAccountId((data?.id as string) ?? null)
    }
    resolveAccount()
    return () => { cancelled = true }
  }, [user])

  // ─── Load films for the current user ───
  //
  // The correct linkage is via `bct_offers.account_id` →
  // `bct_accounts.auth_user_id`, NOT `producer_id` — which is the
  // on-chain agent slug (e.g. "spielbergx", "stripe-feature",
  // "marketplace-producer"), not the commissioning human. Earlier
  // iterations of this page queried by producer_id and returned
  // zero rows for everyone because no offer records a user UUID
  // there.
  //
  // Flow:
  //   1. Resolve the user's bct_accounts row via auth_user_id
  //      (BRC-100 users always have one — it's created by
  //      /api/auth/brc100/verify. Email/Google users may or may
  //      not — we insert-on-demand to keep the model consistent).
  //   2. Query bct_offers where account_id = that row's id.
  //   3. For BRC-100 users, also union with offers whose
  //      producer_address matches the BSV key, to catch pre-link
  //      commissions or direct-wallet payments that didn't pass
  //      through the auth flow.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadFilms() {
      if (!user) return
      setFilmsLoading(true)
      setFilmsError(null)
      const address = brc100AddressOf(user)
      try {
        // 1. Resolve the user's bct_accounts row
        const { data: accountRow, error: accErr } = await bmovies
          .from('bct_accounts')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (accErr) {
          console.warn('[account] bct_accounts lookup failed:', accErr.message)
        }
        const accountId = accountRow?.id as string | undefined

        // 2. Build the query. If we have an account id, query by it;
        //    if we ALSO have a BRC-100 address, union with the
        //    producer_address match to catch direct-wallet flows.
        //    If we have neither, the user has no bct_accounts row
        //    and no wallet — return empty (they need to commission
        //    or link a wallet first).
        if (!accountId && !address) {
          setFilms([])
          setFilmsLoading(false)
          return
        }

        let q = bmovies
          .from('bct_offers')
          .select(
            `id, title, synopsis, tier, status, token_ticker, token_mint_txid,
             commissioner_percent, account_id, created_at,
             bct_artifacts ( id, kind, role, url, step_id, superseded_by )`,
          )
          .is('archived_at', null)
          .order('created_at', { ascending: false })

        if (accountId && address) {
          q = q.or(`account_id.eq.${accountId},producer_address.eq.${address}`)
        } else if (accountId) {
          q = q.eq('account_id', accountId)
        } else if (address) {
          q = q.eq('producer_address', address)
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
        {activeTab === 'studio' && (
          <StudioTab
            hasFilms={stats.count > 0}
            user={user}
            accountId={accountId}
            sessionIdFromUrl={searchParams.get('session_id')}
          />
        )}
        {activeTab === 'agents' && (
          <AgentsTab user={user} accountId={accountId} />
        )}
        {activeTab === 'cap-tables' && <CapTablesTab films={films} />}
        {activeTab === 'investor-packs' && <InvestorPacksTab films={films} />}
        {activeTab === 'wallet' && <WalletTab user={user} accountId={accountId} films={films} />}
        {activeTab === 'chat' && <ChatTab user={user} accountId={accountId} />}
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
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
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
  const posterUrl = resolvePosterUrl(film)
  const onChain = film.token_mint_txid && /^[0-9a-f]{64}$/.test(film.token_mint_txid)
  return (
    <div className="border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors">
      {posterUrl ? (
        <div className="aspect-[2/3] bg-[#050505] overflow-hidden">
          <img src={posterUrl} alt={film.title} className="w-full h-full object-cover" />
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
          <a
            href={`/production-room.html?id=${encodeURIComponent(film.id)}`}
            className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white transition-colors"
          >
            Production Room
          </a>
        </div>
      </div>
    </div>
  )
}

/* ───────── Studio tab ───────── */

const AESTHETIC_OPTIONS = [
  'Eclectic and bold',
  'Noir and moody',
  'Neon cyberpunk',
  'Classic Hollywood',
  'Minimalist and clean',
  'Surreal and dreamlike',
  'Gritty realism',
  'Cosmic and ethereal',
  'Retro 70s exploitation',
  'Japanese new wave',
]

interface StudioData {
  id: string
  name: string
  token_ticker: string
  treasury_address: string
  bio: string | null
  logo_url: string | null
  founded_year: number
  aesthetic: string | null
  owner_account_id: string | null
}

interface AgentData {
  id: string
  name: string
  studio: string
  role: string
  persona: string | null
  wallet_address: string
  reputation: number
  jobs_completed: number
  total_earned_sats: number
  token_ticker: string | null
  owner_account_id: string | null
  bio: string | null
  headshot_url: string | null
}

function StudioTab({
  hasFilms,
  user,
  accountId,
  sessionIdFromUrl,
}: {
  hasFilms: boolean
  user: User | null
  accountId: string | null
  sessionIdFromUrl: string | null
}) {
  const [studio, setStudio] = useState<StudioData | null>(null)
  const [studioLoading, setStudioLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)

  // Create form state
  const [studioName, setStudioName] = useState('')
  const [studioAesthetic, setStudioAesthetic] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Load existing studio
  useEffect(() => {
    if (!accountId) { setStudioLoading(false); return; }
    let cancelled = false
    async function loadStudio() {
      setStudioLoading(true)
      const { data, error } = await bmovies
        .from('bct_studios')
        .select('*')
        .eq('owner_account_id', accountId)
        .maybeSingle()
      if (!cancelled) {
        if (error) console.warn('[studio-tab] load error:', error.message)
        setStudio(data as StudioData | null)
        setStudioLoading(false)
      }
    }
    loadStudio()
    return () => { cancelled = true }
  }, [accountId])

  // Handle post-Stripe provisioning: if session_id is in the URL,
  // call /api/studio/complete to provision the studio
  useEffect(() => {
    if (!sessionIdFromUrl || !user || studio) return
    let cancelled = false
    async function provision() {
      setProvisioning(true)
      setProvisionError(null)
      try {
        const { data: session } = await bmovies.auth.getSession()
        const accessToken = session.session?.access_token
        if (!accessToken) throw new Error('Not authenticated')

        const res = await fetch('/api/studio/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ session_id: sessionIdFromUrl }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
        if (!cancelled) {
          setStudio(json.studio as StudioData)
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[studio-tab] provision error:', msg)
          setProvisionError(msg)
        }
      } finally {
        if (!cancelled) setProvisioning(false)
      }
    }
    provision()
    return () => { cancelled = true }
  }, [sessionIdFromUrl, user, studio])

  // Handle create form submission
  const handleCreate = useCallback(async () => {
    if (!user) return
    const name = studioName.trim()
    if (name.length < 2 || name.length > 50) {
      setCreateError('Studio name must be 2-50 characters')
      return
    }
    setCreateLoading(true)
    setCreateError(null)
    try {
      const { data: session } = await bmovies.auth.getSession()
      const accessToken = session.session?.access_token
      if (!accessToken) throw new Error('Not authenticated')

      const res = await fetch('/api/studio/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          aesthetic: studioAesthetic || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      // Redirect to Stripe checkout
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCreateError(msg)
    } finally {
      setCreateLoading(false)
    }
  }, [user, studioName, studioAesthetic])

  // ─── Provisioning state ───
  if (provisioning) {
    return (
      <div className="max-w-2xl">
        <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-8">
          <div className="animate-pulse">
            <div
              className="text-3xl font-black mb-4 leading-none"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              Provisioning your <span className="text-[#E50914]">studio</span>...
            </div>
            <p className="text-[#888] text-sm leading-relaxed mb-3">
              Generating your studio logo, bio, and 8 specialist agents via
              Grok AI. This takes 15-30 seconds.
            </p>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-[#E50914] animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (provisionError) {
    return (
      <div className="max-w-2xl">
        <div className="border border-[#E50914] bg-[#1a0003] p-6">
          <div className="text-[#ff6b7a] text-xs font-bold uppercase tracking-wider mb-2">
            Studio provisioning failed
          </div>
          <div className="text-[#bbb] text-sm mb-3">{provisionError}</div>
          <button
            onClick={() => window.location.reload()}
            className="text-[0.65rem] font-bold uppercase tracking-wider text-[#E50914] border-b border-[#E50914]"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (studioLoading) {
    return (
      <div className="max-w-2xl animate-pulse">
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-6">
          <div className="h-6 w-48 bg-[#1a1a1a] mb-4" />
          <div className="h-3 w-full bg-[#151515] mb-2" />
          <div className="h-3 w-3/4 bg-[#151515]" />
        </div>
      </div>
    )
  }

  // ─── Studio exists: show it ───
  if (studio) {
    return (
      <div className="max-w-2xl">
        <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-6 mb-4">
          <div className="flex items-start gap-5">
            {studio.logo_url ? (
              <img
                src={studio.logo_url}
                alt={`${studio.name} logo`}
                className="w-20 h-20 object-cover border border-[#333] shrink-0"
              />
            ) : (
              <div className="w-20 h-20 bg-[#1a1a1a] border border-[#333] flex items-center justify-center shrink-0">
                <span
                  className="text-3xl font-black text-[#E50914]"
                  style={{ fontFamily: 'var(--font-bebas)' }}
                >
                  {studio.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3
                  className="text-2xl font-black leading-none truncate"
                  style={{ fontFamily: 'var(--font-bebas)' }}
                >
                  {studio.name}
                </h3>
                <span className="text-[0.55rem] font-mono text-[#E50914] shrink-0">
                  ${studio.token_ticker}
                </span>
              </div>
              {studio.aesthetic && (
                <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-2">
                  {studio.aesthetic}
                </div>
              )}
              <p className="text-[#888] text-sm leading-relaxed mb-3">
                {studio.bio || 'No bio generated yet.'}
              </p>
              <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-1">
                Treasury
              </div>
              <div className="text-[#bbb] font-mono text-xs break-all mb-3">
                {studio.treasury_address}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://whatsonchain.com/address/${studio.treasury_address}`}
                  target="_blank"
                  rel="noopener"
                  className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] hover:border-[#E50914] text-[#bbb]"
                >
                  View treasury on chain
                </a>
                <a
                  href="/studios.html"
                  className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] hover:border-[#E50914] text-[#bbb]"
                >
                  Browse all studios
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="border border-[#222] bg-[#0a0a0a] p-6">
          <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-2">
            Founded {studio.founded_year}
          </div>
          <p className="text-[#888] text-sm leading-relaxed">
            Your studio brand goes on every film you commission. Switch to the
            Agents tab to see your 8 specialist agents.
          </p>
        </div>
      </div>
    )
  }

  // ─── No studio: show create form ───
  return (
    <div className="max-w-2xl">
      <div className="border border-[#222] bg-[#0a0a0a] p-6 mb-4">
        <h3
          className="text-2xl font-black mb-2 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Create your <span className="text-[#E50914]">studio</span>
        </h3>
        <p className="text-[#888] text-sm leading-relaxed mb-5">
          Spawn your own AI film studio for $0.99. You get a generated logo,
          bio, treasury address, and 8 specialist agents (writer, director,
          cinematographer, storyboard, editor, composer, sound designer,
          producer). Your studio brand goes on every film you commission.
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-1.5">
              Studio name
            </label>
            <input
              type="text"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              placeholder="e.g. Midnight Forge Pictures"
              maxLength={50}
              className="w-full bg-[#1a1a1a] border border-[#333] focus:border-[#E50914] px-3 py-2.5 text-white text-sm outline-none placeholder:text-[#555]"
            />
            <div className="text-[0.55rem] text-[#444] mt-1">
              {studioName.trim().length}/50 characters
            </div>
          </div>

          <div>
            <label className="block text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-1.5">
              Describe your studio
            </label>
            <textarea
              value={studioAesthetic}
              onChange={(e) => setStudioAesthetic(e.target.value)}
              placeholder="What kind of films does your studio make? What's the aesthetic, the mood, the genre? The AI uses this to shape your logo, your bio, and your agents' personas. Write as much or as little as you like."
              rows={5}
              maxLength={500}
              className="w-full bg-[#1a1a1a] border border-[#333] focus:border-[#E50914] px-3 py-2.5 text-white text-sm outline-none placeholder:text-[#555] leading-relaxed resize-y"
            />
            <div className="text-[0.55rem] text-[#444] mt-1">
              {(studioAesthetic || '').length}/500 characters
            </div>
          </div>
        </div>

        {createError && (
          <div className="text-[#ff6b7a] text-xs mb-4 p-3 border border-[#E50914] bg-[#1a0003]">
            {createError}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={createLoading || studioName.trim().length < 2}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
            createLoading || studioName.trim().length < 2
              ? 'bg-[#333] text-[#666] cursor-not-allowed'
              : 'bg-[#E50914] hover:bg-[#b00610] text-white'
          }`}
        >
          {createLoading ? 'Creating...' : 'Create studio — $0.99'}
        </button>
      </div>

      <div className="border border-[#222] bg-[#0a0a0a] p-6">
        <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-2">
          The founding studios
        </div>
        <p className="text-[#888] text-sm leading-relaxed mb-3">
          The platform launched with 6 founding studios ($BOLTD, $CLNKR,
          $BOT21, $DREAM, $NRLSP, $PRMNT). Your studio joins them as a
          peer. Every film you commission gets your brand on the poster.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/studios.html"
            className="inline-block text-[0.65rem] font-bold uppercase tracking-wider px-3 py-2 border border-[#333] hover:border-[#E50914] text-white"
          >
            Browse founding studios
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
    </div>
  )
}

/* ───────── Agents tab ───────── */

function AgentsTab({ user, accountId }: { user: User | null; accountId: string | null }) {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)

  useEffect(() => {
    if (!accountId) { setAgentsLoading(false); return; }
    let cancelled = false
    async function loadAgents() {
      setAgentsLoading(true)
      const { data, error } = await bmovies
        .from('bct_agents')
        .select('*')
        .eq('owner_account_id', accountId)
        .order('role')
      if (!cancelled) {
        if (error) console.warn('[agents-tab] load error:', error.message)
        setAgents((data as AgentData[]) || [])
        setAgentsLoading(false)
      }
    }
    loadAgents()
    return () => { cancelled = true }
  }, [accountId])

  const hasOwnAgents = agents.length > 0

  return (
    <div>
      {/* Own agents section */}
      {agentsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
              <div className="h-3 w-20 bg-[#1a1a1a] mb-3" />
              <div className="h-6 w-28 bg-[#151515] mb-2" />
              <div className="h-2 w-full bg-[#0e0e0e]" />
            </div>
          ))}
        </div>
      ) : hasOwnAgents ? (
        <>
          <div className="mb-4">
            <div className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold mb-1">
              Your agents
            </div>
            <p className="text-[#888] text-sm">
              {agents.length} specialist agents working under your studio brand.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914]">
                    {agent.role.replace(/_/g, ' ')}
                  </div>
                  {agent.token_ticker && (
                    <span className="text-[0.5rem] font-mono text-[#666]">
                      ${agent.token_ticker}
                    </span>
                  )}
                </div>
                <h4
                  className="text-lg font-black text-white mb-1 leading-tight"
                  style={{ fontFamily: 'var(--font-bebas)' }}
                >
                  {agent.name}
                </h4>
                <p className="text-[#888] text-xs leading-relaxed mb-3 line-clamp-2">
                  {agent.persona || 'No persona generated.'}
                </p>
                <div className="flex items-center justify-between text-[0.5rem] text-[#666]">
                  <span>Rep: {agent.reputation.toFixed(1)}</span>
                  <span>{agent.jobs_completed} jobs</span>
                </div>
                <div className="mt-2">
                  <a
                    href={`https://whatsonchain.com/address/${agent.wallet_address}`}
                    target="_blank"
                    rel="noopener"
                    className="text-[0.5rem] font-mono text-[#444] hover:text-[#E50914] break-all"
                  >
                    {agent.wallet_address.slice(0, 10)}...{agent.wallet_address.slice(-6)}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-6 mb-8 max-w-2xl">
          <p className="text-[#888] text-sm leading-relaxed mb-3">
            Create a studio to get your own team of 8 specialist agents. Each
            agent has a unique name, persona, wallet address, and token ticker.
          </p>
          <button
            onClick={() => {
              // Switch to studio tab
              const tabBtn = document.querySelector('[role="tab"][aria-selected="false"]') as HTMLButtonElement | null
              const studioBtn = Array.from(document.querySelectorAll('[role="tab"]')).find(
                (el) => el.textContent === 'Studio'
              ) as HTMLButtonElement | null
              studioBtn?.click()
            }}
            className="text-[0.65rem] font-bold uppercase tracking-wider px-3 py-2 bg-[#E50914] hover:bg-[#b00610] text-white"
          >
            Create a studio first
          </button>
        </div>
      )}

      {/* Creative tools available to your agents */}
      <div className="mt-8 border-t border-[#1a1a1a] pt-6 mb-8">
        <div className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold mb-3">
          Creative tools
        </div>
        <p className="text-[#888] text-xs leading-relaxed mb-4 max-w-xl">
          Your agents have access to a suite of AI-powered creative tools,
          each with an API, an MCP server, and a CLI interface. These tools
          are being integrated into the autonomous pipeline.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: 'Movie Editor', desc: 'Non-linear AI editor', status: 'API + MCP' },
            { name: 'Titles Designer', desc: 'Cinematic title sequences', status: 'API + MCP' },
            { name: 'Storyboard Gen', desc: 'Frame-by-frame planning', status: 'API + CLI' },
            { name: 'Script Writer', desc: 'AI screenplay assistant', status: 'API' },
            { name: 'Score Composer', desc: 'AI film scoring', status: 'API + MCP' },
            { name: 'Poster Designer', desc: 'Theatrical one-sheets', status: 'Live' },
          ].map(tool => (
            <div key={tool.name} className="border border-[#222] bg-[#0a0a0a] p-4">
              <div className="text-white text-sm font-black mb-1">{tool.name}</div>
              <div className="text-[#888] text-xs mb-2">{tool.desc}</div>
              <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#666]">
                {tool.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Public roster */}
      <div className="mb-4">
        <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-1">
          Platform roster
        </div>
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
            58+ agents
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
      </div>
    </div>
  )
}

/* ───────── Chat tab (Grand Orchestrator) ───────── */

interface ToolResult {
  type: 'text' | 'image' | 'audio'
  content: string
  artifactUrl?: string
}

interface ChatMessage {
  role: string
  content: string
  toolResult?: ToolResult
}

function ChatTab({ user, accountId }: { user: User; accountId: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const session = await bmovies.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userMsg, conversationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Chat failed')
      setConversationId(data.conversationId)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message.content,
          toolResult: data.toolResult || undefined,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I hit an error: ${err instanceof Error ? err.message : 'unknown'}. Try again?`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-5 mb-4">
        <div className="text-[0.55rem] text-[#E50914] font-bold uppercase tracking-wider mb-1">
          Grand orchestrator
        </div>
        <h3
          className="text-2xl font-black"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          bMovies Agent
        </h3>
        <p className="text-[#bbb] text-xs leading-relaxed mt-1">
          I know your studio, your films, your agents. Ask me anything about
          the platform, brainstorm film concepts, or let me help you build
          your next production.
        </p>
      </div>

      {/* Messages */}
      <div className="border border-[#222] bg-[#0a0a0a] min-h-[400px] max-h-[600px] overflow-y-auto p-4 space-y-4 mb-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div
              className="text-[#333] text-5xl mb-3"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              bM
            </div>
            <div className="text-[#666] text-sm">
              Ask me anything. I&apos;m your creative partner on bMovies.
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {[
                'Help me name my studio',
                'Brainstorm a sci-fi film',
                'How does the bonding curve work?',
                'What can my agents do?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q)
                  }}
                  className="text-xs px-3 py-1.5 border border-[#333] text-[#888] hover:border-[#E50914] hover:text-white transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#E50914] text-white'
                    : 'bg-[#1a1a1a] text-[#ccc] border border-[#222]'
                }`}
              >
                {msg.content.split('\n').map((line, j) => (
                  <p key={j} className={j > 0 ? 'mt-2' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
            {msg.toolResult && (
              <div className="flex justify-start mt-2">
                <div className="max-w-[85%]">
                  {msg.toolResult.type === 'image' && msg.toolResult.artifactUrl && (
                    <div className="border border-[#222] bg-[#050505]">
                      <img
                        src={msg.toolResult.artifactUrl}
                        alt="Generated artifact"
                        className="w-full max-w-md"
                        loading="lazy"
                      />
                      {msg.toolResult.content && (
                        <div className="px-3 py-2 text-xs text-[#888]">
                          {msg.toolResult.content}
                        </div>
                      )}
                    </div>
                  )}
                  {msg.toolResult.type === 'text' && (
                    <pre className="bg-[#111] border border-[#1a1a1a] px-4 py-3 text-xs text-[#aaa] leading-relaxed font-mono whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto">
                      {msg.toolResult.content}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1a] border border-[#222] px-4 py-3 text-sm text-[#666]">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Talk to the bMovies agent..."
          className="flex-1 bg-[#1a1a1a] border border-[#333] focus:border-[#E50914] px-4 py-3 text-white text-sm outline-none placeholder:text-[#555]"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider ${
            loading || !input.trim()
              ? 'bg-[#333] text-[#666]'
              : 'bg-[#E50914] hover:bg-[#b00610] text-white'
          }`}
        >
          Send
        </button>
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

interface WalletData {
  platformTokens: number
  pricePerTokenCents: number
  studioCount: number
  filmCount: number
  agentCount: number
  studios: {
    id: string
    name: string
    token_ticker: string
    treasury_address: string
    agentCount: number
    filmCount: number
  }[]
  agents: {
    id: string
    name: string
    role: string
    reputation: number
    jobs_completed: number
    wallet_address: string
  }[]
  transactions: {
    id: string
    tokens_purchased: number
    price_per_token_cents: number
    status: string
    settled_txid: string | null
    created_at: string
  }[]
}

function WalletTab({ user, accountId, films }: { user: User; accountId: string | null; films: Film[] }) {
  const brc100Address = brc100AddressOf(user)
  const brc100Provider = brc100ProviderOf(user)
  const email = publicEmailFor(user)
  const isBrc100 = isBrc100User(user)

  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)

  useEffect(() => {
    if (!accountId) { setWalletLoading(false); return }
    let cancelled = false

    async function loadWalletData() {
      setWalletLoading(true)
      try {
        const [holdingsRes, studiosRes, agentsRes, txRes, configRes] = await Promise.all([
          bmovies
            .from('bct_platform_holdings')
            .select('total_tokens')
            .eq('account_id', accountId)
            .maybeSingle(),
          bmovies
            .from('bct_studios')
            .select('id, name, token_ticker, treasury_address')
            .eq('owner_account_id', accountId),
          bmovies
            .from('bct_agents')
            .select('id, name, role, reputation, jobs_completed, wallet_address, owner_account_id')
            .eq('owner_account_id', accountId)
            .order('role'),
          bmovies
            .from('bct_platform_investments')
            .select('id, tokens_purchased, price_per_token_cents, status, settled_txid, created_at')
            .eq('account_id', accountId)
            .order('created_at', { ascending: false })
            .limit(20),
          bmovies
            .from('bct_platform_config')
            .select('value')
            .eq('key', 'current_tranche_price_cents')
            .maybeSingle(),
        ])

        if (cancelled) return

        const studios = (studiosRes.data || []) as { id: string; name: string; token_ticker: string; treasury_address: string }[]
        const agents = (agentsRes.data || []) as { id: string; name: string; role: string; reputation: number; jobs_completed: number; wallet_address: string; owner_account_id: string | null }[]

        // Count agents and films per studio
        const studiosWithCounts = studios.map((s) => ({
          ...s,
          agentCount: agents.length,
          filmCount: films.filter((f) => f.account_id === accountId).length,
        }))

        const priceCents = configRes.data?.value
          ? (typeof configRes.data.value === 'number' ? configRes.data.value : parseFloat(String(configRes.data.value)))
          : 0.1 // fallback: $0.001/token

        setWalletData({
          platformTokens: (holdingsRes.data?.total_tokens as number) ?? 0,
          pricePerTokenCents: priceCents,
          studioCount: studios.length,
          filmCount: films.length,
          agentCount: agents.length,
          studios: studiosWithCounts,
          agents: agents.map(({ owner_account_id: _, ...a }) => a),
          transactions: (txRes.data || []) as WalletData['transactions'],
        })
      } catch (err) {
        console.error('[wallet-tab] load error:', err)
        // Set empty data so UI still renders
        setWalletData({
          platformTokens: 0,
          pricePerTokenCents: 0.1,
          studioCount: 0,
          filmCount: films.length,
          agentCount: 0,
          studios: [],
          agents: [],
          transactions: [],
        })
      } finally {
        if (!cancelled) setWalletLoading(false)
      }
    }

    loadWalletData()
    return () => { cancelled = true }
  }, [accountId, films])

  const formatUsd = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(2)}k` : `$${n.toFixed(2)}`

  const formatTokens = (n: number) => n.toLocaleString()

  const truncAddr = (addr: string) =>
    addr.length > 16 ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : addr

  return (
    <div className="max-w-4xl">
      {/* ── Section 1: Identity card ── */}
      {isBrc100 && brc100Address ? (
        <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-6 mb-6">
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
              View on WhatsOnChain
            </a>
          </div>
        </div>
      ) : (
        <div className="border border-[#222] bg-[#0a0a0a] p-6 mb-6">
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
            Link a BRC-100 wallet
          </Link>
        </div>
      )}

      {/* ── Section 2: Portfolio summary strip ── */}
      {walletLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
              <div className="h-2 w-16 bg-[#1a1a1a] mb-3" />
              <div className="h-8 w-24 bg-[#151515]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard
            label="$bMovies"
            value={formatTokens(walletData?.platformTokens ?? 0)}
            accent={(walletData?.platformTokens ?? 0) > 0}
          />
          <StatCard
            label="Studios"
            value={(walletData?.studioCount ?? 0).toLocaleString()}
            accent={(walletData?.studioCount ?? 0) > 0}
          />
          <StatCard
            label="Films"
            value={(walletData?.filmCount ?? 0).toLocaleString()}
            accent={(walletData?.filmCount ?? 0) > 0}
          />
          <StatCard
            label="Agents"
            value={(walletData?.agentCount ?? 0).toLocaleString()}
          />
        </div>
      )}

      {/* ── Section 3: Holdings list ── */}
      <div className="mb-8">
        <h2
          className="text-2xl font-black mb-4 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Holdings
        </h2>

        {walletLoading ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
                <div className="h-4 w-48 bg-[#1a1a1a] mb-3" />
                <div className="h-3 w-64 bg-[#151515]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Platform tokens */}
            {(walletData?.platformTokens ?? 0) > 0 ? (
              <div className="border border-[#222] bg-[#0a0a0a] p-5">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xl font-black text-[#E50914] leading-none"
                      style={{ fontFamily: 'var(--font-bebas)' }}
                    >
                      $bMovies
                    </span>
                    <span className="text-white text-sm font-bold">
                      {formatTokens(walletData!.platformTokens)} tokens
                    </span>
                  </div>
                  <span className="text-[#888] text-sm shrink-0">
                    Value: {formatUsd((walletData!.platformTokens * walletData!.pricePerTokenCents) / 100)}
                  </span>
                </div>
                <div className="text-[#666] text-xs">
                  @ ${(walletData!.pricePerTokenCents / 100).toFixed(4)}/token
                  {' · '}
                  {((walletData!.platformTokens / 1_000_000_000) * 100).toFixed(4)}% of supply
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-[#222] bg-[#050505] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className="text-lg font-black text-[#666] leading-none"
                      style={{ fontFamily: 'var(--font-bebas)' }}
                    >
                      $bMovies
                    </span>
                    <span className="text-[#666] text-sm ml-3">No tokens yet</span>
                  </div>
                  <a
                    href="/invest.html"
                    className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white"
                  >
                    Buy $bMovies
                  </a>
                </div>
              </div>
            )}

            {/* Studio tokens */}
            {(walletData?.studios ?? []).length > 0 ? (
              walletData!.studios.map((s) => (
                <div key={s.id} className="border border-[#222] bg-[#0a0a0a] p-5">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xl font-black text-white leading-none"
                        style={{ fontFamily: 'var(--font-bebas)' }}
                      >
                        ${s.token_ticker}
                      </span>
                      <span className="text-[#888] text-sm">Your studio</span>
                    </div>
                  </div>
                  <div className="text-[#666] text-xs mb-2">
                    {s.agentCount} agent{s.agentCount !== 1 ? 's' : ''}
                    {' · '}
                    {s.filmCount} film{s.filmCount !== 1 ? 's' : ''} produced
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#666] text-[0.55rem] font-bold uppercase tracking-wider">
                      Treasury:
                    </span>
                    <span className="text-[#888] font-mono text-xs">
                      {truncAddr(s.treasury_address)}
                    </span>
                    <a
                      href={`https://whatsonchain.com/address/${s.treasury_address}`}
                      target="_blank"
                      rel="noopener"
                      className="text-[0.55rem] font-bold uppercase tracking-wider text-[#E50914] hover:text-white"
                    >
                      View on WoC
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="border border-dashed border-[#222] bg-[#050505] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[#666] text-sm">No studio yet</span>
                  </div>
                  <button
                    onClick={() => {
                      const studioBtn = Array.from(document.querySelectorAll('[role="tab"]')).find(
                        (el) => el.textContent === 'Studio'
                      ) as HTMLButtonElement | null
                      studioBtn?.click()
                    }}
                    className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] hover:border-[#E50914] text-white"
                  >
                    Create your studio
                  </button>
                </div>
              </div>
            )}

            {/* Film holdings */}
            {films.length > 0 ? (
              films.map((f) => (
                <div key={f.id} className="border border-[#222] bg-[#0a0a0a] p-5">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xl font-black text-white leading-none"
                        style={{ fontFamily: 'var(--font-bebas)' }}
                      >
                        ${f.token_ticker}
                      </span>
                      <span className="text-[#888] text-sm truncate max-w-[200px]">
                        &quot;{f.title}&quot;
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-white text-sm font-bold">
                        {f.commissioner_percent}% share
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
                    <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
                      {f.tier}
                    </span>
                    <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
                      {f.status.replace(/_/g, ' ')}
                    </span>
                    {f.token_mint_txid && /^[0-9a-f]{64}$/.test(f.token_mint_txid) && (
                      <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#0e3a0e] text-[#6bff8a]">
                        On chain
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={`/film.html?id=${encodeURIComponent(f.id)}`}
                      className="text-[0.55rem] font-bold uppercase tracking-wider text-[#E50914] hover:text-white"
                    >
                      View film
                    </a>
                    <a
                      href={`/captable.html?id=${encodeURIComponent(f.id)}`}
                      className="text-[0.55rem] font-bold uppercase tracking-wider text-[#666] hover:text-white"
                    >
                      Cap table
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="border border-dashed border-[#222] bg-[#050505] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[#666] text-sm">No film holdings</span>
                  </div>
                  <a
                    href="/commission.html"
                    className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white"
                  >
                    Commission your first film
                  </a>
                </div>
              </div>
            )}

            {/* Agent roster */}
            {(walletData?.agents ?? []).length > 0 ? (
              walletData!.agents.map((a) => (
                <div key={a.id} className="border border-[#222] bg-[#0a0a0a] p-5">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div>
                      <span
                        className="text-lg font-black text-white leading-none"
                        style={{ fontFamily: 'var(--font-bebas)' }}
                      >
                        {a.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#666] shrink-0">
                      <span>Rep: {a.reputation.toFixed(1)}</span>
                      <span>{a.jobs_completed} job{a.jobs_completed !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914] mb-2">
                    {a.role.replace(/_/g, ' ')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#666] text-[0.55rem] font-bold uppercase tracking-wider">
                      Wallet:
                    </span>
                    <a
                      href={`https://whatsonchain.com/address/${a.wallet_address}`}
                      target="_blank"
                      rel="noopener"
                      className="text-[#888] font-mono text-xs hover:text-[#E50914]"
                    >
                      {truncAddr(a.wallet_address)}
                    </a>
                  </div>
                </div>
              ))
            ) : (
              !walletLoading && (walletData?.studios ?? []).length === 0 && (
                <div className="border border-dashed border-[#222] bg-[#050505] p-5">
                  <span className="text-[#666] text-sm">
                    Create a studio to get your agent crew
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Section 4: Transaction history ── */}
      <div className="mb-8">
        <h2
          className="text-2xl font-black mb-4 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Transactions
        </h2>

        {walletLoading ? (
          <div className="animate-pulse">
            <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
              <div className="h-3 w-full bg-[#1a1a1a] mb-3" />
              <div className="h-3 w-3/4 bg-[#151515]" />
            </div>
          </div>
        ) : (walletData?.transactions ?? []).length > 0 ? (
          <div className="border border-[#222] bg-[#0a0a0a] overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold px-4 py-3">Date</th>
                  <th className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold px-4 py-3">Type</th>
                  <th className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold px-4 py-3 text-right">Amount</th>
                  <th className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold px-4 py-3 text-center">Status</th>
                  <th className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold px-4 py-3">Txid</th>
                </tr>
              </thead>
              <tbody>
                {walletData!.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                    <td className="text-[#888] text-xs px-4 py-3 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="text-white text-xs px-4 py-3 whitespace-nowrap">
                      Buy $bMovies
                    </td>
                    <td className="text-white text-xs font-bold px-4 py-3 text-right whitespace-nowrap">
                      {formatTokens(tx.tokens_purchased)} tokens
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.status === 'completed' ? (
                        <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#0e3a0e] text-[#6bff8a]">
                          Completed
                        </span>
                      ) : tx.status === 'pending' ? (
                        <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#3a3a0e] text-[#ffff6b]">
                          Pending
                        </span>
                      ) : (
                        <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
                          {tx.status}
                        </span>
                      )}
                    </td>
                    <td className="text-[#888] font-mono text-[0.6rem] px-4 py-3">
                      {tx.settled_txid ? (
                        <a
                          href={`https://whatsonchain.com/tx/${tx.settled_txid}`}
                          target="_blank"
                          rel="noopener"
                          className="hover:text-[#E50914]"
                        >
                          {tx.settled_txid.slice(0, 8)}...{tx.settled_txid.slice(-6)}
                        </a>
                      ) : (
                        <span className="text-[#444]">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-dashed border-[#222] bg-[#050505] p-5">
            <span className="text-[#666] text-sm">No transactions yet</span>
          </div>
        )}
      </div>

      {/* ── Section 5: Technical details (collapsible) ── */}
      <details className="border border-[#222] bg-[#0a0a0a]">
        <summary className="p-4 cursor-pointer text-[0.6rem] text-[#666] font-bold uppercase tracking-wider hover:text-white">
          Technical details
        </summary>
        <div className="px-4 pb-4 -mt-1 space-y-3">
          <div>
            <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-1">
              Supabase user id
            </div>
            <div className="text-[#888] font-mono text-[0.65rem] break-all">{user.id}</div>
          </div>
          {accountId && (
            <div>
              <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-1">
                Account id
              </div>
              <div className="text-[#888] font-mono text-[0.65rem] break-all">{accountId}</div>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
