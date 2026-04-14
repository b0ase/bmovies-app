'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

// Inline SVG icons — no emoji, no icon library
const icons = {
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  character: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10">
      <path d="M12 2a5 5 0 015 5v1a5 5 0 01-10 0V7a5 5 0 015-5z" />
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    </svg>
  ),
  prompt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10">
      <path d="M4 7h16M4 12h10M4 17h6" />
      <path d="M20 12l-4-4m4 4l-4 4" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  videoPrompts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M7 8h4M7 12h6M7 16h3" />
      <circle cx="17" cy="12" r="2" />
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polygon points="10,8 16,12 10,16" fill="currentColor" />
    </svg>
  ),
  gallery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  poster: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h5" />
      <circle cx="12" cy="16" r="2" />
    </svg>
  ),
  storyboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-10 h-10">
      <rect x="2" y="3" width="9" height="7" rx="1" />
      <rect x="13" y="3" width="9" height="7" rx="1" />
      <rect x="2" y="14" width="9" height="7" rx="1" />
      <rect x="13" y="14" width="9" height="7" rx="1" />
      <path d="M6 7l2-1.5L10 7" />
    </svg>
  ),
  ninja: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-8 h-8">
      <circle cx="12" cy="8" r="5" />
      <path d="M7 7h10" />
      <path d="M7 9h10" />
      <path d="M10 13l-3 8M14 13l3 8" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-8 h-8">
      <polygon points="5,3 19,12 5,21" fill="currentColor" />
    </svg>
  ),
  rocket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-8 h-8">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
}

const tools = [
  // === PRODUCTION ===
  { title: 'AI Director', description: 'AI-directed music videos with narrative cohesion. Lyrics → Story → Shot List → Prompts → Video.', href: '/director', icon: icons.video, category: 'Production' },
  { title: 'Storyboard', description: 'Pick a track, cast characters, choose scenarios + style + looks. Generate visual storyboard with AI images.', href: '/storyboard', icon: icons.storyboard, category: 'Production' },
  { title: 'MV Editor', description: 'Three-layer music video editor. Karaoke base → Singing → Cinematic. Timeline with audio sync.', href: '/music-video-editor', icon: icons.video, category: 'Production' },
  { title: 'Movie Editor', description: 'Full video editing timeline with WaveSurfer waveform, clip library, A/B sides, and FFmpeg export.', href: '/movie-editor', icon: icons.video, category: 'Production' },
  { title: 'Motion Graphics', description: 'Library of all title cards with prompts. Generate new ones from templates. Mint to library.', href: '/motion-graphics', icon: icons.gallery, category: 'Production' },
  { title: 'MG Designer', description: '3D title designer with motion presets, beat sync, and video backgrounds.', href: '/motion-graphics/designer', icon: icons.poster, category: 'Production' },

  // === GENERATION ===
  { title: 'Poster Studio', description: 'Generate marketing posters — comic covers, magazine spreads, movie posters, trading cards.', href: '/image-gen', icon: icons.poster, category: 'Generation' },
  { title: 'One-Shot Generator', description: 'Complete character package — 3 images, script, song, magazine, trading cards — in one click. $99.', href: '/one-shot', icon: icons.bolt, category: 'Generation' },
  { title: 'Quick Generator', description: 'Pick a character, hit generate. Fast single-image generation with automatic soul-based prompts.', href: '/gen', icon: icons.image, category: 'Generation' },
  { title: 'Video Generator', description: 'Create AI-generated videos of NPGX characters with multiple styles and providers.', href: '/video-gen', icon: icons.video, category: 'Generation' },
  { title: 'Prompt Generator', description: 'Build and edit AI image prompts from character soul data. Copy or generate with Grok.', href: '/prompt-gen', icon: icons.prompt, category: 'Generation' },
  { title: 'Character Generator', description: 'Generate and customize unique Ninja Punk Girls with full attributes and stat blocks.', href: '/character-gen', icon: icons.character, category: 'Generation' },

  // === CONTENT ===
  { title: 'Music Videos', description: 'Browse all music videos. Watch, commission new ones ($99), or create your own.', href: '/music-videos', icon: icons.play, category: 'Content' },
  { title: 'Watch All', description: 'Continuous playback of all music videos in sequence with track navigation.', href: '/watch', icon: icons.play, category: 'Content' },
  { title: 'Magazine', description: 'NPGX Magazine — full editorial issues with AI photoshoots and feature articles.', href: '/magazine', icon: icons.poster, category: 'Content' },
  { title: 'Albums', description: 'Tokyo Gutter Punk + Neon Blood Riot. 22 tracks, A/B sides, streaming player.', href: '/album', icon: icons.play, category: 'Content' },
  { title: 'Music Mixer', description: 'DJ mixer with crossfader, EQ, effects, and dual-deck playback.', href: '/mixer', icon: icons.play, category: 'Content' },
  { title: 'Character Gallery', description: 'Browse the full A-Z roster — 26 Ninja Punk Girls with stats and content.', href: '/ninja-punk-girls', icon: icons.ninja, category: 'Content' },

  // === MARKETPLACE ===
  { title: 'Exchange', description: 'Buy, sell, and trade. Tokens, Music, Videos, Image Collections. Four asset types.', href: '/exchange', icon: icons.gallery, category: 'Marketplace' },
  { title: 'Graphic Design', description: 'Title designer tool with fonts, layouts, and export.', href: '/graphic-design', icon: icons.poster, category: 'Marketplace' },
  { title: 'Title Designer', description: 'Design custom titles with 3D text, motion presets, and font selection.', href: '/title-designer', icon: icons.poster, category: 'Marketplace' },

  // === JOIN ===
  { title: 'Invest', description: 'Seed round — $4K gets 1% of NPGX. $85K total. 90%+ margin content factory.', href: '/join/invest', icon: icons.rocket, category: 'Join' },
  { title: 'Direct', description: 'Be the Director. Pick a girl, direct the scene, own the video. $99.', href: '/join/direct', icon: icons.video, category: 'Join' },
  { title: 'Star', description: 'Be the Star. $402 creator licence. Build your character. Get paid 10x.', href: '/join/star', icon: icons.character, category: 'Join' },
]

const quickLinks = [
  { href: '/music-videos', icon: icons.play, title: 'Music Videos', desc: 'Watch & commission' },
  { href: '/director', icon: icons.video, title: 'AI Director', desc: 'Direct a music video' },
  { href: '/ninja-punk-girls', icon: icons.ninja, title: '26 Characters', desc: 'Browse the roster' },
  { href: '/exchange', icon: icons.gallery, title: 'Exchange', desc: 'Buy, sell, trade' },
]

export default function ToolsPage() {
  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent mb-4">
            CREATION TOOLS
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Everything you need to generate, customize, and publish Ninja Punk Girls content.
          </p>
        </div>

        {/* Tools by Category */}
        <div className="max-w-6xl mx-auto">
          {['Production', 'Generation', 'Content', 'Marketplace', 'Join'].map(category => (
            <div key={category} className="mb-10">
              <h2 className="font-[family-name:var(--font-brand)] text-sm text-red-400 uppercase tracking-widest mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.filter(t => t.category === category).map((tool, index) => (
              <motion.div
                key={tool.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={tool.href}>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-full hover:border-red-500/30 hover:bg-white/[0.07] transition-all duration-300 group">
                    <div className="text-gray-500 group-hover:text-red-400 transition-colors duration-300 mb-4">
                      {tool.icon}
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2 group-hover:text-red-400 transition-colors duration-300">
                      {tool.title}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {tool.description}
                    </p>
                    <div className="mt-4">
                      <span className="text-xs font-medium text-gray-600 group-hover:text-gray-400 transition-colors duration-300">
                        Launch →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
              </div>
            </div>
          ))}

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="p-5 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-gray-600 group-hover:text-white transition-colors duration-300">
                    {link.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{link.title}</h3>
                    <p className="text-xs text-gray-500">{link.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
