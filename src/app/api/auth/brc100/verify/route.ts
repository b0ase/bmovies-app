/**
 * POST /api/auth/brc100/verify
 *
 * Phase B of the BRC-100 sign-in flow. Accepts a signed challenge
 * from the browser, verifies the signature against the claimed
 * BSV public key, upserts a Supabase auth.users row for the wallet
 * holder, and returns a fresh { access_token, refresh_token } pair
 * that the client installs via supabase.auth.setSession().
 *
 * Request body:
 *   { address, publicKey, challenge, signature, provider }
 *
 * Where:
 *   address    — BSV mainnet address (base58check)
 *   publicKey  — 33-byte compressed pubkey, hex
 *   challenge  — the UUID issued by /api/auth/brc100/challenge
 *   signature  — hex DER (metanet) or base64 compact (yours)
 *   provider   — "metanet" | "yours"
 *
 * Security model:
 *
 *   1. The challenge must match the httpOnly cookie set by /challenge
 *      — prevents a malicious page on the same origin from reusing
 *      a signature it didn't originate.
 *
 *   2. The signature is verified against the claimed publicKey using
 *      the appropriate scheme:
 *        - metanet: BRC-100 createSignature → DER ECDSA over SHA256(challenge)
 *        - yours: legacy BSM (Bitcoin Signed Message) → double-hashed prefixed message
 *
 *   3. The derived address from publicKey must match the claimed address
 *      — stops a caller from signing with key A but registering address B.
 *
 *   4. The Supabase password for the synthetic email is deterministically
 *      derived from SUPABASE_SERVICE_ROLE_KEY + address via HMAC. No random
 *      password rotation required — every sign-in re-derives and signs in.
 *      Rotating the service role key invalidates every BRC-100 user (this
 *      is acceptable for a hackathon; production would use a dedicated
 *      BRC100_AUTH_SECRET env var instead).
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import {
  PublicKey,
  Signature,
  Utils,
  BSM,
} from '@bsv/sdk'
import { getAdminClient } from '@/lib/supabase-bmovies-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'brc100-nonce'
const COOKIE_PATH = '/api/auth/brc100'

interface VerifyBody {
  address?: string
  publicKey?: string
  challenge?: string
  signature?: string
  provider?: 'metanet' | 'yours'
}

function deriveSyntheticPassword(address: string): string {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  return createHmac('sha256', serviceKey).update(`brc100:${address}`).digest('hex')
}

function syntheticEmail(address: string): string {
  // Use the BSV address (case-preserved) as the local-part. Address
  // format is base58 so there are no characters that need escaping
  // for RFC 5322. Domain is a fictional subdomain so it can never
  // collide with a real inbox.
  return `${address}@bsv.bmovies.online`
}

async function verifySignature(
  provider: 'metanet' | 'yours',
  publicKeyHex: string,
  challenge: string,
  signature: string,
): Promise<boolean> {
  const pubKey = PublicKey.fromString(publicKeyHex)

  if (provider === 'metanet') {
    // BRC-100 createSignature: DER ECDSA over SHA256(utf8(challenge)).
    // PublicKey.verify internally hashes the message, so we pass the
    // raw challenge with enc='utf8'.
    const sig = Signature.fromDER(signature, 'hex')
    return pubKey.verify(challenge, sig, 'utf8')
  }

  if (provider === 'yours') {
    // Yours Wallet's signMessage uses legacy BSM (Bitcoin Signed Message)
    // format: double-hash of the prefixed message, compact-encoded 65-byte
    // signature (base64) with a 1-byte recovery header.
    const msgBytes = Utils.toArray(challenge, 'utf8')
    // The sig comes in as base64 compact or hex DER depending on wallet version;
    // try both shapes.
    let sig: Signature | null = null
    try {
      sig = Signature.fromCompact(signature, 'base64')
    } catch {
      try {
        sig = Signature.fromDER(signature, 'hex')
      } catch {
        sig = null
      }
    }
    if (!sig) return false
    return BSM.verify(msgBytes, sig, pubKey)
  }

  return false
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: VerifyBody
  try {
    body = (await req.json()) as VerifyBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { address, publicKey, challenge, signature, provider } = body

  if (!address || !publicKey || !challenge || !signature || !provider) {
    return NextResponse.json(
      { error: 'Missing required fields: address, publicKey, challenge, signature, provider' },
      { status: 400 },
    )
  }
  if (provider !== 'metanet' && provider !== 'yours') {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  }

  // 1. The challenge must match the httpOnly cookie
  const cookieStore = await cookies()
  const cookieNonce = cookieStore.get(COOKIE_NAME)?.value
  if (!cookieNonce) {
    return NextResponse.json(
      { error: 'No challenge cookie — request a new challenge first' },
      { status: 401 },
    )
  }
  if (cookieNonce !== challenge) {
    return NextResponse.json(
      { error: 'Challenge mismatch — possible replay or origin confusion' },
      { status: 401 },
    )
  }

  // 2. The derived address from publicKey must match the claimed address
  let pk: PublicKey
  try {
    pk = PublicKey.fromString(publicKey)
  } catch {
    return NextResponse.json({ error: 'Invalid publicKey format' }, { status: 400 })
  }
  const derivedAddress = pk.toAddress().toString()
  if (derivedAddress !== address) {
    return NextResponse.json(
      {
        error: `Address mismatch: publicKey derives to ${derivedAddress} but ${address} was claimed`,
      },
      { status: 401 },
    )
  }

  // 3. Verify the signature
  let sigOk = false
  try {
    sigOk = await verifySignature(provider, publicKey, challenge, signature)
  } catch (err) {
    console.warn('[brc100/verify] signature verify threw:', err)
  }
  if (!sigOk) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  // 4. Upsert auth.users + bct_accounts + bct_user_wallets
  const admin = getAdminClient()
  const email = syntheticEmail(address)
  const derivedPw = deriveSyntheticPassword(address)

  // Try to sign in first — returning users hit this path every time
  let newUser = false
  let signInRes = await admin.auth.signInWithPassword({ email, password: derivedPw })

  if (signInRes.error) {
    // Could be "Invalid login credentials" (user doesn't exist yet) or a
    // real error. Try to create the user; if that succeeds, sign in again.
    const createRes = await admin.auth.admin.createUser({
      email,
      password: derivedPw,
      email_confirm: true,
      user_metadata: {
        brc100_address: address,
        brc100_provider: provider,
        display_name: `BSV-${address.slice(0, 8)}`,
      },
    })
    if (createRes.error) {
      // Surface the original sign-in error if create also failed, for
      // debugging. Don't leak the email format.
      return NextResponse.json(
        { error: `Could not create wallet-backed account: ${createRes.error.message}` },
        { status: 500 },
      )
    }
    newUser = true
    signInRes = await admin.auth.signInWithPassword({ email, password: derivedPw })
    if (signInRes.error || !signInRes.data?.session) {
      return NextResponse.json(
        { error: `Created account but sign-in failed: ${signInRes.error?.message || 'no session'}` },
        { status: 500 },
      )
    }
  }

  const session = signInRes.data?.session
  const authUser = signInRes.data?.user
  if (!session || !authUser) {
    return NextResponse.json({ error: 'No session returned from Supabase' }, { status: 500 })
  }

  // 5. Ensure a bct_accounts row exists and is linked to this auth user
  const { data: existingAccount } = await admin
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  let accountId = existingAccount?.id as string | undefined
  if (!accountId) {
    const { data: created, error: createErr } = await admin
      .from('bct_accounts')
      .insert({
        auth_user_id: authUser.id,
        email,
        display_name: `BSV-${address.slice(0, 8)}`,
      })
      .select('id')
      .maybeSingle()
    if (createErr || !created) {
      console.warn('[brc100/verify] bct_accounts insert failed:', createErr?.message)
    } else {
      accountId = created.id as string
    }
  }

  // 6. Upsert the wallet link — idempotent on (account_id, provider, address)
  if (accountId) {
    const { error: walletErr } = await admin
      .from('bct_user_wallets')
      .upsert(
        {
          account_id: accountId,
          provider: 'brc100',
          chain: 'bsv',
          address,
          label: provider === 'metanet' ? 'BSV Desktop' : 'Yours Wallet',
          is_primary: true,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'account_id,provider,address' },
      )
    if (walletErr) {
      console.warn('[brc100/verify] bct_user_wallets upsert failed:', walletErr.message)
    }
  }

  // 7. Return tokens + clear the single-use nonce cookie
  const res = NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user: {
      id: authUser.id,
      email,
      address,
    },
    newUser,
  })
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: COOKIE_PATH,
  })
  return res
}
