import { NextRequest, NextResponse } from 'next/server'
import { getPermissions, getUserProfile } from '@/lib/handcash'

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('npgx_handcash_token')?.value
  const handle = request.cookies.get('npgx_user_handle')?.value

  if (!authToken) {
    return NextResponse.json({ error: 'No auth token cookie', handle })
  }

  try {
    const [permissions, profile] = await Promise.all([
      getPermissions(authToken),
      getUserProfile(authToken),
    ])
    return NextResponse.json({ handle, profile, permissions, tokenPrefix: authToken.substring(0, 8) + '...' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message, handle, tokenPrefix: authToken.substring(0, 8) + '...' })
  }
}
