'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { TickerTape } from './TickerTape'

export function ConditionalTicker() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  
  // Always show ticker on rankings page (public data)
  if (pathname === '/rankings') {
    return <TickerTape />
  }
  
  // Don't show ticker while loading or if user is logged in on other pages
  if (status === 'loading' || session) {
    return null
  }
  
  return <TickerTape />
} 