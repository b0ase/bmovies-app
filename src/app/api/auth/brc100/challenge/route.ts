/**
 * POST /api/auth/brc100/challenge
 *
 * Phase B of the BRC-100 sign-in flow. Issues a random nonce that
 * the client will sign with their connected BRC-100 wallet, and
 * binds that nonce to the browser via an httpOnly cookie. The
 * matching /verify endpoint reads the cookie back, confirms the
 * nonce in the request body matches, and only then verifies the
 * wallet signature.
 *
 * Why a cookie-bound nonce?
 *   - Stateless on the server (no DB write)
 *   - Nonce can't be lifted from JS (httpOnly) or used by a different
 *     origin (sameSite=strict) or replayed across browsers
 *   - 120-second expiry prevents replay after a tab is abandoned
 *
 * The nonce itself is a random UUID — not a cryptographic secret,
 * just something unpredictable and single-use. The binding to the
 * cookie is what makes it safe.
 */

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'brc100-nonce'
const COOKIE_MAX_AGE_SECONDS = 120

export async function POST(): Promise<NextResponse> {
  const challenge = randomUUID()

  const res = NextResponse.json({
    challenge,
    expiresInSeconds: COOKIE_MAX_AGE_SECONDS,
  })

  res.cookies.set({
    name: COOKIE_NAME,
    value: challenge,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/api/auth/brc100',
  })

  return res
}
