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

type NavLevel = 'account' | 'project'

/* ─── Tab definitions ─── */

const ACCOUNT_TABS = [
  { id: 'studio',  label: 'Studio' },
  { id: 'wallet',  label: 'Wallet' },
] as const

// All project-level tabs in one row (merged from old PROJECT_TABS + TOOL_TABS)
const PROJECT_ALL_TABS = [
  { id: 'overview',    label: 'Overview',   type: 'tab' as const },
  { id: 'captable',    label: 'Cap Table',  type: 'tab' as const },
  { id: 'crew',        label: 'Crew',       type: 'tab' as const },
  { id: 'deck',        label: 'Deck',       type: 'tab' as const },
  { id: 'room',        label: 'Room',       type: 'tab' as const },
  { id: 'script',      label: 'Script',     type: 'tool' as const },
  { id: 'storyboard',  label: 'Storyboard', type: 'tool' as const },
  { id: 'editor',      label: 'Editor',     type: 'tool' as const },
  { id: 'titles',      label: 'Titles',     type: 'tool' as const },
  { id: 'score',       label: 'Score',      type: 'tool' as const },
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

  // Two levels only: account or project (project includes tools)
  const navLevel: NavLevel =
    projectId ? 'project' :
    'account'

  // Active tab/tool/section
  const activeSection = sectionParam || 'studio'
  const activeTab = tabParam || 'overview'
  const activeTool = toolParam || ''
  // The active item in the merged project row
  const activeProjectItem = activeTool || activeTab

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
    // Stay at current tab/tool when switching projects
    if (toolParam) {
      navigateTo(`/account?project=${id}&tool=${toolParam}`)
    } else {
      navigateTo(`/account?project=${id}&tab=${activeTab}`)
    }
  }, [navLevel, toolParam, activeTab, navigateTo])

  // ─── Don't render during SSR or when signed out ───
  if (!mounted || !signedIn) return null

  const tabStyle = (isActive: boolean) => ({
    padding: '0.85rem 1.4rem',
    fontFamily: 'var(--font-bebas), "Bebas Neue", "Inter", -apple-system, sans-serif',
    fontSize: '1.1rem',
    fontWeight: 400,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#E50914',
    background: isActive ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
    border: 'none',
    borderBottom: isActive ? '3px solid #E50914' : '3px solid transparent',
    whiteSpace: 'nowrap' as const,
    cursor: 'pointer',
    transition: 'color 150ms, background 150ms',
  })

  const subTabStyle = (isActive: boolean) => ({
    padding: '0.5rem 0.7rem',
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: isActive ? '#fff' : '#E50914',
    background: isActive ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
    border: 'none',
    borderBottom: isActive ? '3px solid #E50914' : '3px solid transparent',
    whiteSpace: 'nowrap' as const,
    cursor: 'pointer',
    transition: 'color 150ms',
  })

  const rowStyle = {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    padding: '0 max(1rem, calc((100% - 1400px) / 2))',
    gap: '0',
  }

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
      {/* ═══ ROW 1: Account tabs — always visible ═══ */}
      <div style={rowStyle}>
        {ACCOUNT_TABS.map((tab) => {
          const isActive = navLevel === 'account' && (
            (tab.id === 'studio' && !sectionParam) ||
            activeSection === tab.id
          )
          const href =
            tab.id === 'studio'
              ? '/account'
              : `/account?section=${tab.id}`
          return (
            <button
              key={tab.id}
              onClick={() => navigateTo(href)}
              style={tabStyle(isActive)}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#E50914' }}
            >
              {tab.label}
            </button>
          )
        })}

        {/* Sign out — pushed right */}
        <div style={{ marginLeft: 'auto', flexShrink: 0, paddingRight: '1rem' }}>
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

      {/* ═══ ROW 2: Project tabs — only when inside a project ═══ */}
      {projectId && (
        <div style={{ ...rowStyle, borderTop: '1px solid #111' }}>
          {/* Back + project selector */}
          <button
            onClick={() => navigateTo('/account')}
            style={{ ...subTabStyle(false), color: '#888', fontSize: '0.55rem' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888' }}
          >
            ← Studio
          </button>
          <div style={{ width: '1px', height: '1rem', background: '#222', margin: '0 0.15rem', flexShrink: 0 }} />
          <ProjectSelector
            projects={projects}
            loading={projectsLoading}
            activeProjectId={projectId}
            onChange={handleProjectChange}
          />
          <div style={{ width: '1px', height: '1rem', background: '#222', margin: '0 0.15rem', flexShrink: 0 }} />

          {/* All project + tool tabs in one row */}
          {PROJECT_ALL_TABS.map((tab) => {
            const isActive = tab.type === 'tool'
              ? activeTool === tab.id
              : (!activeTool && activeTab === tab.id)
            const href = tab.type === 'tool'
              ? `/account?project=${projectId}&tool=${tab.id}`
              : `/account?project=${projectId}&tab=${tab.id}`

            return (
              <button
                key={tab.id}
                onClick={() => navigateTo(href)}
                style={subTabStyle(isActive)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      )}
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
