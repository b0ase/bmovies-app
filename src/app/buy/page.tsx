'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

const TOKEN_PACKS = [
  { amount: 100,    price: 5,    label: 'Starter',     desc: 'Generate a few images, explore the platform' },
  { amount: 500,    price: 20,   label: 'Creator',     desc: 'Generate images, short videos, magazine pages', popular: true },
  { amount: 2000,   price: 70,   label: 'Director',    desc: 'Full movies, magazines, music — serious creation' },
  { amount: 10000,  price: 300,  label: 'Studio',      desc: 'Bulk creation, exchange trading, dividend rights' },
]

const RIGHTS = [
  { tokens: '1+',     right: 'View content on the platform' },
  { tokens: '10+',    right: 'Generate images (1 token per image)' },
  { tokens: '50+',    right: 'Generate video clips (5-10 tokens per clip)' },
  { tokens: '100+',   right: 'Create full magazine issues' },
  { tokens: '500+',   right: 'Direct multi-scene movies' },
  { tokens: '1,000+', right: 'Trade on the exchange + earn dividends' },
]

export default function BuyNPGXPage() {
  const [selectedPack, setSelectedPack] = useState(1)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  const pack = TOKEN_PACKS[selectedPack]
  const finalAmount = useCustom ? parseInt(customAmount) || 0 : pack.amount
  const finalPrice = useCustom ? Math.max(1, Math.round(finalAmount * 0.04)) : pack.price

  const handleCheckout = async (method: 'stripe' | 'handcash') => {
    if (finalAmount <= 0) return
    setCheckingOut(true)
    try {
      const res = await fetch('/api/tokens/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount, method }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.message || 'Checkout created — check your wallet')
    } catch {
      alert('Checkout failed. Please try again.')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <main className="min-h-screen bg-black pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-5xl sm:text-7xl font-black text-white tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            BUY <span className="text-red-500">$NPGX</span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            $NPGX tokens are your ticket into the NPGX universe. Each token unlocks content generation,
            exchange trading, and dividend rights across all 26 characters.
          </p>
        </div>

        {/* Token Packs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {TOKEN_PACKS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => { setSelectedPack(i); setUseCustom(false) }}
              className={`relative p-5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                !useCustom && selectedPack === i
                  ? 'border-red-500 bg-red-500/5 shadow-[0_0_30px_rgba(220,20,60,0.15)]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                  Popular
                </span>
              )}
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">{p.label}</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-brand)' }}>
                  {p.amount.toLocaleString()}
                </span>
                <span className="text-white/40 text-xs">$NPGX</span>
              </div>
              <div className="text-xl font-bold text-red-500 mb-2" style={{ fontFamily: 'var(--font-brand)' }}>
                ${p.price}
              </div>
              <p className="text-white/30 text-xs leading-relaxed">{p.desc}</p>
              <div className="text-[10px] text-white/20 mt-2 font-mono">
                ${(p.price / p.amount).toFixed(3)}/token
              </div>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-10">
          <button
            onClick={() => setUseCustom(!useCustom)}
            className="text-white/30 text-xs font-mono hover:text-white/50 transition-colors"
          >
            {useCustom ? '← Back to packs' : 'Custom amount →'}
          </button>
          {useCustom && (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter token amount"
                min={1}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-lg w-48 focus:outline-none focus:border-red-500"
              />
              <span className="text-white/40 font-mono">$NPGX</span>
              <span className="text-white/20 mx-2">=</span>
              <span className="text-red-500 font-bold text-xl" style={{ fontFamily: 'var(--font-brand)' }}>
                ${finalPrice}
              </span>
            </div>
          )}
        </div>

        {/* Checkout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          {/* Buy box */}
          <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <span className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-brand)' }}>
                  {finalAmount.toLocaleString()}
                </span>
                <span className="text-white/40 text-sm ml-2">$NPGX</span>
              </div>
              <span className="text-2xl font-black text-red-500" style={{ fontFamily: 'var(--font-brand)' }}>
                ${finalPrice}
              </span>
            </div>

            <div className="space-y-2 mb-6">
              <button
                onClick={() => handleCheckout('stripe')}
                disabled={checkingOut || finalAmount <= 0}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                {checkingOut ? 'Processing...' : 'PAY WITH CARD'}
              </button>
              <button
                onClick={() => handleCheckout('handcash')}
                disabled={checkingOut || finalAmount <= 0}
                className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#38C12C" />
                  <path d="M7.5 12h9M12 7.5v9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                PAY WITH HANDCASH (BSV)
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-mono text-white/30">
              <div className="flex justify-between">
                <span>Tokens</span>
                <span className="text-white/50">{finalAmount.toLocaleString()} $NPGX</span>
              </div>
              <div className="flex justify-between">
                <span>Per token</span>
                <span className="text-white/50">${finalAmount > 0 ? (finalPrice / finalAmount).toFixed(3) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Supply</span>
                <span className="text-white/50">1,000,000,000 (1B)</span>
              </div>
              <div className="h-px bg-white/5 my-2" />
              <div className="flex justify-between text-white/50">
                <span>Total</span>
                <span className="text-red-400 font-bold">${finalPrice}</span>
              </div>
            </div>
          </div>

          {/* What you get */}
          <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
            <h3
              className="text-sm font-black text-white/60 uppercase tracking-widest mb-4"
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              What $NPGX unlocks
            </h3>
            <div className="space-y-3">
              {RIGHTS.map((r) => (
                <div key={r.tokens} className="flex items-start gap-3">
                  <span className="shrink-0 w-16 text-right text-red-500/70 text-xs font-mono font-bold mt-0.5">
                    {r.tokens}
                  </span>
                  <span className="text-white/50 text-sm">{r.right}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-white/20 text-[10px] font-mono leading-relaxed">
                $NPGX tokens are circular — redeemed tokens return to the creator pool for re-minting.
                Tokens are never burned. All 26 characters share the same $NPGX token.
                Individual character tokens ($ARIA, $BLADE, etc.) are available on the{' '}
                <Link href="/exchange" className="text-red-500/50 hover:text-red-500 underline">exchange</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* 26 characters strip */}
        <div className="mb-8">
          <h3
            className="text-xs font-black text-white/30 uppercase tracking-widest mb-4 text-center"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            26 characters · 1 token
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {NPGX_ROSTER.map((c) => (
              <Link
                key={c.slug}
                href={`/exchange?token=${c.token}`}
                className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/40 hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                {c.token}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
