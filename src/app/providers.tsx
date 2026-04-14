'use client'

// Minimal providers shell for bMovies app.
//
// NPGX had a NextAuth SessionProvider + a MusicProvider wrapping the
// whole tree. bMovies uses Supabase auth directly (see
// src/lib/supabase-bmovies.ts) and has no global music player, so
// there's nothing to provide globally yet. The wrapper stays as a
// component boundary in case we need React Context later.

import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Unregister any service workers that leaked in from the NPGX era
    // so users don't see stale cached pages on first load after
    // switching to the bMovies app.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister())
      })
      if (typeof caches !== 'undefined') {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
      }
    }
  }, [])

  return <>{children}</>
}
