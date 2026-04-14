'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { MASTERY_TIERS, LEVEL_UNLOCKS, XP_REWARDS } from '@/lib/cards'
import { FaTrophy, FaStar, FaCrown, FaFistRaised, FaChartBar, FaLock, FaUnlock, FaMedal } from 'react-icons/fa'

interface Profile {
  handle: string
  level: number
  xp: number
  total_wins: number
  total_losses: number
  total_draws: number
  character_mastery: Record<string, number>
  unlocks: string[]
  mastery_tiers: Record<string, string>
  card_count?: number
}

const MASTERY_COLORS: Record<string, { color: string; glow: string }> = {
  bronze: { color: '#cd7f32', glow: 'rgba(205,127,50,0.3)' },
  silver: { color: '#c0c0c0', glow: 'rgba(192,192,192,0.3)' },
  gold: { color: '#ffd700', glow: 'rgba(255,215,0,0.4)' },
  holographic: { color: '#ff00ff', glow: 'rgba(255,0,255,0.5)' },
}

const MASTERY_ICONS: Record<string, typeof FaMedal> = {
  bronze: FaMedal,
  silver: FaStar,
  gold: FaCrown,
  holographic: FaTrophy,
}

export default function PlayerProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentMatches, setRecentMatches] = useState<any[]>([])

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const res = await fetch('/api/cards/profile')
      const data = await res.json()
      setProfile(data.profile)

      // Load recent matches
      if (data.profile?.handle) {
        const matchRes = await fetch(`/api/cards/match?handle=${data.profile.handle}&limit=10`)
        const matchData = await matchRes.json()
        setRecentMatches(matchData.matches || [])
      }
    } catch {
      setProfile({
        handle: 'Guest',
        level: 1,
        xp: 0,
        total_wins: 0,
        total_losses: 0,
        total_draws: 0,
        character_mastery: {},
        unlocks: [],
        mastery_tiers: {},
      })
    }
    setLoading(false)
  }

  if (loading || !profile) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-purple-400 mx-auto mb-3 w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" />
        <p className="font-[family-name:var(--font-brand)] text-white/30 text-sm uppercase">Loading profile...</p>
      </div>
    )
  }

  const xpToNext = 100 - (profile.xp % 100)
  const xpProgress = (profile.xp % 100) / 100
  const winRate = profile.total_wins + profile.total_losses > 0
    ? Math.round((profile.total_wins / (profile.total_wins + profile.total_losses)) * 100)
    : 0
  const totalMatches = profile.total_wins + profile.total_losses + profile.total_draws

  // Sort mastery by wins
  const masteryEntries = Object.entries(profile.character_mastery)
    .sort(([, a], [, b]) => (b as number) - (a as number))

  const allUnlocks = Object.entries(LEVEL_UNLOCKS) as [string, string][]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-brand)] text-3xl text-white uppercase">{profile.handle}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-[family-name:var(--font-brand)] text-purple-400 text-sm">Level {profile.level}</span>
              <span className="text-white/10">|</span>
              <span className="font-[family-name:var(--font-brand)] text-white/30 text-sm">{profile.xp} XP</span>
              {profile.card_count != null && (
                <>
                  <span className="text-white/10">|</span>
                  <span className="font-[family-name:var(--font-brand)] text-white/30 text-sm">{profile.card_count} cards</span>
                </>
              )}
            </div>
          </div>

          {/* Win rate */}
          <div className="text-right">
            <div className="font-[family-name:var(--font-brand)] text-4xl text-white">{winRate}<span className="text-lg text-white/30">%</span></div>
            <div className="font-[family-name:var(--font-brand)] text-[9px] text-white/20 uppercase">Win Rate</div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="font-[family-name:var(--font-brand)] text-[9px] text-white/20 uppercase">Level {profile.level}</span>
            <span className="font-[family-name:var(--font-brand)] text-[9px] text-white/20">{xpToNext} XP to Level {profile.level + 1}</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              style={{ boxShadow: '0 0 10px rgba(168,85,247,0.5)' }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Wins', value: profile.total_wins, icon: FaTrophy, color: '#22c55e' },
          { label: 'Losses', value: profile.total_losses, icon: FaFistRaised, color: '#ef4444' },
          { label: 'Draws', value: profile.total_draws, icon: FaChartBar, color: '#eab308' },
          { label: 'Matches', value: totalMatches, icon: FaStar, color: '#a855f7' },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/40 border border-white/5 rounded-xl p-4 text-center"
          >
            <Icon className="mx-auto mb-2" size={16} style={{ color }} />
            <div className="font-[family-name:var(--font-brand)] text-2xl text-white">{value}</div>
            <div className="font-[family-name:var(--font-brand)] text-[9px] text-white/20 uppercase">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Character Mastery ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-black/30 border border-white/5 rounded-2xl p-5"
      >
        <h3 className="font-[family-name:var(--font-brand)] text-lg text-white uppercase mb-4">
          Character Mastery
        </h3>

        {masteryEntries.length === 0 ? (
          <p className="font-[family-name:var(--font-brand)] text-white/20 text-sm">
            Win battles with different characters to earn mastery levels
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {masteryEntries.map(([slug, wins]) => {
              const char = NPGX_ROSTER.find(c => c.slug === slug)
              const tier = profile.mastery_tiers[slug]
              const tierStyle = tier ? MASTERY_COLORS[tier] : null
              const TierIcon = tier ? MASTERY_ICONS[tier] : null

              // Next tier threshold
              const thresholds = Object.keys(MASTERY_TIERS).map(Number).sort((a, b) => a - b)
              const nextThreshold = thresholds.find(t => t > (wins as number)) || thresholds[thresholds.length - 1]
              const progress = Math.min(1, (wins as number) / nextThreshold)

              return (
                <div
                  key={slug}
                  className="bg-black/40 rounded-xl p-3 border transition-all"
                  style={{ borderColor: tierStyle ? `${tierStyle.color}30` : 'rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded overflow-hidden border border-white/10">
                      <img
                        src={char?.image || '/npgx-logo.png'}
                        alt={char?.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = '/npgx-logo.png' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-[family-name:var(--font-brand)] text-[10px] text-white truncate">
                        {char?.name?.split(' ')[0] || slug}
                      </div>
                      <div className="flex items-center gap-1">
                        {TierIcon && tierStyle && (
                          <TierIcon size={8} style={{ color: tierStyle.color }} />
                        )}
                        <span className="font-[family-name:var(--font-brand)] text-[8px] uppercase"
                          style={{ color: tierStyle?.color || '#666' }}>
                          {tier || 'unranked'}
                        </span>
                      </div>
                    </div>
                    <span className="font-[family-name:var(--font-brand)] text-yellow-400 text-sm">{wins as number}</span>
                  </div>
                  {/* Progress to next tier */}
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progress * 100}%`,
                        backgroundColor: tierStyle?.color || '#666',
                      }}
                    />
                  </div>
                  <div className="font-[family-name:var(--font-brand)] text-[7px] text-white/15 mt-0.5 text-right">
                    {wins as number}/{nextThreshold}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Mastery legend */}
        <div className="flex gap-4 mt-4 justify-center">
          {Object.entries(MASTERY_TIERS).map(([threshold, tier]) => {
            const style = MASTERY_COLORS[tier]
            return (
              <div key={tier} className="flex items-center gap-1 text-[9px] font-[family-name:var(--font-brand)]">
                <FaMedal size={8} style={{ color: style?.color }} />
                <span style={{ color: style?.color }}>{tier}</span>
                <span className="text-white/15">({threshold}w)</span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* ── Level Unlocks ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-black/30 border border-white/5 rounded-2xl p-5"
      >
        <h3 className="font-[family-name:var(--font-brand)] text-lg text-white uppercase mb-4">
          Level Unlocks
        </h3>
        <div className="space-y-2">
          {allUnlocks.map(([level, feature]) => {
            const unlocked = profile.level >= parseInt(level)
            return (
              <div
                key={feature}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                  unlocked
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-white/5 bg-black/20 opacity-50'
                }`}
              >
                {unlocked ? (
                  <FaUnlock size={10} className="text-green-400 shrink-0" />
                ) : (
                  <FaLock size={10} className="text-white/20 shrink-0" />
                )}
                <span className={`font-[family-name:var(--font-brand)] text-sm ${unlocked ? 'text-white' : 'text-white/30'}`}>
                  {feature.replace(/_/g, ' ')}
                </span>
                <span className="font-[family-name:var(--font-brand)] text-[9px] text-white/15 ml-auto">
                  LVL {level}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* ── Recent Matches ── */}
      {recentMatches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-black/30 border border-white/5 rounded-2xl p-5"
        >
          <h3 className="font-[family-name:var(--font-brand)] text-lg text-white uppercase mb-4">
            Recent Matches
          </h3>
          <div className="space-y-2">
            {recentMatches.slice(0, 10).map((match: any) => {
              const won = match.winner === 'a'
              const charA = NPGX_ROSTER.find(c => c.slug === match.player_a_character)
              const charB = NPGX_ROSTER.find(c => c.slug === match.player_b_character)
              return (
                <div key={match.id} className="flex items-center gap-3 bg-black/40 rounded-lg px-3 py-2">
                  <span className={`font-[family-name:var(--font-brand)] text-[10px] uppercase px-2 py-0.5 rounded ${
                    won ? 'bg-green-500/20 text-green-400' : match.winner === 'draw' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {won ? 'W' : match.winner === 'draw' ? 'D' : 'L'}
                  </span>
                  <div className="flex-1">
                    <span className="font-[family-name:var(--font-brand)] text-[11px] text-white">
                      {charA?.name?.split(' ')[0] || match.player_a_character}
                    </span>
                    <span className="text-white/20 mx-2 text-[10px]">vs</span>
                    <span className="font-[family-name:var(--font-brand)] text-[11px] text-white/60">
                      {charB?.name?.split(' ')[0] || match.player_b_character}
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-brand)] text-[10px] text-white/20">
                    {match.player_a_score} - {match.player_b_score}
                  </span>
                  <span className="font-[family-name:var(--font-brand)] text-[9px] text-purple-400/40">
                    +{match.xp_awarded_a} XP
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
