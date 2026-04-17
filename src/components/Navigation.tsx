'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'

/**
 * Unified top nav for the Next.js routes.
 *
 * Mirrors the brochure's js/nav-session.js structure so /account,
 * /login, /studio feel continuous with the static brochure pages.
 * Brochure links use plain <a href="…html"> because those routes
 * are served by Vercel as static files — the Next.js router should
 * NOT try to intercept them with a client-side navigation.
 *
 * Sign-in CTA flips to "Account" when a valid Supabase session
 * exists in localStorage['bmovies-auth'] (same key both the
 * brochure and the Next.js app use).
 */

type NavLink = { href: string; label: string }

const NAV_LINKS: NavLink[] = [
  { href: '/about.html', label: 'About' },
  { href: '/commission.html', label: 'Commission' },
  { href: '/exchange.html', label: 'Exchange' },
  { href: '/productions.html', label: 'Live' },
  { href: '/studios.html', label: 'Studios' },
  { href: '/watch.html', label: 'Watch' },
  { href: '/judges.html', label: 'Judges' },
]

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

// localStorage + custom auth-changed event form the external store
// the signed-in state mirrors. useSyncExternalStore is the canonical
// way to bind that, and it sidesteps the setState-in-effect lint
// rule by design.
function subscribeAuth(notify: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'bmovies-auth') notify()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener('bmovies:auth-changed', notify)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('bmovies:auth-changed', notify)
  }
}

export function Navigation() {
  const pathname = usePathname()
  const signedIn = useSyncExternalStore<boolean>(
    subscribeAuth,
    isSessionValid,
    () => false,
  )

  return (
    <header
      className="site-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.9rem max(3rem, calc((100% - 1400px) / 2))',
        background: '#000',
        borderBottom: '1px solid #222',
      }}
    >
      <a
        href="/"
        style={{
          fontFamily: "var(--font-bebas), 'Bebas Neue', 'Oswald', 'Inter', sans-serif",
          fontSize: '1.6rem',
          fontWeight: 400,
          letterSpacing: '0.06em',
          color: '#fff',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          border: '2px solid #E50914',
          padding: '0.15rem 0.7rem',
          lineHeight: 1.1,
          textShadow: '1px 2px 4px rgba(229, 9, 20, 0.3)',
        }}
      >
        b<span style={{ color: '#E50914' }}>Movies</span>
      </a>

      <nav
        style={{
          display: 'flex',
          flex: 1,
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 2rem',
          margin: '0 0 0 2rem',
        }}
      >
        {NAV_LINKS.map((l) => {
          const active = pathname && l.href.includes(pathname.replace(/^\//, ''))
          return (
            <a
              key={l.href}
              href={l.href}
              style={{
                padding: '0.5rem 1rem',
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: active ? '#fff' : '#aaa',
                textDecoration: 'none',
                borderBottom: active ? '2px solid #E50914' : '2px solid transparent',
              }}
            >
              {l.label}
            </a>
          )
        })}
        <Link
          href={signedIn ? '/account' : '/login'}
          className="signin-cta"
          style={{
            padding: '0.5rem 1rem',
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: '0.65rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: signedIn ? '#6bff8a' : '#fff',
            background: signedIn ? 'transparent' : '#E50914',
            border: `1px solid ${signedIn ? '#6bff8a' : '#E50914'}`,
            textDecoration: 'none',
            marginLeft: '0.75rem',
          }}
        >
          {signedIn ? 'Account ▾' : 'Sign In'}
        </Link>
        {signedIn && (
          <button
            onClick={() => {
              localStorage.removeItem('bmovies-auth')
              window.dispatchEvent(new Event('bmovies:auth-changed'))
              window.location.href = '/'
            }}
            style={{
              padding: '0.5rem 0.8rem',
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#888',
              background: 'none',
              border: '1px solid #333',
              cursor: 'pointer',
              marginLeft: '0.3rem',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#E50914'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
          >
            Sign Out
          </button>
        )}
      </nav>
    </header>
  )
}
