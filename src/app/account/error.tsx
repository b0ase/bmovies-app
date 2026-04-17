'use client'

/**
 * Account route error boundary.
 *
 * Next.js App Router invokes this automatically when any client component
 * under /account throws. Without it, a single unhandled exception blows
 * up the entire tab with the default "Application error: a client-side
 * exception has occurred" screen — which is what the user was seeing on
 * back-nav from /production.html.
 *
 * This boundary catches the throw, logs the digest for Vercel log
 * correlation, and shows a reload CTA so the user isn't stranded.
 */

import { useEffect } from 'react'

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Vercel captures client errors via the platform; also log to console
    // so it shows up in devtools for the user/dev inspecting the page.
    console.error('[account/error-boundary]', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 py-16">
      <div className="max-w-xl">
        <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-2">
          Something broke
        </div>
        <h1
          className="text-4xl font-black text-white leading-none mb-3"
          style={{ fontFamily: 'var(--font-bebas), Bebas Neue, sans-serif' }}
        >
          Account page hit an <span className="text-[#E50914]">error</span>.
        </h1>
        <p className="text-[#888] text-sm leading-relaxed mb-6">
          This happens sometimes on back-navigation from a static page.
          Your data is safe — the error is just in the UI. Reload to
          recover.
        </p>
        {error.message && (
          <pre className="text-[#666] text-xs bg-[#0a0a0a] border border-[#1a1a1a] p-3 mb-4 overflow-x-auto whitespace-pre-wrap break-words">
            {error.message}
            {error.digest && `\n\n(ref: ${error.digest})`}
          </pre>
        )}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={reset}
            className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 bg-[#E50914] hover:bg-[#b00610] text-white"
          >
            Reload account page
          </button>
          <a
            href="/"
            className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 border border-[#333] hover:border-[#E50914] text-white"
          >
            Back to bmovies
          </a>
        </div>
      </div>
    </div>
  )
}
