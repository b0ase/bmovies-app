'use client'

import { motion, useAnimationControls } from 'framer-motion'
import { cdnUrl } from '@/lib/cdn'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Media items: images + videos interleaved ───────────

type MediaItem = { type: 'video'; src: string; poster: string }

// Helper — every item is a video with its matching poster image (same UUID)
function v(uuid: string): MediaItem {
  return {
    type: 'video',
    src: `/NPG-X-10/grok-video-${uuid}.mp4`,
    poster: `/NPG-X-10/${uuid}.jpg`,
  }
}

// Row 1 — 14 video+poster combos, scrolls left
const row1Items: MediaItem[] = [
  v('00f227e8-2b57-4b73-835a-85cf066e267d'),
  v('87b6d7dc-529a-4337-892d-0212b6b77d52'),
  v('c768ec7e-7116-4d88-8b41-74ef5afc718b'),
  v('7e9a0915-a58d-4251-b601-661c4e122009'),
  v('a829f0c9-4f78-465d-a101-27fa7f737f0b'),
  v('928f01d0-801b-4848-8d07-635952fd5b09'),
  v('94d38684-ebdb-490a-b492-2450ec8f7537'),
  v('0f72aa6e-8618-4266-9d90-ff0687264d9c'),
  v('70de0ca2-3273-4d3c-9418-2451bddbad1a'),
  v('4c46274a-e2c0-4785-8a6b-b999ab74a426'),
  v('1ef5a2ff-6384-4ab9-b078-17a755e5ae29'),
  v('86c6864b-fdd4-4605-8e6e-579650e998e3'),
  v('24096e83-6ec2-4592-a804-c396f15206d3'),
  v('3081b9ea-0cf9-4af0-8528-ab839f3f4c92'),
]

// Row 2 — 14 different video+poster combos, scrolls right
const row2Items: MediaItem[] = [
  v('eb5bfadf-d662-4be3-87b3-4644bf63c80b'),
  v('b4b70ed6-023d-4575-8121-2ac28e7edc92'),
  v('0ad857c9-3e2c-431c-8a0f-ec8596f6a6b8'),
  v('c3ee0a4f-4e08-4e76-bcf9-ab94a237e70a'),
  v('f692ee6e-d382-4a49-ba8c-ddfa21a5fbea'),
  v('add0c067-bff3-48cc-ad02-b027bd42931b'),
  v('e61093d5-3538-4000-aa99-e596739cde6f'),
  v('79ec3b10-40b8-4304-81c2-facf266239b3'),
  v('c9cf74e2-0795-43e9-b94e-3d3966435481'),
  v('10fb4c73-a5cb-4ac4-9584-cb775835e25d'),
  v('db5d327c-3211-447f-86c7-d610258f4db2'),
  v('5e080ee6-40be-4b79-900d-9037df818cbd'),
  v('357d11bb-f104-4bca-a5da-54a73129d052'),
  v('d1b91933-020f-4b83-8bb4-eb55768ab3cf'),
]

// ─── FilmstripItem — hover plays video, shows play icon ─

function FilmstripItem({ item, onHover, onLeave, autoPlay }: {
  item: MediaItem
  onHover: () => void
  onLeave: () => void
  autoPlay?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

  // Random auto-play on scroll into view
  useEffect(() => {
    if (!autoPlay || !containerRef.current) return
    const el = containerRef.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && videoRef.current && !playing) {
          // Small delay so they don't all fire at once
          const delay = Math.random() * 2000
          const timer = setTimeout(() => {
            videoRef.current?.play().catch(() => {})
            setPlaying(true)
          }, delay)
          return () => clearTimeout(timer)
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [autoPlay, playing])

  const handleEnter = useCallback(() => {
    onHover()
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
      setPlaying(true)
    }
  }, [onHover])

  const handleLeave = useCallback(() => {
    onLeave()
    if (videoRef.current && !autoPlay) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setPlaying(false)
    }
  }, [onLeave, autoPlay])

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0 w-48 sm:w-56 lg:w-64 overflow-hidden rounded-lg relative group cursor-pointer"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <video
        ref={videoRef}
        src={item.src}
        poster={item.poster}
        className="w-full h-32 sm:h-40 lg:h-48 object-cover"
        muted
        playsInline
        loop
        preload="none"
      />
      {/* Red border glow on hover */}
      <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-red-500/50 transition-colors pointer-events-none" />
    </div>
  )
}

// ─── Filmstrip row with pause-on-hover ──────────────────

function FilmstripRow({ items, direction, duration }: {
  items: MediaItem[]
  direction: 'left' | 'right'
  duration: number
}) {
  const controls = useAnimationControls()
  const [isClient, setIsClient] = useState(false)
  const hoverCount = useRef(0)

  // Pre-compute which items auto-play (~25% chance each, stable across renders)
  const autoPlaySet = useRef(new Set<number>())
  if (autoPlaySet.current.size === 0) {
    const doubled = items.length * 2
    for (let i = 0; i < doubled; i++) {
      if (Math.random() < 0.25) autoPlaySet.current.add(i)
    }
    // Ensure at least 2 auto-play per row
    if (autoPlaySet.current.size < 2) {
      autoPlaySet.current.add(Math.floor(Math.random() * doubled))
      autoPlaySet.current.add(Math.floor(Math.random() * doubled))
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return
    const from = direction === 'left' ? '0%' : '-50%'
    const to = direction === 'left' ? '-50%' : '0%'
    controls.start({ x: [from, to], transition: { duration, ease: 'linear', repeat: Infinity } })
  }, [isClient, controls, direction, duration])

  const handleItemHover = useCallback(() => {
    hoverCount.current++
    controls.stop()
  }, [controls])

  const handleItemLeave = useCallback(() => {
    hoverCount.current--
    // Only resume if nothing is hovered
    if (hoverCount.current <= 0) {
      hoverCount.current = 0
      const from = direction === 'left' ? '0%' : '-50%'
      const to = direction === 'left' ? '-50%' : '0%'
      controls.start({ x: [from, to], transition: { duration, ease: 'linear', repeat: Infinity } })
    }
  }, [controls, direction, duration])

  const doubled = [...items, ...items]

  return (
    <div className="relative z-10 overflow-hidden py-3">
      <motion.div
        className="flex gap-3"
        animate={controls}
        style={{ width: 'max-content' }}
      >
        {doubled.map((item, idx) => (
          <FilmstripItem
            key={idx}
            item={item}
            onHover={handleItemHover}
            onLeave={handleItemLeave}
            autoPlay={autoPlaySet.current.has(idx)}
          />
        ))}
      </motion.div>
    </div>
  )
}

// ─── Main HeroSection ───────────────────────────────────

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background video — Tokyo Gutter Queen clips */}
      <video
        className="absolute inset-0 w-full h-full object-cover object-top"
        autoPlay muted loop playsInline
        src={cdnUrl('landing-page-videos/TITLE_VIDEO.mp4')}
      />
      {/* Dark overlay so text is readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90" />

      {/* ---- TOP: Headline + CTAs ---- */}
      <div className="relative z-10 pt-36 sm:pt-44 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="max-w-5xl mx-auto space-y-6"
        >
          {/* $NPGX title with magazine left + album right */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 1 }}
            className="font-black leading-none tracking-tighter text-center relative"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            {/* Magazine — floating left, above center */}
            <motion.div
              initial={{ opacity: 0, x: -40, rotate: -8 }}
              animate={{ opacity: 1, x: 0, rotate: -4 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="hidden lg:block absolute"
              style={{ left: '-28%', top: '-30%' }}
            >
              <Link href="/magazine/issue-001" className="group block">
                <img src={cdnUrl('NPG-X-10/a4e7133a-ba6d-451f-8093-42d7b7264073.jpg')} alt="NPGX Magazine"
                  className="w-40 xl:w-48 rounded-lg border border-white/10 shadow-2xl shadow-red-950/40 group-hover:scale-105 transition-transform" />
                <p className="text-center mt-1 text-[10px] font-[family-name:var(--font-brand)] text-red-500/60 uppercase tracking-widest">Magazine</p>
              </Link>
            </motion.div>

            {/* $NPG title */}
            <div className="relative inline-block">
              <span className="text-white text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem]">$NPG</span>
              <span
                className="absolute text-red-500 pointer-events-none"
                style={{
                  fontSize: 'clamp(4rem, 14vw, 14rem)',
                  fontFamily: "var(--font-graffiti), 'Permanent Marker', 'Impact', cursive",
                  transform: 'rotate(-3deg) skewX(-2deg)',
                  textShadow: '4px 4px 0 rgba(0,0,0,0.8), 0 0 40px rgba(220,20,60,0.4), 0 0 80px rgba(220,20,60,0.2)',
                  lineHeight: 0.7,
                  filter: 'url(#graffiti-rough)',
                  right: '-22%',
                  bottom: '10%',
                }}
              >
                X
              </span>
            </div>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <filter id="graffiti-rough">
                <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="4" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
              </filter>
            </svg>

            {/* Album — floating right, above center */}
            <motion.div
              initial={{ opacity: 0, x: 40, rotate: 8 }}
              animate={{ opacity: 1, x: 0, rotate: 4 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="hidden lg:block absolute"
              style={{ right: '-28%', top: '-15%' }}
            >
              <Link href="/album/tokyo-gutter-punk" className="group block">
                <img src={cdnUrl('music/albums/tokyo-gutter-punk/cover.png')} alt="Tokyo Gutter Punk"
                  className="w-40 xl:w-48 rounded-lg border border-white/10 shadow-2xl shadow-red-950/40 group-hover:scale-105 transition-transform" />
                <p className="text-center mt-1 text-[10px] font-[family-name:var(--font-brand)] text-white/40 uppercase tracking-widest">Music</p>
              </Link>
            </motion.div>

          </motion.h1>


          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mt-8"
          >
            AI-generated content empire. Premium images, videos, and characters — built to dominate.
          </motion.p>

          {/* Three media buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-col gap-3 items-center mt-6"
          >
            <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto w-full">
              <Link href="/magazine"
                className="bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg text-center text-lg font-[family-name:var(--font-brand)] uppercase tracking-widest transition-all hover:scale-105 shadow-lg shadow-red-600/20">
                Magazine
              </Link>
              <Link href="/watch"
                className="bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg text-center text-lg font-[family-name:var(--font-brand)] uppercase tracking-widest transition-all hover:scale-105 shadow-lg shadow-red-600/20">
                Videos
              </Link>
              <Link href="/album"
                className="bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg text-center text-lg font-[family-name:var(--font-brand)] uppercase tracking-widest transition-all hover:scale-105 shadow-lg shadow-red-600/20">
                Music
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto w-full">
              <a href="/api/auth/handcash?returnTo=/user/account"
                className="bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg text-center text-lg font-[family-name:var(--font-brand)] uppercase tracking-widest transition-all hover:scale-105 shadow-xl shadow-red-600/30 cursor-pointer">
                Buy $NPGX
              </a>
              <a href="/api/auth/handcash?returnTo=/user/account"
                className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-center text-lg font-[family-name:var(--font-brand)] uppercase tracking-widest transition-all hover:scale-105 shadow-xl shadow-green-600/30 cursor-pointer">
                Sign In
              </a>
            </div>
          </motion.div>

        </motion.div>
      </div>

      <div className="h-16 sm:h-24" />

      {/* ---- FILMSTRIP ROW 1 — scrolls left, slow ---- */}
      <FilmstripRow items={row1Items} direction="left" duration={80} />

      {/* ---- FILMSTRIP ROW 2 — scrolls right, slow ---- */}
      <FilmstripRow items={row2Items} direction="right" duration={90} />

      {/* ---- STATS BAR ---- */}
      <div className="relative z-10 py-8 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { value: '118', label: 'Premium Images' },
            { value: '143', label: 'Videos' },
            { value: '26', label: 'Characters A-Z' },
            { value: '$NPGX', label: 'Token Live' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center py-4 px-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-2xl sm:text-3xl font-black text-red-500">{stat.value}</div>
              <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

    </section>
  )
}
