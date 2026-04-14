'use client'

import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { FaCoins, FaPowerOff } from 'react-icons/fa'

interface WalletButtonProps {
  variant?: 'nav' | 'pill' | 'block'
  showAddress?: boolean
}

function shortAddress(address: string | null): string {
  if (!address) return ''
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function WalletButton({ variant = 'nav', showAddress = true }: WalletButtonProps) {
  const { wallet, connecting, connect, disconnect } = useWallet()
  const [showDropdown, setShowDropdown] = useState(false)

  const isConnected = wallet.connected && wallet.address
  const providerLabel = wallet.provider === 'yours' ? 'Yours' : wallet.provider === 'metanet' ? 'MetaNet' : ''

  if (variant === 'block') {
    return (
      <button
        onClick={isConnected ? disconnect : connect}
        disabled={connecting}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
      >
        {connecting ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        ) : isConnected ? (
          <>
            <FaPowerOff className="w-4 h-4" />
            <span>{providerLabel} · {shortAddress(wallet.address)}</span>
          </>
        ) : (
          <>
            <FaCoins className="w-5 h-5" />
            <span>Connect Yours Wallet</span>
          </>
        )}
      </button>
    )
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={isConnected ? disconnect : connect}
        disabled={connecting}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wide px-3 py-1.5 transition-all disabled:opacity-50"
      >
        <FaCoins className="w-3 h-3" />
        <span>
          {connecting
            ? 'Connecting…'
            : isConnected
              ? `${providerLabel} · ${shortAddress(wallet.address)}`
              : 'Connect Yours'}
        </span>
      </button>
    )
  }

  // nav variant — inline next to navigation items
  return (
    <div className="relative">
      <button
        onClick={() => {
          if (isConnected) {
            setShowDropdown(!showDropdown)
          } else {
            connect()
          }
        }}
        disabled={connecting}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all disabled:opacity-50 ${
          isConnected
            ? 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
            : 'text-gray-500 hover:text-red-400 hover:bg-white/5'
        }`}
        title={isConnected ? `${providerLabel} wallet connected` : 'Connect your BSV wallet'}
      >
        <FaCoins className="w-3.5 h-3.5" />
        {connecting ? (
          <span className="hidden xl:inline">Connecting…</span>
        ) : isConnected && showAddress ? (
          <span className="hidden xl:inline">{shortAddress(wallet.address)}</span>
        ) : (
          <span className="hidden xl:inline">{isConnected ? providerLabel : 'Connect Wallet'}</span>
        )}
      </button>

      {showDropdown && isConnected && (
        <div
          className="absolute right-0 mt-2 w-64 bg-black/95 border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden"
          onMouseLeave={() => setShowDropdown(false)}
        >
          <div className="p-3 border-b border-white/10">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              {providerLabel} Wallet
            </div>
            <div className="text-xs text-white font-mono mt-1 break-all">
              {wallet.address}
            </div>
          </div>
          <button
            onClick={() => {
              disconnect()
              setShowDropdown(false)
            }}
            className="w-full text-left px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <FaPowerOff className="w-3 h-3" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
