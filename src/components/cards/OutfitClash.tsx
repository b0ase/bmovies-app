'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NPGX_ROSTER, type NPGXCharacter } from '@/lib/npgx-roster'
import {
  type Card,
  type SlotKey,
  type StatKey,
  type MatchResult,
  type PlayerLoadout,
  type AIDifficulty,
  type Challenge,
  CARD_CATALOGUE,
  SLOTS,
  SLOT_ORDER,
  STAT_LABELS,
  RARITY_COLORS,
  getCardsBySlot,
  getCardImageUrl,
  pickChallenge,
  resolveMatch,
  buildAILoadout,
  calcAllSynergies,
} from '@/lib/cards'
import { FaFistRaised, FaTimes, FaCheck, FaStar, FaBolt, FaShieldAlt, FaCrown } from 'react-icons/fa'

// ── Stat colors ────────────────────────────────────────────────────────────

const STAT_COLORS: Record<string, string> = {
  str: '#ef4444', spe: '#3b82f6', ski: '#eab308',
  sta: '#22c55e', ste: '#a855f7', sty: '#ec4899',
}

const DIFFICULTY_CONFIG: Record<AIDifficulty, { label: string; color: string; desc: string }> = {
  easy:   { label: 'Easy',   color: '#22c55e', desc: 'Random cards' },
  medium: { label: 'Medium', color: '#eab308', desc: 'Stat optimized' },
  hard:   { label: 'Hard',   color: '#ef4444', desc: 'Full synergy' },
  boss:   { label: 'Boss',   color: '#f59e0b', desc: 'All legendaries' },
}

// ── Phase Type ─────────────────────────────────────────────────────────────

type Phase = 'character_select' | 'challenge_reveal' | 'equip' | 'clash' | 'result'

// ── Stat Bar ───────────────────────────────────────────────────────────────

function StatBar({ label, value, max, color, highlight }: {
  label: string; value: number; max: number; color: string; highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-[family-name:var(--font-brand)] uppercase w-8 ${highlight ? 'text-yellow-400' : 'text-white/40'}`}>
        {label}
      </span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: highlight ? `0 0 8px ${color}` : undefined }}
        />
      </div>
      <span className={`text-[10px] font-[family-name:var(--font-brand)] w-6 text-right ${highlight ? 'text-yellow-400' : 'text-white/60'}`}>
        {value}
      </span>
    </div>
  )
}

// ── Character Select ───────────────────────────────────────────────────────

function CharacterSelect({ onSelect }: { onSelect: (char: NPGXCharacter) => void }) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div>
      <h2 className="font-[family-name:var(--font-brand)] text-2xl text-center mb-2 text-white uppercase tracking-wider">
        Choose Your Fighter
      </h2>
      <p className="text-center text-white/30 text-sm font-[family-name:var(--font-brand)] mb-6 uppercase tracking-widest">
        Category affects synergy bonuses
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-13 gap-2 max-w-5xl mx-auto">
        {NPGX_ROSTER.map(char => (
          <motion.button
            key={char.slug}
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(char)}
            onMouseEnter={() => setHovered(char.slug)}
            onMouseLeave={() => setHovered(null)}
            className="relative group"
          >
            <div className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
              hovered === char.slug ? 'border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-white/10'
            }`}>
              <img
                src={char.image}
                alt={char.name}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = '/npgx-logo.png' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-0 inset-x-0 p-1 text-center">
              <span className="font-[family-name:var(--font-brand)] text-[8px] text-white uppercase leading-tight block truncate">
                {char.name.split(' ')[0]}
              </span>
              <span className="font-[family-name:var(--font-brand)] text-[7px] text-purple-400/60 uppercase">
                {char.category}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Challenge Reveal ───────────────────────────────────────────────────────

function ChallengeReveal({ challenge, onContinue }: { challenge: Challenge; onContinue: () => void }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (revealed) {
      const t = setTimeout(onContinue, 2500)
      return () => clearTimeout(t)
    }
  }, [revealed, onContinue])

  const rarityGlow = challenge.rarity === 'legendary' ? 'rgba(245,158,11,0.5)'
    : challenge.rarity === 'rare' ? 'rgba(59,130,246,0.4)' : 'rgba(168,85,247,0.3)'

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <AnimatePresence>
        {!revealed ? (
          <motion.div
            key="card-back"
            initial={{ rotateY: 0, scale: 0.8 }}
            animate={{ rotateY: 0, scale: 1 }}
            exit={{ rotateY: 90, scale: 1.1 }}
            transition={{ duration: 0.4 }}
            className="w-72 h-96 rounded-2xl bg-gradient-to-br from-purple-900 to-black border-2 border-purple-500/30 flex items-center justify-center"
            style={{ boxShadow: `0 0 40px ${rarityGlow}` }}
          >
            <div className="font-[family-name:var(--font-brand)] text-4xl text-purple-400/30 uppercase tracking-[0.3em]">
              NPGX
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="card-front"
            initial={{ rotateY: -90, scale: 1.1 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-72 h-96 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden"
            style={{
              background: `linear-gradient(145deg, rgba(0,0,0,0.9), rgba(20,0,40,0.95))`,
              border: `2px solid ${rarityGlow.replace(/[\d.]+\)$/, '0.6)')}`,
              boxShadow: `0 0 40px ${rarityGlow}, inset 0 0 30px rgba(0,0,0,0.5)`,
            }}
          >
            {/* Rarity badge */}
            <div className="text-center">
              <span className="font-[family-name:var(--font-brand)] text-[9px] uppercase tracking-[0.3em] text-purple-400/40">
                Challenge
              </span>
              {challenge.rarity !== 'standard' && (
                <span className="ml-2 text-[8px] uppercase px-1.5 py-0.5 rounded font-[family-name:var(--font-brand)]"
                  style={{ color: challenge.rarity === 'legendary' ? '#f59e0b' : '#3b82f6', borderColor: challenge.rarity === 'legendary' ? '#f59e0b40' : '#3b82f640', border: '1px solid' }}>
                  {challenge.rarity}
                </span>
              )}
            </div>

            {/* Name */}
            <div className="text-center">
              <h3 className="font-[family-name:var(--font-brand)] text-2xl text-white uppercase tracking-wider mb-2">
                {challenge.name}
              </h3>
              <p className="text-white/30 text-xs italic">{challenge.description}</p>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              {[
                { stat: challenge.primaryStat, weight: '2×', size: 'text-lg' },
                { stat: challenge.secondaryStat, weight: '1.5×', size: 'text-sm' },
                { stat: challenge.tertiaryStat, weight: '1×', size: 'text-xs' },
              ].map(({ stat, weight, size }) => (
                <motion.div
                  key={stat}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-between"
                >
                  <span className={`font-[family-name:var(--font-brand)] uppercase ${size}`} style={{ color: STAT_COLORS[stat] }}>
                    {STAT_LABELS[stat as StatKey]}
                  </span>
                  <span className="font-[family-name:var(--font-brand)] text-white/40 text-xs">{weight}</span>
                </motion.div>
              ))}
            </div>

            {/* Bonus */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center bg-white/5 rounded-lg px-3 py-2 border border-yellow-500/20"
            >
              <span className="text-[9px] font-[family-name:var(--font-brand)] text-yellow-500/60 uppercase">Bonus +10</span>
              <div className="text-yellow-400 text-xs font-[family-name:var(--font-brand)] mt-0.5">
                {challenge.bonusCondition.label}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Equip Phase ────────────────────────────────────────────────────────────

function EquipPhase({ challenge, character, onSubmit }: {
  challenge: Challenge
  character: NPGXCharacter
  onSubmit: (cards: Partial<Record<SlotKey, Card>>) => void
}) {
  const [equipped, setEquipped] = useState<Partial<Record<SlotKey, Card>>>({})
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>(SLOT_ORDER[0])
  const [timeLeft, setTimeLeft] = useState(25)

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-submit when timer expires
  useEffect(() => {
    if (timeLeft === 0) onSubmit(equipped)
  }, [timeLeft, equipped, onSubmit])

  const equippedCards = Object.values(equipped).filter(Boolean) as Card[]
  const synergies = useMemo(() => calcAllSynergies(character.category, equippedCards), [character.category, equippedCards])
  const availableCards = useMemo(() => getCardsBySlot(selectedSlot), [selectedSlot])

  const totalStats = useMemo(() => {
    const base = equippedCards.reduce(
      (t, c) => ({ str: t.str + c.stats.str, spe: t.spe + c.stats.spe, ski: t.ski + c.stats.ski, sta: t.sta + c.stats.sta, ste: t.ste + c.stats.ste, sty: t.sty + c.stats.sty }),
      { str: 0, spe: 0, ski: 0, sta: 0, ste: 0, sty: 0 },
    )
    // Add synergy
    for (const b of synergies.bonuses) {
      for (const [s, v] of Object.entries(b.statBonus)) {
        if (v) base[s as StatKey] += v
      }
    }
    return base
  }, [equippedCards, synergies])

  const handleEquip = (card: Card) => {
    setEquipped(prev => ({ ...prev, [card.slot]: card }))
  }

  const handleUnequip = (slot: SlotKey) => {
    setEquipped(prev => {
      const next = { ...prev }
      delete next[slot]
      return next
    })
  }

  const timerColor = timeLeft > 15 ? '#22c55e' : timeLeft > 7 ? '#eab308' : '#ef4444'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header: character + timer + submit */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-purple-500/30">
            <img src={character.image} alt={character.name} className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = '/npgx-logo.png' }} />
          </div>
          <div>
            <div className="font-[family-name:var(--font-brand)] text-white text-sm">{character.name}</div>
            <div className="font-[family-name:var(--font-brand)] text-[9px] text-purple-400/60 uppercase">{character.category}</div>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <motion.div
              className="font-[family-name:var(--font-brand)] text-3xl"
              style={{ color: timerColor }}
              animate={timeLeft <= 5 ? { scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              {timeLeft}
            </motion.div>
            <div className="text-[8px] font-[family-name:var(--font-brand)] text-white/20 uppercase">seconds</div>
          </div>
          <button
            onClick={() => onSubmit(equipped)}
            className="font-[family-name:var(--font-brand)] text-sm uppercase px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
          >
            Lock In
          </button>
        </div>
      </div>

      {/* Challenge reminder */}
      <div className="bg-black/40 border border-purple-500/10 rounded-lg px-4 py-2 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-[family-name:var(--font-brand)]">
          <span className="text-white/20 uppercase">Challenge:</span>
          <span className="text-white">{challenge.name}</span>
          <span className="text-white/20">|</span>
          {[
            { stat: challenge.primaryStat, w: '2×' },
            { stat: challenge.secondaryStat, w: '1.5×' },
            { stat: challenge.tertiaryStat, w: '1×' },
          ].map(({ stat, w }) => (
            <span key={stat} style={{ color: STAT_COLORS[stat] }}>
              {STAT_LABELS[stat as StatKey]} <span className="text-white/20">{w}</span>
            </span>
          ))}
        </div>
        <div className="text-[10px] font-[family-name:var(--font-brand)] text-yellow-400/60">
          Bonus: {challenge.bonusCondition.label}
        </div>
      </div>

      <div className="grid grid-cols-[220px_1fr_200px] gap-4">
        {/* LEFT: Equipped slots */}
        <div className="space-y-1">
          <div className="font-[family-name:var(--font-brand)] text-[9px] text-white/20 uppercase tracking-wider mb-2">
            Equipment ({equippedCards.length} cards)
          </div>
          {SLOT_ORDER.map(slot => {
            const card = equipped[slot]
            const isSelected = selectedSlot === slot
            return (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`w-full text-left px-2 py-1.5 rounded transition-all flex items-center gap-2 ${
                  isSelected ? 'bg-purple-600/20 border border-purple-500/30' : 'bg-black/20 border border-transparent hover:border-white/5'
                }`}
              >
                <span className="font-[family-name:var(--font-brand)] text-[9px] text-white/30 uppercase w-14 shrink-0">
                  {SLOTS[slot].name}
                </span>
                {card ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-[family-name:var(--font-brand)] text-[10px] text-white truncate">{card.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] px-1 rounded" style={{ color: RARITY_COLORS[card.rarity], border: `1px solid ${RARITY_COLORS[card.rarity]}30` }}>
                        {card.rarity[0].toUpperCase()}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleUnequip(slot) }}
                        className="text-red-400/40 hover:text-red-400 text-[10px]"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="font-[family-name:var(--font-brand)] text-[9px] text-white/10 italic">empty</span>
                )}
              </button>
            )
          })}
        </div>

        {/* CENTER: Available cards for selected slot */}
        <div>
          <div className="font-[family-name:var(--font-brand)] text-[9px] text-white/20 uppercase tracking-wider mb-2">
            {SLOTS[selectedSlot].name} Cards ({availableCards.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[500px] overflow-y-auto pr-1">
            {availableCards.map(card => {
              const isEquipped = equipped[card.slot]?.id === card.id
              return (
                <motion.button
                  key={card.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleEquip(card)}
                  className={`rounded-lg overflow-hidden border-2 transition-all text-left ${
                    isEquipped
                      ? 'border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                      : 'border-white/5 hover:border-purple-500/30'
                  }`}
                >
                  <div className="aspect-[4/3] relative">
                    <img
                      src={getCardImageUrl(card.id)}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    {isEquipped && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                        <FaCheck size={8} className="text-black" />
                      </div>
                    )}
                  </div>
                  <div className="px-1.5 py-1 bg-black/60">
                    <div className="flex items-center justify-between">
                      <span className="font-[family-name:var(--font-brand)] text-[9px] text-white truncate">{card.name}</span>
                      <span className="text-[7px] font-[family-name:var(--font-brand)]" style={{ color: RARITY_COLORS[card.rarity] }}>
                        {card.rarity}
                      </span>
                    </div>
                    {/* Mini stat bars for challenge stats */}
                    <div className="mt-0.5 space-y-[1px]">
                      {[challenge.primaryStat, challenge.secondaryStat, challenge.tertiaryStat].map(stat => (
                        <div key={stat} className="flex items-center gap-1">
                          <span className="text-[7px] w-5" style={{ color: STAT_COLORS[stat] }}>
                            {stat.toUpperCase()}
                          </span>
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${Math.min(100, (card.stats[stat as StatKey] / 10) * 100)}%`,
                              backgroundColor: STAT_COLORS[stat],
                            }} />
                          </div>
                          <span className="text-[7px] text-white/30 w-3 text-right">{card.stats[stat as StatKey]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Live stats + synergies */}
        <div className="space-y-3">
          {/* Stats */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-3">
            <div className="font-[family-name:var(--font-brand)] text-[9px] text-white/20 uppercase mb-2">Live Stats</div>
            <div className="space-y-1.5">
              {(['str', 'spe', 'ski', 'sta', 'ste', 'sty'] as StatKey[]).map(stat => (
                <StatBar
                  key={stat}
                  label={stat.toUpperCase()}
                  value={totalStats[stat]}
                  max={80}
                  color={STAT_COLORS[stat]}
                  highlight={stat === challenge.primaryStat || stat === challenge.secondaryStat}
                />
              ))}
            </div>
          </div>

          {/* Synergies */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-3">
            <div className="font-[family-name:var(--font-brand)] text-[9px] text-white/20 uppercase mb-2">
              Synergies ({synergies.bonuses.filter(b => b.type === 'combo').length} combos)
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {synergies.bonuses.filter(b => b.type === 'combo').map((b, i) => (
                <motion.div
                  key={b.name}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-[9px]"
                >
                  <FaBolt className="text-yellow-400 shrink-0" size={8} />
                  <span className="font-[family-name:var(--font-brand)] text-yellow-400/80">{b.name}</span>
                </motion.div>
              ))}
              {synergies.bonuses.filter(b => b.type === 'set').map(b => (
                <div key={b.name} className="flex items-center gap-1.5 text-[9px]">
                  <FaStar className="text-purple-400 shrink-0" size={8} />
                  <span className="font-[family-name:var(--font-brand)] text-purple-400/80">{b.name}</span>
                </div>
              ))}
              {synergies.bonuses.filter(b => b.type === 'affinity').length > 0 && (
                <div className="flex items-center gap-1.5 text-[9px]">
                  <FaShieldAlt className="text-cyan-400 shrink-0" size={8} />
                  <span className="font-[family-name:var(--font-brand)] text-cyan-400/80">
                    {synergies.bonuses.filter(b => b.type === 'affinity').length} affinity bonuses
                  </span>
                </div>
              )}
              {synergies.bonuses.length === 0 && (
                <div className="text-[9px] text-white/10 font-[family-name:var(--font-brand)] italic">
                  Equip cards to trigger synergies
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Clash Result ───────────────────────────────────────────────────────────

function ClashResult({ result, playerChar, aiChar, onPlayAgain }: {
  result: MatchResult
  playerChar: NPGXCharacter
  aiChar: NPGXCharacter
  onPlayAgain: () => void
}) {
  const [showScores, setShowScores] = useState(false)
  const [showWinner, setShowWinner] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setShowScores(true), 500)
    const t2 = setTimeout(() => setShowWinner(true), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const pA = result.playerA
  const pB = result.playerB
  const challenge = result.challenge

  const winnerName = result.winner === 'a' ? playerChar.name : result.winner === 'b' ? aiChar.name : 'Nobody'
  const isDraw = result.winner === 'draw'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Winner announcement */}
      <AnimatePresence>
        {showWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="text-center mb-8"
          >
            {isDraw ? (
              <h2 className="font-[family-name:var(--font-brand)] text-4xl text-white uppercase">Draw!</h2>
            ) : (
              <>
                <h2 className="font-[family-name:var(--font-brand)] text-4xl text-white uppercase">
                  {result.winner === 'a' ? (
                    <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Victory!</span>
                  ) : (
                    <span className="text-red-500">Defeat</span>
                  )}
                </h2>
                <p className="font-[family-name:var(--font-brand)] text-white/40 text-sm mt-1 uppercase">
                  {winnerName} wins {challenge.name}
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* VS Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center mb-6">
        {/* Player A */}
        <div className={`text-right ${result.winner === 'b' ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-end gap-3">
            <div>
              <div className="font-[family-name:var(--font-brand)] text-lg text-white">{playerChar.name}</div>
              <div className="font-[family-name:var(--font-brand)] text-[9px] text-purple-400/60 uppercase">{playerChar.category}</div>
            </div>
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-purple-500/30">
              <img src={playerChar.image} alt={playerChar.name} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = '/npgx-logo.png' }} />
            </div>
          </div>
        </div>

        {/* VS */}
        <div className="font-[family-name:var(--font-brand)] text-3xl text-red-500 pulse-glow-title">VS</div>

        {/* Player B (AI) */}
        <div className={`text-left ${result.winner === 'a' ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-pink-500/30">
              <img src={aiChar.image} alt={aiChar.name} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = '/npgx-logo.png' }} />
            </div>
            <div>
              <div className="font-[family-name:var(--font-brand)] text-lg text-white">{aiChar.name}</div>
              <div className="font-[family-name:var(--font-brand)] text-[9px] text-pink-400/60 uppercase">{aiChar.category} (AI)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <AnimatePresence>
        {showScores && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Challenge stats comparison */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-4">
              <div className="font-[family-name:var(--font-brand)] text-[9px] text-white/20 uppercase mb-3 text-center">
                {challenge.name} — Score Breakdown
              </div>

              {[
                { stat: challenge.primaryStat, weight: '2×', mult: 2 },
                { stat: challenge.secondaryStat, weight: '1.5×', mult: 1.5 },
                { stat: challenge.tertiaryStat, weight: '1×', mult: 1 },
              ].map(({ stat, weight, mult }, i) => {
                const valA = pA.score.finalStats[stat as StatKey]
                const valB = pB.score.finalStats[stat as StatKey]
                const scoreA = Math.round(valA * mult)
                const scoreB = Math.round(valB * mult)
                const maxVal = Math.max(scoreA, scoreB, 1)
                return (
                  <motion.div
                    key={stat}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.3 }}
                    className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-2"
                  >
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(scoreA / maxVal) * 100}%` }}
                          transition={{ delay: i * 0.3 + 0.2, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: STAT_COLORS[stat] }}
                        />
                      </div>
                      <span className={`font-[family-name:var(--font-brand)] text-sm min-w-[2rem] text-right ${scoreA >= scoreB ? 'text-yellow-400' : 'text-white/40'}`}>
                        {scoreA}
                      </span>
                    </div>

                    <div className="text-center min-w-[80px]">
                      <span className="font-[family-name:var(--font-brand)] text-xs uppercase" style={{ color: STAT_COLORS[stat] }}>
                        {STAT_LABELS[stat as StatKey]}
                      </span>
                      <span className="font-[family-name:var(--font-brand)] text-[9px] text-white/20 ml-1">{weight}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-[family-name:var(--font-brand)] text-sm min-w-[2rem] ${scoreB >= scoreA ? 'text-yellow-400' : 'text-white/40'}`}>
                        {scoreB}
                      </span>
                      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(scoreB / maxVal) * 100}%` }}
                          transition={{ delay: i * 0.3 + 0.2, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: STAT_COLORS[stat] }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Bonus */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mt-3 pt-3 border-t border-white/5"
              >
                <div className="text-right">
                  <span className={`font-[family-name:var(--font-brand)] text-sm ${pA.score.bonusMet ? 'text-yellow-400' : 'text-white/20'}`}>
                    {pA.score.bonusMet ? '+10' : '—'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="font-[family-name:var(--font-brand)] text-[10px] text-yellow-500/60 uppercase">
                    Bonus
                  </span>
                </div>
                <div>
                  <span className={`font-[family-name:var(--font-brand)] text-sm ${pB.score.bonusMet ? 'text-yellow-400' : 'text-white/20'}`}>
                    {pB.score.bonusMet ? '+10' : '—'}
                  </span>
                </div>
              </motion.div>

              {/* Total */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 }}
                className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mt-3 pt-3 border-t border-purple-500/20"
              >
                <div className="text-right">
                  <span className={`font-[family-name:var(--font-brand)] text-2xl ${result.winner === 'a' ? 'text-yellow-400' : 'text-white/60'}`}>
                    {pA.score.totalScore}
                  </span>
                </div>
                <div className="text-center">
                  <span className="font-[family-name:var(--font-brand)] text-xs text-purple-400/40 uppercase">Total</span>
                </div>
                <div>
                  <span className={`font-[family-name:var(--font-brand)] text-2xl ${result.winner === 'b' ? 'text-yellow-400' : 'text-white/60'}`}>
                    {pB.score.totalScore}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Synergy summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[{ side: pA, label: 'Your Synergies' }, { side: pB, label: 'AI Synergies' }].map(({ side, label }) => {
                const combos = side.score.synergyResult.bonuses.filter(b => b.type === 'combo')
                const sets = side.score.synergyResult.bonuses.filter(b => b.type === 'set')
                const aff = side.score.synergyResult.bonuses.filter(b => b.type === 'affinity')
                return (
                  <div key={label} className="bg-black/30 border border-white/5 rounded-lg p-3">
                    <div className="font-[family-name:var(--font-brand)] text-[8px] text-white/20 uppercase mb-2">{label}</div>
                    {combos.map(b => (
                      <div key={b.name} className="flex items-center gap-1 text-[9px] mb-0.5">
                        <FaBolt className="text-yellow-400" size={7} />
                        <span className="font-[family-name:var(--font-brand)] text-yellow-400/70">{b.name}</span>
                      </div>
                    ))}
                    {sets.map(b => (
                      <div key={b.name} className="flex items-center gap-1 text-[9px] mb-0.5">
                        <FaStar className="text-purple-400" size={7} />
                        <span className="font-[family-name:var(--font-brand)] text-purple-400/70">{b.name}</span>
                      </div>
                    ))}
                    {aff.length > 0 && (
                      <div className="flex items-center gap-1 text-[9px]">
                        <FaShieldAlt className="text-cyan-400" size={7} />
                        <span className="font-[family-name:var(--font-brand)] text-cyan-400/70">{aff.length} affinity</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Play again */}
            <div className="text-center">
              <button
                onClick={onPlayAgain}
                className="font-[family-name:var(--font-brand)] text-lg uppercase tracking-wider px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                <FaFistRaised className="inline mr-2" />
                Fight Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Outfit Clash Component ────────────────────────────────────────────

export default function OutfitClash() {
  const [phase, setPhase] = useState<Phase>('character_select')
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium')
  const [playerChar, setPlayerChar] = useState<NPGXCharacter | null>(null)
  const [aiChar, setAiChar] = useState<NPGXCharacter | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)

  const handleSelectCharacter = (char: NPGXCharacter) => {
    setPlayerChar(char)
    // Pick random AI opponent (different from player)
    let ai = char
    while (ai.slug === char.slug) {
      ai = NPGX_ROSTER[Math.floor(Math.random() * NPGX_ROSTER.length)]
    }
    setAiChar(ai)
    // Pick challenge
    const c = pickChallenge('casual')
    setChallenge(c)
    setPhase('challenge_reveal')
  }

  const handleChallengeRevealed = useCallback(() => {
    setPhase('equip')
  }, [])

  const handleSubmitLoadout = useCallback((cards: Partial<Record<SlotKey, Card>>) => {
    if (!playerChar || !aiChar || !challenge) return

    const playerLoadout: PlayerLoadout = {
      characterSlug: playerChar.slug,
      characterCategory: playerChar.category,
      characterName: playerChar.name,
      cards,
    }

    const aiLoadout = buildAILoadout(aiChar.slug, aiChar.category, aiChar.name, challenge, difficulty)
    const result = resolveMatch(playerLoadout, aiLoadout, challenge, 'casual')
    setMatchResult(result)
    setPhase('result')

    // Fire-and-forget: record match to server
    fetch('/api/cards/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...result, aiDifficulty: difficulty }),
    }).catch(() => { /* silent — works offline too */ })
  }, [playerChar, aiChar, challenge, difficulty])

  const handlePlayAgain = () => {
    setPhase('character_select')
    setPlayerChar(null)
    setAiChar(null)
    setChallenge(null)
    setMatchResult(null)
  }

  return (
    <div>
      {/* Difficulty selector (only on character select) */}
      {phase === 'character_select' && (
        <div className="flex justify-center gap-2 mb-6">
          {(Object.entries(DIFFICULTY_CONFIG) as [AIDifficulty, typeof DIFFICULTY_CONFIG[AIDifficulty]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setDifficulty(key)}
              style={{ transform: 'skewX(-12deg)' }}
            >
              <span
                className={`block px-3 py-1.5 text-[11px] font-[family-name:var(--font-brand)] uppercase border-2 transition-all ${
                  difficulty === key
                    ? 'text-white shadow-lg'
                    : 'bg-black/60 border-white/10 text-white/30 hover:text-white/50'
                }`}
                style={{
                  transform: 'skewX(12deg)',
                  ...(difficulty === key ? { borderColor: cfg.color, backgroundColor: `${cfg.color}20`, boxShadow: `0 0 15px ${cfg.color}30` } : {}),
                }}
              >
                {cfg.label}
              </span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'character_select' && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CharacterSelect onSelect={handleSelectCharacter} />
          </motion.div>
        )}

        {phase === 'challenge_reveal' && challenge && (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ChallengeReveal challenge={challenge} onContinue={handleChallengeRevealed} />
          </motion.div>
        )}

        {phase === 'equip' && challenge && playerChar && (
          <motion.div key="equip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EquipPhase challenge={challenge} character={playerChar} onSubmit={handleSubmitLoadout} />
          </motion.div>
        )}

        {phase === 'result' && matchResult && playerChar && aiChar && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ClashResult result={matchResult} playerChar={playerChar} aiChar={aiChar} onPlayAgain={handlePlayAgain} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
