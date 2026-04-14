/**
 * $402 Paywall Middleware for NPGX
 *
 * Wraps generation API routes with micropayment verification.
 * Works with Claw-DEX wallet system (Yours/HandCash/MetaMask/Phantom).
 *
 * Flow:
 *   1. Client sends request with X-402-Payment header (tx proof)
 *   2. If no payment → return 402 with pricing info
 *   3. If payment → verify on-chain → proceed → deposit revenue
 *
 * For agent callers:
 *   Agents include X-Agent-Id + X-402-Payment headers.
 *   Their wallet auto-signs micropayments per call.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrice, PRICING, calculateSplit, type PriceTier } from './pricing'
import { buildPaymentRequired } from './x402'

const CLAWDEX_API = process.env.CLAWDEX_API_URL || 'http://localhost:3001'
const NPGX_ENDPOINT_ID = process.env.NPGX_ENDPOINT_ID || 'npgx-website'
const NPGX_PAY_ADDRESS = process.env.NPGX_BSV_ADDRESS || '1NPGXpay...'
const NPGX_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.npgx.website'

export interface PaywallResult {
  authorized: boolean
  paymentId?: string
  priceSats: number
  walletAddress?: string
  agentId?: string
}

/**
 * Check if a request has valid $402 payment.
 * Returns 402 response if payment is missing/invalid.
 * Returns null if payment is valid (proceed with request).
 */
export async function checkPaywall(
  req: NextRequest,
  action: string,
): Promise<{ response?: NextResponse; payment: PaywallResult; responseHeaders?: Record<string, string> }> {
  const priceSats = getPrice(action)
  const tier = PRICING[action]

  // Free actions pass through
  if (priceSats === 0) {
    return { payment: { authorized: true, priceSats: 0 } }
  }

  // Check for payment proof — support x402 standard, legacy header, or HandCash session
  const paymentHeader = req.headers.get('x-payment') || req.headers.get('x-402-payment')
  const agentId = req.headers.get('x-agent-id')
  const walletAddress = req.headers.get('x-wallet-address')
  const handcashHandle = req.cookies.get('npgx_user_handle')?.value

  // Signed-in users with HandCash session pass through (micropayment deducted later)
  if (!paymentHeader && handcashHandle) {
    return {
      payment: {
        authorized: true,
        priceSats,
        walletAddress: handcashHandle,
      },
    }
  }

  // Dev mode — allow requests without payment for local testing
  if (!paymentHeader && process.env.NODE_ENV === 'development') {
    console.warn(`[Paywall] No payment for "${action}" (dev mode, allowing)`)
    return { payment: { authorized: true, priceSats } }
  }

  // No payment → return 402 with x402-compliant pricing
  if (!paymentHeader) {
    // Build x402-standard payment requirement
    const x402Req = buildPaymentRequired(action)
    const paymentRequiredB64 = Buffer.from(JSON.stringify(x402Req)).toString('base64')

    const response = NextResponse.json(
      {
        // x402 standard fields
        x402Version: 1,
        accepts: x402Req.accepts,
        error: 'X-PAYMENT header is required',
        // NPGX extended fields
        skill: action,
        action: tier?.action || action,
        description: tier?.description || '',
        price: {
          sats: priceSats,
          usd: (priceSats * 0.0005).toFixed(4),
        },
        payment: {
          methods: ['X-PAYMENT header (x402)', 'Yours Wallet', 'HandCash'],
          endpoint: `${CLAWDEX_API}/api/pay`,
          tokenSymbol: '$NPGX',
          network: 'bsv',
          payTo: NPGX_PAY_ADDRESS,
          skillsManifest: `${NPGX_BASE_URL}/.well-known/x402.json`,
        },
        agent: agentId ? {
          note: 'Include X-PAYMENT header with base64-encoded signed BSV transaction',
          agentId,
        } : undefined,
      },
      {
        status: 402,
        headers: {
          // x402 standard header
          'X-PAYMENT-REQUIRED': paymentRequiredB64,
          // Legacy NPGX headers (backwards compatible)
          'X-402-Price-Sats': String(priceSats),
          'X-402-Price-USD': (priceSats * 0.0005).toFixed(4),
          'X-402-Action': action,
          'X-402-Token': '$NPGX',
          'X-402-Pay-URL': `${CLAWDEX_API}/api/pay`,
          // CORS for agent access
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'X-PAYMENT-REQUIRED, X-PAYMENT-RESPONSE, X-402-Price-Sats, X-402-Action',
        },
      },
    )
    return {
      response,
      payment: { authorized: false, priceSats, agentId: agentId || undefined },
    }
  }

  // Verify payment (in production, verify on-chain via Claw-DEX)
  try {
    const verified = await verifyPayment(paymentHeader, priceSats, walletAddress || undefined)
    if (!verified.valid) {
      return {
        response: NextResponse.json(
          { error: 'Invalid payment', detail: verified.reason },
          { status: 402 },
        ),
        payment: { authorized: false, priceSats },
      }
    }

    // Payment valid → deposit revenue for dividend distribution
    await depositRevenue(action, priceSats, walletAddress || undefined, agentId || undefined)

    // Build x402 payment response for header
    const paymentResponse = {
      success: true,
      transaction: verified.paymentId,
      network: 'bsv',
      payer: walletAddress || null,
      errorReason: null,
    }
    const paymentResponseB64 = Buffer.from(JSON.stringify(paymentResponse)).toString('base64')

    return {
      payment: {
        authorized: true,
        paymentId: verified.paymentId,
        priceSats,
        walletAddress: walletAddress || undefined,
        agentId: agentId || undefined,
      },
      responseHeaders: {
        'X-PAYMENT-RESPONSE': paymentResponseB64,
      },
    }
  } catch (err: any) {
    // Payment verification failed — but don't block in dev mode
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Paywall] Verification failed (dev mode, allowing): ${err.message}`)
      return { payment: { authorized: true, priceSats } }
    }
    return {
      response: NextResponse.json(
        { error: 'Payment verification failed', detail: err.message },
        { status: 402 },
      ),
      payment: { authorized: false, priceSats },
    }
  }
}

/**
 * Verify a payment proof against Claw-DEX.
 */
async function verifyPayment(
  paymentProof: string,
  expectedSats: number,
  walletAddress?: string,
): Promise<{ valid: boolean; paymentId?: string; reason?: string }> {
  try {
    const res = await fetch(`${CLAWDEX_API}/api/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proof: paymentProof,
        expectedSats,
        walletAddress,
        endpointId: NPGX_ENDPOINT_ID,
      }),
    })

    if (!res.ok) {
      // In development, treat as valid if Claw-DEX is not running
      if (process.env.NODE_ENV === 'development') {
        return { valid: true, paymentId: `dev-${Date.now()}` }
      }
      const err = await res.text()
      return { valid: false, reason: err }
    }

    const data = await res.json()
    return { valid: data.valid, paymentId: data.paymentId }
  } catch {
    // Claw-DEX not reachable — allow in dev, block in prod
    if (process.env.NODE_ENV === 'development') {
      return { valid: true, paymentId: `dev-${Date.now()}` }
    }
    return { valid: false, reason: 'Payment service unreachable' }
  }
}

/**
 * Deposit revenue to Claw-DEX for dividend distribution.
 */
async function depositRevenue(
  action: string,
  amountSats: number,
  walletAddress?: string,
  agentId?: string,
): Promise<void> {
  const split = calculateSplit(amountSats)

  try {
    await fetch(`${CLAWDEX_API}/api/revenue/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpointId: NPGX_ENDPOINT_ID,
        amountSats,
        source: action,
        split,
        metadata: {
          walletAddress,
          agentId,
          timestamp: new Date().toISOString(),
        },
      }),
    })
  } catch {
    // Fire-and-forget — don't block generation if revenue deposit fails
    console.warn(`[Revenue] Failed to deposit ${amountSats} sats for ${action}`)
  }
}

/**
 * Helper to create a 402 response with NPGX pricing headers.
 * Use this for simple cases where you just need to return a 402.
 */
export function make402Response(action: string): NextResponse {
  const priceSats = getPrice(action)
  const tier = PRICING[action]

  return NextResponse.json(
    {
      error: 'Payment Required',
      code: 402,
      action: tier?.action || action,
      price: { sats: priceSats },
      payment: { endpoint: `${CLAWDEX_API}/api/pay`, tokenSymbol: '$NPGX' },
    },
    {
      status: 402,
      headers: {
        'X-402-Price-Sats': String(priceSats),
        'X-402-Action': action,
        'X-402-Token': '$NPGX',
      },
    },
  )
}
