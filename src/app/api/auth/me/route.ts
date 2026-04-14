import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/handcash'

export async function GET(request: NextRequest) {
  const handle = request.cookies.get('npgx_user_handle')?.value
  const authToken = request.cookies.get('npgx_handcash_token')?.value

  if (!handle || !authToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  try {
    const profile = await getUserProfile(authToken)
    return NextResponse.json({
      authenticated: true,
      profile,
    })
  } catch {
    // Token expired or invalid — return handle only
    return NextResponse.json({
      authenticated: true,
      profile: { handle, displayName: handle, avatarUrl: '' },
    })
  }
}
