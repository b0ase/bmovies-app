import Link from 'next/link'

/**
 * bMovies footer for the Next.js routes.
 *
 * Matches the footer the brochure injects via js/nav-session.js —
 * same legal links, same social row, same aesthetic. Now that
 * brochure and app live on one origin, all links are relative.
 */
export function Footer() {
  return (
    <footer className="border-t border-[#222] bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="text-xs text-[#666]">
            <Link
              href="/"
              className="font-black tracking-tight text-lg inline-flex items-center"
              style={{ fontFamily: 'var(--font-bebas), sans-serif' }}
            >
              <span className="text-white">b</span>
              <span className="text-[#E50914]">Movies</span>
            </Link>
            <div className="mt-2 text-[0.65rem] leading-relaxed">
              &copy; 2026 The Bitcoin Corporation Ltd · Company No. 16735102<br/>
              Registered in England &amp; Wales · Flat 6, 315 Barking Road, London E13 8EE
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.65rem] uppercase tracking-[0.1em] font-bold">
            <a href="/about.html" className="text-[#bbb] hover:text-white">About</a>
            <a href="/terms.html" className="text-[#666] hover:text-white">Terms</a>
            <a href="/privacy.html" className="text-[#666] hover:text-white">Privacy</a>
            <a href="/legal/platform-token-prospectus.html" className="text-[#666] hover:text-white">$bMovies prospectus</a>
            <a href="/legal/film-token-risk-disclosure.html" className="text-[#666] hover:text-white">Film risk</a>
            <a href="/legal/non-custodial-disclosure.html" className="text-[#666] hover:text-white">Non-custodial</a>
            <a href="https://x.com/bMovies_Online" target="_blank" rel="noopener noreferrer" className="text-[#666] hover:text-white">X / Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
