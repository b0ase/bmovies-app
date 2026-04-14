const TOKEN_TICK = process.env.NPGX_TOKEN_TICK || 'ninjapunkgirlsx'
const ORDINALS_API = 'https://ordinals.gorillapool.io'

/**
 * Resolve a HandCash handle to a BSV address via paymail
 */
export async function resolveHandcashAddress(handle: string): Promise<string> {
  const paymail = `${handle}@handcash.io`

  // Try polynym first (simple paymail resolver)
  const res = await fetch(`https://api.polynym.io/getAddress/${paymail}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Paymail resolution failed: ${res.status}`)
  const data = await res.json()
  if (!data.address) throw new Error('No address returned from paymail resolution')
  return data.address
}

/**
 * Check BSV-20 token balance at a BSV address via 1Sat Ordinals API
 */
export async function checkBsv20Balance(address: string, tick?: string): Promise<number> {
  const t = tick || TOKEN_TICK
  const res = await fetch(
    `${ORDINALS_API}/api/txos/address/${address}/unspent?bsv20=true`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) return 0
  const utxos = await res.json()
  if (!Array.isArray(utxos)) return 0

  return utxos
    .filter((u: any) => u.data?.bsv20?.tick?.toLowerCase() === t.toLowerCase())
    .reduce((sum: number, u: any) => sum + parseFloat(u.data?.bsv20?.amt || '0'), 0)
}

/**
 * Check if a HandCash user holds $ninjapunkgirlsx tokens
 */
export async function isTokenHolder(handle: string): Promise<{ holder: boolean; balance: number }> {
  try {
    const address = await resolveHandcashAddress(handle)
    const balance = await checkBsv20Balance(address)
    return { holder: balance > 0, balance }
  } catch (err) {
    console.error('[token-gate] Check failed:', err)
    return { holder: false, balance: 0 }
  }
}
