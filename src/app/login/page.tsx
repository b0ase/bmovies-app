'use client'

/**
 * /login — bMovies sign-in.
 *
 * Four auth methods, in descending hackathon narrative priority:
 *
 *   1. BRC-100 wallet (BSV Desktop / Yours Wallet) — new-user sign-up
 *      and existing-account link both flow through /api/auth/brc100/*.
 *      This is the canonical sign-in for bMovies because the whole
 *      agent layer is BRC-100 under the hood.
 *   2. Google — GSI popup flow, same bMovies client ID already whitelisted
 *      on GoTrue (api.b0ase.com). signInWithIdToken mints a real session.
 *   3. Email + password — Supabase built-in.
 *   4. HandCash — post-hackathon, explicitly out of BSVA scope because
 *      HandCash is not a BRC-100 wallet. Placeholder only.
 *
 * Both bmovies.online and app.bmovies.online share the same self-hosted
 * Supabase at api.b0ase.com, so the auth.users UUID is the same user
 * record regardless of which origin signed them in — only the session
 * token itself is per-origin (localStorage is isolated across subdomains).
 */

import { useState, Suspense, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { useRouter, useSearchParams } from 'next/navigation'
import { bmovies } from '@/lib/supabase-bmovies'
import {
  connectWallet,
  signChallenge,
  walletStatus,
  disconnectWallet,
  type WalletStatus,
} from '@/lib/brc100'

type Mode = 'signin' | 'signup'

// bMovies-specific Google OAuth client ID — same one used on the static
// site. Whitelisted on self-hosted GoTrue at api.b0ase.com so
// signInWithIdToken will mint a Supabase session from a token issued
// to this client.
const BMOVIES_GOOGLE_CLIENT_ID =
  '325838379150-0ittv6q8t2hnegicsnp2mectcanp5li4.apps.googleusercontent.com'

interface GsiResponse {
  credential?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: {
            client_id: string
            ux_mode: 'popup' | 'redirect'
            auto_select?: boolean
            itp_support?: boolean
            callback: (r: GsiResponse) => void
          }) => void
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
        }
      }
    }
  }
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/account'

  // ── Email/password state ──
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // ── Wallet state ──
  const [wallet, setWallet] = useState<WalletStatus>({
    connected: false,
    provider: null,
    address: null,
    publicKey: null,
    error: null,
  })
  const [walletBusy, setWalletBusy] = useState(false)

  // ── Google button slot ──
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const [gsiReady, setGsiReady] = useState(false)

  // If already signed in, bounce straight to returnTo.
  useEffect(() => {
    bmovies.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(returnTo)
    })
  }, [router, returnTo])

  // ── Google Identity Services setup ──
  const handleGoogleCredential = useCallback(
    async (response: GsiResponse) => {
      setError(null)
      setInfo(null)
      setBusy(true)
      try {
        if (!response?.credential) throw new Error('No credential returned from Google')
        const { error } = await bmovies.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        })
        if (error) throw error
        router.replace(returnTo)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed')
      } finally {
        setBusy(false)
      }
    },
    [router, returnTo],
  )

  useEffect(() => {
    if (!gsiReady) return
    if (!googleBtnRef.current) return
    if (!window.google?.accounts?.id) return
    window.google.accounts.id.initialize({
      client_id: BMOVIES_GOOGLE_CLIENT_ID,
      ux_mode: 'popup',
      auto_select: false,
      itp_support: true,
      callback: handleGoogleCredential,
    })
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 320,
    })
  }, [gsiReady, handleGoogleCredential])

  // ── Email/password handler ──
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

  // ── BRC-100 full sign-in / sign-up flow ──
  // Phase B: connect → challenge → sign → verify → setSession → redirect.
  // Works for both new users (no account yet) and returning users — the
  // /verify endpoint upserts the auth.users row keyed to the BSV address
  // and mints a Supabase session via the service_role key on the server.
  async function handleBrc100SignIn() {
    setError(null)
    setInfo(null)
    setWalletBusy(true)
    try {
      // 1. Connect to BSV Desktop / Yours and handshake
      const status = await connectWallet()
      setWallet(status)
      if (!status.connected) {
        throw new Error(
          'No BRC-100 wallet detected. Install BSV Desktop from ' +
            'github.com/bsv-blockchain/bsv-desktop/releases/latest, ' +
            'unlock it, then try again.',
        )
      }
      if (!status.address || !status.publicKey) {
        throw new Error('Wallet connected but did not return an address or public key')
      }

      // 2. Ask the server for a challenge nonce (httpOnly cookie binds
      //    the nonce to this browser session)
      const chalRes = await fetch('/api/auth/brc100/challenge', {
        method: 'POST',
        credentials: 'include',
      })
      if (!chalRes.ok) {
        const body = await chalRes.text()
        throw new Error(`Challenge request failed: ${body.slice(0, 200)}`)
      }
      const { challenge } = (await chalRes.json()) as { challenge: string }
      if (!challenge) throw new Error('Server returned no challenge')

      // 3. Ask the wallet to sign the challenge with the bMovies-scoped key
      const signed = await signChallenge(challenge)

      // 4. Send { address, publicKey, signature, challenge } to /verify,
      //    which returns { access_token, refresh_token, newUser }
      const verifyRes = await fetch('/api/auth/brc100/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: status.address,
          publicKey: signed.publicKey,
          signature: signed.signature,
          challenge,
          provider: signed.provider,
        }),
      })
      if (!verifyRes.ok) {
        const body = await verifyRes.text()
        throw new Error(`Verify failed: ${body.slice(0, 200)}`)
      }
      const {
        access_token,
        refresh_token,
        newUser,
      } = (await verifyRes.json()) as {
        access_token: string
        refresh_token: string
        newUser: boolean
      }

      // 5. Install the session into the Supabase client so every
      //    subsequent query sees it
      const { error: setErr } = await bmovies.auth.setSession({
        access_token,
        refresh_token,
      })
      if (setErr) throw setErr

      setInfo(newUser ? 'Welcome to bMovies. Opening your studio…' : 'Signed in. Opening your studio…')
      router.replace(returnTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BRC-100 sign-in failed')
      disconnectWallet()
      setWallet(walletStatus())
    } finally {
      setWalletBusy(false)
    }
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGsiReady(true)}
      />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
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

          {/* ── Google (primary) ── */}
          <div className="border border-[#E50914] bg-gradient-to-br from-[#1a0003] to-[#0a0000] p-5 mb-5">
            <div className="flex justify-center">
              <div ref={googleBtnRef} style={{ minHeight: 40, minWidth: 240 }} />
            </div>
            {!gsiReady && (
              <div className="text-center text-[0.6rem] text-[#555] mt-2">
                Loading Google sign-in…
              </div>
            )}
            <div className="text-center text-[0.55rem] text-[#666] mt-3">
              Once signed in, you can link a BRC-100 wallet (BSV Desktop / Yours)<br/>
              from your account dashboard to enable BSV payments and token purchases.
            </div>
          </div>

          {/* ── Email / password ── */}
          <form onSubmit={handleSubmit} className="space-y-4 border border-[#222] bg-[#0a0a0a] p-5">
            <div className="text-[0.55rem] uppercase tracking-[0.18em] font-bold text-[#888] mb-1">
              Or use email
            </div>
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

            <button
              type="submit"
              disabled={busy || walletBusy}
              className="w-full px-6 py-3 bg-white hover:bg-[#eee] disabled:bg-[#333] disabled:text-[#666] text-black text-xs font-black uppercase tracking-wider"
            >
              {busy ? 'Working…' : mode === 'signin' ? 'Sign in with email →' : 'Create account →'}
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

          {error && (
            <div className="mt-4 border border-[#E50914] bg-[#1a0003] px-3 py-2 text-[#ff6b7a] text-xs">
              {error}
            </div>
          )}
          {info && (
            <div className="mt-4 border border-[#2a5a2a] bg-[#031a03] px-3 py-2 text-[#6bff8a] text-xs">
              {info}
            </div>
          )}

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
    </>
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
