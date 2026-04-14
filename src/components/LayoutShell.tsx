'use client'

import dynamic from 'next/dynamic'
import { ConditionalTicker } from '@/components/ConditionalTicker'

// Dynamic imports — deferred to keep initial bundle small
const Navigation = dynamic(() => import('@/components/Navigation').then(m => m.Navigation), { ssr: false })
const LiveChat = dynamic(() => import('@/components/LiveChat').then(m => m.LiveChat), { ssr: false })
const GlobalBackground = dynamic(() => import('@/components/GlobalBackground').then(m => m.GlobalBackground), { ssr: false })
const KatakanaGraffiti = dynamic(() => import('@/components/KatakanaGraffiti'), { ssr: false })
const Paywall = dynamic(() => import('@/components/Paywall').then(m => m.Paywall), { ssr: false })
const FloatingPlayer = dynamic(() => import('@/components/FloatingPlayer'), { ssr: false })
const Footer = dynamic(() => import('@/components/Footer').then(m => m.Footer), { ssr: false })

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalBackground />
      <KatakanaGraffiti />
      <div className="relative z-10">
        <Navigation />
        <ConditionalTicker />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <LiveChat />
        {/* FloatingPlayer disabled — music player removed from all pages */}
      </div>
    </>
  )
}
