'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  FaUserNinja, FaWallet, FaSignOutAlt, FaCamera, FaVideo,
  FaBook, FaScroll, FaMusic, FaIdCard, FaSkull, FaFilm,
  FaPlus, FaChevronRight, FaFolderOpen, FaSync, FaDatabase,
  FaHdd, FaCrown, FaCreditCard, FaShieldAlt, FaPaintBrush, FaRocket
} from 'react-icons/fa'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

type ContentItem = {
  id: string
  type: string
  title: string
  thumbnail?: string
  createdAt: string
  character?: string
  url?: string
  provider?: string
  cost?: number
  source?: 'db' | 'local'
}

const TYPE_MAP: Record<string, string> = {
  image: 'images',
  video: 'videos',
  magazine: 'magazines',
  script: 'scripts',
  song: 'music',
  card: 'cards',
  production: 'productions',
}

const LIBRARY_SECTIONS = [
  {
    key: 'images',
    contentType: 'image',
    label: 'Images',
    icon: FaCamera,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    createHref: '/prompt-gen',
    createLabel: 'Generate Image',
    localKey: 'npgx_library_images',
  },
  {
    key: 'videos',
    contentType: 'video',
    label: 'Videos',
    icon: FaVideo,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    createHref: '/video-gen',
    createLabel: 'Generate Video',
    localKey: 'npgx_library_videos',
  },
  {
    key: 'magazines',
    contentType: 'magazine',
    label: 'Magazines',
    icon: FaBook,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    createHref: '/magazine',
    createLabel: 'Generate Magazine',
    localKey: 'npgx_library_magazines',
  },
  {
    key: 'scripts',
    contentType: 'script',
    label: 'Scripts',
    icon: FaScroll,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    createHref: '/script-gen',
    createLabel: 'Write Script',
    localKey: 'npgx_library_scripts',
  },
  {
    key: 'music',
    contentType: 'song',
    label: 'Music',
    icon: FaMusic,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    createHref: '/music-gen',
    createLabel: 'Generate Song',
    localKey: 'npgx_library_music',
  },
  {
    key: 'cards',
    contentType: 'card',
    label: 'Trading Cards',
    icon: FaIdCard,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    createHref: '/cards',
    createLabel: 'Open Pack',
    localKey: 'npgx_library_cards',
  },
  {
    key: 'characters',
    contentType: 'character',
    label: 'Characters',
    icon: FaSkull,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    createHref: '/character-gen',
    createLabel: 'Create Character',
    localKey: 'npgx_library_characters',
  },
  {
    key: 'productions',
    contentType: 'production',
    label: 'Productions',
    icon: FaFilm,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    createHref: '/one-shot',
    createLabel: 'Full Production',
    localKey: 'npgx_library_productions',
  },
]

/* ── Creator Status Section ── */
function LicenceSection() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-10">
      <div className="bg-gradient-to-r from-red-950/30 to-transparent border border-white/5 rounded-2xl p-5">
        {/* Creator tier progression */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-white font-black text-sm uppercase tracking-wider" style={{ fontFamily: 'var(--font-brand)' }}>
              CREATOR TOOLS
            </h3>
            <p className="text-gray-600 text-xs mt-0.5">
              Start creating for free. Pay per generation. Upgrade as you grow.
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-600 text-[10px] uppercase tracking-wider hover:text-gray-400 transition"
          >
            {expanded ? '▾ Less' : '▸ Details'}
          </button>
        </div>

        {/* Progression steps — always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-500 text-[9px] font-black">1</span>
              </div>
              <span className="text-green-500 text-[10px] font-bold uppercase">Free</span>
            </div>
            <div className="text-white text-[10px] font-bold">Browse & Explore</div>
            <div className="text-gray-700 text-[9px]">26 characters, gallery, music</div>
          </div>

          <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <span className="text-cyan-500 text-[9px] font-black">2</span>
              </div>
              <span className="text-cyan-500 text-[10px] font-bold uppercase">~$0.01</span>
            </div>
            <div className="text-white text-[10px] font-bold">Create Content</div>
            <div className="text-gray-700 text-[9px]">Pay per image, video, magazine</div>
          </div>

          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-500 text-[9px] font-black">3</span>
              </div>
              <span className="text-red-500 text-[10px] font-bold uppercase">$30/mo</span>
            </div>
            <div className="text-white text-[10px] font-bold">Unlimited Credits</div>
            <div className="text-gray-700 text-[9px]">Heavy creation, all AI tools</div>
          </div>

          <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <span className="text-yellow-500 text-[9px] font-black">4</span>
              </div>
              <span className="text-yellow-500 text-[10px] font-bold uppercase">KYC</span>
            </div>
            <div className="text-white text-[10px] font-bold">Issue Your Token</div>
            <div className="text-gray-700 text-[9px]">Verify ID, mint securities</div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
            {/* Tools available */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { icon: <FaPaintBrush className="w-3 h-3" />, label: 'AI Image Gen', cost: '~$0.01' },
                { icon: <FaFilm className="w-3 h-3" />, label: 'Video Clips', cost: '~$0.75' },
                { icon: <FaMusic className="w-3 h-3" />, label: 'Karaoke Lyrics', cost: '~$0.05' },
                { icon: <FaBook className="w-3 h-3" />, label: 'Magazine', cost: '~$0.25' },
                { icon: <FaIdCard className="w-3 h-3" />, label: 'Mint Token', cost: '~$0.05' },
                { icon: <FaRocket className="w-3 h-3" />, label: 'Premiere Export', cost: '~$0.10' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="text-red-500/50">{item.icon}</div>
                    <span className="text-white text-[10px] font-bold">{item.label}</span>
                  </div>
                  <span className="text-green-500/60 text-[9px] font-mono">{item.cost}</span>
                </div>
              ))}
            </div>

            {/* Revenue split */}
            <div>
              <div className="text-gray-600 text-[10px] uppercase tracking-wider font-bold mb-2">When You Sell</div>
              <div className="flex rounded-lg overflow-hidden">
                <div className="flex-1 bg-red-600/80 py-2 text-center">
                  <div className="text-white text-xs font-black">50% — YOU</div>
                </div>
                <div className="flex-1 bg-gray-800 py-2 text-center">
                  <div className="text-gray-400 text-xs font-black">50% — NPGX</div>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div>
              <div className="text-gray-600 text-[10px] uppercase tracking-wider font-bold mb-2">Pay With</div>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-white/5 px-2.5 py-1.5 rounded-lg">
                  <FaCreditCard className="w-3 h-3 text-cyan-500" /> Card / PayPal
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-white/5 px-2.5 py-1.5 rounded-lg">
                  <FaWallet className="w-3 h-3 text-yellow-500" /> HandCash (BSV)
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-white/5 px-2.5 py-1.5 rounded-lg">
                  <FaShieldAlt className="w-3 h-3 text-green-500" /> BSVAPI Credits
                  <span className="text-yellow-500/60 text-[8px]">soon</span>
                </span>
              </div>
            </div>

            <p className="text-gray-700 text-[9px]">
              Every creation is automatically hashed to BSV blockchain. Chain provenance from the moment of creation.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UserAccountPage() {
  const [handle, setHandle] = useState<string | null>(null)
  const [library, setLibrary] = useState<Record<string, ContentItem[]>>({})
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dbCount, setDbCount] = useState(0)
  const [localCount, setLocalCount] = useState(0)

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    const merged: Record<string, ContentItem[]> = {}
    const seenIds = new Set<string>()

    // 1. Fetch from database API
    try {
      const res = await fetch('/api/user/content')
      if (res.ok) {
        const data = await res.json()
        let dbTotal = 0
        for (const [contentType, items] of Object.entries(data.content) as [string, any[]][]) {
          const sectionKey = TYPE_MAP[contentType] || contentType
          if (!merged[sectionKey]) merged[sectionKey] = []
          for (const item of items) {
            seenIds.add(item.id)
            merged[sectionKey].push({ ...item, source: 'db' as const })
            dbTotal++
          }
        }
        setDbCount(dbTotal)
      }
    } catch {
      // DB unavailable — localStorage only
    }

    // 2. Merge localStorage items (dedup by id)
    let localTotal = 0
    LIBRARY_SECTIONS.forEach(section => {
      try {
        const raw = localStorage.getItem(section.localKey)
        const items: ContentItem[] = raw ? JSON.parse(raw) : []
        if (!merged[section.key]) merged[section.key] = []
        for (const item of items) {
          if (!seenIds.has(item.id)) {
            merged[section.key].push({ ...item, source: 'local' as const })
            seenIds.add(item.id)
            localTotal++
          }
        }
      } catch {
        // Skip corrupt localStorage
      }
    })
    setLocalCount(localTotal)

    // Sort each section by date descending
    for (const key of Object.keys(merged)) {
      merged[key].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    setLibrary(merged)
    setLoading(false)
  }, [])

  useEffect(() => {
    setHandle(getCookie('npgx_user_handle'))
    loadLibrary()
  }, [loadLibrary])

  const handleLogout = async () => {
    await fetch('/api/auth/handcash/logout')
    window.location.href = '/'
  }

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/handcash/login?returnTo=/user/account')
      const data = await res.json()
      if (data.redirectUrl) window.location.href = data.redirectUrl
    } catch {
      window.location.href = '/api/auth/handcash?returnTo=/user/account'
    }
  }

  if (!handle) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-red-600/20 border-2 border-red-500/50 flex items-center justify-center mx-auto">
            <FaUserNinja className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-brand)' }}>
            YOUR ACCOUNT
          </h1>
          <p className="text-gray-500">
            Sign in with HandCash to access your content library, manage your agent, and trade on the exchange.
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold text-lg transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-3"
          >
            <FaWallet className="w-5 h-5" />
            Sign In with HandCash
          </button>
          <p className="text-gray-700 text-xs">
            Need a wallet?{' '}
            <a href="https://handcash.io" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">
              Get HandCash
            </a>
          </p>
        </div>
      </div>
    )
  }

  const totalItems = Object.values(library).reduce((sum, items) => sum + items.length, 0)
  const totalCost = Object.values(library).flat().reduce((sum, item) => sum + (item.cost || 0), 0)

  return (
    <div className="min-h-screen pt-28 pb-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-red-600/20 border-2 border-red-500/50 flex items-center justify-center">
              <FaUserNinja className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h1
                className="text-3xl font-black text-white"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                {handle}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-500 text-sm flex items-center gap-1.5">
                  <FaWallet className="w-3 h-3" /> HandCash
                </span>
                <span className="text-green-400 text-xs font-bold uppercase tracking-wider bg-green-400/10 px-2 py-0.5 rounded">
                  Paid
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadLibrary}
              disabled={loading}
              className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors disabled:opacity-50"
            >
              <FaSync className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-400 text-sm transition-colors"
            >
              <FaSignOutAlt className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-brand)' }}>
              {totalItems}
            </div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Total Items</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-brand)' }}>
              {library.images?.length || 0}
            </div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Images</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-brand)' }}>
              {library.productions?.length || 0}
            </div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Productions</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-green-400" style={{ fontFamily: 'var(--font-brand)' }}>
              ${totalCost.toFixed(2)}
            </div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Spent</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <FaDatabase className="w-3 h-3 text-blue-400" />
              <span className="text-sm text-blue-400 font-bold">{dbCount}</span>
              <FaHdd className="w-3 h-3 text-amber-400 ml-1" />
              <span className="text-sm text-amber-400 font-bold">{localCount}</span>
            </div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">DB / Local</div>
          </div>
        </div>

        {/* Licence + Payment */}
        <LicenceSection />

        {/* Content Library */}
        <h2
          className="text-xl font-black text-white mb-6"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          CONTENT LIBRARY
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {LIBRARY_SECTIONS.map(section => {
            const items = library[section.key] || []
            const isActive = activeTab === section.key
            return (
              <button
                key={section.key}
                onClick={() => setActiveTab(isActive ? null : section.key)}
                className={`text-left ${section.bg} border ${section.border} rounded-xl p-5 transition-all hover:scale-[1.02] ${isActive ? 'ring-2 ring-white/20' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                  <span className="text-white text-lg font-black" style={{ fontFamily: 'var(--font-brand)' }}>
                    {items.length}
                  </span>
                </div>
                <div className="text-white text-sm font-bold">{section.label}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {items.length === 0 ? 'Nothing yet' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
                </div>
              </button>
            )
          })}
        </div>

        {/* Expanded Section */}
        {activeTab && (() => {
          const section = LIBRARY_SECTIONS.find(s => s.key === activeTab)!
          const items = library[section.key] || []
          return (
            <div className={`${section.bg} border ${section.border} rounded-2xl p-6 mb-8`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-brand)' }}>
                    {section.label}
                  </h3>
                </div>
                <Link
                  href={section.createHref}
                  className={`flex items-center gap-2 ${section.color} text-sm font-bold hover:text-white transition-colors`}
                >
                  <FaPlus className="w-3 h-3" />
                  {section.createLabel}
                </Link>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12">
                  <FaFolderOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-4">No {section.label.toLowerCase()} yet</p>
                  <Link
                    href={section.createHref}
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                  >
                    <FaPlus className="w-3 h-3" />
                    {section.createLabel}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="bg-black/30 border border-white/5 rounded-lg overflow-hidden group cursor-pointer hover:border-white/20 transition-all"
                    >
                      {item.thumbnail ? (
                        <div className="aspect-square bg-gray-900 relative">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          {item.source === 'db' && (
                            <div className="absolute top-1.5 right-1.5">
                              <FaDatabase className="w-2.5 h-2.5 text-blue-400 opacity-60" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-900/50 flex items-center justify-center relative">
                          <section.icon className={`w-8 h-8 ${section.color} opacity-30`} />
                          {item.source === 'db' && (
                            <div className="absolute top-1.5 right-1.5">
                              <FaDatabase className="w-2.5 h-2.5 text-blue-400 opacity-60" />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-2.5">
                        <div className="text-white text-xs font-medium truncate">{item.title}</div>
                        <div className="flex items-center justify-between mt-0.5">
                          {item.character && (
                            <div className="text-gray-600 text-[10px]">{item.character}</div>
                          )}
                          {item.cost != null && item.cost > 0 && (
                            <div className="text-green-500/50 text-[10px]">${item.cost.toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* Quick Actions */}
        <h2
          className="text-xl font-black text-white mb-4"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          CREATE
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LIBRARY_SECTIONS.map(section => (
            <Link
              key={section.key}
              href={section.createHref}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all group"
            >
              <section.icon className={`w-4 h-4 ${section.color}`} />
              <span className="text-gray-400 group-hover:text-white text-sm font-medium transition-colors">
                {section.createLabel}
              </span>
              <FaChevronRight className="w-2.5 h-2.5 text-gray-700 group-hover:text-gray-400 ml-auto transition-colors" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
