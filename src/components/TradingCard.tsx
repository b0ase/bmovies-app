'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { renderTradingCard, renderCardBack, exportCardAsPNG } from '@/lib/card-renderer'
import type { TradingCard as TradingCardType } from '@/lib/trading-cards'

const SIZES = {
  sm: { w: 250, h: 350 },
  md: { w: 375, h: 525 },
  lg: { w: 750, h: 1050 },
} as const

interface TradingCardProps {
  card: TradingCardType
  size?: 'sm' | 'md' | 'lg'
  onGenerate?: () => void
  generating?: boolean
}

export default function TradingCard({ card, size = 'md', onGenerate, generating }: TradingCardProps) {
  const frontRef = useRef<HTMLCanvasElement>(null)
  const backRef = useRef<HTMLCanvasElement>(null)
  const [flipped, setFlipped] = useState(false)
  const [rendered, setRendered] = useState(false)
  const dims = SIZES[size]

  const render = useCallback(async () => {
    if (!frontRef.current || !backRef.current) return
    try {
      await Promise.all([
        renderTradingCard(frontRef.current, card),
        renderCardBack(backRef.current, card),
      ])
      setRendered(true)
    } catch (err) {
      console.error('Card render failed:', err)
    }
  }, [card])

  useEffect(() => {
    render()
  }, [render])

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!frontRef.current) return
    const name = `${card.character.slug}-${card.serial}.png`
    exportCardAsPNG(frontRef.current, name)
  }

  return (
    <div className="relative group" style={{ width: dims.w, height: dims.h, perspective: 1200 }}>
      <motion.div
        className="w-full h-full relative cursor-pointer"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        onClick={() => rendered && setFlipped(!flipped)}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <canvas
            ref={frontRef}
            className="w-full h-full"
            style={{ imageRendering: 'auto' }}
          />
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <canvas
            ref={backRef}
            className="w-full h-full"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      </motion.div>

      {/* Overlay buttons */}
      <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleDownload}
          className="flex-1 px-3 py-1.5 bg-black/80 text-white text-xs font-medium rounded-lg border border-white/10 hover:bg-white/10 transition-colors font-[family-name:var(--font-brand)] uppercase tracking-wider"
        >
          Mint NFT <span className="text-[8px] text-white/40">1¢</span>
        </button>
        {onGenerate && (
          <button
            onClick={(e) => { e.stopPropagation(); onGenerate() }}
            disabled={generating}
            className="flex-1 px-3 py-1.5 bg-pink-600/80 text-white text-xs font-medium rounded-lg border border-pink-400/20 hover:bg-pink-500/80 transition-colors disabled:opacity-50 font-[family-name:var(--font-brand)] uppercase tracking-wider"
          >
            {generating ? 'Generating...' : <>Generate <span className="text-[8px] text-white/40">2¢</span></>}
          </button>
        )}
      </div>

      {/* Rarity indicator dot */}
      <div
        className="absolute top-2 right-2 w-3 h-3 rounded-full z-10"
        style={{ backgroundColor: card.rarity.color, boxShadow: `0 0 8px ${card.rarity.glow}` }}
      />
    </div>
  )
}
