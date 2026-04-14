'use client'

import dynamic from 'next/dynamic'

// Minimal shell for bMovies app. Strips the NPGX-era katakana graffiti,
// paywall overlay, kanji background, floating player, live chat — none
// of which match the bMovies aesthetic. The app is deliberately quiet
// and product-focused: a top nav, the page, a footer.
const Navigation = dynamic(() => import('@/components/Navigation').then(m => m.Navigation), { ssr: false })
const Footer = dynamic(() => import('@/components/Footer').then(m => m.Footer), { ssr: false })

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
