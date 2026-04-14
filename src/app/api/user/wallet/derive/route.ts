import { NextRequest, NextResponse } from 'next/server'
import {
  deriveMasterWallet,
  deriveTokenWallet,
  deriveFullWalletTree,
  deriveMasterKey,
} from '@/lib/wallet-derivation'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

// All 27 token slugs ($NPGX + 26 characters)
const ALL_TOKEN_SLUGS = ['NPGX', ...NPGX_ROSTER.map(c => c.token.replace('$', ''))]

/**
 * POST /api/user/wallet/derive
 *
 * Derive the user's ordinals wallet from their HandCash auth.
 * Returns real BSV addresses — never exposes private keys to client.
 *
 * Body options:
 *   {}                          — derive master wallet only
 *   { token: "NPGX" }          — derive address for a specific token
 *   { allTokens: true }         — derive addresses for all 27 tokens
 */
export async function POST(request: NextRequest) {
  const authToken = request.cookies.get('npgx_handcash_token')?.value
  const handle = request.cookies.get('npgx_user_handle')?.value

  if (!authToken || !handle) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    // Full wallet tree — all 27 token addresses
    if (body.allTokens) {
      const manifest = deriveFullWalletTree(authToken, handle, ALL_TOKEN_SLUGS)
      return NextResponse.json({
        wallet: {
          masterAddress: manifest.masterAddress,
          masterPublicKey: manifest.masterPublicKey,
          tokens: manifest.tokenWallets,
          derived: true,
        },
      })
    }

    // Single token address
    if (body.token) {
      const slug = body.token.replace('$', '').toUpperCase()
      const masterKey = deriveMasterKey(authToken, handle)
      const tokenWallet = deriveTokenWallet(masterKey, slug)
      return NextResponse.json({
        wallet: {
          ...tokenWallet,
          derived: true,
        },
      })
    }

    // Default: master wallet only
    const master = deriveMasterWallet(authToken, handle)
    return NextResponse.json({
      wallet: {
        ...master,
        derived: true,
      },
    })
  } catch (err) {
    console.error('Wallet derivation failed:', err)
    return NextResponse.json({ error: 'Derivation failed' }, { status: 500 })
  }
}
