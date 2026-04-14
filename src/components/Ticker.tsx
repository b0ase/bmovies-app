'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

interface GirlStat {
  count: number
  cost: number
}

interface PlatformStats {
  totalItems: number
  totalRevenue: number
  totalProductions: number
  byType: Record<string, number>
  byGirl: Record<string, GirlStat>
  recentActivity: { slug: string; type: string; title: string; cost: number; createdAt: string }[]
}

// Deterministic seed price from letter — simulates a token market
function seedPrice(letter: string, contentCount: number) {
  const seed = letter.charCodeAt(0)
  const base = 0.005 + (Math.sin(seed * 137.5) * 0.5 + 0.5) * 0.025
  // Content count boosts the price (more content = more value)
  const boost = contentCount * 0.0001
  const price = base + boost
  const change = contentCount > 0
    ? Math.min(99, contentCount * 1.5 + Math.sin(seed * 42.7) * 10)
    : Math.sin(seed * 42.7) * 30
  return { price: parseFloat(price.toFixed(4)), change: parseFloat(change.toFixed(1)) }
}

function TickerItem({ token, price, change, count }: { token: string; price: number; change: number; count?: number }) {
  const up = change >= 0
  return (
    <span className="inline-flex items-center gap-1.5 px-3 whitespace-nowrap">
      <span className={`font-bold text-[11px] ${token === '$NPGX' ? 'text-red-400' : 'text-white/80'}`}>{token}</span>
      <span className="text-white/50 text-[11px] font-mono">{price.toFixed(4)}</span>
      <span className={`text-[10px] font-mono font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? '+' : ''}{change.toFixed(1)}%
      </span>
      {count != null && count > 0 && (
        <span className="text-white/20 text-[9px] font-mono">{count}</span>
      )}
    </span>
  )
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 whitespace-nowrap">
      <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
      <span className="text-white/70 text-[11px] font-mono font-bold">{value}</span>
    </span>
  )
}

export function Ticker() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.live && data.stats) {
          setStats(data.stats)
          setLive(true)
        }
      })
      .catch(() => {})

    // Refresh every 60s
    const interval = setInterval(() => {
      fetch('/api/stats')
        .then(r => r.json())
        .then(data => {
          if (data.live && data.stats) {
            setStats(data.stats)
            setLive(true)
          }
        })
        .catch(() => {})
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Build per-girl tickers
  const girlTickers = NPGX_ROSTER.map(c => {
    const girlData = stats?.byGirl?.[c.slug]
    const contentCount = girlData?.count || 0
    const m = seedPrice(c.letter, contentCount)
    return { token: c.token, price: m.price, change: m.change, count: contentCount }
  })

  // NPGX index — aggregate of all girls
  const totalContent = stats?.totalItems || 0
  const npgxPrice = 0.0245 + totalContent * 0.00005
  const npgxChange = totalContent > 0 ? Math.min(99, totalContent * 0.3) : 4.2
  const npgxIndex = { token: '$NPGX', price: parseFloat(npgxPrice.toFixed(4)), change: parseFloat(npgxChange.toFixed(1)), count: undefined as number | undefined }

  // Aggregate stats items
  const statItems: { label: string; value: string; color: string }[] = []
  if (stats) {
    statItems.push({ label: 'IMAGES', value: String(stats.byType.image || 0), color: 'text-pink-400' })
    statItems.push({ label: 'VIDEOS', value: String(stats.byType.video || 0), color: 'text-purple-400' })
    statItems.push({ label: 'MUSIC', value: String(stats.byType.song || 0), color: 'text-green-400' })
    statItems.push({ label: 'MAGAZINES', value: String(stats.byType.magazine || 0), color: 'text-red-400' })
    statItems.push({ label: 'SCRIPTS', value: String(stats.byType.script || 0), color: 'text-amber-400' })
    statItems.push({ label: 'CARDS', value: String(stats.byType.card || 0), color: 'text-cyan-400' })
    statItems.push({ label: 'PRODUCTIONS', value: String(stats.totalProductions), color: 'text-yellow-400' })
    statItems.push({ label: 'REVENUE', value: `$${stats.totalRevenue.toFixed(2)}`, color: 'text-emerald-400' })
    statItems.push({ label: 'TOTAL', value: String(stats.totalItems), color: 'text-white/60' })
  }

  // Interleave: [NPGX, stats, girl, girl, stats, girl, girl, ...]
  const allItems: { type: 'girl' | 'stat' | 'index'; data: any }[] = []
  allItems.push({ type: 'index', data: npgxIndex })

  let statIdx = 0
  for (let i = 0; i < girlTickers.length; i++) {
    allItems.push({ type: 'girl', data: girlTickers[i] })
    // Insert a stat item every 3 girls
    if ((i + 1) % 3 === 0 && statIdx < statItems.length) {
      allItems.push({ type: 'stat', data: statItems[statIdx++] })
    }
  }
  // Add remaining stats
  while (statIdx < statItems.length) {
    allItems.push({ type: 'stat', data: statItems[statIdx++] })
  }

  // Duplicate for seamless loop
  const items = [...allItems, ...allItems]

  return (
    <Link href="/exchange" className="block">
      <div className="w-full bg-black/80 border-b border-white/5 overflow-hidden backdrop-blur-sm relative">
        {live && (
          <div className="absolute top-1 right-2 z-20 flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[9px] text-emerald-400/60 font-mono">LIVE</span>
          </div>
        )}
        <div className="ticker-scroll flex items-center h-8">
          {items.map((item, i) => {
            if (item.type === 'index' || item.type === 'girl') {
              return <TickerItem key={`${item.data.token}-${i}`} {...item.data} />
            }
            return <StatItem key={`stat-${item.data.label}-${i}`} {...item.data} />
          })}
        </div>
        <style jsx>{`
          .ticker-scroll {
            animation: ticker 60s linear infinite;
            width: max-content;
          }
          .ticker-scroll:hover {
            animation-play-state: paused;
          }
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    </Link>
  )
}
