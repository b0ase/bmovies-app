'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { NPGX_ROSTER, CATEGORIES, type NPGXCharacter } from '@/lib/npgx-roster'

export default function NPGXGalleryClient() {
  const [selectedFilter, setSelectedFilter] = useState('all')

  const filteredCharacters = selectedFilter === 'all'
    ? NPGX_ROSTER
    : NPGX_ROSTER.filter(c => c.category === selectedFilter)

  return (
    <div className="min-h-screen text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-6xl sm:text-8xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-6">
              NPGX
            </h1>

            <p className="text-2xl text-gray-300 max-w-4xl mx-auto mb-4 font-bold">
              26 Ninja Punk Girls. A &ndash; Z.
            </p>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
              Each character has her own token, personality, content library, and revenue stream.
              Collect, generate, and trade.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/gen">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xl rounded-lg transition-colors"
                >
                  Generate NPGX
                </motion.button>
              </Link>
              <Link href="/rankings">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xl rounded-lg border border-white/20 transition-colors"
                >
                  Rankings
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* A-Z Letter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-wrap justify-center gap-1">
          {NPGX_ROSTER.map(c => (
            <a
              key={c.letter}
              href={`#char-${c.letter}`}
              className="w-9 h-9 flex items-center justify-center rounded font-[family-name:var(--font-brand)] font-bold text-sm bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white border border-white/10 hover:border-red-500 transition-colors"
            >
              {c.letter}
            </a>
          ))}
        </div>
      </div>

      {/* Category Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-wrap justify-center gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedFilter(cat.id)}
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                selectedFilter === cat.id
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Characters Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCharacters.map((character, index) => (
            <CharacterCard key={character.slug} character={character} index={index} />
          ))}
        </div>
      </div>

      {/* Featured Ecosystems — CherryX & ZeroDice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide text-white text-center mb-4">
          Featured Ecosystems
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Fully realised NPGX characters with their own sites, tokens, content libraries, and revenue streams
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CherryX */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 rounded-2xl overflow-hidden border border-red-500/30 hover:border-red-500/60 transition-all duration-500 group"
          >
            <div className="grid grid-cols-4 gap-0.5">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="aspect-[3/4] overflow-hidden">
                  <img
                    src={`/npgx-characters/cherry/hero-${n}.jpg`}
                    alt="CherryX"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              ))}
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-lg font-[family-name:var(--font-brand)]">C</div>
                <div>
                  <h3 className="text-2xl font-black text-white">CherryX</h3>
                  <p className="text-red-400 text-sm font-bold">$CHERRYX</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                Kawaii meets punk rock. 28yo AI model with pink hair, chest tattoos, and a street-graffiti aesthetic.
                Pay-to-mint tokenized content on Bitcoin with a chaos-engine video player.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['120 Photos', '32 Videos', 'BSV Token', 'Live Site'].map(tag => (
                  <span key={tag} className="px-3 py-1 bg-red-600/20 text-red-300 rounded-full text-xs font-bold border border-red-500/30">
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="https://cherryx.space"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-center transition-colors"
              >
                Visit cherryx.space
              </a>
            </div>
          </motion.div>

          {/* ZeroDice */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 rounded-2xl overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-500 group"
          >
            <div className="grid grid-cols-4 gap-0.5">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="aspect-[3/4] overflow-hidden">
                  <img
                    src={`/npgx-characters/zerodice/hero-${n}.jpg`}
                    alt="Zero Dice"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              ))}
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-lg font-[family-name:var(--font-brand)]">Z</div>
                <div>
                  <h3 className="text-2xl font-black text-white">Zero Dice</h3>
                  <p className="text-gray-400 text-sm font-bold">$ZERODICE</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                Techno DJ anime hero. AI virtual influencer with electric cyan hair, cyberpunk armor, and a
                comic book universe. ASMR stories, NFT collections, and AI-generated music.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['177 Images', 'Comics', 'Music', 'Live Site'].map(tag => (
                  <span key={tag} className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs font-bold border border-white/20">
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="https://zerodice.store"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-center border border-white/20 transition-colors"
              >
                Visit zerodice.store
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center bg-white/5 rounded-3xl p-12 border border-white/10">
          <h2 className="text-3xl font-black font-[family-name:var(--font-brand)] uppercase tracking-wide text-white mb-6">
            Create Your Own NPGX
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-3xl mx-auto">
            Use our AI generator to create images of any A-Z character. Each generation mints to the character&apos;s token.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/gen">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg transition-colors"
              >
                Start Creating
              </motion.button>
            </Link>
            <Link href="/tools">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-lg rounded-lg border border-white/20 transition-colors"
              >
                All Tools
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function CharacterCard({ character, index }: { character: NPGXCharacter; index: number }) {
  return (
    <Link href={`/npgx/${character.slug}`} id={`char-${character.letter}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.5) }}
        className="h-full flex flex-col bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-red-500/40 transition-all group cursor-pointer"
      >
        {/* Image / Letter */}
        <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-900 to-black overflow-hidden flex-shrink-0">
          {character.hasImages ? (
            <img
              src={character.image}
              alt={character.name}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl font-black font-[family-name:var(--font-brand)] text-white/10 group-hover:text-red-500/20 transition-colors">
                {character.letter}
              </span>
            </div>
          )}
          <div className="absolute top-3 left-3 w-8 h-8 rounded bg-red-600 flex items-center justify-center font-[family-name:var(--font-brand)] font-bold text-white text-sm">
            {character.letter}
          </div>
          <div className="absolute top-3 right-3 bg-black/70 text-gray-300 px-2 py-0.5 rounded text-xs font-mono font-bold">
            {character.token}
          </div>
          <div className="absolute bottom-3 left-3 bg-white/10 text-gray-300 px-2 py-0.5 rounded text-xs capitalize">
            {character.category}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-lg font-bold text-white mb-1">{character.name}</h3>
          <p className="text-sm text-gray-400 mb-3 line-clamp-2 min-h-[2.5rem]">{character.tagline}</p>

          <div className="flex flex-wrap gap-1.5 mb-4 min-h-[3.25rem] overflow-hidden">
            {character.specialties.slice(0, 4).map(s => (
              <span key={s} className="px-2 py-0.5 bg-white/5 text-gray-500 rounded text-xs border border-white/10 h-fit">
                {s}
              </span>
            ))}
          </div>

          <div className="flex gap-2 mt-auto">
            <span
              className="flex-1 py-2 bg-red-600 group-hover:bg-red-500 text-white text-sm font-bold rounded text-center transition-colors"
            >
              View Profile
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
