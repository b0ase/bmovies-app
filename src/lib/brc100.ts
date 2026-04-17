/**
 * bMovies BRC-100 wallet client — TypeScript port.
 *
 * Vendor-neutral wallet detection + payment + sign for any BRC-100
 * compatible wallet. This is the TS counterpart of the brochure's
 * `docs/brochure/js/brc100.js` — same surface, but imports @bsv/sdk
 * from node_modules so the bundler can tree-shake and HMR works.
 *
 * Supported wallets (BRC-100 native):
 *   - BSV Desktop / Metanet Client Desktop (via HTTPWalletJSON on 3321/2121)
 *   - Yours Wallet (browser extension, window.yours)
 *
 * Explicitly NOT supported (not BRC-100):
 *   - HandCash: uses its own OAuth-based SDK, handled separately
 *   - MetaMask / Phantom: Ethereum / Solana wallets, post-hackathon
 *
 * Phase A surface (what you get today):
 *   connectWallet()     → detect + handshake a BRC-100 wallet
 *   walletStatus()      → current connection state
 *   disconnectWallet()  → clear module state
 *   payToAddress(opts)  → request the wallet to build, sign, broadcast
 *   signChallenge(nonce)→ BRC-100 createSignature over a server nonce
 *                         (used by the /api/auth/brc100/verify flow)
 */

import {
  WalletClient,
  HTTPWalletJSON,
  PublicKey,
  P2PKH,
  Utils,
  type WalletInterface,
  type WalletProtocol,
} from '@bsv/sdk'

// BSV Desktop / Antigravity (Metanet Client Desktop) port detection.
// Old BSV Desktop: hardcoded 3321 or 2121.
// New Antigravity: dynamic ports, typically in the 50000-60000 range.
// We probe hardcoded ports first, then scan the dynamic range if needed.
const LEGACY_PORTS = [3321, 2121]

// Protocol tag used to scope key derivation for bMovies actions.
// Security level 1 = "app" scope — the wallet prompts for permission
// once per app, then silently grants subsequent signatures for that
// same protocolID. Level 2 would prompt on every call. Level 0 is
// reserved for private counterparty operations.
export const BMOVIES_PROTOCOL_ID: WalletProtocol = [1, 'bmovies']
export const BMOVIES_KEY_ID = '1'

export type Provider = 'metanet' | 'yours'

export interface WalletStatus {
  connected: boolean
  provider: Provider | null
  address: string | null
  publicKey: string | null
  error: string | null
}

export interface PayOpts {
  address: string
  satoshis: number
  description: string
}

export interface PayReceipt {
  txid: string
  provider: Provider
}

export interface SignResult {
  signature: string // DER hex
  publicKey: string // derived pubkey hex (same as walletStatus().publicKey)
  provider: Provider
}

// Minimal shape for Yours Wallet — it isn't a BRC-100 WalletClient, it has
// its own legacy API that predates BRC-100 but covers the same ground.
interface YoursWallet {
  isConnected?: () => Promise<boolean>
  connect?: () => Promise<void>
  getAddresses?: () => Promise<{
    bsvAddress?: string
    identityAddress?: string
    identityPubKey?: string
  }>
  sendBsv?: (
    reqs: Array<{ address: string; satoshis: number; description?: string }>,
  ) => Promise<string | { txid?: string; txId?: string; hash?: string; error?: string; message?: string }>
  signMessage?: (req: { message: string }) => Promise<{ sig?: string; signature?: string; pubKey?: string; publicKey?: string }>
}

declare global {
  interface Window {
    yours?: YoursWallet
  }
}

// ── Module state ────────────────────────────────────────────────────

let _client: WalletInterface | null = null
let _provider: Provider | null = null
let _address: string | null = null
let _publicKey: string | null = null

// ── Detection ───────────────────────────────────────────────────────

/**
 * Probe BSV Desktop on localhost:3321 (or legacy 2121).
 *
 * IMPORTANT: Do NOT use raw fetch() to probe — Chrome blocks reading
 * cross-origin responses from http://localhost due to CORS, even though
 * the request reaches the wallet. The SDK's HTTPWalletJSON handles this
 * correctly via the browser's automatic Origin header.
 *
 * Constructor: new HTTPWalletJSON(originator?, baseUrl?, httpClient?)
 * In the browser, originator is ignored (browser sends Origin automatically).
 */
export async function detectMetanet(): Promise<
  | { url: string; client: WalletInterface; address: string; publicKey: string }
  | null
> {
  // Two-step probe that matches the known-working brochure pattern:
  //   1. Lightweight fetch to /isAuthenticated — proves the wallet HTTP
  //      server is reachable from the browser, regardless of CORS behaviour
  //      inside the SDK substrate.
  //   2. SDK handshake via HTTPWalletJSON → getPublicKey — derives the
  //      bmovies-scoped address and yields a WalletClient we can reuse.
  //
  // We try 127.0.0.1 AND localhost because some Chrome / extension setups
  // resolve them differently (localhost goes through /etc/hosts, 127.0.0.1
  // is a raw IP — the PNA + mixed-content rules can bite either one).
  const HOSTS = ['127.0.0.1', 'localhost'] as const
  let lastError: string | null = null

  for (const host of HOSTS) {
    for (const port of LEGACY_PORTS) {
      const url = `http://${host}:${port}`

      // Step 1 — liveness probe. Never touches the overlay peer network.
      let authed: boolean | null = null
      try {
        const res = await fetch(`${url}/isAuthenticated`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          signal: AbortSignal.timeout(3000),
        })
        if (!res.ok) {
          lastError = `${url} /isAuthenticated → HTTP ${res.status}`
          continue
        }
        const body = await res.json()
        authed = Boolean(body?.authenticated)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        lastError = `${url} unreachable: ${msg}`
        continue
      }

      if (!authed) {
        lastError = `${url} found but wallet is locked. Unlock BSV Desktop.`
        console.info(`[brc100] ${lastError}`)
        continue
      }

      console.info(`[brc100] BSV Desktop reachable on ${url}, handshaking…`)

      // Step 2 — SDK handshake. This is the part that sometimes hangs on
      // wallet-brc100-1.0.0 due to an internal overlay peer bug; hard
      // timeout at 15s and fall through with a useful error.
      try {
        const substrate = new HTTPWalletJSON(undefined, url)
        const client = new WalletClient(substrate)
        const { publicKey } = await Promise.race([
          client.getPublicKey({
            protocolID: BMOVIES_PROTOCOL_ID,
            keyID: BMOVIES_KEY_ID,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('handshake timeout (15s)')), 15_000),
          ),
        ])
        const pk = PublicKey.fromString(publicKey)
        const address = pk.toAddress().toString()
        console.info(`[brc100] BSV Desktop handshake OK → ${address}`)
        return { url, client, address, publicKey }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        lastError = `${url} handshake failed: ${msg}`
        console.warn(`[brc100] ${lastError}`)
        // try next host/port
      }
    }
  }

  if (lastError) {
    // Stash on a module-level field so connectBsvDesktop can surface it.
    _lastDetectError = lastError
  }
  return null
}

let _lastDetectError: string | null = null

export function detectYoursWallet(): boolean {
  return typeof window !== 'undefined' && Boolean(window.yours)
}

// ── Connection ──────────────────────────────────────────────────────

export async function connectWallet(): Promise<WalletStatus> {
  const metanet = await detectMetanet()
  if (metanet) {
    _client = metanet.client
    _address = metanet.address
    _publicKey = metanet.publicKey
    _provider = 'metanet'
    return walletStatus()
  }
  if (detectYoursWallet()) {
    return connectYours()
  }
  return walletStatus()
}

/** Connect ONLY BSV Desktop / Metanet Client. Does NOT fall back to Yours. */
export async function connectBsvDesktop(): Promise<WalletStatus> {
  _lastDetectError = null
  const metanet = await detectMetanet()
  if (metanet) {
    _client = metanet.client
    _address = metanet.address
    _publicKey = metanet.publicKey
    _provider = 'metanet'
    return walletStatus()
  }
  const reason =
    _lastDetectError ??
    'BSV Desktop not detected on localhost:3321 or :2121. Make sure it is running and unlocked.'
  return walletStatus(new Error(reason))
}

/** Connect ONLY Yours Wallet. Does NOT fall back to Metanet. */
export async function connectYoursWallet(): Promise<WalletStatus> {
  if (detectYoursWallet()) {
    return connectYours()
  }
  return walletStatus(new Error('Yours Wallet not detected. Install the browser extension from yours.org'))
}

async function connectYours(): Promise<WalletStatus> {
  try {
    const yours = window.yours
    if (!yours) throw new Error('yours wallet not present')

    const already =
      typeof yours.isConnected === 'function' ? await yours.isConnected() : false
    if (!already && typeof yours.connect === 'function') {
      await yours.connect()
    }
    const addresses =
      typeof yours.getAddresses === 'function' ? await yours.getAddresses() : {}
    _address = addresses?.bsvAddress || addresses?.identityAddress || null
    _publicKey = addresses?.identityPubKey || null
    _provider = 'yours'
    return walletStatus()
  } catch (err) {
    _provider = null
    _address = null
    _publicKey = null
    _client = null
    console.error('[brc100] Yours connect failed:', err)
    return walletStatus(err)
  }
}

export function disconnectWallet(): void {
  _client = null
  _provider = null
  _address = null
  _publicKey = null
}

export function walletStatus(err?: unknown): WalletStatus {
  return {
    connected: Boolean(_provider),
    provider: _provider,
    address: _address,
    publicKey: _publicKey,
    error: err ? (err instanceof Error ? err.message : String(err)) : null,
  }
}

// ── Payment ─────────────────────────────────────────────────────────

export async function payToAddress(opts: PayOpts): Promise<PayReceipt> {
  if (!_provider) throw new Error('No wallet connected — call connectWallet() first.')
  if (!opts?.address || !opts?.satoshis || !opts?.description) {
    throw new Error('payToAddress requires { address, satoshis, description }')
  }
  if (!Number.isInteger(opts.satoshis) || opts.satoshis <= 0) {
    throw new Error('satoshis must be a positive integer')
  }

  if (_provider === 'metanet') return payViaMetanet(opts)
  if (_provider === 'yours') return payViaYours(opts)
  throw new Error(`Unsupported provider: ${_provider}`)
}

async function payViaMetanet({ address, satoshis, description }: PayOpts): Promise<PayReceipt> {
  if (!_client) throw new Error('metanet client lost')
  const lockingScript = new P2PKH().lock(address).toHex()

  const result = await _client.createAction({
    description: truncateDescription(description),
    outputs: [
      {
        lockingScript,
        satoshis,
        outputDescription: truncateDescription(description),
      },
    ],
    labels: ['bmovies', 'payment'],
  })
  if (!result?.txid) throw new Error('Wallet returned no txid')
  return { txid: result.txid, provider: 'metanet' }
}

async function payViaYours({ address, satoshis, description }: PayOpts): Promise<PayReceipt> {
  const yours = window.yours
  if (!yours || typeof yours.sendBsv !== 'function') {
    throw new Error('Yours wallet does not expose sendBsv')
  }
  const TIMEOUT_MS = 25_000
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          'Yours wallet timed out after 25s — Yours may have broadcast the tx ' +
            'but its 1sat.app backend is unresponsive. Check Yours directly.',
        ),
      )
    }, TIMEOUT_MS)
  })

  let result
  try {
    result = await Promise.race([
      yours.sendBsv([{ address, satoshis, description: truncateDescription(description) }]),
      timeoutPromise,
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
  const txid =
    typeof result === 'string'
      ? result
      : result?.txid || result?.txId || result?.hash || null
  if (!txid) {
    const errMsg =
      typeof result === 'object' && result ? result.error || result.message : null
    if (errMsg) throw new Error('Yours wallet: ' + errMsg)
    throw new Error(`Yours wallet returned no txid: ${JSON.stringify(result).slice(0, 200)}`)
  }
  return { txid, provider: 'yours' }
}

// ── Signing (phase B — auth via wallet) ────────────────────────────
//
// BRC-100's createSignature returns a raw DER-encoded ECDSA signature
// over SHA256(data) using the derived key (scoped by protocolID + keyID).
// We sign the server-issued nonce, send { address, publicKey, signature,
// nonce } to /api/auth/brc100/verify, which reconstructs the hash and
// verifies against the publicKey via @bsv/sdk.
//
// Yours Wallet doesn't implement BRC-100's createSignature. It has a
// legacy signMessage({ message }) endpoint that uses Bitcoin Signed
// Message (BSM) format instead. We handle both providers.

export async function signChallenge(nonce: string): Promise<SignResult> {
  if (!_provider) throw new Error('No wallet connected — call connectWallet() first.')
  if (!nonce || typeof nonce !== 'string') throw new Error('nonce must be a non-empty string')

  if (_provider === 'metanet') return signViaMetanet(nonce)
  if (_provider === 'yours') return signViaYours(nonce)
  throw new Error(`Unsupported provider: ${_provider}`)
}

async function signViaMetanet(nonce: string): Promise<SignResult> {
  if (!_client || !_publicKey) throw new Error('metanet client lost')
  const data = Utils.toArray(nonce, 'utf8')
  const result = await _client.createSignature({
    protocolID: BMOVIES_PROTOCOL_ID,
    keyID: BMOVIES_KEY_ID,
    data,
  })
  if (!result?.signature) throw new Error('Wallet returned no signature')
  const signatureHex = Utils.toHex(Array.from(result.signature))
  return { signature: signatureHex, publicKey: _publicKey, provider: 'metanet' }
}

async function signViaYours(nonce: string): Promise<SignResult> {
  const yours = window.yours
  if (!yours || typeof yours.signMessage !== 'function') {
    throw new Error(
      'Yours wallet does not expose signMessage — update Yours or use BSV Desktop.',
    )
  }
  const resp = await yours.signMessage({ message: nonce })
  const signature = resp?.sig || resp?.signature || null
  const publicKey = resp?.pubKey || resp?.publicKey || _publicKey || null
  if (!signature || !publicKey) {
    throw new Error('Yours signMessage returned no signature or pubkey')
  }
  if (!_publicKey) _publicKey = publicKey
  return { signature, publicKey, provider: 'yours' }
}

// ── Helpers ────────────────────────────────────────────────────────

function truncateDescription(s: string): string {
  if (!s) return 'bMovies payment'
  const clean = String(s).replace(/\s+/g, ' ').trim()
  if (clean.length < 5) return (clean + ' (bmovies)').slice(0, 50)
  if (clean.length > 50) return clean.slice(0, 50)
  return clean
}

export function walletInstallPrompt() {
  return {
    heading: 'Connect a BRC-100 wallet',
    body:
      'bMovies is a BRC-100 app. To sign in or pay with your BSV wallet, run a ' +
      'compatible wallet on your machine. The easiest path is BSV Desktop — ' +
      'download, create a wallet, and refresh this page.',
    primary: {
      label: 'Get BSV Desktop',
      href: 'https://github.com/bsv-blockchain/bsv-desktop/releases/latest',
    },
    secondary: {
      label: 'What is BRC-100?',
      href: 'https://github.com/bitcoin-sv/BRCs/blob/master/wallet/0100.md',
    },
  }
}
