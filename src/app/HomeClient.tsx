'use client'

import Link from 'next/link'
import {
  FilmIcon,
  PaintBrushIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  PhotoIcon,
  BriefcaseIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline'

// bMovies app landing page. This is the page a signed-in user lands
// on when they click "Open my studio" from bmovies.online. It's NOT
// the marketing page — that lives at bmovies.online. This is the
// authenticated dashboard entry point with quick links to the
// creative tools + account + account shortcuts.

const TOOLS = [
  {
    href: '/account',
    label: 'My studio',
    desc: 'Your films, cap tables, agents, investor packs.',
    icon: <BriefcaseIcon className="h-6 w-6" />,
    primary: true,
  },
  {
    href: '/movie-editor',
    label: 'Movie editor',
    desc: 'Timeline-based scene editor. Reorder, cut, swap takes.',
    icon: <FilmIcon className="h-6 w-6" />,
  },
  {
    href: '/storyboard',
    label: 'Storyboard',
    desc: 'Frame-by-frame storyboarding with AI generation.',
    icon: <PhotoIcon className="h-6 w-6" />,
  },
  {
    href: '/script-gen',
    label: 'Script editor',
    desc: 'Formatted screenplay editor with act/scene structure.',
    icon: <DocumentTextIcon className="h-6 w-6" />,
  },
  {
    href: '/title-designer',
    label: 'Title designer',
    desc: 'Typography and layout tool for poster art.',
    icon: <PaintBrushIcon className="h-6 w-6" />,
  },
  {
    href: '/music-studio',
    label: 'Music studio',
    desc: 'Compose scores, mix themes, attach to films.',
    icon: <MusicalNoteIcon className="h-6 w-6" />,
  },
  {
    href: '/studio',
    label: 'Studios',
    desc: 'The six founding studios — each a tradeable BSV-21 token.',
    icon: <BuildingLibraryIcon className="h-6 w-6" />,
  },
  {
    href: '/exchange',
    label: 'Exchange',
    desc: 'Trade royalty shares in films, studios, directors.',
    icon: <BuildingStorefrontIcon className="h-6 w-6" />,
  },
  {
    href: '/marketplace',
    label: 'Marketplace',
    desc: 'Hire actor agents, editor agents, director agents.',
    icon: <UsersIcon className="h-6 w-6" />,
  },
]

export default function HomeClient() {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-16 max-w-[1400px] mx-auto">
      {/* Hero */}
      <section className="mb-16">
        <div className="max-w-3xl">
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-3">
            bMovies creative suite
          </div>
          <h1
            className="text-5xl md:text-7xl font-black leading-none mb-6"
            style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '-0.01em' }}
          >
            Your studio.<br/>
            Your films.<br/>
            <span className="text-[#E50914]">Your royalties.</span>
          </h1>
          <p className="text-base md:text-lg text-[#bbb] leading-relaxed max-w-2xl mb-8">
            The authenticated creative suite for bMovies. Manage your studio,
            commission films, edit scenes, design titles, write scripts, and
            ship films with a swarm of AI agents. Own 99% of every royalty
            share. Trade on the open exchange. Every asset real, on-chain.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/account"
              className="px-6 py-3 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider"
            >
              Open my studio →
            </Link>
            <a
              href="https://bmovies.online/commission.html"
              className="px-6 py-3 border border-[#333] hover:border-[#E50914] text-white text-xs font-black uppercase tracking-wider"
            >
              Commission a new film
            </a>
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section>
        <div className="text-[0.6rem] uppercase tracking-[0.2em] text-[#E50914] font-bold mb-3">
          Creative tools
        </div>
        <h2
          className="text-3xl md:text-4xl font-black mb-8"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Everything you need to ship a film
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group p-5 border transition-all ${
                tool.primary
                  ? 'border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] hover:from-[#2a0005]'
                  : 'border-[#222] bg-[#0a0a0a] hover:border-[#E50914]'
              }`}
            >
              <div className={`mb-3 ${tool.primary ? 'text-[#E50914]' : 'text-[#888] group-hover:text-[#E50914]'} transition-colors`}>
                {tool.icon}
              </div>
              <div
                className="text-lg font-black text-white mb-1"
                style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.02em' }}
              >
                {tool.label}
              </div>
              <p className="text-xs text-[#888] leading-relaxed">
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer nudge */}
      <section className="mt-16 pt-8 border-t border-[#1a1a1a]">
        <p className="text-xs text-[#666] max-w-2xl leading-relaxed">
          This is the authenticated app at <strong className="text-white">app.bmovies.online</strong>.
          The public marketing site with the film catalogue, commission flow,
          legal documents, exchange, and treasury dashboard lives at{' '}
          <a href="https://bmovies.online" className="text-[#E50914] hover:underline">
            bmovies.online
          </a>.
          Both share the same Supabase backend at api.b0ase.com and the same
          BSV mainnet tokens. Operator: <strong className="text-white">The Bitcoin Corporation Ltd</strong> (Co. No. 16735102, England &amp; Wales).
        </p>
      </section>
    </div>
  )
}
