import { NextRequest, NextResponse } from 'next/server'

/**
 * $401 Identity Lookup API
 *
 * Resolves identity via x401 node (path401.com) first, falls back to
 * direct WhatsOnChain chain scanning if the node is unreachable.
 *
 * GET /api/auth/identity?address=1ABC...
 * GET /api/auth/identity?handle=alice
 */

const X401_NODE = process.env.X401_NODE_URL || process.env.NEXT_PUBLIC_X401_NODE_URL || 'https://path401.com'
const WOC_API = 'https://api.whatsonchain.com/v1/bsv/main'

interface Identity401 {
  rootTxid: string
  address: string
  handle?: string
  payTo: string
  strands: Array<{
    provider: string
    handle: string
    txid: string
    createdAt: string
  }>
  strength: number
  createdAt: string
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')
  const handle = req.nextUrl.searchParams.get('handle')

  if (!address && !handle) {
    return NextResponse.json({ error: 'address or handle required' }, { status: 400 })
  }

  try {
    // 1. Try x401 node first (indexed, fast)
    const nodeIdentity = await lookupViaX401Node(address, handle)
    if (nodeIdentity) {
      return NextResponse.json({
        identity: nodeIdentity,
        source: 'x401-node',
        node: X401_NODE,
      })
    }

    // 2. Fall back to direct chain scanning (slow but permissionless)
    if (address) {
      const chainIdentity = await lookup401FromChain(address)
      if (chainIdentity) {
        return NextResponse.json({
          identity: chainIdentity,
          source: 'chain-scan',
        })
      }
    }

    return NextResponse.json({
      identity: null,
      message: 'No $401 identity found',
      source: 'none',
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Lookup failed' },
      { status: 500 },
    )
  }
}

// ── x401 Node Lookup ────────────────────────────────────────────────────────

async function lookupViaX401Node(
  address: string | null,
  handle: string | null,
): Promise<Identity401 | null> {
  try {
    const params = new URLSearchParams()
    if (address) params.set('address', address)
    if (handle) params.set('handle', handle)

    const res = await fetch(
      `${X401_NODE}/api/identity/resolve?${params}`,
      { signal: AbortSignal.timeout(8000) },
    )

    if (res.ok) {
      const data = await res.json()
      return data.identity || null
    }
  } catch {
    // Node unreachable — fall through to chain scan
    console.warn(`[identity] x401 node unreachable at ${X401_NODE}, falling back to chain scan`)
  }

  return null
}

// ── Direct Chain Scanning (fallback) ────────────────────────────────────────

async function lookup401FromChain(address: string): Promise<Identity401 | null> {
  const historyRes = await fetch(
    `${WOC_API}/address/${address}/history`,
    { signal: AbortSignal.timeout(15000) },
  )
  if (!historyRes.ok) return null

  const history = await historyRes.json()
  if (!Array.isArray(history) || history.length === 0) return null

  const txids = history
    .sort((a: any, b: any) => (b.height || 0) - (a.height || 0))
    .slice(0, 50)
    .map((h: any) => h.tx_hash)

  let root: Identity401 | null = null
  const strands: Identity401['strands'] = []

  for (const txid of txids) {
    try {
      const txRes = await fetch(`${WOC_API}/tx/${txid}`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!txRes.ok) continue

      const tx = await txRes.json()

      for (const vout of tx.vout || []) {
        const asm = vout?.scriptPubKey?.asm || ''
        const hex = vout?.scriptPubKey?.hex || ''

        if (!asm.includes('OP_RETURN')) continue

        const inscription = decode401FromHex(hex)
        if (!inscription) continue

        if (inscription.op === 'root' && !root) {
          root = {
            rootTxid: txid,
            address,
            payTo: inscription.payTo || address,
            strands: [],
            strength: 1,
            createdAt: inscription.ts || tx.time
              ? new Date((tx.time || 0) * 1000).toISOString()
              : new Date().toISOString(),
          }
        }

        if (inscription.op === 'strand') {
          strands.push({
            provider: inscription.provider || 'unknown',
            handle: inscription.handle || '',
            txid,
            createdAt: inscription.ts || new Date().toISOString(),
          })
        }
      }
    } catch {
      continue
    }
  }

  if (!root) return null

  root.strands = strands
  root.strength = Math.min(4, 1 + strands.length)

  return root
}

// ── Decode 401 Inscription from Script Hex ──────────────────────────────────

function decode401FromHex(hex: string): Record<string, any> | null {
  try {
    const bytes: number[] = []
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substring(i, i + 2), 16))
    }

    const str = new TextDecoder('utf-8', { fatal: false }).decode(
      new Uint8Array(bytes),
    )

    const jsonStart = str.indexOf('{"p":"401"')
    if (jsonStart === -1) return null

    let depth = 0
    let jsonEnd = jsonStart
    for (let i = jsonStart; i < str.length; i++) {
      if (str[i] === '{') depth++
      if (str[i] === '}') depth--
      if (depth === 0) {
        jsonEnd = i + 1
        break
      }
    }

    const jsonStr = str.slice(jsonStart, jsonEnd)
    const parsed = JSON.parse(jsonStr)

    if (parsed.p !== '401') return null
    return parsed
  } catch {
    return null
  }
}
