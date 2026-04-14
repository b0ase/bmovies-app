'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { cdnUrl } from '@/lib/cdn'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import Link from 'next/link'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

/* ─── Mock feed data — will come from marketplace API ─── */
interface FeedItem {
  id: string
  type: 'video' | 'image' | 'music-video'
  src: string
  thumbnail?: string
  title: string
  creator: string
  creatorHandle: string
  girls: { name: string; token: string; slug: string; image: string }[]
  price: string
  tokenCost: number
  likes: number
  views: number
  timeAgo: string
  description: string
}

// Generate feed from existing content
function generateMockFeed(): FeedItem[] {
  const videos = [
    cdnUrl('landing-page-videos/magazine-preview.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-3.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-4.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-5.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-6.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-7.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-8.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-9.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-10.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-11.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-12.mp4'),
    cdnUrl('landing-page-videos/magazine-preview-13.mp4'),
    cdnUrl('landing-page-videos/grok-video-895483de-c586-44f6-81f3-851c5e6c615a.mp4'),
    cdnUrl('landing-page-videos/grok-video-fa18a0a9-2ed2-4842-9674-22cb6e9b3043 (3).mp4'),
    cdnUrl('landing-page-videos/grok-video-fa18a0a9-2ed2-4842-9674-22cb6e9b3043 (4).mp4'),
    cdnUrl('landing-page-videos/grok-video-fa18a0a9-2ed2-4842-9674-22cb6e9b3043 (5).mp4'),
    cdnUrl('landing-page-videos/grok-video-fa18a0a9-2ed2-4842-9674-22cb6e9b3043 (6).mp4'),
    cdnUrl('landing-page-videos/grok-video-53975e60-f22c-4839-bd4f-447e73e86716.mp4'),
    cdnUrl('landing-page-videos/grok-video-cd670ae0-42ec-4cdc-a707-56f72278c08c.mp4'),
    cdnUrl('landing-page-videos/grok-video-1648cc68-c6d1-4e1f-aa73-3e037215f211 (2).mp4'),
    cdnUrl('landing-page-videos/grok-video-1648cc68-c6d1-4e1f-aa73-3e037215f211 (3).mp4'),
  ]

  const handles = ['@director_kai', '@neon_queen', '@tokyo_drift', '@shadow_cuts', '@cyber_lens', '@punk_vision', '@blade_runner_x', '@void_cinema']
  const titles = [
    'Neon Alley Encounter', 'Midnight Prowl', 'Rooftop Confrontation', 'Underground Sessions',
    'Rain City Walk', 'Dark Club Night', 'Backstage Heat', 'Highway Chase',
    'Tattoo Parlor After Dark', 'The Approach', 'Smoke & Mirrors', 'Crimson Light',
    'Blade Dance', 'Voltage', 'Ghost Protocol', 'Neon Requiem',
    'Tokyo After Hours', 'Shadow Play', 'Electric Dreams', 'Fire Exit', 'Zero Gravity'
  ]

  return videos.map((src, i) => {
    const girl1 = NPGX_ROSTER[i % NPGX_ROSTER.length]
    const hasCollab = i % 5 === 0
    const girl2 = hasCollab ? NPGX_ROSTER[(i + 7) % NPGX_ROSTER.length] : null
    const girls = [{ name: girl1.name, token: girl1.token, slug: girl1.slug, image: girl1.image }]
    if (girl2) girls.push({ name: girl2.name, token: girl2.token, slug: girl2.slug, image: girl2.image })

    return {
      id: `feed-${i}`,
      type: hasCollab ? 'music-video' : 'video',
      src,
      title: titles[i % titles.length],
      creator: handles[i % handles.length].replace('@', '').replace(/_/g, ' '),
      creatorHandle: handles[i % handles.length],
      girls,
      price: `$${(0.5 + Math.random() * 4.5).toFixed(2)}`,
      tokenCost: Math.floor(5 + Math.random() * 45),
      likes: Math.floor(50 + Math.random() * 2000),
      views: Math.floor(200 + Math.random() * 10000),
      timeAgo: `${Math.floor(1 + Math.random() * 48)}h ago`,
      description: hasCollab
        ? `${girl1.name.split(' ')[0]} x ${girl2!.name.split(' ')[0]} collab — directed by ${handles[i % handles.length]}`
        : `${girl1.name.split(' ')[0]} scene — ${girl1.tagline}`,
    }
  })
}

type ViewMode = 'scroll' | 'swipe'

export default function FeedPage() {
  const [mode, setMode] = useState<ViewMode>('scroll')
  const [feed] = useState(generateMockFeed)
  const [swipeIdx, setSwipeIdx] = useState(0)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set())

  const currentSwipeItem = feed[swipeIdx % feed.length]

  // Swipe handlers
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const leftOpacity = useTransform(x, [-200, -50, 0], [1, 0.5, 0])
  const rightOpacity = useTransform(x, [0, 50, 200], [0, 0.5, 1])

  const handleSwipe = (direction: 'left' | 'right') => {
    setSwipeDirection(direction)
    if (direction === 'right') {
      setLikedItems(prev => new Set([...prev, currentSwipeItem.id]))
    }
    setTimeout(() => {
      setSwipeIdx(i => i + 1)
      setSwipeDirection(null)
    }, 300)
  }

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) handleSwipe('right')
    else if (info.offset.x < -100) handleSwipe('left')
  }

  return (
    <div className="min-h-screen pt-20 pb-32">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white tracking-tighter" style={{ fontFamily: 'var(--font-brand)' }}>
            FEED
          </h1>
          <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1">
            <button
              onClick={() => setMode('scroll')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                mode === 'scroll' ? 'bg-red-600 text-white' : 'text-gray-500'
              }`}
            >
              Scroll
            </button>
            <button
              onClick={() => setMode('swipe')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                mode === 'swipe' ? 'bg-red-600 text-white' : 'text-gray-500'
              }`}
            >
              Swipe
            </button>
          </div>
        </div>

        {/* ─── SCROLL MODE (Instagram-style) ─── */}
        {mode === 'scroll' && (
          <div className="space-y-6">
            {feed.map(item => (
              <FeedCard
                key={item.id}
                item={item}
                liked={likedItems.has(item.id)}
                onLike={() => {
                  setLikedItems(prev => {
                    const next = new Set(prev)
                    if (next.has(item.id)) next.delete(item.id)
                    else next.add(item.id)
                    return next
                  })
                }}
              />
            ))}
          </div>
        )}

        {/* ─── SWIPE MODE (Tinder-style) ─── */}
        {mode === 'swipe' && (
          <div className="relative" style={{ height: '70vh' }}>
            {/* Swipe indicators */}
            <motion.div
              style={{ opacity: rightOpacity }}
              className="absolute top-8 right-8 z-30 bg-green-500/90 text-white text-2xl font-black px-4 py-2 rounded-xl rotate-12 border-4 border-green-400"
            >
              BUY
            </motion.div>
            <motion.div
              style={{ opacity: leftOpacity }}
              className="absolute top-8 left-8 z-30 bg-red-500/90 text-white text-2xl font-black px-4 py-2 rounded-xl -rotate-12 border-4 border-red-400"
            >
              PASS
            </motion.div>

            {/* Card stack */}
            <AnimatePresence>
              <motion.div
                key={swipeIdx}
                style={{ x, rotate }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.8}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{
                  x: swipeDirection === 'right' ? 300 : swipeDirection === 'left' ? -300 : 0,
                  opacity: 0,
                  transition: { duration: 0.3 }
                }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
              >
                <div className="h-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-900">
                  {/* Video */}
                  <div className="relative h-[75%]">
                    <video
                      key={currentSwipeItem.src}
                      src={currentSwipeItem.src}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                    {/* Girl badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {currentSwipeItem.girls.map(g => (
                        <div key={g.slug} className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full pl-1 pr-3 py-1">
                          <img src={g.image} alt={g.name} className="w-6 h-6 rounded-full object-cover border border-white/20" />
                          <span className="text-[10px] font-mono text-white font-bold">{g.token}</span>
                        </div>
                      ))}
                    </div>

                    {/* Type badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded-full ${
                        currentSwipeItem.type === 'music-video' ? 'bg-purple-500/30 text-purple-300' : 'bg-red-500/30 text-red-300'
                      }`}>
                        {currentSwipeItem.type === 'music-video' ? 'COLLAB' : 'VIDEO'}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 h-[25%] flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white">{currentSwipeItem.title}</h3>
                      <p className="text-xs text-gray-500 font-mono">{currentSwipeItem.creatorHandle} · {currentSwipeItem.timeAgo}</p>
                      <p className="text-xs text-gray-600 mt-1">{currentSwipeItem.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-mono text-gray-500">
                        <span>{currentSwipeItem.views.toLocaleString()} views</span>
                        <span>{currentSwipeItem.likes} likes</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-white">{currentSwipeItem.price}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Swipe buttons */}
            <div className="absolute -bottom-16 left-0 right-0 flex items-center justify-center gap-6">
              <button
                onClick={() => handleSwipe('left')}
                className="w-14 h-14 rounded-full border-2 border-red-500/50 text-red-500 flex items-center justify-center text-2xl hover:bg-red-500/10 transition-colors"
              >
                ✕
              </button>
              <button
                onClick={() => handleSwipe('right')}
                className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center text-2xl hover:bg-green-400 transition-colors shadow-lg shadow-green-500/30"
              >
                ♥
              </button>
            </div>

            {/* Counter */}
            <div className="absolute -bottom-16 right-0 text-xs font-mono text-gray-700">
              {swipeIdx + 1}/{feed.length}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Instagram-style Feed Card ─── */
function FeedCard({ item, liked, onLike }: { item: FeedItem; liked: boolean; onLike: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Autoplay when visible
  useEffect(() => {
    if (!cardRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {})
          setPlaying(true)
        } else {
          videoRef.current?.pause()
          setPlaying(false)
        }
      },
      { threshold: 0.6 }
    )
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={cardRef} className="rounded-xl overflow-hidden border border-white/10 bg-zinc-900/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          {item.girls.map(g => (
            <Link key={g.slug} href={`/npgx/${g.slug}`}>
              <img src={g.image} alt={g.name} className="w-8 h-8 rounded-full object-cover border border-white/20 hover:border-red-500 transition-colors" />
            </Link>
          ))}
          <div>
            <p className="text-xs font-bold text-white">
              {item.girls.map(g => g.token).join(' × ')}
            </p>
            <p className="text-[10px] text-gray-600 font-mono">{item.creatorHandle} · {item.timeAgo}</p>
          </div>
        </div>
        {item.type === 'music-video' && (
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">COLLAB</span>
        )}
      </div>

      {/* Video */}
      <div className="relative aspect-[4/5] bg-black">
        <video
          ref={videoRef}
          src={item.src}
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          onClick={() => {
            if (playing) { videoRef.current?.pause(); setPlaying(false) }
            else { videoRef.current?.play().catch(() => {}); setPlaying(true) }
          }}
        />
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl ml-1">▶</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button onClick={onLike} className="transition-transform hover:scale-110">
              <span className={`text-xl ${liked ? 'text-red-500' : 'text-gray-500'}`}>
                {liked ? '♥' : '♡'}
              </span>
            </button>
            <span className="text-xs font-mono text-gray-500">{item.views.toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-600">{item.tokenCost} {item.girls[0].token}</span>
            <button className="text-xs font-bold bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg transition-colors">
              Buy {item.price}
            </button>
          </div>
        </div>

        <p className="text-sm font-bold text-white">{item.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
      </div>
    </div>
  )
}
