/**
 * NPGX Wallet Derivation — Real BSV Keys
 *
 * Ported from b0ase.com/lib/wallet-derivation.ts
 * Deterministic HD wallet from HandCash auth — server never stores raw keys.
 *
 * Flow:
 *   1. User signs in with HandCash → authToken cookie
 *   2. HMAC(authToken, handle) → master seed → real BSV PrivateKey
 *   3. Per-token child keys via BRC-42-style derivation (HMAC chaining)
 *   4. Each token ($NPGX, $ARIA, $LUNA...) gets its own unlinkable address
 *   5. User can withdraw tokens to Yours wallet or any BSV address
 */

import { createHmac } from 'crypto'
import { PrivateKey } from '@bsv/sdk'

const DERIVATION_VERSION = 'NPGX-v1'
const HD_PROTOCOL_ID = 'npgx-token-wallets'

export interface MasterWallet {
  address: string
  publicKey: string
}

export interface TokenWallet {
  tokenSlug: string
  address: string
  publicKey: string
}

export interface WalletManifest {
  version: 2
  protocol: typeof HD_PROTOCOL_ID
  masterAddress: string
  masterPublicKey: string
  tokenWallets: TokenWallet[]
}

/**
 * Derive master private key from authToken + handle.
 * Root of the HD tree — all token addresses derive from this.
 * SECURITY: Never return or log this key. Only use server-side.
 */
export function deriveMasterKey(authToken: string, handle: string): PrivateKey {
  const seed = createHmac('sha256', DERIVATION_VERSION)
    .update(authToken + handle.toLowerCase())
    .digest('hex')
  return PrivateKey.fromString(seed.slice(0, 64), 'hex')
}

/**
 * Derive master wallet (address + public key only — safe to return to client).
 */
export function deriveMasterWallet(authToken: string, handle: string): MasterWallet {
  const masterKey = deriveMasterKey(authToken, handle)
  const publicKey = masterKey.toPublicKey()
  return {
    address: masterKey.toAddress(),
    publicKey: publicKey.toString(),
  }
}

/**
 * Derive a child private key for a specific token.
 * Uses HMAC-SHA256 with master key + protocol + token slug.
 * Each token slug produces a unique, unlinkable address.
 *
 * SECURITY: Returns PrivateKey — only use server-side for signing/transfers.
 */
export function deriveTokenKey(masterKey: PrivateKey, tokenSlug: string): PrivateKey {
  const childSeed = createHmac('sha256', masterKey.toHex())
    .update(`${HD_PROTOCOL_ID}:${tokenSlug}`)
    .digest('hex')
  return PrivateKey.fromString(childSeed.slice(0, 64), 'hex')
}

/**
 * Derive token wallet (address + public key — safe to return to client).
 */
export function deriveTokenWallet(masterKey: PrivateKey, tokenSlug: string): TokenWallet {
  const childKey = deriveTokenKey(masterKey, tokenSlug)
  return {
    tokenSlug,
    address: childKey.toAddress(),
    publicKey: childKey.toPublicKey().toString(),
  }
}

/**
 * Derive a single token address from authToken + handle + token slug.
 * Convenience function — chains master → token derivation.
 */
export function deriveTokenAddress(authToken: string, handle: string, tokenSlug: string): TokenWallet {
  const masterKey = deriveMasterKey(authToken, handle)
  return deriveTokenWallet(masterKey, tokenSlug)
}

/**
 * Derive the full wallet tree — master + all token addresses.
 * Used for account page to show all user token balances.
 */
export function deriveFullWalletTree(
  authToken: string,
  handle: string,
  tokenSlugs: string[]
): WalletManifest {
  const masterKey = deriveMasterKey(authToken, handle)
  const masterPub = masterKey.toPublicKey()
  const tokenWallets = tokenSlugs.map(slug => deriveTokenWallet(masterKey, slug))

  return {
    version: 2,
    protocol: HD_PROTOCOL_ID,
    masterAddress: masterKey.toAddress(),
    masterPublicKey: masterPub.toString(),
    tokenWallets,
  }
}
