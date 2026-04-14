'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

interface TickerItem {
  id: string
  text: string
  type: 'update' | 'price' | 'news' | 'alert'
  color?: string
}

// Build ticker items from real stats
function buildTickerItems(stats: any): TickerItem[] {
  const items: TickerItem[] = []
  let id = 0

  // Platform aggregate stats
  if (stats.totalItems > 0) {
    items.push({ id: String(id++), text: `${stats.totalItems} Content Items Generated`, type: 'update' })
  }
  if (stats.totalRevenue > 0) {
    items.push({ id: String(id++), text: `Platform Revenue: $${stats.totalRevenue.toFixed(2)}`, type: 'price', color: 'text-emerald-400' })
  }
  if (stats.totalProductions > 0) {
    items.push({ id: String(id++), text: `${stats.totalProductions} Full Productions Complete`, type: 'news', color: 'text-yellow-400' })
  }

  // Per-type counts
  const typeLabels: Record<string, { label: string; color: string }> = {
    image: { label: 'Images Generated', color: 'text-pink-400' },
    video: { label: 'Videos Produced', color: 'text-purple-400' },
    song: { label: 'Songs Composed', color: 'text-green-400' },
    magazine: { label: 'Magazines Published', color: 'text-red-400' },
    script: { label: 'Scripts Written', color: 'text-amber-400' },
    card: { label: 'Trading Cards Minted', color: 'text-cyan-400' },
  }

  for (const [type, count] of Object.entries(stats.byType || {}) as [string, number][]) {
    if (count > 0 && typeLabels[type]) {
      items.push({
        id: String(id++),
        text: `${count} ${typeLabels[type].label}`,
        type: 'update',
        color: typeLabels[type].color,
      })
    }
  }

  // Per-girl activity — top girls by content count
  const girlEntries = Object.entries(stats.byGirl || {}) as [string, { count: number; cost: number }][]
  const sorted = girlEntries.sort((a, b) => b[1].count - a[1].count).slice(0, 10)
  for (const [slug, data] of sorted) {
    const girl = NPGX_ROSTER.find(c => c.slug === slug)
    if (girl && data.count > 0) {
      const priceBoost = (0.005 + data.count * 0.0001).toFixed(4)
      items.push({
        id: String(id++),
        text: `${girl.token} ${data.count} items | $${priceBoost}`,
        type: 'price',
        color: 'text-white/80',
      })
    }
  }

  // Recent activity
  for (const activity of (stats.recentActivity || []).slice(0, 5)) {
    const girl = NPGX_ROSTER.find(c => c.slug === activity.slug)
    const name = girl?.name?.split(' ')[0] || activity.slug
    const ago = timeSince(activity.createdAt)
    items.push({
      id: String(id++),
      text: `New ${activity.type}: ${name} — ${ago}`,
      type: 'news',
    })
  }

  return items
}

function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const fallbackTickerItems: TickerItem[] = [
  { id: '1', text: '$NPGX Token Live on Exchange', type: 'alert', color: 'text-red-400' },
  { id: '2', text: '26 Ninja Punk Girls — Generate Images, Videos, Music, Magazines', type: 'news' },
  { id: '3', text: '$NPGX: $0.0245', type: 'price', color: 'text-emerald-400' },
  { id: '4', text: 'Full Production Pipeline — One Shot $99', type: 'update' },
  { id: '5', text: 'Generative Cinema on Bitcoin', type: 'alert', color: 'text-red-400' },
  { id: '6', text: 'AI-Powered. Blockchain-Owned.', type: 'news' },
  { id: '7', text: 'Create. Own. Trade.', type: 'update' },
  { id: '8', text: 'Mint Your Moment', type: 'news' },
]

export function TickerTape() {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>(fallbackTickerItems)
  const [isLiveData, setIsLiveData] = useState(false)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.live && data.stats) {
          const liveItems = buildTickerItems(data.stats)
          if (liveItems.length > 3) {
            setTickerItems(liveItems)
            setIsLiveData(true)
          }
        }
      })
      .catch(() => {})

    // Refresh every 60s
    const interval = setInterval(() => {
      fetch('/api/stats')
        .then(r => r.json())
        .then(data => {
          if (data.live && data.stats) {
            const liveItems = buildTickerItems(data.stats)
            if (liveItems.length > 3) {
              setTickerItems(liveItems)
              setIsLiveData(true)
            }
          }
        })
        .catch(() => {})
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Duplicate items for seamless loop
  const duplicatedItems = [...tickerItems, ...tickerItems]

  return (
    <div className="bg-ninja-void border-b border-ninja-steel overflow-hidden relative">
      {/* Live data indicator */}
      {isLiveData && (
        <div className="absolute top-1 right-4 z-20">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-emerald-400/60 font-mono">LIVE</span>
          </div>
        </div>
      )}

      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-ninja-void to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-ninja-void to-transparent z-10 pointer-events-none" />

      {/* Scrolling ticker content */}
      <motion.div
        className="flex items-center py-2 space-x-8"
        animate={{
          x: [0, `-${50}%`]
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 90,
            ease: "linear",
          },
        }}
        style={{
          width: `200%`
        }}
      >
        {duplicatedItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className={`flex items-center space-x-2 whitespace-nowrap text-sm font-medium ${
              item.color || 'text-gray-300'
            }`}
          >
            {/* Type indicator */}
            <span className={`
              w-2 h-2 rounded-full flex-shrink-0
              ${item.type === 'alert' ? 'bg-red-500 animate-pulse' : ''}
              ${item.type === 'price' ? 'bg-emerald-400' : ''}
              ${item.type === 'news' ? 'bg-blue-400' : ''}
              ${item.type === 'update' ? 'bg-white/30' : ''}
            `} />

            {/* Text content */}
            <span className="hover:text-white transition-colors duration-200 cursor-default ticker-item">
              {item.text}
            </span>

            {/* Separator */}
            <span className="text-ninja-ash mx-4">|</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
