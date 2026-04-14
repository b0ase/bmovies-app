'use client'

import { Suspense, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { MusicProvider } from '@/hooks/MusicProvider'

function ProvidersFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading NPGX...</p>
      </div>
    </div>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Unregister all service workers and clear all caches — they were causing stale page flashes
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister())
      })
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
    }
  }, [])

  return (
    <Suspense fallback={<ProvidersFallback />}>
      <SessionProvider
        // Provide a fallback session to prevent infinite loading
        refetchInterval={0}
        refetchOnWindowFocus={false}
      >
        <MusicProvider>
          {children}
        </MusicProvider>
      </SessionProvider>
    </Suspense>
  )
} 