'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  FaUser,
  FaWallet,
  FaCoins,
  FaSignOutAlt,
  FaCopy,
  FaCheck,
  FaBook,
  FaImage,
  FaExternalLinkAlt,
  FaShieldAlt,
} from 'react-icons/fa'

type UserProfile = {
  handle: string
  displayName: string
  avatarUrl: string
}

type WalletInfo = {
  address: string
  publicKey: string
  derived: boolean
}

type Tab = 'overview' | 'wallet' | 'tokens' | 'magazines' | 'settings'

export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push('/login?returnTo=/account')
          return
        }
        const data = await res.json()
        setProfile(data.profile)
        if (data.wallet) setWallet(data.wallet)
      } catch {
        router.push('/login?returnTo=/account')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router])

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }, [])

  const handleDeriveWallet = useCallback(async () => {
    if (!profile) return
    try {
      const res = await fetch('/api/user/wallet/derive', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setWallet(data.wallet)
      }
    } catch (err) {
      console.error('Wallet derivation failed:', err)
    }
  }, [profile])

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <FaUser className="w-3.5 h-3.5" /> },
    { id: 'wallet', label: 'Wallet', icon: <FaWallet className="w-3.5 h-3.5" /> },
    { id: 'tokens', label: 'Tokens', icon: <FaCoins className="w-3.5 h-3.5" /> },
    { id: 'magazines', label: 'Magazines', icon: <FaBook className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', icon: <FaShieldAlt className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full border-2 border-red-500/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-950/30 border-2 border-red-500/30 flex items-center justify-center">
                <FaUser className="w-6 h-6 text-red-500" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
                {profile.displayName || profile.handle}
              </h1>
              <p className="text-gray-500 text-sm">@{profile.handle} &middot; HandCash</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-red-500 text-sm transition"
          >
            <FaSignOutAlt className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto border-b border-white/5 pb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-red-500 border-red-500'
                  : 'text-gray-600 border-transparent hover:text-white hover:border-white/20'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab profile={profile} wallet={wallet} onCopy={copyToClipboard} copied={copied} />
          )}
          {activeTab === 'wallet' && (
            <WalletTab wallet={wallet} onDerive={handleDeriveWallet} onCopy={copyToClipboard} copied={copied} />
          )}
          {activeTab === 'tokens' && <TokensTab />}
          {activeTab === 'magazines' && <MagazinesTab />}
          {activeTab === 'settings' && <SettingsTab profile={profile} />}
        </motion.div>
      </div>
    </div>
  )
}

/* ── Overview Tab ── */
function OverviewTab({ profile, wallet, onCopy, copied }: {
  profile: UserProfile; wallet: WalletInfo | null; onCopy: (t: string, l: string) => void; copied: string
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Profile Card */}
      <div className="bg-gray-950 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Profile</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Handle</span>
            <span className="text-white text-sm font-mono">@{profile.handle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Display Name</span>
            <span className="text-white text-sm">{profile.displayName || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Auth Provider</span>
            <span className="text-green-500 text-sm font-bold">HandCash</span>
          </div>
        </div>
      </div>

      {/* Wallet Summary */}
      <div className="bg-gray-950 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Wallet</h3>
        {wallet ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">BSV Address</span>
              <button
                onClick={() => onCopy(wallet.address, 'address')}
                className="flex items-center gap-1.5 text-white text-xs font-mono bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition"
              >
                {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                {copied === 'address' ? <FaCheck className="w-2.5 h-2.5 text-green-500" /> : <FaCopy className="w-2.5 h-2.5 text-gray-500" />}
              </button>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Status</span>
              <span className="text-green-500 text-xs font-bold uppercase">Active</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 text-sm mb-3">No wallet derived yet</p>
            <Link href="#" onClick={(e) => { e.preventDefault() }} className="text-red-500 text-sm font-bold hover:text-red-400">
              Go to Wallet tab to create one
            </Link>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-950 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Content</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center py-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-black text-red-500">0</div>
            <div className="text-gray-600 text-[10px] uppercase tracking-wider">Images</div>
          </div>
          <div className="text-center py-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-black text-red-500">0</div>
            <div className="text-gray-600 text-[10px] uppercase tracking-wider">Magazines</div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-950 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Quick Links</h3>
        <div className="space-y-2">
          <Link href="/magazine" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition group">
            <span className="text-gray-400 text-sm group-hover:text-white">Create Magazine</span>
            <FaExternalLinkAlt className="w-3 h-3 text-gray-600" />
          </Link>
          <Link href="/xxx" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition group">
            <span className="text-gray-400 text-sm group-hover:text-white">View Gallery</span>
            <FaExternalLinkAlt className="w-3 h-3 text-gray-600" />
          </Link>
          <Link href="/characters" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition group">
            <span className="text-gray-400 text-sm group-hover:text-white">Characters</span>
            <FaExternalLinkAlt className="w-3 h-3 text-gray-600" />
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Wallet Tab ── */
function WalletTab({ wallet, onDerive, onCopy, copied }: {
  wallet: WalletInfo | null; onDerive: () => void; onCopy: (t: string, l: string) => void; copied: string
}) {
  return (
    <div className="max-w-2xl">
      <div className="bg-gray-950 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">BSV Wallet</h3>
        <p className="text-gray-600 text-xs mb-6">
          Your NPGX wallet is derived from your HandCash signing key. Only you control this address.
        </p>

        {wallet ? (
          <div className="space-y-4">
            <div>
              <label className="text-gray-500 text-[10px] uppercase tracking-widest block mb-1">Address</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-white text-xs font-mono truncate">
                  {wallet.address}
                </code>
                <button
                  onClick={() => onCopy(wallet.address, 'wallet-address')}
                  className="p-2 bg-white/5 rounded hover:bg-white/10 transition"
                >
                  {copied === 'wallet-address' ? <FaCheck className="w-3.5 h-3.5 text-green-500" /> : <FaCopy className="w-3.5 h-3.5 text-gray-500" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-gray-500 text-[10px] uppercase tracking-widest block mb-1">Public Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-white text-xs font-mono truncate">
                  {wallet.publicKey}
                </code>
                <button
                  onClick={() => onCopy(wallet.publicKey, 'pubkey')}
                  className="p-2 bg-white/5 rounded hover:bg-white/10 transition"
                >
                  {copied === 'pubkey' ? <FaCheck className="w-3.5 h-3.5 text-green-500" /> : <FaCopy className="w-3.5 h-3.5 text-gray-500" />}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <p className="text-gray-600 text-[10px] uppercase tracking-widest">
                This address can hold $NPGX tokens and character tokens. Only your HandCash key can sign transactions.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FaWallet className="w-10 h-10 text-red-500/30 mx-auto mb-4" />
            <p className="text-gray-500 text-sm mb-4">
              Derive a BSV wallet address from your HandCash account.
              This creates a new address that only you can control.
            </p>
            <button
              onClick={onDerive}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all hover:scale-105"
            >
              Create Wallet
            </button>
          </div>
        )}
      </div>

      {/* Token Wallets */}
      {wallet && (
        <div className="bg-gray-950 border border-white/10 rounded-xl p-6 mt-6">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Token Wallets</h3>
          <p className="text-gray-600 text-xs mb-4">
            Each NPGX character token gets its own derived address from your master key.
          </p>
          <div className="text-center py-6">
            <p className="text-gray-600 text-sm">No character tokens held yet</p>
            <Link href="/characters" className="text-red-500 text-sm font-bold hover:text-red-400 mt-2 inline-block">
              Browse Characters
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Tokens Tab ── */
function TokensTab() {
  return (
    <div className="max-w-2xl">
      <div className="bg-gray-950 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Token Portfolio</h3>
        <p className="text-gray-600 text-xs mb-6">Your $NPGX and character token holdings.</p>

        <div className="text-center py-12">
          <FaCoins className="w-10 h-10 text-red-500/30 mx-auto mb-4" />
          <p className="text-gray-500 text-sm mb-2">No tokens yet</p>
          <p className="text-gray-700 text-xs">Purchase tokens from the exchange or earn them through content creation.</p>
          <Link
            href="/tokens"
            className="inline-block mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
          >
            View Token Exchange
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Magazines Tab ── */
function MagazinesTab() {
  return (
    <div className="max-w-2xl">
      <div className="bg-gray-950 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">My Magazines</h3>
        <p className="text-gray-600 text-xs mb-6">Magazines you&apos;ve generated or purchased.</p>

        <div className="text-center py-12">
          <FaBook className="w-10 h-10 text-purple-500/30 mx-auto mb-4" />
          <p className="text-gray-500 text-sm mb-2">No magazines yet</p>
          <p className="text-gray-700 text-xs">Generated magazines are stored locally. Server-saved magazines will appear here.</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link
              href="/magazine"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
            >
              Create Magazine
            </Link>
            <Link
              href="/magazine/generated"
              className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
            >
              View Library
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Settings Tab ── */
function SettingsTab({ profile }: { profile: UserProfile }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-gray-950 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Account</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">HandCash Handle</span>
            <span className="text-white text-sm font-mono">@{profile.handle}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Authentication</span>
            <span className="bg-green-500/10 text-green-500 text-[10px] font-bold uppercase px-2 py-0.5 rounded">Connected</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-950 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Legal</h3>
        <div className="space-y-2">
          <Link href="/terms" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition group">
            <span className="text-gray-400 text-sm group-hover:text-white">Terms of Service</span>
            <FaExternalLinkAlt className="w-3 h-3 text-gray-600" />
          </Link>
          <Link href="/privacy" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition group">
            <span className="text-gray-400 text-sm group-hover:text-white">Privacy Policy</span>
            <FaExternalLinkAlt className="w-3 h-3 text-gray-600" />
          </Link>
        </div>
      </div>

      <div className="bg-gray-950 border border-red-500/20 rounded-xl p-6">
        <h3 className="text-red-500 font-bold text-sm uppercase tracking-wider mb-2">Danger Zone</h3>
        <p className="text-gray-600 text-xs mb-4">
          Deleting your account will remove all server-side data. Local data (IndexedDB) must be cleared manually.
        </p>
        <button className="bg-red-950/30 hover:bg-red-950/50 text-red-500 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-red-500/20 transition">
          Delete Account
        </button>
      </div>
    </div>
  )
}
