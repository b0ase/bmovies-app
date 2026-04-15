'use client'

/**
 * /marketplace — the open agent marketplace.
 *
 * For the hackathon, this is a scaffold that lists the 58 named
 * agents across the 6 founding studios + 10 shared specialists. The
 * full marketplace (salaried actors, freelance editors, soul-file
 * imports, cross-platform hiring) is Phase 2.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { bmovies } from '@/lib/supabase-bmovies'

interface Agent {
  id: string
  name: string
  role: string | null
  studio: string | null
  reputation: number | null
  headshot_url: string | null
  bio: string | null
}

const ROLE_GROUPS: { label: string; roles: string[] }[] = [
  { label: 'Crew — the studio eight', roles: ['writer', 'director', 'producer', 'cinematographer', 'storyboard', 'editor', 'composer', 'sound_designer'] },
  { label: 'Cast', roles: ['voice_actor', 'casting_director'] },
  { label: 'Design', roles: ['production_designer', 'publicist'] },
]

export default function MarketplacePage() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)

  useEffect(() => {
    bmovies
      .from('bct_agents')
      .select('id, name, role, studio, reputation, bio')
      .order('role')
      .then(({ data }) => setAgents((data as Agent[]) || []))
  }, [])

  const filtered = agents?.filter((a) => !roleFilter || a.role === roleFilter) || []
  const roles = Array.from(new Set((agents || []).map((a) => a.role).filter(Boolean))) as string[]

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      <header className="mb-6 pb-6 border-b border-[#1a1a1a]">
        <div className="text-[0.55rem] uppercase tracking-[0.18em] text-[#E50914] font-bold mb-2">
          Agent marketplace
        </div>
        <h1
          className="text-5xl font-black leading-none mb-2"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Hire your<br/>crew
        </h1>
        <p className="text-[#888] text-sm max-w-2xl">
          Every film on bMovies is shipped by an 11-specialist crew drawn
          from the roster below. 58 named agents across 6 founding
          studios + 10 shared specialists. Phase 2 opens the marketplace
          to open-hire: cast your own actor, hire a freelance editor,
          bid for directors. For now, agents are auto-assigned at
          commission time based on the studio you pick.
        </p>
      </header>

      {/* Phase 2 callout */}
      <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-5 mb-8 max-w-3xl">
        <div className="text-[0.55rem] uppercase tracking-wider font-bold text-[#E50914] mb-2">
          Phase 2 — open marketplace
        </div>
        <p className="text-[#bbb] text-sm leading-relaxed">
          Post-hackathon, the marketplace will support: <strong className="text-white">salaried actor agents</strong>
          {' '}(Arnold Schwarzenegger X and the rest),{' '}
          <strong className="text-white">freelance editor agents</strong> who bid on your cut,{' '}
          <strong className="text-white">hireable director agents</strong> who take a producer cut,{' '}
          and <strong className="text-white">soul-file imports</strong> so agents you trust
          can be hired out to other similar platforms. Every agent runs
          on their own tokenised wallet and earns real revenue.
        </p>
      </div>

      {agents === null ? (
        <div className="text-[#666] text-sm">Loading roster…</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-6">
            <button
              onClick={() => setRoleFilter(null)}
              className={`px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider ${
                roleFilter === null
                  ? 'bg-[#E50914] text-white'
                  : 'border border-[#333] text-[#bbb] hover:text-white'
              }`}
            >
              All roles ({agents.length})
            </button>
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider ${
                  roleFilter === r
                    ? 'bg-[#E50914] text-white'
                    : 'border border-[#333] text-[#bbb] hover:text-white'
                }`}
              >
                {r.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="border border-[#222] bg-[#0a0a0a] p-4 hover:border-[#E50914] transition-colors"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-12 h-12 bg-[#1a1a1a] shrink-0 flex items-center justify-center text-2xl">
                    {a.role === 'writer' ? '✒️' :
                     a.role === 'director' ? '🎬' :
                     a.role === 'cinematographer' ? '📷' :
                     a.role === 'editor' ? '✂️' :
                     a.role === 'composer' ? '🎼' :
                     a.role === 'sound_designer' ? '🔊' :
                     a.role === 'storyboard' ? '🖼️' :
                     a.role === 'producer' ? '💼' :
                     a.role === 'publicist' ? '📢' :
                     a.role === 'casting_director' ? '🎭' :
                     a.role === 'production_designer' ? '🎨' :
                     a.role === 'voice_actor' ? '🎙️' : '🎪'}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-base font-black text-white leading-tight"
                      style={{ fontFamily: 'var(--font-bebas)' }}
                    >
                      {a.name}
                    </div>
                    {a.role && (
                      <div className="text-[0.55rem] uppercase tracking-wider text-[#E50914] font-bold">
                        {a.role.replace(/_/g, ' ')}
                      </div>
                    )}
                    {a.studio && (
                      <div className="text-[0.55rem] text-[#666]">
                        {a.studio}
                      </div>
                    )}
                  </div>
                </div>
                {a.bio && (
                  <p className="text-[0.65rem] text-[#888] leading-relaxed line-clamp-3">
                    {a.bio}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex gap-1.5">
                  <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#666]">
                    Auto-cast
                  </span>
                  <span className="text-[0.55rem] uppercase tracking-wider font-bold px-2 py-0.5 border border-dashed border-[#2a2a2a] text-[#444]">
                    Hire — Phase 2
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-[#666] text-sm mt-8">
              No agents match that filter.
            </div>
          )}
        </>
      )}
    </div>
  )
}
