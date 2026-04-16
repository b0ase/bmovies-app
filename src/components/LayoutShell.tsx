'use client'

import dynamic from 'next/dynamic'

const AccountToolbar = dynamic(() => import('@/components/AccountToolbar').then(m => m.AccountToolbar), { ssr: false })

/**
 * Shell for bMovies app routes (/account, /login, /studio).
 *
 * nav-session.js is loaded via layout.tsx <head> with defer so it
 * runs after DOM parse. It populates the empty <header> with the
 * full nav (logo, links, social icons, invest coin, hamburger,
 * sign-in CTA). No pre-rendering of nav in React — nav-session.js
 * is the sole nav implementation across the entire site.
 *
 * CSS (theme.css, mobile.css) is also in layout.tsx <head> so the
 * nav styles are available from first paint.
 */
export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="site-header"></header>
      <AccountToolbar />
      <main className="flex-1">
        {children}
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-links">
            <a href="/about.html">About</a>
            <a href="/commission.html">Commission</a>
            <a href="/exchange.html">Exchange</a>
            <a href="/productions.html">Live</a>
            <a href="/studios.html">Studios</a>
            <a href="/watch.html">Watch</a>
            <a href="/legal/privacy.html">Privacy</a>
            <a href="/legal/terms.html">Terms</a>
          </div>
          <div className="footer-copy">&copy; 2026 bMovies. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
