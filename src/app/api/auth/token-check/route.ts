import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/handcash'
import { isTokenHolder } from '@/lib/token-gate'

export async function POST(request: NextRequest) {
  const authToken = request.cookies.get('npgx_handcash_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const profile = await getUserProfile(authToken)
    const { holder, balance } = await isTokenHolder(profile.handle)

    if (holder) {
      const response = NextResponse.json({
        success: true,
        tokenHolder: true,
        balance,
        handle: profile.handle,
      })
      response.cookies.set('npgx_paid', 'true', {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
      return response
    }

    return NextResponse.json({ success: true, tokenHolder: false, balance: 0 })
  } catch (err: any) {
    console.error('[token-check] Error:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'Token check failed' },
      { status: 500 }
    )
  }
}
