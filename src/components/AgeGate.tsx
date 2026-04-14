'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'npgx-age-verified'

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    setVerified(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  const handleEnter = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVerified(true)
  }

  if (verified === null) {
    return <div style={{ minHeight: '100vh', background: '#000' }} />
  }

  if (verified) return <>{children}</>

  // Not verified — show ONLY the age gate, don't render children
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black">
      <div className="text-center max-w-md mx-4">
        {/* Logo */}
        <div className="mb-6">
          <h1
            className="text-white font-black text-4xl sm:text-5xl tracking-tight"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            NINJA PUNK GIRLS
          </h1>
          <span
            className="text-red-500 inline-block"
            style={{
              fontSize: '4rem',
              fontFamily: "var(--font-graffiti), 'Permanent Marker', 'Impact', cursive",
              transform: 'rotate(-3deg) skewX(-2deg)',
              textShadow: '3px 3px 0 rgba(0,0,0,0.8), 0 0 30px rgba(220,20,60,0.4)',
              lineHeight: 0.8,
              display: 'inline-block',
            }}
          >
            X
          </span>
        </div>

        {/* Warning */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-red-500 text-2xl font-black">18+</span>
            <span className="text-white font-bold text-sm uppercase tracking-wider">Adult Content</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            This website contains AI-generated adult content including explicit imagery.
            By entering, you confirm you are at least 18 years old and that viewing
            adult content is legal in your jurisdiction.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleEnter}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl text-lg font-black uppercase tracking-wider transition-all hover:scale-105 shadow-2xl shadow-red-600/30"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            I am 18+ — Enter
          </button>
          <a
            href="https://google.com"
            className="text-gray-600 hover:text-gray-400 text-sm transition py-2"
          >
            Leave
          </a>
        </div>
      </div>
    </div>
  )
}
