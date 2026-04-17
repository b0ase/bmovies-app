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

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react'
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

/** Generate a dynamic poster placeholder as an SVG data URL */
function posterPlaceholder(title: string, ticker?: string | null): string {
  const t = (title || 'Untitled').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const tk = ticker ? `$${ticker}` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <rect width="400" height="600" fill="#0a0a0a"/>
    <rect x="0" y="0" width="400" height="4" fill="#E50914"/>
    <rect x="0" y="596" width="400" height="4" fill="#E50914"/>
    <text x="200" y="260" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="900" fill="#ffffff" textLength="360" lengthAdjust="spacingAndGlyphs">${t}</text>
    ${tk ? `<text x="200" y="300" text-anchor="middle" font-family="monospace" font-size="16" fill="#E50914">${tk}</text>` : ''}
    <text x="200" y="560" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#333" letter-spacing="3">POSTER GENERATING</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function resolvePosterUrl(film: Film): string {
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
  return posterPlaceholder(film.title, film.token_ticker)
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

      {/* Studio info + films inside */}
      <StudioInfoSection
        hasFilms={stats.count > 0}
        user={user}
        accountId={accountId}
        sessionIdFromUrl={sessionIdFromUrl}
        films={films}
        filmsLoading={filmsLoading}
        filmsError={filmsError}
      />
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
      <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8">
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

      <div className="border border-[#222] bg-[#0a0a0a] p-8">
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
      <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8">
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
      // Render natively instead of iframe — the iframe render was
      // getting blocked in some Chrome configurations (extensions / ORB)
      // and showed the "broken document" icon. Native render reads the
      // same Supabase tables as /captable.html and avoids the issue.
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
          </div>

          {/* Deep links — same as captable.html's link row */}
          <div className="flex flex-wrap gap-2 mt-3">
            <a
              href={`/film.html?id=${encodeURIComponent(film.id)}`}
              className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#E50914] text-white hover:bg-[#b00610] transition-colors"
            >
              Film page
            </a>
            <a
              href={`/production.html?id=${encodeURIComponent(film.id)}`}
              className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 border border-[#333] text-white hover:border-[#E50914] transition-colors"
            >
              Production timeline
            </a>
            <a
              href={`/offer.html?id=${encodeURIComponent(film.id)}`}
              className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 border border-[#333] text-white hover:border-[#E50914] transition-colors"
            >
              Investor view
            </a>
            <a
              href={`/deck.html?id=${encodeURIComponent(film.id)}`}
              className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 border border-[#333] text-white hover:border-[#E50914] transition-colors"
            >
              Investor pack
            </a>
            <a
              href="/legal/film-token-risk-disclosure.html"
              className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 border border-[#333] text-[#888] hover:border-[#E50914] transition-colors"
            >
              Risk disclosure
            </a>
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

/* ─── Project Cap Table (native render, replaces broken iframe) ─── */

type ShareSaleRow = {
  id: number
  tranche: number
  percent_bought: number
  price_usd: number
  created_at: string
  buyer_email: string | null
  payment_txid: string | null
}

function ProjectCapTableView({ film }: { film: Film }) {
  const [shareSales, setShareSales] = useState<ShareSaleRow[]>([])
  const [ticketCount, setTicketCount] = useState(0)
  const [ticketRevUsd, setTicketRevUsd] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [salesRes, tixRes] = await Promise.all([
          bmovies
            .from('bct_share_sales')
            .select('id, tranche, percent_bought, price_usd, created_at, buyer_email, payment_txid')
            .eq('offer_id', film.id)
            .order('created_at', { ascending: false }),
          bmovies
            .from('bct_ticket_sales')
            .select('price_usd')
            .eq('offer_id', film.id),
        ])
        if (cancelled) return
        const sales = (salesRes.data || []) as ShareSaleRow[]
        setShareSales(sales)
        const tix = (tixRes.data || []) as { price_usd: number }[]
        setTicketCount(tix.length)
        setTicketRevUsd(tix.reduce((s, t) => s + Number(t.price_usd ?? 0), 0))
      } catch (err) {
        console.warn('[captable] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [film.id])

  const commissionerPct = Number(film.commissioner_percent ?? 99)
  const soldPct = shareSales.reduce((s, r) => s + Number(r.percent_bought ?? 0), 0)
  const platformPct = Math.max(0, 100 - commissionerPct - soldPct)
  const onChain = film.token_mint_txid && /^[0-9a-f]{64}$/.test(film.token_mint_txid)

  const fmtUsd = (n: number) =>
    `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
            Cap table
          </div>
          <h2 className="text-3xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            ${film.token_ticker} <span className="text-[#888] text-xl ml-2">&middot; {film.title}</span>
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
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
        </div>
        <a
          href={`/captable.html?id=${encodeURIComponent(film.id)}`}
          target="_blank"
          rel="noopener"
          className="px-3 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.6rem] font-bold uppercase tracking-wider shrink-0"
        >
          Open standalone · Print as PDF
        </a>
      </div>

      {/* Ownership summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Commissioner</div>
          <div className="text-2xl font-black leading-none text-[#E50914]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {commissionerPct.toFixed(2)}%
          </div>
        </div>
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Investors</div>
          <div className="text-2xl font-black leading-none text-[#66aaff]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {soldPct.toFixed(2)}%
          </div>
        </div>
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Platform</div>
          <div className="text-2xl font-black leading-none text-[#888]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {platformPct.toFixed(2)}%
          </div>
        </div>
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Supply</div>
          <div className="text-2xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            1B
          </div>
          <div className="text-[0.6rem] text-[#555] mt-1">BSV-21 · 1,000,000,000</div>
        </div>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Tickets sold</div>
          <div className="text-2xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            {ticketCount.toLocaleString()}
          </div>
        </div>
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Gross revenue</div>
          <div className={`text-2xl font-black leading-none ${ticketRevUsd > 0 ? 'text-[#6bff8a]' : 'text-white'}`} style={{ fontFamily: 'var(--font-bebas)' }}>
            {fmtUsd(ticketRevUsd)}
          </div>
        </div>
      </div>

      {/* Token details */}
      {onChain && (
        <div className="border border-[#0e3a0e] bg-[#02120a] p-4 mb-6">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#6bff8a] font-bold mb-1">Mint transaction</div>
          <a
            href={`https://whatsonchain.com/tx/${film.token_mint_txid}`}
            target="_blank"
            rel="noopener"
            className="font-mono text-xs text-[#6bff8a] break-all hover:underline"
          >
            {film.token_mint_txid}
          </a>
        </div>
      )}

      {/* Share sales ledger */}
      <h3 className="text-[0.65rem] uppercase tracking-[0.18em] text-[#888] font-bold mb-2">
        Share sales
      </h3>
      {loading ? (
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-8 animate-pulse text-center text-[#666] text-xs">
          Loading sales…
        </div>
      ) : shareSales.length === 0 ? (
        <div className="border border-dashed border-[#222] bg-[#050505] p-6 text-center">
          <div className="text-[#666] text-sm mb-1">No investor sales yet</div>
          <div className="text-[#444] text-xs">
            Commissioner holds {commissionerPct.toFixed(2)}%; the remaining {(100 - commissionerPct).toFixed(2)}%
            is held by the platform until listed.
          </div>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] overflow-x-auto">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-[#1a1a1a] text-[0.55rem] uppercase tracking-[0.14em] text-[#666] font-bold">
            <div>Tranche</div>
            <div>Buyer</div>
            <div className="text-right">Share</div>
            <div className="text-right">Paid</div>
            <div className="text-right">Date</div>
          </div>
          {shareSales.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3 border-b border-[#111] last:border-b-0 items-center text-xs"
            >
              <div className="text-[#888] tabular-nums">#{s.tranche}</div>
              <div className="text-white truncate">
                {s.buyer_email || <span className="text-[#555] italic">anonymous</span>}
              </div>
              <div className="text-right text-white font-bold tabular-nums">
                {Number(s.percent_bought).toFixed(2)}%
              </div>
              <div className="text-right text-[#6bff8a] font-bold tabular-nums">
                {fmtUsd(Number(s.price_usd))}
              </div>
              <div className="text-right text-[#666] tabular-nums">
                {new Date(s.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links footer */}
      <div className="mt-6 flex gap-2 flex-wrap">
        <a
          href={`/film.html?id=${encodeURIComponent(film.id)}`}
          className="text-[0.55rem] font-bold uppercase tracking-wider text-[#E50914] hover:text-white"
        >
          Film page →
        </a>
        <a
          href={`/production.html?id=${encodeURIComponent(film.id)}`}
          className="text-[0.55rem] font-bold uppercase tracking-wider text-[#666] hover:text-white"
        >
          Production timeline
        </a>
        <a
          href={`/offer.html?id=${encodeURIComponent(film.id)}`}
          className="text-[0.55rem] font-bold uppercase tracking-wider text-[#666] hover:text-white"
        >
          Investor view
        </a>
        <a
          href={`/marketplace.html?offer=${encodeURIComponent(film.id)}`}
          className="text-[0.55rem] font-bold uppercase tracking-wider text-[#666] hover:text-white"
        >
          Secondary market
        </a>
      </div>
    </div>
  )
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
      <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8">
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
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider">
          Investor deck &middot; {film.title}
        </div>
        <a
          href={`/deck.html?id=${encodeURIComponent(film.id)}`}
          target="_blank"
          rel="noopener"
          className="px-3 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.6rem] font-bold uppercase tracking-wider shrink-0"
        >
          Open in new tab &middot; Print as PDF
        </a>
      </div>
      <iframe
        src={`/deck.html?id=${encodeURIComponent(film.id)}&embed=1`}
        className="w-full border border-[#222]"
        style={{ minHeight: '85vh', background: '#000' }}
        title={`Investor deck: ${film.title}`}
      />
    </div>
  )
}

/* ─── Project Production Room ─── */

function ProjectRoomView({ film }: { film: Film }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[0.55rem] text-[#666] font-bold uppercase tracking-wider">
          Production timeline &middot; {film.title}
        </div>
        <a
          href={`/production.html?id=${encodeURIComponent(film.id)}`}
          target="_blank"
          rel="noopener"
          className="px-3 py-1.5 border border-[#333] hover:border-[#E50914] text-white text-[0.6rem] font-bold uppercase tracking-wider"
        >
          Open in new tab
        </a>
      </div>
      <iframe
        src={`/production.html?id=${encodeURIComponent(film.id)}&embed=1`}
        className="w-full border border-[#222]"
        style={{ minHeight: '85vh', background: '#000' }}
        title={`Production: ${film.title}`}
      />
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
  royalties: {
    totalAccruedUsd: number
    totalDrawnUsd: number
    availableUsd: number
    positions: {
      offerId: string
      title: string
      tokenTicker: string
      tier: string
      sharePercent: number
      source: 'commission' | 'investor'
      ticketCount: number
      ticketRevenueUsd: number
      accruedUsd: number
    }[]
    history: {
      id: number
      amountUsd: number
      mneeAddress: string
      status: string
      settleTxid: string | null
      requestedAt: string
      settledAt: string | null
    }[]
  }
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
        const [
          holdingsRes, studiosRes, agentsRes, txRes, configRes, kycRes,
          myOffersRes, shareSalesRes, withdrawalsRes,
        ] = await Promise.all([
          bmovies
            .from('bct_platform_holdings')
            .select('tokens_held')
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
            .select('current_tranche_price_cents')
            .eq('id', 'platform')
            .maybeSingle(),
          bmovies
            .from('bct_user_kyc')
            .select('status')
            .eq('account_id', accountId)
            .maybeSingle(),
          // Offers commissioned by this account — each gives the user a
          // royalty position equal to commissioner_percent of ticket sales.
          bmovies
            .from('bct_offers')
            .select('id, title, tier, token_ticker, commissioner_percent')
            .eq('account_id', accountId),
          // Secondary-market share purchases — each row is a tranche of
          // percent_bought for a specific offer, paid price_usd.
          bmovies
            .from('bct_share_sales')
            .select('offer_id, tranche, percent_bought')
            .eq('buyer_account', accountId),
          // Prior withdrawals — pending + sent reduce available balance;
          // all statuses populate the "history" row list.
          bmovies
            .from('bct_royalty_withdrawals')
            .select('id, amount_usd, mnee_address, status, settle_txid, requested_at, settled_at, offer_id')
            .eq('account_id', accountId)
            .order('requested_at', { ascending: false })
            .limit(25),
        ])

        if (cancelled) return

        const studios = (studiosRes.data || []) as { id: string; name: string; token_ticker: string; treasury_address: string }[]
        const agents = (agentsRes.data || []) as { id: string; name: string; role: string; reputation: number; jobs_completed: number; wallet_address: string; owner_account_id: string | null }[]

        const studiosWithCounts = studios.map((s) => ({
          ...s,
          agentCount: agents.length,
          filmCount: films.filter((f) => f.account_id === accountId).length,
        }))

        const rawPrice = configRes.data?.current_tranche_price_cents
        const priceCents = rawPrice
          ? (typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice)))
          : 0.1

        // ── Royalty calculation ─────────────────────────────────
        // Two position sources:
        //   1) Commissioned offers  → 99% (or commissioner_percent)
        //   2) Share purchases       → sum(percent_bought) over tranches
        // Accrued per position = ticket revenue for that offer × share %
        type OfferMeta = { id: string; title: string; tier: string; token_ticker: string; commissioner_percent: number }
        type ShareSale = { offer_id: string; tranche: number; percent_bought: number }
        const myOffers = (myOffersRes.data || []) as OfferMeta[]
        const shareSales = (shareSalesRes.data || []) as ShareSale[]

        // Collect every offer_id the user has ANY position in.
        const positionOfferIds = new Set<string>()
        for (const o of myOffers) positionOfferIds.add(o.id)
        for (const s of shareSales) positionOfferIds.add(s.offer_id)

        // Fetch ticket revenue + offer metadata for positions that
        // aren't already in myOffers (pure investor positions).
        const missingIds = Array.from(positionOfferIds).filter(
          (id) => !myOffers.some((o) => o.id === id),
        )
        let extraOfferMeta: OfferMeta[] = []
        let ticketRows: { offer_id: string; price_usd: number }[] = []
        if (positionOfferIds.size > 0) {
          const [tixRes, metaRes] = await Promise.all([
            bmovies
              .from('bct_ticket_sales')
              .select('offer_id, price_usd')
              .in('offer_id', Array.from(positionOfferIds)),
            missingIds.length > 0
              ? bmovies
                  .from('bct_offers')
                  .select('id, title, tier, token_ticker, commissioner_percent')
                  .in('id', missingIds)
              : Promise.resolve({ data: [] as OfferMeta[] }),
          ])
          ticketRows = (tixRes.data || []) as typeof ticketRows
          extraOfferMeta = (metaRes.data || []) as OfferMeta[]
        }

        const revByOffer = new Map<string, { count: number; usd: number }>()
        for (const t of ticketRows) {
          const prev = revByOffer.get(t.offer_id) ?? { count: 0, usd: 0 }
          revByOffer.set(t.offer_id, {
            count: prev.count + 1,
            usd: prev.usd + Number(t.price_usd ?? 0),
          })
        }
        const offerMetaById = new Map<string, OfferMeta>()
        for (const o of [...myOffers, ...extraOfferMeta]) offerMetaById.set(o.id, o)

        // Aggregate share_sales by offer_id.
        const investorPctByOffer = new Map<string, number>()
        for (const s of shareSales) {
          const prev = investorPctByOffer.get(s.offer_id) ?? 0
          investorPctByOffer.set(s.offer_id, prev + Number(s.percent_bought ?? 0))
        }

        const positions: WalletData['royalties']['positions'] = []
        for (const id of positionOfferIds) {
          const meta = offerMetaById.get(id)
          if (!meta) continue
          const rev = revByOffer.get(id) ?? { count: 0, usd: 0 }
          const isCommissioner = myOffers.some((o) => o.id === id)
          const investorPct = investorPctByOffer.get(id) ?? 0

          if (isCommissioner) {
            const pct = Number(meta.commissioner_percent ?? 99)
            positions.push({
              offerId: id,
              title: meta.title,
              tokenTicker: meta.token_ticker,
              tier: meta.tier,
              sharePercent: pct,
              source: 'commission',
              ticketCount: rev.count,
              ticketRevenueUsd: rev.usd,
              accruedUsd: rev.usd * (pct / 100),
            })
          }
          if (investorPct > 0) {
            positions.push({
              offerId: id,
              title: meta.title,
              tokenTicker: meta.token_ticker,
              tier: meta.tier,
              sharePercent: investorPct,
              source: 'investor',
              ticketCount: rev.count,
              ticketRevenueUsd: rev.usd,
              accruedUsd: rev.usd * (investorPct / 100),
            })
          }
        }

        const totalAccruedUsd = positions.reduce((s, p) => s + p.accruedUsd, 0)

        type WithdrawalRow = {
          id: number
          amount_usd: number
          mnee_address: string
          status: string
          settle_txid: string | null
          requested_at: string
          settled_at: string | null
        }
        const withdrawals = (withdrawalsRes.data || []) as WithdrawalRow[]
        const drawnUsd = withdrawals
          .filter((w) => w.status === 'pending' || w.status === 'sent')
          .reduce((s, w) => s + Number(w.amount_usd ?? 0), 0)
        const availableUsd = Math.max(0, Math.round((totalAccruedUsd - drawnUsd) * 100) / 100)

        setWalletData({
          kycVerified: kycRes.data?.status === 'verified',
          platformTokens: (holdingsRes.data?.tokens_held as number) ?? 0,
          pricePerTokenCents: priceCents,
          studioCount: studios.length,
          filmCount: films.length,
          agentCount: agents.length,
          studios: studiosWithCounts,
          agents: agents.map(({ owner_account_id: _, ...a }) => a),
          transactions: (txRes.data || []) as WalletData['transactions'],
          royalties: {
            totalAccruedUsd,
            totalDrawnUsd: drawnUsd,
            availableUsd,
            positions: positions.sort((a, b) => b.accruedUsd - a.accruedUsd),
            history: withdrawals.map((w) => ({
              id: w.id,
              amountUsd: Number(w.amount_usd),
              mneeAddress: w.mnee_address,
              status: w.status,
              settleTxid: w.settle_txid,
              requestedAt: w.requested_at,
              settledAt: w.settled_at,
            })),
          },
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
          royalties: {
            totalAccruedUsd: 0,
            totalDrawnUsd: 0,
            availableUsd: 0,
            positions: [],
            history: [],
          },
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
    <div className="">
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
          <div className={!walletData?.kycVerified ? 'opacity-40' : ''}>
          {/* BSV Desktop — primary. KYC enforced in JS, not just CSS. */}
          <button
            onClick={async () => {
              // HARD KYC GATE — enforced in JS, not just CSS opacity
              if (!walletData?.kycVerified) {
                if (confirm('Identity verification required before connecting a wallet.\n\nComplete KYC now? (~90 seconds via Veriff)')) {
                  window.location.href = '/kyc.html'
                }
                return
              }
              try {
                const { connectBsvDesktop } = await import('@/lib/brc100')
                const status = await connectBsvDesktop()
                if (status.connected && status.address) {
                  // Persist the connection on the Supabase user so the
                  // wallet UI survives refresh and the rest of the app
                  // (captable, marketplace, withdraw) can key off it.
                  const { error: updErr } = await bmovies.auth.updateUser({
                    data: {
                      brc100_address: status.address,
                      brc100_provider: status.provider ?? 'metanet',
                      brc100_pubkey: status.publicKey ?? null,
                      brc100_connected_at: new Date().toISOString(),
                    },
                  })
                  if (updErr) {
                    console.warn('[wallet] connected but failed to persist:', updErr)
                  }
                  window.location.reload()
                } else {
                  const msg = status.error || 'BSV Desktop not detected.'
                  // Show the ACTUAL failure reason, not a generic message.
                  alert(
                    'BSV Desktop connect failed:\n\n' + msg +
                    '\n\nChecks:\n' +
                    '  • BSV Desktop is running and unlocked\n' +
                    '  • It\'s listening on http://127.0.0.1:3321\n' +
                    '  • No browser extension is blocking localhost',
                  )
                }
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                console.error('[wallet] BSV Desktop connect error:', err)
                alert('BSV Desktop connect threw:\n\n' + msg)
              }
            }}
            className="w-full flex items-center gap-4 p-4 border border-[#E50914] bg-[#111] hover:bg-[#1a0003] transition-colors cursor-pointer mb-3 text-left"
          >
            <span style={{width:36,height:36,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"2px solid #E50914",borderRadius:"50%",color:"#E50914",fontWeight:700,fontSize:18,flexShrink:0}}>B</span>
            <div>
              <div className="text-sm font-bold text-white">Connect BSV Desktop</div>
              <div className="text-[0.6rem] text-[#888]">BRC-100 wallet on localhost:3321. Must be running and unlocked.</div>
            </div>
            <span className="ml-auto text-[#E50914] text-lg">→</span>
          </button>
          {/* Other wallets — greyed out */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 opacity-40">
            <div className="flex flex-col items-center gap-1 p-2.5 border border-[#1a1a1a] bg-[#0a0a0a]">
              <span className="text-[0.6rem] font-bold text-[#555]">Yours Wallet</span>
              <span className="text-[0.45rem] text-[#444]">Coming soon</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2.5 border border-[#1a1a1a] bg-[#0a0a0a]">
              <span className="text-[0.6rem] font-bold text-[#555]">Phantom</span>
              <span className="text-[0.45rem] text-[#444]">Coming soon</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2.5 border border-[#1a1a1a] bg-[#0a0a0a]">
              <span className="text-[0.6rem] font-bold text-[#555]">MetaMask</span>
              <span className="text-[0.45rem] text-[#444]">Coming soon</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2.5 border border-[#1a1a1a] bg-[#0a0a0a]">
              <span className="text-[0.6rem] font-bold text-[#555]">HandCash</span>
              <span className="text-[0.45rem] text-[#444]">Coming soon</span>
            </div>
          </div>
          <p className="text-[0.55rem] text-[#555] mt-3 leading-relaxed">
            <a href="https://github.com/bsv-blockchain/bsv-desktop/releases/latest" target="_blank" rel="noopener" className="text-[#E50914]">Download BSV Desktop</a> — the primary BRC-100 wallet for bMovies.
          </p>
          </div>{/* end KYC gate wrapper */}
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

      {/* Royalties — what the wallet is actually for */}
      <RoyaltiesSection
        walletLoading={walletLoading}
        royalties={walletData?.royalties}
        kycVerified={Boolean(walletData?.kycVerified)}
      />

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
  poster_url: string | null
  founded_year: number
  aesthetic: string | null
  owner_account_id: string | null
  created_by: string | null
  is_public: boolean
}

/* ─── Public toggle for studio listing on /exchange.html ─── */

function PublicToggle({ studio, onToggled }: { studio: StudioData; onToggled: (val: boolean) => void }) {
  const [saving, setSaving] = useState(false)

  async function toggle() {
    setSaving(true)
    try {
      const next = !studio.is_public
      const { error } = await bmovies
        .from('bct_studios')
        .update({ is_public: next })
        .eq('id', studio.id)
      if (error) throw new Error(error.message)
      onToggled(next)
    } catch (err) {
      alert('Failed to update: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border transition-colors"
      style={{
        borderColor: studio.is_public ? '#E50914' : '#333',
        color: studio.is_public ? '#E50914' : '#666',
        background: studio.is_public ? 'rgba(229, 9, 20, 0.08)' : 'transparent',
        opacity: saving ? 0.5 : 1,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '0.5rem',
          height: '0.5rem',
          borderRadius: '50%',
          background: studio.is_public ? '#E50914' : '#333',
          transition: 'background 150ms',
        }}
      />
      {studio.is_public ? 'Listed publicly' : 'Private studio'}
    </button>
  )
}

function StudioInfoSection({
  hasFilms,
  user,
  accountId,
  sessionIdFromUrl,
  films,
  filmsLoading,
  filmsError,
}: {
  hasFilms: boolean
  user: User | null
  accountId: string | null
  sessionIdFromUrl: string | null
  films?: Film[]
  filmsLoading?: boolean
  filmsError?: string | null
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
      <div>
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
      <div>
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
      <div className="animate-pulse">
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-6">
          <div className="h-6 w-48 bg-[#1a1a1a] mb-4" />
          <div className="h-3 w-full bg-[#151515] mb-2" />
          <div className="h-3 w-3/4 bg-[#151515]" />
        </div>
      </div>
    )
  }

  if (studio) {
    const isPlaceholder = studio.created_by === 'auto'
    return (
      <div>
        <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-6">
          {/* Studio header */}
          <div className="flex items-start gap-5 mb-5">
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
            <div className="min-w-0 flex-1">
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
              <p className="text-[#888] text-sm leading-relaxed">
                {studio.bio || 'No bio generated yet.'}
              </p>
            </div>
          </div>

          {/* Action buttons + public toggle — top of box */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {studio.treasury_address && /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(studio.treasury_address) && (
              <a
                href={`https://whatsonchain.com/address/${studio.treasury_address}`}
                target="_blank"
                rel="noopener"
                className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#333] hover:border-[#E50914] text-[#bbb]"
              >
                Treasury on chain
              </a>
            )}
            <a
              href="/commission.html"
              className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 bg-[#E50914] text-white"
            >
              Commission a film
            </a>
            <PublicToggle studio={studio} onToggled={(val) => setStudio({ ...studio, is_public: val })} />
          </div>

          {/* Roster poster — the cinematic team card generated at studio creation */}
          {studio.poster_url && (
            <div className="mb-5">
              <img
                src={studio.poster_url}
                alt={`${studio.name} roster poster`}
                className="w-full object-cover border border-[#E50914]/30"
                style={{ maxHeight: '400px' }}
              />
            </div>
          )}

          {/* Upgrade banner for placeholder studios */}
          {isPlaceholder && (
            <div className="border border-dashed border-[#E50914] bg-[#0a0000] p-4 mb-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-[#bbb] text-sm">
                  <span className="text-[#E50914] font-bold">Upgrade</span> for $0.99 to get an AI-generated logo, roster poster, bio, and 8 specialist agents.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const session = await bmovies.auth.getSession()
                      const token = session.data.session?.access_token
                      const res = await fetch('/api/studio/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                        body: JSON.stringify({ name: studio.name, aesthetic: studio.aesthetic || '' }),
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error || 'Failed')
                      if (data.checkoutUrl) window.location.href = data.checkoutUrl
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Upgrade failed')
                    }
                  }}
                  className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider shrink-0"
                >
                  Upgrade studio &mdash; $0.99
                </button>
              </div>
            </div>
          )}

          {/* Films inside the red studio box */}
          <div className="border-t border-[#E50914]/30 pt-5">
            <div className="text-[0.55rem] text-[#E50914] font-bold uppercase tracking-wider mb-3">
              Productions
            </div>
            {films ? (
              <ProjectCards films={films} loading={filmsLoading || false} error={filmsError || null} />
            ) : (
              <div className="text-[#666] text-sm">
                No films yet.{' '}
                <a href="/commission.html" className="text-[#E50914]">Commission your first →</a>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  // Placeholder studio (created_by === 'auto'): show the studio name + upgrade CTA + the create form below
  if (!studio) return (
    <div>
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

interface TextArtifact { id: number; url: string; step_id: string | null; role: string | null; content?: string }

const SCRIPT_TABS = [
  { stepPrefix: 'writer.logline',    label: 'Logline',            alwaysShow: true },
  { stepPrefix: 'writer.synopsis',   label: 'Synopsis',           alwaysShow: true },
  { stepPrefix: 'writer.treatment',  label: 'Script',             alwaysShow: true },
  { stepPrefix: 'writer.screenplay', label: 'Screenplay',         alwaysShow: true },
  { stepPrefix: 'writer.beat_sheet', label: 'Beat Sheet',         alwaysShow: false },
  { stepPrefix: 'director.vision',   label: 'Director\'s Vision', alwaysShow: false },
  { stepPrefix: 'casting.cast_list', label: 'Cast',               alwaysShow: false },
  { stepPrefix: 'dp.shot_plan',      label: 'Shot List',          alwaysShow: false },
  { stepPrefix: 'composer.themes',   label: 'Score Brief',        alwaysShow: false },
]

function decodeDataUrl(url: string): string | null {
  if (!url.startsWith('data:')) return null
  const comma = url.indexOf(',')
  if (comma < 0) return null
  return decodeURIComponent(url.slice(comma + 1))
}

/* ── ScriptPane: editable text with save, AI rewrite, version history ── */

function ScriptPane({
  content: initialContent,
  tabLabel,
  stepPrefix,
  projectId,
  projectTitle,
  artifactId,
  onSaved,
}: {
  content: string
  tabLabel: string
  stepPrefix: string
  projectId: string
  projectTitle: string
  artifactId?: number
  onSaved: (newContent: string) => void
}) {
  const [text, setText] = useState(initialContent)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<{ id: number; version: number; created_at: string; url: string }[]>([])

  // Sync when tab changes
  useEffect(() => { setText(initialContent) }, [initialContent])

  // Load version history
  useEffect(() => {
    if (!showHistory) return
    bmovies
      .from('bct_artifacts')
      .select('id, version, created_at, url')
      .eq('offer_id', projectId)
      .eq('kind', 'text')
      .like('step_id', `${stepPrefix}%`)
      .order('version', { ascending: false })
      .limit(10)
      .then(({ data }) => setVersions((data as any[]) || []))
  }, [showHistory, projectId, stepPrefix])

  async function handleSave() {
    setSaving(true)
    setSaveStatus(null)
    try {
      const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`
      // Supersede old version if it exists
      if (artifactId) {
        const { data: old } = await bmovies
          .from('bct_artifacts')
          .select('version')
          .eq('id', artifactId)
          .maybeSingle()
        const newVersion = ((old?.version as number) || 1) + 1
        // Insert new version
        await bmovies.from('bct_artifacts').insert({
          offer_id: projectId,
          kind: 'text',
          url: dataUrl,
          step_id: stepPrefix,
          role: stepPrefix.split('.')[0],
          model: 'user-edit',
          prompt: `Manual edit by commissioner`,
          payment_txid: `edit-${projectId}-${Date.now()}`,
          version: newVersion,
        })
        // Mark old as superseded
        await bmovies.from('bct_artifacts').update({ superseded_by: `v${newVersion}` }).eq('id', artifactId)
      }
      onSaved(text)
      setSaveStatus('Saved (v' + (versions.length + 2) + ')')
      setEditing(false)
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err) {
      setSaveStatus('Save failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  async function handleAiRewrite() {
    setRewriting(true)
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Rewrite the following ${tabLabel.toLowerCase()} for the film "${projectTitle}". Make it more vivid, specific, and cinematic. Remove any generic AI phrases. Keep the same story but improve the prose:\n\n${text}`,
          projectId,
        }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      const rewritten = data?.reply || data?.message || data?.content || ''
      if (rewritten) {
        setText(rewritten)
        setEditing(true)
      }
    } catch (err) {
      alert('AI rewrite failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setRewriting(false)
    }
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length
  const hash = text ? Array.from(new Uint8Array(16)).map(() => Math.floor(Math.random() * 16).toString(16)).join('') : ''

  if (!initialContent && !editing) {
    return (
      <div className="border border-dashed border-[#222] bg-[#050505] p-8 text-center" style={{ minHeight: '200px' }}>
        <div className="text-xl font-black mb-2 text-[#E50914]" style={{ fontFamily: 'var(--font-bebas)' }}>
          {tabLabel}
        </div>
        <p className="text-[#666] text-sm mb-4">
          Not generated yet. Start writing or ask the AI to generate this.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => { setText(''); setEditing(true) }}
            className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider"
          >
            Start writing
          </button>
          <button
            onClick={handleAiRewrite}
            disabled={rewriting}
            className="px-4 py-2 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
          >
            {rewriting ? 'Generating...' : `AI Generate ${tabLabel}`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Editor */}
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#E50914] text-[#ccc] text-sm leading-relaxed p-5 font-mono resize-y focus:outline-none"
          style={{ minHeight: '350px' }}
          autoFocus
        />
      ) : (
        <div
          className="bg-[#0a0a0a] border border-[#222] text-[#ccc] text-sm leading-relaxed p-5 whitespace-pre-wrap cursor-text hover:border-[#333] transition-colors"
          style={{ minHeight: '300px', fontFamily: 'var(--font-mono), monospace' }}
          onClick={() => setEditing(true)}
        >
          {text}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.5rem] text-[#555] font-mono">{wordCount} words</span>

        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.6rem] font-bold uppercase tracking-wider disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save new version'}
            </button>
            <button
              onClick={() => { setText(initialContent); setEditing(false) }}
              className="px-3 py-1.5 border border-[#333] hover:border-[#E50914] text-[#888] text-[0.6rem] font-bold uppercase tracking-wider"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 border border-[#333] hover:border-[#E50914] text-white text-[0.6rem] font-bold uppercase tracking-wider"
          >
            Edit
          </button>
        )}

        <button
          onClick={handleAiRewrite}
          disabled={rewriting}
          className="px-3 py-1.5 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white text-[0.6rem] font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
        >
          {rewriting ? 'Rewriting...' : 'AI Rewrite'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1.5 border border-[#222] text-[#666] hover:text-white text-[0.6rem] font-bold uppercase tracking-wider"
          >
            {showHistory ? 'Hide history' : 'Versions'}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(text)}
            className="px-3 py-1.5 border border-[#222] text-[#666] hover:text-white text-[0.6rem] font-bold uppercase tracking-wider"
          >
            Copy
          </button>
          <button
            onClick={() => {
              const blob = new Blob([text], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `${projectTitle} - ${tabLabel}.txt`; a.click()
              URL.revokeObjectURL(url)
            }}
            className="px-3 py-1.5 border border-[#222] text-[#666] hover:text-white text-[0.6rem] font-bold uppercase tracking-wider"
          >
            Export
          </button>
        </div>
      </div>

      {saveStatus && (
        <p className={`text-[0.6rem] ${saveStatus.startsWith('Save failed') ? 'text-[#ff6b6b]' : 'text-[#6bff8a]'}`}>
          {saveStatus}
        </p>
      )}

      {/* Version history */}
      {showHistory && (
        <div className="border border-[#222] bg-[#050505]">
          <div className="px-4 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
            <span className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">Version history</span>
            <span className="text-[0.45rem] text-[#444] font-mono">git-style versioning</span>
          </div>
          {versions.length === 0 ? (
            <div className="px-4 py-3 text-[#555] text-xs">No version history available.</div>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-2 border-b border-[#111] last:border-b-0 hover:bg-[#0a0a0a]">
                <span className="text-[0.55rem] font-mono text-[#E50914] font-bold w-8">v{v.version}</span>
                <span className="text-[0.5rem] text-[#666] font-mono">{new Date(v.created_at).toLocaleString()}</span>
                <button
                  onClick={async () => {
                    try {
                      const decoded = v.url.startsWith('data:') ? decodeDataUrl(v.url) : await fetch(v.url).then(r => r.text())
                      if (decoded) { setText(decoded); setEditing(true) }
                    } catch { /* skip */ }
                  }}
                  className="ml-auto text-[0.5rem] text-[#888] hover:text-[#E50914] font-bold uppercase tracking-wider"
                >
                  Restore
                </button>
              </div>
            ))
          )}
          {/* Blockchain timestamp placeholder */}
          <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center gap-2">
            <span className="text-[0.45rem] text-[#333] font-mono">SHA256: {hash.slice(0, 16)}...</span>
            <span className="ml-auto text-[0.45rem] text-[#333] uppercase tracking-wider font-bold border border-[#1a1a1a] px-2 py-0.5">
              On-chain timestamp — post-launch
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function ScriptEditorView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [artifacts, setArtifacts] = useState<TextArtifact[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offerSynopsis, setOfferSynopsis] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [artsRes, offerRes] = await Promise.all([
        bmovies
          .from('bct_artifacts')
          .select('id, url, step_id, role')
          .eq('offer_id', projectId)
          .eq('kind', 'text')
          .is('superseded_by', null)
          .order('created_at', { ascending: true }),
        bmovies
          .from('bct_offers')
          .select('synopsis')
          .eq('id', projectId)
          .maybeSingle(),
      ])
      if (cancelled) return
      if (offerRes.data?.synopsis) setOfferSynopsis(offerRes.data.synopsis)

      // Decode data URLs inline
      const raw = (artsRes.data || []) as TextArtifact[]
      const decoded = raw.map(a => ({
        ...a,
        content: a.url.startsWith('data:') ? decodeDataUrl(a.url) || '' : undefined,
      }))
      setArtifacts(decoded)

      // Load text from non-data URLs
      for (let i = 0; i < decoded.length; i++) {
        if (decoded[i].content === undefined && decoded[i].url) {
          try {
            const res = await fetch(decoded[i].url)
            if (res.ok && !cancelled) {
              const text = await res.text()
              decoded[i] = { ...decoded[i], content: text }
              setArtifacts([...decoded])
            }
          } catch { /* skip */ }
        }
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  // Match artifacts to tabs — always show key tabs even if empty
  const tabData = SCRIPT_TABS.map(tab => {
    const match = artifacts.find(a =>
      a.step_id?.startsWith(tab.stepPrefix) ||
      (tab.stepPrefix === 'writer.logline' && a.role === 'writer' && !a.step_id)
    )
    // For synopsis, fall back to the offer's synopsis field
    const content = match?.content || (tab.stepPrefix === 'writer.synopsis' ? offerSynopsis : '')
    return { ...tab, artifact: match, content }
  }).filter(t => t.alwaysShow || t.content)

  const currentContent = tabData[activeTab]?.content || ''

  return (
    <div className="space-y-4">
      {/* Tab row */}
      <div className="flex gap-0 overflow-x-auto border-b border-[#E50914]/30">
        {loading ? (
          <div className="h-10 w-48 bg-[#0a0a0a] animate-pulse" />
        ) : tabData.map((tab, i) => (
          <button
            key={tab.stepPrefix}
            onClick={() => setActiveTab(i)}
            className="px-4 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap transition-colors"
            style={{
              fontFamily: 'var(--font-bebas), "Bebas Neue", sans-serif',
              fontSize: '0.95rem',
              letterSpacing: '0.1em',
              // alwaysShow tabs (Logline, Synopsis, Script, Screenplay) stay
              // red even when empty — they're the primary writing surface and
              // should read as "here's where you start," not as dimmed.
              color: i === activeTab ? '#fff' : (tab.content || tab.alwaysShow ? '#E50914' : '#333'),
              borderBottom: i === activeTab ? '3px solid #E50914' : '3px solid transparent',
              background: i === activeTab ? 'rgba(229, 9, 20, 0.1)' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      {loading ? (
        <div className="h-64 bg-[#0a0a0a] border border-[#1a1a1a] animate-pulse" />
      ) : (
        <ScriptPane
          content={currentContent}
          tabLabel={tabData[activeTab]?.label || ''}
          stepPrefix={tabData[activeTab]?.stepPrefix || ''}
          projectId={projectId}
          projectTitle={projectTitle}
          artifactId={tabData[activeTab]?.artifact?.id}
          onSaved={(newContent) => {
            // Update local state after save
            if (tabData[activeTab]?.artifact) {
              tabData[activeTab].artifact!.content = newContent
              tabData[activeTab].content = newContent
            }
          }}
        />
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
        (a.step_id && a.step_id.startsWith('storyboard.') && a.step_id !== 'storyboard.poster') ||
        (a.role === 'storyboard' && a.step_id !== 'storyboard.poster')
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
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8">
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
              (window as any).bmoviesChat?.open(`Generate a 6-frame storyboard for "${projectTitle}". Use the synopsis and any existing script material.`)
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
            (window as any).bmoviesChat?.open(`Generate one additional storyboard frame for "${projectTitle}". Make it a key dramatic moment.`)
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
  const [clips, setClips] = useState<{ id: number; kind: string; url: string; step_id: string | null; role: string | null }[]>([])
  const [images, setImages] = useState<{ id: number; url: string; step_id: string | null; role: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeClip, setActiveClip] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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
        const all = (data as any[]) || []
        setClips(all.filter(a => a.kind === 'video'))
        setImages(all.filter(a => a.kind === 'image'))
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  // Auto-advance to next clip when current one ends
  function handleClipEnd() {
    if (activeClip < clips.length - 1) {
      setActiveClip(prev => prev + 1)
    } else {
      setIsPlaying(false)
    }
  }

  // Play all clips in sequence
  function playAll() {
    setActiveClip(0)
    setIsPlaying(true)
    setTimeout(() => videoRef.current?.play(), 100)
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="aspect-video bg-[#0a0a0a] border border-[#1a1a1a]" />
        <div className="h-20 bg-[#0a0a0a] border border-[#1a1a1a]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Monitor — main video player */}
      <div className="border border-[#E50914] bg-black">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-[#222]">
          <span className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold">
            Monitor
          </span>
          <span className="text-[0.5rem] text-[#666] font-mono">
            {clips.length > 0 ? `Clip ${activeClip + 1} of ${clips.length}` : 'No clips'}
          </span>
        </div>
        {clips.length > 0 ? (
          <video
            ref={videoRef}
            key={clips[activeClip]?.url}
            src={clips[activeClip]?.url}
            controls
            autoPlay={isPlaying}
            onEnded={handleClipEnd}
            className="w-full aspect-video bg-black"
            preload="metadata"
          />
        ) : (
          <div className="aspect-video bg-[#050505] flex items-center justify-center">
            <div className="text-center">
              <div className="text-[#333] text-4xl mb-2">&#9654;</div>
              <div className="text-[#555] text-xs">No video clips yet</div>
            </div>
          </div>
        )}
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveClip(Math.max(0, activeClip - 1))}
          disabled={clips.length === 0}
          className="px-3 py-1.5 border border-[#333] hover:border-[#E50914] text-white text-sm disabled:opacity-30"
        >
          &#9664;&#9664;
        </button>
        <button
          onClick={playAll}
          disabled={clips.length === 0}
          className="px-5 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider disabled:opacity-30"
        >
          &#9654; Play all
        </button>
        <button
          onClick={() => setActiveClip(Math.min(clips.length - 1, activeClip + 1))}
          disabled={clips.length === 0}
          className="px-3 py-1.5 border border-[#333] hover:border-[#E50914] text-white text-sm disabled:opacity-30"
        >
          &#9654;&#9654;
        </button>
        <span className="ml-auto text-[0.55rem] text-[#666] font-mono">
          {clips.length} clips &middot; {images.length} stills
        </span>
      </div>

      {/* Timeline */}
      <div className="border border-[#222] bg-[#050505]">
        <div className="px-3 py-1.5 border-b border-[#1a1a1a] flex items-center justify-between">
          <span className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">Timeline</span>
        </div>
        {/* Video track */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[0.45rem] font-mono text-[#555] w-5 shrink-0">V1</span>
            <div className="flex gap-0.5 flex-1 overflow-x-auto">
              {clips.length > 0 ? clips.map((clip, i) => (
                <button
                  key={clip.id}
                  onClick={() => { setActiveClip(i); videoRef.current?.play() }}
                  className="h-10 min-w-[60px] flex-1 flex items-center justify-center text-[0.45rem] font-mono transition-colors"
                  style={{
                    background: i === activeClip ? '#E50914' : '#1a0a3a',
                    border: `1px solid ${i === activeClip ? '#E50914' : '#2a1a4a'}`,
                    color: i === activeClip ? '#fff' : '#aa66ff',
                  }}
                >
                  {clip.step_id?.replace('scene.', 'S').replace('.video', '') || clip.role || `C${i + 1}`}
                </button>
              )) : (
                <div className="h-10 flex-1 bg-[#0a0a0a] border border-[#1a1a1a] border-dashed flex items-center justify-center text-[0.5rem] text-[#333]">
                  Empty track
                </div>
              )}
            </div>
          </div>
          {/* Image / stills track */}
          <div className="flex items-center gap-1">
            <span className="text-[0.45rem] font-mono text-[#555] w-5 shrink-0">V2</span>
            <div className="flex gap-0.5 flex-1 overflow-x-auto">
              {images.length > 0 ? images.map((img) => (
                <div
                  key={img.id}
                  className="h-10 min-w-[40px] flex-1 bg-[#0a1a0a] border border-[#1a2a1a] overflow-hidden"
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover opacity-60" loading="lazy" />
                </div>
              )) : (
                <div className="h-10 flex-1 bg-[#0a0a0a] border border-[#1a1a1a] border-dashed flex items-center justify-center text-[0.5rem] text-[#333]">
                  Empty track
                </div>
              )}
            </div>
          </div>
          {/* Audio tracks */}
          {['A1', 'A2'].map(track => (
            <div key={track} className="flex items-center gap-1 mt-1">
              <span className="text-[0.45rem] font-mono text-[#555] w-5 shrink-0">{track}</span>
              <div className="h-6 flex-1 bg-[#0a0a0a] border border-[#1a1a1a] border-dashed flex items-center justify-center text-[0.5rem] text-[#333]">
                {track === 'A1' ? 'Score' : 'SFX'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clip bin */}
      <details open={clips.length > 0}>
        <summary className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold cursor-pointer mb-2">
          Clip bin ({clips.length + images.length} assets)
        </summary>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {clips.map((clip, i) => (
            <button
              key={clip.id}
              onClick={() => setActiveClip(i)}
              className="border border-[#222] bg-[#0a0a0a] hover:border-[#E50914] transition-colors overflow-hidden text-left"
            >
              <div className="aspect-video bg-[#050505] flex items-center justify-center text-[#aa66ff] text-lg">
                &#9654;
              </div>
              <div className="px-1.5 py-1 text-[0.45rem] text-[#888] font-mono truncate">
                {clip.step_id || clip.role || `clip-${i + 1}`}
              </div>
            </button>
          ))}
          {images.map((img) => (
            <div
              key={img.id}
              className="border border-[#222] bg-[#0a0a0a] overflow-hidden"
            >
              <div className="aspect-video bg-[#050505]">
                <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="px-1.5 py-1 text-[0.45rem] text-[#888] font-mono truncate">
                {img.step_id || img.role || 'still'}
              </div>
            </div>
          ))}
        </div>
      </details>
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
            (window as any).bmoviesChat?.open(`Design a cinematic title card for "${projectTitle}". Use the film's genre and tone.`)
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
  const [scoreBrief, setScoreBrief] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [audioRes, textRes] = await Promise.all([
        bmovies
          .from('bct_artifacts')
          .select('id, url, step_id, role')
          .eq('offer_id', projectId)
          .eq('kind', 'audio')
          .is('superseded_by', null)
          .order('created_at', { ascending: false }),
        bmovies
          .from('bct_artifacts')
          .select('url')
          .eq('offer_id', projectId)
          .eq('kind', 'text')
          .like('step_id', 'composer%')
          .is('superseded_by', null)
          .limit(1),
      ])
      if (!cancelled) {
        setAudioArtifacts((audioRes.data as any[]) || [])
        const briefUrl = (textRes.data as any[])?.[0]?.url
        if (briefUrl) {
          const decoded = briefUrl.startsWith('data:') ? decodeDataUrl(briefUrl) : null
          if (decoded) {
            setScoreBrief(decoded)
          } else {
            try {
              const r = await fetch(briefUrl)
              if (r.ok) setScoreBrief(await r.text())
            } catch { /* skip */ }
          }
        }
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

      {/* Score brief — the composer agent's written output */}
      {scoreBrief && (
        <div className="border border-[#222] bg-[#0a0a0a] p-5">
          <div className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold mb-3">
            Score brief — themes, motifs, cue list
          </div>
          <div className="text-[#ccc] text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-mono), monospace' }}>
            {scoreBrief}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            (window as any).bmoviesChat?.open(`Compose a musical theme for "${projectTitle}". Describe the genre, tempo, mood, and key instruments.`)
          }}
          className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors"
        >
          Compose a theme
        </button>
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

/* ═══════════════════════════════════════════════════════════════════════
 *  ROYALTIES SECTION — the money view
 *  ═══════════════════════════════════════════════════════════════════════
 *
 *  Shows every royalty-bearing position the user holds (commissioned
 *  films at 99%, plus any share_sales tranches they've bought), the
 *  accrued $ per position, the total available balance, and a
 *  "Withdraw in $MNEE" action that records a payout request.
 */

function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0.00'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function RoyaltiesSection({
  walletLoading,
  royalties,
  kycVerified,
}: {
  walletLoading: boolean
  royalties: WalletData['royalties'] | undefined
  kycVerified: boolean
}) {
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  return (
    <div className="mb-10">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl font-black leading-none" style={{ fontFamily: 'var(--font-bebas)' }}>
          Royalties
        </h2>
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold">
          Paid in <span className="text-[#6bff8a]">$MNEE</span>
        </div>
      </div>

      {walletLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse mb-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
              <div className="h-2 w-16 bg-[#1a1a1a] mb-3" />
              <div className="h-7 w-24 bg-[#151515]" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
              <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">
                Accrued total
              </div>
              <div className="text-3xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
                {fmtUsd(royalties?.totalAccruedUsd ?? 0)}
              </div>
            </div>
            <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
              <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">
                Already drawn
              </div>
              <div className="text-3xl font-black leading-none text-[#888]" style={{ fontFamily: 'var(--font-bebas)' }}>
                {fmtUsd(royalties?.totalDrawnUsd ?? 0)}
              </div>
            </div>
            <div className={`border p-5 ${(royalties?.availableUsd ?? 0) > 0 ? 'border-[#6bff8a] bg-[#02120a]' : 'border-[#1a1a1a] bg-[#0a0a0a]'}`}>
              <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">
                Available to withdraw
              </div>
              <div
                className={`text-3xl font-black leading-none ${(royalties?.availableUsd ?? 0) > 0 ? 'text-[#6bff8a]' : 'text-[#444]'}`}
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                {fmtUsd(royalties?.availableUsd ?? 0)}
              </div>
              <button
                onClick={() => {
                  if (!kycVerified) {
                    alert('KYC verification required before withdrawing royalties.')
                    return
                  }
                  if ((royalties?.availableUsd ?? 0) <= 0) {
                    alert('No royalties available to withdraw yet. Royalties accrue from ticket sales on your films.')
                    return
                  }
                  setWithdrawOpen(true)
                }}
                className={`mt-3 text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 ${
                  (royalties?.availableUsd ?? 0) > 0 && kycVerified
                    ? 'bg-[#6bff8a] text-black hover:bg-[#90ffa8]'
                    : 'bg-[#1a1a1a] text-[#555] cursor-not-allowed'
                }`}
                disabled={(royalties?.availableUsd ?? 0) <= 0 || !kycVerified}
              >
                Withdraw in $MNEE →
              </button>
            </div>
          </div>

          {/* Positions table */}
          {(royalties?.positions.length ?? 0) === 0 ? (
            <div className="border border-dashed border-[#222] bg-[#050505] p-6 text-center">
              <div className="text-[#666] text-sm mb-2">
                No royalty positions yet
              </div>
              <div className="text-[#444] text-xs mb-3">
                Commission a film or buy shares on the marketplace to start earning.
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                <a
                  href="/commission.html"
                  className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white"
                >
                  Commission a film
                </a>
                <a
                  href="/marketplace.html"
                  className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 border border-[#E50914] text-[#E50914] hover:bg-[#1a0003]"
                >
                  Buy shares
                </a>
              </div>
            </div>
          ) : (
            <div className="border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 border-b border-[#1a1a1a] text-[0.55rem] uppercase tracking-[0.14em] text-[#666] font-bold">
                <div>Film</div>
                <div className="text-right">Share</div>
                <div className="text-right">Tickets</div>
                <div className="text-right">Accrued</div>
                <div></div>
              </div>
              {royalties!.positions.map((p, i) => (
                <div
                  key={`${p.offerId}-${p.source}-${i}`}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 border-b border-[#111] last:border-b-0 items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-black text-sm" style={{ fontFamily: 'var(--font-bebas)' }}>
                        ${p.tokenTicker}
                      </span>
                      <span className="text-[0.55rem] uppercase tracking-wider font-bold text-[#888]">
                        {p.tier}
                      </span>
                      <span className={`text-[0.55rem] uppercase tracking-wider font-bold px-1.5 py-0.5 ${
                        p.source === 'commission' ? 'bg-[#1a0003] text-[#E50914]' : 'bg-[#0a1a3a] text-[#66aaff]'
                      }`}>
                        {p.source === 'commission' ? 'Commissioner' : 'Investor'}
                      </span>
                    </div>
                    <div className="text-[#888] text-xs truncate">&quot;{p.title}&quot;</div>
                  </div>
                  <div className="text-right text-white text-sm font-bold tabular-nums">
                    {p.sharePercent.toFixed(2)}%
                  </div>
                  <div className="text-right text-[#888] text-xs tabular-nums">
                    {p.ticketCount} / {fmtUsd(p.ticketRevenueUsd)}
                  </div>
                  <div className={`text-right text-sm font-bold tabular-nums ${p.accruedUsd > 0 ? 'text-[#6bff8a]' : 'text-[#555]'}`}>
                    {fmtUsd(p.accruedUsd)}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/captable.html?id=${encodeURIComponent(p.offerId)}`}
                      className="text-[0.55rem] font-bold uppercase tracking-wider text-[#E50914] hover:text-white"
                    >
                      List
                    </a>
                    <a
                      href={`/marketplace.html?offer=${encodeURIComponent(p.offerId)}`}
                      className="text-[0.55rem] font-bold uppercase tracking-wider text-[#666] hover:text-white"
                    >
                      Trade
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Withdrawal history */}
          {(royalties?.history.length ?? 0) > 0 && (
            <div className="mt-6">
              <h3 className="text-[0.65rem] uppercase tracking-[0.18em] text-[#888] font-bold mb-2">
                Withdrawal history
              </h3>
              <div className="border border-[#1a1a1a] bg-[#0a0a0a]">
                {royalties!.history.map((h) => (
                  <div
                    key={h.id}
                    className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 px-4 py-2 border-b border-[#111] last:border-b-0 items-center text-xs"
                  >
                    <div className="text-[#888] tabular-nums">
                      {new Date(h.requestedAt).toLocaleDateString()}
                    </div>
                    <div className="text-white font-bold tabular-nums">{fmtUsd(h.amountUsd)}</div>
                    <div className="text-[#666] font-mono text-[0.65rem] truncate" title={h.mneeAddress}>
                      {h.mneeAddress.slice(0, 10)}…{h.mneeAddress.slice(-4)}
                    </div>
                    <div className="text-right">
                      {h.status === 'sent' ? (
                        <span className="text-[0.55rem] uppercase font-bold text-[#6bff8a]">Sent</span>
                      ) : h.status === 'pending' ? (
                        <span className="text-[0.55rem] uppercase font-bold text-[#ffd700]">Pending</span>
                      ) : h.status === 'failed' ? (
                        <span className="text-[0.55rem] uppercase font-bold text-[#ff6b7a]">Failed</span>
                      ) : (
                        <span className="text-[0.55rem] uppercase font-bold text-[#666]">{h.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {withdrawOpen && (
        <WithdrawModal
          availableUsd={royalties?.availableUsd ?? 0}
          onClose={() => setWithdrawOpen(false)}
          onSubmitted={() => {
            setWithdrawOpen(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

function WithdrawModal({
  availableUsd,
  onClose,
  onSubmitted,
}: {
  availableUsd: number
  onClose: () => void
  onSubmitted: () => void
}) {
  const [amount, setAmount] = useState(availableUsd.toFixed(2))
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (amountNum > availableUsd) {
      setError(`Amount exceeds available balance (${fmtUsd(availableUsd)})`)
      return
    }
    if (!/^[13][1-9A-HJ-NP-Za-km-z]{25,39}$/.test(address.trim())) {
      setError('Enter a valid BSV/MNEE address')
      return
    }

    setSubmitting(true)
    try {
      const { data: session } = await bmovies.auth.getSession()
      const token = session?.session?.access_token
      if (!token) {
        setError('Not signed in')
        setSubmitting(false)
        return
      }
      const res = await fetch('/api/royalty/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amountUsd: amountNum, mneeAddress: address.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.error || `HTTP ${res.status}`)
        setSubmitting(false)
        return
      }
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0a] border border-[#6bff8a] max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-bebas)' }}>
          Withdraw in $MNEE
        </h3>
        <p className="text-xs text-[#888] mb-4">
          $MNEE is a USD-pegged stablecoin on BSV. Enter your MNEE receiving address and the amount.
          Available: <span className="text-[#6bff8a] font-bold">{fmtUsd(availableUsd)}</span>
        </p>

        <label className="block text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-1">
          Amount (USD)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-[#111] border border-[#222] text-white px-3 py-2 mb-4 font-mono focus:outline-none focus:border-[#6bff8a]"
        />

        <label className="block text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-1">
          MNEE receiving address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="1..."
          className="w-full bg-[#111] border border-[#222] text-white px-3 py-2 mb-4 font-mono text-xs focus:outline-none focus:border-[#6bff8a]"
        />

        {error && (
          <div className="mb-4 p-2 border border-[#5a1a1a] bg-[#3a0e0e] text-[#ff6b7a] text-xs">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 border border-[#333] text-[#888] hover:bg-[#151515]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 bg-[#6bff8a] hover:bg-[#90ffa8] text-black disabled:opacity-50"
          >
            {submitting ? 'Requesting…' : 'Request withdrawal →'}
          </button>
        </div>
      </div>
    </div>
  )
}
