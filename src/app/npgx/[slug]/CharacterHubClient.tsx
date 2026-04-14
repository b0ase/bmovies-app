'use client'

import { useState, useEffect, useRef } from 'react'
import { cdnUrl } from '@/lib/cdn'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  FaCamera, FaVideo, FaBolt, FaFire, FaWrench, FaFileContract,
  FaCoins, FaShoppingCart, FaArrowLeft, FaPlay, FaUsers, FaMusic,
  FaPause, FaStepForward, FaStepBackward, FaVolumeUp
} from 'react-icons/fa'
import type { NPGXCharacter } from '@/lib/npgx-roster'
import type { Soul } from '@/lib/souls'

// Shared NPGX discography — fallback for characters without their own album
const SHARED_DISCOGRAPHY = [
  { title: '暴走ハートビート', romanji: 'Bousou Heartbeat', src: '/music/暴走ハートビート.mp3' },
  { title: '反逆エンジン', romanji: 'Hangyaku Engine', src: '/music/反逆エンジン.mp3' },
  { title: '赤信号ぶっちぎれ', romanji: 'Akashingou Bucchigire', src: '/music/赤信号ぶっちぎれ.mp3' },
  { title: '爆速ギャルズ・ゼロ距離', romanji: 'Bakusoku Gals Zero Kyori', src: '/music/爆速ギャルズ・ゼロ距離.mp3' },
  { title: '焦げたスニーカー', romanji: 'Kogeta Sneaker', src: '/music/焦げたスニーカー.mp3' },
  { title: '地下ガールズ革命', romanji: 'Chika Girls Kakumei', src: '/music/地下ガールズ革命.mp3' },
  { title: '燃えるまで噛みつけ', romanji: 'Moeru Made Kamitsuke', src: '/music/燃えるまで噛みつけ.mp3' },
]

// Per-character albums — override shared discography when available
const CHARACTER_DISCOGRAPHY: Record<string, typeof SHARED_DISCOGRAPHY> = {
}

// Per-character music videos — links to /watch/[slug]
const CHARACTER_MUSIC_VIDEOS: Record<string, { slug: string; title: string; japanese?: string }[]> = {
  'dahlia-ironveil': [
    { slug: 'razor-kisses', title: 'Razor Kisses' },
  ],
  'vivienne-void': [
    { slug: 'underground-empress', title: 'Underground Empress', japanese: '地下の女帝' },
    { slug: 'tokyo-gutter-queen', title: 'Tokyo Gutter Queen' },
    { slug: 'razor-kisses', title: 'Razor Kisses' },
  ],
}

// Fallback preview videos — used when no character-specific clips exist
const FALLBACK_VIDEOS = [
  cdnUrl('landing-page-videos/magazine-preview.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-left.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-3.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-4.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-5.mp4'),
  cdnUrl('landing-page-videos/magazine-preview-6.mp4'),
]

// Content showcase categories — every character has these themed shoots
const CONTENT_CATEGORIES = [
  { key: 'color', label: 'Color', desc: 'Studio color portrait' },
  { key: 'bw', label: 'B&W', desc: 'Black & white editorial' },
  { key: 'glam', label: 'Glam', desc: 'Glamour styling' },
  { key: 'punk', label: 'Punk', desc: 'Punk aesthetic' },
  { key: 'rock', label: 'Rock', desc: 'Rock styling' },
  { key: 'street', label: 'Street', desc: 'Street fashion' },
  { key: 'oneshot', label: 'One Shot', desc: 'One-shot comic' },
  { key: 'npgxmag', label: 'Magazine', desc: 'NPGX Magazine' },
] as const

interface Props {
  character: NPGXCharacter
  soul: Soul | null
  roster: NPGXCharacter[]
}

export function CharacterHubClient({ character, soul, roster }: Props) {
  // Use per-character discography if available, otherwise shared
  const DISCOGRAPHY = CHARACTER_DISCOGRAPHY[character.slug] || SHARED_DISCOGRAPHY
  const [galleryImages, setGalleryImages] = useState<any[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [characterVideos, setCharacterVideos] = useState<string[]>([])
  const [playingTrack, setPlayingTrack] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [activeVideo, setActiveVideo] = useState<number | null>(null)
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)

  // Fetch gallery images for this character (from content library API)
  useEffect(() => {
    async function fetchGallery() {
      setGalleryLoading(true)
      try {
        const res = await fetch(`/api/content/list?slug=${encodeURIComponent(character.slug)}`)
        if (res.ok) {
          const data = await res.json()
          // API returns items array with path field — map to gallery format
          const imgs = (data.items || [])
            .filter((item: any) => item.type === 'image')
            .map((item: any) => ({ url: item.path, id: item.filename }))
          setGalleryImages(imgs)
        }
      } catch {
        // Gallery unavailable — not critical
      }
      setGalleryLoading(false)
    }
    fetchGallery()
  }, [character.slug])

  // Fetch character-specific videos from NPG-X-10 manifest
  useEffect(() => {
    async function fetchCharacterVideos() {
      try {
        const res = await fetch('/NPG-X-10/manifest.json')
        if (!res.ok) return
        const manifest = await res.json()
        const collection = manifest.collections?.[character.slug]
        if (!collection?.items) return
        const vids = collection.items
          .filter((item: any) => item.video)
          .map((item: any) => `/NPG-X-10/${item.video}`)
        setCharacterVideos(vids)
      } catch {
        // Manifest unavailable — will use fallback videos
      }
    }
    fetchCharacterVideos()
  }, [character.slug])

  // Music player
  const playTrack = (idx: number) => {
    if (audioRef.current) { audioRef.current.pause() }
    const audio = new Audio(DISCOGRAPHY[idx].src)
    audio.volume = 0.4
    audio.onended = () => {
      const next = (idx + 1) % DISCOGRAPHY.length
      setPlayingTrack(next)
      playTrack(next)
    }
    audio.play().catch(() => {})
    audioRef.current = audio
    setPlayingTrack(idx)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play().catch(() => {}); setIsPlaying(true) }
  }

  const nextTrack = () => {
    const next = playingTrack !== null ? (playingTrack + 1) % DISCOGRAPHY.length : 0
    playTrack(next)
  }

  const prevTrack = () => {
    const prev = playingTrack !== null ? (playingTrack - 1 + DISCOGRAPHY.length) % DISCOGRAPHY.length : 0
    playTrack(prev)
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }
  }, [])

  // Soul DNA display
  const soulDNA = soul ? [
    soul.appearance?.ethnicity && `${soul.appearance.ethnicity}`,
    soul.appearance?.hair?.color && `${soul.appearance.hair.color} ${soul.appearance.hair.style} hair`,
    soul.appearance?.eyes?.color && `${soul.appearance.eyes.color} eyes`,
    soul.appearance?.tattoos && (typeof soul.appearance.tattoos === 'string' ? soul.appearance.tattoos : (soul.appearance.tattoos as any[]).map((t: any) => typeof t === 'string' ? t : `${t.design} (${t.location})`).join(', ')),
    soul.appearance?.piercings && (typeof soul.appearance.piercings === 'string' ? soul.appearance.piercings : (soul.appearance.piercings as any[]).join(', ')),
    soul.appearance?.distinguishing && (typeof soul.appearance.distinguishing === 'string' ? soul.appearance.distinguishing : JSON.stringify(soul.appearance.distinguishing)),
    soul.style?.aesthetic && `${soul.style.aesthetic} aesthetic`,
    soul.personality?.archetype && `${soul.personality.archetype} archetype`,
    soul.personality?.voice,
  ].filter(Boolean) : []

  const bio = soul?.identity.bio || character.description
  const tokenTicker = soul?.tokenomics?.token || character.token
  const parentShare = soul?.tokenomics?.parentShareBps ? `${soul.tokenomics.parentShareBps / 100}%` : '50%'
  const maxSupply = soul?.tokenomics?.maxSupply?.toLocaleString() || '10,000,000'
  const pressPrice = soul?.tokenomics?.pressPrice || 0.01

  const creationTools = [
    { name: 'Poster Studio', href: `/image-gen?character=${character.slug}&autostart=true`, icon: FaCamera, desc: `Generate AI images of ${character.name}` },
    { name: 'Video Generator', href: `/video-gen?character=${character.slug}`, icon: FaVideo, desc: 'Create video content' },
    { name: 'Video Prompts', href: `/video-prompts?character=${character.slug}`, icon: FaPlay, desc: 'Cinematic video prompt packs' },
    { name: 'Prompt Generator', href: `/prompt-gen?character=${character.slug}`, icon: FaFire, desc: 'AI prompt engineering' },
    { name: 'One-Shot', href: `/one-shot?character=${character.slug}`, icon: FaBolt, desc: 'Quick single-image generation' },
    { name: 'Script Generator', href: '/script-gen', icon: FaFileContract, desc: 'Write scripts and storylines' },
  ]

  // Find prev/next characters for navigation
  const idx = roster.findIndex(c => c.slug === character.slug)
  const prev = idx > 0 ? roster[idx - 1] : null
  const next = idx < roster.length - 1 ? roster[idx + 1] : null

  const [showJson, setShowJson] = useState(false)

  return (
    <div className="min-h-screen pt-20 text-white">
      {/* JSON Modal */}
      {showJson && soul && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowJson(false)}>
          <div className="bg-black border border-white/10 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-[family-name:var(--font-brand)] text-red-400 text-sm uppercase tracking-wider">Soul JSON — {character.name}</span>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(soul, null, 2)) }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-[family-name:var(--font-brand)] uppercase tracking-wider transition-all rounded">Copy</button>
                <button onClick={() => setShowJson(false)} className="text-white/30 hover:text-white text-sm">✕</button>
              </div>
            </div>
            <pre className="text-[10px] text-white/60 font-mono whitespace-pre-wrap leading-relaxed">{JSON.stringify(soul, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back + Prev/Next nav */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/npgx" className="inline-flex items-center text-gray-400 hover:text-white transition-colors">
            <FaArrowLeft className="mr-2" />
            A-Z Roster
          </Link>
          <div className="flex gap-2">
            {prev && (
              <Link href={`/npgx/${prev.slug}`} className="text-xs text-gray-500 hover:text-red-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                {prev.letter} {prev.name}
              </Link>
            )}
            {next && (
              <Link href={`/npgx/${next.slug}`} className="text-xs text-gray-500 hover:text-red-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                {next.letter} {next.name}
              </Link>
            )}
          </div>
        </div>

        {/* ═══ SECTION 1: HERO ═══ */}
        <section className="flex flex-col lg:flex-row gap-8 items-start mb-16">
          {/* Character Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-shrink-0"
          >
            <div className="relative w-72 lg:w-80">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                {character.hasImages ? (
                  <img
                    src={character.image}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                    <span className="text-[120px] font-black font-[family-name:var(--font-brand)] text-white/10">
                      {character.letter}
                    </span>
                  </div>
                )}
              </div>

              {/* Letter badge */}
              <div className="absolute top-4 left-4 w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center font-[family-name:var(--font-brand)] font-bold text-white text-lg">
                {character.letter}
              </div>

              {/* Token badge */}
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-gray-300 px-3 py-1 rounded-lg text-sm font-mono font-bold">
                {tokenTicker}
              </div>

              {/* JSON toggle */}
              <button onClick={() => setShowJson(true)}
                className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/10 transition-colors">
                JSON
              </button>
            </div>
          </motion.div>

          {/* Character Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <h1 className="text-4xl sm:text-5xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide text-white mb-2">
              {character.name}
            </h1>
            <p className="text-lg text-red-400 font-semibold mb-1">{character.tagline}</p>
            <p className="text-sm text-gray-500 uppercase mb-4">{character.category}</p>

            <p className="text-gray-300 text-lg mb-6 leading-relaxed">{bio}</p>

            {/* Specialties */}
            <div className="flex flex-wrap gap-2 mb-6">
              {character.specialties.map(s => (
                <span key={s} className="px-3 py-1 bg-white/5 text-gray-400 rounded-full text-sm border border-white/10">
                  {s}
                </span>
              ))}
            </div>

            {/* Soul personality traits */}
            {soul?.personality.traits && (
              <div className="flex flex-wrap gap-2 mb-6">
                {soul.personality.traits.map(t => (
                  <span key={t} className="px-3 py-1 bg-red-600/10 text-red-400 rounded-full text-xs border border-red-500/20">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Link href={`/image-gen?character=${character.slug}`}>
                <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors">
                  <FaCamera />
                  Generate Images
                </button>
              </Link>
              <Link href={`/video-gen?character=${character.slug}`}>
                <button className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 border border-white/10 transition-colors">
                  <FaVideo />
                  Generate Video
                </button>
              </Link>
              <Link href={`/token?character=${character.slug}`}>
                <button className="bg-green-600/80 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors">
                  <FaCoins />
                  Buy {tokenTicker}
                </button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ═══ SECTION: CONTENT SHOWCASE ═══ */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white flex items-center gap-3">
              <FaCamera className="text-red-400" />
              Content Showcase
            </h2>
            <Link
              href={`/image-gen?character=${character.slug}&autostart=true`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-colors transform -skew-x-3"
            >
              <span className="inline-block skew-x-3 flex items-center gap-2">
                <FaBolt /> Generate New
              </span>
            </Link>
          </div>
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
            {CONTENT_CATEGORIES.map((cat) => (
              <div key={cat.key} className="break-inside-avoid">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setLightboxImg(`/content/${character.slug}/images/${cat.key}/${character.slug}-${cat.key}.png`)}
                  className="group relative rounded-xl overflow-hidden border border-white/10 hover:border-red-500/50 transition-all cursor-pointer bg-white/5"
                >
                  <img
                    src={`/content/${character.slug}/images/${cat.key}/${character.slug}-${cat.key}.png`}
                    alt={`${character.name} — ${cat.label}`}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 group-hover:opacity-80 transition-opacity pointer-events-none" />
                  <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/20 transition-colors flex items-center justify-center pointer-events-none">
                    <FaBolt className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                    <span className="inline-block px-2 py-0.5 bg-red-600/80 text-white text-[10px] font-bold uppercase tracking-wider rounded transform -skew-x-6">
                      <span className="inline-block skew-x-6">{cat.label}</span>
                    </span>
                    <p className="text-gray-400 text-[10px] mt-1">{cat.desc}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); const p = `/content/${character.slug}/images/${cat.key}/${character.slug}-${cat.key}.png`; navigator.clipboard.writeText(p); const btn = e.currentTarget; btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = `${character.slug}-${cat.key}.png` }, 1000) }}
                    className="absolute top-2 right-2 bg-black/80 text-[9px] text-gray-300 hover:text-white px-2 py-1 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    {`${character.slug}-${cat.key}.png`}
                  </button>
                </motion.div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ SECTION: SOUL DNA ═══ */}
        {soulDNA.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-6 flex items-center gap-3">
              <FaBolt className="text-purple-400" />
              Soul DNA
            </h2>
            <div className="bg-gradient-to-br from-purple-500/5 to-red-500/5 rounded-xl p-6 border border-purple-500/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {soulDNA.map((trait, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-sm text-gray-300">{trait}</span>
                  </div>
                ))}
              </div>
              {soul?.personality?.catchphrases && soul.personality.catchphrases.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Catchphrases</p>
                  <div className="flex flex-wrap gap-2">
                    {soul.personality.catchphrases.map((c, i) => (
                      <span key={i} className="text-sm italic text-red-400/80 bg-red-500/5 px-3 py-1 rounded-full border border-red-500/10">
                        &ldquo;{c}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {soul?.style?.clothing && soul.style.clothing.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Wardrobe</p>
                  <div className="flex flex-wrap gap-2">
                    {soul.style.clothing.map((item, i) => (
                      <span key={i} className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══ SECTION 2: TOKEN ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-6 flex items-center gap-3">
            <FaCoins className="text-yellow-500" />
            Token Economics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-3xl font-black text-white font-mono mb-1">{tokenTicker}</div>
              <div className="text-gray-500 text-sm mb-4">Character Token</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Max Supply</span><span className="text-white font-mono">{maxSupply}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Press Price</span><span className="text-green-400">${pressPrice}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Parent Token</span><span className="text-red-400">$NPGX</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Parent Share</span><span className="text-yellow-400">{parentShare}</span></div>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-lg font-bold text-white mb-3">Revenue Model</div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Own {tokenTicker} tokens. Create content. Earn revenue when it sells.
                {parentShare} of all revenue flows to $NPGX holders.
              </p>
              <div className="text-xs text-gray-600 font-mono bg-black/30 p-3 rounded-lg">
                Content Sale &rarr; Creator + {tokenTicker} holders<br />
                &nbsp;&nbsp;&rarr; {parentShare} to $NPGX &rarr; $NPG &rarr; $BOASE
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-lg font-bold text-white mb-3">How to Earn</div>
              <ol className="text-gray-400 text-sm space-y-2">
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold">1.</span> Buy {tokenTicker} tokens</li>
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold">2.</span> Create content with the tools below</li>
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold">3.</span> List content for sale on the marketplace</li>
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold">4.</span> Revenue distributed to all {tokenTicker} holders</li>
              </ol>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 3: CREATE ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-6 flex items-center gap-3">
            <FaWrench className="text-red-400" />
            Creation Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creationTools.map(tool => (
              <Link key={tool.name} href={tool.href}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors border border-white/10 h-full"
                >
                  <tool.icon className="text-red-400 text-2xl mb-3" />
                  <h4 className="text-white font-bold mb-1">{tool.name}</h4>
                  <p className="text-gray-500 text-sm">{tool.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══ SECTION 4: REVENUE ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-6 flex items-center gap-3">
            <FaShoppingCart className="text-green-400" />
            Revenue Flow
          </h2>
          <div className="bg-white/5 rounded-xl p-8 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
                <div className="space-y-4 text-sm text-gray-400">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0 text-red-400 font-bold">1</div>
                    <div><span className="text-white font-semibold">Create</span> — Use the tools above to generate images, videos, and content featuring {character.name}.</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0 text-red-400 font-bold">2</div>
                    <div><span className="text-white font-semibold">Sell</span> — List content on the NPGX marketplace. Set your price.</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0 text-red-400 font-bold">3</div>
                    <div><span className="text-white font-semibold">Earn</span> — Revenue goes to {tokenTicker} holders proportionally. The more tokens you hold, the more you earn.</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center flex-shrink-0 text-yellow-400 font-bold">$</div>
                    <div><span className="text-white font-semibold">Parent Share</span> — {parentShare} flows up to $NPGX, rewarding the ecosystem.</div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Stats</h3>
                <div className="space-y-3">
                  <div className="bg-black/30 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-gray-500">Total Content Created</span>
                    <span className="text-white font-bold font-mono">{galleryImages.length}</span>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-gray-500">Token Holders</span>
                    <span className="text-white font-bold font-mono">--</span>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-gray-500">Total Revenue</span>
                    <span className="text-green-400 font-bold font-mono">--</span>
                  </div>
                </div>
                <Link
                  href="/exchange"
                  className="inline-flex items-center gap-2 mt-4 text-sm text-red-400 hover:text-red-300"
                >
                  <FaUsers /> View on NPGX Exchange &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 5: FULL GALLERY ═══ */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white flex items-center gap-3">
              <FaCamera className="text-red-400" />
              Full Gallery ({galleryImages.length})
            </h2>
            <Link
              href={`/image-gen?character=${character.slug}&autostart=true`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors"
            >
              <FaBolt /> Generate More
            </Link>
          </div>
          {galleryLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-3" />
              <p className="text-gray-500">Loading gallery...</p>
            </div>
          ) : galleryImages.length > 0 ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {galleryImages.map((img: any, idx: number) => (
                <motion.div
                  key={img.id || idx}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setLightboxImg(img.url)}
                  className="relative break-inside-avoid rounded-xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer hover:border-red-500/50 transition-all group"
                >
                  <img src={img.url} alt={`${character.name} generated`} className="w-full h-auto block" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(img.url); const btn = e.currentTarget; btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = img.url.split('/').pop() || img.url }, 1000) }}
                    className="absolute top-2 right-2 bg-black/80 text-[9px] text-gray-300 hover:text-white px-2 py-1 rounded font-mono truncate max-w-[80%] opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title={img.url}
                  >
                    {img.url.split('/').pop() || img.url}
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
              <FaCamera className="text-4xl text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No generated content yet</p>
              <Link
                href={`/image-gen?character=${character.slug}`}
                className="text-red-400 hover:text-red-300 text-sm font-semibold"
              >
                Generate your first image of {character.name} &rarr;
              </Link>
            </div>
          )}
        </section>

        {/* ═══ SECTION: VIDEO GALLERY ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-6 flex items-center gap-3">
            <FaVideo className="text-red-400" />
            Video Gallery
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(characterVideos.length > 0 ? characterVideos : FALLBACK_VIDEOS).map((vid, idx) => (
              <motion.div
                key={vid}
                whileHover={{ scale: 1.03 }}
                className={`relative aspect-[9/16] rounded-xl overflow-hidden border cursor-pointer transition-all ${
                  activeVideo === idx ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-white/10 hover:border-red-500/50'
                }`}
                onClick={() => setActiveVideo(activeVideo === idx ? null : idx)}
              >
                <video
                  src={vid}
                  autoPlay={activeVideo === idx}
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
                {activeVideo !== idx && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-600/80 flex items-center justify-center">
                      <FaPlay className="text-white ml-1" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2 text-center">
                  <span className="text-[10px] font-mono text-white/60 bg-black/60 px-2 py-0.5 rounded">
                    {character.name} — Clip {idx + 1}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              href={`/video-gen?character=${character.slug}`}
              className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 font-semibold"
            >
              <FaVideo /> Generate new videos of {character.name} &rarr;
            </Link>
          </div>
        </section>

        {/* ═══ SECTION: MUSIC VIDEOS ═══ */}
        {CHARACTER_MUSIC_VIDEOS[character.slug]?.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-6 flex items-center gap-3">
              <FaVideo className="text-red-400" />
              Music Videos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHARACTER_MUSIC_VIDEOS[character.slug].map(mv => (
                <Link key={mv.slug} href={`/watch/${mv.slug}`} className="group block">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group-hover:border-red-500/50 transition-all">
                    <img src={`/og/${mv.slug}.png`} alt={mv.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FaPlay className="text-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-[family-name:var(--font-brand)] text-white/60 group-hover:text-red-400 transition-colors uppercase tracking-wider">{mv.title}</p>
                  {mv.japanese && <p className="text-xs text-white/30">{mv.japanese}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ═══ SECTION: MUSIC DNA ═══ */}
        {soul?.music && (
          <section className="mb-16">
            <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-6 flex items-center gap-3">
              <FaMusic className="text-pink-400" />
              Music DNA
            </h2>
            <div className="bg-gradient-to-br from-pink-500/5 to-red-500/5 rounded-xl p-6 border border-pink-500/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Genre</p>
                  <p className="text-xl font-black text-white mb-1">{soul.music.genre}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {soul.music.subgenres.map(s => (
                      <span key={s} className="text-[10px] text-pink-400/80 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Signature</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">BPM</span><span className="text-white font-mono font-bold">{soul.music.bpm}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Key</span><span className="text-white font-mono">{soul.music.key}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Mood</span><span className="text-pink-400 text-xs">{soul.music.mood}</span></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Vocal Style</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{soul.music.vocalStyle}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Instruments</p>
                  <div className="flex flex-wrap gap-1.5">
                    {soul.music.instruments.map(inst => (
                      <span key={inst} className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">{inst}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Influences</p>
                  <div className="flex flex-wrap gap-1.5">
                    {soul.music.influences.map(inf => (
                      <span key={inf} className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">{inf}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Production Notes</p>
                <p className="text-sm text-gray-400 italic leading-relaxed">{soul.music.productionNotes}</p>
              </div>
            </div>
          </section>
        )}

        {/* ═══ SECTION: DISCOGRAPHY ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-black font-[family-name:var(--font-brand)] uppercase text-white mb-6 flex items-center gap-3">
            <FaMusic className="text-pink-400" />
            Discography
          </h2>

          {/* Now playing bar */}
          {playingTrack !== null && (
            <div className="mb-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl p-4 border border-red-500/20 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button onClick={prevTrack} className="text-gray-400 hover:text-white transition-colors">
                  <FaStepBackward />
                </button>
                <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition-colors">
                  {isPlaying ? <FaPause /> : <FaPlay className="ml-0.5" />}
                </button>
                <button onClick={nextTrack} className="text-gray-400 hover:text-white transition-colors">
                  <FaStepForward />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{DISCOGRAPHY[playingTrack].title}</p>
                <p className="text-gray-500 text-xs font-mono">{DISCOGRAPHY[playingTrack].romanji} — {character.name}</p>
              </div>
              <FaVolumeUp className="text-gray-600 shrink-0" />
            </div>
          )}

          {/* Track list */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            {DISCOGRAPHY.map((track, idx) => (
              <motion.div
                key={track.src}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                onClick={() => playTrack(idx)}
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors border-b border-white/5 last:border-0 ${
                  playingTrack === idx ? 'bg-red-500/5' : ''
                }`}
              >
                <span className={`w-8 text-center font-mono text-sm ${playingTrack === idx ? 'text-red-500' : 'text-gray-600'}`}>
                  {playingTrack === idx && isPlaying ? (
                    <span className="inline-flex gap-0.5">
                      <span className="w-0.5 h-3 bg-red-500 animate-pulse" />
                      <span className="w-0.5 h-4 bg-red-500 animate-pulse" style={{ animationDelay: '0.15s' }} />
                      <span className="w-0.5 h-2 bg-red-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                    </span>
                  ) : (
                    idx + 1
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${playingTrack === idx ? 'text-red-400' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-gray-600 font-mono">{track.romanji}</p>
                </div>
                <span className="text-xs text-gray-600 font-mono shrink-0">
                  {character.name}
                </span>
                <FaPlay className={`text-xs shrink-0 ${playingTrack === idx ? 'text-red-500' : 'text-gray-700'}`} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Prev/Next navigation at bottom */}
        <div className="flex justify-between items-center pt-8 border-t border-white/10">
          {prev ? (
            <Link href={`/npgx/${prev.slug}`} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center font-[family-name:var(--font-brand)] font-bold text-white text-sm group-hover:bg-red-500">
                {prev.letter}
              </div>
              <div>
                <div className="text-xs text-gray-600">Previous</div>
                <div className="text-sm font-semibold">{prev.name}</div>
              </div>
            </Link>
          ) : <div />}
          {next ? (
            <Link href={`/npgx/${next.slug}`} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-right group">
              <div>
                <div className="text-xs text-gray-600">Next</div>
                <div className="text-sm font-semibold">{next.name}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center font-[family-name:var(--font-brand)] font-bold text-white text-sm group-hover:bg-red-500">
                {next.letter}
              </div>
            </Link>
          ) : <div />}
        </div>
      </div>

      {/* ═══ LIGHTBOX ═══ */}
      {lightboxImg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <motion.img
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            src={lightboxImg}
            alt={character.name}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors"
          >
            &times;
          </button>
        </motion.div>
      )}
    </div>
  )
}
