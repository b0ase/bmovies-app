'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import Script from 'next/script'

const AccountToolbar = dynamic(() => import('@/components/AccountToolbar').then(m => m.AccountToolbar), { ssr: false })

/**
 * Minimal shell for bMovies app routes (/account, /login, /studio).
 *
 * Pre-renders the nav HTML server-side so there's no flash when
 * nav-session.js hydrates. nav-session.js's mountNav() checks for
 * existing content (a.logo + nav a.signin-cta) and skips injection
 * if it finds them — it only runs updateNav() to flip the auth state.
 */
export function LayoutShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const links = ['/css/theme.css', '/css/mobile.css']
    links.forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        document.head.appendChild(link)
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Pre-rendered nav — matches buildNavHtml() output so nav-session.js
          skips the innerHTML injection and only runs updateNav(). This
          eliminates the flash caused by empty header → JS injection. */}
      <header className="site-header">
        <a href="/index.html" className="logo">b<span>Movies</span></a>
        <nav id="site-nav">
          <a href="/about.html">About</a>
          <a href="/commission.html">Commission</a>
          <a href="/exchange.html">Exchange</a>
          <a href="/productions.html">Live</a>
          <a href="/studios.html">Studios</a>
          <a href="/watch.html">Watch</a>
          <a href="/judges.html">Judges</a>
          <a href="/login" className="signin-cta">Sign In</a>
        </nav>
      </header>

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

      <Script src="/js/nav-session.js" strategy="beforeInteractive" />
    </div>
  )
}
