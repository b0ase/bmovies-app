'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline'

type Step = 'choose' | 'describe' | 'pricing' | 'submitting' | 'done'
type TicketType = 'bug' | 'feature' | 'priority'

const TIERS = {
  bug: { label: 'Bug Fix', price: 49, desc: 'Something broken? We\'ll fix it.', time: '24-48hrs' },
  feature: { label: 'Feature Build', price: 149, desc: 'Want something new? We\'ll build it.', time: '3-5 days' },
  priority: { label: 'Priority Build', price: 499, desc: 'Rush job. Top of the queue.', time: '24hrs' },
} as const

export function LiveChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<Step>('choose')
  const [ticketType, setTicketType] = useState<TicketType | null>(null)
  const [description, setDescription] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [ticketId, setTicketId] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-fill current page URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.pathname)
    }
  }, [isOpen])

  const reset = () => {
    setStep('choose')
    setTicketType(null)
    setDescription('')
    setPageUrl(typeof window !== 'undefined' ? window.location.pathname : '')
    setEmail('')
    setError('')
    setTicketId('')
  }

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Tell us what you need'); return }
    if (!email.trim() || !email.includes('@')) { setError('We need your email to follow up'); return }
    if (!ticketType) return

    setStep('submitting')
    setError('')

    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: ticketType,
          description: description.trim(),
          pageUrl: pageUrl.trim(),
          email: email.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to submit')

      // If Stripe URL returned, redirect to payment
      if (data.checkoutUrl) {
        setTicketId(data.ticketId)
        window.location.href = data.checkoutUrl
        return
      }

      setTicketId(data.ticketId)
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setStep('pricing')
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) reset() }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 bg-red-600 hover:bg-red-700"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={isOpen ? {} : { y: [0, -4, 0], transition: { duration: 2, repeat: Infinity } }}
      >
        {isOpen ? <XMarkIcon className="h-7 w-7" /> : <ChatBubbleLeftRightIcon className="h-7 w-7" />}
      </motion.button>

      {/* Badge */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-[5.5rem] right-6 z-50 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg"
        >
          Support
        </motion.div>
      )}

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm tracking-wide">NPGX SUPPORT</h3>
                  <p className="text-[10px] opacity-80 mt-0.5">Tell us what&apos;s broken. We fix it. You pay.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px]">Online</span>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              {/* ── Step 1: Choose type ── */}
              {step === 'choose' && (
                <div className="p-4 space-y-2">
                  <p className="text-gray-400 text-xs mb-3">What do you need?</p>
                  {(Object.entries(TIERS) as [TicketType, typeof TIERS.bug][]).map(([key, tier]) => (
                    <button
                      key={key}
                      onClick={() => { setTicketType(key); setStep('describe') }}
                      className="w-full text-left p-3 rounded-xl border border-white/10 hover:border-red-500/50 hover:bg-white/5 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-semibold text-sm">{tier.label}</span>
                        <span className="text-red-400 font-bold text-sm">${tier.price}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">{tier.desc}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">Turnaround: {tier.time}</p>
                    </button>
                  ))}
                  <p className="text-gray-600 text-[10px] text-center pt-2">
                    Payment via Stripe. We build it or you get a refund.
                  </p>
                </div>
              )}

              {/* ── Step 2: Describe ── */}
              {step === 'describe' && ticketType && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setStep('choose')} className="text-gray-500 text-xs hover:text-white transition">&larr; Back</button>
                    <span className="text-red-400 font-bold text-xs">{TIERS[ticketType].label} &middot; ${TIERS[ticketType].price}</span>
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs block mb-1">What&apos;s the issue / what do you want built?</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={ticketType === 'bug'
                        ? "e.g. The mixer page has no audio when I click play..."
                        : "e.g. I want a download button on the magazine page..."
                      }
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Which page? (auto-filled)</label>
                    <input
                      type="text"
                      value={pageUrl}
                      onChange={e => setPageUrl(e.target.value)}
                      placeholder="/mixer, /watch, etc."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Your email (for updates)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {error && <p className="text-red-400 text-xs">{error}</p>}

                  <button
                    onClick={() => { setStep('pricing'); setError('') }}
                    disabled={!description.trim() || !email.trim()}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Review & Pay &rarr;
                  </button>
                </div>
              )}

              {/* ── Step 3: Confirm & Pay ── */}
              {step === 'pricing' && ticketType && (
                <div className="p-4 space-y-3">
                  <button onClick={() => setStep('describe')} className="text-gray-500 text-xs hover:text-white transition">&larr; Back</button>

                  <div className="border border-white/10 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold text-sm">{TIERS[ticketType].label}</span>
                      <span className="text-red-400 font-bold">${TIERS[ticketType].price}</span>
                    </div>
                    <div className="border-t border-white/5 pt-2">
                      <p className="text-gray-300 text-xs leading-relaxed">&ldquo;{description.slice(0, 200)}{description.length > 200 ? '...' : ''}&rdquo;</p>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Page: {pageUrl || 'Not specified'}</span>
                      <span>ETA: {TIERS[ticketType].time}</span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 space-y-1.5">
                    <p className="text-white text-xs font-semibold">How it works:</p>
                    <p className="text-gray-400 text-[11px]">1. Pay securely via Stripe</p>
                    <p className="text-gray-400 text-[11px]">2. We review your request within 1hr</p>
                    <p className="text-gray-400 text-[11px]">3. We build / fix it</p>
                    <p className="text-gray-400 text-[11px]">4. You get notified at {email}</p>
                    <p className="text-gray-500 text-[10px] mt-1">Full refund if we can&apos;t deliver.</p>
                  </div>

                  {error && <p className="text-red-400 text-xs">{error}</p>}

                  <button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-red-900/30"
                  >
                    Pay ${TIERS[ticketType].price} & Submit
                  </button>
                </div>
              )}

              {/* ── Submitting ── */}
              {step === 'submitting' && (
                <div className="p-8 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Creating your ticket...</p>
                </div>
              )}

              {/* ── Done ── */}
              {step === 'done' && (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-2xl">
                    &#10003;
                  </div>
                  <h4 className="text-white font-bold text-sm">Ticket Submitted</h4>
                  {ticketId && <p className="text-gray-500 text-[10px] font-mono">#{ticketId.slice(0, 8)}</p>}
                  <p className="text-gray-400 text-xs">
                    We&apos;ll review this within 1 hour and email you at <span className="text-white">{email}</span> with updates.
                  </p>
                  <button
                    onClick={reset}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold transition"
                  >
                    Submit another request
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
