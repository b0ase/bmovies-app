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
