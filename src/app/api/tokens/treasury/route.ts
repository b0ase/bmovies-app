import { NextResponse } from 'next/server'
import { getTreasuryWallet } from '@/lib/treasury'

/**
 * Returns the PUBLIC treasury pay address. Never exposes private keys.
 * Used by the client-side /tokens page to know where to send payment.
 */
export async function GET() {
  try {
    const wallet = getTreasuryWallet()
    return NextResponse.json({
      payAddress: wallet.payAddress.toString(),
      ordAddress: wallet.ordAddress.toString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Treasury wallet not configured'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
