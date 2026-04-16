'use client'

/**
 * AccountToolbar — secondary nav bar below the main navbar.
 *
 * Only renders when the user is signed in (checks localStorage
 * 'bmovies-auth' — same pattern as Navigation.tsx). Two rows:
 *
 *   Row 1: Project selector dropdown (left) + status badge (right)
 *   Row 2: Tool tabs (dashboard, script, storyboard, editor, etc.)
 *
 * The active project is persisted in localStorage and broadcast via
 * a CustomEvent so other components (ToolView, etc.) can react.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { bmovies } from '@/lib/supabase-bmovies'
import { useActiveProject, type ActiveProject } from '@/hooks/useActiveProject'

/* ─── Tool tab definitions ─── */

interface ToolTab {
  id: string
  label: string
  href: string | null // null = dynamic (depends on active project)
}

const TOOL_TABS: ToolTab[] = [
  { id: 'dashboard',        label: 'Dashboard',        href: '/account' },
  { id: 'script',           label: 'Script Editor',    href: '/account?tool=script' },
  { id: 'storyboard',       label: 'Storyboard',       href: '/account?tool=storyboard' },
  { id: 'editor',           label: 'Movie Editor',     href: '/account?tool=editor' },
  { id: 'titles',           label: 'Title Designer',   href: '/account?tool=titles' },
  { id: 'score',            label: 'Score',             href: '/account?tool=score' },
  { id: 'production-room',  label: 'Production Room',  href: null },
]

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
  status: string
}

/* ─── Component ─── */

export function AccountToolbar() {
  const [signedIn, setSignedIn] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [activeProject, setActiveProject] = useActiveProject()

  const searchParams = useSearchParams()
  const toolParam = searchParams.get('tool')

  // Determine the active tool tab id
  const activeToolId = toolParam && ['script', 'storyboard', 'editor', 'titles', 'score'].includes(toolParam)
    ? toolParam
    : toolParam === null || toolParam === undefined
      ? 'dashboard'
      : 'dashboard'

  // ─── Hydration guard (same as Navigation.tsx) ───
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

        // Resolve bct_accounts.id
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
          .select('id, title, token_ticker, status')
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
            status: row.status,
          }))
          setProjects(opts)

          // Auto-select the first project if nothing is selected
          if (!activeProject && opts.length > 0) {
            setActiveProject({ id: opts[0].id, title: opts[0].title, ticker: opts[0].ticker })
          }
        }
      } catch (err) {
        console.warn('[AccountToolbar] loadProjects threw:', err)
      } finally {
        if (!cancelled) setProjectsLoading(false)
      }
    }

    loadProjects()
    return () => { cancelled = true }
  }, [signedIn, mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ───

  const handleProjectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    if (!id) {
      setActiveProject(null)
      return
    }
    const match = projects.find((p) => p.id === id)
    if (match) {
      setActiveProject({ id: match.id, title: match.title, ticker: match.ticker })
    }
  }, [projects, setActiveProject])

  const handleProductionRoom = useCallback(() => {
    if (activeProject) {
      window.location.href = `/production-room.html?id=${encodeURIComponent(activeProject.id)}`
    }
  }, [activeProject])

  // ─── Don't render during SSR or when signed out ───
  if (!mounted || !signedIn) return null

  const selectedStatus = activeProject
    ? projects.find((p) => p.id === activeProject.id)?.status
    : null

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
      {/* ── Row 1: Project selector + status badge ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem max(1.5rem, calc((100% - 1400px) / 2))',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: '#666',
              whiteSpace: 'nowrap' as const,
            }}
          >
            Project
          </span>
          <select
            value={activeProject?.id || ''}
            onChange={handleProjectChange}
            disabled={projectsLoading}
            style={{
              flex: 1,
              maxWidth: '400px',
              padding: '0.35rem 0.6rem',
              fontSize: '0.7rem',
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
            {projectsLoading ? (
              <option value="">Loading projects...</option>
            ) : projects.length === 0 ? (
              <option value="">No projects yet</option>
            ) : (
              <>
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (${p.ticker})
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {selectedStatus && (
          <span
            style={{
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              padding: '0.2rem 0.6rem',
              background: statusColor(selectedStatus).bg,
              color: statusColor(selectedStatus).text,
              whiteSpace: 'nowrap' as const,
            }}
          >
            {selectedStatus.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* ── Row 2: Tool tabs ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          padding: '0 max(1.5rem, calc((100% - 1400px) / 2))',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {TOOL_TABS.map((tab) => {
          const isActive = activeToolId === tab.id
          const isProductionRoom = tab.id === 'production-room'

          if (isProductionRoom) {
            return (
              <button
                key={tab.id}
                onClick={handleProductionRoom}
                disabled={!activeProject}
                style={{
                  padding: '0.5rem 0.85rem',
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: !activeProject ? '#444' : '#E50914',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '2px solid transparent',
                  cursor: activeProject ? 'pointer' : 'default',
                  whiteSpace: 'nowrap' as const,
                  transition: 'color 150ms',
                }}
              >
                {tab.label}
              </button>
            )
          }

          return (
            <Link
              key={tab.id}
              href={tab.href!}
              style={{
                padding: '0.5rem 0.85rem',
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: isActive ? '#fff' : '#666',
                textDecoration: 'none',
                borderBottom: isActive ? '2px solid #E50914' : '2px solid transparent',
                whiteSpace: 'nowrap' as const,
                transition: 'color 150ms',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
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
