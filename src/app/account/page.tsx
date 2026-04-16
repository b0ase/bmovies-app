'use client'

/**
 * /account — the bMovies studio dashboard.
 *
 * Hierarchical drill-down navigation:
 *
 *   ACCOUNT LEVEL: [Studio] [Wallet] [Coupons]
 *     -> STUDIO: shows studio info + project list
 *          -> PROJECT LEVEL: [<- Studio] [project selector] [Overview] [Cap Table] [Crew] [Deck] [Production Room]
 *               -> TOOLS LEVEL: [<- Project] [project selector] [Script] [Storyboard] [Editor] [Titles] [Score]
 *
 * URL params:
 *   /account                            -> account level, Studio tab (default)
 *   /account?section=wallet             -> account level, Wallet tab
 *   /account?section=coupons            -> account level, Coupons tab
 *   /account?project=<id>&tab=overview  -> project level
 *   /account?project=<id>&tab=captable  -> project level
 *   /account?project=<id>&tab=crew      -> project level
 *   /account?project=<id>&tab=deck      -> project level
 *   /account?project=<id>&tab=room      -> project level (Production Room)
 *   /account?project=<id>&tool=script   -> tools level
 *   /account?project=<id>&tool=storyboard -> tools level
 *   /account?project=<id>&tool=editor   -> tools level
 *   /account?project=<id>&tool=titles   -> tools level
 *   /account?project=<id>&tool=score    -> tools level
 *
 * The AccountToolbar handles all navigation chrome. This page just
 * renders the content for whatever the URL says.
 */

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { bmovies } from '@/lib/supabase-bmovies'
import type { User } from '@supabase/supabase-js'

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
  'crypto whistleblow':                  '/img/films/crypto-whistleblow.jpg',
}

function isEphemeralUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && /imgen\.x\.ai\/xai-imgen\/xai-tmp/.test(url)
}

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

/* ─── User-facing identity helpers ─── */

function displayNameFor(user: User): string {
  const md = (user.user_metadata ?? {}) as Record<string, unknown>
  const display = typeof md.display_name === 'string' ? md.display_name : ''
  const addr = typeof md.brc100_address === 'string' ? md.brc100_address : ''
  if (display) return display
  if (addr) return `${addr.slice(0, 8)}...${addr.slice(-4)}`
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
  if (!user.email) return null
  if (user.email.endsWith('@bsv.bmovies.online')) return null
  return user.email
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Page entry point
 * ═══════════════════════════════════════════════════════════════════════ */

export default function AccountPage() {
  return (
    <Suspense fallback={<SkeletonDashboard />}>
      <AccountContent />
    </Suspense>
  )
}

function AccountContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [films, setFilms] = useState<Film[]>([])
  const [filmsLoading, setFilmsLoading] = useState(false)
  const [filmsError, setFilmsError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)

  // ─── Read URL params ───
  const section = searchParams.get('section')   // 'wallet' | 'coupons' | null
  const projectId = searchParams.get('project')
  const tab = searchParams.get('tab')            // project-level tab
  const tool = searchParams.get('tool')          // tool-level tab

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
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadFilms() {
      if (!user) return
      setFilmsLoading(true)
      setFilmsError(null)
      const address = brc100AddressOf(user)
      try {
        const { data: accountRow, error: accErr } = await bmovies
          .from('bct_accounts')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (accErr) {
          console.warn('[account] bct_accounts lookup failed:', accErr.message)
        }
        const acctId = accountRow?.id as string | undefined

        if (!acctId && !address) {
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

        if (acctId && address) {
          q = q.or(`account_id.eq.${acctId},producer_address.eq.${address}`)
        } else if (acctId) {
          q = q.eq('account_id', acctId)
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
    return () => { cancelled = true }
  }, [user])

  // ─── Derived stats ───
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

  // Find the active film for project/tools level
  const activeFilm = projectId ? films.find(f => f.id === projectId) || null : null

  // ═══ TOOLS LEVEL ═══
  if (tool && projectId) {
    if (['script', 'storyboard', 'editor', 'titles', 'score'].includes(tool)) {
      return (
        <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-8">
          <ToolView tool={tool} projectId={projectId} projectTitle={activeFilm?.title || 'Untitled'} />
        </div>
      )
    }
  }

  // ═══ PROJECT LEVEL ═══
  if (projectId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-8">
        <ProjectView
          projectId={projectId}
          tab={tab || 'overview'}
          film={activeFilm}
          user={user}
          accountId={accountId}
          films={films}
        />
      </div>
    )
  }

  // ═══ ACCOUNT LEVEL ═══
  if (section === 'wallet') {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-12">
        <WalletView user={user} accountId={accountId} films={films} />
      </div>
    )
  }
  if (section === 'coupons') {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-12">
        <CouponsView />
      </div>
    )
  }

  // Default: Studio view
  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-12">
      <StudioView
        user={user}
        accountId={accountId}
        films={films}
        filmsLoading={filmsLoading}
        filmsError={filmsError}
        stats={stats}
        sessionIdFromUrl={searchParams.get('session_id')}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
 *  STUDIO VIEW — account-level default
 * ═══════════════════════════════════════════════════════════════════════ */

function StudioView({
  user,
  accountId,
  films,
  filmsLoading,
  filmsError,
  stats,
  sessionIdFromUrl,
}: {
  user: User
  accountId: string | null
  films: Film[]
  filmsLoading: boolean
  filmsError: string | null
  stats: { count: number; committedUsd: number; onChainCount: number; activeCount: number }
  sessionIdFromUrl: string | null
}) {
  return (
    <>
      {/* Header */}
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2 truncate">
          {displayNameFor(user)}
          {isBrc100User(user) && (
            <span className="ml-2 text-[#E50914]">. BRC-100</span>
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
          royalty share you hold. All in one place.
        </p>
      </header>

      {/* Stats strip */}
      <StatsStrip
        filmsCount={stats.count}
        committedUsd={stats.committedUsd}
        onChainCount={stats.onChainCount}
        activeCount={stats.activeCount}
      />

      {/* Studio info */}
      <div className="mb-10">
        <StudioInfoSection
          hasFilms={stats.count > 0}
          user={user}
          accountId={accountId}
          sessionIdFromUrl={sessionIdFromUrl}
        />
      </div>

      {/* Project list */}
      <div>
        <h2
          className="text-3xl font-black mb-4 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Your <span className="text-[#E50914]">films</span>
        </h2>
        <ProjectCards films={films} loading={filmsLoading} error={filmsError} />
      </div>
    </>
  )
}

/* ─── Project cards grid (for StudioView) ─── */

function ProjectCards({
  films,
  loading,
  error,
}: {
  films: Film[]
  loading: boolean
  error: string | null
}) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a]">
            <div className="aspect-[2/3] bg-[#050505]" />
            <div className="p-4">
              <div className="h-4 w-3/4 bg-[#1a1a1a] mb-2" />
              <div className="h-2 w-full bg-[#0e0e0e]" />
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
          Retry
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
          Start with a $0.99 pitch -- the AI swarm writes a logline,
          synopsis, and one poster in under 60 seconds. If you like it,
          upgrade to a trailer, short, or feature. Every film becomes a
          BSV-21 token with its own cap table.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/commission.html"
            className="inline-block px-5 py-2.5 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
          >
            Commission a film
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
        {films.map((f) => {
          const posterUrl = resolvePosterUrl(f)
          const onChain = f.token_mint_txid && /^[0-9a-f]{64}$/.test(f.token_mint_txid)
          return (
            <div
              key={f.id}
              className="border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors cursor-pointer"
              onClick={() => router.push(`/account?project=${f.id}&tab=overview`, { scroll: false })}
            >
              {posterUrl ? (
                <div className="aspect-[2/3] bg-[#050505] overflow-hidden">
                  <img src={posterUrl} alt={f.title} className="w-full h-full object-cover" />
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
                    {f.title}
                  </h3>
                  <span className="text-[0.55rem] font-mono text-[#E50914] shrink-0">
                    ${f.token_ticker}
                  </span>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
                    {f.tier}
                  </span>
                  <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
                    {f.status.replace(/_/g, ' ')}
                  </span>
                  {onChain && (
                    <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#0e3a0e] text-[#6bff8a]">
                      On chain
                    </span>
                  )}
                </div>
                <p className="text-[#888] text-xs leading-relaxed mb-3 line-clamp-2">
                  {f.synopsis || 'No synopsis yet.'}
                </p>
                <button
                  className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#E50914] text-white hover:bg-[#b00610] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/account?project=${f.id}&tab=overview`, { scroll: false })
                  }}
                >
                  Open
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
 *  COUPONS VIEW — account-level placeholder
 * ═══════════════════════════════════════════════════════════════════════ */

function CouponsView() {
  return (
    <>
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <h1
          className="text-5xl font-black leading-none"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '-0.01em' }}
        >
          My <span className="text-[#E50914]">coupons</span>
        </h1>
        <p className="text-[#888] text-sm mt-2 max-w-xl">
          Redeemable credits for commissions. Buy them on the Commission page
          and redeem them here when you are ready to produce.
        </p>
      </header>

      <div className="border border-[#222] bg-[#0a0a0a] p-8 max-w-2xl">
        <div
          className="text-2xl font-black mb-3 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Commission <span className="text-[#E50914]">coupons</span>
        </div>
        <p className="text-[#888] text-sm leading-relaxed mb-5">
          Coupons are redeemable credits for commissions. Buy them on the
          Commission page. Each coupon is good for one commission at the
          corresponding tier (pitch, trailer, short, or feature).
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { tier: 'Pitch', price: '$0.99' },
            { tier: 'Trailer', price: '$9.99' },
            { tier: 'Short', price: '$99' },
            { tier: 'Feature', price: '$999' },
          ].map((c) => (
            <div
              key={c.tier}
              className="border border-[#222] bg-[#050505] p-4 text-center"
            >
              <div
                className="text-xl font-black text-white mb-1"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                {c.tier}
              </div>
              <div className="text-[#E50914] text-sm font-bold">{c.price}</div>
            </div>
          ))}
        </div>
        <a
          href="/commission.html"
          className="inline-block px-5 py-2.5 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
        >
          Buy a coupon
        </a>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
 *  PROJECT VIEW — project-level content router
 * ═══════════════════════════════════════════════════════════════════════ */

function ProjectView({
  projectId,
  tab,
  film,
  user,
  accountId,
  films,
}: {
  projectId: string
  tab: string
  film: Film | null
  user: User
  accountId: string | null
  films: Film[]
}) {
  const router = useRouter()

  // If the film hasn't loaded yet or doesn't exist in the user's list,
  // load it directly from Supabase
  const [directFilm, setDirectFilm] = useState<Film | null>(null)
  const [directLoading, setDirectLoading] = useState(!film)

  useEffect(() => {
    if (film) { setDirectLoading(false); return }
    let cancelled = false
    async function load() {
      setDirectLoading(true)
      const { data } = await bmovies
        .from('bct_offers')
        .select(
          `id, title, synopsis, tier, status, token_ticker, token_mint_txid,
           commissioner_percent, account_id, created_at,
           bct_artifacts ( id, kind, role, url, step_id, superseded_by )`,
        )
        .eq('id', projectId)
        .maybeSingle()
      if (!cancelled) {
        setDirectFilm(data as Film | null)
        setDirectLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId, film])

  const currentFilm = film || directFilm

  if (directLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-64 bg-[#1a1a1a] mb-4" />
        <div className="h-4 w-full bg-[#0e0e0e] mb-2" />
        <div className="h-4 w-3/4 bg-[#0e0e0e]" />
      </div>
    )
  }

  if (!currentFilm) {
    return (
      <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 max-w-xl">
        <div
          className="text-2xl font-black mb-3 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Project not <span className="text-[#E50914]">found</span>
        </div>
        <p className="text-[#888] text-sm leading-relaxed mb-4">
          This project could not be loaded. It may have been archived or
          you may not have access.
        </p>
        <button
          onClick={() => router.push('/account', { scroll: false })}
          className="text-[0.65rem] font-bold uppercase tracking-wider text-[#E50914] border-b border-[#E50914]"
        >
          Back to studio
        </button>
      </div>
    )
  }

  switch (tab) {
    case 'captable':
      return <ProjectCapTableView film={currentFilm} />
    case 'crew':
      return <ProjectCrewView projectId={projectId} accountId={accountId} />
    case 'deck':
      return <ProjectDeckView film={currentFilm} />
    case 'room':
      return <ProjectRoomView film={currentFilm} />
    case 'overview':
    default:
      return <ProjectOverviewView film={currentFilm} />
  }
}

/* ─── Project Overview ─── */

function ProjectOverviewView({ film }: { film: Film }) {
  const posterUrl = resolvePosterUrl(film)
  const onChain = film.token_mint_txid && /^[0-9a-f]{64}$/.test(film.token_mint_txid)
  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState(film.status)
  const router = useRouter()

  async function handlePublish() {
    setPublishing(true)
    setPublishStatus(null)
    try {
      const res = await fetch('/api/feature/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: film.id,
          accountId: film.account_id || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Publish failed')
      setCurrentStatus('published')
      setPublishStatus('Published!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setPublishStatus('Failed: ' + msg)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        {/* Poster */}
        <div className="shrink-0">
          {posterUrl ? (
            <div className="w-64 border border-[#222] bg-[#050505] overflow-hidden">
              <img src={posterUrl} alt={film.title} className="w-full" />
            </div>
          ) : (
            <div className="w-64 aspect-[2/3] bg-gradient-to-br from-[#1a0003] to-[#0a0000] border border-[#222] flex items-center justify-center">
              <div
                className="text-[#666] text-5xl font-black"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                b<span className="text-[#E50914]">M</span>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1
            className="text-4xl font-black leading-none mb-2"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {film.title}
          </h1>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-[0.55rem] font-mono text-[#E50914]">
              ${film.token_ticker}
            </span>
            <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#888]">
              {film.tier}
            </span>
            <span
              className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5"
              style={{
                background: statusColor(currentStatus).bg,
                color: statusColor(currentStatus).text,
              }}
            >
              {currentStatus.replace(/_/g, ' ')}
            </span>
            {onChain && (
              <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#0e3a0e] text-[#6bff8a]">
                On chain
              </span>
            )}
          </div>

          <p className="text-[#888] text-sm leading-relaxed mb-4 max-w-xl">
            {film.synopsis || 'No synopsis yet.'}
          </p>

          <div className="text-[#666] text-xs mb-4">
            Commissioned {new Date(film.created_at).toLocaleDateString('en-GB', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
            {' '} &middot; {' '}
            {film.commissioner_percent}% commissioner share
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-md">
            <StatCard label="Tier" value={film.tier} />
            <StatCard label="Your share" value={`${film.commissioner_percent}%`} />
            <StatCard label="On chain" value={onChain ? 'Yes' : 'No'} accent={!!onChain} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {currentStatus === 'draft' && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 bg-[#0e3a0e] border border-[#2a6a2a] text-[#6bff8a] hover:bg-[#1a4a1a] transition-colors disabled:opacity-40"
              >
                {publishing ? 'Publishing...' : 'Publish Film'}
              </button>
            )}
            <a
              href={`/film.html?id=${encodeURIComponent(film.id)}`}
              className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 bg-[#E50914] text-white hover:bg-[#b00610] transition-colors"
            >
              Watch
            </a>
            <a
              href={`/production.html?id=${encodeURIComponent(film.id)}`}
              className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 border border-[#333] text-white hover:border-[#E50914] transition-colors"
            >
              Timeline
            </a>
            <button
              onClick={() => router.push(`/account?project=${film.id}&tool=script`, { scroll: false })}
              className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 border border-[#333] text-white hover:border-[#E50914] transition-colors"
            >
              Open tools
            </button>
          </div>

          {publishStatus && (
            <p className={`text-[0.6rem] mt-2 ${publishStatus.startsWith('Failed') ? 'text-[#ff6b6b]' : 'text-[#6bff8a]'}`}>
              {publishStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Project Cap Table ─── */

function ProjectCapTableView({ film }: { film: Film }) {
  return (
    <div>
      <h2
        className="text-3xl font-black mb-4 leading-none"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        Cap table: <span className="text-[#E50914]">{film.title}</span>
      </h2>
      <p className="text-[#888] text-sm leading-relaxed mb-6 max-w-xl">
        Every share is on-chain and verifiable independently at GorillaPool.
        Cap tables are printable for investor outreach.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <a
          href={`/captable.html?id=${encodeURIComponent(film.id)}`}
          className="p-5 border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] hover:from-[#2a0005] transition-colors"
        >
          <div className="text-[0.55rem] text-[#E50914] font-bold uppercase tracking-wider mb-2">
            Film token
          </div>
          <div
            className="text-3xl font-black text-white mb-1 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            ${film.token_ticker}
          </div>
          <div className="text-[#888] text-xs">
            {film.tier} &middot; {film.commissioner_percent}% commissioner share
          </div>
          <div className="text-[0.6rem] text-[#E50914] mt-2 font-bold uppercase tracking-wider">
            View full cap table
          </div>
        </a>
        <a
          href="/captable.html?id=platform"
          className="p-5 border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors"
        >
          <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-2">
            Platform token
          </div>
          <div
            className="text-3xl font-black text-white mb-1 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            $bMovies
          </div>
          <div className="text-[#888] text-xs">1B supply &middot; live on BSV mainnet</div>
        </a>
      </div>
    </div>
  )
}

/* ─── Project Crew ─── */

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

function ProjectCrewView({ projectId, accountId }: { projectId: string; accountId: string | null }) {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [projectAgentIds, setProjectAgentIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!accountId) { setAgentsLoading(false); return }
    let cancelled = false
    async function loadData() {
      setAgentsLoading(true)

      // Load all agents belonging to this account
      const { data: agentData, error: agentErr } = await bmovies
        .from('bct_agents')
        .select('*')
        .eq('owner_account_id', accountId)
        .order('role')
      if (!cancelled && !agentErr) {
        setAgents((agentData as AgentData[]) || [])
      }

      // Load which agents have artifacts on this project
      const { data: artifactData } = await bmovies
        .from('bct_artifacts')
        .select('agent_id')
        .eq('offer_id', projectId)
        .not('agent_id', 'is', null)
      if (!cancelled && artifactData) {
        const ids = new Set(artifactData.map((a: any) => a.agent_id as string).filter(Boolean))
        setProjectAgentIds(ids)
      }

      if (!cancelled) setAgentsLoading(false)
    }
    loadData()
    return () => { cancelled = true }
  }, [accountId, projectId])

  if (agentsLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
            <div className="h-3 w-20 bg-[#1a1a1a] mb-3" />
            <div className="h-6 w-28 bg-[#151515]" />
          </div>
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 max-w-2xl">
        <p className="text-[#888] text-sm leading-relaxed mb-3">
          Create a studio to get your own team of 8 specialist agents. Each
          agent has a unique name, persona, wallet address, and token ticker.
        </p>
        <a
          href="/agents.html"
          className="text-[0.65rem] font-bold uppercase tracking-wider text-[#E50914] border-b border-[#E50914]"
        >
          Browse the public roster
        </a>
      </div>
    )
  }

  return (
    <div>
      <h2
        className="text-3xl font-black mb-2 leading-none"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        Project <span className="text-[#E50914]">crew</span>
      </h2>
      <p className="text-[#888] text-sm mb-4">
        Your studio agents. Those who contributed to this project are highlighted.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {agents.map((agent) => {
          const contributed = projectAgentIds.has(agent.id)
          return (
            <div
              key={agent.id}
              className={`border bg-[#0a0a0a] p-5 transition-colors ${
                contributed ? 'border-[#E50914]' : 'border-[#222]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914]">
                  {agent.role.replace(/_/g, ' ')}
                </div>
                {contributed && (
                  <span className="text-[0.5rem] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-[#E50914] text-white">
                    Active
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Project Deck ─── */

function ProjectDeckView({ film }: { film: Film }) {
  return (
    <div className="max-w-2xl">
      <h2
        className="text-3xl font-black mb-4 leading-none"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        Investor <span className="text-[#E50914]">deck</span>
      </h2>
      <p className="text-[#888] text-sm leading-relaxed mb-6">
        A printable investor deck for &quot;{film.title}&quot; including synopsis,
        treatment, cap table, storyboard frames, production timeline, and
        on-chain token receipt.
      </p>
      <div className="border border-[#222] bg-[#0a0a0a] p-6 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div
              className="text-xl font-black text-white mb-1 leading-tight"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              {film.title}
            </div>
            <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider">
              {film.tier} &middot; ${film.token_ticker}
            </div>
          </div>
          <a
            href={`/deck.html?id=${encodeURIComponent(film.id)}`}
            target="_blank"
            rel="noopener"
            className="px-5 py-2.5 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider shrink-0"
          >
            Open deck
          </a>
        </div>
      </div>
      <p className="text-[#666] text-xs">
        Opens the printable investor deck in a new tab. Use your browser&apos;s
        print function (Ctrl+P / Cmd+P) to save as PDF.
      </p>
    </div>
  )
}

/* ─── Project Production Room ─── */

function ProjectRoomView({ film }: { film: Film }) {
  const router = useRouter()
  return (
    <div className="max-w-2xl">
      <h2
        className="text-3xl font-black mb-4 leading-none"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        Production <span className="text-[#E50914]">room</span>
      </h2>
      <p className="text-[#888] text-sm leading-relaxed mb-6">
        The Production Room is where you chat with the bMovies Grand Orchestrator
        agent about &quot;{film.title}&quot;. Ask it to generate storyboard frames,
        rewrite the script, compose a theme, or anything else.
      </p>
      <div className="flex flex-wrap gap-3 mb-8">
        <a
          href={`/production-room.html?id=${encodeURIComponent(film.id)}`}
          className="px-6 py-3 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
        >
          Open Production Room
        </a>
        <button
          onClick={() => router.push(`/account?project=${film.id}&tool=script`, { scroll: false })}
          className="px-6 py-3 border border-[#333] hover:border-[#E50914] text-white text-xs font-black uppercase tracking-wider transition-colors"
        >
          Open tools
        </button>
      </div>
      <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-3">
        Available tools
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { name: 'Script', tool: 'script', desc: 'AI screenplay assistant' },
          { name: 'Storyboard', tool: 'storyboard', desc: 'Frame-by-frame planning' },
          { name: 'Editor', tool: 'editor', desc: 'Non-linear AI editor' },
          { name: 'Titles', tool: 'titles', desc: 'Cinematic title sequences' },
          { name: 'Score', tool: 'score', desc: 'AI film scoring' },
        ].map((t) => (
          <button
            key={t.tool}
            onClick={() => router.push(`/account?project=${film.id}&tool=${t.tool}`, { scroll: false })}
            className="border border-[#222] bg-[#0a0a0a] p-4 text-left hover:border-[#E50914] transition-colors"
          >
            <div className="text-white text-sm font-black mb-1">{t.name}</div>
            <div className="text-[#888] text-xs">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
 *  WALLET VIEW — account-level
 * ═══════════════════════════════════════════════════════════════════════ */

interface WalletData {
  kycVerified: boolean
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

function WalletView({ user, accountId, films }: { user: User; accountId: string | null; films: Film[] }) {
  const router = useRouter()
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
        const [holdingsRes, studiosRes, agentsRes, txRes, configRes, kycRes] = await Promise.all([
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
          bmovies
            .from('bct_user_kyc')
            .select('status')
            .eq('account_id', accountId)
            .maybeSingle(),
        ])

        if (cancelled) return

        const studios = (studiosRes.data || []) as { id: string; name: string; token_ticker: string; treasury_address: string }[]
        const agents = (agentsRes.data || []) as { id: string; name: string; role: string; reputation: number; jobs_completed: number; wallet_address: string; owner_account_id: string | null }[]

        const studiosWithCounts = studios.map((s) => ({
          ...s,
          agentCount: agents.length,
          filmCount: films.filter((f) => f.account_id === accountId).length,
        }))

        const priceCents = configRes.data?.value
          ? (typeof configRes.data.value === 'number' ? configRes.data.value : parseFloat(String(configRes.data.value)))
          : 0.1

        setWalletData({
          kycVerified: kycRes.data?.status === 'verified',
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
        setWalletData({
          kycVerified: false,
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
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <h1
          className="text-5xl font-black leading-none"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '-0.01em' }}
        >
          My <span className="text-[#E50914]">wallet</span>
        </h1>
        <p className="text-[#888] text-sm mt-2 max-w-xl">
          Your wallets, $bMovies balance, studio tokens, film tokens,
          agent roster, and transaction history.
        </p>
      </header>

      {/* Identity card */}
      {isBrc100 && brc100Address ? (
        <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-6 mb-6">
          <div className="text-[0.55rem] text-[#E50914] font-bold uppercase tracking-wider mb-2">
            BRC-100 wallet &middot; {brc100Provider || 'unknown'}
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
          <div className="text-white font-mono text-sm break-all mb-4">
            {email ?? user.id}
          </div>
          <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider mb-3">
            Connect a wallet
          </div>
          {!walletData?.kycVerified && (
            <div className="border border-[#E50914] bg-[#1a0003] p-4 mb-3">
              <div className="text-[0.55rem] text-[#E50914] font-bold uppercase tracking-wider mb-1">KYC required</div>
              <p className="text-[#bbb] text-xs leading-relaxed mb-2">
                Complete identity verification before connecting wallets. One-time check via Veriff (~90 seconds).
              </p>
              <a href="/kyc.html" className="inline-block text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#E50914] text-white">
                Verify identity →
              </a>
            </div>
          )}
          <div className={`grid grid-cols-2 md:grid-cols-5 gap-2 ${!walletData?.kycVerified ? 'opacity-40 pointer-events-none' : ''}`}>
            <button
              onClick={async () => {
                try {
                  const { connectWallet } = await import('@/lib/brc100')
                  const status = await connectWallet()
                  if (status.connected) window.location.reload()
                  else alert('BSV Desktop not detected. Install it from github.com/bsv-blockchain/bsv-desktop/releases/latest')
                } catch { alert('Could not connect BSV Desktop') }
              }}
              className="flex flex-col items-center gap-1.5 p-3 border border-[#333] bg-[#111] hover:border-[#E50914] transition-colors cursor-pointer"
            >
              <span style={{width:24,height:24,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #E50914",borderRadius:"50%",color:"#E50914",fontWeight:700,fontSize:13}}>B</span>
              <span className="text-[0.6rem] font-bold text-white">BSV Desktop</span>
              <span className="text-[0.5rem] text-[#E50914]">BRC-100</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const { connectWallet } = await import('@/lib/brc100')
                  const status = await connectWallet()
                  if (status.connected) window.location.reload()
                  else alert('Yours Wallet not detected. Install the browser extension from yours.org')
                } catch { alert('Could not connect Yours Wallet') }
              }}
              className="flex flex-col items-center gap-1.5 p-3 border border-[#333] bg-[#111] hover:border-[#6366F1] transition-colors cursor-pointer"
            >
              <span style={{width:24,height:24,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #6366F1",borderRadius:"50%",color:"#6366F1",fontWeight:700,fontSize:13}}>Y</span>
              <span className="text-[0.6rem] font-bold text-white">Yours Wallet</span>
              <span className="text-[0.5rem] text-[#6366F1]">BRC-100</span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
                  (window as any).solana.connect().then(() => alert('Phantom connected — Solana wallet linked. Cross-chain features coming soon.')).catch(() => alert('Phantom connection rejected'))
                } else {
                  alert('Phantom not detected. Install from phantom.app')
                }
              }}
              className="flex flex-col items-center gap-1.5 p-3 border border-[#333] bg-[#111] hover:border-[#AB9FF2] transition-colors cursor-pointer"
            >
              <span style={{width:24,height:24,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #AB9FF2",borderRadius:"50%",color:"#AB9FF2",fontWeight:700,fontSize:13}}>P</span>
              <span className="text-[0.6rem] font-bold text-white">Phantom</span>
              <span className="text-[0.5rem] text-[#AB9FF2]">Solana</span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).ethereum) {
                  (window as any).ethereum.request({ method: 'eth_requestAccounts' }).then(() => alert('MetaMask connected — Ethereum wallet linked. Cross-chain features coming soon.')).catch(() => alert('MetaMask connection rejected'))
                } else {
                  alert('MetaMask not detected. Install from metamask.io')
                }
              }}
              className="flex flex-col items-center gap-1.5 p-3 border border-[#333] bg-[#111] hover:border-[#F6851B] transition-colors cursor-pointer"
            >
              <span style={{width:24,height:24,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #F6851B",borderRadius:"50%",color:"#F6851B",fontWeight:700,fontSize:13}}>M</span>
              <span className="text-[0.6rem] font-bold text-white">MetaMask</span>
              <span className="text-[0.5rem] text-[#F6851B]">Ethereum</span>
            </button>
            <button
              onClick={() => {
                window.open('https://handcash.io', '_blank')
                alert('HandCash uses OAuth. Your HandCash handle becomes your payment identity on bMovies. Integration completing soon.')
              }}
              className="flex flex-col items-center gap-1.5 p-3 border border-[#333] bg-[#111] hover:border-[#38C032] transition-colors cursor-pointer"
            >
              <span style={{width:24,height:24,display:'inline-flex',alignItems:'center',justifyContent:'center',border:'1.5px solid #38C032',borderRadius:'50%',color:'#38C032',fontWeight:700,fontSize:13}}>H</span>
              <span className="text-[0.6rem] font-bold text-white">HandCash</span>
              <span className="text-[0.5rem] text-[#38C032]">BSV</span>
            </button>
          </div>
          <p className="text-[0.55rem] text-[#555] mt-3 leading-relaxed">
            BSV Desktop is recommended for the full bMovies experience (x402 payments, token purchases, KYC certificates).
            HandCash uses OAuth for seamless BSV payments. Phantom and MetaMask are experimental - cross-chain coming post-launch.
          </p>
        </div>
      )}

      {/* Portfolio summary strip */}
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

      {/* Holdings list */}
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
                  {' \u00b7 '}
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
                    {' \u00b7 '}
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
                    onClick={() => router.push('/account', { scroll: false })}
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

      {/* Transaction history */}
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

      {/* Technical details */}
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

/* ═══════════════════════════════════════════════════════════════════════
 *  STUDIO INFO SECTION (for StudioView — studio brand + create form)
 * ═══════════════════════════════════════════════════════════════════════ */

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

function StudioInfoSection({
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

  const [studioName, setStudioName] = useState('')
  const [studioAesthetic, setStudioAesthetic] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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
            Your studio brand goes on every film you commission.
          </p>
        </div>
      </div>
    )
  }

  // No studio: show create form
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
          {createLoading ? 'Creating...' : 'Create studio -- $0.99'}
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

/* ═══════════════════════════════════════════════════════════════════════
 *  TOOL VIEWS — rendered at ?project=<id>&tool=<name>
 * ═══════════════════════════════════════════════════════════════════════ */

const TOOL_LABELS: Record<string, string> = {
  script: 'Script Editor',
  storyboard: 'Storyboard',
  editor: 'Movie Editor',
  titles: 'Title Designer',
  score: 'Score Composer',
}

function ToolView({
  tool,
  projectId,
  projectTitle,
}: {
  tool: string
  projectId: string
  projectTitle: string
}) {
  return (
    <div>
      {tool === 'script' && <ScriptEditorView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'storyboard' && <StoryboardView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'editor' && <MovieEditorView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'titles' && <TitleDesignerView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'score' && <ScoreComposerView projectId={projectId} projectTitle={projectTitle} />}
    </div>
  )
}

/* ── Script Editor ── */

function ScriptEditorView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [synopsis, setSynopsis] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setSaved(false)
      try {
        const { data } = await bmovies
          .from('bct_artifacts')
          .select('url, kind')
          .eq('offer_id', projectId)
          .eq('kind', 'text')
          .like('step_id', 'writer%')
          .is('superseded_by', null)
          .order('created_at', { ascending: false })
          .limit(1)
        if (cancelled) return
        if (data && data.length > 0 && data[0].url) {
          try {
            const res = await fetch(data[0].url)
            if (res.ok) {
              const text = await res.text()
              if (!cancelled) setSynopsis(text)
            }
          } catch {
            await loadFallbackSynopsis()
          }
        } else {
          await loadFallbackSynopsis()
        }
      } catch {
        await loadFallbackSynopsis()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    async function loadFallbackSynopsis() {
      const { data: offer } = await bmovies
        .from('bct_offers')
        .select('synopsis')
        .eq('id', projectId)
        .maybeSingle()
      if (offer?.synopsis) setSynopsis(offer.synopsis)
    }

    load()
    return () => { cancelled = true }
  }, [projectId])

  return (
    <div className="space-y-4">
      <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">
        Script / Synopsis
      </div>
      {loading ? (
        <div className="h-64 bg-[#0a0a0a] border border-[#1a1a1a] animate-pulse" />
      ) : (
        <>
          <textarea
            value={synopsis}
            onChange={(e) => { setSynopsis(e.target.value); setSaved(false) }}
            rows={16}
            className="w-full bg-[#0a0a0a] border border-[#222] text-[#ccc] text-sm leading-relaxed p-4 font-mono resize-y focus:border-[#E50914] focus:outline-none"
            placeholder="No script content yet. Click 'AI Rewrite' to generate one, or start typing..."
            style={{ minHeight: '200px' }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
              }}
              className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors"
            >
              {saved ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={() => {
                alert(`AI Rewrite requested for "${projectTitle}". This will call the Grok agent to rewrite the script.`)
              }}
              className="px-4 py-2 border border-[#333] hover:border-[#E50914] text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors"
            >
              AI Rewrite
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Storyboard ── */

function StoryboardView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [frames, setFrames] = useState<{ id: number; url: string; step_id: string | null; role: string | null }[]>([])
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [tier, setTier] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: offer } = await bmovies
        .from('bct_offers')
        .select('tier, title')
        .eq('id', projectId)
        .maybeSingle()
      if (!cancelled && offer) setTier(offer.tier || '')

      const { data } = await bmovies
        .from('bct_artifacts')
        .select('id, url, step_id, role')
        .eq('offer_id', projectId)
        .eq('kind', 'image')
        .is('superseded_by', null)
        .order('created_at', { ascending: true })
      if (cancelled) return
      const allImages = (data as any[]) || []
      const storyboardFrames = allImages.filter(a =>
        a.step_id && a.step_id.startsWith('storyboard.') && a.step_id !== 'storyboard.poster'
      )
      const posterArt = allImages.find(a => a.role === 'poster' || a.step_id === 'storyboard.poster')
      const titleLower = (offer?.title || '').toLowerCase()
      const mapUrl = POSTER_MAP[titleLower]
      if (mapUrl) {
        setPosterUrl(mapUrl)
      } else if (posterArt?.url && !isEphemeralUrl(posterArt.url)) {
        setPosterUrl(posterArt.url)
      }
      setFrames(storyboardFrames)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-video bg-[#0a0a0a] border border-[#1a1a1a]" />
        ))}
      </div>
    )
  }

  if (frames.length === 0) {
    return (
      <div>
        {posterUrl && (
          <div className="mb-6">
            <div className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold mb-2">
              Poster
            </div>
            <div className="max-w-xs border border-[#222] bg-[#0a0a0a] overflow-hidden">
              <img src={posterUrl} alt={projectTitle} className="w-full" />
            </div>
          </div>
        )}
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8 max-w-xl">
          <div
            className="text-xl font-black mb-2 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            No storyboard <span className="text-[#E50914]">frames</span> yet
          </div>
          <p className="text-[#888] text-sm leading-relaxed mb-4">
            {tier === 'pitch'
              ? 'Pitches include a poster but no storyboard frames. Publish your pitch and sell 10% to fund a trailer -- trailers include 6 storyboard frames + video clips.'
              : 'Generate storyboard frames using the AI agent, or wait for the production pipeline to create them.'}
          </p>
          <button
            onClick={() => {
              alert(`Ask the bMovies agent (bottom-right chat) to "Generate a storyboard for ${projectTitle}"`)
            }}
            className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider"
          >
            Generate storyboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-3">
        {frames.length} frame{frames.length === 1 ? '' : 's'}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {frames.map((frame) => (
          <div key={frame.id} className="border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors overflow-hidden">
            <div className="aspect-video bg-[#050505]">
              <img
                src={frame.url}
                alt={frame.step_id || 'Storyboard frame'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            {frame.step_id && (
              <div className="px-2 py-1.5 text-[0.55rem] text-[#666] font-mono truncate">
                {frame.step_id}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <button
          onClick={() => {
            alert(`Generate new frame requested for "${projectTitle}".`)
          }}
          className="px-4 py-2 border border-[#333] hover:border-[#E50914] text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors"
        >
          Generate new frame
        </button>
      </div>
    </div>
  )
}

/* ── Movie Editor ── */

function MovieEditorView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [artifacts, setArtifacts] = useState<{ id: number; kind: string; url: string; step_id: string | null; role: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await bmovies
        .from('bct_artifacts')
        .select('id, kind, url, step_id, role')
        .eq('offer_id', projectId)
        .in('kind', ['video', 'image'])
        .is('superseded_by', null)
        .order('created_at', { ascending: true })
      if (!cancelled) {
        setArtifacts((data as any[]) || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  return (
    <div className="space-y-6">
      <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">
        Media assets ({loading ? '...' : artifacts.length})
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 bg-[#0a0a0a] border border-[#1a1a1a]" />
          ))}
        </div>
      ) : artifacts.length > 0 ? (
        <div className="border border-[#222] bg-[#0a0a0a] divide-y divide-[#1a1a1a]">
          {artifacts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`text-[0.55rem] font-bold uppercase tracking-wider px-2 py-0.5 ${
                a.kind === 'video' ? 'bg-[#1a0a3a] text-[#aa66ff]' : 'bg-[#1a1a1a] text-[#888]'
              }`}>
                {a.kind}
              </span>
              <span className="text-[#888] text-xs font-mono truncate flex-1">
                {a.step_id || a.role || 'unnamed'}
              </span>
              <a
                href={a.url}
                target="_blank"
                rel="noopener"
                className="text-[0.6rem] font-bold uppercase tracking-wider text-[#E50914] hover:text-white"
              >
                Open
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[#666] text-sm">No media assets found for this project.</div>
      )}

      <div className="border border-dashed border-[#222] bg-[#050505] p-8">
        <div
          className="text-xl font-black mb-3 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Non-linear <span className="text-[#E50914]">editor</span>
        </div>
        <p className="text-[#888] text-sm leading-relaxed mb-4">
          The timeline-based video editor will live here. Drag and drop clips,
          add transitions, overlay text, and export your final cut. Currently
          in development.
        </p>
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4 mb-4">
          <div className="flex gap-1 mb-2">
            {['V1', 'V2', 'A1', 'A2'].map((track) => (
              <div key={track} className="flex items-center gap-2 flex-1">
                <span className="text-[0.5rem] font-mono text-[#666] w-6">{track}</span>
                <div className={`h-6 flex-1 ${
                  track.startsWith('V') ? 'bg-[#1a0a3a]' : 'bg-[#0a1a0a]'
                } border border-[#222]`} />
              </div>
            ))}
          </div>
          <div className="h-1 bg-[#E50914] w-0.5 ml-8" />
        </div>
        <a
          href="https://npgx.website"
          target="_blank"
          rel="noopener"
          className="text-[0.6rem] font-bold uppercase tracking-wider text-[#888] hover:text-[#E50914] border-b border-[#333]"
        >
          NPGX Movie Editor concept
        </a>
      </div>
    </div>
  )
}

/* ── Title Designer ── */

function TitleDesignerView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [titleCards, setTitleCards] = useState<{ id: number; url: string; step_id: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await bmovies
        .from('bct_artifacts')
        .select('id, url, step_id')
        .eq('offer_id', projectId)
        .eq('kind', 'image')
        .like('step_id', 'title%')
        .is('superseded_by', null)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setTitleCards((data as any[]) || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  return (
    <div className="space-y-6">
      <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">
        Title cards
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 animate-pulse">
          <div className="aspect-video bg-[#0a0a0a] border border-[#1a1a1a]" />
          <div className="aspect-video bg-[#0a0a0a] border border-[#1a1a1a]" />
        </div>
      ) : titleCards.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {titleCards.map((tc) => (
            <div key={tc.id} className="border border-[#222] bg-[#0a0a0a] overflow-hidden hover:border-[#E50914] transition-colors">
              <div className="aspect-video bg-[#050505]">
                <img src={tc.url} alt="Title card" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[#666] text-sm">No title cards generated yet.</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            alert(`Design title card requested for "${projectTitle}". This will call the chat agent to generate a title card.`)
          }}
          className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors"
        >
          Design a title card
        </button>
      </div>

      <div className="border border-dashed border-[#222] bg-[#050505] p-8">
        <div
          className="text-xl font-black mb-3 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          3D Title <span className="text-[#E50914]">Designer</span>
        </div>
        <p className="text-[#888] text-sm leading-relaxed">
          The interactive 3D title designer will let you position, animate,
          and style your film&apos;s title card in real-time with Three.js.
          Coming soon.
        </p>
      </div>
    </div>
  )
}

/* ── Score Composer ── */

function ScoreComposerView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [audioArtifacts, setAudioArtifacts] = useState<{ id: number; url: string; step_id: string | null; role: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await bmovies
        .from('bct_artifacts')
        .select('id, url, step_id, role')
        .eq('offer_id', projectId)
        .eq('kind', 'audio')
        .is('superseded_by', null)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setAudioArtifacts((data as any[]) || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  return (
    <div className="space-y-6">
      <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">
        Audio / Score
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-16 bg-[#0a0a0a] border border-[#1a1a1a]" />
          <div className="h-16 bg-[#0a0a0a] border border-[#1a1a1a]" />
        </div>
      ) : audioArtifacts.length > 0 ? (
        <div className="space-y-3">
          {audioArtifacts.map((a) => (
            <div key={a.id} className="border border-[#222] bg-[#0a0a0a] p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs text-[#ccc] font-mono">
                  {a.step_id || a.role || 'Audio track'}
                </span>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener"
                  className="text-[0.6rem] font-bold uppercase tracking-wider text-[#E50914] hover:text-white"
                >
                  Download
                </a>
              </div>
              <audio src={a.url} controls className="w-full h-8" preload="none" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[#666] text-sm">No audio tracks generated yet.</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            alert(`Compose theme requested for "${projectTitle}". This will call the chat agent to generate a musical score.`)
          }}
          className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors"
        >
          Compose a theme
        </button>
      </div>

      <div className="border border-dashed border-[#222] bg-[#050505] p-8">
        <div
          className="text-xl font-black mb-3 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          AI <span className="text-[#E50914]">Composer</span>
        </div>
        <p className="text-[#888] text-sm leading-relaxed">
          The AI composer will generate original scores, ambient soundscapes,
          and theme music for your films using neural audio synthesis.
          Currently in research.
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
 *  SHARED COMPONENTS
 * ═══════════════════════════════════════════════════════════════════════ */

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
          dividends -- all live inside this dashboard. Sign in with your
          BRC-100 wallet (recommended) or with the email you used to
          commission a film.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="px-6 py-3 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
          >
            Sign in
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

function SkeletonDashboard() {
  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-12 animate-pulse">
      <div className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="h-2 w-32 bg-[#1a1a1a] mb-3" />
        <div className="h-12 w-64 bg-[#1a1a1a]" />
        <div className="h-3 w-80 bg-[#0e0e0e] mt-4" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
            <div className="h-2 w-16 bg-[#1a1a1a] mb-3" />
            <div className="h-8 w-24 bg-[#151515]" />
          </div>
        ))}
      </div>
      <div className="mb-8 flex gap-4 border-b border-[#1a1a1a] pb-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 w-20 bg-[#1a1a1a]" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a]">
            <div className="aspect-[2/3] bg-[#050505]" />
            <div className="p-4">
              <div className="h-4 w-3/4 bg-[#1a1a1a] mb-2" />
              <div className="h-3 w-1/2 bg-[#151515] mb-3" />
              <div className="h-2 w-full bg-[#0e0e0e]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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

/* ─── Status badge color helper ─── */

function statusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'released':
    case 'published':
    case 'auto_published':
      return { bg: '#0e3a0e', text: '#6bff8a' }
    case 'in_progress':
    case 'producing':
      return { bg: '#1a1a00', text: '#ffd700' }
    case 'funded':
      return { bg: '#0a1a3a', text: '#66aaff' }
    case 'draft':
      return { bg: '#1a1a1a', text: '#888' }
    default:
      return { bg: '#1a1a1a', text: '#666' }
  }
}
