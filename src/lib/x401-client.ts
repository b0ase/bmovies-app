/**
 * x401 Node Client
 *
 * Connects to a $401 identity node (e.g. path401.com or x401.npgx.website).
 * The x401 subdomain pattern: any domain can CNAME x401.example.com → path401.com.
 * The node reads the Host header to serve domain-specific identity data.
 *
 * Env: X401_NODE_URL (server) / NEXT_PUBLIC_X401_NODE_URL (client)
 */

// ── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_NODE = 'https://path401.com'

export function getX401NodeUrl(): string {
  // Client-side: use public env var
  if (typeof window !== 'undefined') {
    return (
      process.env.NEXT_PUBLIC_X401_NODE_URL ||
      DEFAULT_NODE
    )
  }
  // Server-side: prefer private, fall back to public
  return (
    process.env.X401_NODE_URL ||
    process.env.NEXT_PUBLIC_X401_NODE_URL ||
    DEFAULT_NODE
  )
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface X401Identity {
  rootTxid: string
  address: string
  handle?: string
  payTo: string
  strands: X401Strand[]
  strength: number
  createdAt: string
}

export interface X401Strand {
  provider: string
  handle: string
  txid: string
  createdAt: string
  points?: number
}

export interface X401AttestResult {
  success: boolean
  txid?: string
  contentHash: string
  explorer?: string
  error?: string
}

export interface X401NodeInfo {
  protocol: string
  version: string
  node: string
  capabilities: string[]
  providers: string[]
}

// ── Node Discovery ──────────────────────────────────────────────────────────

/**
 * Check if an x401 node is reachable and get its capabilities.
 */
export async function discoverNode(nodeUrl?: string): Promise<X401NodeInfo | null> {
  const url = nodeUrl || getX401NodeUrl()
  try {
    // Try .well-known endpoint first (x-protocol spec)
    const res = await fetch(`${url}/.well-known/x401.json`, {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Node may not have .well-known yet
  }

  // Fallback: try the identity API directly
  try {
    const res = await fetch(`${url}/api/client/identity`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    })
    if (res.status !== 404) {
      return {
        protocol: '$401',
        version: '1.0',
        node: url,
        capabilities: ['identity', 'strands'],
        providers: ['github', 'twitter', 'google', 'linkedin', 'discord', 'handcash'],
      }
    }
  } catch {}

  return null
}

// ── Identity Resolution ─────────────────────────────────────────────────────

/**
 * Resolve $401 identity by BSV address via x401 node.
 * Falls back to local WhatsOnChain scan if node doesn't support address lookup.
 */
export async function resolveIdentityByAddress(
  address: string,
  nodeUrl?: string,
): Promise<X401Identity | null> {
  const url = nodeUrl || getX401NodeUrl()

  // Try x401 node's address-based lookup
  try {
    const res = await fetch(
      `${url}/api/identity/resolve?address=${encodeURIComponent(address)}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (res.ok) {
      const data = await res.json()
      if (data.identity) return data.identity
    }
  } catch {}

  // Fallback: try our local API (which does WhatsOnChain scanning)
  try {
    const res = await fetch(
      `/api/auth/identity?address=${encodeURIComponent(address)}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (res.ok) {
      const data = await res.json()
      return data.identity || null
    }
  } catch {}

  return null
}

/**
 * Resolve $401 identity by handle (e.g. HandCash handle) via x401 node.
 */
export async function resolveIdentityByHandle(
  handle: string,
  nodeUrl?: string,
): Promise<X401Identity | null> {
  const url = nodeUrl || getX401NodeUrl()

  try {
    const res = await fetch(
      `${url}/api/identity/resolve?handle=${encodeURIComponent(handle)}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (res.ok) {
      const data = await res.json()
      return data.identity || null
    }
  } catch {}

  return null
}

/**
 * Verify a specific attestation txid via the x401 node.
 */
export async function verifyAttestation(
  txid: string,
  nodeUrl?: string,
): Promise<{ verified: boolean; data?: Record<string, unknown> }> {
  const url = nodeUrl || getX401NodeUrl()

  try {
    const res = await fetch(
      `${url}/api/identity/verify?txid=${encodeURIComponent(txid)}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (res.ok) {
      return await res.json()
    }
  } catch {}

  return { verified: false }
}

// ── Content Attestation via Node ────────────────────────────────────────────

/**
 * Submit a content attestation through the x401 node.
 * The node inscribes the $401 attest OP_RETURN on behalf of the app.
 * Requires the app to have a registered domain or API key with the node.
 */
export async function attestViaNode(params: {
  contentHash: string
  contentType: string
  description: string
  slug?: string
  address?: string
  signature?: string
  nodeUrl?: string
}): Promise<X401AttestResult> {
  const url = params.nodeUrl || getX401NodeUrl()

  try {
    const res = await fetch(`${url}/api/identity/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentHash: params.contentHash,
        contentType: params.contentType,
        description: params.description,
        slug: params.slug,
        address: params.address,
        signature: params.signature,
        app: 'npgx',
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (res.ok) {
      return await res.json()
    }

    return {
      success: false,
      contentHash: params.contentHash,
      error: `Node returned ${res.status}`,
    }
  } catch (e) {
    return {
      success: false,
      contentHash: params.contentHash,
      error: e instanceof Error ? e.message : 'Node unreachable',
    }
  }
}

// ── OAuth Strand Initiation ─────────────────────────────────────────────────

/**
 * Get the OAuth URL for linking a provider strand via the x401 node.
 * Redirects user to the node's OAuth flow, which returns them to the app.
 */
export function getStrandOAuthUrl(
  provider: 'github' | 'twitter' | 'google' | 'linkedin' | 'discord',
  returnTo: string,
  nodeUrl?: string,
): string {
  const url = nodeUrl || getX401NodeUrl()
  return `${url}/api/auth/strand/${provider}?returnTo=${encodeURIComponent(returnTo)}`
}

/**
 * Get the HandCash login URL via the x401 node.
 */
export function getHandCashLoginUrl(returnTo: string, nodeUrl?: string): string {
  const url = nodeUrl || getX401NodeUrl()
  return `${url}/api/auth/handcash?returnTo=${encodeURIComponent(returnTo)}`
}
