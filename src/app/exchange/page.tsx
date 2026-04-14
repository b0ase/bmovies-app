'use client'

import { useState, useMemo, useEffect } from 'react'
import { cdnUrl } from '@/lib/cdn'
import Link from 'next/link'

/* ─────────────────────────── Types ─────────────────────────── */

type FilterTab = 'tokens' | 'music' | 'videos' | 'images'
type SortOption = 'price' | 'newest' | 'popular'

interface Listing {
  id: string
  title: string
  creator?: string
  price: string
  priceAlt?: string
  type: FilterTab
  badge: string
  thumbnail?: string
  subtitle?: string
  href?: string
  hrefAlt?: string
  hrefAltLabel?: string
  linkLabel?: string
  isCreateCard?: boolean
}

/* ─────────────────────────── Data ─────────────────────────── */

const LISTINGS: Listing[] = [
  // TOKENS
  {
    id: 'npgx',
    title: '$NPGX',
    creator: 'NPGX Protocol',
    price: '$0.001',
    type: 'tokens',
    badge: 'INDEX',
    subtitle: '1,000,000,000 supply',
  },
  {
    id: 'aria',
    title: '$ARIA',
    creator: 'Aria Voidstrike',
    price: '$0.001',
    type: 'tokens',
    badge: 'CHARACTER',
    thumbnail: '/content/aria-voidstrike/images/avatar/aria-voidstrike-confrontational.png',
  },
  {
    id: 'luna',
    title: '$LUNA',
    creator: 'Luna Cyberblade',
    price: '$0.001',
    type: 'tokens',
    badge: 'CHARACTER',
    thumbnail: '/content/luna-cyberblade/images/avatar/luna-cyberblade-avatar.png',
  },
  {
    id: 'dahlia',
    title: '$DAHLIA',
    creator: 'Dahlia Ironveil',
    price: '$0.001',
    type: 'tokens',
    badge: 'CHARACTER',
    thumbnail: '/content/dahlia-ironveil/images/avatar/dahlia-ironveil-avatar.png',
  },

  // MUSIC
  {
    id: 'tokyo-gutter-punk',
    title: 'Tokyo Gutter Punk',
    creator: 'NPGX',
    price: '$4.99',
    type: 'music',
    badge: 'ALBUM',
    subtitle: '11 tracks',
    thumbnail: cdnUrl('music/albums/tokyo-gutter-punk/cover.png'),
    href: '/album/tokyo-gutter-punk',
  },
  {
    id: 'neon-blood-riot',
    title: 'Neon Blood Riot',
    creator: 'NPGX',
    price: '$4.99',
    type: 'music',
    badge: 'ALBUM',
    subtitle: '11 tracks',
    thumbnail: cdnUrl('music/albums/neon-blood-riot/cover.png'),
    href: '/album/neon-blood-riot',
  },
  {
    id: 'razor-kisses-single',
    title: 'Razor Kisses',
    creator: 'NPGX',
    price: '$0.99',
    type: 'music',
    badge: 'SINGLE',
    href: '/album/tokyo-gutter-punk/razor-kisses',
  },

  // VIDEOS
  {
    id: 'razor-kisses-video',
    title: 'Razor Kisses',
    creator: 'NPGX',
    price: 'Free (SFW)',
    priceAlt: '$99 (XXX)',
    type: 'videos',
    badge: 'MUSIC VIDEO',
    subtitle: '67 clips',
    thumbnail: '/og/razor-kisses.png',
    href: '/watch/razor-kisses',
    linkLabel: 'Watch',
    hrefAlt: '/watch/razor-kisses/xxx',
    hrefAltLabel: 'Buy XXX',
  },
  {
    id: 'shibuya-mosh-pit',
    title: 'Shibuya Mosh Pit',
    creator: 'NPGX',
    price: 'Free',
    type: 'videos',
    badge: 'MUSIC VIDEO',
    subtitle: '22 clips',
    href: '/watch/shibuya-mosh-pit',
    linkLabel: 'Watch',
  },
  {
    id: 'tokyo-gutter-queen',
    title: 'Tokyo Gutter Queen',
    creator: 'NPGX',
    price: 'Free',
    type: 'videos',
    badge: 'MUSIC VIDEO',
    subtitle: '53 clips',
    href: '/watch/tokyo-gutter-queen',
    linkLabel: 'Watch',
  },
  {
    id: 'create-your-own',
    title: 'Create Your Own',
    creator: 'You',
    price: 'Start Free',
    type: 'videos',
    badge: 'CREATE',
    subtitle: 'AI-powered storyboard',
    href: '/storyboard',
    linkLabel: 'Create',
    isCreateCard: true,
  },

  // IMAGES
  {
    id: 'aria-collection',
    title: 'Aria Collection',
    creator: 'Aria Voidstrike',
    price: '$19.99',
    type: 'images',
    badge: 'COLLECTION',
    subtitle: '50+ images',
    thumbnail: '/content/aria-voidstrike/images/avatar/aria-voidstrike-confrontational.png',
  },
  {
    id: 'dahlia-collection',
    title: 'Dahlia Collection',
    creator: 'Dahlia Ironveil',
    price: '$19.99',
    type: 'images',
    badge: 'COLLECTION',
    subtitle: '50+ images',
    thumbnail: '/content/dahlia-ironveil/images/avatar/dahlia-ironveil-avatar.png',
  },
  {
    id: 'luna-collection',
    title: 'Luna Collection',
    creator: 'Luna Cyberblade',
    price: '$19.99',
    type: 'images',
    badge: 'COLLECTION',
    subtitle: '50+ images',
    thumbnail: '/content/luna-cyberblade/images/avatar/luna-cyberblade-avatar.png',
  },
  {
    id: 'miss-void-magazine-1',
    title: 'MISS VOID Magazine Issue 1',
    creator: 'NPGX',
    price: '$9.99',
    type: 'images',
    badge: 'MAGAZINE',
    subtitle: 'Digital edition',
  },
]

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'tokens', label: 'Tokens' },
  { key: 'music', label: 'Music' },
  { key: 'videos', label: 'Videos' },
  { key: 'images', label: 'Images' },
]

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'price', label: 'Price' },
  { key: 'newest', label: 'Newest' },
  { key: 'popular', label: 'Most Popular' },
]

/* ─────────────────────────── Helpers ─────────────────────────── */

function parsePriceForSort(price: string): number {
  const match = price.match(/[\d.]+/)
  if (!match) return 0
  return parseFloat(match[0])
}

/* ─────────────────────────── Component ─────────────────────────── */

export default function ExchangePage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('tokens')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('popular')
  const [userListings, setUserListings] = useState<Listing[]>([])

  // Load user-published listings from localStorage
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('npgx-exchange-listings') || '[]')
      const mapped: Listing[] = raw.map((l: any) => ({
        id: l.id,
        title: l.title,
        creator: l.creator || 'User',
        price: `$${l.price}`,
        type: (l.type || 'videos') as FilterTab,
        badge: l.tier === 'new-xxx' ? 'XXX' : l.tier === 'new-xx' ? 'XX' : 'USER',
        subtitle: `${l.clipCount || 0} clips`,
        thumbnail: l.thumbnail,
        href: `/watch/${l.trackSlug}`,
      }))
      setUserListings(mapped)
    } catch {}
  }, [])

  const allListings = useMemo(() => [...LISTINGS, ...userListings], [userListings])

  const filtered = useMemo(() => {
    let items = allListings.filter(l => l.type === activeTab)

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        l =>
          l.title.toLowerCase().includes(q) ||
          l.creator?.toLowerCase().includes(q) ||
          l.badge.toLowerCase().includes(q)
      )
    }

    if (sort === 'price') {
      items = [...items].sort((a, b) => parsePriceForSort(a.price) - parsePriceForSort(b.price))
    }
    // 'newest' and 'popular' keep default order (hardcoded ordering)

    return items
  }, [activeTab, search, sort])

  return (
    <div className="min-h-screen bg-black pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Banner ── */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-red-600/20 via-red-900/10 to-transparent border border-red-500/20 p-6 sm:p-8">
          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter mb-2 font-[family-name:var(--font-brand)]"
          >
            NPGX EXCHANGE
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl">
            Create &amp; Trade &mdash; Make music videos, trade tokens, collect content
          </p>
        </div>

        {/* ── Search + Sort Row ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:border-red-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs font-mono uppercase tracking-widest whitespace-nowrap">Sort by</span>
            <div className="flex bg-white/[0.03] rounded-lg p-0.5 border border-white/5">
              {SORT_OPTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    sort === s.key
                      ? 'bg-red-600 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex gap-1 mb-8 bg-white/[0.02] rounded-lg p-1 w-fit border border-white/5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 rounded-md text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === t.key
                  ? 'bg-red-600 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 font-mono text-sm">No listings found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── Card ─────────────────────────── */

function ListingCard({ listing }: { listing: Listing }) {
  const {
    title,
    creator,
    price,
    priceAlt,
    badge,
    thumbnail,
    subtitle,
    href,
    linkLabel,
    hrefAlt,
    hrefAltLabel,
    isCreateCard,
  } = listing

  const cardContent = (
    <div
      className={`group rounded-xl border transition-all duration-200 overflow-hidden ${
        isCreateCard
          ? 'border-dashed border-white/20 hover:border-red-500/50 bg-white/[0.02]'
          : 'border-white/10 hover:border-red-500/50 bg-white/5'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-zinc-900 relative overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : isCreateCard ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-600/10 to-transparent">
            <svg className="w-12 h-12 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-gray-500 text-sm font-mono">AI Storyboard</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-black text-white/10">{title.charAt(0)}</span>
          </div>
        )}

        {/* Badge */}
        <span className="absolute top-2 left-2 text-[9px] font-mono font-bold uppercase tracking-wider bg-black/70 backdrop-blur-sm text-red-400 px-2 py-0.5 rounded">
          {badge}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-sm truncate mb-0.5 font-[family-name:var(--font-brand)]">
          {title}
        </h3>
        {creator && (
          <p className="text-gray-500 text-xs truncate mb-1">{creator}</p>
        )}
        {subtitle && (
          <p className="text-gray-600 text-[11px] font-mono mb-3">{subtitle}</p>
        )}

        {/* Price + Actions */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-white font-mono text-sm font-bold">{price}</span>
            {priceAlt && (
              <span className="text-gray-500 font-mono text-xs ml-2">{priceAlt}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Primary link */}
            {href && linkLabel && (
              <Link
                href={href}
                className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                {linkLabel}
              </Link>
            )}

            {/* Secondary link (e.g. Buy XXX) */}
            {hrefAlt && hrefAltLabel && (
              <Link
                href={hrefAlt}
                className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                {hrefAltLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // If the card itself should be a link (no explicit action buttons), wrap it
  if (href && !linkLabel) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}
