'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { NPGX_ROSTER, CATEGORIES } from '@/lib/npgx-roster'
import {
  FaStore, FaCoins, FaCamera, FaVideo, FaMusic, FaBook,
  FaFire, FaBolt, FaExchangeAlt, FaTicketAlt
} from 'react-icons/fa'

type ContentType = 'all' | 'images' | 'videos' | 'music' | 'magazines' | 'bundles'

const CONTENT_TYPES: { id: ContentType; label: string; icon: typeof FaCamera }[] = [
  { id: 'all', label: 'All', icon: FaStore },
  { id: 'images', label: 'Images', icon: FaCamera },
  { id: 'videos', label: 'Videos', icon: FaVideo },
  { id: 'music', label: 'Music', icon: FaMusic },
  { id: 'magazines', label: 'Magazines', icon: FaBook },
  { id: 'bundles', label: 'Bundles', icon: FaBolt },
]

// Featured marketplace listings — uses real NPGX characters
const LISTINGS = [
  {
    character: 'luna-cyberblade',
    name: 'Luna Cyberblade — Poster Pack Vol.1',
    type: 'images' as const,
    price: 500,
    ticketCost: 5,
    items: 12,
    featured: true,
  },
  {
    character: 'storm-razorclaw',
    name: 'Storm Razorclaw — Lightning Sessions EP',
    type: 'music' as const,
    price: 2000,
    ticketCost: 20,
    items: 7,
    featured: true,
  },
  {
    character: 'jinx-shadowfire',
    name: 'Jinx Shadowfire — Chaos Engine Clips',
    type: 'videos' as const,
    price: 1500,
    ticketCost: 15,
    items: 4,
    featured: true,
  },
  {
    character: 'phoenix-darkfire',
    name: 'Phoenix Darkfire — Rebirth Magazine',
    type: 'magazines' as const,
    price: 3000,
    ticketCost: 30,
    items: 32,
    featured: true,
  },
  {
    character: 'raven-shadowblade',
    name: 'Raven Shadowblade — Void Walker Collection',
    type: 'images' as const,
    price: 800,
    ticketCost: 8,
    items: 20,
    featured: false,
  },
  {
    character: 'hex-crimsonwire',
    name: 'Hex Crimsonwire — Binary Spellbook',
    type: 'bundles' as const,
    price: 5000,
    ticketCost: 50,
    items: 45,
    featured: true,
  },
  {
    character: 'echo-neonflare',
    name: 'Echo Neonflare — Sonic Warfare Beats',
    type: 'music' as const,
    price: 1200,
    ticketCost: 12,
    items: 11,
    featured: false,
  },
  {
    character: 'nova-bloodmoon',
    name: 'Nova Bloodmoon — Dark Gothic Visuals',
    type: 'videos' as const,
    price: 2500,
    ticketCost: 25,
    items: 6,
    featured: false,
  },
  {
    character: 'cherryx',
    name: 'CherryX — Kawaii Punk Zine',
    type: 'magazines' as const,
    price: 2000,
    ticketCost: 20,
    items: 32,
    featured: false,
  },
  {
    character: 'kira-bloodsteel',
    name: 'Kira Bloodsteel — Ronin Art Series',
    type: 'images' as const,
    price: 600,
    ticketCost: 6,
    items: 8,
    featured: false,
  },
  {
    character: 'vivienne-void',
    name: 'Vivienne Void — Monochrome Sessions',
    type: 'videos' as const,
    price: 1800,
    ticketCost: 18,
    items: 5,
    featured: false,
  },
  {
    character: 'aria-voidstrike',
    name: 'Aria Voidstrike — Infiltration Bundle',
    type: 'bundles' as const,
    price: 4000,
    ticketCost: 40,
    items: 30,
    featured: false,
  },
]

const rosterMap = Object.fromEntries(NPGX_ROSTER.map(c => [c.slug, c]))

function formatSats(sats: number) {
  if (sats >= 100000) return `${(sats / 100000).toFixed(1)}m sats`
  if (sats >= 1000) return `${(sats / 1000).toFixed(0)}k sats`
  return `${sats} sats`
}

export default function MarketplacePage() {
  const [contentFilter, setContentFilter] = useState<ContentType>('all')
  const [charFilter, setCharFilter] = useState('all')
  const [sortBy, setSortBy] = useState('featured')

  const filtered = LISTINGS
    .filter(l => contentFilter === 'all' || l.type === contentFilter)
    .filter(l => charFilter === 'all' || rosterMap[l.character]?.category === charFilter)
    .sort((a, b) => {
      if (sortBy === 'featured') return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
      if (sortBy === 'price-low') return a.price - b.price
      if (sortBy === 'price-high') return b.price - a.price
      return 0
    })

  return (
    <div className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1
            className="text-4xl sm:text-6xl font-black text-white tracking-tighter mb-2"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            MARKETPLACE
          </h1>
          <p className="text-gray-500 text-lg max-w-3xl mb-8">
            Buy and sell character content with $402 tickets. Every purchase is a 1sat ordinal on BSV.
            Redeemed tickets return to the creator &mdash; circular economy, never burned.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Listings</p>
              <p className="text-xl font-black text-white">{LISTINGS.length}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Characters</p>
              <p className="text-xl font-black text-red-500">26</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Protocol</p>
              <p className="text-xl font-black text-white">$402</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Network</p>
              <p className="text-xl font-black text-yellow-500">BSV</p>
            </div>
          </div>

          {/* Content type filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {CONTENT_TYPES.map(ct => (
              <button
                key={ct.id}
                onClick={() => setContentFilter(ct.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono font-bold uppercase transition-colors ${
                  contentFilter === ct.id
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                    : 'text-gray-600 hover:text-gray-400 border border-white/5 hover:border-white/10'
                }`}
              >
                <ct.icon size={12} />
                {ct.label}
              </button>
            ))}
          </div>

          {/* Character category filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCharFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase transition-colors ${
                  charFilter === cat.id
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-gray-700 hover:text-gray-500 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">{filtered.length} listings</p>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-white/5 text-gray-400 text-xs font-mono px-3 py-1.5 rounded-lg border border-white/10"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </motion.div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-16">
          {filtered.map((listing, i) => {
            const char = rosterMap[listing.character]
            if (!char) return null
            return (
              <motion.div
                key={listing.character + listing.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden hover:border-red-500/30 transition-all group"
              >
                {/* Character image */}
                <div className="relative aspect-[4/5] bg-zinc-900">
                  <img
                    src={char.image}
                    alt={char.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  {listing.featured && (
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-mono font-bold bg-red-600/90 text-white px-2 py-0.5 rounded backdrop-blur-sm">
                        FEATURED
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] font-mono font-bold bg-black/60 text-gray-300 px-2 py-0.5 rounded backdrop-blur-sm uppercase">
                      {listing.type}
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-12">
                    <p className="font-mono font-bold text-red-400 text-xs">{char.token}</p>
                    <p className="text-white text-sm font-bold truncate">{listing.name}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-mono font-bold text-lg">{formatSats(listing.price)}</p>
                      <p className="text-gray-600 text-[10px] font-mono">{listing.ticketCost} {char.token} tickets</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 font-mono text-xs">{listing.items} items</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 text-center text-xs font-bold text-white bg-red-600 hover:bg-red-500 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                      <FaTicketAlt size={10} />
                      Buy with {char.token}
                    </button>
                    <Link
                      href={`/npgx/${char.slug}`}
                      className="text-center text-xs font-bold text-gray-400 bg-white/5 hover:bg-white/10 py-2.5 px-3 rounded-lg transition-colors"
                    >
                      Profile
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* How $402 Marketplace Works */}
        <section className="mb-16">
          <h2
            className="text-2xl font-black text-white tracking-tighter mb-6"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            HOW IT WORKS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/[0.03] rounded-xl border border-white/5 p-5">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center mb-3">
                <FaCoins className="text-red-400" />
              </div>
              <h3 className="text-white font-bold mb-1">Buy Tickets</h3>
              <p className="text-gray-600 text-sm">
                Purchase character tokens ($LUNA, $STORM, etc.) on the exchange.
                Each token is a 1sat BSV ordinal.
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-xl border border-white/5 p-5">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center mb-3">
                <FaStore className="text-red-400" />
              </div>
              <h3 className="text-white font-bold mb-1">Browse Content</h3>
              <p className="text-gray-600 text-sm">
                Find images, videos, music, and magazines created by the community.
                Filter by character or content type.
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-xl border border-white/5 p-5">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center mb-3">
                <FaTicketAlt className="text-red-400" />
              </div>
              <h3 className="text-white font-bold mb-1">Redeem</h3>
              <p className="text-gray-600 text-sm">
                Spend tickets to unlock content. Redeemed tickets return
                to the creator &mdash; circular, never burned.
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-xl border border-white/5 p-5">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center mb-3">
                <FaExchangeAlt className="text-red-400" />
              </div>
              <h3 className="text-white font-bold mb-1">Trade</h3>
              <p className="text-gray-600 text-sm">
                Resell content tickets on the exchange. Prices are set by supply
                and demand. Revenue cascades 5 levels.
              </p>
            </div>
          </div>
        </section>

        {/* Top Characters by Content */}
        <section className="mb-16">
          <h2
            className="text-2xl font-black text-white tracking-tighter mb-6"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            TOP CHARACTERS
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {NPGX_ROSTER.slice(0, 12).map((c, i) => (
              <Link
                key={c.slug}
                href={`/npgx/${c.slug}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden hover:border-red-500/30 transition-all group"
                >
                  <div className="relative aspect-[3/4] bg-zinc-900">
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent p-2 pt-8">
                      <p className="text-red-400 font-mono text-[10px] font-bold">{c.token}</p>
                      <p className="text-white text-xs font-bold truncate">{c.name.split(' ')[0]}</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-red-500/5 to-white/[0.02] rounded-2xl border border-red-500/20 p-8 text-center">
          <h2
            className="text-3xl font-black text-white tracking-tighter mb-3"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            CREATE & SELL
          </h2>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Generate content with NPGX creation tools. List it on the marketplace.
            Earn BSV when others buy your work. Revenue cascades through the token hierarchy.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/image-gen"
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors inline-flex items-center justify-center gap-2"
            >
              <FaCamera /> Start Creating
            </Link>
            <Link
              href="/exchange"
              className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors border border-white/10 inline-flex items-center justify-center gap-2"
            >
              <FaExchangeAlt /> Trade Tokens
            </Link>
            <Link
              href="/tokens"
              className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors border border-white/10 inline-flex items-center justify-center gap-2"
            >
              <FaCoins /> View All Tokens
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
