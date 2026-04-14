'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type Card,
  type Rarity,
  RARITY_COLORS,
  SLOTS,
  getCardById,
  getCardImageUrl,
} from '@/lib/cards'
import { PRICING } from '@/lib/pricing'
import { FaStore, FaCoins, FaTag, FaShoppingCart, FaSpinner } from 'react-icons/fa'

interface Listing {
  id: string
  card_instance_id: string
  seller_handle: string
  price_sats: number
  platform_fee_sats: number
  listed_at: string
  npgx_card_inventory: {
    card_id: string
    rarity: string
    owner_handle: string
  }
}

interface InventoryCard {
  id: string
  instance_id: string
  card_id: string
  rarity: string
  acquired_via: string
  acquired_at: string
  is_locked: boolean
  listed_price_sats: number | null
}

// ── Listing Card ───────────────────────────────────────────────────────────

function ListingCard({ listing, onBuy }: { listing: Listing; onBuy: (id: string) => void }) {
  const cardData = getCardById(listing.npgx_card_inventory.card_id)
  const rarity = listing.npgx_card_inventory.rarity as Rarity
  const rarityColor = RARITY_COLORS[rarity] || '#9ca3af'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -2 }}
      className="rounded-xl overflow-hidden border-2 transition-all group"
      style={{ borderColor: `${rarityColor}30`, background: `linear-gradient(145deg, ${rarityColor}08, #0a0a0a)` }}
    >
      {/* Card image */}
      <div className="aspect-[4/3] relative">
        <img
          src={getCardImageUrl(listing.npgx_card_inventory.card_id)}
          alt={cardData?.name || listing.npgx_card_inventory.card_id}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {/* Rarity badge */}
        <div className="absolute top-2 right-2">
          <span className="text-[8px] font-[family-name:var(--font-brand)] uppercase px-1.5 py-0.5 rounded border"
            style={{ color: rarityColor, borderColor: `${rarityColor}50`, backgroundColor: `${rarityColor}15` }}>
            {rarity}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <h4 className="font-[family-name:var(--font-brand)] text-sm text-white truncate">
            {cardData?.name || listing.npgx_card_inventory.card_id}
          </h4>
          <p className="font-[family-name:var(--font-brand)] text-[9px] text-white/30 uppercase">
            {cardData ? SLOTS[cardData.slot]?.name : 'Unknown'} &middot; Seller: {listing.seller_handle}
          </p>
        </div>

        {/* Price + Buy */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <FaCoins className="text-yellow-400" size={10} />
            <span className="font-[family-name:var(--font-brand)] text-yellow-400 text-sm">
              {listing.price_sats}
            </span>
            <span className="font-[family-name:var(--font-brand)] text-white/20 text-[9px]">sats</span>
          </div>
          <button
            onClick={() => onBuy(listing.id)}
            className="font-[family-name:var(--font-brand)] text-[10px] uppercase px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded hover:from-green-500 hover:to-emerald-500 transition-all"
          >
            <FaShoppingCart className="inline mr-1" size={8} />
            Buy
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Sell Card Modal ────────────────────────────────────────────────────────

function SellModal({ card, onList, onClose }: {
  card: InventoryCard
  onList: (instanceId: string, price: number) => void
  onClose: () => void
}) {
  const [price, setPrice] = useState(100)
  const cardData = getCardById(card.card_id)
  const rarity = card.rarity as Rarity

  // Suggested prices by rarity
  const suggestions: Record<Rarity, number> = {
    common: 50, uncommon: 150, rare: 500, epic: 1500, legendary: 5000,
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#111] border border-purple-500/20 rounded-2xl p-6 max-w-sm w-full"
      >
        <h3 className="font-[family-name:var(--font-brand)] text-xl text-white uppercase mb-4">List for Sale</h3>

        {/* Card preview */}
        <div className="flex items-center gap-3 mb-4 bg-black/40 rounded-lg p-3">
          <div className="w-16 h-12 rounded overflow-hidden">
            <img src={getCardImageUrl(card.card_id)} alt={cardData?.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-[family-name:var(--font-brand)] text-sm text-white">{cardData?.name || card.card_id}</div>
            <div className="font-[family-name:var(--font-brand)] text-[9px] uppercase" style={{ color: RARITY_COLORS[rarity] }}>
              {rarity}
            </div>
          </div>
        </div>

        {/* Price input */}
        <div className="mb-3">
          <label className="font-[family-name:var(--font-brand)] text-[10px] text-white/30 uppercase block mb-1">
            Price (satoshis)
          </label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(Math.max(10, parseInt(e.target.value) || 10))}
            className="w-full bg-black/60 border border-purple-500/20 rounded px-3 py-2 text-white font-[family-name:var(--font-brand)] text-sm"
            min={10}
          />
        </div>

        {/* Quick price buttons */}
        <div className="flex gap-2 mb-4">
          {[suggestions[rarity], Math.round(suggestions[rarity] * 0.5), Math.round(suggestions[rarity] * 2)].map(p => (
            <button
              key={p}
              onClick={() => setPrice(p)}
              className={`flex-1 text-[10px] font-[family-name:var(--font-brand)] py-1 rounded border transition-all ${
                price === p ? 'border-purple-400 text-purple-300 bg-purple-600/20' : 'border-white/10 text-white/30 hover:text-white/50'
              }`}
            >
              {p} sats
            </button>
          ))}
        </div>

        {/* Fee info */}
        <div className="bg-black/30 rounded-lg p-2 mb-4 text-[10px] font-[family-name:var(--font-brand)] text-white/30">
          <div className="flex justify-between">
            <span>Platform fee (5%)</span>
            <span className="text-white/50">{Math.ceil(price * 0.05)} sats</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>You receive</span>
            <span className="text-green-400">{price - Math.ceil(price * 0.05)} sats</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 font-[family-name:var(--font-brand)] text-sm py-2 bg-white/5 rounded-lg hover:bg-white/10 text-white/50">
            Cancel
          </button>
          <button
            onClick={() => onList(card.instance_id, price)}
            className="flex-1 font-[family-name:var(--font-brand)] text-sm py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-500 hover:to-pink-500"
          >
            <FaTag className="inline mr-1" size={10} />
            List for {price} sats
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Marketplace ───────────────────────────────────────────────────────

export default function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([])
  const [myCards, setMyCards] = useState<InventoryCard[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'browse' | 'sell'>('browse')
  const [sellCard, setSellCard] = useState<InventoryCard | null>(null)
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc'>('price_asc')
  const [rarityFilter, setRarityFilter] = useState<string>('all')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [listingsRes, inventoryRes] = await Promise.all([
        fetch(`/api/cards/marketplace?sort=${sortBy}`).then(r => r.json()),
        fetch('/api/cards/inventory').then(r => r.json()),
      ])
      setListings(listingsRes.listings || [])
      setMyCards(inventoryRes.cards || [])
    } catch {
      // Offline mode — empty
    }
    setLoading(false)
  }

  async function handleBuy(tradeId: string) {
    try {
      const res = await fetch('/api/cards/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'buy', tradeId }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ text: 'Card purchased!', type: 'success' })
        loadData()
      } else {
        setMessage({ text: data.error || 'Purchase failed', type: 'error' })
      }
    } catch {
      setMessage({ text: 'Network error', type: 'error' })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleList(instanceId: string, priceSats: number) {
    try {
      const res = await fetch('/api/cards/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', instanceId, priceSats }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ text: 'Card listed!', type: 'success' })
        setSellCard(null)
        loadData()
      } else {
        setMessage({ text: data.error || 'Listing failed', type: 'error' })
      }
    } catch {
      setMessage({ text: 'Network error', type: 'error' })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  const filteredListings = rarityFilter === 'all'
    ? listings
    : listings.filter(l => l.npgx_card_inventory.rarity === rarityFilter)

  const sellableCards = myCards.filter(c => !c.is_locked && !c.listed_price_sats)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-[family-name:var(--font-brand)] text-sm ${
              message.type === 'success' ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sell modal */}
      <AnimatePresence>
        {sellCard && <SellModal card={sellCard} onList={handleList} onClose={() => setSellCard(null)} />}
      </AnimatePresence>

      {/* View toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {([
            { key: 'browse', label: 'Browse Market', icon: FaStore },
            { key: 'sell', label: 'Sell My Cards', icon: FaTag },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{ transform: 'skewX(-12deg)' }}
            >
              <span className={`flex items-center gap-2 px-4 py-2 font-[family-name:var(--font-brand)] text-sm uppercase border-2 transition-all ${
                view === key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'bg-black/60 border-white/10 text-white/30 hover:text-white/60'
              }`} style={{ transform: 'skewX(12deg)' }}>
                <Icon size={12} /> {label}
              </span>
            </button>
          ))}
        </div>

        {view === 'browse' && (
          <div className="flex gap-2">
            <select
              value={rarityFilter}
              onChange={e => setRarityFilter(e.target.value)}
              className="bg-black/60 border border-purple-500/20 rounded px-3 py-1.5 text-sm text-white font-[family-name:var(--font-brand)]"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value as any); loadData() }}
              className="bg-black/60 border border-purple-500/20 rounded px-3 py-1.5 text-sm text-white font-[family-name:var(--font-brand)]"
            >
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <FaSpinner className="animate-spin text-purple-400 mx-auto mb-3" size={24} />
          <p className="font-[family-name:var(--font-brand)] text-white/30 text-sm uppercase">Loading...</p>
        </div>
      ) : view === 'browse' ? (
        <>
          {filteredListings.length === 0 ? (
            <div className="text-center py-20">
              <FaStore className="text-white/10 mx-auto mb-4" size={48} />
              <p className="font-[family-name:var(--font-brand)] text-white/30 text-lg uppercase">No listings yet</p>
              <p className="font-[family-name:var(--font-brand)] text-white/15 text-sm mt-1">
                Open packs and list your cards to get the market started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} onBuy={handleBuy} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="font-[family-name:var(--font-brand)] text-white/20 text-[10px] uppercase tracking-wider mb-4">
            {sellableCards.length} cards available to sell
          </p>
          {sellableCards.length === 0 ? (
            <div className="text-center py-20">
              <FaTag className="text-white/10 mx-auto mb-4" size={48} />
              <p className="font-[family-name:var(--font-brand)] text-white/30 text-lg uppercase">No cards to sell</p>
              <p className="font-[family-name:var(--font-brand)] text-white/15 text-sm mt-1">
                Open packs to get cards, then list them here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {sellableCards.map(card => {
                const cardData = getCardById(card.card_id)
                const rarity = card.rarity as Rarity
                return (
                  <motion.button
                    key={card.instance_id}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => setSellCard(card)}
                    className="rounded-lg overflow-hidden border border-white/5 hover:border-purple-500/30 text-left transition-all"
                  >
                    <div className="aspect-[4/3] relative">
                      <img src={getCardImageUrl(card.card_id)} alt={cardData?.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span className="absolute top-1 right-1 text-[7px] font-[family-name:var(--font-brand)] uppercase px-1 py-0.5 rounded"
                        style={{ color: RARITY_COLORS[rarity], border: `1px solid ${RARITY_COLORS[rarity]}40`, backgroundColor: `${RARITY_COLORS[rarity]}10` }}>
                        {rarity}
                      </span>
                    </div>
                    <div className="p-1.5 bg-black/40">
                      <div className="font-[family-name:var(--font-brand)] text-[9px] text-white truncate">{cardData?.name || card.card_id}</div>
                      <div className="font-[family-name:var(--font-brand)] text-[8px] text-purple-400/40 uppercase">tap to sell</div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
