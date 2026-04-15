'use client'

/**
 * /login — bMovies sign-in.
 *
 * Uses the same Supabase auth as bmovies.online (shared session via
 * storageKey 'bmovies-auth'). Email + password for now — magic-link
 * / OTP can be added later. Signing in here lands you straight on
 * /account with your films, cap tables, and creative tools.
 */

import { useState, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { bmovies } from '@/lib/supabase-bmovies'

type Mode = 'signin' | 'signup'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/account'

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // If already signed in, bounce straight to returnTo
  useEffect(() => {
    bmovies.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(returnTo)
    })
  }, [router, returnTo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await bmovies.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace(returnTo)
      } else {
        const { error } = await bmovies.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Check your email for a confirmation link.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div
            className="text-5xl font-black leading-none mb-3"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            <span className="text-white">b</span>
            <span className="text-[#E50914]">Movies</span>
          </div>
          <h1
            className="text-3xl font-black leading-none mb-2"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {mode === 'signin' ? (
              <>Open your<br/>studio</>
            ) : (
              <>Start a<br/>new studio</>
            )}
          </h1>
          <p className="text-[#888] text-sm leading-relaxed">
            {mode === 'signin'
              ? 'Your films, cap tables, agents, and dividends — all in one place.'
              : 'Sign up to commission your first film and mint your own studio token.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border border-[#222] bg-[#0a0a0a] p-6">
          <div>
            <label className="block text-[0.55rem] uppercase tracking-wider font-bold text-[#888] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-black border border-[#222] focus:border-[#E50914] text-white px-3 py-2.5 text-sm outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-[0.55rem] uppercase tracking-wider font-bold text-[#888] mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              className="w-full bg-black border border-[#222] focus:border-[#E50914] text-white px-3 py-2.5 text-sm outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="border border-[#E50914] bg-[#1a0003] px-3 py-2 text-[#ff6b7a] text-xs">
              {error}
            </div>
          )}
          {info && (
            <div className="border border-[#2a5a2a] bg-[#031a03] px-3 py-2 text-[#6bff8a] text-xs">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full px-6 py-3 bg-[#E50914] hover:bg-[#b00610] disabled:bg-[#3a0004] disabled:text-[#666] text-white text-xs font-black uppercase tracking-wider"
          >
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in →' : 'Create account →'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setInfo(null)
            }}
            className="w-full text-[#888] hover:text-white text-xs"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <a
            href="https://bmovies.online/commission.html"
            className="block text-[#888] hover:text-white text-xs"
          >
            Or commission a film for $0.99 →
          </a>
          <Link href="/" className="block text-[#666] hover:text-white text-[0.7rem]">
            ← Back to bMovies
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-[#666] text-sm">Loading…</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
