'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signIn } from 'next-auth/react'
import { NPGX_MAGAZINES, type MagazineIssue } from '@/lib/npgx-magazines'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { saveGeneratedIssue } from '@/lib/magazine-store'
import { FaLock, FaEye, FaShoppingCart, FaCrown, FaFire, FaGoogle, FaMagic, FaCog, FaBook } from 'react-icons/fa'

export default function MagazineShopPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [hoveredIssue, setHoveredIssue] = useState<string | null>(null)
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')
  const [generatedIssue, setGenIssue] = useState<MagazineIssue | null>(null)
  const [genStats, setGenStats] = useState<{ pages: number; images: number; estimatedCost: number } | null>(null)

  // Canonical editions state
  const [canonGenerating, setCanonGenerating] = useState<string | null>(null) // slug being generated
  const [canonProgress, setCanonProgress] = useState('')
  const [canonIssue, setCanonIssue] = useState<MagazineIssue | null>(null)
  const [canonStats, setCanonStats] = useState<{ pages: number; images: number; textCalls: number; totalCost: number } | null>(null)

  async function handleCanonicalGenerate(slug: string) {
    setCanonGenerating(slug)
    setCanonProgress(`Generating canonical issue for ${NPGX_ROSTER.find(c => c.slug === slug)?.name || slug}...`)
    setCanonIssue(null)
    setCanonStats(null)
    try {
      const res = await fetch('/api/magazine/generate-canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (data.success) {
        setCanonIssue(data.issue)
        setCanonStats(data.stats)
        setCanonProgress(`Done! ${data.stats.pages} pages, ${data.stats.images} images, ~$${data.stats.totalCost.toFixed(2)}`)
        await saveGeneratedIssue(data.issue)
      } else {
        setCanonProgress(`Error: ${data.error || 'Generation failed'}`)
      }
    } catch {
      setCanonProgress('Failed to connect to generation API')
    } finally {
      setCanonGenerating(null)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenProgress('Picking characters and generating images...')
    setGenIssue(null)
    setGenStats(null)
    try {
      const res = await fetch('/api/magazine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characters: 4, pagesPerCharacter: 5 }),
      })
      const data = await res.json()
      if (data.success) {
        setGenIssue(data.issue)
        setGenStats(data.stats)
        setGenProgress(`Done! ${data.stats.pages} pages, ${data.stats.images} images (~$${data.stats.estimatedCost.toFixed(2)})`)
        // Save to IndexedDB so it survives navigation and reloads
        await saveGeneratedIssue(data.issue)
      } else {
        setGenProgress(`Error: ${data.error || 'Generation failed'}`)
      }
    } catch (err) {
      setGenProgress('Failed to connect to generation API')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubscribe() {
    if (!session) {
      signIn('google', { callbackUrl: '/magazine' })
      return
    }
    setLoadingCheckout('subscription')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'subscription' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Failed to create checkout')
    } catch {
      alert('Failed to connect to payment provider')
    } finally {
      setLoadingCheckout(null)
    }
  }

  async function handleBuyIssue(issueId: string) {
    if (!session) {
      signIn('google', { callbackUrl: `/magazine/${issueId}` })
      return
    }
    setLoadingCheckout(issueId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'single', issueId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Failed to create checkout')
    } catch {
      alert('Failed to connect to payment provider')
    } finally {
      setLoadingCheckout(null)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Banner */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/40 via-black to-black" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.1) 2px, rgba(255,0,0,0.1) 4px)',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-red-500 text-xs font-bold uppercase tracking-[0.3em] mb-4"
               style={{ fontFamily: 'var(--font-brand)' }}>
              NPGX Publications
            </p>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-4 uppercase tracking-tight"
                style={{ fontFamily: 'var(--font-brand)' }}>
              The Magazine
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
              26 characters. Infinite chaos. High-gloss photoshoots, fiction, city guides,
              and the underground culture that fuels the rebellion.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/30 px-4 py-2 rounded-full">
                <FaFire className="text-red-500 w-4 h-4" />
                <span className="text-red-400 text-sm font-bold">$10 per issue</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                <FaCrown className="text-yellow-500 w-4 h-4" />
                <span className="text-gray-300 text-sm font-bold">$30/mo all access</span>
              </div>
            </div>

            {!session && (
              <button
                onClick={() => signIn('google', { callbackUrl: '/magazine' })}
                className="mt-6 bg-white hover:bg-gray-100 text-gray-900 px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 mx-auto"
              >
                <FaGoogle className="w-4 h-4" />
                Sign in with Google
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Design Your Own + Generated Library */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex flex-col sm:flex-row gap-3">
        <Link
          href="/magazine/designer"
          className="flex-1 flex items-center justify-between bg-gradient-to-r from-red-950/30 via-black to-red-950/30 border border-red-500/20 hover:border-red-500/40 rounded-2xl p-5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <FaBook className="text-red-400 w-5 h-5 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-white font-bold uppercase text-sm" style={{ fontFamily: 'var(--font-brand)' }}>Design Your Own Magazine</h3>
              <p className="text-gray-500 text-xs">Spread layout, text overlays, flipbook preview, PNG export</p>
            </div>
          </div>
          <span className="text-red-400 text-xs font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition">Open Designer &rarr;</span>
        </Link>
        <Link
          href="/magazine/generated"
          className="flex items-center justify-between bg-gradient-to-r from-purple-950/30 via-black to-purple-950/30 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-5 transition-all group sm:w-auto"
        >
          <div className="flex items-center gap-3">
            <FaMagic className="text-purple-400 w-5 h-5 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-white font-bold uppercase text-sm" style={{ fontFamily: 'var(--font-brand)' }}>Generated Library</h3>
              <p className="text-gray-500 text-xs">View saved magazines</p>
            </div>
          </div>
          <span className="text-purple-400 text-xs font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition ml-4">View &rarr;</span>
        </Link>
      </section>

      {/* Admin: Magazine Generator */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-gradient-to-r from-purple-950/30 via-black to-purple-950/30 border border-purple-500/20 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FaCog className="text-purple-400 w-4 h-4" />
                <h3 className="text-white font-bold uppercase text-sm" style={{ fontFamily: 'var(--font-brand)' }}>
                  Magazine Generator
                </h3>
              </div>
              <p className="text-gray-500 text-xs">
                One click. 4 random characters. 20+ AI-generated pages. Pay only API costs (~$1.40).
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FaMagic className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Generate Magazine'}
            </button>
          </div>

          {genProgress && (
            <div className="mt-4 text-sm">
              <p className={`${generating ? 'text-purple-400 animate-pulse' : genStats ? 'text-green-400' : 'text-red-400'}`}>
                {genProgress}
              </p>
            </div>
          )}

          {generatedIssue && (
            <div className="mt-4 border-t border-purple-500/10 pt-4">
              <div className="flex items-center gap-4">
                {generatedIssue.coverImage && (
                  <div className="relative w-20 h-28 rounded overflow-hidden border border-purple-500/20 flex-shrink-0">
                    <img
                      src={generatedIssue.coverImage}
                      alt="Generated cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-brand)' }}>
                    Issue #{generatedIssue.issue} — {generatedIssue.title}
                  </h4>
                  <p className="text-gray-500 text-xs mt-1">
                    {genStats?.pages} pages, {genStats?.images} images, ~${genStats?.estimatedCost.toFixed(2)} cost
                  </p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Featuring: {generatedIssue.characters.map(c => c.split(' ')[0]).join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    router.push(`/magazine/generated?id=${generatedIssue.id}`)
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 flex-shrink-0"
                >
                  <FaEye className="w-3 h-3" />
                  Read
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Issues Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {NPGX_MAGAZINES.map((issue, idx) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              onMouseEnter={() => setHoveredIssue(issue.id)}
              onMouseLeave={() => setHoveredIssue(null)}
              className="group relative"
            >
              {/* Magazine Cover */}
              <Link href={`/magazine/${issue.id}`}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-white/10 group-hover:border-red-500/40 transition-all duration-300 shadow-xl group-hover:shadow-red-950/30">
                  <Image
                    src={issue.coverImage}
                    alt={`Issue ${issue.issue} — ${issue.title}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />

                  {issue.locked && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-black/80 backdrop-blur-sm border border-red-500/30 rounded-full p-4">
                        <FaLock className="text-red-500 w-6 h-6" />
                      </div>
                    </div>
                  )}

                  <div className="absolute top-3 left-3">
                    <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm"
                         style={{ fontFamily: 'var(--font-brand)' }}>
                      Issue {issue.issue}
                    </div>
                  </div>

                  {!issue.locked && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-green-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm">
                        Free
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-black text-xl uppercase tracking-tight mb-0.5"
                        style={{ fontFamily: 'var(--font-brand)' }}>
                      {issue.title}
                    </h3>
                    <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
                      {issue.subtitle}
                    </p>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest">
                      {issue.date} &middot; {issue.pageCount} pages
                    </p>
                  </div>
                </div>
              </Link>

              <AnimatedCoverLines
                lines={issue.coverLines}
                visible={hoveredIssue === issue.id}
              />

              {/* Bottom bar */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {issue.locked ? (
                    <span className="text-white font-black text-lg">${issue.price}</span>
                  ) : (
                    <span className="text-green-400 font-bold text-sm uppercase">Free Issue</span>
                  )}
                </div>

                {issue.locked ? (
                  <button
                    onClick={() => handleBuyIssue(issue.id)}
                    disabled={loadingCheckout === issue.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  >
                    {loadingCheckout === issue.id ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FaShoppingCart className="w-3 h-3" />
                    )}
                    <span>Buy</span>
                  </button>
                ) : (
                  <Link
                    href={`/magazine/${issue.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all bg-white/10 hover:bg-white/20 text-white"
                  >
                    <FaEye className="w-3 h-3" />
                    <span>Read</span>
                  </Link>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {issue.characters.slice(0, 3).map(name => (
                  <span key={name} className="text-gray-600 text-[10px] font-medium uppercase tracking-wider">
                    {name.split(' ')[0]}
                  </span>
                ))}
                {issue.characters.length > 3 && (
                  <span className="text-gray-700 text-[10px]">+{issue.characters.length - 3}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Canonical Editions — 26 Characters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <FaBook className="text-red-500 w-5 h-5" />
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight"
                style={{ fontFamily: 'var(--font-brand)' }}>
              Canonical Editions
            </h2>
          </div>
          <p className="text-gray-500 text-sm mb-8 max-w-2xl">
            One definitive issue per character. AI agents (Editor, Writer, Photographer, Marketer) collaborate
            to produce unique 19-page magazines driven by each character&apos;s soul data. ~$0.60 per issue.
          </p>

          {/* Status bar */}
          {(canonProgress || canonIssue) && (
            <div className="mb-6 bg-gradient-to-r from-red-950/20 via-black to-red-950/20 border border-red-500/20 rounded-xl p-4">
              {canonProgress && (
                <p className={`text-sm ${canonGenerating ? 'text-red-400 animate-pulse' : canonIssue ? 'text-green-400' : 'text-red-400'}`}>
                  {canonProgress}
                </p>
              )}
              {canonIssue && (
                <div className="mt-3 flex items-center gap-4">
                  {canonIssue.coverImage && (
                    <div className="relative w-16 h-22 rounded overflow-hidden border border-red-500/20 flex-shrink-0">
                      <img src={canonIssue.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold" style={{ fontFamily: 'var(--font-brand)' }}>
                      {canonIssue.title} — {canonIssue.subtitle}
                    </h4>
                    <p className="text-gray-500 text-xs mt-1">
                      {canonStats?.pages} pages, {canonStats?.images} images, {canonStats?.textCalls} AI text calls
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/magazine/generated?id=${canonIssue.id}`)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 flex-shrink-0"
                  >
                    <FaEye className="w-3 h-3" />
                    Read
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 26-character grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
            {NPGX_ROSTER.map(char => (
              <button
                key={char.slug}
                onClick={() => handleCanonicalGenerate(char.slug)}
                disabled={canonGenerating !== null}
                className={`group relative bg-white/5 border rounded-lg p-3 text-left transition-all hover:bg-red-950/30 hover:border-red-500/40 disabled:opacity-50 ${
                  canonGenerating === char.slug
                    ? 'border-red-500/60 bg-red-950/30'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-500 font-black text-lg" style={{ fontFamily: 'var(--font-brand)' }}>
                    {char.letter}
                  </span>
                  {canonGenerating === char.slug && (
                    <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                  )}
                </div>
                <p className="text-white text-xs font-bold truncate">
                  {char.name.split(' ')[0]}
                </p>
                <p className="text-gray-600 text-[10px] truncate">
                  {char.category}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* One-Shot CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 bg-gradient-to-br from-red-950/50 via-black to-red-950/30 border border-red-500/20 rounded-2xl p-8 lg:p-12 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4"
              style={{ fontFamily: 'var(--font-brand)' }}>
            One-Shot Generator
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-6">
            Create your own custom NPGX girl. Full character design, 5-page photoshoot,
            unique backstory — minted as your exclusive one-of-one.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/one-shot"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-all shadow-lg shadow-red-950/50 flex items-center gap-2"
            >
              <FaFire className="w-5 h-5" />
              Generate — $99
            </Link>
            <p className="text-gray-600 text-xs">
              Includes: character sheet, 5 photoshoot images, backstory, digital collectible
            </p>
          </div>
        </motion.div>

        {/* Subscription CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-gradient-to-r from-yellow-950/30 via-black to-yellow-950/30 border border-yellow-500/20 rounded-2xl p-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <FaCrown className="text-yellow-500 w-5 h-5" />
            <h3 className="text-xl font-bold text-white uppercase" style={{ fontFamily: 'var(--font-brand)' }}>
              All-Access Pass
            </h3>
          </div>
          <p className="text-gray-400 text-sm max-w-lg mx-auto mb-4">
            Every issue, every photoshoot, every article. Unlimited access to the full NPGX archive
            plus early access to new issues.
          </p>
          <button
            onClick={handleSubscribe}
            disabled={loadingCheckout === 'subscription'}
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-black px-6 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loadingCheckout === 'subscription' ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <FaCrown className="w-4 h-4" />
            )}
            Subscribe — $30/month
          </button>
        </motion.div>
      </section>
    </div>
  )
}

function AnimatedCoverLines({ lines, visible }: { lines: string[]; visible: boolean }) {
  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mt-2 space-y-0.5"
    >
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="text-gray-500 text-[10px] leading-tight"
        >
          {line}
        </motion.p>
      ))}
    </motion.div>
  )
}
