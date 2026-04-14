'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/xxx'

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-gradient-to-br from-gray-900 via-red-950/30 to-black border border-red-500/30 rounded-2xl p-8 text-center"
      >
        <div className="text-5xl mb-4 font-black text-red-500">NPGX</div>
        <h1 className="text-2xl font-bold text-white mb-2">Members Only</h1>
        <p className="text-gray-400 mb-6">
          Sign in with HandCash to access exclusive NPGX content. Each view supports the characters you love — $0.01 per press, paid directly to token holders.
        </p>

        <div className="space-y-3">
          <a
            href={`/api/auth/handcash?returnTo=${encodeURIComponent(returnTo)}`}
            className="block w-full py-4 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-lg hover:from-green-700 hover:to-red-700 transition shadow-lg shadow-green-600/20"
          >
            Sign In with HandCash
          </a>

          <Link
            href="/"
            className="block w-full py-3 rounded-lg bg-gray-800 text-gray-300 font-semibold hover:bg-gray-700 transition"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-6 text-xs text-gray-500 space-y-1">
          <p>$0.01 per content press — revenue shared with $NPGX token holders</p>
          <p>Need a wallet? <a href="https://handcash.io" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">Get HandCash</a></p>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
