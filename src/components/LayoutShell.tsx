'use client'

import dynamic from 'next/dynamic'
import Script from 'next/script'
import { Suspense, useEffect, useSyncExternalStore } from 'react'
import { isSkin, type Skin } from '@/lib/skin'

// AccountToolbar calls useSearchParams(), which Next 16 requires to be
// wrapped in a Suspense boundary. Without it, hydrating the /account
// route after navigating from an external static HTML page
// (offer.html / deck.html / production.html) throws the default
// "Application error: a client-side exception has occurred" screen.
const AccountToolbar = dynamic(() => import('@/components/AccountToolbar').then(m => m.AccountToolbar), { ssr: false })

// Read skin from the cookie. The cookie is an external store, so
// useSyncExternalStore is the correct hook — it renders the SSR
// fallback ('bmovies') on first paint and swaps to the client value
// after hydration without a setState-in-effect cycle.
function readSkinCookie(): Skin {
  if (typeof document === 'undefined') return 'bmovies'
  const m = document.cookie.match(/(?:^|;\s*)skin=([^;]+)/)
  const v = m ? decodeURIComponent(m[1]) : null
  return isSkin(v) ? v : 'bmovies'
}

function subscribeNoop() {
  // Cookie doesn't emit change events in the browser — we only need
  // a single snapshot at hydration time, so subscribe is a no-op.
  return () => {}
}

function useSkin(): Skin {
  return useSyncExternalStore<Skin>(
    subscribeNoop,
    readSkinCookie,
    () => 'bmovies',
  )
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const skin = useSkin()
  const isBoovies = skin === 'boovies'
  const navScript = isBoovies ? '/js/boovies-nav.js' : '/js/nav-session.js'

  // Apply a body class so the same scoped pink overrides in
  // boovies-nav.js CSS also cover server-rendered regions that existed
  // before the script ran.
  useEffect(() => {
    const cls = 'boovies-theme'
    if (isBoovies) document.body.classList.add(cls)
    else          document.body.classList.remove(cls)
  }, [isBoovies])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Critical CSS: hide the hamburger close-icon (X shape) BEFORE
          nav-session.js injects it. Without this, both hamburger SVGs
          (open lines + close X) render visible for 200-500ms until
          theme.css loads asynchronously. This inline style is parsed
          immediately, preventing the flash. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .site-header .nav-toggle .icon-close { display: none !important; }
        .site-header.nav-open .nav-toggle .icon-open { display: none !important; }
        .site-header.nav-open .nav-toggle .icon-close { display: block !important; }
        .site-header .nav-toggle { background: none; border: none; cursor: pointer; padding: 0.5rem; color: #fff; }
        .site-header .nav-toggle svg { width: 1.2rem; height: 1.2rem; }
        .site-header nav .signin-cta { text-decoration: none; }
      `}} />

      <header className="site-header"></header>
      <Suspense fallback={null}>
        <AccountToolbar />
      </Suspense>
      <main className="flex-1">{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-links">
            {isBoovies ? (
              <>
                <a href="/boovies.html">Drive-In</a>
                <a href="/about.html">About</a>
                <a href="/commission.html">Commission</a>
                <a href="/exchange.html">Exchange</a>
                <a href="/watch.html">Watch</a>
                <a href="/privacy.html">Privacy</a>
                <a href="/terms.html">Terms</a>
              </>
            ) : (
              <>
                <a href="/about.html">About</a>
                <a href="/commission.html">Commission</a>
                <a href="/exchange.html">Exchange</a>
                <a href="/productions.html">Live</a>
                <a href="/studios.html">Studios</a>
                <a href="/watch.html">Watch</a>
                <a href="/privacy.html">Privacy</a>
                <a href="/terms.html">Terms</a>
              </>
            )}
          </div>
          <div className="footer-copy">
            &copy; 2026 {isBoovies ? 'bOOvies' : 'bMovies'}. All rights reserved.{' '}
            {isBoovies ? (
              <a href="/?skin=bmovies" style={{color:'#333',textDecoration:'none',fontSize:'0.55rem'}} title="Back to the main feature">bMovies?</a>
            ) : (
              <a href="/boovies.html" style={{color:'#333',textDecoration:'none',fontSize:'0.55rem'}} title="You found it">bOOvies?</a>
            )}
          </div>
        </div>
      </footer>
      <Script src={navScript} strategy="afterInteractive" />
    </div>
  )
}
