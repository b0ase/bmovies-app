'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  connectWallet,
  disconnectWallet,
  signContentToChain,
  type WalletStatus,
} from '@/lib/brc100-wallet'
import {
  resolveIdentityByAddress,
  resolveIdentityByHandle,
  attestViaNode,
  getX401NodeUrl,
  type X401Identity,
} from '@/lib/x401-client'

export interface UseWalletReturn {
  wallet: WalletStatus
  identity: X401Identity | null
  x401Node: string
  connecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  attestContent: (params: {
    contentHash: string
    contentType: string
    description: string
    slug?: string
  }) => Promise<{ txid: string } | null>
}

export function useWallet(): UseWalletReturn {
  const [wallet, setWallet] = useState<WalletStatus>({
    connected: false,
    provider: null,
    address: null,
    publicKey: null,
  })
  const [identity, setIdentity] = useState<X401Identity | null>(null)
  const [connecting, setConnecting] = useState(false)
  const x401Node = getX401NodeUrl()

  // Restore wallet on mount if previously connected
  useEffect(() => {
    const saved = localStorage.getItem('npgx-wallet-provider')
    if (saved) {
      connect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const status = await connectWallet()
      setWallet(status)

      if (status.connected && status.address) {
        localStorage.setItem('npgx-wallet-provider', status.provider || '')
        // Resolve $401 identity via x401 node (path401.com)
        const id = await resolveIdentityByAddress(status.address)
        setIdentity(id)
      }
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    disconnectWallet()
    setWallet({ connected: false, provider: null, address: null, publicKey: null })
    setIdentity(null)
    localStorage.removeItem('npgx-wallet-provider')
  }, [])

  const attestContent = useCallback(async (params: {
    contentHash: string
    contentType: string
    description: string
    slug?: string
  }) => {
    if (!wallet.connected) return null

    // Strategy: try BRC-100 wallet signing first (sovereign),
    // then fall back to x401 node attestation (delegated)
    let txid: string | undefined

    // 1. Try direct BRC-100 wallet signing
    const walletResult = await signContentToChain({
      contentHash: params.contentHash,
      contentType: params.contentType,
      description: params.description,
    })

    if (walletResult?.txid) {
      txid = walletResult.txid
    } else {
      // 2. Fall back to x401 node attestation
      const nodeResult = await attestViaNode({
        contentHash: params.contentHash,
        contentType: params.contentType,
        description: params.description,
        slug: params.slug,
        address: wallet.address || undefined,
      })
      if (nodeResult.success && nodeResult.txid) {
        txid = nodeResult.txid
      }
    }

    if (txid) {
      // Store attestation record locally + on x401 node
      fetch('/api/content/attest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txid,
          contentHash: params.contentHash,
          contentType: params.contentType,
          description: params.description,
          slug: params.slug,
          address: wallet.address,
          x401Node,
        }),
      }).catch(() => {}) // fire-and-forget

      return { txid }
    }

    return null
  }, [wallet, x401Node])

  return { wallet, identity, x401Node, connecting, connect, disconnect, attestContent }
}

/**
 * Resolve identity by handle (for HandCash users without BRC-100 wallet).
 * Calls x401 node directly.
 */
export async function resolveHandCashIdentity(handle: string): Promise<X401Identity | null> {
  return resolveIdentityByHandle(handle)
}
