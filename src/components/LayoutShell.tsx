'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import Script from 'next/script'

const AccountToolbar = dynamic(() => import('@/components/AccountToolbar').then(m => m.AccountToolbar), { ssr: false })

/**
 * Minimal shell for bMovies app routes (/account, /login, /studio).
 *
 * Uses the SAME nav-session.js as the brochure pages so the navbar
 * is identical everywhere: same logo, same links, same social icons,
 * same $bMovies invest coin, same sign-out dropdown, same floating
 * chat widget. One implementation, zero drift.
 *
 * The <header class="site-header"> stub is injected empty — nav-
 * session.js detects it and populates the full nav markup. The
 * <footer class="site-footer"> follows the same pattern.
 *
 * CSS comes from /css/theme.css and /css/mobile.css which are loaded
 * in the HTML head of each brochure page. For the Next.js routes,
 * we inject them via <link> tags so the nav/footer inherit the same
 * styles (colors, hamburger, responsive breakpoints, active states).
 */
export function LayoutShell({ children }: { children: React.ReactNode }) {
  // Ensure the brochure CSS is loaded for nav/footer styling
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
      {/* Empty stub — nav-session.js populates this with the full nav */}
      <header className="site-header"></header>

      {/* Account toolbar — only renders when signed in */}
      <AccountToolbar />

      <main className="flex-1">
        {children}
      </main>

      {/* Brochure-style footer — nav-session.js adds social + legal rows */}
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

      {/* Load the shared brochure nav script — handles everything:
          logo, links, hamburger, social icons, invest coin, sign-in
          CTA, sign-out dropdown, floating chat widget, judges link */}
      <Script src="/js/nav-session.js" strategy="afterInteractive" />
    </div>
  )
}
