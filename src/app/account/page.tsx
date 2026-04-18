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
  const pKey = (film.title || '').toLowerCase().replace(/[!?.]+$/, '').trim()
  const mapHit = POSTER_MAP[pKey] || POSTER_MAP[(film.title || '').toLowerCase()]
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
  parent_offer_id: string | null
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

  // ─── Scroll reset on project/tab navigation ───
  //
  // Navigation between account levels (studio list → project → tool)
  // happens through router.push with `scroll: false` — that keeps us
  // from jumpy scroll-resets during same-tab state updates (poster
  // thumbnails settling in, crew cards animating, etc.). But when the
  // URL actually shifts to a different LEVEL of the hierarchy
  // (projectId or tab/tool changing), the user has effectively
  // navigated to a new page and expects to land at the top with the
  // navbar visible. Scrolling only on those transitions gives us both
  // behaviours without a flash.
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [projectId, tab, tool, section])

  // ─── Normalize project URL to root (pitch) ───
  //
  // The trailer / short / feature are FACETS of the root pitch, not
  // projects of their own. We want the workbench — and every tool view
  // inside it — to treat the whole lineage as a single project keyed
  // by the pitch id. If the URL points at a descendant (e.g. from an
  // older commission-banner redirect), walk up parent_offer_id until
  // we hit null and replace the URL. Everything below this point reads
  // `projectId` = root pitch id.
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    async function walkToRoot() {
      let cursor: string | null = projectId
      let root: string | null = null
      for (let i = 0; i < 4 && cursor; i++) {
        const { data }: { data: { parent_offer_id: string | null } | null } = await bmovies
          .from('bct_offers')
          .select('parent_offer_id')
          .eq('id', cursor)
          .maybeSingle()
        if (!data) break
        if (!data.parent_offer_id) { root = cursor; break }
        cursor = data.parent_offer_id
      }
      if (cancelled || !root || root === projectId) return
      const params = new URLSearchParams(window.location.search)
      params.set('project', root)
      router.replace(`/account?${params.toString()}`, { scroll: false })
    }
    walkToRoot()
    return () => { cancelled = true }
  }, [projectId, router])

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
             commissioner_percent, account_id, created_at, parent_offer_id,
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
          // Collapse tier lineages to the ROOT (pitch) offer.
          // A pitch that's been upgraded to a trailer is one project;
          // the trailer is a facet of that pitch, not a separate film.
          // The pitch owns the token + the project identity; each
          // descendant tier adds a deliverable (trailer cut, short cut,
          // feature cut) with its own publish state. TierLadder on the
          // overview page exposes per-tier state; Publish tab offers
          // per-tier publish. Here we just hide non-root rows.
          const all = (data as unknown as Film[]) || []
          const roots = all.filter((f) => !f.parent_offer_id)
          setFilms(roots)
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
    if (['script', 'storyboard', 'editor', 'titles', 'score', 'preview', 'publish'].includes(tool)) {
      return (
        <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-8">
          <ToolView
            tool={tool}
            projectId={projectId}
            projectTitle={activeFilm?.title || 'Untitled'}
            projectTier={activeFilm?.tier}
          />
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
  if (section === 'pitch') {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-12">
        <PitchView user={user} />
      </div>
    )
  }

  // Default: Studio view
  //
  // The commissioned=1 URL flag means the user just came back from a
  // successful pitch/trailer/short/feature Stripe checkout. Show a
  // prominent success banner instead of letting them bounce onto the
  // generic studio page wondering what happened. Title / ticker / tier
  // are threaded through by /api/checkout's success_url params.
  const commissionedFlag = searchParams.get('commissioned') === '1'
  const commissionedTitle = searchParams.get('title') || ''
  const commissionedTier = (searchParams.get('tier') || 'pitch').toLowerCase()
  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-12">
      {commissionedFlag && (
        <div className="mb-6 border border-[#1a5a1a] bg-[#0c1f0c] p-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#6bff8a] font-bold mb-1">
              ✓ {commissionedTier} commissioned
            </div>
            <div className="text-white text-sm leading-relaxed">
              {commissionedTitle ? (
                <>
                  <strong>{decodeURIComponent(commissionedTitle).replace(/^Title:\s*/i, '')}</strong>{' '}
                  is in production. The swarm is running through ~15 deliverables — you can
                  watch live on the project&apos;s Room tab as each agent lands its artifact.
                </>
              ) : (
                <>Your commission is in production. Open it below to watch the swarm work.</>
              )}
            </div>
            <div className="text-[#6bff8a] text-[0.65rem] font-mono mt-2">
              No studio required — pitches are hosted under a default founding studio
              until you spin up your own ($0.99, below).
            </div>
          </div>
        </div>
      )}
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

      {/* "Your commission is in flight" banner — rendered only when
          the URL has ?commissioned=1, which is how film.html's
          direct-to-Stripe Make-tier flow (api/checkout.ts successPath)
          brings the user back after payment. Auto-dismisses when a
          matching new offer appears in the films list, and falls back
          to a 90-second timeout if the webhook is slow. */}
      <CommissionInFlightBanner films={films} />

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

/* ─── Commission-in-flight banner ─────────────────────────────────────
 *
 * Bridge UI for the direct-to-Stripe "Make TIER" flow on film.html.
 * Stripe redirects to /account?tab=studio&commissioned=1&title=…&tier=…
 * after payment. The webhook then takes a few seconds to write the
 * new bct_offers row. This banner fills that gap so the user sees a
 * visible "yes, we got your commission, it's on the way" signal
 * instead of landing on /account with no evidence anything happened.
 *
 * Dismiss rules:
 *   1. When an offer with a matching title appears in `films`
 *      (webhook landed, the Pipeline bucket below now shows it).
 *   2. After 90 seconds regardless — belt-and-braces if the webhook
 *      is degraded or the title match fails (titles get processed
 *      by the webhook so casing/whitespace could drift).
 *   3. When the user clicks the dismiss ×.
 *
 * Lives inside the client component so it participates in the normal
 * React render loop; no need for a separate toast library.
 */
function CommissionInFlightBanner({ films }: { films: Film[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const commissioned = searchParams.get('commissioned')
  const title = searchParams.get('title') || ''
  const tier  = searchParams.get('tier')  || ''
  const projectParent = searchParams.get('project') || ''
  const [dismissed, setDismissed] = useState(false)
  const [childId, setChildId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)

  // Five-stage progress narrative for the wait. Each stage is pegged
  // to an elapsed-time boundary so the animation feels deterministic
  // even though the actual pipeline is running on its own schedule.
  const phases = [
    { at:  0, label: 'Stripe payment received' },
    { at:  5, label: 'Agent swarm booting' },
    { at: 15, label: 'Writer drafting treatment' },
    { at: 35, label: 'Director locking visual style' },
    { at: 55, label: 'Storyboard + poster ready — first clips rendering' },
  ]

  useEffect(() => {
    if (dismissed || commissioned !== '1') return
    const id = window.setInterval(() => {
      setElapsed((s) => {
        const next = s + 1
        let idx = 0
        for (let i = 0; i < phases.length; i++) if (next >= phases[i].at) idx = i
        setPhaseIdx(idx)
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [dismissed, commissioned])
  // phases is a module-scoped const so excluding it from deps is safe

  // Auto-detect the new child offer. Once it exists, either auto-redirect
  // to /production.html?id=<child> (live animated timeline — the exact
  // experience the user asked for) or let them click through to it.
  //
  // Two modes depending on how the user got here:
  //
  //   (A) Upgrade from a project overview — URL has project=<parent>.
  //       Poll bct_offers for a row with parent_offer_id=<project> AND
  //       tier=<tier>. When found, surface the live-production CTA.
  //       Title match is unsafe here because upgrades inherit the
  //       parent title and would false-positive immediately.
  //
  //   (B) Fresh pitch / non-project commission — match by title against
  //       films[] loaded for this account.
  //
  // Both modes hard-cap at 5 minutes so a degraded webhook doesn't
  // leave the modal pulsing forever.
  useEffect(() => {
    if (dismissed || commissioned !== '1') return
    let cancelled = false

    async function pollForChild() {
      const t0 = Date.now()
      while (!cancelled && Date.now() - t0 < 5 * 60_000) {
        const { data } = await bmovies
          .from('bct_offers')
          .select('id')
          .eq('parent_offer_id', projectParent)
          .eq('tier', tier)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        if (data?.id) {
          setChildId(data.id)
          // Auto-redirect to the live production timeline so the user
          // can watch the swarm build their trailer in real time.
          // The page auto-refreshes every 5s; poster → storyboard →
          // clips populate as they land in bct_artifacts. 3-second
          // pause gives the modal a "Production started" beat so the
          // user registers what happened before the redirect.
          await new Promise((r) => setTimeout(r, 3000))
          if (cancelled) return
          window.location.href = `/production.html?id=${encodeURIComponent(data.id)}`
          return
        }
        await new Promise((r) => setTimeout(r, 4000))
      }
      if (!cancelled) {
        setDismissed(true)
        router.replace(`/account?project=${encodeURIComponent(projectParent)}&tab=overview`, { scroll: false })
      }
    }

    if (projectParent && tier) {
      pollForChild()
      return () => { cancelled = true }
    }

    // Fallback mode (B): match by title.
    const decoded = decodeURIComponent(title).toLowerCase().trim()
    const matched = films.some(
      (f) => (f.title || '').toLowerCase().trim() === decoded,
    )
    if (matched) {
      setDismissed(true)
      router.replace('/account?tab=studio', { scroll: false })
      return
    }
    const id = window.setTimeout(() => {
      setDismissed(true)
      router.replace('/account?tab=studio', { scroll: false })
    }, 90_000)
    return () => { cancelled = true; window.clearTimeout(id) }
  }, [dismissed, commissioned, title, tier, projectParent, films, router])

  if (commissioned !== '1' || dismissed) return null

  const decodedTitle = decodeURIComponent(title).replace(/^Title:\s*/i, '')
  const decodedTier = (decodeURIComponent(tier) || 'film').toLowerCase()
  const mm = Math.floor(elapsed / 60)
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${decodedTier} in production`}
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-2xl mx-4 my-12 border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0a0a] p-8"
        style={{ boxShadow: '0 0 60px rgba(229,9,20,0.25)' }}
      >
        <button
          type="button"
          onClick={() => {
            setDismissed(true)
            const target = projectParent
              ? `/account?project=${encodeURIComponent(projectParent)}&tab=overview`
              : '/account?tab=studio'
            router.replace(target, { scroll: false })
          }}
          className="absolute top-3 right-3 text-[#666] hover:text-white text-lg px-2 py-1 leading-none"
          aria-label="Dismiss and return to workbench"
        >
          ×
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-[#E50914]"
            style={{ animation: 'bm-pulse 1s ease-in-out infinite' }}
          />
          <span className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#E50914]">
            {childId ? 'Production started' : `Commissioning your ${decodedTier}…`}
          </span>
        </div>
        <h2
          className="text-4xl font-black text-white leading-none mb-1 mt-2"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          {decodedTitle || 'Your film'}
        </h2>
        <div className="text-[#888] text-sm mb-6">
          {decodedTier.charAt(0).toUpperCase() + decodedTier.slice(1)}
          {' · '}
          <span className="font-mono text-[#E50914]">{mm}:{ss}</span>
        </div>

        {/* Animated pipeline phases */}
        <div className="space-y-2 mb-6">
          {phases.map((p, i) => {
            const done = i < phaseIdx
            const active = i === phaseIdx
            return (
              <div
                key={p.at}
                className="flex items-center gap-3 text-sm"
                style={{ opacity: done ? 0.6 : active ? 1 : 0.3 }}
              >
                <span
                  className="inline-block w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    background: done ? '#6bff8a' : active ? '#E50914' : '#2a2a2a',
                    animation: active ? 'bm-pulse 1.2s ease-in-out infinite' : 'none',
                  }}
                />
                <span className={done ? 'text-[#6bff8a]' : active ? 'text-white font-bold' : 'text-[#666]'}>
                  {p.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Primary CTA + exploration links */}
        {childId ? (
          <a
            href={`/production.html?id=${encodeURIComponent(childId)}`}
            className="block w-full text-center px-5 py-3 bg-[#E50914] hover:bg-[#b00610] text-white text-sm font-black uppercase tracking-wider mb-4"
          >
            ▶ Watch production live (redirecting…)
          </a>
        ) : (
          <div className="border border-dashed border-[#333] bg-[#050505] p-4 mb-4">
            <div className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold mb-2">
              What&apos;s happening right now
            </div>
            <p className="text-[#aaa] text-xs leading-relaxed">
              Your Stripe payment is confirmed. The agent swarm is booting —
              writer, director, storyboard, cinematographer, composer,
              editor — and they&apos;ll spend the next 60-90 seconds producing
              the treatment, style bible, storyboard frames, poster, and
              four 8-second video clips that become your {decodedTier}.
              <br /><br />
              We&apos;ll drop you into the live production timeline as soon
              as the first artifact lands. You can close this tab — it all
              keeps running on the server.
            </p>
          </div>
        )}

        <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-2">
          While you wait
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {projectParent && (
            <a
              href={`/account?project=${encodeURIComponent(projectParent)}&tab=overview`}
              className="block px-3 py-2.5 border border-[#333] bg-[#0a0a0a] hover:border-[#E50914] text-[#bbb] hover:text-white text-xs"
            >
              <div className="text-[0.55rem] uppercase tracking-wider text-[#666] mb-0.5">Your project</div>
              <div className="font-bold">Back to overview</div>
            </a>
          )}
          {projectParent && (
            <a
              href={`/account?project=${encodeURIComponent(projectParent)}&tab=captable`}
              className="block px-3 py-2.5 border border-[#333] bg-[#0a0a0a] hover:border-[#E50914] text-[#bbb] hover:text-white text-xs"
            >
              <div className="text-[0.55rem] uppercase tracking-wider text-[#666] mb-0.5">Ownership</div>
              <div className="font-bold">Cap table &amp; shares</div>
            </a>
          )}
          <a
            href="/account?tab=studio"
            className="block px-3 py-2.5 border border-[#333] bg-[#0a0a0a] hover:border-[#E50914] text-[#bbb] hover:text-white text-xs"
          >
            <div className="text-[0.55rem] uppercase tracking-wider text-[#666] mb-0.5">Workbench</div>
            <div className="font-bold">All your films</div>
          </a>
          <a
            href="/watch.html"
            target="_blank"
            rel="noopener"
            className="block px-3 py-2.5 border border-[#333] bg-[#0a0a0a] hover:border-[#E50914] text-[#bbb] hover:text-white text-xs"
          >
            <div className="text-[0.55rem] uppercase tracking-wider text-[#666] mb-0.5">Explore</div>
            <div className="font-bold">Browse the cinema</div>
          </a>
        </div>

        <style jsx>{`
          @keyframes bm-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.35; transform: scale(1.4); }
          }
        `}</style>
      </div>
    </div>
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
            href="/account?section=pitch"
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

  // ─── Workbench groups ──────────────────────────────────────
  //
  // Every film lives in exactly one bucket based on bct_offers.status.
  // Drafts are the commissioner's private workbench — token already
  // minted, but nothing on the exchange, not yet on /watch. Pipeline
  // is everything actively generating. Live is "published" or
  // released tokens visible to the audience. Archived is a safety
  // net for anything explicitly withdrawn.
  const workbench = films.filter((f) => f.status === 'draft' || f.status === 'open')
  const pipeline  = films.filter((f) => f.status === 'funded' || f.status === 'in_progress' || f.status === 'producing')
  const live      = films.filter((f) => f.status === 'released' || f.status === 'published' || f.status === 'auto_published')
  const archived  = films.filter((f) => f.status === 'archived')

  return (
    <div className="space-y-10">
      <div className="text-[#888] text-xs">
        {films.length} film{films.length === 1 ? '' : 's'} ·{' '}
        <span className="text-[#f7c14b]">{workbench.length} in workbench</span> ·{' '}
        <span className="text-[#aa66ff]">{pipeline.length} in pipeline</span> ·{' '}
        <span className="text-[#6bff8a]">{live.length} live</span>
        {archived.length > 0 && <> · <span className="text-[#555]">{archived.length} archived</span></>}
      </div>

      <WorkbenchGroup
        title="Workbench"
        subtitle="Drafts — tokens minted but not yet listed on the exchange or published. Ready for you to set a price and ship."
        accent="#f7c14b"
        films={workbench}
        emptyMsg="No drafts. Commission a new pitch to start a workbench item."
      />

      <WorkbenchGroup
        title="In pipeline"
        subtitle="The swarm is actively generating. Drafts appear once the pipeline completes."
        accent="#aa66ff"
        films={pipeline}
        emptyMsg="Nothing in production right now."
      />

      <WorkbenchGroup
        title="Live"
        subtitle="Published films — the audience can buy tickets, the shares are publicly tradable."
        accent="#6bff8a"
        films={live}
        emptyMsg="No films live yet. Publish a draft to move it here."
      />

      {archived.length > 0 && (
        <WorkbenchGroup
          title="Archived"
          subtitle="Withdrawn offers. Preserved for record-keeping; not shown on the public site."
          accent="#555"
          films={archived}
          emptyMsg=""
        />
      )}
    </div>
  )
}

/* ─── Workbench group: one section per status bucket ─── */

function WorkbenchGroup({
  title, subtitle, accent, films, emptyMsg,
}: {
  title: string
  subtitle: string
  accent: string
  films: Film[]
  emptyMsg: string
}) {
  const router = useRouter()

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div
            className="text-[0.55rem] uppercase tracking-[0.2em] font-bold mb-1"
            style={{ color: accent }}
          >
            {title} · {films.length}
          </div>
          <div className="text-[#888] text-xs max-w-2xl">{subtitle}</div>
        </div>
      </div>

      {films.length === 0 ? (
        emptyMsg ? (
          <div className="border border-dashed border-[#222] bg-[#050505] p-4 text-[#555] text-xs">
            {emptyMsg}
          </div>
        ) : null
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {films.map((f) => {
            const posterUrl = resolvePosterUrl(f)
            const onChain = f.token_mint_txid && /^[0-9a-f]{64}$/.test(f.token_mint_txid)
            const isDraft = f.status === 'draft' || f.status === 'open'
            const isLive  = f.status === 'released' || f.status === 'published' || f.status === 'auto_published'
            return (
              <div
                key={f.id}
                className="border bg-[#0a0a0a] hover:border-[#E50914] transition-colors cursor-pointer"
                style={{ borderColor: '#222' }}
                onClick={() => router.push(`/account?project=${f.id}&tab=overview`, { scroll: false })}
              >
                {posterUrl ? (
                  <div className="aspect-[2/3] bg-[#050505] overflow-hidden relative">
                    <img src={posterUrl} alt={f.title} className="w-full h-full object-cover" />
                    <div
                      className="absolute top-2 right-2 text-[0.5rem] uppercase tracking-wider font-bold px-1.5 py-0.5 text-black"
                      style={{ background: accent }}
                    >
                      {title.split(' ')[0]}
                    </div>
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
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#E50914] text-white hover:bg-[#b00610] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/account?project=${f.id}&tab=overview`, { scroll: false })
                      }}
                    >
                      Open
                    </button>
                    {isDraft && (
                      // Drafts get a dedicated quick-path to the publish
                      // tool so users don't have to drill through the
                      // tool menu to ship a token.
                      <button
                        className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 border border-[#f7c14b] text-[#f7c14b] hover:bg-[#f7c14b] hover:text-black transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/account?project=${f.id}&tool=publish`, { scroll: false })
                        }}
                      >
                        Publish →
                      </button>
                    )}
                    {isLive && (
                      <a
                        className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 border border-[#6bff8a] text-[#6bff8a] hover:bg-[#6bff8a] hover:text-black transition-colors"
                        href={`/film.html?id=${encodeURIComponent(f.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noopener"
                      >
                        On /watch ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
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
 *  PITCH VIEW — account-level "new pitch" surface
 *
 *  In-account analogue of /commission.html. Same two-step flow
 *  (optional Refine with AI → 4 tier Make buttons → /api/checkout →
 *  Stripe → /account?commissioned=1), but lives on /account?section=pitch
 *  so the user never leaves their dashboard to commission a film.
 *
 *  APIs:
 *    POST /api/refine    { idea }  → { title, ticker, synopsis }
 *    POST /api/checkout  { title, ticker, synopsis, tier, email,
 *                          supabaseUserId, successPath } → { url }
 *
 *  No KYC gate here — commission = no KYC by design. KYC is enforced
 *  server-side on api/feature/publish + api/feature/list-shares.
 * ═══════════════════════════════════════════════════════════════════════ */

interface RefinedIdea {
  title: string
  ticker: string
  synopsis: string
}

const TIER_COPY: Record<string, { label: string; price: string; blurb: string }> = {
  pitch:   { label: 'Pitch',   price: '$0.99', blurb: 'One-line logline · poster · 1B royalty token. Mints on BSV.' },
  trailer: { label: 'Trailer', price: '$9.99', blurb: '~32s AI video · storyboard · treatment · refreshed poster · score.' },
  short:   { label: 'Short',   price: '$99',   blurb: '~5 min short film · full crew pass · draft in your workbench.' },
  feature: { label: 'Feature', price: '$999',  blurb: '~50 min feature · full crew pass · draft in your workbench.' },
}

function PitchView({ user }: { user: User }) {
  const [idea, setIdea] = useState('')
  const [tone, setTone] = useState('')
  const [refined, setRefined] = useState<RefinedIdea | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ kind: 'info' | 'error' | 'success'; msg: string } | null>(null)

  async function handleRefine() {
    const raw = idea.trim()
    if (raw.length < 8) {
      setStatus({ kind: 'error', msg: 'Write at least a sentence first.' })
      return
    }
    const body = tone ? `Tone: ${tone}.\n\n${raw}` : raw
    setBusy(true)
    setStatus({ kind: 'info', msg: 'Refining your idea with AI…' })
    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: body }),
      })
      if (!res.ok) {
        let detail = String(res.status)
        try {
          const j = await res.json()
          if (j?.error) detail = j.error
        } catch {}
        throw new Error(detail)
      }
      const json = await res.json()
      setRefined({ title: json.title, ticker: json.ticker, synopsis: json.synopsis })
      setStatus({ kind: 'success', msg: 'Refined. Click any Make button to commission.' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus({ kind: 'error', msg: 'Refine failed: ' + msg })
    } finally {
      setBusy(false)
    }
  }

  async function handleCommission(tier: 'pitch' | 'trailer' | 'short' | 'feature') {
    let r = refined
    if (!r) {
      const raw = idea.trim()
      if (raw.length < 8) {
        setStatus({ kind: 'error', msg: 'Write at least a sentence first — then click Refine or any Make button.' })
        return
      }
      const firstBreak = raw.search(/[\n.!?]/)
      const firstLine = (firstBreak > 0 ? raw.slice(0, firstBreak) : raw).trim()
      const derivedTitle = firstLine.slice(0, 80) || 'Untitled'
      const derivedTicker = (derivedTitle.match(/[A-Z][a-z]*/g)?.join('') || derivedTitle)
        .replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6) || 'FILM'
      r = { title: derivedTitle, ticker: derivedTicker, synopsis: raw }
      setRefined(r)
    }
    setBusy(true)
    setStatus({ kind: 'info', msg: 'Redirecting to checkout…' })
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: r.title,
          ticker: r.ticker,
          synopsis: r.synopsis,
          tier,
          email: user.email ?? undefined,
          supabaseUserId: user.id,
          successPath: '/account?commissioned=1',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'checkout failed')
      }
      const { url } = await res.json()
      if (!url) throw new Error('No checkout URL returned')
      window.location.href = url
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus({ kind: 'error', msg: 'Checkout failed: ' + msg })
      setBusy(false)
    }
  }

  return (
    <>
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <h1
          className="text-5xl font-black leading-none"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '-0.01em' }}
        >
          Pitch a new <span className="text-[#E50914]">film</span>
        </h1>
        <p className="text-[#888] text-sm mt-2 max-w-2xl">
          Start at $0.99 — the swarm produces a one-page treatment, a poster,
          and mints a royalty-share token on BSV. Upgrade later to a trailer,
          short or feature from your workbench.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* ─── Left column: idea + refine ─── */}
        <div className="border border-[#222] bg-[#0a0a0a] p-6">
          <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[#888] mb-2">
            Your idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="A blind cartographer in 2089, when GPS has died, maps cities by sound — and a defecting AI hires her to guide it across a continent that no longer exists on paper…"
            rows={10}
            className="w-full bg-[#050505] border border-[#222] text-white text-sm leading-relaxed p-4 focus:outline-none focus:border-[#E50914] transition-colors resize-y"
            disabled={busy}
          />

          <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[#888] mt-4 mb-2">
            Tone <span className="text-[#555] normal-case tracking-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="e.g. noir thriller, heartfelt comedy, slow-burn sci-fi"
            className="w-full bg-[#050505] border border-[#222] text-white text-sm p-3 focus:outline-none focus:border-[#E50914] transition-colors"
            disabled={busy}
          />

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleRefine}
              disabled={busy}
              className="px-5 py-2.5 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Refine with AI
            </button>
            <span className="text-[#555] text-xs">or skip straight to a Make button →</span>
          </div>

          {refined && (
            <div className="mt-6 border border-[#1a1a1a] bg-black p-5">
              <div className="text-[0.6rem] font-bold uppercase tracking-widest text-[#888] mb-2">Preview</div>
              <div
                className="text-2xl font-black leading-tight mb-1"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                {refined.title}
              </div>
              <div className="text-[#E50914] text-sm font-mono mb-3">${refined.ticker}</div>
              <p className="text-[#bbb] text-sm leading-relaxed">{refined.synopsis}</p>
            </div>
          )}

          {status && (
            <div
              className={`mt-5 text-sm ${
                status.kind === 'error' ? 'text-[#ff6b7a]' :
                status.kind === 'success' ? 'text-[#6bff8a]' :
                'text-[#888]'
              }`}
            >
              {status.msg}
            </div>
          )}
        </div>

        {/* ─── Right column: tier buttons ─── */}
        <div className="border border-[#222] bg-[#0a0a0a] p-6">
          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[#888] mb-4">
            Commission tier
          </div>
          <div className="flex flex-col gap-3">
            {(['pitch', 'trailer', 'short', 'feature'] as const).map((tier, i) => {
              const t = TIER_COPY[tier]
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => handleCommission(tier)}
                  disabled={busy}
                  className={`text-left p-4 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    i === 0
                      ? 'border-[#E50914] bg-[#E50914] hover:bg-[#b00610] text-white'
                      : 'border-[#222] bg-[#050505] hover:border-[#E50914] text-white'
                  }`}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span
                      className="text-xl font-black uppercase"
                      style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.04em' }}
                    >
                      {t.label}
                    </span>
                    <span className="text-sm font-mono font-bold">{t.price}</span>
                  </div>
                  <div className={`text-xs leading-snug ${i === 0 ? 'text-white/85' : 'text-[#888]'}`}>
                    {t.blurb}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-[0.65rem] text-[#555] mt-4 leading-relaxed">
            No KYC to commission. Token mints at minute 1. KYC only gates the
            later Publish + List-shares actions on your workbench.
          </p>
        </div>
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
  // load it directly from Supabase. `fetching` tracks only the async
  // fetch; the render-time `directLoading` derives from that + film.
  // Deriving avoids a setState-in-effect flash when `film` arrives
  // after the direct fetch already set loading=false.
  const [directFilm, setDirectFilm] = useState<Film | null>(null)
  const [fetching, setFetching] = useState(!film)

  useEffect(() => {
    if (film) return
    let cancelled = false
    async function load() {
      setFetching(true)
      const { data } = await bmovies
        .from('bct_offers')
        .select(
          `id, title, synopsis, tier, status, token_ticker, token_mint_txid,
           commissioner_percent, account_id, created_at, parent_offer_id,
           bct_artifacts ( id, kind, role, url, step_id, superseded_by )`,
        )
        .eq('id', projectId)
        .maybeSingle()
      if (!cancelled) {
        setDirectFilm(data as Film | null)
        setFetching(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId, film])

  const currentFilm = film || directFilm
  const directLoading = !film && fetching

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
      return <ProjectCapTableView film={currentFilm} viewerAccountId={accountId} />

    case 'crew':
      return <ProjectCrewView projectId={projectId} accountId={accountId} />
    case 'cast':
      return <ProjectCastView projectId={projectId} accountId={accountId} />
    case 'documents':
      return <ProjectDocumentsView film={currentFilm} />
    case 'deck':
      return <ProjectDeckView film={currentFilm} />
    case 'room':
      return <ProjectRoomView film={currentFilm} />
    case 'voiceover':
      return <ProjectVoView film={currentFilm} />
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
        {/* Poster — sized bigger on desktop (384px / 24rem) so the
            one-sheet art reads properly; keep the old 16rem on mobile
            so the info column still has room on small screens. */}
        <div className="shrink-0">
          {posterUrl ? (
            <div className="w-64 md:w-96 border border-[#222] bg-[#050505] overflow-hidden">
              <img src={posterUrl} alt={film.title} className="w-full" />
            </div>
          ) : (
            <div className="w-64 md:w-96 aspect-[2/3] bg-gradient-to-br from-[#1a0003] to-[#0a0000] border border-[#222] flex items-center justify-center">
              <div
                className="text-[#666] text-5xl md:text-7xl font-black"
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

          {/* Deep metrics strip — loads async from share_sales, ticket_sales,
              and royalty_withdrawals. Renders below the poster so the hero
              block isn't blocked on the fetch. */}
          <ProjectMetricsStrip film={film} />

          {/* ── Tier ladder — upgrade inside the project ────────
              Shows the four tiers as a progression (pitch → trailer →
              short → feature). Tiers that already exist as derivatives
              link out to their own overview; tiers that don't yet exist
              become "Make · $X" buttons that go straight to Stripe and
              return here with ?commissioned=1. Mirrors the film.html
              tier-row but lives inside the workbench so the user can
              upgrade without leaving the project. */}
          <TierLadder film={film} />

          {/* ── Primary action ──────────────────────────────────
              One decision that matters at the current state.
              Draft → Publish [tier]. Anything else → nothing here
              (all the views go in the navigation row below). */}
          {currentStatus === 'draft' && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="text-[0.65rem] font-bold uppercase tracking-wider px-5 py-2.5 bg-[#0e3a0e] border border-[#2a6a2a] text-[#6bff8a] hover:bg-[#1a4a1a] transition-colors disabled:opacity-40"
              >
                {publishing
                  ? 'Publishing...'
                  : film.tier === 'pitch' ? 'Publish Pitch'
                  : film.tier === 'trailer' ? 'Publish Trailer'
                  : film.tier === 'short' ? 'Publish Short'
                  : 'Publish Film'}
              </button>
            </div>
          )}

          {/* ── Views & deep links ──────────────────────────────
              All the places you can go from here. One row, one
              visual weight, ordered by relevance. 'Watch' is the
              primary read path for trailer+ tiers (video plays);
              on a pitch the equivalent page is the Film page
              (poster + logline), so we relabel in place rather
              than offering both. */}
          <div className="flex flex-wrap gap-2">
            <a
              href={`/film.html?id=${encodeURIComponent(film.id)}`}
              className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#E50914] text-white hover:bg-[#b00610] transition-colors"
            >
              {film.tier === 'pitch' ? 'Film page' : 'Watch'}
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

/* ─── Tier ladder — in-project Make-tier upgrade UI ─── */

const TIER_ORDER = ['pitch', 'trailer', 'short', 'feature'] as const
type Tier = (typeof TIER_ORDER)[number]

const TIER_PRICE_DISPLAY: Record<Tier, string> = {
  pitch:   '$0.99',
  trailer: '$9.99',
  short:   '$99',
  feature: '$999',
}

interface LineageOffer { id: string; tier: string; title: string; token_ticker: string | null; status?: string }

function TierLadder({ film }: { film: Film }) {
  const [lineage, setLineage] = useState<Partial<Record<Tier, LineageOffer>>>({})
  const [loading, setLoading] = useState(true)
  const [pendingTier, setPendingTier] = useState<Tier | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadLineage() {
      const chain: LineageOffer[] = []
      let cursorId: string | null = film.id
      while (cursorId) {
        const { data }: { data: (LineageOffer & { parent_offer_id: string | null }) | null } = await bmovies
          .from('bct_offers')
          .select('id, tier, title, token_ticker, status, parent_offer_id')
          .eq('id', cursorId)
          .maybeSingle()
        if (!data) break
        chain.unshift({ id: data.id, tier: data.tier, title: data.title, token_ticker: data.token_ticker, status: data.status })
        cursorId = data.parent_offer_id
      }
      if (chain.length === 0) return {}

      // Walk DOWN from the root, looking for one derivative at each
      // next tier. Linear by construction (a pitch has at most one
      // trailer; a trailer has at most one short; etc.).
      const found: Partial<Record<Tier, LineageOffer>> = {}
      for (const o of chain) {
        if ((TIER_ORDER as readonly string[]).includes(o.tier)) {
          found[o.tier as Tier] = o
        }
      }
      const leaf = chain[chain.length - 1]
      let parentId: string = leaf.id
      let parentTier = leaf.tier as Tier
      while (true) {
        const nextIdx = TIER_ORDER.indexOf(parentTier) + 1
        if (nextIdx <= 0 || nextIdx >= TIER_ORDER.length) break
        const nextTier = TIER_ORDER[nextIdx]
        // A pitch can have multiple trailer children when the user
        // has commissioned alt trailers from the Alt tab. Filter to
        // the canonical (non-alt) child. If none is canonical — e.g.
        // user has only made alts so far — break and leave the tier
        // unfilled in the ladder.
        const { data: children } = await bmovies
          .from('bct_offers')
          .select('id, tier, title, token_ticker, status, pipeline_state')
          .eq('parent_offer_id', parentId)
          .eq('tier', nextTier)
        const canonical = (children as Array<LineageOffer & { pipeline_state?: { is_alt?: boolean } }> | null)
          ?.find((c) => !c.pipeline_state?.is_alt)
        if (!canonical) break
        found[nextTier] = canonical
        parentId = canonical.id
        parentTier = nextTier
      }
      return found
    }

    async function run() {
      setLoading(true)
      try {
        const initial = await loadLineage()
        if (!cancelled) { setLineage(initial); setLoading(false) }

        // Poll every 5s for 5 minutes so the ladder updates live when
        // an upgrade-webhook fires on this page. Cheap — bounded, 1-4
        // tiny queries per tick. Stops as soon as the page unmounts.
        const t0 = Date.now()
        while (!cancelled && Date.now() - t0 < 5 * 60_000) {
          await new Promise((r) => setTimeout(r, 5000))
          if (cancelled) break
          const fresh = await loadLineage()
          if (cancelled) break
          const grew = Object.keys(fresh).length > Object.keys(initial).length
          setLineage(fresh)
          if (grew) break
        }
      } catch (error) {
        if (!cancelled) console.warn('[tier-ladder] load failed:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [film.id])

  // Parent for upgrade = the last existing tier. The Make-button fires
  // /api/checkout with parentOfferId=leaf and tier=next. Stripe's
  // success redirect lands on this same overview with ?commissioned=1.
  const leafTier: Tier | null = (() => {
    let last: Tier | null = null
    for (const t of TIER_ORDER) if (lineage[t]) last = t
    return last
  })()
  const leaf = leafTier ? lineage[leafTier] : null

  async function makeTier(target: Tier) {
    if (!leaf) return
    setPendingTier(target)
    setErr(null)
    try {
      const { data: s } = await bmovies.auth.getSession()
      const session = s?.session
      if (!session) throw new Error('Sign in required')
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: target,
          title: leaf.title,
          ticker: leaf.token_ticker || '',
          synopsis: film.synopsis || '',
          parentOfferId: leaf.id,
          email: session.user?.email,
          supabaseUserId: session.user?.id,
          successPath: `/account?project=${encodeURIComponent(film.id)}&tab=overview&commissioned=1`,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `checkout failed (${res.status})`)
      if (!body.url) throw new Error('Stripe URL missing')
      window.location.href = body.url
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setErr(msg)
      setPendingTier(null)
    }
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-2">
          Tier progression
        </div>
        <div className="flex gap-2 animate-pulse">
          {TIER_ORDER.map((t) => (
            <div key={t} className="flex-1 h-14 bg-[#0a0a0a] border border-[#1a1a1a]" />
          ))}
        </div>
      </div>
    )
  }

  const currentIdx = leafTier ? TIER_ORDER.indexOf(leafTier) : -1

  return (
    <div className="mb-6">
      <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-2">
        Tier progression
      </div>
      <div className="flex flex-wrap gap-2">
        {TIER_ORDER.map((t, idx) => {
          const existing = lineage[t]
          const isCurrent = existing && existing.id === film.id
          const isNextUpgrade = !existing && idx === currentIdx + 1
          const label = t.charAt(0).toUpperCase() + t.slice(1)
          const price = TIER_PRICE_DISPLAY[t]
          const pending = pendingTier === t

          if (existing) {
            // Per-tier publish state. Pitch is usually already
            // published (auto-publishes after its revision window).
            // Trailers / shorts / features default to 'released' and
            // require an explicit publish from the user.
            const s = existing.status || ''
            const isPublished = s === 'published' || s === 'auto_published'
            const isGenerating = s === 'funded' || s === 'in_progress' || s === 'producing' || s === 'queued'
            const isDraft = !isPublished && !isGenerating
            const stateLabel = isPublished ? 'Published'
              : isGenerating ? 'Producing…'
              : 'Draft'
            const stateColor = isPublished ? '#6bff8a'
              : isGenerating ? '#E50914'
              : '#ffb347'
            const borderColor = isCurrent
              ? '#E50914'
              : isPublished ? '#2a6a2a'
              : '#3a3a1a'
            const bgColor = isCurrent
              ? '#1a0003'
              : isPublished ? '#0a1a0a'
              : '#15120a'

            // Click action:
            //   - Pitch tile (current) is non-clickable (you're already here)
            //   - Descendant with video → preview tool
            //   - Anything else → overview (pitch stays on overview)
            const clickable = !isCurrent
            const inner = (
              <>
                <div className="text-[0.55rem] uppercase tracking-wider font-bold mb-0.5" style={{ color: stateColor }}>
                  {stateLabel}
                </div>
                <div
                  className="text-base font-black text-white leading-none"
                  style={{ fontFamily: 'var(--font-bebas)' }}
                >
                  {label}
                </div>
              </>
            )
            const cls = `flex-1 min-w-[7rem] border px-3 py-2.5 text-center transition-colors`
            const style = { borderColor, background: bgColor }
            if (!clickable) {
              return <div key={t} className={cls} style={style}>{inner}</div>
            }
            return (
              <a
                key={t}
                href={`/account?project=${encodeURIComponent(film.id)}&tool=preview&tierFocus=${t}`}
                className={`${cls} hover:border-[#6bff8a]`}
                style={style}
              >
                {inner}
              </a>
            )
          }

          if (isNextUpgrade) {
            return (
              <button
                key={t}
                disabled={pending}
                onClick={() => makeTier(t)}
                className="flex-1 min-w-[7rem] border border-[#E50914] bg-[#E50914] text-white px-3 py-2.5 text-center hover:bg-[#b00610] transition-colors disabled:opacity-50"
              >
                <div className="text-[0.55rem] uppercase tracking-wider font-bold mb-0.5">
                  {pending ? 'Redirecting…' : `Make · ${price}`}
                </div>
                <div
                  className="text-base font-black leading-none"
                  style={{ fontFamily: 'var(--font-bebas)' }}
                >
                  {label}
                </div>
              </button>
            )
          }

          // Locked: a later tier that requires the intermediate one
          // first. Show it faded with the price so the user can see
          // where the ladder leads but can't skip ahead.
          return (
            <div
              key={t}
              className="flex-1 min-w-[7rem] border border-[#1a1a1a] bg-[#050505] px-3 py-2.5 text-center opacity-50"
              title="Commission the previous tier first"
            >
              <div className="text-[0.55rem] uppercase tracking-wider text-[#555] font-bold mb-0.5">
                Locked · {price}
              </div>
              <div
                className="text-base font-black text-[#666] leading-none"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                {label}
              </div>
            </div>
          )
        })}
      </div>
      {err && (
        <div className="text-[#ff6b7a] text-[0.65rem] mt-2">
          Upgrade failed: {err}
        </div>
      )}
    </div>
  )
}

/* ─── Overview metrics strip — the "dashboard" row ─── */

// Tier → cost to commission. Kept in one place so the brochure and the
// account page can't drift on pricing.
const TIER_COST_USD: Record<string, number> = {
  pitch:   0.99,
  trailer: 9.99,
  short:   99,
  feature: 999,
}

interface ProjectMetrics {
  loading: boolean
  cost: number              // what the commissioner paid
  raised: number            // sum of share_sales.price_usd
  investors: number         // distinct buyers in share_sales
  ticketCount: number
  salesRevenue: number      // sum of ticket_sales.price_usd
  royaltiesEarned: number   // commissioner's share of ticket revenue
  royaltiesPaid: number     // from bct_royalty_withdrawals (status=sent)
  royaltiesPending: number  // from bct_royalty_withdrawals (status=pending)
  currentPricePerPct: number | null  // USD per 1% share, from latest sale
  athPricePerPct: number | null      // max USD per 1% share across all sales
}

function ProjectMetricsStrip({ film }: { film: Film }) {
  const [m, setM] = useState<ProjectMetrics>({
    loading: true,
    cost: 0, raised: 0, investors: 0,
    ticketCount: 0, salesRevenue: 0,
    royaltiesEarned: 0, royaltiesPaid: 0, royaltiesPending: 0,
    currentPricePerPct: null, athPricePerPct: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [salesRes, tixRes, wdRes] = await Promise.all([
          bmovies
            .from('bct_share_sales')
            .select('buyer_account, percent_bought, price_usd, created_at')
            .eq('offer_id', film.id)
            .order('created_at', { ascending: false }),
          bmovies
            .from('bct_ticket_sales')
            .select('price_usd')
            .eq('offer_id', film.id),
          bmovies
            .from('bct_royalty_withdrawals')
            .select('amount_usd, status')
            .eq('offer_id', film.id),
        ])
        if (cancelled) return

        const sales = (salesRes.data || []) as {
          buyer_account: string | null
          percent_bought: number
          price_usd: number
          created_at: string
        }[]
        const tix = (tixRes.data || []) as { price_usd: number }[]
        const wds = (wdRes.data || []) as { amount_usd: number; status: string }[]

        const raised = sales.reduce((s, r) => s + Number(r.price_usd ?? 0), 0)
        const investors = new Set(sales.map((r) => r.buyer_account).filter(Boolean)).size
        const salesRevenue = tix.reduce((s, t) => s + Number(t.price_usd ?? 0), 0)
        const royaltiesEarned = salesRevenue * (Number(film.commissioner_percent ?? 99) / 100)
        const royaltiesPaid = wds.filter((w) => w.status === 'sent').reduce((s, w) => s + Number(w.amount_usd ?? 0), 0)
        const royaltiesPending = wds.filter((w) => w.status === 'pending').reduce((s, w) => s + Number(w.amount_usd ?? 0), 0)

        // Price per 1% share. sales[] is already sorted DESC by created_at.
        // Defend against zero/bad data by filtering.
        const perPctPrices = sales
          .map((r) => {
            const pct = Number(r.percent_bought ?? 0)
            const usd = Number(r.price_usd ?? 0)
            return pct > 0 ? usd / pct : null
          })
          .filter((v): v is number => v !== null && Number.isFinite(v) && v > 0)

        const currentPricePerPct = perPctPrices[0] ?? null
        const athPricePerPct = perPctPrices.length > 0 ? Math.max(...perPctPrices) : null

        setM({
          loading: false,
          cost: TIER_COST_USD[film.tier] ?? 0,
          raised,
          investors,
          ticketCount: tix.length,
          salesRevenue,
          royaltiesEarned,
          royaltiesPaid,
          royaltiesPending,
          currentPricePerPct,
          athPricePerPct,
        })
      } catch (err) {
        console.warn('[overview-metrics] load error:', err)
        if (!cancelled) setM((prev) => ({ ...prev, loading: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [film.id, film.tier, film.commissioner_percent])

  const fmtUsd = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtPrice = (n: number | null) => n === null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ATH delta vs current, if both exist.
  const athDelta = m.currentPricePerPct !== null && m.athPricePerPct !== null && m.athPricePerPct > 0
    ? ((m.currentPricePerPct - m.athPricePerPct) / m.athPricePerPct) * 100
    : null

  return (
    <div className="mb-6 max-w-3xl">
      <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">
        Dashboard
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard
          label="Commission cost"
          value={fmtUsd(m.cost)}
          sub={`${film.tier} tier`}
          loading={m.loading}
        />
        <MetricCard
          label="Amount raised"
          value={fmtUsd(m.raised)}
          sub={`from ${m.investors} investor${m.investors === 1 ? '' : 's'}`}
          loading={m.loading}
          accent={m.raised > 0 ? 'blue' : undefined}
        />
        <MetricCard
          label="Sales revenue"
          value={fmtUsd(m.salesRevenue)}
          sub={`${m.ticketCount} ticket${m.ticketCount === 1 ? '' : 's'}`}
          loading={m.loading}
          accent={m.salesRevenue > 0 ? 'green' : undefined}
        />
        <MetricCard
          label="Royalties earned"
          value={fmtUsd(m.royaltiesEarned)}
          sub={m.royaltiesPaid > 0 || m.royaltiesPending > 0
            ? `${fmtUsd(m.royaltiesPaid)} paid · ${fmtUsd(m.royaltiesPending)} pending`
            : 'accrues from ticket sales'
          }
          loading={m.loading}
          accent={m.royaltiesEarned > 0 ? 'green' : undefined}
        />
        <MetricCard
          label="Tickets sold"
          value={m.ticketCount.toLocaleString()}
          sub={`@ $2.99 per watch`}
          loading={m.loading}
        />
        <MetricCard
          label="Investors"
          value={m.investors.toLocaleString()}
          sub={m.investors > 0 ? `avg ${fmtUsd(m.raised / m.investors)} each` : 'no investor sales'}
          loading={m.loading}
          accent={m.investors > 0 ? 'blue' : undefined}
        />
        <MetricCard
          label="Current price"
          value={fmtPrice(m.currentPricePerPct)}
          sub="per 1% share"
          loading={m.loading}
        />
        <MetricCard
          label="All-time high"
          value={fmtPrice(m.athPricePerPct)}
          sub={athDelta === null ? 'per 1% share' : `${athDelta >= 0 ? '+' : ''}${athDelta.toFixed(1)}% vs now`}
          loading={m.loading}
          accent={m.athPricePerPct && m.athPricePerPct > 0 ? 'green' : undefined}
        />
      </div>
    </div>
  )
}

function MetricCard({
  label, value, sub, loading, accent,
}: {
  label: string
  value: string
  sub?: string
  loading: boolean
  accent?: 'red' | 'green' | 'blue'
}) {
  const accentColor =
    accent === 'green' ? '#6bff8a' :
    accent === 'blue' ? '#66aaff' :
    accent === 'red' ? '#E50914' :
    '#fff'
  return (
    <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-3">
      <div className="text-[0.5rem] uppercase tracking-[0.14em] text-[#666] font-bold mb-1.5">
        {label}
      </div>
      {loading ? (
        <div className="h-6 w-20 bg-[#1a1a1a] animate-pulse" />
      ) : (
        <div
          className="text-xl font-black leading-none tabular-nums"
          style={{ fontFamily: 'var(--font-bebas)', color: accentColor }}
        >
          {value}
        </div>
      )}
      {sub && !loading && (
        <div className="text-[0.55rem] text-[#555] mt-1 truncate" title={sub}>
          {sub}
        </div>
      )}
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

type ShareListingRow = {
  id: number
  shares_offered: number
  price_per_share_cents: number
  total_price_cents: number
  status: string
  seller_account_id: string | null
  created_at: string
}

// 1% of the 1B-token supply.
const SHARES_PER_PERCENT_CAPTABLE = 10_000_000
const MIN_LISTING_SHARES = 100_000 // 0.01%

function ProjectCapTableView({ film, viewerAccountId }: { film: Film; viewerAccountId: string | null }) {
  const [shareSales, setShareSales] = useState<ShareSaleRow[]>([])
  const [listings, setListings] = useState<ShareListingRow[]>([])
  const [ticketCount, setTicketCount] = useState(0)
  const [ticketRevUsd, setTicketRevUsd] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [salesRes, tixRes, listRes] = await Promise.all([
          bmovies
            .from('bct_share_sales')
            .select('id, tranche, percent_bought, price_usd, created_at, buyer_email, payment_txid')
            .eq('offer_id', film.id)
            .order('created_at', { ascending: false }),
          bmovies
            .from('bct_ticket_sales')
            .select('price_usd')
            .eq('offer_id', film.id),
          bmovies
            .from('bct_share_listings')
            .select('id, shares_offered, price_per_share_cents, total_price_cents, status, seller_account_id, created_at')
            .eq('offer_id', film.id)
            .order('created_at', { ascending: false }),
        ])
        if (cancelled) return
        const sales = (salesRes.data || []) as ShareSaleRow[]
        setShareSales(sales)
        const tix = (tixRes.data || []) as { price_usd: number }[]
        setTicketCount(tix.length)
        setTicketRevUsd(tix.reduce((s, t) => s + Number(t.price_usd ?? 0), 0))
        setListings((listRes.data || []) as ShareListingRow[])
      } catch (err) {
        console.warn('[captable] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [film.id, reloadTick])

  const commissionerPct = Number(film.commissioner_percent ?? 99)
  const soldPct = shareSales.reduce((s, r) => s + Number(r.percent_bought ?? 0), 0)
  const openListings = listings.filter((l) => l.status === 'open')
  const listedOpenPct = openListings.reduce(
    (s, l) => s + (Number(l.shares_offered) / 1_000_000_000) * 100,
    0,
  )
  // "Held" = commissioner's float that is neither sold nor currently
  // listed. This is what the commissioner can still list at will.
  // Guard against negative if historical data inconsistent.
  const heldPct = Math.max(0, commissionerPct - soldPct - listedOpenPct)
  const platformPct = Math.max(0, 100 - commissionerPct)
  const onChain = film.token_mint_txid && /^[0-9a-f]{64}$/.test(film.token_mint_txid)

  // The viewer can manage listings only if they are the project's
  // commissioner. `film.account_id` is set when the commission was
  // created by a signed-in user; if it's null (older offers) we
  // fall back to allowing any signed-in user to try — the API is
  // the real gate.
  const isCommissioner = !!viewerAccountId && (!film.account_id || film.account_id === viewerAccountId)

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

      {/* Ownership summary — five slots so the commissioner can see
          held-vs-listed at a glance. "Held" is the float they could
          list next; "Listed" is the float currently exposed for sale
          but not yet bought; "Investors" is what's already sold. */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Held</div>
          <div className="text-2xl font-black leading-none text-[#E50914]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {heldPct.toFixed(2)}%
          </div>
          <div className="text-[0.6rem] text-[#555] mt-1">Commissioner float, unlisted</div>
        </div>
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Listed (for sale)</div>
          <div className="text-2xl font-black leading-none text-[#ffc766]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {listedOpenPct.toFixed(2)}%
          </div>
          <div className="text-[0.6rem] text-[#555] mt-1">
            {openListings.length} open listing{openListings.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Investors (sold)</div>
          <div className="text-2xl font-black leading-none text-[#66aaff]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {soldPct.toFixed(2)}%
          </div>
          <div className="text-[0.6rem] text-[#555] mt-1">
            {shareSales.length} purchase{shareSales.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Platform</div>
          <div className="text-2xl font-black leading-none text-[#888]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {platformPct.toFixed(2)}%
          </div>
          <div className="text-[0.6rem] text-[#555] mt-1">Studio / infra fee</div>
        </div>
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">Supply</div>
          <div className="text-2xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            1B
          </div>
          <div className="text-[0.6rem] text-[#555] mt-1">BSV-21 · 1,000,000,000</div>
        </div>
      </div>

      {/* Stacked ownership bar (visual summary of the numbers above) */}
      <div className="mb-6">
        <div className="flex h-2 w-full overflow-hidden border border-[#1a1a1a] bg-[#0a0a0a]">
          {heldPct > 0 && (
            <div className="h-full bg-[#E50914]" style={{ width: `${heldPct}%` }} title={`Held: ${heldPct.toFixed(2)}%`} />
          )}
          {listedOpenPct > 0 && (
            <div className="h-full bg-[#ffc766]" style={{ width: `${listedOpenPct}%` }} title={`Listed: ${listedOpenPct.toFixed(2)}%`} />
          )}
          {soldPct > 0 && (
            <div className="h-full bg-[#66aaff]" style={{ width: `${soldPct}%` }} title={`Sold: ${soldPct.toFixed(2)}%`} />
          )}
          {platformPct > 0 && (
            <div className="h-full bg-[#666]" style={{ width: `${platformPct}%` }} title={`Platform: ${platformPct.toFixed(2)}%`} />
          )}
        </div>
        <div className="flex justify-between mt-1 text-[0.55rem] uppercase tracking-wider text-[#555]">
          <span>0%</span><span>50%</span><span>100%</span>
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

      {/* Exchange tools — only for the commissioner */}
      {isCommissioner && (
        <CapTableExchangeTools
          film={film}
          heldPct={heldPct}
          openListings={openListings}
          viewerAccountId={viewerAccountId}
          onChange={() => setReloadTick((t) => t + 1)}
        />
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

/**
 * Commissioner-only exchange tools inside the cap-table tab.
 *
 * Two actions wired directly to /api/feature/list-shares:
 *   - List a new tranche (create) — peels a % off the Held bucket,
 *     publishes it to the exchange at the chosen total price.
 *   - Cancel an open listing (cancel) — pulls unsold shares back
 *     off the exchange, returning them to the Held bucket.
 *
 * A real BSV-21 token transfer for the sold shares is settled by a
 * downstream worker; the UI operates at the ledger level (listings
 * rows) which is what drives the exchange surfaces.
 */
function CapTableExchangeTools({
  film, heldPct, openListings, viewerAccountId, onChange,
}: {
  film: Film
  heldPct: number
  openListings: ShareListingRow[]
  viewerAccountId: string | null
  onChange: () => void
}) {
  // Sensible defaults based on what's Held. If the commissioner has
  // 90% still held, listing 10% is unobtrusive. If they've already
  // been aggressive, cap at the remaining float. Minimum listing is
  // 0.01% (100K shares) per the API.
  const defaultPct = Math.max(0.01, Math.min(10, Number(heldPct.toFixed(2))))
  const defaultTotalUsd = film.tier === 'feature' ? 9999
    : film.tier === 'short' ? 999
    : film.tier === 'trailer' ? 99
    : 9.99

  const [percent, setPercent] = useState<number>(defaultPct)
  const [totalUsd, setTotalUsd] = useState<number>(defaultTotalUsd)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  const sharesOffered = Math.floor(percent * SHARES_PER_PERCENT_CAPTABLE)
  const pricePerShareCents = sharesOffered > 0 ? (totalUsd * 100) / sharesOffered : 0
  const sharesValid = sharesOffered >= MIN_LISTING_SHARES && percent <= heldPct + 0.005
  const priceValid = pricePerShareCents > 0 && pricePerShareCents <= 100_000

  async function submitListing() {
    setErr(null); setOk(null)
    if (!sharesValid) {
      setErr(`Amount must be at least 0.01% and no more than ${heldPct.toFixed(2)}% (your held float).`)
      return
    }
    if (!priceValid) {
      setErr('Price per share out of range — ceiling is $1,000/share.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/feature/list-shares?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: film.id,
          sharesOffered,
          pricePerShareCents: Math.round(pricePerShareCents * 100) / 100,
          accountId: viewerAccountId,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || `HTTP ${res.status}`)
      setOk(`Listed ${percent.toFixed(2)}% at $${(pricePerShareCents / 100).toFixed(6)}/share · $${totalUsd.toFixed(2)} total.`)
      onChange()
    } catch (e) {
      setErr((e as Error).message || 'Failed to list.')
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelListing(id: number) {
    setErr(null); setOk(null); setCancellingId(id)
    try {
      const res = await fetch('/api/feature/list-shares?action=cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: id, accountId: viewerAccountId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || `HTTP ${res.status}`)
      setOk(`Listing #${id} cancelled — shares returned to your held float.`)
      onChange()
    } catch (e) {
      setErr((e as Error).message || 'Failed to cancel.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
            Exchange tools · commissioner
          </div>
          <h3 className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            List shares for sale
          </h3>
          <p className="text-[0.7rem] text-[#888] mt-1">
            Peel a tranche off your {heldPct.toFixed(2)}% held float and expose it on the
            public exchange. Cancel anytime before a buyer takes it.
          </p>
        </div>
      </div>

      {/* List-new form */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <label className="block">
          <span className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold block mb-1">
            Percent to list
          </span>
          <input
            type="number"
            min={0.01}
            max={heldPct}
            step={0.01}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value) || 0)}
            className="w-full bg-black border border-[#1a1a1a] px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#E50914]"
          />
          <div className="text-[0.55rem] text-[#555] mt-1 tabular-nums">
            {sharesOffered.toLocaleString()} shares · max {heldPct.toFixed(2)}%
          </div>
        </label>
        <label className="block">
          <span className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold block mb-1">
            Total price (USD)
          </span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={totalUsd}
            onChange={(e) => setTotalUsd(Number(e.target.value) || 0)}
            className="w-full bg-black border border-[#1a1a1a] px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#E50914]"
          />
          <div className="text-[0.55rem] text-[#555] mt-1 tabular-nums">
            ${(pricePerShareCents / 100).toFixed(6)}/share
          </div>
        </label>
        <button
          type="button"
          onClick={submitListing}
          disabled={submitting || !sharesValid || !priceValid}
          className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] disabled:bg-[#333] disabled:text-[#666] text-white text-xs font-bold uppercase tracking-wider whitespace-nowrap"
        >
          {submitting ? 'Listing…' : 'List on exchange'}
        </button>
      </div>

      {err && <div className="mt-3 text-xs text-[#ff6b6b]">{err}</div>}
      {ok && <div className="mt-3 text-xs text-[#6bff8a]">{ok}</div>}

      {/* Open listings with cancel buttons */}
      {openListings.length > 0 && (
        <div className="mt-5">
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2">
            Your open listings ({openListings.length})
          </div>
          <div className="border border-[#1a1a1a] bg-black">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 py-2 border-b border-[#1a1a1a] text-[0.55rem] uppercase tracking-[0.14em] text-[#666] font-bold">
              <div>Listing</div>
              <div>Size</div>
              <div className="text-right">Per share</div>
              <div className="text-right">Total ask</div>
              <div className="text-right">Action</div>
            </div>
            {openListings.map((l) => {
              const pct = (Number(l.shares_offered) / 1_000_000_000) * 100
              const perShare = Number(l.price_per_share_cents) / 100
              const total = Number(l.total_price_cents) / 100
              return (
                <div key={l.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 py-2 border-b border-[#111] last:border-b-0 items-center text-xs">
                  <div className="text-[#888] tabular-nums">#{l.id}</div>
                  <div className="text-white tabular-nums">
                    {pct.toFixed(4)}% <span className="text-[#555]">· {Number(l.shares_offered).toLocaleString()} shares</span>
                  </div>
                  <div className="text-right text-white font-mono tabular-nums">
                    ${perShare.toFixed(6)}
                  </div>
                  <div className="text-right text-[#6bff8a] font-bold tabular-nums">
                    ${total.toFixed(2)}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => cancelListing(l.id)}
                      disabled={cancellingId === l.id}
                      className="px-2 py-1 border border-[#333] hover:border-[#E50914] hover:text-[#E50914] disabled:border-[#222] disabled:text-[#444] text-[#888] text-[0.55rem] font-bold uppercase tracking-wider"
                    >
                      {cancellingId === l.id ? 'Cancelling…' : 'Pull off market'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Roles that belong to "Crew" (production side) vs "Cast" (performers).
const CREW_ROLES = [
  'writer', 'director', 'cinematographer', 'editor', 'composer',
  'storyboard', 'sound_designer', 'producer', 'production_designer',
  'publicist', 'casting_director', 'financier',
]
const CAST_ROLES = ['voice_actor']

function ProjectCrewView(props: { projectId: string; accountId: string | null }) {
  return (
    <AgentRosterView
      {...props}
      kind="crew"
      title="Project crew"
      blurb="The agents who actually make the film. Those who contributed to this project are highlighted in red. Click any card to open the agent's profile page."
      roles={CREW_ROLES}
      emptyExampleMsg="No crew hired yet. Generate a writer or director to get started."
    />
  )
}

function ProjectCastView({ projectId, accountId }: { projectId: string; accountId: string | null }) {
  // The Cast tab used to show ONLY hired platform agents (voice actors
  // etc.). That disagreed with the Documents tab, which shows the
  // dramatis personae — the characters in the film itself, sourced
  // from the pitch/casting pipeline's cast_list + char_portrait_<n>
  // artifacts. Fix: same source of truth here as Documents.
  //
  // Top section  — Characters in the film (always, when present)
  // Bottom section — Performers hired on the platform (existing behaviour)
  return (
    <div className="space-y-10">
      <CastCharactersPanel projectId={projectId} />
      <AgentRosterView
        projectId={projectId}
        accountId={accountId}
        kind="cast"
        title="Performers hired"
        blurb="Platform agents attached to this film as voice actors. Each performer is a separate bMovies agent that gets its own royalty token post-submission."
        roles={CAST_ROLES}
        emptyExampleMsg="No performers hired yet. Generate a voice actor to bring these characters to life."
      />
    </div>
  )
}

/**
 * Renders the dramatis personae for an offer — characters + portraits
 * sourced from the same artifacts the Documents tab collapses into a
 * Cast pack. Two pipelines produce these:
 *
 *   pitch.cast_list       JSON array [{ name, role, visual_prompt }]
 *   pitch.char_portrait_N image artifacts, one per character
 *   casting.cast_list     plain-text fallback (feature tier): one
 *                         paragraph per character with NAME / ROLE /
 *                         ARCHETYPE / AGE / DESCRIPTION / VOICE NOTE.
 *
 * If no cast_list exists yet we render a calm empty state so the
 * user understands the pipeline hasn't produced this artifact rather
 * than silently hiding the panel.
 */
function CastCharactersPanel({ projectId }: { projectId: string }) {
  type CharRow = {
    name: string
    role?: string | null
    description?: string | null
    voice?: string | null
    portraitUrl?: string | null
    visualPrompt?: string | null
  }
  const [characters, setCharacters] = useState<CharRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      // Fetch every artifact the Cast pack depends on in one round-trip.
      const { data } = await bmovies
        .from('bct_artifacts')
        .select('id, kind, role, step_id, url, created_at')
        .eq('offer_id', projectId)
        .is('superseded_by', null)
        .or(
          [
            'step_id.eq.pitch.cast_list',
            'step_id.eq.casting.cast_list',
            'step_id.like.pitch.char_portrait_%',
          ].join(','),
        )
        .order('step_id', { ascending: true })

      if (cancelled) return
      const rows = (data || []) as Array<{
        kind: string
        step_id: string | null
        url: string
        created_at: string | null
      }>

      // ── Portraits ─────────────────────────────────────────────
      // step_id=pitch.char_portrait_<n>, dedupe by URL, sort by
      // numeric suffix so index 0→2 arrive in order.
      const portraits = rows
        .filter((r) => r.kind === 'image' && (r.step_id || '').startsWith('pitch.char_portrait_'))
      const seen = new Set<string>()
      const portraitsDeduped: string[] = []
      for (const p of portraits
        .slice()
        .sort((a, b) => {
          const ai = Number((a.step_id || '').match(/_(\d+)$/)?.[1] ?? 0)
          const bi = Number((b.step_id || '').match(/_(\d+)$/)?.[1] ?? 0)
          return ai - bi
        })) {
        if (seen.has(p.url)) continue
        seen.add(p.url)
        portraitsDeduped.push(p.url)
      }

      // ── Cast list text ────────────────────────────────────────
      const pitchList = rows.find((r) => r.step_id === 'pitch.cast_list')
      const castingList = rows.find((r) => r.step_id === 'casting.cast_list')
      const listRow = pitchList ?? castingList
      let chars: CharRow[] = []

      if (listRow) {
        let text = ''
        if (listRow.url.startsWith('data:')) {
          text = decodeDataUrl(listRow.url) || ''
        } else {
          try {
            const r = await fetch(listRow.url)
            if (r.ok) text = await r.text()
          } catch {
            text = ''
          }
        }
        chars = parseCastList(text)
      }

      // ── Merge portraits in by index ───────────────────────────
      for (let i = 0; i < chars.length; i++) {
        if (portraitsDeduped[i]) chars[i].portraitUrl = portraitsDeduped[i]
      }

      // If we have portraits but no cast list, render placeholders
      // so the user at least sees that portraits were produced.
      if (chars.length === 0 && portraitsDeduped.length > 0) {
        chars = portraitsDeduped.map((u, i) => ({
          name: `Character ${i + 1}`,
          portraitUrl: u,
        }))
      }

      setCharacters(chars)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [projectId])

  return (
    <div>
      <div className="mb-4">
        <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
          Dramatis personae
        </div>
        <h2
          className="text-3xl font-black leading-none text-white"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Characters <span className="text-[#E50914]">in the film</span>
        </h2>
        <p className="text-[#888] text-sm max-w-xl mt-2">
          The cast written into the story — names, archetypes, and visual
          direction that the casting director agent has developed from your
          pitch. Portraits are the casting director&apos;s first-pass visual
          ID for each role; swap them during production if the director sees
          a different face.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
              <div className="aspect-[3/4] bg-[#111] mb-3" />
              <div className="h-4 w-28 bg-[#1a1a1a] mb-2" />
              <div className="h-3 w-40 bg-[#151515]" />
            </div>
          ))}
        </div>
      ) : !characters || characters.length === 0 ? (
        <div className="border border-dashed border-[#222] bg-[#050505] p-6 text-center">
          <div className="text-[#888] text-sm">
            The casting director hasn&apos;t produced a cast list for this
            project yet. Once the pipeline writes <code className="text-[#ccc] font-mono text-xs">pitch.cast_list</code> or{' '}
            <code className="text-[#ccc] font-mono text-xs">casting.cast_list</code>, the characters will appear here.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {characters.map((c, i) => (
            <div key={i} className="border border-[#222] bg-[#0a0a0a] overflow-hidden">
              <div className="aspect-[3/4] bg-[#050505] relative">
                {c.portraitUrl ? (
                  <img src={c.portraitUrl} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#444]">
                    <span
                      className="text-4xl"
                      style={{ fontFamily: 'var(--font-bebas)' }}
                    >
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                {c.role && (
                  <div className="absolute top-2 left-2 text-[0.5rem] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#E50914] text-white">
                    {c.role}
                  </div>
                )}
              </div>
              <div className="p-4">
                <div
                  className="text-xl font-black leading-tight text-white"
                  style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.02em' }}
                >
                  {c.name}
                </div>
                {c.description && (
                  <p className="text-[#aaa] text-sm leading-snug mt-1.5">
                    {c.description}
                  </p>
                )}
                {c.voice && (
                  <p className="text-[#666] text-xs leading-snug mt-2 italic">
                    Voice — {c.voice}
                  </p>
                )}
                {c.visualPrompt && !c.description && (
                  <p className="text-[#666] text-xs font-mono leading-snug mt-1.5 whitespace-pre-wrap">
                    {c.visualPrompt}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Parse a cast_list artifact's text body. Handles both shapes:
 *   1. JSON array of { name, role, visual_prompt } — from pitch.cast_list
 *   2. Plain-text "NAME: Foo\nROLE: Lead\n..." paragraphs — from
 *      casting.cast_list (feature tier)
 * Returns [] on unrecognised input rather than throwing; the caller
 * renders an empty state.
 */
function parseCastList(text: string): Array<{
  name: string
  role?: string | null
  description?: string | null
  voice?: string | null
  visualPrompt?: string | null
}> {
  const trimmed = text.trim()
  if (!trimmed) return []

  // Try JSON first (pitch.cast_list is always JSON)
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      return arr.map((c) => {
        const entry = (c || {}) as Record<string, unknown>
        return {
          name: String(entry.name || entry.character || 'Unnamed'),
          role: typeof entry.role === 'string' ? entry.role : null,
          description:
            typeof entry.description === 'string'
              ? entry.description
              : null,
          voice:
            typeof entry.voice === 'string'
              ? entry.voice
              : typeof entry.voice_note === 'string'
                ? entry.voice_note
                : null,
          visualPrompt:
            typeof entry.visual_prompt === 'string'
              ? entry.visual_prompt
              : null,
        }
      })
    } catch {
      // fall through to text parser
    }
  }

  // Paragraph-separated plain text from the casting director prompt
  // ("NAME: …\nROLE: …\nARCHETYPE: …\nAGE: …\nDESCRIPTION: …\nVOICE NOTE: …")
  const blocks = trimmed.split(/\n{2,}/).filter((b) => b.trim().length > 0)
  return blocks.map((block) => {
    const fields: Record<string, string> = {}
    for (const line of block.split(/\n/)) {
      const m = line.match(/^\s*([A-Z][A-Z\s]+):\s*(.+)$/)
      if (m) fields[m[1].trim().toLowerCase()] = m[2].trim()
    }
    const firstLine = block.split(/\n/)[0].replace(/^\s*NAME:\s*/i, '').trim()
    return {
      name: fields['name'] || firstLine || 'Unnamed',
      role: fields['role'] || fields['archetype'] || null,
      description: fields['description'] || null,
      voice: fields['voice note'] || fields['voice'] || null,
      visualPrompt: null,
    }
  })
}

/* ─── Shared roster UI for Crew + Cast ─── */

function AgentRosterView({
  projectId, accountId, kind, title, blurb, roles, emptyExampleMsg,
}: {
  projectId: string
  accountId: string | null
  kind: 'crew' | 'cast'
  title: string
  blurb: string
  roles: string[]
  emptyExampleMsg: string
}) {
  const [myAgents, setMyAgents] = useState<AgentData[]>([])
  const [exampleAgents, setExampleAgents] = useState<AgentData[]>([])
  const [projectAgentIds, setProjectAgentIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // User's agents in this kind's roles
      const mineP = accountId
        ? bmovies.from('bct_agents')
            .select('*')
            .eq('owner_account_id', accountId)
            .in('role', roles)
            .order('role')
        : Promise.resolve({ data: [] as AgentData[], error: null })

      // Public examples — a few top-rep agents across the allowed roles.
      // Shown when the user hasn't hired anyone yet, AND as a "meet the
      // roster" strip below the user's own agents.
      const examplesP = bmovies
        .from('bct_agents')
        .select('*')
        .in('role', roles)
        .order('reputation', { ascending: false })
        .limit(8)

      // Which of this project's artifacts were made by which agent
      const artifactsP = bmovies
        .from('bct_artifacts')
        .select('agent_id')
        .eq('offer_id', projectId)
        .not('agent_id', 'is', null)

      const [mineRes, exRes, artRes] = await Promise.all([mineP, examplesP, artifactsP])
      const mine = (mineRes.data || []) as AgentData[]
      const examples = ((exRes.data || []) as AgentData[]).filter(
        (a) => !mine.some((m) => m.id === a.id),
      )
      const ids = new Set(
        ((artRes.data || []) as { agent_id: string }[])
          .map((r) => r.agent_id)
          .filter(Boolean),
      )
      setMyAgents(mine)
      setExampleAgents(examples)
      setProjectAgentIds(ids)
    } catch (err) {
      console.warn('[roster] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [accountId, projectId, roles])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
            {kind === 'crew' ? 'Production side' : 'Performing talent'}
          </div>
          <h2 className="text-3xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            {title.split(' ')[0]} <span className="text-[#E50914]">{title.split(' ').slice(1).join(' ')}</span>
          </h2>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white shrink-0"
        >
          + Generate {kind === 'crew' ? 'crew' : 'cast'} member · $0.99
        </button>
      </div>
      <p className="text-[#888] text-sm max-w-xl mb-6">{blurb}</p>

      {/* User's agents */}
      <div className="mb-8">
        <h3 className="text-[0.6rem] uppercase tracking-[0.2em] text-[#888] font-bold mb-3">
          Your {kind} ({myAgents.length})
        </h3>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
            {[0,1,2,3].map((i) => (
              <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-5">
                <div className="h-3 w-20 bg-[#1a1a1a] mb-3" />
                <div className="h-6 w-28 bg-[#151515]" />
              </div>
            ))}
          </div>
        ) : myAgents.length === 0 ? (
          <div className="border border-dashed border-[#222] bg-[#050505] p-6">
            <p className="text-[#888] text-sm mb-3">{emptyExampleMsg}</p>
            <button
              onClick={() => setDialogOpen(true)}
              className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white"
            >
              Generate your first {kind === 'crew' ? 'crew member' : 'cast member'} →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {myAgents.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                active={projectAgentIds.has(a.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Public roster examples */}
      {exampleAgents.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[0.6rem] uppercase tracking-[0.2em] text-[#888] font-bold mb-1">
            Featured {kind} across the platform
          </h3>
          <p className="text-[0.6rem] text-[#555] mb-3">
            Established agents available for hire on future projects. Click a card to see their work.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {exampleAgents.map((a) => (
              <AgentCard key={a.id} agent={a} active={false} muted />
            ))}
          </div>
        </div>
      )}

      {dialogOpen && (
        <GenerateAgentDialog
          kind={kind}
          roles={roles}
          onClose={() => setDialogOpen(false)}
          onCreated={() => { setDialogOpen(false); load() }}
        />
      )}
    </div>
  )
}

function AgentCard({ agent, active, muted }: { agent: AgentData; active: boolean; muted?: boolean }) {
  return (
    <a
      href={`/agent.html?id=${encodeURIComponent(agent.id)}`}
      className={`block border p-5 transition-colors no-underline ${
        active ? 'border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0a0a]'
        : muted ? 'border-[#1a1a1a] bg-[#050505] hover:border-[#333]'
        : 'border-[#222] bg-[#0a0a0a] hover:border-[#E50914]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`text-[0.55rem] uppercase tracking-wider font-bold ${muted ? 'text-[#666]' : 'text-[#E50914]'}`}>
          {agent.role.replace(/_/g, ' ')}
        </div>
        {active && (
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
        {agent.persona || 'No persona yet.'}
      </p>
      <div className="flex items-center justify-between text-[0.5rem] text-[#666]">
        <span>Rep: {agent.reputation.toFixed(1)}</span>
        <span>{agent.jobs_completed} jobs</span>
        <span className={muted ? 'text-[#555]' : 'text-[#E50914]'}>View →</span>
      </div>
    </a>
  )
}

function GenerateAgentDialog({
  kind, roles, onClose, onCreated,
}: {
  kind: 'crew' | 'cast'
  roles: string[]
  onClose: () => void
  onCreated: () => void
}) {
  const [role, setRole] = useState(roles[0])
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const { data: session } = await bmovies.auth.getSession()
      const token = session?.session?.access_token
      if (!token) {
        setError('Not signed in')
        setSubmitting(false)
        return
      }
      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, name: name.trim() || undefined }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.error || `HTTP ${res.status}`)
        setSubmitting(false)
        return
      }
      onCreated()
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
        className="bg-[#0a0a0a] border border-[#E50914] max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-bebas)' }}>
          Generate new {kind === 'crew' ? 'crew' : 'cast'} member
        </h3>
        <p className="text-xs text-[#888] mb-4">
          Spin up a new AI {kind === 'crew' ? 'crew member' : 'performer'} with a persona, wallet, and token ticker.
          One-time fee: <span className="text-[#E50914] font-bold">$0.99</span> (billing wires up post-hackathon — free during the BSVA submission window).
        </p>

        <label className="block text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-1">
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full bg-[#111] border border-[#333] text-white px-3 py-2 mb-4 focus:outline-none focus:border-[#E50914]"
        >
          {roles.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <label className="block text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-1">
          Name <span className="text-[#555] normal-case">(optional — we'll pick one)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Atlas Rivers"
          className="w-full bg-[#111] border border-[#333] text-white px-3 py-2 mb-4 focus:outline-none focus:border-[#E50914]"
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
            className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white disabled:opacity-50"
          >
            {submitting ? 'Generating…' : 'Generate · $0.99 →'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Documents tab — download every artifact attached to the project ─── */

type ArtifactRow = {
  id: number
  kind: string
  role: string | null
  step_id: string | null
  url: string
  superseded_by: number | null
  created_at?: string
  // Client-side only — populated when we collapse multiple related
  // artifacts (storyboard frames, character portraits, location stills)
  // into a single pack row. The viewer renders the pack as a grid and
  // opens a nested modal on any tile.
  children?: ArtifactRow[]
  // Display metadata for grid tiles + nested modal headers.
  caption?: string           // e.g. "Elias Moreau" or "Frame 3"
  subtitle?: string | null   // e.g. "lead · antagonist" role tag
  description?: string | null // e.g. the character's visual_prompt
}

function ProjectDocumentsView({ film }: { film: Film }) {
  const [docs, setDocs] = useState<ArtifactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await bmovies
        .from('bct_artifacts')
        .select('id, kind, role, step_id, url, superseded_by, created_at')
        .eq('offer_id', film.id)
        .is('superseded_by', null)
        .order('step_id', { ascending: true })
      if (cancelled) return
      const all = (data || []) as ArtifactRow[]

      // ─── Three packs: storyboard frames, cast portraits, location stills ───
      //
      // Each pack collapses N image artifacts into a single row so the
      // Documents table stays short and judges don't have to scroll
      // past 20 rows of "frame_1 / frame_2 / …". The packs live in
      // bct_artifacts with step_id patterns:
      //
      //   Storyboard:  storyboard.frame_<n>, pitch.teaser_frame_<n>
      //   Cast:        pitch.char_portrait_<n>   (names in pitch.cast_list)
      //   Prod design: pitch.loc_still_<n>       (names in pitch.lookbook)
      //
      // For cast + production design, we also fetch the JSON sidecar
      // (cast_list / lookbook) so each portrait can show its character
      // name + visual prompt in the nested lightbox. Without that
      // sidecar the grid tiles are nameless squares — the exact bug
      // reported against the Cast view earlier.

      const storyboardFrames: ArtifactRow[] = []
      const charPortraits: ArtifactRow[] = []
      const locStills: ArtifactRow[] = []
      const rest: ArtifactRow[] = []

      let castListUrl: string | null = null
      let lookbookUrl: string | null = null

      for (const row of all) {
        const s = row.step_id || ''
        if (s === 'pitch.cast_list') { castListUrl = row.url; rest.push(row); continue }
        if (s === 'pitch.lookbook')  { lookbookUrl = row.url; rest.push(row); continue }

        if (row.kind === 'image') {
          // Storyboard: both new-style (storyboard.frame_<n>) and pitch
          // teaser frames (pitch.teaser_frame_<n>) count as frames.
          if (
            (s.startsWith('storyboard.') && s !== 'storyboard.poster') ||
            s.startsWith('pitch.teaser_frame_')
          ) {
            storyboardFrames.push(row); continue
          }
          if (s.startsWith('pitch.char_portrait_')) { charPortraits.push(row); continue }
          if (s.startsWith('pitch.loc_still_'))     { locStills.push(row); continue }
        }
        rest.push(row)
      }

      // Parse JSON sidecars. Both are data: URLs in practice but fall
      // back to a fetch just in case a future pipeline writes them to
      // remote storage.
      async function loadJsonSidecar(url: string | null): Promise<Array<Record<string, unknown>>> {
        if (!url) return []
        try {
          if (url.startsWith('data:')) {
            const decoded = decodeDataUrl(url)
            if (decoded === null) return []
            return JSON.parse(decoded)
          }
          const r = await fetch(url)
          if (!r.ok) return []
          return await r.json()
        } catch {
          return []
        }
      }

      const [castList, lookbook] = await Promise.all([
        loadJsonSidecar(castListUrl),
        loadJsonSidecar(lookbookUrl),
      ])
      if (cancelled) return

      // Sort each pack by the numeric suffix on step_id so frame_0…N
      // arrive in order rather than lexicographically (…_10 before _2).
      const numericOrder = (a: ArtifactRow, b: ArtifactRow) => {
        const nA = Number((a.step_id || '').match(/_(\d+)$/)?.[1] ?? 0)
        const nB = Number((b.step_id || '').match(/_(\d+)$/)?.[1] ?? 0)
        return nA - nB
      }
      storyboardFrames.sort(numericOrder)
      charPortraits.sort(numericOrder)
      locStills.sort(numericOrder)

      // Dedupe each pack by URL (legacy rows sometimes share mirror
      // filenames when the generator reuses step_ids).
      const dedupe = (xs: ArtifactRow[]) =>
        Array.from(new Map(xs.map((r) => [r.url, r])).values())

      const storyChildren = dedupe(storyboardFrames).map((r, i) => ({
        ...r,
        caption: `Frame ${i + 1}`,
      }))

      const castChildren = dedupe(charPortraits).map((r, i) => {
        const c = (castList[i] || {}) as { name?: string; role?: string; visual_prompt?: string }
        return {
          ...r,
          caption: c.name || `Character ${i + 1}`,
          subtitle: c.role || null,
          description: c.visual_prompt || null,
        }
      })

      const locChildren = dedupe(locStills).map((r, i) => {
        const l = (lookbook[i] || {}) as { name?: string; visual_prompt?: string }
        return {
          ...r,
          caption: l.name || `Location ${i + 1}`,
          description: l.visual_prompt || null,
        }
      })

      // Dedupe flat rows by step_id — the `superseded_by` filter above
      // should normally guarantee one head version per step, but a few
      // legacy rows slipped through without the backref populated and
      // showed up as duplicate "Logline" (etc) rows. Keep the newest
      // per step_id when duplicates still exist.
      const restDeduped: ArtifactRow[] = (() => {
        const seen = new Map<string, ArtifactRow>()
        const keyless: ArtifactRow[] = []
        for (const r of rest) {
          const k = r.step_id
          if (!k) { keyless.push(r); continue }
          const existing = seen.get(k)
          if (!existing) { seen.set(k, r); continue }
          const rTs = r.created_at ? Date.parse(r.created_at) : 0
          const eTs = existing.created_at ? Date.parse(existing.created_at) : 0
          if (rTs > eTs) seen.set(k, r)
        }
        return [...seen.values(), ...keyless]
      })()

      // Assemble the merged list. Text sidecars (cast_list / lookbook)
      // stay as regular text rows in `rest` so they remain directly
      // accessible — the packs are an additional way to view the
      // portraits, not a replacement for the source text.
      const merged: ArtifactRow[] = [...restDeduped]
      if (storyChildren.length > 0) {
        merged.push({
          id: -1,
          kind: 'storyboard',
          role: 'storyboard',
          step_id: 'storyboard.pack',
          url: storyChildren[0].url,
          superseded_by: null,
          created_at: storyChildren[0].created_at,
          children: storyChildren,
        })
      }
      if (castChildren.length > 0) {
        merged.push({
          id: -2,
          kind: 'cast',
          role: 'casting_director',
          step_id: 'casting.portraits',
          url: castChildren[0].url,
          superseded_by: null,
          created_at: castChildren[0].created_at,
          children: castChildren,
        })
      }
      if (locChildren.length > 0) {
        merged.push({
          id: -3,
          kind: 'locations',
          role: 'production_designer',
          step_id: 'production.stills',
          url: locChildren[0].url,
          superseded_by: null,
          created_at: locChildren[0].created_at,
          children: locChildren,
        })
      }
      setDocs(merged)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [film.id])

  // Friendly labels per step_id prefix — judges shouldn't have to
  // decode "writer.treatment" themselves.
  const labelFor = (d: ArtifactRow): string => {
    const step = d.step_id || ''
    const known: Record<string, string> = {
      'writer.logline':        'Logline',
      'writer.synopsis':       'Synopsis',
      'writer.treatment':      'Treatment',
      'writer.beat_sheet':     'Beat sheet',
      'writer.screenplay':     'Screenplay',
      'writer.opening_scene':  'Opening scene',
      'writer.dialogue':       'Dialogue',
      'writer.scene_list':     'Scene list',
      'director.vision':       "Director's vision",
      'casting.cast_list':     'Cast list',
      'production.lookbook':   'Lookbook',
      'dp.shot_plan':          'Shot plan',
      'storyboard.pack':       'Storyboard',
      'storyboard.poster':     'Poster',
      'casting.portraits':     'Cast',
      'production.stills':     'Production design',
      'pitch.cast_list':       'Cast list',
      'pitch.lookbook':        'Lookbook',
      'composer.themes':       'Score brief',
      'composer.final_score':  'Final score',
      'sound.final_mix':       'Final sound mix',
      'producer.bible':        'Production bible',
      'producer.investor_deck':'Investor deck',
      'editor.rough_cut':      'Rough cut',
      'editor.fine_cut':       'Fine cut',
      'editor.picture_lock':   'Picture lock',
      'editor.trailer_cut':    'Trailer',
      'publicist.epk':         'Electronic press kit',
    }
    for (const [prefix, lbl] of Object.entries(known)) {
      if (step.startsWith(prefix)) return lbl
    }
    if (step.startsWith('scene.')) return `Scene clip (${step})`
    return d.role ? `${d.role} · ${d.kind}` : d.kind
  }

  const extensionFor = (d: ArtifactRow): string => {
    if (d.kind === 'video') return 'mp4'
    if (d.kind === 'image') return 'png'
    if (d.kind === 'audio') return 'mp3'
    return 'txt'
  }

  const dlName = (d: ArtifactRow) => {
    const safeTitle = film.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const safeLabel = labelFor(d).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    return `${safeTitle}-${safeLabel}.${extensionFor(d)}`
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
            Deliverables
          </div>
          <h2 className="text-3xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            Project <span className="text-[#E50914]">documents</span>
          </h2>
          <p className="text-[#888] text-xs mt-1">
            Every artifact the swarm has produced for &quot;{film.title}&quot;, current head version only.
            Click any row to view; packs open as a grid with a nested viewer per frame.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className="h-12 bg-[#0a0a0a] border border-[#1a1a1a]" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="border border-dashed border-[#222] bg-[#050505] p-6 text-center">
          <div className="text-[#666] text-sm">No artifacts produced yet.</div>
          <div className="text-[#444] text-xs mt-1">
            Documents appear here as the pipeline completes each step.
          </div>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
          <div className="grid grid-cols-[auto_2fr_1fr_auto] gap-3 px-4 py-2 border-b border-[#1a1a1a] text-[0.55rem] uppercase tracking-[0.14em] text-[#666] font-bold">
            <div>Kind</div>
            <div>Document</div>
            <div>Step</div>
            <div></div>
          </div>
          {docs.map((d, i) => {
            const isDataUrl = d.url.startsWith('data:')
            const frameCount = d.children?.length ?? 0
            return (
              <div
                key={d.id}
                onClick={() => setViewerIndex(i)}
                className="grid grid-cols-[auto_2fr_1fr_auto] gap-3 px-4 py-3 border-b border-[#111] last:border-b-0 items-center cursor-pointer hover:bg-[#0f0f0f] transition-colors"
              >
                <div className="text-[0.55rem] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-[#1a1a1a] text-[#888]">
                  {d.kind}
                </div>
                <div className="min-w-0">
                  <div className="text-white text-sm truncate">
                    {labelFor(d)}
                    {frameCount > 0 && (
                      <span className="text-[#666] text-xs font-mono ml-2">· {frameCount} frames</span>
                    )}
                  </div>
                  {d.role && (
                    <div className="text-[#555] text-[0.55rem] uppercase tracking-wider mt-0.5">
                      {d.role}
                    </div>
                  )}
                </div>
                <div className="text-[#666] text-[0.65rem] font-mono truncate">
                  {d.step_id || '—'}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setViewerIndex(i) }}
                    className="text-[0.55rem] font-bold uppercase tracking-wider text-[#888] hover:text-white bg-transparent border-none cursor-pointer"
                  >
                    View
                  </button>
                  {frameCount === 0 && (
                    // Packs have N children; a single-file download
                    // would only save the first frame and mislead the
                    // user. Individual frames are downloadable from
                    // the nested modal.
                    <a
                      href={d.url}
                      download={dlName(d)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[0.55rem] font-bold uppercase tracking-wider text-[#E50914] hover:text-white"
                    >
                      {isDataUrl ? 'Save' : 'Download'} ↓
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DocumentViewer
        items={docs}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onIndexChange={setViewerIndex}
        label={labelFor}
        dlName={dlName}
      />
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

/* ─── Slider field used by the Voiceover tab ─── */
function SliderField({
  label, value, setValue, hint,
}: {
  label: string
  value: number
  setValue: (v: number) => void
  hint?: string
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold">{label}</span>
        <span className="text-[0.65rem] text-[#E50914] font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-[#E50914]"
      />
      {hint && <div className="text-[0.55rem] text-[#555] mt-1">{hint}</div>}
    </div>
  )
}

/* ─── Project Voiceover ─── */
/*
 * Voiceover tab — commissioner can:
 *   - Hear the current VO on top of the trailer reel
 *   - Edit the script (either free-form, or via "Refine with AI")
 *   - Pick a voice (shortlist matches ElevenLabs ids in post-production.ts)
 *   - Regenerate (burns one of 3 free revisions; after that, upload-only)
 *   - Upload their own MP3 (no revision limit)
 *
 * Revision counter = count of non-superseded + superseded vo.trailer_narration
 * rows ever inserted for this offer. Hard-gated at 3 for trailers; shorts and
 * features get 5 (larger budget, more room to iterate).
 */
function ProjectVoView({ film }: { film: Film }) {
  const REV_LIMIT = film.tier === 'trailer' ? 3 : film.tier === 'short' ? 5 : 7

  // ElevenLabs voice shortlist — matches resolveVoiceId() in post-production.ts.
  const VOICES = [
    { id: 'adam',    label: 'Adam · deep American narrator (default)' },
    { id: 'brian',   label: 'Brian · deep trailer-announcer' },
    { id: 'daniel',  label: 'Daniel · British authoritative' },
    { id: 'arnold',  label: 'Arnold · gravelly, intense' },
    { id: 'clyde',   label: 'Clyde · characterful, comedic' },
    { id: 'callum',  label: 'Callum · soft, thoughtful' },
    { id: 'rachel',  label: 'Rachel · warm female' },
    { id: 'bella',   label: 'Bella · intimate female' },
    { id: 'domi',    label: 'Domi · sharp female' },
  ]

  const MODELS = [
    { id: 'eleven_multilingual_v2', label: 'v2 Multilingual · quality default' },
    { id: 'eleven_turbo_v2_5',      label: 'Turbo v2.5 · fast + cheap' },
    { id: 'eleven_v3',              label: 'v3 alpha · expressive, audio tags' },
  ]

  // Audio tags v3 understands inline. Clicking inserts at cursor. Older
  // models silently ignore tags so they don't break a v2 render either.
  const AUDIO_TAGS: Array<{ label: string; insert: string }> = [
    { label: '[whispers]', insert: '[whispers] ' },
    { label: '[excited]',  insert: '[excited] ' },
    { label: '[sighs]',    insert: '[sighs] ' },
    { label: '[laughs]',   insert: '[laughs] ' },
    { label: '[angry]',    insert: '[angry] ' },
    { label: '[sad]',      insert: '[sad] ' },
    { label: '[pause 1s]', insert: '[pause 1s] ' },
    { label: '[pause 2s]', insert: '[pause 2s] ' },
  ]

  const [loading, setLoading] = useState(true)
  const [scriptText, setScriptText] = useState('')
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null)
  const [pastRevisions, setPastRevisions] = useState<Array<{ id: number; url: string; created_at: string; voice?: string }>>([])
  const [voiceId, setVoiceId] = useState('adam')
  const [modelId, setModelId] = useState('eleven_multilingual_v2')
  const [stability, setStability] = useState(0.45)
  const [similarityBoost, setSimilarityBoost] = useState(0.85)
  const [style, setStyle] = useState(0.35)
  const [speakerBoost, setSpeakerBoost] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [refining, setRefining] = useState(false)
  const [refineHint, setRefineHint] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const scriptRef = useRef<HTMLTextAreaElement>(null)

  const isV3 = modelId === 'eleven_v3'
  const revisionsUsed = pastRevisions.length
  const revisionsLeft = Math.max(0, REV_LIMIT - revisionsUsed)

  function insertAtCursor(text: string) {
    const ta = scriptRef.current
    if (!ta) { setScriptText((s) => s + text); return }
    const start = ta.selectionStart ?? scriptText.length
    const end = ta.selectionEnd ?? scriptText.length
    const next = scriptText.slice(0, start) + text + scriptText.slice(end)
    setScriptText(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + text.length
    })
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data } = await bmovies
          .from('bct_artifacts')
          .select('id, step_id, url, superseded_by, created_at, model')
          .eq('offer_id', film.id)
          .in('step_id', ['vo.trailer_script', 'vo.trailer_narration'])
          .order('created_at', { ascending: false })
        if (cancelled) return
        const rows = data || []
        const scriptRow = rows.find((r) => r.step_id === 'vo.trailer_script' && !r.superseded_by)
        const narrationHead = rows.find((r) => r.step_id === 'vo.trailer_narration' && !r.superseded_by)
        const narrationHistory = rows.filter((r) => r.step_id === 'vo.trailer_narration')
        if (scriptRow?.url?.startsWith('data:')) {
          try { setScriptText(decodeURIComponent(scriptRow.url.split(',')[1] || '')) } catch {}
        }
        if (narrationHead?.url) setCurrentAudioUrl(narrationHead.url)
        setPastRevisions(
          narrationHistory.map((r) => ({
            id: r.id as number,
            url: r.url as string,
            created_at: r.created_at as string,
            voice: (r.model as string) || undefined,
          })),
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [film.id])

  async function refineScriptWithAI() {
    if (!scriptText.trim()) {
      setStatus('Paste or edit a script first.')
      return
    }
    setRefining(true)
    setStatus(null)
    try {
      const res = await fetch('/api/trailer/vo/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: film.id,
          currentScript: scriptText,
          hint: refineHint || 'Make it sharper, more cinematic, more dramatic',
          title: film.title,
          synopsis: film.synopsis,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      if (body?.refined) {
        setScriptText(body.refined)
        setStatus('Script refined. Review above, then Regenerate.')
      }
    } catch (err) {
      setStatus(`Refine failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setRefining(false)
    }
  }

  async function regenerateVo() {
    if (revisionsLeft <= 0) {
      setStatus(`All ${REV_LIMIT} revisions used. Upload your own MP3 instead.`)
      return
    }
    setBusy(true)
    setStatus('Updating script + re-TTSing with ElevenLabs…')
    try {
      // 1. Patch vo.trailer_script with the current text (the endpoint
      //    treats an existing script as curated and reuses it verbatim).
      const scriptUrl =
        'data:text/plain;charset=utf-8,' + encodeURIComponent(scriptText.trim())
      const { error: patchErr } = await bmovies
        .from('bct_artifacts')
        .update({ url: scriptUrl })
        .eq('offer_id', film.id)
        .eq('step_id', 'vo.trailer_script')
        .is('superseded_by', null)
      if (patchErr) {
        // If there's no existing script row yet, insert one.
        await bmovies.from('bct_artifacts').insert({
          offer_id: film.id,
          kind: 'text',
          url: scriptUrl,
          model: 'user-curated',
          prompt: 'user-edited VO script',
          payment_txid: `user-edit-${Date.now().toString(36)}`,
          role: 'vo',
          step_id: 'vo.trailer_script',
        })
      }

      // 2. Force re-TTS with the chosen voice + model + settings.
      const res = await fetch('/api/trailer/post-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: film.id,
          voiceId,
          modelId,
          voiceSettings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: speakerBoost,
          },
          force: { voAudio: true },
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      setStatus(`Regenerated. New VO cost \$${(body.costUsd || 0).toFixed(2)}. Reloading…`)
      // Reload revisions + audio after a moment so Supabase replication lands.
      setTimeout(() => { window.location.reload() }, 1200)
    } catch (err) {
      setStatus(`Regenerate failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(false)
    }
  }

  async function previewSample() {
    const snippet = scriptText.trim().split(/\n+/).slice(0, 2).join(' ').slice(0, 400) || 'Sample voiceover for bMovies.'
    setPreviewing(true)
    setStatus('Sampling voice… no revision burned.')
    setPreviewUrl(null)
    try {
      const res = await fetch('/api/trailer/vo/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: snippet,
          voiceId,
          modelId,
          voiceSettings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: speakerBoost,
          },
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      setPreviewUrl(body.audioDataUrl)
      setStatus('Preview ready below. Adjust settings + re-sample, or click Regenerate when you like it.')
    } catch (err) {
      setStatus(`Preview failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setPreviewing(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setStatus('Keep MP3 under 5MB.')
      return
    }
    setBusy(true)
    setStatus('Uploading your MP3…')
    try {
      const form = new FormData()
      form.append('offerId', film.id)
      form.append('file', file)
      const res = await fetch('/api/trailer/vo/upload', { method: 'POST', body: form })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      setStatus('Uploaded. Reloading…')
      setTimeout(() => { window.location.reload() }, 800)
    } catch (err) {
      setStatus(`Upload failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse h-40 bg-[#0e0e0e]" />
  }

  return (
    <div className="max-w-4xl">
      <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
        Voiceover
      </div>
      <h2 className="text-3xl font-black leading-none text-white mb-4" style={{ fontFamily: 'var(--font-bebas)' }}>
        Fix the voiceover on <span className="text-[#E50914]">{film.title}</span>
      </h2>
      <p className="text-[#888] text-sm leading-relaxed mb-6 max-w-xl">
        Edit the script, pick a voice, regenerate. You get {REV_LIMIT} free revisions for a {film.tier}; after that you can upload your own MP3.
      </p>

      {/* Current VO player */}
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4 mb-5">
        <div className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold mb-2">
          Current VO
        </div>
        {currentAudioUrl ? (
          <audio controls src={currentAudioUrl} className="w-full" style={{ filter: 'invert(0.85)' }} />
        ) : (
          <div className="text-[#666] text-xs italic">No VO yet. Post-production may still be running.</div>
        )}
        <div className="text-[0.6rem] text-[#555] mt-2">
          Revisions used: <strong className="text-[#E50914]">{revisionsUsed}</strong> / {REV_LIMIT}
        </div>
      </div>

      {/* Script editor */}
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold">VO script</div>
          <div className="text-[0.55rem] text-[#555]">{scriptText.length} chars</div>
        </div>
        <textarea
          ref={scriptRef}
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          rows={6}
          className="w-full bg-black border border-[#222] text-white p-3 text-sm font-mono leading-relaxed focus:outline-none focus:border-[#E50914]"
          placeholder="Write the script the narrator will read…"
        />

        {/* Audio tags — v3 only. Older models ignore them so inserting
            while on v2 doesn't break a render, but the buttons only
            surface when v3 is the selected model to avoid confusion. */}
        {isV3 && (
          <div className="mt-3">
            <div className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold mb-2">
              Audio tags · insert at cursor (v3 only)
            </div>
            <div className="flex flex-wrap gap-2">
              {AUDIO_TAGS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => insertAtCursor(t.insert)}
                  className="px-2 py-1 text-[0.6rem] font-mono bg-[#1a1a1a] border border-[#333] text-[#ccc] hover:border-[#E50914] hover:text-[#E50914]"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Refine with AI */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <input
            type="text"
            value={refineHint}
            onChange={(e) => setRefineHint(e.target.value)}
            className="bg-black border border-[#222] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#E50914]"
            placeholder="What's wrong with it? (e.g. 'too cheerful — make it darker')"
          />
          <button
            type="button"
            onClick={refineScriptWithAI}
            disabled={refining || busy}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-[#ccc] text-[0.65rem] font-bold uppercase tracking-wider hover:border-[#E50914] hover:text-[#E50914] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {refining ? 'Refining…' : 'Refine with AI →'}
          </button>
        </div>
      </div>

      {/* Voice + model + settings + preview + regenerate */}
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold mb-2">Voice</div>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="w-full bg-black border border-[#222] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#E50914]"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold mb-2">Model</div>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-black border border-[#222] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#E50914]"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced settings — collapsible */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-[0.55rem] uppercase tracking-[0.12em] text-[#888] font-bold hover:text-[#E50914] mb-2"
        >
          {showAdvanced ? '▼ Hide advanced settings' : '▶ Advanced voice settings'}
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border border-[#1a1a1a] bg-black mb-3">
            <SliderField
              label="Stability"
              value={stability}
              setValue={setStability}
              hint="↑ consistent · ↓ emotional"
            />
            <SliderField
              label="Similarity"
              value={similarityBoost}
              setValue={setSimilarityBoost}
              hint="how close to the source voice"
            />
            <SliderField
              label="Style"
              value={style}
              setValue={setStyle}
              hint="trailer-voice exaggeration"
            />
            <label className="col-span-full flex items-center gap-2 text-xs text-[#ccc] cursor-pointer">
              <input
                type="checkbox"
                checked={speakerBoost}
                onChange={(e) => setSpeakerBoost(e.target.checked)}
                className="accent-[#E50914]"
              />
              <span>Speaker boost (enhanced clarity)</span>
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={previewSample}
            disabled={previewing || busy || !scriptText.trim()}
            className="px-4 py-3 bg-[#1a1a1a] border border-[#333] text-[#ccc] text-[0.7rem] font-bold uppercase tracking-wider hover:border-[#E50914] hover:text-[#E50914] disabled:opacity-40 disabled:cursor-not-allowed"
            title="Sample the current voice + settings on the first line or two — doesn't burn a revision"
          >
            {previewing ? 'Sampling…' : '🔊 Preview (free)'}
          </button>
          <button
            type="button"
            onClick={regenerateVo}
            disabled={busy || revisionsLeft <= 0 || !scriptText.trim()}
            className="px-4 py-3 bg-[#E50914] text-white text-sm font-black uppercase tracking-wider hover:bg-[#b00610] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Working…' : revisionsLeft > 0
              ? `Regenerate VO · ${revisionsLeft} revision${revisionsLeft === 1 ? '' : 's'} left`
              : 'Out of free revisions — upload your own below'}
          </button>
        </div>

        {previewUrl && (
          <div className="mt-3 p-3 border border-[#1a3a1a] bg-[#0a1a0a]">
            <div className="text-[0.55rem] uppercase tracking-wider text-[#6bff8a] font-bold mb-2">Preview (not saved)</div>
            <audio controls src={previewUrl} className="w-full" style={{ filter: 'invert(0.85)' }} />
          </div>
        )}
      </div>

      {/* Upload own MP3 */}
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4 mb-5">
        <div className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold mb-2">Or upload your own MP3</div>
        <p className="text-[#666] text-xs leading-relaxed mb-3">
          Record your own take, or hire a human voice actor. Under 5MB, 32s or less. No revision limit on uploads.
        </p>
        <input
          type="file"
          accept="audio/mpeg,audio/mp3,.mp3"
          onChange={handleUpload}
          disabled={busy}
          className="block w-full text-[#ccc] text-sm file:mr-3 file:py-2 file:px-4 file:border-0 file:bg-[#1a1a1a] file:text-[#ccc] file:text-[0.65rem] file:font-bold file:uppercase file:tracking-wider file:cursor-pointer hover:file:bg-[#E50914] hover:file:text-white"
        />
      </div>

      {/* Revision history */}
      {pastRevisions.length > 1 && (
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold mb-3">Past takes (superseded)</div>
          <div className="space-y-2">
            {pastRevisions.slice(1).map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <audio controls src={r.url} className="flex-1" style={{ filter: 'invert(0.85)', height: '32px' }} />
                <div className="text-[0.55rem] text-[#555] uppercase tracking-wider">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status && (
        <div className={`mt-4 p-3 text-sm ${status.includes('fail') || status.includes('error') ? 'bg-[#3a1010] text-[#ff8f8f]' : 'bg-[#0e3a0e] text-[#6bff8a]'}`}>
          {status}
        </div>
      )}
    </div>
  )
}

/* ─── Project Production Room ─── */

function ProjectRoomView({ film }: { film: Film }) {
  return (
    <div>
      <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
            Live pipeline
          </div>
          <h2
            className="text-3xl font-black leading-none text-white"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            Production <span className="text-[#E50914]">room</span>
          </h2>
          <div className="text-[#888] text-xs mt-1">
            ${film.token_ticker} &middot; &quot;{film.title}&quot;
          </div>
        </div>
        <a
          href={`/production.html?id=${encodeURIComponent(film.id)}`}
          target="_blank"
          rel="noopener"
          className="px-3 py-1.5 border border-[#333] hover:border-[#E50914] text-white text-[0.6rem] font-bold uppercase tracking-wider shrink-0"
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
    token_ticker: string | null
    treasury_address: string | null
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

        const studios = (studiosRes.data || []) as { id: string; name: string; token_ticker: string | null; treasury_address: string | null }[]
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
      {/* Header — mirrors the Studio header so the short address /
          BRC-100 eyebrow stays visible when toggling between tabs. */}
      <header className="mb-8 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#666] font-bold mb-2 truncate">
          {displayNameFor(user)}
          {isBrc100 && (
            <span className="ml-2 text-[#E50914]">. BRC-100</span>
          )}
        </div>
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
          </div>

          {/* HandCash — live OAuth link, promoted out of the greyed-out grid. */}
          <button
            onClick={async () => {
              try {
                const { data: { session } } = await bmovies.auth.getSession()
                const jwt = session?.access_token
                if (!jwt) { alert('Sign in first.'); return }
                const res = await fetch('/api/handcash/authorize', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                  body: JSON.stringify({ intent: 'link_only', returnUrl: `${window.location.origin}/account?tab=wallet&handcash=linked` }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Authorize failed')
                window.location.href = data.authorizeUrl
              } catch (err) {
                alert('HandCash link failed: ' + (err instanceof Error ? err.message : String(err)))
              }
            }}
            className="mt-2 w-full flex items-center justify-center gap-2 p-3 border border-[#38EF7D] bg-[#001208] hover:bg-[#002814] text-white transition-colors cursor-pointer"
          >
            <span style={{width:24,height:24,display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#38EF7D',color:'#000',fontWeight:900,fontSize:13,borderRadius:4}}>H</span>
            <span className="text-[0.7rem] font-bold">Link HandCash</span>
            <span className="text-[0.5rem] text-[#38EF7D]">OAuth · for $ share settlement</span>
          </button>
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
          <div className="space-y-6">
            {/* ═══ PLATFORM ═══ */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-[0.6rem] uppercase tracking-[0.2em] text-[#E50914] font-bold">
                  Platform token
                </h3>
                <span className="text-[0.55rem] uppercase tracking-wider text-[#555]">
                  1 of 1 · BSV-21 · 1B supply
                </span>
              </div>
              <div className="space-y-3">
            {/* $bMovies platform token — always render as a balance row,
                even when holdings are 0, so the user always sees a clear
                line item in the wallet. */}
            {(() => {
              const bal = walletData?.platformTokens ?? 0
              const priceCents = walletData?.pricePerTokenCents ?? 0.1
              const valueUsd = (bal * priceCents) / 100
              const supplyPct = (bal / 1_000_000_000) * 100
              const hasBalance = bal > 0
              return (
                <div
                  className={`border p-5 ${hasBalance ? 'border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0a0a]' : 'border-[#222] bg-[#0a0a0a]'}`}
                >
                  <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-2xl font-black text-[#E50914] leading-none"
                          style={{ fontFamily: 'var(--font-bebas)' }}
                        >
                          $bMovies
                        </span>
                        <span className="text-[0.55rem] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-[#1a1a1a] text-[#888]">
                          Platform token
                        </span>
                      </div>
                      <div className="text-[#666] text-xs">
                        BSV-21 · 1B supply · @ ${(priceCents / 100).toFixed(4)}/token
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.5rem] uppercase tracking-wider text-[#666] font-bold mb-1">
                        Balance
                      </div>
                      <div
                        className={`text-xl font-black leading-none tabular-nums ${hasBalance ? 'text-white' : 'text-[#555]'}`}
                        style={{ fontFamily: 'var(--font-bebas)' }}
                      >
                        {formatTokens(bal)}
                      </div>
                      <div className="text-[#666] text-[0.6rem] tabular-nums">
                        {supplyPct.toFixed(4)}% supply
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.5rem] uppercase tracking-wider text-[#666] font-bold mb-1">
                        Value
                      </div>
                      <div
                        className={`text-xl font-black leading-none tabular-nums ${hasBalance ? 'text-[#6bff8a]' : 'text-[#555]'}`}
                        style={{ fontFamily: 'var(--font-bebas)' }}
                      >
                        {formatUsd(valueUsd)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <a
                        href="/invest.html"
                        className="text-[0.6rem] font-bold uppercase tracking-wider px-3 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white text-center whitespace-nowrap"
                      >
                        Buy
                      </a>
                      <a
                        href="/captable.html?id=platform"
                        className="text-[0.55rem] font-bold uppercase tracking-wider px-3 py-1 border border-[#333] hover:border-[#E50914] text-[#888] hover:text-white text-center whitespace-nowrap"
                      >
                        Cap table
                      </a>
                    </div>
                  </div>
                </div>
              )
            })()}

              </div>
            </div>

            {/* ═══ STUDIO TOKENS ═══ */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-[0.6rem] uppercase tracking-[0.2em] text-[#66aaff] font-bold">
                  Studio tokens
                </h3>
                <span className="text-[0.55rem] uppercase tracking-wider text-[#555]">
                  {(walletData?.studios ?? []).length} owned · royalty on every film your studio produces
                </span>
              </div>
              <div className="space-y-3">
            {(walletData?.studios ?? []).length > 0 ? (
              walletData!.studios.map((s) => (
                <div key={s.id} className="border border-[#1a3a5a] bg-gradient-to-br from-[#030a14] to-[#0a0a0a] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[0.5rem] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-[#0a1a3a] text-[#66aaff]">
                      Studio
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xl font-black text-white leading-none"
                        style={{ fontFamily: 'var(--font-bebas)' }}
                      >
                        {s.token_ticker ? `$${s.token_ticker}` : s.name}
                      </span>
                      <span className="text-[#888] text-sm">Your studio</span>
                    </div>
                  </div>
                  <div className="text-[#666] text-xs mb-2">
                    {s.agentCount} agent{s.agentCount !== 1 ? 's' : ''}
                    {' \u00b7 '}
                    {s.filmCount} film{s.filmCount !== 1 ? 's' : ''} produced
                  </div>
                  {s.treasury_address ? (
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
                  ) : (
                    <div className="text-[#666] text-[0.6rem] uppercase tracking-wider">
                      Token + treasury issued at <a href="/account?tab=studio" className="text-[#E50914]">$0.99 upgrade</a>
                    </div>
                  )}
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

              </div>
            </div>

            {/* ═══ FILM TOKENS ═══ */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-[0.6rem] uppercase tracking-[0.2em] text-[#6bff8a] font-bold">
                  Film tokens
                </h3>
                <span className="text-[0.55rem] uppercase tracking-wider text-[#555]">
                  {films.length} held · royalty share in individual films
                </span>
              </div>
              <div className="space-y-3">
            {films.length > 0 ? (
              films.map((f) => (
                <div key={f.id} className="border border-[#1a3a1a] bg-gradient-to-br from-[#030f03] to-[#0a0a0a] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[0.5rem] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-[#0a1a0a] text-[#6bff8a]">
                      Film
                    </span>
                  </div>
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
                    href="/account?section=pitch"
                    className="text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white"
                  >
                    Commission your first film
                  </a>
                </div>
              </div>
            )}

              </div>
            </div>

            {/* ═══ AGENTS ═══ */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-[0.6rem] uppercase tracking-[0.2em] text-[#aaa] font-bold">
                  Agents
                </h3>
                <span className="text-[0.55rem] uppercase tracking-wider text-[#555]">
                  {(walletData?.agents ?? []).length} hired · the crew that makes your films
                </span>
              </div>
              <div className="space-y-3">
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
            </div>
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
  token_ticker: string | null
  treasury_address: string | null
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
      if (cancelled) return
      if (error) console.warn('[studio-tab] load error:', error.message)
      if (data) {
        setStudio(data as StudioData)
        setStudioLoading(false)
        return
      }
      // ─── No studio yet → auto-create a free default ───
      // Every signed-in user gets a minimal studio on first account
      // visit so pitches/commissions always have a brand to hang off.
      // The $0.99 paid "custom studio" flow (logo + bio + 8 agents)
      // remains as an upgrade from the banner on the populated card.
      try {
        const { data: session } = await bmovies.auth.getSession()
        const accessToken = session.session?.access_token
        if (!accessToken) {
          setStudio(null)
          setStudioLoading(false)
          return
        }
        const res = await fetch('/api/studio/ensure-default', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: '{}',
        })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          console.warn('[studio-tab] ensure-default failed:', json?.error || res.status)
          setStudio(null)
        } else {
          setStudio(json.studio as StudioData)
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[studio-tab] ensure-default threw:', err instanceof Error ? err.message : String(err))
          setStudio(null)
        }
      } finally {
        if (!cancelled) setStudioLoading(false)
      }
    }
    loadStudio()
    return () => { cancelled = true }
  }, [accountId])

  useEffect(() => {
    if (!sessionIdFromUrl || !user) return
    // An auto-created placeholder studio (created_by === 'auto') is NOT
    // a real studio — the $0.99 upgrade return should still fire
    // /api/studio/complete so Grok can fill in the logo/bio/agents.
    // Only bail when we already have a fully-provisioned row.
    if (studio && studio.created_by !== 'auto') return
    // ─── Guard against cross-flow hijack ───
    // BOTH pitch-commission and studio-create return with ?session_id=
    // in the URL. The old effect fired /api/studio/complete on every
    // return, which ate pitch-commission session ids and rendered
    // "Provisioning studio..." indefinitely because the session metadata
    // didn't have the studio-provisioning fields. The two return paths
    // are distinguishable by other URL params:
    //
    //   pitch return:  /account?commissioned=1&session_id=...&title=...&ticker=...&tier=pitch
    //   studio return: /account?tab=studio&session_id=...
    //
    // Only fire /api/studio/complete when we have a clean studio-create
    // return (no commissioned flag, no tab/tool/project context).
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const isCommissionReturn = params?.get('commissioned') === '1'
    const isToolOrProject = Boolean(params?.get('tool') || params?.get('project'))
    if (isCommissionReturn || isToolOrProject) return

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
                {studio.token_ticker ? (
                  <span className="text-[0.55rem] font-mono text-[#E50914] shrink-0">
                    ${studio.token_ticker}
                  </span>
                ) : (
                  <span className="text-[0.55rem] font-mono text-[#666] shrink-0 uppercase tracking-wider">
                    No token yet
                  </span>
                )}
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
              href="/account?section=pitch"
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
                  <span className="text-[#E50914] font-bold">Upgrade</span> for $0.99 to mint your studio token, issue a treasury address, and unlock an AI-generated logo, roster poster, bio, and 8 specialist agents. KYC verification is required at checkout.
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
                      if (res.status === 403 && data?.reason === 'kyc_required') {
                        if (confirm('You need to verify your identity with Veriff before creating a studio. Go to KYC now?')) {
                          window.location.href = data.next || '/kyc.html'
                        }
                        return
                      }
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
                <a href="/account?section=pitch" className="text-[#E50914]">Commission your first →</a>
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
      {/* Primary action — always visible, no studio required.
          A user can pitch a film without owning a studio; the platform
          hosts their commission under a default founding studio. Having
          your own studio is value-add (your brand on the poster, 8
          named agents, a treasury address) but it is NOT a gate on
          commissioning. Earlier revisions buried the "Start a commission"
          link at the bottom of this page, conditioned on !hasFilms, which
          made the studio tab feel like a paywall on pitching. */}
      <div className="border border-[#E50914] bg-gradient-to-b from-[#1a0003] to-[#0a0a0a] p-6 mb-4">
        <h3
          className="text-2xl font-black mb-2 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Pitch a new <span className="text-[#E50914]">film</span>
        </h3>
        <p className="text-[#bbb] text-sm leading-relaxed mb-5">
          You don&apos;t need a studio to pitch. Start at $0.99 — the swarm produces
          a logline, synopsis, character portraits, storyboards, and a movie
          poster in about three minutes. Your film lands in this workbench
          ready to upgrade to a trailer, a short, or a feature.
        </p>
        <a
          href="/account?section=pitch"
          className="inline-block px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-[#E50914] hover:bg-[#b00610] text-white"
        >
          Start a new pitch →
        </a>
      </div>

      <div className="border border-[#222] bg-[#0a0a0a] p-6 mb-4">
        <h3
          className="text-2xl font-black mb-2 leading-none"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Or create your own <span className="text-[#E50914]">studio</span>
        </h3>
        <p className="text-[#888] text-sm leading-relaxed mb-5">
          Spawn your own AI film studio for $0.99. You get a generated logo,
          bio, treasury address, and 8 specialist agents (writer, director,
          cinematographer, storyboard, editor, composer, sound designer,
          producer). Your studio brand goes on every film you commission.
          Optional — films you pitch without a studio are hosted under a
          founding studio by default.
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
  alt: 'Alt Trailers',
  preview: 'Preview',
  publish: 'Publish',
}

function ToolView({
  tool,
  projectId,
  projectTitle,
  projectTier,
}: {
  tool: string
  projectId: string
  projectTitle: string
  projectTier?: string
}) {
  return (
    <div>
      {tool === 'script' && <ScriptEditorView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'storyboard' && <StoryboardView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'editor' && <MovieEditorView projectId={projectId} projectTitle={projectTitle} projectTier={projectTier} />}
      {tool === 'titles' && <TitleDesignerView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'score' && <ScoreComposerView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'alt' && <AltTrailersView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'preview' && <PreviewView projectId={projectId} projectTitle={projectTitle} />}
      {tool === 'publish' && <PublishView projectId={projectId} projectTitle={projectTitle} />}
    </div>
  )
}

/* ── Alt Trailers ──
 *
 * PRIVATE alternative trailers. A project can have exactly one
 * canonical trailer (the one that shows up in the TierLadder, gets
 * published to /watch.html, and acts as the upgrade basis for the
 * short/feature). The Alt tab lets the commissioner spin up
 * additional trailer variants privately — same script, different
 * direction — so they can compare takes before picking a winner.
 *
 * Data shape: identical to canonical trailers (bct_offers row with
 * parent_offer_id = pitch + tier = trailer), plus pipeline_state.is_alt
 * = true. Every query that surfaces public trailers
 * (TierLadder, films loader, /watch.html) filters these out. Only
 * this tab, and a future "promote alt to canonical" action, sees them.
 *
 * Forward-looking: the eventual "studios bid on pitches" flow will
 * mint a swarm of alt trailers per pitch, each produced by a
 * different studio's style bible. The winner gets promoted to
 * canonical and becomes the basis for a short or feature commission.
 * Starting with the manual "commissioner makes alts for themselves"
 * flow gives us the data model without having to solve studio
 * bidding economics yet.
 */

interface AltOffer {
  id: string
  title: string
  status: string
  trailer_video_url: string | null
  created_at: string
  pipeline_state: { is_alt?: boolean } | null
}

function AltTrailersView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [alts, setAlts] = useState<AltOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await bmovies
      .from('bct_offers')
      .select('id, title, status, trailer_video_url, created_at, pipeline_state')
      .eq('parent_offer_id', projectId)
      .eq('tier', 'trailer')
      .order('created_at', { ascending: false })
    setAlts((data as AltOffer[] || []).filter((a) => a.pipeline_state?.is_alt === true))
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function commissionAlt() {
    setPending(true)
    setErr(null)
    try {
      const { data: s } = await bmovies.auth.getSession()
      const session = s?.session
      if (!session) throw new Error('Sign in required')

      // Look up the parent pitch's title + ticker so the webhook has
      // everything it needs to clone the pitch metadata into the new
      // alt trailer row (same as the canonical Make-trailer path).
      const { data: pitch } = await bmovies
        .from('bct_offers')
        .select('title, token_ticker, synopsis')
        .eq('id', projectId)
        .maybeSingle()
      if (!pitch) throw new Error('Parent pitch not found')

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'trailer',
          title: pitch.title,
          ticker: pitch.token_ticker || '',
          synopsis: pitch.synopsis || '',
          parentOfferId: projectId,
          isAlt: true,
          email: session.user?.email,
          supabaseUserId: session.user?.id,
          successPath: `/account?project=${encodeURIComponent(projectId)}&tool=alt&commissioned=1`,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `checkout failed (${res.status})`)
      if (!body.url) throw new Error('Stripe URL missing')
      window.location.href = body.url
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setErr(msg)
      setPending(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
          Alt trailers · private
        </div>
        <h2 className="text-3xl font-black leading-none text-white mb-3" style={{ fontFamily: 'var(--font-bebas)' }}>
          {projectTitle}
        </h2>
        <p className="text-[#aaa] text-sm leading-relaxed max-w-2xl">
          Commission alternative trailers for the same pitch — same
          script, different direction. Alts stay private to your
          workbench; they don&apos;t appear on <span className="text-white">/watch.html</span>, in the
          TierLadder, or in any public listing. Future &ldquo;promote alt
          to canonical&rdquo; action will let you pick the winner.
        </p>
      </div>

      <div className="border border-dashed border-[#E50914] bg-[#0a0000] p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold mb-0.5">
              Commission an alt · $9.99
            </div>
            <p className="text-[#bbb] text-sm leading-relaxed">
              Fires a fresh trailer generation against the same script.
              Different style bible, different shot plan, different cuts.
              Private by default — mark as canonical later if you want it public.
            </p>
          </div>
          <button
            onClick={commissionAlt}
            disabled={pending}
            className="px-4 py-2.5 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider shrink-0 disabled:opacity-50"
          >
            {pending ? 'Redirecting…' : 'Commission alt · $9.99'}
          </button>
        </div>
        {err && (
          <div className="text-[#ff6b7a] text-[0.65rem] mt-2">Failed: {err}</div>
        )}
      </div>

      <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-2">
        Existing alts · {alts.length}
      </div>
      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 bg-[#0a0a0a] border border-[#1a1a1a]" />
          ))}
        </div>
      ) : alts.length === 0 ? (
        <div className="border border-[#222] bg-[#050505] p-6 text-center text-[#666] text-sm">
          No alt trailers yet. Commission one above to spin up a second take.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alts.map((a) => (
            <div key={a.id} className="border border-[#222] bg-[#0a0a0a] overflow-hidden">
              {a.trailer_video_url ? (
                <video
                  src={a.trailer_video_url}
                  controls
                  preload="metadata"
                  className="w-full aspect-video bg-black"
                />
              ) : (
                <div className="aspect-video bg-[#050505] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <div className="text-[0.55rem] uppercase tracking-wider text-[#666]">In production</div>
                  </div>
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-mono">{a.status}</span>
                  <span className="text-[0.55rem] text-[#666] font-mono">{new Date(a.created_at).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="text-white text-sm font-bold truncate">{a.title}</div>
                <div className="text-[#666] text-[0.55rem] font-mono mt-1">{a.id}</div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const header = url.slice(5, comma)  // e.g. "text/plain;base64"
  const payload = url.slice(comma + 1)
  try {
    if (header.includes(';base64')) {
      // Preserve multi-byte UTF-8: atob → binary string → percent-encode
      // each byte → decodeURIComponent to get the real characters back.
      const bin = atob(payload)
      try {
        return decodeURIComponent(
          Array.from(bin, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
        )
      } catch {
        return bin
      }
    }
    return decodeURIComponent(payload)
  } catch {
    return null
  }
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
      {/* Editor — sized to feel like a real writing surface. Fills
          ~75vh so a screenplay tab gives you room to actually write
          without fighting the toolbar. */}
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#E50914] text-[#ccc] text-base leading-relaxed p-6 font-mono resize-y focus:outline-none"
          style={{ minHeight: '75vh' }}
          autoFocus
        />
      ) : (
        <div
          className="bg-[#0a0a0a] border border-[#222] text-[#ccc] text-base leading-relaxed p-6 whitespace-pre-wrap cursor-text hover:border-[#333] transition-colors"
          style={{ minHeight: '75vh', fontFamily: 'var(--font-mono), monospace' }}
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
            // Update local state after save — replace the matching
            // artifact row in state so tabData recomputes cleanly on
            // the next render instead of mutating its derived value.
            const savedId = tabData[activeTab]?.artifact?.id
            if (savedId == null) return
            setArtifacts((prev) =>
              prev.map((a) => (a.id === savedId ? { ...a, content: newContent } : a)),
            )
          }}
        />
      )}
    </div>
  )
}

/* ── Storyboard ── */

function StoryboardView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  // Frames now include the `prompt` field — the director's line that
  // fed the AI generation. That's the "what's happening in this shot"
  // caption that turns four pictures into an actual storyboard.
  type StoryboardFrame = {
    id: number
    url: string
    step_id: string | null
    role: string | null
    prompt: string | null
    created_at?: string
  }
  const [frames, setFrames] = useState<StoryboardFrame[]>([])
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [synopsis, setSynopsis] = useState<string>('')
  const [tier, setTier] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: offer } = await bmovies
        .from('bct_offers')
        .select('tier, title, synopsis')
        .eq('id', projectId)
        .maybeSingle()
      if (!cancelled && offer) {
        setTier(offer.tier || '')
        if (offer.synopsis) setSynopsis(offer.synopsis)
      }

      const { data } = await bmovies
        .from('bct_artifacts')
        .select('id, url, step_id, role, prompt, created_at')
        .eq('offer_id', projectId)
        .eq('kind', 'image')
        .is('superseded_by', null)
        .order('created_at', { ascending: true })
      if (cancelled) return
      const allImages = (data as StoryboardFrame[]) || []
      const storyboardFrames = allImages.filter((a) =>
        (a.step_id && a.step_id.startsWith('storyboard.') && a.step_id !== 'storyboard.poster') ||
        (a.role === 'storyboard' && a.step_id !== 'storyboard.poster')
      )
      const posterArt = allImages.find((a) => a.role === 'poster' || a.step_id === 'storyboard.poster')
      const titleLower = (offer?.title || '').toLowerCase()
      const titleLowerStripped = titleLower.replace(/[!?.]+$/, '').trim()
      const mapUrl = POSTER_MAP[titleLowerStripped] || POSTER_MAP[titleLower]
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

  // Shot type guess from the prompt text — lets each panel have a
  // shot-list style tag (WIDE / CU etc.) even when the writer didn't
  // provide a formal breakdown.
  function shotTypeFor(prompt: string | null | undefined): string {
    if (!prompt) return 'SHOT'
    const p = prompt.toLowerCase()
    if (/\b(close[- ]?up|extreme close|\bcu\b)/.test(p)) return 'CLOSE-UP'
    if (/\b(wide shot|establishing|wide angle|long shot|panoramic|aerial)/.test(p)) return 'WIDE'
    if (/\b(medium shot|\bms\b|mid shot)/.test(p)) return 'MEDIUM'
    if (/\b(over[- ]the[- ]shoulder|\bots\b|\bpov\b|point of view)/.test(p)) return 'OTS'
    if (/\b(tracking|dolly|crane|pan)/.test(p)) return 'MOVING'
    return 'SHOT'
  }

  const renderHeader = () => (
    <header className="mb-6 pb-4 border-b border-[#E50914]/30">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.25em] text-[#E50914] font-bold">
            Storyboard · {tier || 'production'} tier
          </div>
          <h2
            className="text-3xl font-black text-white leading-none mt-1"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {projectTitle}
          </h2>
          {synopsis && (
            <p className="text-[#999] text-sm leading-relaxed mt-2 max-w-2xl">
              {synopsis.length > 240 ? synopsis.slice(0, 240).trimEnd() + '…' : synopsis}
            </p>
          )}
        </div>
        {posterUrl && (
          <div className="flex-shrink-0">
            <div className="w-24 aspect-[2/3] border border-[#222] bg-[#0a0a0a] overflow-hidden">
              <img src={posterUrl} alt={projectTitle} className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        )}
      </div>
    </header>
  )

  if (loading) {
    return (
      <div>
        <div className="h-24 mb-6 bg-[#0a0a0a] border-b border-[#1a1a1a] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a]">
              <div className="aspect-video bg-[#0e0e0e]" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-24 bg-[#1a1a1a]" />
                <div className="h-3 w-full bg-[#1a1a1a]" />
                <div className="h-3 w-3/4 bg-[#1a1a1a]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (frames.length === 0) {
    return (
      <div>
        {renderHeader()}
        <div className="border border-dashed border-[#222] bg-[#0a0a0a] p-8">
          <div
            className="text-xl font-black mb-2 leading-none"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            No storyboard <span className="text-[#E50914]">frames</span> yet
          </div>
          <p className="text-[#888] text-sm leading-relaxed mb-4">
            {tier === 'pitch'
              ? 'Pitches include a poster but no storyboard frames. Publish your pitch and sell 10% to fund a trailer — trailers include 6 storyboard frames + video clips.'
              : 'Generate storyboard frames using the AI agent, or wait for the production pipeline to create them.'}
          </p>
          <button
            onClick={() => {
              (window as unknown as { bmoviesChat?: { open: (s: string) => void } }).bmoviesChat?.open(
                `Generate a 6-frame storyboard for "${projectTitle}". Use the synopsis and any existing script material.`,
              )
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
      {renderHeader()}

      {/* Panel grid — each panel has a big numbered label, the image
          framed with an aspect-video crop, and a caption with the
          shot type + prompt. Two columns on desktop so panels feel
          substantial (the old 4-across grid made each one thumbnail-
          sized and read like a grid of stock photos). */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {frames.map((frame, i) => {
          const caption = frame.prompt?.trim() || null
          const displayCaption = caption
            ? (caption.length > 320 ? caption.slice(0, 320).trimEnd() + '…' : caption)
            : 'No description captured — this frame was generated without a saved prompt.'
          return (
            <article
              key={frame.id}
              className="border border-[#222] bg-[#0a0a0a] hover:border-[#E50914]/60 transition-colors group"
            >
              {/* Panel header — big number, shot tag */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#1a1a1a]">
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-2xl font-black text-[#E50914] leading-none"
                    style={{ fontFamily: 'var(--font-bebas)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="text-[0.6rem] uppercase tracking-[0.2em] text-[#888] font-bold"
                    style={{ fontFamily: 'var(--font-bebas)' }}
                  >
                    Panel {i + 1} of {frames.length}
                  </span>
                </div>
                <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a0a0a] text-[#E50914] border border-[#5a1a1a]">
                  {shotTypeFor(frame.prompt)}
                </span>
              </div>

              {/* Image */}
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="block w-full aspect-video bg-[#050505] relative overflow-hidden"
                aria-label={`Open panel ${i + 1} full-size`}
              >
                <img
                  src={frame.url}
                  alt={caption || `Panel ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  loading="lazy"
                />
                {/* Subtle scan-line overlay for the storyboard feel */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px)',
                  }}
                />
              </button>

              {/* Caption — the actual story beat */}
              <div className="px-4 py-3">
                <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#666] font-bold mb-1.5">
                  Action
                </div>
                <p className="text-[#ccc] text-sm leading-relaxed">
                  {displayCaption}
                </p>
              </div>
            </article>
          )
        })}
      </div>

      {/* Regenerate / extend */}
      <div className="mt-6 flex gap-2 flex-wrap">
        <button
          onClick={() => {
            (window as unknown as { bmoviesChat?: { open: (s: string) => void } }).bmoviesChat?.open(
              `Generate one additional storyboard frame for "${projectTitle}". Make it a key dramatic moment.`,
            )
          }}
          className="px-4 py-2 border border-[#333] hover:border-[#E50914] text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors"
        >
          Add panel
        </button>
        <button
          onClick={() => {
            (window as unknown as { bmoviesChat?: { open: (s: string) => void } }).bmoviesChat?.open(
              `Rewrite the storyboard for "${projectTitle}" — regenerate all ${frames.length} panels with fresh compositions.`,
            )
          }}
          className="px-4 py-2 border border-[#333] hover:border-[#E50914] text-[#888] hover:text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors"
        >
          Regenerate all
        </button>
      </div>

      <ImageLightbox
        items={frames}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        label={labelForStill}
      />
    </div>
  )
}

/* ── Movie Editor ──
 *
 * Three sub-tabs: Trailer / Short / Feature. Each tab buckets the
 * offer's video artifacts by their step_id pattern:
 *
 *   Trailer : role='trailer-clip' OR step_id='editor.trailer_cut'
 *   Short   : step_id LIKE 'short.%' OR role='short-clip'
 *   Feature : step_id matches /^scene\.\d+\.video$/
 *
 * Tabs with zero clips are greyed out. Default tab is the project's
 * own tier when it has clips, otherwise the highest tier with clips.
 *
 * The stills/storyboard bin was removed — the editor is for cuttable
 * video only. Storyboard frames live on the Storyboard tab; posters
 * and title cards on the Titles tab. Title-card videos (Grok-
 * generated) also appear in the V2 titles track here so they can be
 * dropped into the cut.
 */

type EditorClip = { id: number; kind: string; url: string; step_id: string | null; role: string | null }

type EditorTier = 'trailer' | 'short' | 'feature'

function isTrailerClip(c: EditorClip): boolean {
  return c.role === 'trailer-clip' || c.step_id === 'editor.trailer_cut'
}
function isShortClip(c: EditorClip): boolean {
  const s = c.step_id || ''
  return s.startsWith('short.') || c.role === 'short-clip'
}
function isFeatureClip(c: EditorClip): boolean {
  return /^scene\.\d+\.video$/.test(c.step_id || '')
}
function isTitleClip(c: EditorClip): boolean {
  const s = c.step_id || ''
  return s.startsWith('title.') || c.role === 'title' || c.role === 'title-end'
}

function MovieEditorView({
  projectId,
  projectTier,
}: {
  projectId: string
  projectTitle: string
  projectTier?: string
}) {
  const [allClips, setAllClips] = useState<EditorClip[]>([])
  const [loading, setLoading] = useState(true)
  // Manual tier override — when the user clicks a tab we pin it
  // here, otherwise the active tier is derived from the project's
  // own tier + which buckets have clips. Deriving avoids a
  // setState-in-effect cycle on load.
  const [manualTier, setManualTier] = useState<EditorTier | null>(null)
  const [activeClip, setActiveClip] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  // ── Layered deliverable tracks ─────────────────────────────────
  // When the user plays the Trailer tab's Monitor we layer the VO +
  // music + title cards over the clip sequence so they're watching
  // THE TRAILER, not four silent raw clips. Matches PreviewView.
  const [voUrl, setVoUrl] = useState<string | null>(null)
  const [musicUrl, setMusicUrl] = useState<string | null>(null)
  const [titleCards, setTitleCards] = useState<TitleCard[]>([])
  const [currentTitle, setCurrentTitle] = useState<string | null>(null)
  const voRef = useRef<HTMLAudioElement | null>(null)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      // Walk descendants — a pitch-keyed project may have a trailer
      // child whose cuts live on the trailer's offer_id, not the
      // pitch's. The editor should list every tier's clips.
      const lineageIds: string[] = [projectId]
      let cursor: string = projectId
      for (let i = 0; i < 3; i++) {
        // Skip alt trailers — they're private and shouldn't show up
        // in the canonical editor. Alts have their own tab.
        const { data: children } = await bmovies
          .from('bct_offers')
          .select('id, pipeline_state')
          .eq('parent_offer_id', cursor)
        const canonical = (children as Array<{ id: string; pipeline_state?: { is_alt?: boolean } }> | null)
          ?.find((c) => !c.pipeline_state?.is_alt)
        if (!canonical) break
        lineageIds.push(canonical.id)
        cursor = canonical.id
      }
      const { data } = await bmovies
        .from('bct_artifacts')
        .select('id, kind, url, step_id, role')
        .in('offer_id', lineageIds)
        .in('kind', ['video', 'audio', 'text'])
        .is('superseded_by', null)
        .order('created_at', { ascending: true })
      if (cancelled) return

      const rows = (data as Array<EditorClip & { kind: string }>) || []
      const videos = rows.filter((r) => r.kind === 'video')
      const audios = rows.filter((r) => r.kind === 'audio')
      const texts = rows.filter((r) => r.kind === 'text')

      const all = Array.from(new Map(videos.map((x) => [x.url, x])).values())
      setAllClips(all)

      // Pick the VO and music bed. Trailer post-production stores:
      //   vo.trailer_narration     audio · ElevenLabs narration
      //   composer.trailer_score   audio · MusicGen score
      setVoUrl(audios.find((a) => (a.step_id || '').includes('vo.'))?.url || null)
      setMusicUrl(audios.find((a) => (a.step_id || '').includes('composer.'))?.url || null)

      // Parse title-card timeline from editor.trailer_titles JSON.
      const titlesRow = texts.find((r) => (r.step_id || '') === 'editor.trailer_titles')
      if (titlesRow?.url) {
        try {
          let raw: string
          if (titlesRow.url.startsWith('data:')) {
            const comma = titlesRow.url.indexOf(',')
            const head = titlesRow.url.slice(5, comma)
            const body = titlesRow.url.slice(comma + 1)
            raw = head.includes(';base64') ? atob(body) : decodeURIComponent(body)
          } else {
            raw = await fetch(titlesRow.url).then((r) => r.text()).catch(() => '')
          }
          const parsed = JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim())
          if (Array.isArray(parsed)) {
            const cards: TitleCard[] = parsed
              .map((c: any) => ({
                t: Number(c.t ?? c.at ?? 0),
                text: String(c.text ?? c.card ?? ''),
                duration: c.duration ? Number(c.duration) : undefined,
              }))
              .filter((c) => c.text.length > 0)
              .sort((a, b) => a.t - b.t)
            setTitleCards(cards)
          }
        } catch (err) {
          console.warn('[editor] title-cards parse failed:', err)
        }
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  const trailerAll = allClips.filter(isTrailerClip)
  const shortAll = allClips.filter(isShortClip)
  const featureAll = allClips.filter(isFeatureClip)
  const titleAllVideo = allClips.filter(isTitleClip)

  const pt = (projectTier || '').toLowerCase()
  const defaultTier: EditorTier =
    pt === 'feature' && featureAll.length ? 'feature' :
    pt === 'short' && shortAll.length ? 'short' :
    pt === 'trailer' && trailerAll.length ? 'trailer' :
    featureAll.length ? 'feature' :
    shortAll.length ? 'short' :
    'trailer'
  const tier: EditorTier = manualTier ?? defaultTier

  const clips =
    tier === 'feature' ? featureAll :
    tier === 'short' ? shortAll :
    trailerAll
  // Title cards ship with the trailer deliverable bundle, so they
  // appear on the Trailer tab's V2 track. When short/feature
  // pipelines grow their own title cards, tag them
  // step_id='short.title.*' or 'feature.title.*'.
  const titleClips =
    tier === 'trailer'
      ? titleAllVideo.filter((c) => (c.step_id || '').startsWith('title.'))
      : titleAllVideo.filter((c) => (c.step_id || '').startsWith(`${tier}.title.`))

  function handleClipEnd() {
    // Roll elapsed forward by the finished clip's duration so title
    // cards stay aligned as we move to the next clip in the reel.
    const finished = videoRef.current
    if (finished) elapsedRef.current += finished.duration || 8
    if (activeClip < clips.length - 1) setActiveClip((prev) => prev + 1)
    else {
      // End of reel — stop audio, reset elapsed + overlay.
      try { voRef.current?.pause() } catch {}
      try { musicRef.current?.pause() } catch {}
      elapsedRef.current = 0
      setCurrentTitle(null)
      setIsPlaying(false)
    }
  }

  function playAll() {
    // Reset the layered-playback cursor, start audio on first clip.
    elapsedRef.current = 0
    setCurrentTitle(null)
    setActiveClip(0)
    setIsPlaying(true)
    setTimeout(() => {
      videoRef.current?.play().catch(() => {})
      if (voRef.current) {
        try { voRef.current.currentTime = 0; voRef.current.play().catch(() => {}) } catch {}
      }
      if (musicRef.current) {
        try {
          musicRef.current.currentTime = 0
          musicRef.current.volume = 0.35  // duck music under VO
          musicRef.current.play().catch(() => {})
        } catch {}
      }
    }, 100)
  }

  function switchTier(next: EditorTier) {
    if (next === tier) return
    try { voRef.current?.pause() } catch {}
    try { musicRef.current?.pause() } catch {}
    elapsedRef.current = 0
    setCurrentTitle(null)
    setManualTier(next)
    setActiveClip(0)
    setIsPlaying(false)
  }

  // Drive title overlay from video playback position. Only active on
  // the trailer tier (title cards are a trailer-tier deliverable);
  // other tiers just play clean video.
  useEffect(() => {
    if (tier !== 'trailer') { setCurrentTitle(null); return }
    const video = videoRef.current
    if (!video) return
    const onTime = () => {
      const now = elapsedRef.current + (video.currentTime || 0)
      let active: string | null = null
      for (const card of titleCards) {
        if (card.t <= now) {
          const endT = card.duration ? card.t + card.duration : card.t + 4
          if (now < endT) { active = card.text; break }
          active = null
        } else break
      }
      setCurrentTitle(active)
    }
    const onPause = () => {
      try { voRef.current?.pause() } catch {}
      try { musicRef.current?.pause() } catch {}
    }
    const onPlay = () => {
      // Mid-reel resume: if the user pauses and hits play again,
      // re-start the audio tracks in sync with the video.
      if (voRef.current && voRef.current.paused && activeClip === 0) {
        voRef.current.play().catch(() => {})
      }
      if (musicRef.current && musicRef.current.paused && activeClip === 0) {
        musicRef.current.play().catch(() => {})
      }
    }
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('pause', onPause)
    video.addEventListener('play', onPlay)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('play', onPlay)
    }
  }, [tier, titleCards, activeClip])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="aspect-video bg-[#0a0a0a] border border-[#1a1a1a]" />
        <div className="h-20 bg-[#0a0a0a] border border-[#1a1a1a]" />
      </div>
    )
  }

  const tierSpecs: { id: EditorTier; label: string; count: number }[] = [
    { id: 'trailer', label: 'Trailer', count: trailerAll.length },
    { id: 'short', label: 'Short', count: shortAll.length },
    { id: 'feature', label: 'Feature', count: featureAll.length },
  ]

  return (
    <div className="space-y-4">
      {/* Tier tabs */}
      <div role="tablist" aria-label="Cut tier" className="flex gap-1 border-b border-[#1a1a1a]">
        {tierSpecs.map((t) => {
          const disabled = t.count === 0
          const active = t.id === tier
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => !disabled && switchTier(t.id)}
              className={`px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.16em] border-b-2 transition-colors ${
                active
                  ? 'border-[#E50914] text-[#E50914]'
                  : disabled
                    ? 'border-transparent text-[#333] cursor-not-allowed'
                    : 'border-transparent text-[#888] hover:text-white'
              }`}
            >
              {t.label}
              <span
                className={`ml-2 text-[0.55rem] ${
                  disabled ? 'text-[#222]' : active ? 'text-[#E50914]' : 'text-[#555]'
                }`}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Monitor — main video player */}
      <div className="border border-[#E50914] bg-black">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-[#222]">
          <span className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold">
            Monitor &middot; {tier}
          </span>
          <span className="text-[0.5rem] text-[#666] font-mono">
            {clips.length > 0 ? `Clip ${activeClip + 1} of ${clips.length}` : 'No clips'}
          </span>
        </div>
        {clips.length > 0 ? (
          <div className="relative w-full aspect-video bg-black">
            <video
              ref={videoRef}
              key={clips[activeClip]?.url}
              src={clips[activeClip]?.url}
              controls
              autoPlay={isPlaying}
              onEnded={handleClipEnd}
              className="w-full h-full bg-black"
              preload="metadata"
            />
            {/* Title card overlay — only populated on the trailer tier */}
            {tier === 'trailer' && currentTitle && (
              <div className="absolute inset-x-0 bottom-[10%] z-20 pointer-events-none flex justify-center px-6">
                <div
                  className="text-white text-center font-black leading-tight uppercase tracking-wide"
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: 'clamp(1.2rem, 3.5vw, 2.8rem)',
                    textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)',
                    maxWidth: '90%',
                  }}
                >
                  {currentTitle}
                </div>
              </div>
            )}
            {/* Hidden audio tracks layered with the video on trailer */}
            {tier === 'trailer' && voUrl && (
              <audio ref={voRef} src={voUrl} preload="auto" crossOrigin="anonymous" />
            )}
            {tier === 'trailer' && musicUrl && (
              <audio ref={musicRef} src={musicUrl} preload="auto" crossOrigin="anonymous" />
            )}
          </div>
        ) : (
          <div className="aspect-video bg-[#050505] flex items-center justify-center">
            <div className="text-center">
              <div className="text-[#333] text-4xl mb-2">&#9654;</div>
              <div className="text-[#555] text-xs">No {tier} clips yet</div>
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
          {clips.length} clips &middot; {titleClips.length} titles
        </span>
      </div>

      {/* Timeline */}
      <div className="border border-[#222] bg-[#050505]">
        <div className="px-3 py-1.5 border-b border-[#1a1a1a] flex items-center justify-between">
          <span className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">Timeline</span>
        </div>
        <div className="px-3 py-2">
          {/* V1 — main clips */}
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
                  {labelForClip(clip, i)}
                </button>
              )) : (
                <div className="h-10 flex-1 bg-[#0a0a0a] border border-[#1a1a1a] border-dashed flex items-center justify-center text-[0.5rem] text-[#333]">
                  Empty track
                </div>
              )}
            </div>
          </div>
          {/* V2 — title cards (Grok-generated motion titles) */}
          <div className="flex items-center gap-1">
            <span className="text-[0.45rem] font-mono text-[#555] w-5 shrink-0">V2</span>
            <div className="flex gap-0.5 flex-1 overflow-x-auto">
              {titleClips.length > 0 ? titleClips.map((clip) => (
                <div
                  key={clip.id}
                  className="h-10 min-w-[60px] flex-1 bg-[#1a0f2a] border border-[#2a1a4a] overflow-hidden relative"
                  title={clip.step_id || clip.role || 'title'}
                >
                  <video
                    src={`${clip.url}#t=0.1`}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[0.45rem] font-mono text-white tracking-widest uppercase pointer-events-none">
                    Title
                  </div>
                </div>
              )) : (
                <div className="h-10 flex-1 bg-[#0a0a0a] border border-[#1a1a1a] border-dashed flex items-center justify-center text-[0.5rem] text-[#333]">
                  Titles track (empty)
                </div>
              )}
            </div>
          </div>
          {/* Audio tracks */}
          {['A1', 'A2'].map((track) => (
            <div key={track} className="flex items-center gap-1 mt-1">
              <span className="text-[0.45rem] font-mono text-[#555] w-5 shrink-0">{track}</span>
              <div className="h-6 flex-1 bg-[#0a0a0a] border border-[#1a1a1a] border-dashed flex items-center justify-center text-[0.5rem] text-[#333]">
                {track === 'A1' ? 'Score' : 'SFX'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clips bin — videos only */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold">
            {tier.charAt(0).toUpperCase() + tier.slice(1)} clips &middot; {clips.length}
          </div>
          <div className="text-[0.5rem] text-[#555] font-mono uppercase tracking-wider">
            click to load into monitor
          </div>
        </div>
        {clips.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {clips.map((clip, i) => (
              <button
                key={clip.id}
                onClick={() => setActiveClip(i)}
                className={`border transition-colors overflow-hidden text-left ${
                  i === activeClip
                    ? 'border-[#E50914] bg-[#120003]'
                    : 'border-[#222] bg-[#0a0a0a] hover:border-[#E50914]'
                }`}
                aria-label={`Load clip ${i + 1} into monitor`}
              >
                <div className="aspect-video bg-[#050505] relative">
                  <video
                    src={`${clip.url}#t=0.1`}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-black/60 border border-[#E50914]/60 flex items-center justify-center text-[#E50914] text-sm">
                      &#9654;
                    </div>
                  </div>
                </div>
                <div className="px-1.5 py-1 text-[0.5rem] text-[#888] font-mono truncate flex items-center justify-between gap-2">
                  <span>{labelForClip(clip, i)}</span>
                  {i === activeClip && <span className="text-[#E50914] text-[0.45rem] uppercase tracking-wider">live</span>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[#1a1a1a] bg-[#050505] p-6 text-center">
            <div className="text-[#444] text-xs font-mono">No {tier} clips yet.</div>
          </div>
        )}
      </section>

      {/* Titles bin — Grok-generated title cards (videos) */}
      {titleClips.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[0.55rem] uppercase tracking-wider text-[#888] font-bold">
              Title cards &middot; {titleClips.length}
            </div>
            <div className="text-[0.5rem] text-[#555] font-mono uppercase tracking-wider">
              from titles designer
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {titleClips.map((clip) => (
              <div key={clip.id} className="border border-[#2a1a4a] bg-[#0a0510] overflow-hidden">
                <div className="aspect-video bg-[#050505] relative">
                  <video
                    src={`${clip.url}#t=0.1`}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-1.5 py-1 text-[0.5rem] text-[#aa88ff] font-mono truncate uppercase tracking-wider">
                  {clip.step_id || clip.role || 'title'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ── Editor helpers ── */

function labelForClip(
  clip: { step_id: string | null; role: string | null },
  i: number,
): string {
  const s = clip.step_id || ''
  // Feature pipeline: scene.<n>.video → S<n>
  const scene = s.match(/^scene\.(\d+)\.video$/)
  if (scene) return `S${scene[1]}`
  // Trailer pipeline: editor.trailer_cut (duplicated per clip) → T1, T2…
  if (s === 'editor.trailer_cut' || clip.role === 'trailer-clip') return `T${i + 1}`
  // Short pipeline: editor.scene_cut etc.
  if (s.startsWith('editor.')) return `C${i + 1}`
  return s || clip.role || `C${i + 1}`
}

function labelForStill(
  img: { step_id: string | null; role: string | null },
  i: number,
): string {
  const s = img.step_id || ''
  // Feature pipeline: storyboard.frame_<n> → F<n>
  const frame = s.match(/^storyboard\.frame_(\d+)$/)
  if (frame) return `F${frame[1]}`
  // Trailer/short legacy: storyboard.pack (duplicated) → F1, F2…
  if (s === 'storyboard.pack' || img.role === 'storyboard') return `F${i + 1}`
  return s || img.role || `still-${i + 1}`
}

/** Pretty-print an audio artifact row for the music player. */
function labelForAudio(
  a: { step_id: string | null; role: string | null },
  i: number,
): string {
  const s = a.step_id || ''
  const r = a.role || ''
  if (s === 'composer.theme' || r === 'composer-theme') return 'Main theme'
  if (s === 'composer.themes') return 'Score brief'
  const cue = s.match(/^composer\.cue\.(\d+)$/) || s.match(/^composer\.(\d+)$/)
  if (cue) return `Cue ${cue[1]}`
  if (s.startsWith('composer.')) return s.slice('composer.'.length).replace(/_/g, ' ')
  if (r === 'sound-design' || s.startsWith('sound.')) return `SFX ${i + 1}`
  return s || r || `Track ${i + 1}`
}

function formatAudioTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Lightweight multi-track music player — one shared <audio> drives
 *  everything; transport, seekable progress, volume, and a clickable
 *  playlist sit on top. Auto-advances at track end. Renders a proper
 *  empty state when no audio is committed yet so the tab doesn't
 *  look broken before the composer has run. */
type AudioTrack = { id: number; url: string; step_id: string | null; role: string | null }

function MusicPlayer({ tracks }: { tracks: AudioTrack[] }) {
  const [rawActiveIdx, setActiveIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.9
    const raw = Number(window.localStorage.getItem('bmovies_music_vol'))
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.9
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Clamp inline — if the track list shrinks below the stored index
  // we render position 0 without needing a setState-in-effect round
  // trip that would flash a stale track.
  const activeIdx = tracks.length === 0 ? 0 : Math.min(rawActiveIdx, tracks.length - 1)

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bmovies_music_vol', String(volume))
    }
  }, [volume])

  const activeTrack = tracks[activeIdx]
  const hasTracks = tracks.length > 0
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0

  function playPause() {
    const el = audioRef.current
    if (!el || !activeTrack) return
    if (el.paused) el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    else { el.pause(); setIsPlaying(false) }
  }

  function jumpTo(idx: number, autoplay = true) {
    if (idx < 0 || idx >= tracks.length) return
    setActiveIdx(idx)
    setIsPlaying(autoplay)
    setCurrentTime(0)
    // Let React commit the new src before calling .play().
    setTimeout(() => {
      if (!audioRef.current) return
      if (autoplay) audioRef.current.play().catch(() => setIsPlaying(false))
    }, 0)
  }

  function next() { jumpTo(Math.min(tracks.length - 1, activeIdx + 1)) }
  function prev() { jumpTo(Math.max(0, activeIdx - 1)) }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current
    if (!el) return
    const t = Number(e.target.value)
    el.currentTime = t
    setCurrentTime(t)
  }

  return (
    <div className="border border-[#E50914] bg-black">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-[#222]">
        <span className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold">Music player</span>
        <span className="text-[0.5rem] text-[#666] font-mono">
          {hasTracks ? `Track ${activeIdx + 1} of ${tracks.length}` : 'No tracks yet'}
        </span>
      </div>

      <div className="p-4 md:p-5 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.5rem] uppercase tracking-[0.2em] text-[#666] font-bold mb-1">Now playing</div>
            <div className="text-white text-lg md:text-xl font-black leading-tight truncate" style={{ fontFamily: 'var(--font-bebas)' }}>
              {hasTracks ? labelForAudio(activeTrack, activeIdx) : 'No score committed'}
            </div>
          </div>
          <div className="text-[#888] text-[0.65rem] font-mono shrink-0">
            {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
          </div>
        </div>

        {/* Seek bar: coloured fill + transparent native range on top. */}
        <div className="relative h-2 bg-[#1a0a0a] rounded-sm overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-[#E50914]" style={{ width: `${progressPct}%` }} />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            disabled={!hasTracks || duration <= 0}
            onChange={onSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Seek"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={!hasTracks || activeIdx === 0}
            className="px-3 py-1.5 border border-[#333] hover:border-[#E50914] text-white text-sm disabled:opacity-30"
            aria-label="Previous track"
          >
            &#9664;&#9664;
          </button>
          <button
            type="button"
            onClick={playPause}
            disabled={!hasTracks}
            className="px-5 py-1.5 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider disabled:opacity-30"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!hasTracks || activeIdx >= tracks.length - 1}
            className="px-3 py-1.5 border border-[#333] hover:border-[#E50914] text-white text-sm disabled:opacity-30"
            aria-label="Next track"
          >
            &#9654;&#9654;
          </button>
          <div className="ml-auto flex items-center gap-2 min-w-[140px]">
            <span className="text-[0.55rem] font-mono text-[#666] uppercase tracking-wider">Vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 accent-[#E50914]"
              aria-label="Volume"
            />
          </div>
        </div>

        <audio
          ref={audioRef}
          src={activeTrack?.url}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            if (activeIdx < tracks.length - 1) jumpTo(activeIdx + 1)
            else setIsPlaying(false)
          }}
          className="hidden"
        />
      </div>

      <div className="border-t border-[#1a1a1a]">
        <div className="px-3 py-1.5 border-b border-[#1a1a1a] flex items-center justify-between">
          <span className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">Playlist</span>
          <span className="text-[0.5rem] text-[#555] font-mono">
            {tracks.length} track{tracks.length === 1 ? '' : 's'}
          </span>
        </div>
        {hasTracks ? (
          <ul className="divide-y divide-[#111] max-h-80 overflow-y-auto">
            {tracks.map((t, i) => {
              const active = i === activeIdx
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(i)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                      active ? 'bg-[#120003] text-white' : 'bg-[#050505] hover:bg-[#0f0f0f] text-[#bbb]'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className={`w-6 text-[0.55rem] font-mono ${active ? 'text-[#E50914]' : 'text-[#555]'}`}>
                        {active ? '▶' : String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate text-xs font-mono">{labelForAudio(t, i)}</span>
                    </span>
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[0.5rem] font-bold uppercase tracking-wider text-[#666] hover:text-[#E50914]"
                    >
                      download ↓
                    </a>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="p-6 text-center text-[#444] text-xs font-mono">
            No tracks yet. Commission a theme with the Music Studio below.
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Image lightbox ──
 *
 * Opens a still in-page rather than dumping the raw URL in a new tab.
 * The `img.url` points at a mirrored storage URL served with
 * inline-image content-type, which browsers will happily open full
 * screen but with zero chrome, losing the "back to the editor" thread.
 * The modal keeps users inside the editor, supports arrow-key
 * navigation across a set of images, and closes on Escape / overlay
 * click.
 *
 * Props:
 *   items      — all images in the current set
 *   index      — currently-shown index (null = closed)
 *   onClose    — clear state / close modal
 *   label      — pretty-print function for the caption
 */
function ImageLightbox<T extends { id: number; url: string; step_id: string | null; role: string | null }>({
  items,
  index,
  onClose,
  onIndexChange,
  label,
}: {
  items: T[]
  index: number | null
  onClose: () => void
  onIndexChange: (next: number) => void
  label: (item: T, i: number) => string
}) {
  useEffect(() => {
    if (index === null) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && index !== null && index > 0) onIndexChange(index - 1)
      else if (e.key === 'ArrowRight' && index !== null && index < items.length - 1) onIndexChange(index + 1)
    }
    window.addEventListener('keydown', handleKey)
    // Prevent body scroll while modal is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, items.length, onClose, onIndexChange])

  if (index === null || !items[index]) return null
  const item = items[index]
  const hasPrev = index > 0
  const hasNext = index < items.length - 1

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Still viewer"
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label="Close"
        className="absolute top-3 right-3 md:top-5 md:right-5 w-10 h-10 flex items-center justify-center text-white border border-[#333] hover:border-[#E50914] hover:text-[#E50914] bg-black/60 text-xl font-mono"
      >
        ×
      </button>

      {/* Prev / Next */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1) }}
          aria-label="Previous still"
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white border border-[#333] hover:border-[#E50914] hover:text-[#E50914] bg-black/60 text-xl"
        >
          &#9664;
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1) }}
          aria-label="Next still"
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white border border-[#333] hover:border-[#E50914] hover:text-[#E50914] bg-black/60 text-xl"
        >
          &#9654;
        </button>
      )}

      {/* Image + caption. Stopping propagation on the figure prevents
          the overlay's onClick from firing when the user clicks the
          actual image to examine a detail. */}
      <figure
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3"
      >
        <img
          src={item.url}
          alt={label(item, index)}
          className="max-w-full max-h-[80vh] object-contain border border-[#222] bg-black"
        />
        <figcaption className="flex items-center gap-3 text-[0.6rem] font-mono text-[#888] uppercase tracking-wider">
          <span className="text-[#E50914]">{label(item, index)}</span>
          <span className="text-[#555]">{index + 1} / {items.length}</span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#666] hover:text-[#E50914] underline decoration-dotted"
          >
            open original ↗
          </a>
        </figcaption>
      </figure>
    </div>
  )
}

/* ── Document viewer ──
 *
 * Used by the Documents tab. Each artifact has a `kind` (text / image
 * / video / audio / …) and a `url` (which may be a data: URL for
 * inline text or an https URL for storage-backed files). The viewer
 * picks a renderer per kind:
 *
 *   image   → <img> in the lightbox, object-contain
 *   video   → <video controls>, capped at 80vh
 *   audio   → <audio controls>, plus the filename
 *   text    → fetch the URL (or decode data:) and render <pre>, with
 *             JSON pretty-printed when the content parses as JSON
 *   other   → iframe fallback (PDFs render natively in modern browsers)
 *
 * Close: overlay click / ✕ button / Escape.
 * Navigate: ◀ / ▶ buttons / Left / Right arrows.
 * The "Download" and "Open original" actions stay accessible in the
 * caption so judges can still pull a file out when needed.
 */

// DocumentViewer operates on ArtifactRow directly — the Documents
// tab already has everything this viewer needs. decodeDataUrl lives
// at the top of this file, near ScriptPane, so it can be shared.

// Thin keyed wrapper so internal state (text, textErr, packFrame)
// resets automatically when the viewed document changes. React's
// idiomatic "reset state with key" pattern — avoids setState-in-
// effect reset loops that the react-hooks plugin (correctly) flags.
function DocumentViewer(props: {
  items: ArtifactRow[]
  index: number | null
  onClose: () => void
  onIndexChange: (next: number) => void
  label: (d: ArtifactRow) => string
  dlName: (d: ArtifactRow) => string
}) {
  return <DocumentViewerInner key={props.index ?? 'closed'} {...props} />
}

function DocumentViewerInner({
  items,
  index,
  onClose,
  onIndexChange,
  label,
  dlName,
}: {
  items: ArtifactRow[]
  index: number | null
  onClose: () => void
  onIndexChange: (next: number) => void
  label: (d: ArtifactRow) => string
  dlName: (d: ArtifactRow) => string
}) {
  const [remoteText, setRemoteText] = useState<string | null>(null)
  const [textErr, setTextErr] = useState<string | null>(null)
  // Nested lightbox: when the current doc is a pack (has children),
  // clicking a grid tile sets this to that child's index. Null =
  // showing the grid itself; number = showing a single child frame.
  const [packFrame, setPackFrame] = useState<number | null>(null)

  const item = index !== null ? items[index] : null

  // Inline data: URLs decode synchronously — derive, don't set-state.
  const inlineText = item?.kind === 'text' ? decodeDataUrl(item.url) : null
  const text = inlineText ?? remoteText

  // Only fetch when we have a text item and no inline decode was
  // possible. Component remounts (via outer wrapper key) whenever
  // `index` changes, so no reset-on-change logic is needed here.
  useEffect(() => {
    if (!item || item.kind !== 'text') return
    if (decodeDataUrl(item.url) !== null) return
    let cancelled = false
    fetch(item.url)
      .then((r) => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((t) => { if (!cancelled) setRemoteText(t) })
      .catch((e) => { if (!cancelled) setTextErr(e.message || String(e)) })
    return () => { cancelled = true }
  }, [item])

  // Keyboard + body-scroll management.
  //
  // Nested lightbox takes priority: when a pack frame is open, Esc
  // closes the nested view (back to the grid), and ←/→ navigate
  // across frames within the pack. When no frame is open, the same
  // keys operate on the outer document list.
  useEffect(() => {
    if (index === null) return
    const children = items[index]?.children || []
    function handleKey(e: KeyboardEvent) {
      if (packFrame !== null) {
        if (e.key === 'Escape') setPackFrame(null)
        else if (e.key === 'ArrowLeft' && packFrame > 0) setPackFrame(packFrame - 1)
        else if (e.key === 'ArrowRight' && packFrame < children.length - 1) setPackFrame(packFrame + 1)
        return
      }
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && index !== null && index > 0) onIndexChange(index - 1)
      else if (e.key === 'ArrowRight' && index !== null && index < items.length - 1) onIndexChange(index + 1)
    }
    window.addEventListener('keydown', handleKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [index, items, packFrame, onClose, onIndexChange])

  if (index === null || !item) return null

  const hasPrev = index > 0
  const hasNext = index < items.length - 1

  // Pretty-print JSON text when applicable.
  const displayText = (() => {
    if (text === null) return null
    const trimmed = text.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return JSON.stringify(JSON.parse(trimmed), null, 2) } catch { /* not JSON */ }
    }
    return text
  })()

  const body = (() => {
    // Pack (storyboard / cast / production design): render a grid of
    // children. Each tile is clickable to open the nested lightbox.
    if (item.children && item.children.length > 0) {
      return (
        <div className="max-w-[88vw] max-h-[80vh] overflow-auto p-2">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {item.children.map((c, i) => (
              <button
                key={c.id ?? i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setPackFrame(i) }}
                className="block text-left bg-[#0a0a0a] border border-[#222] hover:border-[#E50914] transition-colors overflow-hidden"
              >
                <div className="aspect-[4/5] bg-[#050505] overflow-hidden">
                  <img src={c.url} alt={c.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="px-2 py-1.5">
                  <div className="text-white text-[0.72rem] truncate">{c.caption || '—'}</div>
                  {c.subtitle && (
                    <div className="text-[#E50914] text-[0.5rem] uppercase tracking-wider mt-0.5">
                      {c.subtitle}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )
    }
    if (item.kind === 'image') {
      return (
        <img
          src={item.url}
          alt={label(item)}
          className="max-w-full max-h-[78vh] object-contain border border-[#222] bg-black"
        />
      )
    }
    if (item.kind === 'video') {
      return (
        <video
          src={item.url}
          controls
          autoPlay
          className="max-w-full max-h-[78vh] border border-[#222] bg-black"
        />
      )
    }
    if (item.kind === 'audio') {
      return (
        <div className="flex flex-col gap-4 items-center">
          <div className="text-6xl text-[#E50914]">♪</div>
          <audio src={item.url} controls autoPlay className="w-[32rem] max-w-full" />
        </div>
      )
    }
    if (item.kind === 'text') {
      if (textErr) return <pre className="text-[#ff6b6b] text-xs font-mono p-6">Failed to load: {textErr}</pre>
      if (displayText === null) return <div className="text-[#666] text-xs p-6">Loading…</div>
      return (
        <pre className="max-w-[80vw] max-h-[78vh] overflow-auto p-6 bg-[#0a0a0a] border border-[#222] text-[#e5e5e5] text-[0.82rem] leading-relaxed font-mono whitespace-pre-wrap break-words">
          {displayText}
        </pre>
      )
    }
    // Fallback — let the browser try (PDFs render inline).
    return (
      <iframe
        src={item.url}
        className="w-[90vw] h-[80vh] border border-[#222] bg-black"
        title={label(item)}
      />
    )
  })()

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Document viewer"
      className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-8"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label="Close"
        className="absolute top-3 right-3 md:top-5 md:right-5 w-10 h-10 flex items-center justify-center text-white border border-[#333] hover:border-[#E50914] hover:text-[#E50914] bg-black/60 text-xl font-mono"
      >
        ×
      </button>

      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1) }}
          aria-label="Previous document"
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white border border-[#333] hover:border-[#E50914] hover:text-[#E50914] bg-black/60 text-xl"
        >
          &#9664;
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1) }}
          aria-label="Next document"
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white border border-[#333] hover:border-[#E50914] hover:text-[#E50914] bg-black/60 text-xl"
        >
          &#9654;
        </button>
      )}

      <figure
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-3 max-w-[92vw]"
      >
        <div className="text-center mb-1">
          <div className="text-[#E50914] text-[0.55rem] font-bold uppercase tracking-[0.2em]">
            {label(item)}
          </div>
          {item.children && item.children.length > 0 && (
            <div className="text-[#666] text-[0.6rem] mt-0.5">
              {item.children.length} items · click any tile to view
            </div>
          )}
        </div>
        {body}
        <figcaption className="flex items-center gap-3 text-[0.6rem] font-mono text-[#888] uppercase tracking-wider flex-wrap justify-center">
          <span className="text-[#555]">{index + 1} / {items.length}</span>
          <span className="text-[#444]">· {item.kind}{item.step_id ? ' · ' + item.step_id : ''}</span>
          {!item.children && (
            <>
              <a
                href={item.url}
                download={dlName(item)}
                onClick={(e) => e.stopPropagation()}
                className="text-[#aaa] hover:text-[#E50914] underline decoration-dotted"
              >
                download ↓
              </a>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#666] hover:text-[#E50914] underline decoration-dotted"
              >
                open original ↗
              </a>
            </>
          )}
        </figcaption>
      </figure>

      {/* ─── Nested pack-frame modal ─── */}
      {packFrame !== null && item.children && item.children[packFrame] && (() => {
        const f = item.children[packFrame]
        const hasPrevFrame = packFrame > 0
        const hasNextFrame = packFrame < item.children.length - 1
        return (
          <div
            onClick={(e) => { e.stopPropagation(); setPackFrame(null) }}
            role="dialog"
            aria-modal="true"
            aria-label={`${label(item)} — ${f.caption || 'frame'}`}
            className="fixed inset-0 z-[210] bg-black/97 flex items-center justify-center p-4 md:p-8"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setPackFrame(null) }}
              aria-label="Close frame"
              className="absolute top-3 right-3 md:top-5 md:right-5 w-10 h-10 flex items-center justify-center text-white border border-[#333] hover:border-[#E50914] hover:text-[#E50914] bg-black/60 text-xl font-mono"
            >
              ×
            </button>
            {hasPrevFrame && (
              <button
                onClick={(e) => { e.stopPropagation(); setPackFrame(packFrame - 1) }}
                aria-label="Previous frame"
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white border border-[#333] hover:border-[#E50914] hover:text-[#E50914] bg-black/60 text-xl"
              >
                &#9664;
              </button>
            )}
            {hasNextFrame && (
              <button
                onClick={(e) => { e.stopPropagation(); setPackFrame(packFrame + 1) }}
                aria-label="Next frame"
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white border border-[#333] hover:border-[#E50914] hover:text-[#E50914] bg-black/60 text-xl"
              >
                &#9654;
              </button>
            )}
            <figure
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-3 max-w-[92vw]"
            >
              <img
                src={f.url}
                alt={f.caption || ''}
                className="max-w-full max-h-[72vh] object-contain border border-[#222] bg-black"
              />
              <figcaption className="text-center max-w-[680px]">
                <div className="text-[#E50914] text-[0.55rem] font-bold uppercase tracking-[0.2em] mb-1">
                  {label(item)} · {packFrame + 1} / {item.children.length}
                </div>
                <div className="text-white text-lg font-black leading-tight" style={{ fontFamily: 'var(--font-bebas)' }}>
                  {f.caption || 'Untitled'}
                </div>
                {f.subtitle && (
                  <div className="text-[#888] text-xs uppercase tracking-wider mt-1">{f.subtitle}</div>
                )}
                {f.description && (
                  <p className="text-[#bbb] text-xs leading-relaxed mt-3 whitespace-pre-wrap text-left">
                    {f.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-[0.55rem] font-mono text-[#666] uppercase tracking-wider mt-3 justify-center">
                  <a
                    href={f.url}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#aaa] hover:text-[#E50914] underline decoration-dotted"
                  >
                    download ↓
                  </a>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-[#E50914] underline decoration-dotted"
                  >
                    open original ↗
                  </a>
                </div>
              </figcaption>
            </figure>
          </div>
        )
      })()}
    </div>
  )
}

/* ── Title Designer ── */

const TITLE_CARD_PRICE_USD = 0.99

// Shape of the pay-picker result we care about. The full module
// lives at /js/pay-picker.js on the brochure side and is loaded at
// runtime (client-only) to avoid pulling vanilla-JS modules into the
// Next.js bundle.
type PayPickerResult = {
  success?: boolean
  cancelled?: boolean
  provider?: string
  txid?: string
  sessionId?: string
}

type PayPickerModule = {
  openPayPicker: (opts: {
    type: 'titles'
    title: string
    offerId: string
    priceUsd: number
    ticker?: string
    email?: string
  }) => Promise<PayPickerResult>
}

function TitleDesignerView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [titleCards, setTitleCards] = useState<{ id: number; kind: string; url: string; step_id: string | null; role: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<null | 'main' | 'end'>(null)
  const [status, setStatus] = useState<string>('')

  const load = useCallback(async () => {
    const { data } = await bmovies
      .from('bct_artifacts')
      .select('id, kind, url, step_id, role')
      .eq('offer_id', projectId)
      .in('kind', ['image', 'video'])
      .or('step_id.like.title%,role.eq.title,role.eq.title-end')
      .is('superseded_by', null)
      .order('created_at', { ascending: false })
    setTitleCards((data as typeof titleCards) || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load().catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [load])

  const videoTitles = titleCards.filter((t) => t.kind === 'video')
  const imageTitles = titleCards.filter((t) => t.kind === 'image')

  // Pay → generate. Opens the shared pay-picker modal (BSV wallets,
  // Stripe, MetaMask/USDC), collects a real payment receipt, then
  // calls /api/titles/generate-one to run Grok with the proof
  // attached. No fake-enthusiastic chat agent, no account gating.
  async function generate(variant: 'main' | 'end') {
    setStatus('')
    setGenerating(variant)
    try {
      // Dynamic runtime-only import — the pay-picker module is a
      // vanilla-JS file served from the brochure's /public and is
      // not part of the Next.js module graph. webpackIgnore keeps
      // the bundler's hands off the path.
      const payPickerUrl = '/js/pay-picker.js'
      const mod = (await import(/* webpackIgnore: true */ /* @vite-ignore */ payPickerUrl)) as unknown as PayPickerModule
      const pay = await mod.openPayPicker({
        type: 'titles',
        title: projectTitle,
        offerId: projectId,
        priceUsd: TITLE_CARD_PRICE_USD,
      })
      if (!pay || pay.cancelled) { setGenerating(null); return }
      if (!pay.success) { setStatus('Payment did not complete.'); setGenerating(null); return }

      setStatus('Payment confirmed. Generating title card with Grok — this takes ~30s…')
      const res = await fetch('/api/titles/generate-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: projectId,
          variant,
          payment: {
            provider: pay.provider || 'unknown',
            txid: pay.txid,
            sessionId: pay.sessionId,
            priceUsd: TITLE_CARD_PRICE_USD,
          },
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setStatus(`Generation failed: ${j.error || res.statusText}`); setGenerating(null); return }
      setStatus('Title card generated. Reloading gallery…')
      await load()
      setStatus('')
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
          Title Designer
        </div>
        <h2 className="text-3xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
          Title cards for <span className="text-[#E50914]">{projectTitle}</span>
        </h2>
        <div className="text-[#888] text-xs mt-1">
          Real motion graphics. Grok Imagine Video generates the title reveal — you pay once, you get the mp4.
        </div>
      </div>

      {/* Pay-and-generate panel — honest priced action, not an AI chat popup. */}
      <div className="border border-[#2a1a4a] bg-[#0a0510] p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#aa88ff] font-bold mb-1">
            Generate a title card
          </div>
          <div className="text-white text-lg font-black leading-tight" style={{ fontFamily: 'var(--font-bebas)' }}>
            ${TITLE_CARD_PRICE_USD.toFixed(2)} · 8-second animated reveal
          </div>
          <div className="text-[#888] text-xs mt-1">
            Pay with BSV (HandCash / BRC-100), Stripe, or cross-chain USDC. Grok runs as soon as the tx confirms.
          </div>
          {status && <div className="text-[#aa88ff] text-xs mt-2 font-mono">{status}</div>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={generating !== null}
            onClick={() => generate('main')}
            className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating === 'main' ? 'Working…' : `Generate main reveal · $${TITLE_CARD_PRICE_USD.toFixed(2)}`}
          </button>
          <button
            type="button"
            disabled={generating !== null}
            onClick={() => generate('end')}
            className="px-4 py-2 bg-transparent border border-[#E50914] hover:bg-[#1a0003] text-[#E50914] text-[0.65rem] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating === 'end' ? 'Working…' : `End card · $${TITLE_CARD_PRICE_USD.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* ── Grok-generated motion title cards ──────────────────────── */}
      <div>
        <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-3">
          Motion title cards · Grok Imagine Video
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            <div className="aspect-video bg-[#0a0a0a] border border-[#1a1a1a]" />
            <div className="aspect-video bg-[#0a0a0a] border border-[#1a1a1a]" />
          </div>
        ) : videoTitles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {videoTitles.map((tc) => (
              <div key={tc.id} className="border border-[#2a1a4a] bg-[#0a0510] overflow-hidden hover:border-[#E50914] transition-colors">
                <div className="aspect-video bg-black">
                  <video
                    src={tc.url}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover bg-black"
                  />
                </div>
                <div className="px-2 py-1.5 text-[0.5rem] text-[#aa88ff] font-mono uppercase tracking-wider flex items-center justify-between">
                  <span>{tc.step_id || tc.role || 'title'}</span>
                  <a
                    href={tc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#666] hover:text-[#E50914] underline decoration-dotted"
                  >
                    open ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[#666] text-sm">
            No Grok-generated title cards yet — pay above to have one rendered, or they&apos;ll be produced during the trailer pipeline.
          </div>
        )}
      </div>

      {/* ── Still title cards (images) ─────────────────────────────── */}
      {imageTitles.length > 0 && (
        <div>
          <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold mb-3">
            Still title cards
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {imageTitles.map((tc) => (
              <div key={tc.id} className="border border-[#222] bg-[#0a0a0a] overflow-hidden hover:border-[#E50914] transition-colors">
                <div className="aspect-video bg-[#050505]">
                  <img src={tc.url} alt="Title card" className="w-full h-full object-cover" loading="lazy" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
    <div className="space-y-8">
      {/* ─── Unified music player ─── */}
      {loading ? (
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] animate-pulse h-64" />
      ) : (
        <MusicPlayer tracks={audioArtifacts} />
      )}

      {/* ─── Music Studio ─── */}
      <MusicStudio projectId={projectId} projectTitle={projectTitle} />

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
    </div>
  )
}

/* ── Preview ──
 *
 * Watch screen for the current cut. Picks the best video artifact
 * per tier and plays it in an inline player. A "Present fullscreen"
 * button drops the whole thing into the browser's native fullscreen
 * mode so a commissioner can show the film on a laptop for pitches.
 *
 * Pipeline mapping (in priority order for each tier):
 *   feature : editor.picture_lock → editor.fine_cut → scene.<n>.video
 *   short   : editor.picture_lock → editor.rough_cut → scene.<n>.video
 *   trailer : editor.trailer_cut  (may be multiple clips — stitched in
 *             sequence via a playlist cursor, same as MovieEditorView)
 *   pitch   : no playable cut yet — shows a friendly explainer
 */

type PreviewClip = { id: number; url: string; step_id: string | null; role: string | null }

interface TitleCard { t: number; text: string; duration?: number }

function PreviewView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [tier, setTier] = useState<string>('pitch')
  const [clips, setClips] = useState<PreviewClip[]>([])
  const [frames, setFrames] = useState<string[]>([])        // image URLs for slideshow fallback
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [voUrl, setVoUrl] = useState<string | null>(null)   // voiceover narration audio
  const [musicUrl, setMusicUrl] = useState<string | null>(null)  // music bed
  const [titleCards, setTitleCards] = useState<TitleCard[]>([])  // {t, text, duration} timeline
  const [currentTitle, setCurrentTitle] = useState<string | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [slideIdx, setSlideIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [autoplayErr, setAutoplayErr] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const voRef = useRef<HTMLAudioElement | null>(null)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const elapsedRef = useRef(0)  // seconds into the composite playback
  // All clips render as stacked <video> elements. Swapping which one
  // is visible (instead of tearing down + rebuilding the element via
  // React's `key`) means the next clip stays pre-buffered and there's
  // no loading wheel between clips. videoRefs parallels `clips`.
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)

      // Walk DOWN from the root (current projectId) to find every
      // descendant in this lineage. Each tier has its own artifacts —
      // the preview should show the highest-tier video available, so
      // we aggregate across the whole lineage before picking.
      const lineageIds: string[] = [projectId]
      let leafTier: string = 'pitch'
      let cursor: string = projectId
      for (let i = 0; i < 3; i++) {
        // Skip alt trailers — private to the Alt tab only.
        const { data: children } = await bmovies
          .from('bct_offers')
          .select('id, tier, pipeline_state')
          .eq('parent_offer_id', cursor)
        const canonical = (children as Array<{ id: string; tier: string; pipeline_state?: { is_alt?: boolean } }> | null)
          ?.find((c) => !c.pipeline_state?.is_alt)
        if (!canonical) break
        lineageIds.push(canonical.id)
        leafTier = canonical.tier
        cursor = canonical.id
      }
      if (lineageIds.length === 1) {
        const { data: rootOffer }: { data: { tier: string } | null } = await bmovies
          .from('bct_offers')
          .select('tier')
          .eq('id', projectId)
          .maybeSingle()
        if (rootOffer?.tier) leafTier = rootOffer.tier
      }

      // Preview plays the layered deliverable — clips + VO + music +
      // title overlays — so we load every kind, not just video/image.
      const artsP = bmovies.from('bct_artifacts')
        .select('id, kind, url, step_id, role, created_at, offer_id')
        .in('offer_id', lineageIds)
        .in('kind', ['video', 'image', 'audio', 'text'])
        .is('superseded_by', null)
        .order('created_at', { ascending: true })
      const artsRes = await artsP
      if (cancelled) return
      const t = leafTier
      const arts = ((artsRes.data as any[]) || []) as (PreviewClip & { kind: string })[]

      const videos = arts.filter((a) => a.kind === 'video')
      const images = arts.filter((a) => a.kind === 'image')
      const audios = arts.filter((a) => a.kind === 'audio')
      const texts = arts.filter((a) => a.kind === 'text')

      const dedupe = <T extends { url: string }>(xs: T[]) =>
        Array.from(new Map(xs.map((x) => [x.url, x])).values())

      // ── Videos: tier-aware priority picker ─────────────────────
      const videosDeduped = dedupe(videos)
      const pick = (steps: string[]) => {
        for (const step of steps) {
          const match = videosDeduped.filter((a) => (a.step_id || '') === step)
          if (match.length > 0) return match
        }
        return []
      }
      let picked: PreviewClip[] = []
      if (t === 'feature')      picked = pick(['editor.picture_lock', 'editor.fine_cut'])
      else if (t === 'short')   picked = pick(['editor.picture_lock', 'editor.rough_cut'])
      else if (t === 'trailer') picked = pick(['editor.trailer_cut'])
      if (picked.length === 0) {
        // Fall back to any scene clips we find.
        const scenes = videosDeduped
          .filter((a) => (a.step_id || '').startsWith('scene.'))
          .sort((a, b) => {
            const nA = Number((a.step_id || '').match(/scene\.(\d+)/)?.[1] ?? 0)
            const nB = Number((b.step_id || '').match(/scene\.(\d+)/)?.[1] ?? 0)
            return nA - nB
          })
        picked = scenes
      }
      // If still empty, just play whatever video we do have.
      if (picked.length === 0 && videosDeduped.length > 0) picked = videosDeduped

      // ── Frames: teaser/storyboard slideshow fallback ──────────
      const frameRows = images.filter((a) => {
        const s = a.step_id || ''
        return (
          (s.startsWith('storyboard.') && s !== 'storyboard.poster') ||
          s.startsWith('pitch.teaser_frame_')
        )
      })
      const frameUrls = dedupe(frameRows)
        .sort((a, b) => {
          const nA = Number((a.step_id || '').match(/_(\d+)$/)?.[1] ?? 0)
          const nB = Number((b.step_id || '').match(/_(\d+)$/)?.[1] ?? 0)
          return nA - nB
        })
        .map((r) => r.url)

      // ── Poster: final fallback ────────────────────────────────
      const poster =
        images.find((a) => (a.step_id || '') === 'storyboard.poster' || a.role === 'poster')
          ?.url || null

      // ── Post-production layers — VO, music, titles ─────────────
      // Post-production produces:
      //   vo.trailer_narration   audio · ElevenLabs VO
      //   composer.trailer_score audio · MusicGen bed
      //   editor.trailer_titles  text  · JSON title-card timeline
      //     [{t:0, text:"In a world..."}, {t:8, text:"One man..."}, ...]
      // We load and layer them during playback so the preview delivers
      // the full trailer experience, not just raw clips.
      const vo = audios.find((a) => (a.step_id || '').includes('vo.'))?.url || null
      const music = audios.find((a) => (a.step_id || '').includes('composer.'))?.url || null

      let cards: TitleCard[] = []
      const titlesText = texts.find((a) => (a.step_id || '') === 'editor.trailer_titles')
      if (titlesText?.url) {
        try {
          // Artifacts of kind=text may be data-urls or remote URLs.
          let raw: string
          if (titlesText.url.startsWith('data:')) {
            const comma = titlesText.url.indexOf(',')
            const head = titlesText.url.slice(5, comma)
            const body = titlesText.url.slice(comma + 1)
            raw = head.includes(';base64') ? atob(body) : decodeURIComponent(body)
          } else {
            raw = await fetch(titlesText.url).then((r) => r.text()).catch(() => '')
          }
          const parsed = JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim())
          if (Array.isArray(parsed)) {
            cards = parsed
              .map((c: any) => ({
                t: Number(c.t ?? c.at ?? 0),
                text: String(c.text ?? c.card ?? ''),
                duration: c.duration ? Number(c.duration) : undefined,
              }))
              .filter((c) => c.text.length > 0)
              .sort((a, b) => a.t - b.t)
          }
        } catch (err) {
          console.warn('[preview] title-cards parse failed:', err)
        }
      }

      setTier(t)
      setClips(picked)
      setFrames(frameUrls)
      setPosterUrl(poster)
      setVoUrl(vo)
      setMusicUrl(music)
      setTitleCards(cards)
      setActiveIdx(0)
      setSlideIdx(0)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  // Slideshow ticker — only runs when we're in slideshow mode (no
  // videos, but we have frames to cycle through).
  useEffect(() => {
    if (clips.length > 0 || frames.length < 2) return
    const id = window.setInterval(() => {
      setSlideIdx((i) => (i + 1) % frames.length)
    }, 3200)
    return () => window.clearInterval(id)
  }, [clips.length, frames.length])

  function onClipEnd() {
    // Add finished clip's duration to elapsed before moving to the next.
    const finished = videoRefs.current[activeIdx]
    if (finished) elapsedRef.current += finished.duration || 8
    if (activeIdx < clips.length - 1) {
      setActiveIdx((i) => i + 1)
    } else {
      // End of reel — stop audio, reset elapsed.
      try { voRef.current?.pause() } catch {}
      try { musicRef.current?.pause() } catch {}
      elapsedRef.current = 0
      setCurrentTitle(null)
    }
  }

  // Drive title overlays + start audio tracks in sync with video playback.
  useEffect(() => {
    if (clips.length === 0) return
    const video = videoRefs.current[activeIdx]
    if (!video) return

    const onPlay = () => {
      // Start VO and music only on first clip; they span the whole reel.
      if (activeIdx === 0) {
        if (voRef.current) {
          try { voRef.current.currentTime = 0; voRef.current.play().catch(() => {}) } catch {}
        }
        if (musicRef.current) {
          try {
            musicRef.current.currentTime = 0
            musicRef.current.volume = 0.35  // duck music under VO
            musicRef.current.play().catch(() => {})
          } catch {}
        }
      }
    }
    const onPause = () => {
      try { voRef.current?.pause() } catch {}
      try { musicRef.current?.pause() } catch {}
    }
    const onTimeUpdate = () => {
      const now = elapsedRef.current + (video.currentTime || 0)
      // Find the most recent title card whose `t` <= now, applying
      // duration if present. Empty gap between cards → no overlay.
      let active: string | null = null
      for (const card of titleCards) {
        if (card.t <= now) {
          const endT = card.duration ? card.t + card.duration : card.t + 4
          if (now < endT) { active = card.text; break }
          active = null
        } else {
          break
        }
      }
      setCurrentTitle(active)
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [activeIdx, clips.length, titleCards])

  // Drive playback imperatively when activeIdx changes. All clips
  // live in the DOM stacked; we just pause the outgoing one and
  // play the incoming one. Since the incoming <video> has had
  // preload="auto" running since mount, it's already buffered and
  // playback starts immediately — no loading wheel between clips.
  useEffect(() => {
    if (clips.length === 0) return
    const next = videoRefs.current[activeIdx]
    videoRefs.current.forEach((v, i) => {
      if (!v || i === activeIdx) return
      try { v.pause() } catch {}
    })
    if (!next) return
    // Reset to the start each time so manual clip picks replay from 0.
    try { next.currentTime = 0 } catch {}
    const p = next.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => setAutoplayErr(true))
    }
  }, [activeIdx, clips.length])

  async function enterFullscreen() {
    const el = wrapperRef.current
    if (!el) return
    try {
      if (el.requestFullscreen) await el.requestFullscreen()
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen()
      // Kick playback on the currently-active video; slideshows keep
      // cycling via the existing interval.
      const active = videoRefs.current[activeIdx]
      if (active) {
        try { await active.play() } catch { setAutoplayErr(true) }
      }
    } catch (err) {
      console.warn('[preview] fullscreen failed:', err)
    }
  }

  // ── Decide the render mode ONCE — the screen itself always renders.
  //      video     → real video playback (trailer/short/feature hero cut)
  //      slideshow → cycling teaser/storyboard frames (pitch pseudo-preview)
  //      poster    → static poster with overlay
  //      empty     → dark screen with "No preview yet" message
  const mode: 'video' | 'slideshow' | 'poster' | 'empty' =
    clips.length > 0 ? 'video' :
    frames.length > 0 ? 'slideshow' :
    posterUrl ? 'poster' :
    'empty'

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)

  return (
    <div>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
            Preview · {tierLabel}
          </div>
          <h2 className="text-3xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            {projectTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={enterFullscreen}
          disabled={mode === 'empty'}
          className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ▢ Present fullscreen
        </button>
      </div>

      {/* The preview SCREEN — always renders, even when there's no
          content. That way the tab delivers on its name: you always
          see a 16:9 preview surface. */}
      <div
        ref={wrapperRef}
        className="relative border border-[#E50914] bg-black overflow-hidden"
      >
        {loading ? (
          <div className="w-full aspect-video bg-[#0a0a0a] animate-pulse" />
        ) : mode === 'video' ? (
          // Stacked video players — one per clip. The active clip is
          // visible and on top; all the others are invisible but still
          // preloading (preload="auto") so switching to them is
          // instant. We never tear down a <video> element, which was
          // the root cause of the between-clips loading wheel.
          <div className="relative w-full aspect-video bg-black">
            {clips.map((clip, i) => {
              const isActive = i === activeIdx
              // Be gentle on bandwidth: active + immediate neighbours
              // preload the full file; everything further away only
              // fetches metadata. In practice trailers have 4-6 clips
              // so this ends up preloading the whole reel anyway, but
              // it keeps us sane for longer short/feature reels.
              const preload = Math.abs(i - activeIdx) <= 1 ? 'auto' : 'metadata'
              return (
                <video
                  key={clip.id}
                  ref={(el) => { videoRefs.current[i] = el }}
                  src={clip.url}
                  preload={preload}
                  playsInline
                  controls={isActive}
                  onEnded={isActive ? onClipEnd : undefined}
                  onWaiting={isActive ? () => setBuffering(true) : undefined}
                  onPlaying={isActive ? () => setBuffering(false) : undefined}
                  onCanPlay={isActive ? () => setBuffering(false) : undefined}
                  className={`absolute inset-0 w-full h-full object-contain bg-black transition-opacity duration-100 ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                />
              )
            })}
            {buffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-20">
                <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {/* Title-card overlay — text driven by the trailer_titles
                JSON timeline. Sits above the video, below the
                buffering spinner. Fades in/out as cards fire. */}
            {currentTitle && (
              <div className="absolute inset-x-0 bottom-[10%] z-20 pointer-events-none flex justify-center px-6">
                <div
                  className="text-white text-center font-black leading-tight uppercase tracking-wide"
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: 'clamp(1.2rem, 3.5vw, 2.8rem)',
                    textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)',
                    maxWidth: '90%',
                  }}
                >
                  {currentTitle}
                </div>
              </div>
            )}
            {/* Hidden audio tracks — VO on top, music bed under */}
            {voUrl && (
              <audio ref={voRef} src={voUrl} preload="auto" crossOrigin="anonymous" />
            )}
            {musicUrl && (
              <audio ref={musicRef} src={musicUrl} preload="auto" crossOrigin="anonymous" />
            )}
          </div>
        ) : mode === 'slideshow' ? (
          <div className="w-full aspect-video bg-black relative">
            {frames.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`Teaser frame ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                style={{ opacity: i === slideIdx ? 1 : 0 }}
              />
            ))}
            {/* Subtle vignette so text overlays read well in fullscreen */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%)',
            }} />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[0.55rem] font-mono uppercase tracking-wider text-white/70 pointer-events-none">
              <span>Teaser reel · {slideIdx + 1} / {frames.length}</span>
              <span>pitch slideshow</span>
            </div>
          </div>
        ) : mode === 'poster' ? (
          <div className="w-full aspect-video bg-black relative">
            <img
              src={posterUrl!}
              alt={`${projectTitle} poster`}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="text-center">
                <div className="text-[0.55rem] uppercase tracking-[0.25em] text-white/60 font-bold mb-1">
                  No cut yet
                </div>
                <div className="text-white font-black text-2xl" style={{ fontFamily: 'var(--font-bebas)' }}>
                  Upgrade to generate <span className="text-[#E50914]">a trailer</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video bg-black relative flex items-center justify-center">
            <div className="text-center px-4">
              <div className="text-5xl text-[#333] mb-4">&#9654;</div>
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-[#666] font-bold mb-1">
                Preview
              </div>
              <div className="text-white font-black text-2xl leading-tight" style={{ fontFamily: 'var(--font-bebas)' }}>
                Nothing to <span className="text-[#E50914]">play</span> yet
              </div>
              <div className="text-[#888] text-xs mt-2 max-w-md mx-auto">
                Videos, teaser frames, or the poster will appear here as the pipeline produces them.
              </div>
            </div>
          </div>
        )}
        {autoplayErr && mode === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-none">
            <div className="text-white text-sm">Click play — autoplay was blocked.</div>
          </div>
        )}
      </div>

      {/* Clip picker — only shown for multi-clip videos (trailer reels). */}
      {mode === 'video' && clips.length > 1 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {clips.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`px-3 py-1.5 text-[0.55rem] font-mono uppercase tracking-wider border ${
                i === activeIdx
                  ? 'bg-[#E50914] border-[#E50914] text-white'
                  : 'bg-transparent border-[#333] text-[#888] hover:border-[#E50914]'
              }`}
            >
              Clip {i + 1} of {clips.length}
            </button>
          ))}
        </div>
      )}

      {/* Frame picker — jump around the teaser slideshow manually. */}
      {mode === 'slideshow' && frames.length > 1 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {frames.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlideIdx(i)}
              className={`px-3 py-1.5 text-[0.55rem] font-mono uppercase tracking-wider border ${
                i === slideIdx
                  ? 'bg-[#E50914] border-[#E50914] text-white'
                  : 'bg-transparent border-[#333] text-[#888] hover:border-[#E50914]'
              }`}
            >
              F{i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 text-[0.6rem] text-[#666] font-mono">
        {mode === 'video'     && `${clips.length} clip${clips.length === 1 ? '' : 's'} · tier: ${tier}`}
        {mode === 'slideshow' && `${frames.length} teaser frame${frames.length === 1 ? '' : 's'} · tier: ${tier} · auto-cycles every 3s`}
        {mode === 'poster'    && `Poster only · tier: ${tier}`}
        {mode === 'empty'     && `No content yet · tier: ${tier}`}
      </div>

      {tier === 'pitch' && mode !== 'video' && (
        <a
          href={`/offer.html?id=${encodeURIComponent(projectId)}`}
          className="inline-block mt-4 text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white"
        >
          Upgrade this pitch →
        </a>
      )}
    </div>
  )
}

/* ── Publish ──
 *
 * Lists a slice of the project's royalty shares on the public
 * exchange. The commissioner still keeps 99% by default (1% was
 * minted to the platform treasury at commission time); this tool
 * peels off a tranche from the 99% and posts it as a bct_share_listings
 * row with status='open' so /exchange and /offer surfaces can sell it.
 *
 * Defaults by tier (the "cost to upgrade" ladder in the brief):
 *   pitch   →  10% @ $9.99   (already live from commission; shown
 *                              for completeness but marked as posted)
 *   trailer →  10% @ $99     (total list price, split across shares)
 *   short   →  10% @ $999
 *   feature →  10% @ $9,999  (marketing budget cut)
 *
 * Everything is user-discretionary above the minimum tranche size
 * enforced by the API (see api/feature/list-shares.ts).
 *
 * Shares math: 1% of a film = 10,000,000 shares (1B total supply).
 * price_per_share_cents = target_total_usd * 100 / shares_offered.
 */

type TierKey = 'pitch' | 'trailer' | 'short' | 'feature'

const TIER_DEFAULTS: Record<TierKey, { totalUsd: number; percent: number; nextLabel: string }> = {
  pitch:   { totalUsd: 9.99,   percent: 10, nextLabel: 'upgrade to Trailer' },
  trailer: { totalUsd: 99,     percent: 10, nextLabel: 'upgrade to Short' },
  short:   { totalUsd: 999,    percent: 10, nextLabel: 'upgrade to Feature' },
  feature: { totalUsd: 9999,   percent: 10, nextLabel: 'marketing tranche' },
}

type KycStatus = 'verified' | 'pending' | 'submitted' | 'rejected' | 'not_started'

function PublishView({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [tier, setTier] = useState<TierKey>('pitch')
  const [status, setStatus] = useState<string>('draft')
  const [ticker, setTicker] = useState<string>('')
  const [existing, setExisting] = useState<{ id: number; price_per_share_cents: number; shares_offered: number; status: string }[]>([])
  const [loading, setLoading] = useState(true)

  const [percent, setPercent] = useState<number>(10)
  const [totalUsd, setTotalUsd] = useState<number>(9.99)
  const [floorUsd, setFloorUsd] = useState<string>('')   // optional; empty = no floor
  const [accountId, setAccountId] = useState<string | null>(null)
  const [kycStatus, setKycStatus] = useState<KycStatus>('not_started')

  // Two independent actions — list shares on the exchange, publish the
  // film to /watch. The original single-button UI conflated them; now
  // each has its own submitting/err/ok state so a failure on one side
  // doesn't blank the other's feedback.
  const [listing, setListing] = useState(false)
  const [listErr, setListErr] = useState<string | null>(null)
  const [listOk, setListOk] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [pubErr, setPubErr] = useState<string | null>(null)
  const [pubOk, setPubOk] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const offerP = bmovies
        .from('bct_offers')
        .select('tier, status, token_ticker')
        .eq('id', projectId)
        .maybeSingle()
      const listP = bmovies
        .from('bct_share_listings')
        .select('id, price_per_share_cents, shares_offered, status')
        .eq('offer_id', projectId)
        .order('created_at', { ascending: false })
      const sessionP = bmovies.auth.getSession()
      const [offerRes, listRes, sessRes] = await Promise.all([offerP, listP, sessionP])
      if (cancelled) return

      const offer = (offerRes.data as { tier?: string; status?: string; token_ticker?: string } | null) || {}
      const t = (['pitch', 'trailer', 'short', 'feature'].includes(offer.tier || '') ? (offer.tier as TierKey) : 'pitch')
      setTier(t)
      setStatus(offer.status || 'draft')
      setTicker(offer.token_ticker || '')

      const def = TIER_DEFAULTS[t]
      setPercent(def.percent)
      setTotalUsd(def.totalUsd)

      setExisting((listRes.data as any[]) || [])

      const user = sessRes.data.session?.user
      if (user) {
        const { data: acct } = await bmovies
          .from('bct_accounts')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        const acctId = (acct as { id?: string } | null)?.id || null
        if (!cancelled) setAccountId(acctId)

        // Pre-check KYC so we can gate the form instead of letting the
        // user fill it out and then hit a 403. /api/kyc-status returns
        // 'not_started' if there's no row at all, and we treat
        // anything other than 'verified' as "can't list".
        if (acctId) {
          try {
            const kycRes = await fetch(`/api/kyc-status?accountId=${encodeURIComponent(acctId)}`)
            if (kycRes.ok) {
              const kycPayload = await kycRes.json()
              if (!cancelled) setKycStatus((kycPayload?.status as KycStatus) || 'not_started')
            }
          } catch {
            // Non-fatal — leave as 'not_started' so the gate shows.
          }
        }
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  // Derived values for the summary panel.
  const SHARES_PER_PERCENT = 10_000_000
  const sharesOffered = Math.floor(percent * SHARES_PER_PERCENT)
  const pricePerShareCents = sharesOffered > 0 ? (totalUsd * 100) / sharesOffered : 0
  const floorCents = floorUsd.trim() ? Number(floorUsd.trim()) * 100 : null
  const sharesValid = sharesOffered >= 100_000 && sharesOffered <= 99 * SHARES_PER_PERCENT
  const priceValid = pricePerShareCents > 0 && pricePerShareCents <= 100_000  // $1,000/share ceiling
  const kycVerified = kycStatus === 'verified'
  const canPublish = status === 'draft'   // server enforces this too; we mirror for UX

  async function refreshListings() {
    const { data: refetched } = await bmovies
      .from('bct_share_listings')
      .select('id, price_per_share_cents, shares_offered, status')
      .eq('offer_id', projectId)
      .order('created_at', { ascending: false })
    setExisting((refetched as any[]) || [])
  }

  // ─── Action 1: list a tranche on the exchange ─────────────────
  async function submitListing() {
    if (!sharesValid || !priceValid) {
      setListErr('Shares or price out of range — minimum 0.01%, max 99%, max $1,000/share.')
      return
    }
    setListErr(null); setListOk(null); setListing(true)
    try {
      const res = await fetch('/api/feature/list-shares?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: projectId,
          sharesOffered,
          pricePerShareCents: Math.round(pricePerShareCents * 100) / 100,
          accountId,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Surface KYC errors distinctly so the user knows where to go.
        if (payload?.code === 'kyc_not_verified' || payload?.code === 'kyc_account_missing') {
          setKycStatus((payload?.kycStatus as KycStatus) || 'not_started')
          throw new Error(payload?.error || 'KYC required')
        }
        throw new Error(payload?.error || `HTTP ${res.status}`)
      }
      setListOk(`Listing created · ${percent}% of ${ticker || 'this film'} now live on the exchange.`)
      await refreshListings()
    } catch (err) {
      setListErr((err as Error).message || 'Failed to list shares.')
    } finally {
      setListing(false)
    }
  }

  // ─── Action 2: publish the film to /watch ─────────────────────
  async function submitPublish() {
    setPubErr(null); setPubOk(null); setPublishing(true)
    try {
      const res = await fetch('/api/feature/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: projectId, accountId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (payload?.code === 'kyc_not_verified' || payload?.code === 'kyc_account_missing') {
          setKycStatus((payload?.kycStatus as KycStatus) || 'not_started')
          throw new Error(payload?.error || 'KYC required')
        }
        throw new Error(payload?.error || `HTTP ${res.status}`)
      }
      setPubOk(`Published · live on /watch.html. ${payload?.watchUrl ? '' : ''}`)
      setStatus('published')
    } catch (err) {
      setPubErr((err as Error).message || 'Failed to publish.')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-32 bg-[#0a0a0a] border border-[#1a1a1a]" />
        <div className="h-64 bg-[#0a0a0a] border border-[#1a1a1a]" />
      </div>
    )
  }

  const def = TIER_DEFAULTS[tier]
  const openListings = existing.filter((l) => l.status === 'open')

  return (
    <div>
      <div className="mb-6">
        <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-1">
          Publish · {tier}
        </div>
        <h2 className="text-3xl font-black leading-none text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
          Ship <span className="text-[#E50914]">{projectTitle}</span>
        </h2>
        <p className="text-[#888] text-sm mt-2 max-w-2xl">
          Two actions on this tab.{' '}
          <strong className="text-white">List shares</strong> opens a tranche of this
          {' '}{tier}&apos;s royalty tokens on the exchange so investors can buy in and
          fund the next tier.{' '}
          <strong className="text-white">Publish</strong> flips the film live on{' '}
          <code className="text-[0.75rem] text-[#E50914]">/watch</code> so the
          audience can buy tickets. Both require a verified identity on file.
        </p>
      </div>

      {/* ─── KYC gate banner ─────────────────────────────────────
         Royalty share listings are primary securities issuance, so we
         enforce KYC both server-side (api/feature/list-shares.ts,
         api/feature/publish.ts) and client-side as a UX shortcut so
         users don't fill out a form that's going to 403.           */}
      <div className={`mb-6 border p-4 flex items-start justify-between gap-4 flex-wrap ${
        kycVerified
          ? 'border-[#1a5a1a] bg-[#0c1f0c]'
          : 'border-[#5a4a1a] bg-[#1f1a08]'
      }`}>
        <div className="min-w-0">
          <div className="text-[0.55rem] uppercase tracking-[0.2em] font-bold mb-1"
               style={{ color: kycVerified ? '#6bff8a' : '#f7c14b' }}>
            {kycVerified ? 'Identity verified' : 'Identity check required'}
          </div>
          <div className="text-white text-sm leading-relaxed">
            {kycVerified ? (
              <>You&apos;re cleared to list royalty shares and publish films.</>
            ) : kycStatus === 'pending' || kycStatus === 'submitted' ? (
              <>Your KYC submission is being reviewed. Listing + publish will unlock once it&apos;s approved.</>
            ) : kycStatus === 'rejected' ? (
              <>Your previous KYC submission was rejected. Please restart from the account tab.</>
            ) : (
              <>Royalty shares are a regulated issuance. Verify your identity once to list any of your films on the exchange or publish to <code>/watch</code>.</>
            )}
          </div>
        </div>
        {!kycVerified && (
          <a
            href="/account?section=wallet"
            className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 bg-[#f7c14b] hover:bg-[#ffd774] text-black shrink-0"
          >
            Verify identity →
          </a>
        )}
      </div>

      {/* ─── Action 1: list a tranche on the exchange ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="border border-[#222] bg-[#0a0a0a] p-5 space-y-4">
          <div className="pb-3 border-b border-[#222]">
            <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold">
              Step 1
            </div>
            <h3 className="text-white text-lg font-black leading-tight" style={{ fontFamily: 'var(--font-bebas)' }}>
              List shares on exchange
            </h3>
            <p className="text-[#888] text-xs mt-1">
              Default preset: <strong className="text-white">{def.percent}%</strong> for{' '}
              <strong className="text-white">${def.totalUsd.toLocaleString()}</strong> total
              (the {def.nextLabel} cost). Adjust any field — the rest of your 99%
              stays with you.
            </p>
          </div>

          <div>
            <label className="block text-[0.55rem] uppercase tracking-wider text-[#888] font-bold mb-1">
              Percent of supply to release
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.01} max={99} step={0.01}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min={0.01} max={99} step={0.01}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="w-24 bg-[#050505] border border-[#222] text-white px-2 py-1.5 font-mono text-sm focus:outline-none focus:border-[#E50914]"
              />
              <span className="text-[#666] text-[0.65rem] font-mono">%</span>
            </div>
            <div className="mt-1 text-[0.6rem] text-[#555] font-mono">
              = {sharesOffered.toLocaleString()} shares out of 1,000,000,000 total
            </div>
          </div>

          <div>
            <label className="block text-[0.55rem] uppercase tracking-wider text-[#888] font-bold mb-1">
              Total list price (USD)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[#666] text-sm">$</span>
              <input
                type="number"
                min={0.01} step={0.01}
                value={totalUsd}
                onChange={(e) => setTotalUsd(Number(e.target.value))}
                className="flex-1 bg-[#050505] border border-[#222] text-white px-3 py-1.5 font-mono focus:outline-none focus:border-[#E50914]"
              />
            </div>
            <div className="mt-1 text-[0.6rem] text-[#555] font-mono">
              = ${pricePerShareCents.toFixed(4)}¢ per share
            </div>
          </div>

          <div>
            <label className="block text-[0.55rem] uppercase tracking-wider text-[#888] font-bold mb-1">
              Floor price per share (USD, optional)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[#666] text-sm">$</span>
              <input
                type="number"
                min={0} step={0.0001}
                value={floorUsd}
                onChange={(e) => setFloorUsd(e.target.value)}
                placeholder="no floor"
                className="flex-1 bg-[#050505] border border-[#222] text-white px-3 py-1.5 font-mono focus:outline-none focus:border-[#E50914]"
              />
            </div>
            <div className="mt-1 text-[0.6rem] text-[#555] font-mono">
              {floorCents === null ? 'Buyers can bid below list with no minimum.' : `Minimum accepted price: $${(floorCents / 100).toFixed(4)} per share.`}
            </div>
          </div>

          <div className="pt-3 border-t border-[#222] flex items-center justify-between gap-3">
            <div className="text-[0.6rem] text-[#666] font-mono">
              {openListings.length > 0
                ? `${openListings.length} open listing${openListings.length === 1 ? '' : 's'} already on the exchange.`
                : 'No open listings on the exchange yet.'}
            </div>
            <button
              type="button"
              disabled={listing || !sharesValid || !priceValid || !kycVerified}
              onClick={submitListing}
              className="text-[0.7rem] font-bold uppercase tracking-wider px-5 py-2 bg-[#E50914] hover:bg-[#b00610] text-white disabled:opacity-40 disabled:cursor-not-allowed"
              title={!kycVerified ? 'KYC verification required' : undefined}
            >
              {listing ? 'Listing…' : 'List shares →'}
            </button>
          </div>

          {listErr && (
            <div className="text-[#ff6b6b] text-xs border border-[#5a1a1a] bg-[#3a0e0e] p-3 font-mono">
              {listErr}
            </div>
          )}
          {listOk && (
            <div className="text-[#6bff8a] text-xs border border-[#1a5a1a] bg-[#0e3a0e] p-3 font-mono">
              {listOk}{' '}
              <a href={`/offer.html?id=${encodeURIComponent(projectId)}`} className="underline">
                Open on exchange ↗
              </a>
            </div>
          )}
        </div>

        {/* ─── Summary sidebar ─── */}
        <div className="border border-[#222] bg-[#0a0a0a] p-5 space-y-3">
          <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold">
            Tranche summary
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#888]">Tier</span><span className="text-white uppercase">{tier}</span></div>
            <div className="flex justify-between"><span className="text-[#888]">Token</span><span className="text-white font-mono">{ticker ? `$${ticker}` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-[#888]">Release</span><span className="text-white">{percent}%</span></div>
            <div className="flex justify-between"><span className="text-[#888]">Total</span><span className="text-white">${totalUsd.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-[#888]">Floor</span><span className="text-white">{floorCents === null ? '—' : `$${(floorCents / 100).toFixed(4)}`}</span></div>
            <div className="flex justify-between"><span className="text-[#888]">Offer status</span><span className="text-white font-mono">{status}</span></div>
            <div className="flex justify-between"><span className="text-[#888]">KYC</span><span className={kycVerified ? 'text-[#6bff8a]' : 'text-[#f7c14b]'}>{kycStatus}</span></div>
          </div>
          <div className="pt-3 border-t border-[#222]">
            <div className="text-[#666] text-[0.6rem] font-mono leading-relaxed">
              After listing, the tranche appears on <code>/offer.html</code> and the
              main <code>/exchange</code>. Buyers pay Stripe; proceeds clear to
              your payout address after the on-chain transfer leg.
            </div>
          </div>
        </div>
      </div>

      {/* ─── Action 2: publish the film to /watch ─── */}
      <div className="mt-8 border border-[#222] bg-[#0a0a0a] p-5 space-y-3">
        <div className="pb-3 border-b border-[#222] flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold">
              Step 2
            </div>
            <h3 className="text-white text-lg font-black leading-tight" style={{ fontFamily: 'var(--font-bebas)' }}>
              Publish to <code className="text-[#E50914]">/watch</code>
            </h3>
            <p className="text-[#888] text-xs mt-1 max-w-lg">
              Flips this film from <code>draft</code> to <code>published</code>.
              Goes live on the public catalogue, disables further presale
              listings, stamps <code>published_at</code> on the offer.
            </p>
          </div>
          <button
            type="button"
            disabled={publishing || !canPublish || !kycVerified}
            onClick={submitPublish}
            className="text-[0.7rem] font-bold uppercase tracking-wider px-5 py-2 bg-[#E50914] hover:bg-[#b00610] text-white disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title={
              !canPublish ? `Offer is ${status}, not draft` :
              !kycVerified ? 'KYC verification required' : undefined
            }
          >
            {publishing ? 'Publishing…' :
             status === 'published' || status === 'auto_published' ? 'Already live' :
             status === 'released' ? 'Released' :
             'Publish to watch →'}
          </button>
        </div>
        {pubErr && (
          <div className="text-[#ff6b6b] text-xs border border-[#5a1a1a] bg-[#3a0e0e] p-3 font-mono">
            {pubErr}
          </div>
        )}
        {pubOk && (
          <div className="text-[#6bff8a] text-xs border border-[#1a5a1a] bg-[#0e3a0e] p-3 font-mono">
            {pubOk}{' '}
            <a href={`/film.html?id=${encodeURIComponent(projectId)}`} className="underline">
              Open on /watch ↗
            </a>
          </div>
        )}
        {!canPublish && status !== 'published' && status !== 'auto_published' && (
          <div className="text-[0.6rem] text-[#666] font-mono">
            Only offers with <code>status=draft</code> can be manually published.
            Current status: <span className="text-white">{status}</span>.
          </div>
        )}
      </div>

      {/* ─── Existing listings ─── */}
      {existing.length > 0 && (
        <div className="mt-8">
          <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#888] font-bold mb-2">
            Previous tranches
          </div>
          <div className="border border-[#222] bg-[#0a0a0a]">
            <div className="grid grid-cols-4 gap-3 px-4 py-2 border-b border-[#1a1a1a] text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">
              <div>Status</div>
              <div>Shares</div>
              <div>Price/share</div>
              <div>Total</div>
            </div>
            {existing.map((l) => (
              <div key={l.id} className="grid grid-cols-4 gap-3 px-4 py-2 border-b border-[#111] last:border-b-0 text-xs font-mono">
                <div className={l.status === 'open' ? 'text-[#6bff8a]' : 'text-[#888]'}>{l.status}</div>
                <div className="text-white">{l.shares_offered.toLocaleString()}</div>
                <div className="text-white">${(l.price_per_share_cents / 100).toFixed(4)}</div>
                <div className="text-white">${((l.price_per_share_cents * l.shares_offered) / 100 / 100).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Music Studio — cue board + freeform brief on the Score tab ── */

type CueKey = 'main_theme' | 'opening_titles' | 'action' | 'tension' | 'stinger' | 'end_credits'

const CUES: { key: CueKey; label: string; blurb: string; prompt: (title: string, bpm: string, key: string, mood: string) => string }[] = [
  {
    key: 'main_theme',
    label: 'Main theme',
    blurb: 'The film\'s signature melody. The one that plays over the logo.',
    prompt: (t, bpm, k, m) => `Compose the MAIN THEME for "${t}". ~60 seconds. BPM ${bpm}, key ${k}, mood: ${m}. Hummable, memorable, suitable for the opening logo and end credits callback.`,
  },
  {
    key: 'opening_titles',
    label: 'Opening titles',
    blurb: 'Cold-open under the title card. Sets the tone in 20 seconds.',
    prompt: (t, bpm, k, m) => `Compose the OPENING TITLES cue for "${t}". ~20 seconds. BPM ${bpm}, key ${k}, mood: ${m}. Builds from nothing to a hit on the title card.`,
  },
  {
    key: 'action',
    label: 'Action / chase',
    blurb: 'Propulsive bed for the set piece. Drives picture, doesn\'t fight it.',
    prompt: (t, bpm, k, m) => `Compose an ACTION cue for "${t}". ~45 seconds, driving, relentless. BPM ${Math.max(Number(bpm) || 110, 128)}, key ${k}, mood: ${m}. Four-on-the-floor pulse, staccato strings, big percussion.`,
  },
  {
    key: 'tension',
    label: 'Tension / suspense',
    blurb: 'Low-end bed under dialogue. Unease without melody.',
    prompt: (t, bpm, k, m) => `Compose a TENSION cue for "${t}". ~30 seconds. Slow, low-end, no melody. BPM ${Math.min(Number(bpm) || 80, 70)}, key ${k} (minor), mood: ${m}. Sub-bass drones, metallic texture, sparse hits.`,
  },
  {
    key: 'stinger',
    label: 'Stinger',
    blurb: 'Sharp 2-second hit. Button on a reveal or a jump cut.',
    prompt: (t, bpm, k, m) => `Compose a STINGER for "${t}". 2 seconds. One sharp hit — brass stab or orchestral crash in key ${k}. Used on a hard cut or reveal. Mood: ${m}.`,
  },
  {
    key: 'end_credits',
    label: 'End credits',
    blurb: 'Main theme reprise, fuller arrangement, clean fade.',
    prompt: (t, bpm, k, m) => `Compose the END CREDITS cue for "${t}". ~90 seconds. Reprise of the main theme, fuller arrangement, BPM ${bpm}, key ${k}, mood: ${m}. Clean fade at the end.`,
  },
]

function MusicStudio({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [bpm, setBpm] = useState('110')
  const [key, setKey] = useState('D minor')
  const [mood, setMood] = useState('tense, cinematic, slow-build')
  const [freeform, setFreeform] = useState('')

  function openChat(prompt: string) {
    (window as any).bmoviesChat?.open(prompt)
  }

  function composeCue(cue: typeof CUES[number]) {
    openChat(cue.prompt(projectTitle, bpm, key, mood))
  }

  function composeFreeform() {
    const p = freeform.trim()
    if (!p) return
    openChat(`Compose a custom cue for "${projectTitle}". BPM ${bpm}, key ${key}, mood ${mood}. Brief: ${p}`)
  }

  return (
    <div className="border border-[#1f1f1f] bg-[#0a0a0a]">
      {/* Studio header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1f1f1f] bg-[#070707]">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold">Tool · Music Studio</div>
          <div className="text-white font-black text-lg leading-none mt-1" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.02em' }}>
            {projectTitle} — Score Room
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[0.6rem] text-[#666] font-mono">
          <span className="text-[#6bff8a]">●</span> LIVE · composer agent ready
        </div>
      </div>

      {/* Transport / settings strip */}
      <div className="grid grid-cols-3 gap-px bg-[#1f1f1f]">
        <label className="bg-[#0a0a0a] p-3 flex flex-col gap-1">
          <span className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">BPM</span>
          <input
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            inputMode="numeric"
            className="bg-transparent text-white text-base font-bold outline-none tabular-nums"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          />
        </label>
        <label className="bg-[#0a0a0a] p-3 flex flex-col gap-1">
          <span className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">Key</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="bg-transparent text-white text-base font-bold outline-none"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          />
        </label>
        <label className="bg-[#0a0a0a] p-3 flex flex-col gap-1">
          <span className="text-[0.55rem] uppercase tracking-wider text-[#666] font-bold">Mood / genre</span>
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="bg-transparent text-white text-sm font-bold outline-none"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          />
        </label>
      </div>

      {/* Cue board */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[0.55rem] uppercase tracking-[0.14em] text-[#888] font-bold">Cue board</div>
          <div className="text-[0.55rem] uppercase tracking-wider text-[#666] font-mono">6 standard cues · tap to commission</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CUES.map((cue, i) => (
            <button
              key={cue.key}
              type="button"
              onClick={() => composeCue(cue)}
              className="group text-left border border-[#1a1a1a] bg-[#070707] hover:border-[#E50914] hover:bg-[#120000] transition-colors p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold">
                  Cue {String(i + 1).padStart(2, '0')} · {cue.label}
                </div>
                <span className="text-[0.55rem] uppercase tracking-wider text-[#555] group-hover:text-[#E50914]">
                  Compose →
                </span>
              </div>
              <p className="text-[#9a9a9a] text-xs leading-snug">{cue.blurb}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Freeform compose */}
      <div className="px-5 pb-5">
        <div className="text-[0.55rem] uppercase tracking-[0.14em] text-[#888] font-bold mb-2">Freeform brief</div>
        <div className="flex gap-2">
          <input
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') composeFreeform() }}
            placeholder={`e.g. "lo-fi piano under the diner scene, ~40 seconds"`}
            className="flex-1 bg-[#070707] border border-[#1a1a1a] focus:border-[#E50914] outline-none px-3 py-2 text-white text-sm"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          />
          <button
            type="button"
            onClick={composeFreeform}
            disabled={!freeform.trim()}
            className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] disabled:bg-[#1a1a1a] disabled:text-[#444] text-white text-[0.65rem] font-bold uppercase tracking-wider transition-colors"
          >
            Compose
          </button>
        </div>
        <p className="text-[#555] text-[0.65rem] mt-2 leading-relaxed">
          Cue briefs open a chat with the composer agent pre-filled with your BPM, key and mood settings. Output lands in <b className="text-[#888]">Audio / Score</b> below once the agent finishes.
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
        {/* Payout-token toggle. $MNEE (BSV stablecoin) is the only live
            option for the hackathon; $USDC on Base/Sol is the post-BSVA
            roadmap and rendered greyed so users can see it's coming. */}
        <div className="flex items-center gap-1 text-[0.55rem] uppercase tracking-[0.18em] font-bold">
          <span className="text-[#666]">Paid in</span>
          <button
            type="button"
            className="px-2 py-1 border border-[#6bff8a] bg-[#02120a] text-[#6bff8a] cursor-default"
            title="Active payout rail — USD stablecoin on BSV"
          >
            $MNEE
          </button>
          <button
            type="button"
            disabled
            className="px-2 py-1 border border-[#222] bg-transparent text-[#444] cursor-not-allowed"
            title="Coming post-hackathon — USDC on Base / Solana"
          >
            $USDC
          </button>
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
