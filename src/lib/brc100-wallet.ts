/**
 * BRC-100 Wallet Provider (Client-Side)
 *
 * Detects and connects to BRC-100 compliant wallets:
 * - MetaNet Desktop (localhost:3321)
 * - Future: Yours Wallet, HandCash BRC-100, etc.
 *
 * Once connected, can:
 * - Get user's BSV address + public key
 * - Sign messages (challenge-response auth)
 * - Create transactions (content signing, $402 trades)
 * - Look up $401 identity via API
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface WalletStatus {
  connected: boolean
  provider: 'metanet' | 'yours' | null
  address: string | null
  publicKey: string | null
}

export interface Identity401 {
  rootTxid: string
  address: string
  payTo: string
  strands: Identity401Strand[]
  strength: number // 1-4+ based on strand count
  createdAt: string
}

export interface Identity401Strand {
  provider: string
  handle: string
  txid: string
  createdAt: string
}

// ── MetaNet Desktop Detection ────────────────────────────────────────────────

const METANET_URL = 'http://127.0.0.1:3321'

export async function detectMetaNet(): Promise<boolean> {
  try {
    const res = await fetch(METANET_URL, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(2000),
    })
    return res.ok || res.status === 405
  } catch {
    return false
  }
}

// ── Yours Wallet Detection ───────────────────────────────────────────────────

export function detectYoursWallet(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).yours
}

// ── Wallet Connection ────────────────────────────────────────────────────────

let _walletClient: any = null
let _connectedProvider: 'metanet' | 'yours' | null = null

export async function connectMetaNet(): Promise<WalletStatus> {
  try {
    const sdk = await import('@bsv/sdk')
    const substrate = new sdk.HTTPWalletJSON(METANET_URL)
    _walletClient = new sdk.WalletClient(substrate)

    // Verify with a lightweight call
    const { publicKey } = await _walletClient.getPublicKey({
      protocolID: [1, 'npgx-identity'],
      keyID: '1',
    })

    const pubKey = sdk.PublicKey.fromString(publicKey)
    const address = pubKey.toAddress().toString()

    _connectedProvider = 'metanet'
    return { connected: true, provider: 'metanet', address, publicKey }
  } catch {
    _walletClient = null
    return { connected: false, provider: null, address: null, publicKey: null }
  }
}

export async function connectYoursWallet(): Promise<WalletStatus> {
  try {
    const yours = (window as any).yours
    if (!yours) throw new Error('Yours wallet not found')

    const connected = await yours.isConnected()
    if (!connected) {
      await yours.connect()
    }

    const addresses = await yours.getAddresses()
    const address = addresses?.bsvAddress || addresses?.identityAddress || null
    const publicKey = addresses?.identityPubKey || null

    _connectedProvider = 'yours'
    return { connected: true, provider: 'yours', address, publicKey }
  } catch {
    return { connected: false, provider: null, address: null, publicKey: null }
  }
}

export async function connectWallet(): Promise<WalletStatus> {
  // Try MetaNet Desktop first (BRC-100 native)
  if (await detectMetaNet()) {
    return connectMetaNet()
  }
  // Fall back to Yours wallet
  if (detectYoursWallet()) {
    return connectYoursWallet()
  }
  return { connected: false, provider: null, address: null, publicKey: null }
}

export function disconnectWallet() {
  _walletClient = null
  _connectedProvider = null
}

export function getWalletProvider() {
  return _connectedProvider
}

// ── Challenge-Response Auth ──────────────────────────────────────────────────

/**
 * Sign a challenge message to prove address ownership.
 * Returns the signature for server-side verification.
 */
export async function signChallenge(challenge: string): Promise<string | null> {
  if (_connectedProvider === 'metanet' && _walletClient) {
    try {
      const result = await _walletClient.createSignature({
        data: new TextEncoder().encode(challenge),
        protocolID: [1, 'npgx-auth'],
        keyID: '1',
      })
      return result.signature
    } catch {
      return null
    }
  }

  if (_connectedProvider === 'yours') {
    try {
      const yours = (window as any).yours
      const result = await yours.signMessage({ message: challenge })
      return result?.sig || result
    } catch {
      return null
    }
  }

  return null
}

// ── Token Purchase via Yours Wallet ──────────────────────────────────────────

export interface PurchaseResult {
  txid: string
  satoshis: number
  to: string
}

/**
 * Send BSV from the connected Yours wallet to a destination address.
 * Used for token purchases: buyer sends BSV to treasury, backend dispatches
 * the token ordinal to buyer's address async.
 *
 * Returns the payment txid on success, or null if the user rejects or the
 * wallet isn't connected via Yours.
 */
export async function purchaseTokenWithYours(params: {
  satoshis: number
  treasuryAddress: string
  memo?: string
}): Promise<PurchaseResult | null> {
  if (_connectedProvider !== 'yours') return null
  const yours = (window as any).yours
  if (!yours || typeof yours.sendBsv !== 'function') return null

  try {
    const result = await yours.sendBsv([
      {
        satoshis: params.satoshis,
        address: params.treasuryAddress,
        ...(params.memo ? { data: [params.memo] } : {}),
      },
    ])
    const txid = result?.txid || result?.rawtx || result
    if (!txid || typeof txid !== 'string') return null
    return { txid, satoshis: params.satoshis, to: params.treasuryAddress }
  } catch {
    return null
  }
}

// ── $401 Identity Lookup ─────────────────────────────────────────────────────

/**
 * Look up $401 on-chain identity for a BSV address.
 * Calls our API which checks WhatsOnChain for 401 inscriptions.
 */
export async function lookupIdentity(address: string): Promise<Identity401 | null> {
  try {
    const res = await fetch(`/api/auth/identity?address=${encodeURIComponent(address)}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.identity || null
  } catch {
    return null
  }
}

// ── Content Signing (BRC-100 createAction) ───────────────────────────────────

/**
 * Sign content hash to chain via BRC-100 createAction.
 * Creates a $401-compatible content attestation inscription.
 */
export async function signContentToChain(params: {
  contentHash: string
  contentType: string
  description: string
}): Promise<{ txid: string } | null> {
  if (_connectedProvider !== 'metanet' || !_walletClient) return null

  try {
    const payload = JSON.stringify({
      p: '401',
      op: 'attest',
      v: '1.0',
      hash: params.contentHash,
      type: params.contentType,
      desc: params.description,
      ts: new Date().toISOString(),
    })

    // Build OP_RETURN script
    const script = buildOpReturnHex([
      '401',
      'application/json',
      payload,
    ])

    const result = await _walletClient.createAction({
      description: `NPGX content attestation: ${params.description}`,
      outputs: [{ lockingScript: script, satoshis: 0 }],
      labels: ['npgx', 'content', '401-attest'],
    })

    return { txid: result.txid }
  } catch {
    return null
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildOpReturnHex(dataFields: string[]): string {
  // OP_FALSE OP_RETURN <field1> <field2> ...
  let hex = '006a' // OP_FALSE OP_RETURN
  for (const field of dataFields) {
    const buf = new TextEncoder().encode(field)
    if (buf.length < 76) {
      hex += buf.length.toString(16).padStart(2, '0')
    } else if (buf.length < 256) {
      hex += '4c' + buf.length.toString(16).padStart(2, '0')
    } else {
      hex += '4d' + (buf.length & 0xff).toString(16).padStart(2, '0') +
        ((buf.length >> 8) & 0xff).toString(16).padStart(2, '0')
    }
    hex += Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  return hex
}
