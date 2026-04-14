import Link from 'next/link'

// Minimal bMovies footer. Legal + social + public-site pointer.
// Matches the footer pattern used on bmovies.online (see
// docs/brochure/js/nav-session.js for the injection logic there).

export function Footer() {
  return (
    <footer className="border-t border-[#1a1a1a] bg-black">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="text-xs text-[#666]">
            <Link
              href="/"
              className="font-black tracking-tight text-lg inline-flex items-center"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              <span className="text-white">b</span>
              <span className="text-[#E50914]">Movies</span>
              <span className="ml-2 text-[0.55rem] uppercase tracking-[0.15em] text-[#666] font-bold border border-[#222] px-2 py-0.5">App</span>
            </Link>
            <div className="mt-2 text-[0.65rem] leading-relaxed">
              &copy; 2026 The Bitcoin Corporation Ltd · Company No. 16735102<br/>
              Registered in England &amp; Wales · Flat 6, 315 Barking Road, London E13 8EE
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.65rem] uppercase tracking-[0.1em] font-bold">
            <a href="https://bmovies.online" className="text-[#bbb] hover:text-white">Public site</a>
            <a href="https://bmovies.online/terms.html" className="text-[#666] hover:text-white">Terms</a>
            <a href="https://bmovies.online/privacy.html" className="text-[#666] hover:text-white">Privacy</a>
            <a href="https://bmovies.online/legal/platform-token-prospectus.html" className="text-[#666] hover:text-white">$bMovies prospectus</a>
            <a href="https://bmovies.online/legal/film-token-risk-disclosure.html" className="text-[#666] hover:text-white">Film risk</a>
            <a href="https://bmovies.online/legal/non-custodial-disclosure.html" className="text-[#666] hover:text-white">Non-custodial</a>
            <a href="https://x.com/bMovies_Online" className="text-[#666] hover:text-white">X / Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
