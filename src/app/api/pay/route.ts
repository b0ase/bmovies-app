import { NextRequest, NextResponse } from 'next/server'
import { chargeUser, PLATFORM_HANDLE } from '@/lib/handcash'

export async function POST(request: NextRequest) {
  const authToken = request.cookies.get('npgx_handcash_token')?.value
  const handle = request.cookies.get('npgx_user_handle')?.value

  if (!authToken || !handle) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { amount, description } = await request.json()

    const txId = await chargeUser(
      authToken,
      [{ destination: PLATFORM_HANDLE, amount: amount || 10, currencyCode: 'USD' }],
      description || 'NPGX Platform Access — $10'
    )

    // Set a cookie to mark the user as paid
    const response = NextResponse.json({ success: true, txId })
    response.cookies.set('npgx_paid', 'true', {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })

    return response
  } catch (err: any) {
    console.error('Payment failed:', err?.message, err?.response?.data || err)
    return NextResponse.json(
      { error: err?.message || 'Payment failed', details: err?.response?.data || String(err) },
      { status: 500 }
    )
  }
}
