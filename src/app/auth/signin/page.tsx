'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { FaGoogle } from 'react-icons/fa'
import { motion } from 'framer-motion'

function SignInForm() {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  const handleGoogleSignIn = async () => {
    setIsLoading('google')
    await signIn('google', { callbackUrl })
  }

  const handleHandCashSignIn = () => {
    setIsLoading('handcash')
    window.location.href = '/api/auth/handcash/login'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-red-500/20"
    >
      <div className="text-center mb-8">
        <div className="mb-6">
          <span className="text-white font-black text-2xl tracking-tight uppercase" style={{ fontFamily: 'var(--font-brand)' }}>
            NINJA PUNK GIRLS
          </span>
          <span className="text-red-500 font-black text-3xl ml-1" style={{ fontFamily: 'var(--font-brand)' }}>
            X
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Sign in to enter</h1>
        <p className="text-gray-500 text-sm">26 girls. Your fantasy. Your film.</p>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-6 text-sm text-center">
          Sign in failed. Please try again.
        </div>
      )}

      <div className="space-y-3">
        {/* Google — primary */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading !== null}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          {isLoading === 'google' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
          ) : (
            <>
              <FaGoogle className="w-5 h-5" />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-black text-gray-600">or</span></div>
        </div>

        {/* HandCash — crypto native */}
        <button
          onClick={handleHandCashSignIn}
          disabled={isLoading !== null}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          {isLoading === 'handcash' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              <span>Continue with HandCash</span>
            </>
          )}
        </button>
      </div>

      <p className="mt-6 text-center text-[11px] text-gray-600">
        Free to join — no payment required. Sign in to access the full NPGX experience.
      </p>
    </motion.div>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950/30 to-black flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="max-w-md w-full bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-red-500/20 animate-pulse">
          <div className="text-center mb-8">
            <div className="h-8 bg-gray-700 rounded mb-4 w-48 mx-auto" />
            <div className="h-6 bg-gray-700 rounded w-32 mx-auto" />
          </div>
          <div className="h-12 bg-gray-700 rounded mb-3" />
          <div className="h-12 bg-gray-700 rounded" />
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  )
}
