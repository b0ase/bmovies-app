'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Minimal bMovies top nav. The authenticated experience lives here —
// My Studio, creative tools, exchange, marketplace. The public
// marketing face is bmovies.online (a separate static site).
//
// Tabs ordered left-to-right by user journey: dashboard first, then
// creative tools, then market surfaces. Logo on the far left, public
// site + sign-in CTA on the far right.

const NAV_LINKS = [
  { href: '/account', label: 'My studio' },
  { href: '/movie-editor', label: 'Editor' },
  { href: '/storyboard', label: 'Storyboard' },
  { href: '/script-gen', label: 'Script' },
  { href: '/title-designer', label: 'Titles' },
  { href: '/music-studio', label: 'Music' },
  { href: '/pitch-deck', label: 'Deck' },
  { href: '/exchange', label: 'Exchange' },
  { href: '/marketplace', label: 'Marketplace' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-black/90 backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-6 h-16 flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center font-black tracking-tight text-2xl shrink-0"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          <span className="text-white">b</span>
          <span className="text-[#E50914]">Movies</span>
        </Link>

        <span className="hidden sm:inline text-[0.55rem] uppercase tracking-[0.15em] text-[#666] font-bold border border-[#222] px-2 py-1 shrink-0">
          App · Beta
        </span>

        <nav className="hidden md:flex items-center gap-5 flex-1 min-w-0 overflow-x-auto">
          {NAV_LINKS.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== '/' && pathname?.startsWith(l.href))
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  active
                    ? 'text-[#E50914] border-b-2 border-[#E50914] pb-1'
                    : 'text-[#bbb] hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="https://bmovies.online"
            className="hidden sm:inline text-[0.6rem] uppercase tracking-[0.15em] text-[#666] hover:text-white"
          >
            ← Public site
          </a>
          <Link
            href="/login"
            className="px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  )
}
