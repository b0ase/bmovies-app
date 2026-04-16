'use client'

/**
 * AccountToolbar — hierarchical nav bar below the main navbar.
 *
 * THREE states based on URL depth:
 *
 *   ACCOUNT LEVEL:  [Studio] [Wallet] [Coupons]
 *   PROJECT LEVEL:  [<- Studio] [Project: X v] [Overview] [Cap Table] [Crew] [Deck] [Production Room]
 *   TOOLS LEVEL:    [<- Project] [Project: X v] [Script] [Storyboard] [Editor] [Titles] [Score]
 *
 * Navigation state is managed entirely via URL search params:
 *   /account                            -> account level, Studio tab
 *   /account?section=wallet             -> account level, Wallet tab
 *   /account?section=coupons            -> account level, Coupons tab
 *   /account?project=<id>&tab=overview  -> project level
 *   /account?project=<id>&tool=script   -> tools level
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { bmovies } from '@/lib/supabase-bmovies'

/* ─── Auth check (mirrors Navigation.tsx) ─── */

function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem('bmovies-auth')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const expiresAt = parsed?.expires_at || parsed?.currentSession?.expires_at
    if (!expiresAt) return false
    return Date.now() / 1000 < Number(expiresAt)
  } catch {
    return false
  }
}

/* ─── Project data shape ─── */

interface ProjectOption {
  id: string
  title: string
  ticker: string
  tier: string
  status: string
}

/* ─── Navigation level type ─── */

type NavLevel = 'account' | 'project' | 'tools'

/* ─── Tab definitions ─── */

const ACCOUNT_TABS = [
  { id: 'studio',  label: 'Studio' },
  { id: 'wallet',  label: 'Wallet' },
  { id: 'coupons', label: 'Coupons' },
] as const

const PROJECT_TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'captable',  label: 'Cap Table' },
  { id: 'crew',      label: 'Crew' },
  { id: 'deck',      label: 'Deck' },
  { id: 'room',      label: 'Production Room' },
] as const

const TOOL_TABS = [
  { id: 'script',      label: 'Script' },
  { id: 'storyboard',  label: 'Storyboard' },
  { id: 'editor',      label: 'Editor' },
  { id: 'titles',      label: 'Titles' },
  { id: 'score',       label: 'Score' },
] as const

/* ─── Component ─── */

export function AccountToolbar() {
  const [signedIn, setSignedIn] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()

  // ─── Derive navigation level from URL params ───
  const projectId = searchParams.get('project')
  const toolParam = searchParams.get('tool')
  const tabParam = searchParams.get('tab')
  const sectionParam = searchParams.get('section')

  const navLevel: NavLevel =
    toolParam && projectId ? 'tools' :
    projectId ? 'project' :
    'account'

  // Active tab/tool/section
  const activeSection = sectionParam || 'studio'
  const activeTab = tabParam || 'overview'
  const activeTool = toolParam || 'script'

  // Active project object
  const activeProject = projectId ? projects.find(p => p.id === projectId) || null : null

  // ─── Hydration guard ───
  useEffect(() => {
    setMounted(true)
    setSignedIn(isSessionValid())

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bmovies-auth') setSignedIn(isSessionValid())
    }
    const onAuthChanged = () => setSignedIn(isSessionValid())
    window.addEventListener('storage', onStorage)
    window.addEventListener('bmovies:auth-changed', onAuthChanged)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('bmovies:auth-changed', onAuthChanged)
    }
  }, [])

  // ─── Load user's projects from Supabase ───
  useEffect(() => {
    if (!signedIn || !mounted) return
    let cancelled = false

    async function loadProjects() {
      setProjectsLoading(true)
      try {
        const { data: sessionData } = await bmovies.auth.getSession()
        const user = sessionData.session?.user
        if (!user || cancelled) { setProjectsLoading(false); return }

        const { data: accountRow } = await bmovies
          .from('bct_accounts')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (cancelled) return

        const accountId = accountRow?.id as string | undefined
        const address = (user.user_metadata as Record<string, unknown>)?.brc100_address as string | undefined

        if (!accountId && !address) {
          setProjects([])
          setProjectsLoading(false)
          return
        }

        let q = bmovies
          .from('bct_offers')
          .select('id, title, token_ticker, tier, status')
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
          console.warn('[AccountToolbar] projects fetch error:', error.message)
          setProjects([])
        } else {
          const opts: ProjectOption[] = (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            ticker: row.token_ticker || '???',
            tier: row.tier || 'pitch',
            status: row.status,
          }))
          setProjects(opts)
        }
      } catch (err) {
        console.warn('[AccountToolbar] loadProjects threw:', err)
      } finally {
        if (!cancelled) setProjectsLoading(false)
      }
    }

    loadProjects()
    return () => { cancelled = true }
  }, [signedIn, mounted])

  // ─── Navigation handlers ───

  const navigateTo = useCallback((path: string) => {
    router.push(path, { scroll: false })
  }, [router])

  const handleProjectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    if (!id) return
    // Stay at current level when switching projects
    if (navLevel === 'tools' && toolParam) {
      navigateTo(`/account?project=${id}&tool=${toolParam}`)
    } else {
      navigateTo(`/account?project=${id}&tab=${activeTab}`)
    }
  }, [navLevel, toolParam, activeTab, navigateTo])

  // ─── Don't render during SSR or when signed out ───
  if (!mounted || !signedIn) return null

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: '#050505',
        borderBottom: '1px solid #1a1a1a',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 max(1.5rem, calc((100% - 1400px) / 2))',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          gap: '0',
        }}
      >
        {/* ═══ ACCOUNT LEVEL ═══ */}
        {navLevel === 'account' && (
          <>
            {ACCOUNT_TABS.map((tab) => {
              const isActive =
                (tab.id === 'studio' && !sectionParam) ||
                activeSection === tab.id
              const href =
                tab.id === 'studio'
                  ? '/account'
                  : `/account?section=${tab.id}`
              return (
                <button
                  key={tab.id}
                  onClick={() => navigateTo(href)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: isActive ? '#fff' : '#666',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #E50914' : '2px solid transparent',
                    whiteSpace: 'nowrap' as const,
                    cursor: 'pointer',
                    transition: 'color 150ms',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </>
        )}

        {/* ═══ PROJECT LEVEL ═══ */}
        {navLevel === 'project' && (
          <>
            {/* Back button */}
            <button
              onClick={() => navigateTo('/account')}
              style={{
                padding: '0.65rem 0.75rem',
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: '0.6rem',
                fontWeight: 600,
                color: '#888',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap' as const,
                transition: 'color 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#888' }}
            >
              ← Studio
            </button>

            {/* Separator */}
            <div style={{ width: '1px', height: '1.2rem', background: '#222', margin: '0 0.25rem', flexShrink: 0 }} />

            {/* Project selector */}
            <ProjectSelector
              projects={projects}
              loading={projectsLoading}
              activeProjectId={projectId}
              onChange={handleProjectChange}
            />

            {/* Separator */}
            <div style={{ width: '1px', height: '1.2rem', background: '#222', margin: '0 0.25rem', flexShrink: 0 }} />

            {/* Project tabs */}
            {PROJECT_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              const href = `/account?project=${projectId}&tab=${tab.id}`
              return (
                <button
                  key={tab.id}
                  onClick={() => navigateTo(href)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: isActive ? '#fff' : '#666',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #E50914' : '2px solid transparent',
                    whiteSpace: 'nowrap' as const,
                    cursor: 'pointer',
                    transition: 'color 150ms',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </>
        )}

        {/* ═══ TOOLS LEVEL ═══ */}
        {navLevel === 'tools' && (
          <>
            {/* Back button */}
            <button
              onClick={() => navigateTo(`/account?project=${projectId}&tab=room`)}
              style={{
                padding: '0.65rem 0.75rem',
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: '0.6rem',
                fontWeight: 600,
                color: '#888',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap' as const,
                transition: 'color 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#888' }}
            >
              ← Project
            </button>

            {/* Separator */}
            <div style={{ width: '1px', height: '1.2rem', background: '#222', margin: '0 0.25rem', flexShrink: 0 }} />

            {/* Project selector */}
            <ProjectSelector
              projects={projects}
              loading={projectsLoading}
              activeProjectId={projectId}
              onChange={handleProjectChange}
            />

            {/* Separator */}
            <div style={{ width: '1px', height: '1.2rem', background: '#222', margin: '0 0.25rem', flexShrink: 0 }} />

            {/* Tool tabs */}
            {TOOL_TABS.map((tab) => {
              const isActive = activeTool === tab.id
              const href = `/account?project=${projectId}&tool=${tab.id}`
              return (
                <button
                  key={tab.id}
                  onClick={() => navigateTo(href)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: isActive ? '#fff' : '#666',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #E50914' : '2px solid transparent',
                    whiteSpace: 'nowrap' as const,
                    cursor: 'pointer',
                    transition: 'color 150ms',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </>
        )}

        {/* Sign out — always visible, pushed to right */}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <button
            onClick={() => {
              localStorage.removeItem('bmovies-auth')
              window.dispatchEvent(new Event('bmovies:auth-changed'))
              window.location.href = '/'
            }}
            style={{
              padding: '0.5rem 0.75rem',
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              color: '#666',
              background: 'transparent',
              border: '1px solid #333',
              cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E50914'; e.currentTarget.style.color = '#ff6b7a' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#666' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Project selector dropdown (shared between project + tools level) ─── */

function ProjectSelector({
  projects,
  loading,
  activeProjectId,
  onChange,
}: {
  projects: ProjectOption[]
  loading: boolean
  activeProjectId: string | null
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}) {
  return (
    <select
      value={activeProjectId || ''}
      onChange={onChange}
      disabled={loading}
      style={{
        maxWidth: '260px',
        padding: '0.35rem 0.6rem',
        fontSize: '0.65rem',
        fontWeight: 600,
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: '#fff',
        background: '#111',
        border: '1px solid #333',
        borderRadius: 0,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'auto' as const,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#E50914' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = '#333' }}
    >
      {loading ? (
        <option value="">Loading...</option>
      ) : projects.length === 0 ? (
        <option value="">No projects</option>
      ) : (
        <>
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} (${p.ticker})
            </option>
          ))}
        </>
      )}
    </select>
  )
}
