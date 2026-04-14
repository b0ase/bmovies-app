'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

interface LibraryItem {
  id: string
  slug: string
  character: string
  token: string
  type: 'video' | 'image'
  src: string
  orientation: 'portrait' | 'landscape'
  duration?: number
  extensions: number
  created: string
}

// Load from content folders
function useContentLibrary(slug: string | null) {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!slug) { setItems([]); return }
    setLoading(true)
    fetch(`/api/content/list?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        const lib: LibraryItem[] = (data.items || []).map((item: any, i: number) => ({
          id: `${slug}-${i}`,
          slug,
          character: NPGX_ROSTER.find(c => c.slug === slug)?.name || slug,
          token: NPGX_ROSTER.find(c => c.slug === slug)?.token || '',
          type: item.type === 'video' ? 'video' : 'image',
          src: item.path,
          orientation: item.orientation,
          duration: item.type === 'video' ? 6 : undefined,
          extensions: 0,
          created: 'Recently',
        }))
        setItems(lib)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [slug])

  return { items, loading }
}

export default function StudioPage() {
  const [selectedGirl, setSelectedGirl] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [extending, setExtending] = useState(false)
  const [extensionPrompt, setExtensionPrompt] = useState('')
  const [intensity, setIntensity] = useState(50)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { items, loading } = useContentLibrary(selectedGirl)
  const character = NPGX_ROSTER.find(c => c.slug === selectedGirl)

  const handleExtend = () => {
    if (!selectedItem) return
    setExtending(true)
    // This would call the video generation API with the last frame as reference
    setTimeout(() => {
      setExtending(false)
      alert(`Extension queued! Spend ${intensity > 70 ? '15' : '10'} ${character?.token} tickets to extend this clip.`)
    }, 2000)
  }

  return (
    <div className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter mb-2" style={{ fontFamily: 'var(--font-brand)' }}>
            STUDIO
          </h1>
          <p className="text-gray-500 text-lg">
            Your content library. Extend videos, create sequences, build movies.
            Each action burns {character?.token || '$TOKEN'} tickets.
          </p>
        </div>

        {/* Girl Selector */}
        <div className="mb-8">
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Select Character</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {NPGX_ROSTER.map(c => (
              <button
                key={c.slug}
                onClick={() => { setSelectedGirl(c.slug); setSelectedItem(null) }}
                className={`shrink-0 relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedGirl === c.slug
                    ? 'border-red-500 ring-2 ring-red-500/30'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] font-mono text-center text-white">
                  {c.letter}
                </span>
              </button>
            ))}
          </div>
        </div>

        {!selectedGirl && (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">Select a character to view their content library</p>
          </div>
        )}

        {selectedGirl && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left — Library Grid */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  {character?.name} Library
                  <span className="text-gray-600 font-mono text-sm ml-2">({items.length} items)</span>
                </h2>
                <Link
                  href={`/npgx/${selectedGirl}`}
                  className="text-xs text-red-500 hover:text-red-400 font-mono"
                >
                  View Profile
                </Link>
              </div>

              {loading && (
                <div className="text-center py-10">
                  <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-gray-600 text-sm font-mono">Loading library...</p>
                </div>
              )}

              {!loading && items.length === 0 && (
                <div className="bg-white/[0.02] rounded-xl border border-white/5 p-10 text-center">
                  <p className="text-gray-500 mb-4">No content yet for {character?.name}</p>
                  <Link
                    href={`/npgx/${selectedGirl}`}
                    className="inline-block bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    Generate First Image
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedItem(item)}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-colors ${
                      selectedItem?.id === item.id
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : 'border-white/10 hover:border-white/20'
                    } ${item.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.src}
                        muted
                        loop
                        playsInline
                        onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0 }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img src={item.src} alt="" className="w-full h-full object-cover" />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <span className="text-[9px] font-mono text-white/80 bg-black/50 px-1.5 py-0.5 rounded">
                        {item.type === 'video' ? `${item.duration}s` : 'IMG'}
                      </span>
                      {item.extensions > 0 && (
                        <span className="text-[9px] font-mono text-red-400 bg-black/50 px-1.5 py-0.5 rounded">
                          +{item.extensions} ext
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right — Extension Panel */}
            <div>
              <div className="sticky top-24 space-y-6">

                {/* Preview */}
                <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
                  {selectedItem ? (
                    <>
                      <div className={`relative ${selectedItem.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
                        {selectedItem.type === 'video' ? (
                          <video
                            ref={videoRef}
                            src={selectedItem.src}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img src={selectedItem.src} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-gray-500">{selectedItem.type.toUpperCase()}</span>
                          <span className="text-xs font-mono text-gray-600">{selectedItem.orientation}</span>
                        </div>
                        <p className="text-sm text-white font-mono">{selectedItem.src.split('/').pop()}</p>
                      </div>
                    </>
                  ) : (
                    <div className="aspect-[3/4] flex items-center justify-center">
                      <p className="text-gray-600 text-sm">Select content to preview</p>
                    </div>
                  )}
                </div>

                {/* Extend Controls */}
                {selectedItem?.type === 'video' && (
                  <div className="bg-white/[0.03] rounded-xl border border-white/10 p-5">
                    <h3 className="text-sm font-bold text-white mb-4">EXTEND VIDEO</h3>

                    <div className="mb-4">
                      <label className="block text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">
                        Direction prompt (optional)
                      </label>
                      <textarea
                        value={extensionPrompt}
                        onChange={e => setExtensionPrompt(e.target.value)}
                        placeholder="Describe what happens next..."
                        rows={3}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-red-500 focus:outline-none resize-none font-mono"
                      />
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">
                        <span>Intensity</span>
                        <span className={intensity > 70 ? 'text-red-400' : ''}>{intensity}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={intensity}
                        onChange={e => setIntensity(parseInt(e.target.value))}
                        className="w-full h-1 accent-red-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] font-mono mt-1">
                        <span className="text-gray-700">Subtle</span>
                        <span className="text-gray-700">Standard</span>
                        <span className="text-red-500/50">Explicit</span>
                      </div>
                    </div>

                    {intensity > 70 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                        <p className="text-[10px] font-mono text-red-400">
                          $401 identity verification required for explicit content.
                          Age-gated. 15 tickets per extension.
                        </p>
                      </div>
                    )}

                    <div className="bg-black/30 rounded-lg p-3 mb-4 space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-500">Extension cost</span>
                        <span className="text-white">{intensity > 70 ? '15' : '10'} {character?.token}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-500">Duration added</span>
                        <span className="text-white">+6 seconds</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-500">Inscription</span>
                        <span className="text-gray-500">1sat ordinal</span>
                      </div>
                    </div>

                    <button
                      onClick={handleExtend}
                      disabled={extending}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:text-red-400 text-white font-bold text-sm transition-colors"
                    >
                      {extending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Extending...
                        </span>
                      ) : (
                        `EXTEND — ${intensity > 70 ? '15' : '10'} ${character?.token}`
                      )}
                    </button>
                  </div>
                )}

                {/* Generate New */}
                {selectedItem?.type === 'image' && (
                  <div className="bg-white/[0.03] rounded-xl border border-white/10 p-5">
                    <h3 className="text-sm font-bold text-white mb-3">IMAGE TO VIDEO</h3>
                    <p className="text-xs text-gray-500 font-mono mb-4">
                      Animate this image into a 6-second video clip using Wan 2.2
                    </p>
                    <div className="bg-black/30 rounded-lg p-3 mb-4">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-500">Cost</span>
                        <span className="text-white">10 {character?.token}</span>
                      </div>
                    </div>
                    <button className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors">
                      ANIMATE — 10 {character?.token}
                    </button>
                  </div>
                )}

                {/* Token Balance */}
                <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono text-gray-600 uppercase">Your Balance</p>
                      <p className="text-lg font-mono text-white font-bold">0 {character?.token}</p>
                    </div>
                    <Link
                      href="/exchange"
                      className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg"
                    >
                      BUY TICKETS
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
