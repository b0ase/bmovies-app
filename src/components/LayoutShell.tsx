'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import Script from 'next/script'

const AccountToolbar = dynamic(() => import('@/components/AccountToolbar').then(m => m.AccountToolbar), { ssr: false })

export function LayoutShell({ children }: { children: React.ReactNode }) {
  // Inject brochure CSS so nav + footer styles work
  useEffect(() => {
    ['/css/theme.css', '/css/mobile.css'].forEach(href => {
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
      <AccountToolbar />
      <main className="flex-1">{children}</main>
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
      <Script src="/js/nav-session.js" strategy="afterInteractive" />
    </div>
  )
}
